import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateQuoteAnalysisReport } from "@/lib/analysis/report-service";

export const dynamic = "force-dynamic";

// 매주 월요일 오전 10시(한국 시간)에 Vercel Cron이 호출한다(vercel.json: UTC 월요일 01:00).
// 로그인 없는 호출이라 CRON_SECRET(Authorization 헤더)이 맞을 때만 동작한다. 값이 없으면 아무도 호출할 수 없다.
// 같은 날 재시도로 두 번 불려도 알림이 겹치지 않도록, 20시간 안에 만든 기록이 있으면 건너뛴다.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const since = new Date(Date.now() - 20 * 3600 * 1000).toISOString();
  const { data: recent } = await admin
    .from("quote_analysis_reports")
    .select("id")
    .gte("generated_at", since)
    .limit(1);
  if (recent && recent.length > 0) return NextResponse.json({ skipped: "recent report exists" });

  const res = await generateQuoteAnalysisReport(admin, admin);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 500 });
  return NextResponse.json({ id: res.id, dataThrough: res.dataThrough, isStale: res.isStale, candidates: res.candidates });
}

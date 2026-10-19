import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchNavCounts } from "@/lib/nav-counts";

export const dynamic = "force-dynamic";

// 사이드바 배지(딜러 주문 N, 파트너 신청 N)를 주기적으로 새로 읽어오는 엔드포인트.
// 로그인한 직원 세션으로만 응답한다(딜러 계정은 미들웨어가 /order 밖으로 못 나가게 막는다).
// 건수만 돌려주고 신청자·주문 내용은 담지 않는다.
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const counts = await fetchNavCounts(supabase);
  return NextResponse.json(counts, { headers: { "Cache-Control": "no-store" } });
}

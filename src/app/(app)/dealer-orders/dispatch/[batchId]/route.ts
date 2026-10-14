import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildDispatchWorkbook, xlsxResponseHeaders, type DispatchRow } from "@/lib/utils/dispatch-sheet";

export const dynamic = "force-dynamic";

/** GET — 예전에 만든 발주서를 기록된 그대로 다시 내려받는다(번호·차수는 바뀌지 않는다). */
export async function GET(_req: Request, { params }: { params: { batchId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { data, error } = await supabase
    .from("dispatch_batches")
    .select("file_name, rows")
    .eq("id", params.batchId)
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: "발주 기록을 찾을 수 없습니다." }, { status: 404 });

  const buf = buildDispatchWorkbook((data.rows ?? []) as DispatchRow[]);
  return new NextResponse(new Uint8Array(buf), { headers: xlsxResponseHeaders(data.file_name as string) });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildDispatchRows,
  buildDispatchWorkbook,
  countDispatchLines,
  dateKeyKst,
  dealersMissingShipInfo,
  dispatchFileBase,
  xlsxResponseHeaders,
  type DispatchOrderInput,
} from "@/lib/utils/dispatch-sheet";

export const dynamic = "force-dynamic";

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

/**
 * POST { orderIds: string[] } — 고른 딜러 주문으로 제이디로지스 발주서(엑셀)를 만들고 내려준다.
 * 번호/차수는 DB 함수(allocate_dispatch_batch)가 날짜별로 이어서 배정하고, 만든 내용은
 * dispatch_batches에 기록된다. 성공하면 해당 주문에 "발주 완료" 표시(dispatch_batch_id)를 남긴다.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("로그인이 필요합니다.", 401);
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return fail("관리자만 발주서를 만들 수 있습니다.", 403);

  let ids: string[] = [];
  try {
    const body = (await request.json()) as { orderIds?: unknown };
    if (Array.isArray(body.orderIds)) ids = [...new Set(body.orderIds.map(String))];
  } catch {
    return fail("요청 형식이 올바르지 않습니다.");
  }
  if (ids.length === 0) return fail("발주할 주문을 선택해주세요.");
  if (ids.length > 200) return fail("한 번에 발주할 수 있는 주문은 200건까지입니다.");

  const { data, error } = await supabase
    .from("dealer_orders")
    .select(
      "id, created_at, status, dispatch_batch_id, dealers(name, address, ship_recipient, contact_phone), dealer_order_items(quantity, products(name, sku))"
    )
    .in("id", ids);
  if (error) return fail(`주문을 불러오지 못했습니다: ${error.message}`, 500);

  type Row = DispatchOrderInput & { created_at: string; status: string; dispatch_batch_id: string | null };
  const orders = ((data ?? []) as unknown as Row[]).sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  if (orders.length !== ids.length) return fail("선택한 주문 중 찾을 수 없는 주문이 있습니다. 새로고침 후 다시 시도해주세요.");
  if (orders.some((o) => o.status === "cancelled")) return fail("취소된 주문이 포함되어 있습니다. 선택에서 빼주세요.");
  if (orders.some((o) => o.dispatch_batch_id)) return fail("이미 발주한 주문이 포함되어 있습니다. 선택에서 빼주세요. (발주 기록에서 이전 파일을 다시 내려받을 수 있어요)");

  const lineCount = countDispatchLines(orders);
  if (lineCount === 0) return fail("발주할 품목이 없는 주문입니다.");

  const dateKey = dateKeyKst();
  const { data: allocated, error: allocError } = await supabase.rpc("allocate_dispatch_batch", {
    p_date: dateKey,
    p_count: lineCount,
    p_file_base: dispatchFileBase(dateKey),
  });
  const batch = Array.isArray(allocated) ? allocated[0] : allocated;
  if (allocError || !batch) return fail(`발주 번호를 배정하지 못했습니다: ${allocError?.message ?? "알 수 없는 오류"}`, 500);

  const rows = buildDispatchRows(orders, dateKey, batch.seq_start);
  const rollback = async () => {
    await supabase.from("dispatch_batches").delete().eq("id", batch.id);
  };

  const { error: saveError } = await supabase
    .from("dispatch_batches")
    .update({ rows, order_ids: orders.map((o) => o.id) })
    .eq("id", batch.id);
  if (saveError) {
    await rollback();
    return fail(`발주 기록을 저장하지 못했습니다: ${saveError.message}`, 500);
  }

  const { error: markError } = await supabase
    .from("dealer_orders")
    .update({ dispatch_batch_id: batch.id, dispatched_at: new Date().toISOString() })
    .in("id", orders.map((o) => o.id));
  if (markError) {
    await rollback();
    return fail(`주문에 발주 표시를 남기지 못했습니다: ${markError.message}`, 500);
  }

  const buf = buildDispatchWorkbook(rows);
  const info = {
    fileName: batch.file_name as string,
    batchNo: batch.batch_no as number,
    first: rows[0]?.[0] ?? "",
    last: rows[rows.length - 1]?.[0] ?? "",
    lines: rows.length,
    orders: orders.length,
    missing: dealersMissingShipInfo(orders),
  };
  return new NextResponse(new Uint8Array(buf), {
    headers: { ...xlsxResponseHeaders(batch.file_name), "X-Dispatch-Info": encodeURIComponent(JSON.stringify(info)) },
  });
}

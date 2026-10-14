"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true; message: string } | { ok: false; message: string };

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user?.id ?? "").single();
  return { supabase, isAdmin: me?.role === "admin" };
}

/**
 * 주문 하나의 "발주 완료" 표시를 지운다(다시 발주할 수 있게 된다).
 * 이미 만든 엑셀 파일과 발주서 기록, 그 번호는 그대로 남는다 — 업체에 이미 보낸 파일의
 * 번호가 다시 쓰이지 않도록, 새로 발주하면 새 번호가 배정된다.
 */
export async function cancelOrderDispatch(orderId: string): Promise<Result> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { ok: false, message: "관리자만 발주를 취소할 수 있습니다." };
  const { error } = await supabase
    .from("dealer_orders")
    .update({ dispatch_batch_id: null, dispatched_at: null })
    .eq("id", orderId);
  if (error) return { ok: false, message: `발주 취소에 실패했습니다: ${error.message}` };
  revalidatePath("/dealer-orders");
  return { ok: true, message: "발주 완료 표시를 취소했습니다. 다시 발주할 수 있습니다." };
}

/** 발주서 한 건(차수) 전체를 취소 처리한다 — 그 발주서에 포함된 모든 주문의 "발주 완료" 표시가 지워진다. */
export async function cancelDispatchBatch(batchId: string): Promise<Result> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { ok: false, message: "관리자만 발주를 취소할 수 있습니다." };

  const { error: ordersError } = await supabase
    .from("dealer_orders")
    .update({ dispatch_batch_id: null, dispatched_at: null })
    .eq("dispatch_batch_id", batchId);
  if (ordersError) return { ok: false, message: `주문의 발주 표시를 지우지 못했습니다: ${ordersError.message}` };

  const { error } = await supabase
    .from("dispatch_batches")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("id", batchId);
  if (error) return { ok: false, message: `발주서를 취소 처리하지 못했습니다: ${error.message}` };

  revalidatePath("/dealer-orders");
  return { ok: true, message: "발주서를 취소했습니다. 포함된 주문은 다시 발주할 수 있습니다." };
}

/** 취소했던 발주서 기록을 다시 살린다(주문의 "발주 완료" 표시는 자동으로 복원되지 않는다). */
export async function restoreDispatchBatch(batchId: string): Promise<Result> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { ok: false, message: "관리자만 할 수 있습니다." };
  const { data: batch } = await supabase.from("dispatch_batches").select("order_ids").eq("id", batchId).maybeSingle();
  if (!batch) return { ok: false, message: "발주서 기록을 찾을 수 없습니다." };
  const ids = (batch.order_ids ?? []) as string[];
  if (ids.length > 0) {
    const { data: taken } = await supabase.from("dealer_orders").select("id").in("id", ids).not("dispatch_batch_id", "is", null);
    if ((taken ?? []).length > 0) {
      return { ok: false, message: "이 발주서에 포함됐던 주문 중 이미 다시 발주된 주문이 있어 복원할 수 없습니다." };
    }
    const { error: markError } = await supabase
      .from("dealer_orders")
      .update({ dispatch_batch_id: batchId, dispatched_at: new Date().toISOString() })
      .in("id", ids);
    if (markError) return { ok: false, message: `주문에 발주 표시를 되돌리지 못했습니다: ${markError.message}` };
  }
  const { error } = await supabase.from("dispatch_batches").update({ cancelled_at: null }).eq("id", batchId);
  if (error) return { ok: false, message: `복원하지 못했습니다: ${error.message}` };
  revalidatePath("/dealer-orders");
  return { ok: true, message: "발주서를 복원했습니다." };
}

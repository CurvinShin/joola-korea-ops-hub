"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SMARTSTORE_SOURCE } from "@/lib/utils/sales";

type ActionResult = { ok: true; message: string } | { ok: false; message: string };

/**
 * 스마트스토어 월별 정산 금액을 입력/수정한다. 같은 달(YYYY-MM)에 이미 값이
 * 있으면 덮어쓰고, 없으면 새로 만든다 — 나중에 정산액이 정정되면 같은 달을
 * 다시 입력해서 고칠 수 있게 하려는 의도다. sale_date는 항상 그 달의 1일로
 * 저장한다.
 */
export async function upsertSmartstoreSettlement(month: string, amount: number): Promise<ActionResult> {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return { ok: false, message: "월 형식이 올바르지 않습니다." };
  }
  if (!Number.isFinite(amount) || amount < 0) {
    return { ok: false, message: "금액을 확인해주세요." };
  }

  const supabase = createClient();
  const saleDate = `${month}-01`;

  const { data: existing, error: existingError } = await supabase
    .from("sales_transactions")
    .select("id")
    .eq("channel", "ecommerce")
    .eq("sale_date", saleDate)
    .maybeSingle();
  if (existingError) {
    return { ok: false, message: `조회 실패: ${existingError.message}` };
  }

  if (existing) {
    const { error } = await supabase
      .from("sales_transactions")
      .update({ amount, source: SMARTSTORE_SOURCE })
      .eq("id", existing.id);
    if (error) return { ok: false, message: `수정 실패: ${error.message}` };
  } else {
    const { error } = await supabase
      .from("sales_transactions")
      .insert({ channel: "ecommerce", sale_date: saleDate, amount, source: SMARTSTORE_SOURCE });
    if (error) return { ok: false, message: `등록 실패: ${error.message}` };
  }

  revalidatePath("/sales");
  return { ok: true, message: `${month} 스마트스토어 정산액이 저장되었습니다.` };
}

export async function deleteSmartstoreSettlement(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("sales_transactions")
    .delete()
    .eq("id", id)
    .eq("channel", "ecommerce");
  if (error) return { ok: false, message: `삭제 실패: ${error.message}` };
  revalidatePath("/sales");
  return { ok: true, message: "삭제되었습니다." };
}

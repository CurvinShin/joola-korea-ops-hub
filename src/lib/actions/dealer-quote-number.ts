"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult<T> = ({ ok: true } & T) | { ok: false; error: string };

// dealers.next_seq/last_seq_year 카운터에서 다음 견적서 번호를 발급(=사용
// 처리)한다. dealer_orders 생성 시 쓰는 것과 똑같은 assign_dealer_order_number()
// RPC를 그대로 재사용한다 — 이 카운터는 딜러 하나에 대해 "사이트 주문"과
// "견적서"가 번호를 공유하는 단일 시퀀스이기 때문에, 새 dealer_orders 행을
// 만들지 않고 번호만 발급받아도 안전하다(원자적으로 next_seq가 올라간다).
export async function issueNextQuoteNumber(dealerId: string): Promise<ActionResult<{ number: string }>> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("assign_dealer_order_number", { p_dealer_id: dealerId });
  if (error || !data) {
    return { ok: false, error: error?.message ?? "번호를 발급하지 못했습니다." };
  }
  revalidatePath(`/dealers/${dealerId}`);
  return { ok: true, number: data as string };
}

// 경리나라 등에서 번호를 직접 매겼거나 건너뛴 경우, 다음 자동 발급 번호가
// 그 번호와 겹치지 않도록 next_seq를 맞춰 넣는다. 카운터를 절대 뒤로
// 되돌리지 않도록 기존 값과 비교해 더 큰 쪽을 사용한다.
export async function syncQuoteNumberSeq(
  dealerId: string,
  krCode: string,
  manualNumber: string
): Promise<ActionResult<{ message: string }>> {
  const prefix = `${krCode}-`;
  if (!manualNumber.startsWith(prefix)) {
    return { ok: false, error: `번호는 "${prefix}"로 시작해야 합니다.` };
  }
  const rest = manualNumber.slice(prefix.length);
  const match = rest.match(/^(\d{2})(\d{2,})$/);
  if (!match) {
    return { ok: false, error: `번호 형식을 인식할 수 없습니다. 예: ${prefix}2613 (수정1 같은 접미사는 빼고 입력해주세요)` };
  }
  const [, yy, seqStr] = match;
  const seq = parseInt(seqStr, 10);

  const supabase = createClient();
  const { data: dealer, error: fetchError } = await supabase
    .from("dealers")
    .select("next_seq, last_seq_year")
    .eq("id", dealerId)
    .maybeSingle();
  if (fetchError || !dealer) {
    return { ok: false, error: fetchError?.message ?? "딜러를 찾을 수 없습니다." };
  }

  const currentSeq = dealer.last_seq_year === yy ? dealer.next_seq : 0;
  const nextSeq = Math.max(currentSeq, seq + 1);

  const { error: updateError } = await supabase
    .from("dealers")
    .update({ next_seq: nextSeq, last_seq_year: yy })
    .eq("id", dealerId);
  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  revalidatePath(`/dealers/${dealerId}`);
  return { ok: true, message: `다음 번호가 ${krCode}-${yy}${String(nextSeq).padStart(2, "0")}(으)로 준비됐습니다.` };
}

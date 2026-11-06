"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { nextSeqAfter, parseOrderNumber } from "@/lib/utils/order-number";

type Result<T = object> = ({ ok: true } & T) | { ok: false; message: string };

/**
 * 주문 번호를 경리나라 실제 견적서 번호에 맞춰 고치고 "확정"한다.
 *  1) 형식·딜러 코드·중복을 확인한다.
 *  2) 예전 자동 번호가 그 딜러의 "가장 최근 발급 번호"였으면 카운터를 한 칸 되돌린다(번호가 비는 것 방지).
 *  3) 새 번호를 저장하고 확정 표시를 한다.
 *  4) 다음 자동 번호가 새 번호와 겹치지 않도록 카운터를 맞춘다(뒤로는 되돌리지 않음).
 */
export async function saveOrderNumber(orderId: string, input: string): Promise<Result<{ number: string; inQuoteHistory: boolean }>> {
  try {
    const supabase = createClient();

    const { data: order, error: orderErr } = await supabase
      .from("dealer_orders")
      .select("id, order_number, dealer_id, dealers(kr_code)")
      .eq("id", orderId)
      .maybeSingle();
    if (orderErr) return { ok: false, message: `주문 조회 실패: ${orderErr.message}` };
    if (!order) return { ok: false, message: "주문을 찾을 수 없습니다." };

    const dealer = (Array.isArray(order.dealers) ? order.dealers[0] : order.dealers) as { kr_code: string | null } | null;
    const krCode = dealer?.kr_code;
    if (!krCode) return { ok: false, message: "딜러에 KR 코드가 없어 번호를 맞출 수 없습니다." };

    const parsed = parseOrderNumber(input, krCode);
    if (!parsed.ok) return { ok: false, message: parsed.error };

    const { data: clash, error: clashErr } = await supabase
      .from("dealer_orders")
      .select("id")
      .eq("order_number", parsed.number)
      .neq("id", orderId)
      .limit(1);
    if (clashErr) return { ok: false, message: `중복 확인 실패: ${clashErr.message}` };
    if (clash && clash.length > 0) {
      return { ok: false, message: `${parsed.number}은(는) 이미 다른 주문이 쓰고 있습니다. 그 주문의 번호를 먼저 확인해주세요.` };
    }

    const changed = order.order_number !== parsed.number;
    if (changed && order.order_number) {
      const { error: relErr } = await supabase.rpc("release_dealer_order_number_if_last", {
        p_dealer_id: order.dealer_id,
        p_order_number: order.order_number,
      });
      if (relErr) console.error("release_dealer_order_number_if_last failed", relErr);
    }

    const { error: updErr } = await supabase
      .from("dealer_orders")
      .update({ order_number: parsed.number, order_number_confirmed: true })
      .eq("id", orderId);
    if (updErr) return { ok: false, message: `저장 실패: ${updErr.message}` };

    // 접미사(-1)가 붙은 번호는 순번 카운터에 영향을 주지 않는다.
    if (parsed.suffix === null) {
      const { data: d } = await supabase
        .from("dealers")
        .select("next_seq, last_seq_year")
        .eq("id", order.dealer_id)
        .maybeSingle();
      if (d) {
        const next = nextSeqAfter({
          currentNextSeq: d.next_seq,
          currentYear: d.last_seq_year,
          yy: parsed.yy,
          seq: parsed.seq,
        });
        if (next !== d.next_seq || d.last_seq_year !== parsed.yy) {
          const { error: seqErr } = await supabase
            .from("dealers")
            .update({ next_seq: next, last_seq_year: parsed.yy })
            .eq("id", order.dealer_id);
          if (seqErr) console.error("next_seq sync failed", seqErr);
        }
      }
    }

    const { data: q } = await supabase.from("dealer_quotes").select("order_no").eq("order_no", parsed.number).limit(1);

    revalidatePath("/dealer-orders");
    revalidatePath(`/dealers/${order.dealer_id}`);
    return { ok: true, number: parsed.number, inQuoteHistory: !!q && q.length > 0 };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다." };
  }
}

/** 지금 붙어 있는 번호가 실제 견적서 번호와 같다고 확인했을 때, 그대로 "확정"만 한다. */
export async function confirmOrderNumber(orderId: string): Promise<Result> {
  try {
    const supabase = createClient();
    const { data: order, error } = await supabase
      .from("dealer_orders")
      .select("id, order_number")
      .eq("id", orderId)
      .maybeSingle();
    if (error) return { ok: false, message: `주문 조회 실패: ${error.message}` };
    if (!order) return { ok: false, message: "주문을 찾을 수 없습니다." };
    if (!order.order_number) return { ok: false, message: "번호가 없는 주문입니다. 번호를 먼저 입력해주세요." };

    const { error: updErr } = await supabase.from("dealer_orders").update({ order_number_confirmed: true }).eq("id", orderId);
    if (updErr) return { ok: false, message: `저장 실패: ${updErr.message}` };

    revalidatePath("/dealer-orders");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다." };
  }
}

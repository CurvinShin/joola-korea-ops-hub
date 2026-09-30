import type { createClient } from "@/lib/supabase/server";
import { priceCartItemsForDealer } from "@/lib/utils/dealer-cart-pricing";

export type MergeOrdersResult =
  | { ok: true; message: string; mergedOrderId: string }
  | { ok: false; message: string };

/**
 * 같은 딜러의 draft(입금 확인 전) 주문 여러 건을 하나로 합친다 — 딜러가
 * 여러 번 나눠서 주문했을 때, 담당자가 견적서를 하나로만 내보낼 수 있게
 * 해달라는 요청으로 추가됨. 품목은 상품+데모여부 기준으로 수량을 합산한
 * 뒤 priceCartItemsForDealer로 통째로 다시 가격을 매긴다(딜러 자신이 부를
 * 때도, 관리자가 대신 부를 때도 이 함수 하나만 공유) — 그래야 배송비
 * 박스 계산(패들 10개당 1박스)도 합쳐진 수량 기준으로 정확해진다.
 *
 * 가장 먼저 접수된 주문(주문일 → 생성 시각 순)을 "남는 쪽"으로 삼아
 * 품목/금액만 갈아끼우고, 나머지는 완전히 삭제한다 — 주문번호·주문일이
 * 그대로 유지돼야 견적서 이력 추적이 헷갈리지 않는다. 삭제되는 주문의
 * 번호가 그 딜러에게 가장 마지막으로 발급된 번호였다면(=그 뒤로 다른
 * 번호가 안 나갔다면) 다음 발급 때 재사용할 수 있게 되돌려준다(기존
 * deleteDealerOrder와 동일한 패턴).
 *
 * requireDealerId를 넘기면(딜러 본인이 부를 때) 선택된 주문들이 전부 그
 * 딜러 소유인지 한 번 더 확인한다 — 관리자가 부를 때는 생략(스태프는 RLS로
 * 이미 모든 딜러의 주문에 접근 가능).
 */
export async function mergeDraftOrders(
  supabase: ReturnType<typeof createClient>,
  orderIds: string[],
  opts?: { requireDealerId?: string }
): Promise<MergeOrdersResult> {
  const uniqueIds = [...new Set(orderIds)];
  if (uniqueIds.length < 2) {
    return { ok: false, message: "합칠 주문을 2건 이상 선택해주세요." };
  }

  const { data: orders, error: ordersError } = await supabase
    .from("dealer_orders")
    .select("id, dealer_id, status, order_date, order_number, created_at")
    .in("id", uniqueIds);
  if (ordersError || !orders || orders.length !== uniqueIds.length) {
    return { ok: false, message: "합칠 주문 중 일부를 찾을 수 없습니다. 새로고침 후 다시 시도해주세요." };
  }

  const dealerId = orders[0].dealer_id as string;
  if (orders.some((o) => o.dealer_id !== dealerId)) {
    return { ok: false, message: "같은 딜러의 주문만 합칠 수 있습니다." };
  }
  if (opts?.requireDealerId && dealerId !== opts.requireDealerId) {
    return { ok: false, message: "본인 딜러의 주문만 합칠 수 있습니다." };
  }
  if (orders.some((o) => o.status !== "draft")) {
    return { ok: false, message: "입금 확인 전(임시) 주문만 합칠 수 있습니다." };
  }

  const { data: itemRows, error: itemsError } = await supabase
    .from("dealer_order_items")
    .select("order_id, product_id, quantity, is_demo")
    .in("order_id", uniqueIds);
  if (itemsError) {
    return { ok: false, message: `주문 품목 조회 실패: ${itemsError.message}` };
  }

  const combined = new Map<string, { productId: string; quantity: number; isDemo: boolean }>();
  for (const it of itemRows ?? []) {
    const key = `${it.product_id}:${it.is_demo}`;
    const entry = combined.get(key);
    if (entry) {
      entry.quantity += it.quantity;
    } else {
      combined.set(key, { productId: it.product_id, quantity: it.quantity, isDemo: it.is_demo });
    }
  }
  const combinedItems = [...combined.values()];
  if (combinedItems.length === 0) {
    return { ok: false, message: "합칠 품목이 없습니다." };
  }

  const priced = await priceCartItemsForDealer(supabase, dealerId, combinedItems);
  if (!priced.ok) return priced;

  const sorted = [...orders].sort((a, b) => {
    if (a.order_date !== b.order_date) return a.order_date < b.order_date ? -1 : 1;
    return (a.created_at ?? "") < (b.created_at ?? "") ? -1 : 1;
  });
  const target = sorted[0];
  const losers = sorted.slice(1);

  const { error: deleteItemsError } = await supabase
    .from("dealer_order_items")
    .delete()
    .eq("order_id", target.id);
  if (deleteItemsError) {
    return { ok: false, message: `기존 품목 삭제 실패: ${deleteItemsError.message}` };
  }

  const { error: insertItemsError } = await supabase.from("dealer_order_items").insert(
    priced.rows.map((r) => ({
      order_id: target.id,
      product_id: r.product_id,
      quantity: r.quantity,
      unit_price: r.unit_price,
      is_demo: r.is_demo,
    }))
  );
  if (insertItemsError) {
    return { ok: false, message: `품목 등록 실패: ${insertItemsError.message}` };
  }

  const { error: updateError } = await supabase
    .from("dealer_orders")
    .update({
      order_type: priced.allDemo ? "demo" : "regular",
      total_amount: priced.subtotal,
      auto_shipping_boxes: priced.autoShippingBoxes,
      auto_shipping_fee: priced.autoShippingFee,
    })
    .eq("id", target.id);
  if (updateError) {
    return { ok: false, message: `주문 합치기 실패: ${updateError.message}` };
  }

  for (const loser of losers) {
    const { error: deleteLoserError } = await supabase.from("dealer_orders").delete().eq("id", loser.id);
    if (deleteLoserError) {
      // 남길 주문(target) 쪽 반영은 이미 끝난 상태 — 나머지 주문 하나를 못
      // 지운 정도로 전체를 실패 처리하면 오히려 더 헷갈리니, 경고만 남기고
      // 계속 진행한다(중복 주문이 하나 남는 편이 데이터가 붕 뜨는 것보다 낫다).
      console.error(`mergeDraftOrders: failed to delete order ${loser.id}`, deleteLoserError);
      continue;
    }
    if (loser.order_number) {
      const { error: releaseError } = await supabase.rpc("release_dealer_order_number_if_last", {
        p_dealer_id: dealerId,
        p_order_number: loser.order_number,
      });
      if (releaseError) {
        console.error("release_dealer_order_number_if_last failed", releaseError);
      }
    }
  }

  return {
    ok: true,
    message: `주문 ${uniqueIds.length}건을 하나로 합쳤습니다 (${target.order_number ?? "번호 미발급"}).`,
    mergedOrderId: target.id,
  };
}

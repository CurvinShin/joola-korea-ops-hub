"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { priceCartItemsForDealer, validateCartInput } from "@/lib/utils/dealer-cart-pricing";

// Admin-only actions for reviewing orders dealers place through /order.
// The actual 견적서/발주서 document is created by the admin in 경리나라
// (an external accounting tool) — this app just tracks status and whether
// that hand-off has happened yet (synced_to_accounting).

/**
 * 관리자 화면(딜러 주문 상세)에서 주문 품목 자체를 고친다 — 품목 추가/삭제,
 * 수량 조정 모두 가능. 입금 확인 전(status="draft") 주문에만 허용한다:
 * 그 이후는 이미 재고가 차감된 상태라 품목이 바뀌면 재고까지 같이
 * 보정해야 하는데, 아직 그 로직이 없어서 안전하게 draft로만 제한해둔다
 * (입금 확인 후 내용이 잘못됐으면 거절→재주문, 혹은 DB에서 직접 처리).
 * dealer_id는 그 주문에 이미 연결된 딜러를 그대로 쓴다 — 로그인 사용자
 * 기준으로 딜러를 찾는 priceDealerCartItems와 달리, 관리자는 자기 자신의
 * dealer_id가 없으므로 주문의 dealer_id를 그대로 넘겨 가격을 다시 매긴다.
 */
export async function updateDealerOrderItemsAdmin(
  orderId: string,
  items: { productId: string; quantity: number; isDemo: boolean }[]
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const inputError = validateCartInput(items);
  if (inputError) return { ok: false, message: inputError };

  const supabase = createClient();

  const { data: existing, error: existingError } = await supabase
    .from("dealer_orders")
    .select("id, dealer_id, status")
    .eq("id", orderId)
    .maybeSingle();
  if (existingError || !existing) {
    return { ok: false, message: "주문을 찾을 수 없습니다." };
  }
  if (existing.status !== "draft") {
    return { ok: false, message: "입금 확인 전(임시) 주문만 수정할 수 있습니다." };
  }

  const priced = await priceCartItemsForDealer(supabase, existing.dealer_id, items);
  if (!priced.ok) return priced;

  const { error: deleteError } = await supabase.from("dealer_order_items").delete().eq("order_id", orderId);
  if (deleteError) {
    return { ok: false, message: `기존 주문 상품 삭제 실패: ${deleteError.message}` };
  }

  const { error: itemsError } = await supabase.from("dealer_order_items").insert(
    priced.rows.map((r) => ({
      order_id: orderId,
      product_id: r.product_id,
      quantity: r.quantity,
      unit_price: r.unit_price,
      is_demo: r.is_demo,
    }))
  );
  if (itemsError) {
    return { ok: false, message: `주문 상품 등록에 실패했습니다: ${itemsError.message}` };
  }

  const { error: updateError } = await supabase
    .from("dealer_orders")
    .update({
      order_type: priced.allDemo ? "demo" : "regular",
      total_amount: priced.subtotal,
      auto_shipping_boxes: priced.autoShippingBoxes,
      auto_shipping_fee: priced.autoShippingFee,
    })
    .eq("id", orderId);
  if (updateError) {
    return { ok: false, message: `주문 수정에 실패했습니다: ${updateError.message}` };
  }

  revalidatePath("/dealer-orders");
  revalidatePath("/order");
  return { ok: true, message: "주문이 수정되었습니다." };
}

export async function setDealerOrderStatus(id: string, status: string) {
  const supabase = createClient();
  const { error } = await supabase.from("dealer_orders").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dealer-orders");
}

export async function setDealerOrderSynced(id: string, synced: boolean) {
  const supabase = createClient();
  const { error } = await supabase.from("dealer_orders").update({ synced_to_accounting: synced }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dealer-orders");
}

/**
 * "입금 확인" — the moment stock actually leaves the warehouse in this
 * system's model. Deliberately deferred until here (not at order-submit
 * time) so a dealer can add items to the cart freely without touching real
 * inventory until an admin has actually seen the money land.
 *
 * Decrementing is allowed to go negative on purpose — a shortfall becomes a
 * visible backorder signal (see the /inventory 백오더 banner) rather than a
 * blocked confirmation, matching how 이지어드민 already treats backorders
 * (auto re-orders on next import, but doesn't always happen, so this app
 * needs to keep it visible too).
 *
 * `stock_deducted` guards against double-decrementing if this is somehow
 * called twice for the same order.
 */
export async function confirmDealerOrderPayment(
  orderId: string,
  manualShippingFee: number | null,
  confirmedTotalAmount: number | null
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: order, error: orderErr } = await supabase
    .from("dealer_orders")
    .select("id, stock_deducted")
    .eq("id", orderId)
    .single();
  if (orderErr || !order) throw new Error("주문을 찾을 수 없습니다.");

  if (!order.stock_deducted) {
    const { data: items, error: itemsErr } = await supabase
      .from("dealer_order_items")
      .select("product_id, quantity")
      .eq("order_id", orderId);
    if (itemsErr) throw new Error(itemsErr.message);

    for (const item of items ?? []) {
      const { data: inv, error: invErr } = await supabase
        .from("inventory")
        .select("current_stock")
        .eq("product_id", item.product_id)
        .single();
      if (invErr) throw new Error(`재고 조회 실패: ${invErr.message}`);
      const nextStock = (inv?.current_stock ?? 0) - item.quantity;
      const { error: updErr } = await supabase
        .from("inventory")
        .update({ current_stock: nextStock, updated_at: new Date().toISOString() })
        .eq("product_id", item.product_id);
      if (updErr) throw new Error(`재고 차감 실패: ${updErr.message}`);
    }
  }

  const updatePayload: Record<string, unknown> = {
    status: "confirmed",
    stock_deducted: true,
    manual_shipping_fee: manualShippingFee,
    confirmed_total_amount: confirmedTotalAmount,
    payment_confirmed_at: new Date().toISOString(),
    payment_confirmed_by: user?.id ?? null,
  };
  // 관리자가 입력한 확정 총액이 있으면 total_amount 자체도 그 값으로 맞춰서,
  // 이후로는 목록/상세 어디를 봐도 실제 입금액과 같은 숫자가 보이게 한다.
  if (confirmedTotalAmount != null) {
    updatePayload.total_amount = confirmedTotalAmount;
  }

  const { error } = await supabase.from("dealer_orders").update(updatePayload).eq("id", orderId);
  if (error) throw new Error(error.message);

  revalidatePath("/dealer-orders");
  revalidatePath("/inventory");
  revalidatePath("/order");
}

/**
 * 주문 거절/취소. 아직 입금 확인 전(재고 미차감)이면 상태만 바꾸고 끝나고,
 * 이미 재고가 차감된 뒤라면(입금 확인 후 취소하는 경우) 차감분을
 * 되돌려놓는다.
 */
export async function rejectDealerOrder(orderId: string) {
  const supabase = createClient();

  const { data: order, error: orderErr } = await supabase
    .from("dealer_orders")
    .select("id, stock_deducted")
    .eq("id", orderId)
    .single();
  if (orderErr || !order) throw new Error("주문을 찾을 수 없습니다.");

  if (order.stock_deducted) {
    const { data: items, error: itemsErr } = await supabase
      .from("dealer_order_items")
      .select("product_id, quantity")
      .eq("order_id", orderId);
    if (itemsErr) throw new Error(itemsErr.message);

    for (const item of items ?? []) {
      const { data: inv, error: invErr } = await supabase
        .from("inventory")
        .select("current_stock")
        .eq("product_id", item.product_id)
        .single();
      if (invErr) throw new Error(`재고 조회 실패: ${invErr.message}`);
      const nextStock = (inv?.current_stock ?? 0) + item.quantity;
      const { error: updErr } = await supabase
        .from("inventory")
        .update({ current_stock: nextStock, updated_at: new Date().toISOString() })
        .eq("product_id", item.product_id);
      if (updErr) throw new Error(`재고 복원 실패: ${updErr.message}`);
    }
  }

  const { error } = await supabase
    .from("dealer_orders")
    .update({ status: "cancelled", stock_deducted: false })
    .eq("id", orderId);
  if (error) throw new Error(error.message);

  revalidatePath("/dealer-orders");
  revalidatePath("/inventory");
  revalidatePath("/order");
}

/**
 * 취소된 주문을 관리자 화면에서 완전히 삭제 (dealer_order_items는
 * on delete cascade로 함께 삭제됨). 목록에서 취소된 주문이 계속 쌓여
 * 보이는 걸 정리하기 위한 것으로, 이미 "취소" 상태인 주문만 지울 수 있게
 * 서버에서도 다시 한 번 확인한다 — 진행 중인 주문이 실수로 삭제되는 것을
 * 막기 위해서다. (재고는 취소 시점에 이미 rejectDealerOrder에서 복원되었으므로
 * 여기서는 건드리지 않는다.)
 */
export async function deleteDealerOrder(orderId: string) {
  const supabase = createClient();

  const { data: order, error: orderErr } = await supabase
    .from("dealer_orders")
    .select("id, status, order_number, dealer_id")
    .eq("id", orderId)
    .single();
  if (orderErr || !order) throw new Error("주문을 찾을 수 없습니다.");
  if (order.status !== "cancelled") {
    throw new Error("취소된 주문만 삭제할 수 있습니다.");
  }

  const { error } = await supabase.from("dealer_orders").delete().eq("id", orderId);
  if (error) throw new Error(error.message);

  // 방금 지운 주문이 그 딜러에게 가장 최근에 발급된 번호였다면(=그 뒤로
  // 다른 번호가 아직 안 나갔다면), 다음 발급 때 같은 번호를 다시 쓸 수
  // 있게 되돌린다 — 실수로 만든 주문을 지웠다고 번호가 건너뛰지 않도록.
  if (order.order_number && order.dealer_id) {
    const { error: releaseError } = await supabase.rpc("release_dealer_order_number_if_last", {
      p_dealer_id: order.dealer_id,
      p_order_number: order.order_number,
    });
    if (releaseError) {
      console.error("release_dealer_order_number_if_last failed", releaseError);
    }
  }

  revalidatePath("/dealer-orders");
}

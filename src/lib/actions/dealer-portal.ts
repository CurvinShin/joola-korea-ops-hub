"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type PlaceOrderResult = { ok: true; message: string } | { ok: false; message: string };

/**
 * Called directly from the dealer portal's quantity-stepper UI (not a
 * <form> — the client component calls this like a normal async function
 * inside useTransition). Price is always computed here from the server's
 * own copy of the product + dealer records, never trusted from the client,
 * so a dealer can't manipulate the price by tampering with the request.
 */
export async function placeDealerOrder(
  productId: string,
  quantity: number,
  isSample: boolean = false
): Promise<PlaceOrderResult> {
  if (!Number.isFinite(quantity) || quantity < 1) {
    return { ok: false, message: "수량을 확인해주세요." };
  }

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "로그인이 필요합니다." };

  const { data: profile } = await supabase.from("profiles").select("dealer_id").eq("id", user.id).single();
  if (!profile?.dealer_id) {
    return { ok: false, message: "계정에 연결된 딜러 정보가 없습니다. 관리자에게 문의해주세요." };
  }

  const { data: dealer, error: dealerError } = await supabase
    .from("dealers")
    .select("id, discount_rate")
    .eq("id", profile.dealer_id)
    .single();
  if (dealerError || !dealer) {
    return { ok: false, message: "딜러 정보를 불러오지 못했습니다." };
  }

  const { data: product, error: productError } = await supabase
    .from("dealer_catalog")
    .select("product_id, unit_price, available_stock")
    .eq("product_id", productId)
    .single();
  if (productError || !product) {
    return { ok: false, message: "상품 정보를 불러오지 못했습니다." };
  }
  if (quantity > product.available_stock) {
    return { ok: false, message: `가용 재고(${product.available_stock}개)보다 많이 주문할 수 없습니다.` };
  }

  const basePrice = Number(product.unit_price ?? 0);
  const discountRate = Number(dealer.discount_rate ?? 0);
  // Samples are provided free of charge — no discount math needed, just 0.
  const unitPrice = isSample ? 0 : Math.round(basePrice * (1 - discountRate / 100));
  const totalAmount = unitPrice * quantity;

  const { data: order, error: orderError } = await supabase
    .from("dealer_orders")
    .insert({
      dealer_id: dealer.id,
      status: "confirmed",
      order_type: isSample ? "sample" : "regular",
      total_amount: totalAmount,
    })
    .select("id")
    .single();
  if (orderError || !order) {
    return { ok: false, message: `주문 생성에 실패했습니다: ${orderError?.message ?? ""}` };
  }

  const { error: itemError } = await supabase.from("dealer_order_items").insert({
    order_id: order.id,
    product_id: productId,
    quantity,
    unit_price: unitPrice,
  });
  if (itemError) {
    return { ok: false, message: `주문 상품 등록에 실패했습니다: ${itemError.message}` };
  }

  revalidatePath("/order");
  return { ok: true, message: "주문이 접수되었습니다." };
}

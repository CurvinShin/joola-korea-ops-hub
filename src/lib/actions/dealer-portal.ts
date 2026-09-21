"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calcDealerUnitPrice } from "@/lib/utils/pricing";

type PlaceOrderResult = { ok: true; message: string } | { ok: false; message: string };

const SHIPPING_BOX_SIZE = 10; // 패들 10개당 배송 1박스
const SHIPPING_FEE_PER_BOX = 5000;

type PricedCart =
  | {
      ok: true;
      dealerId: string;
      rows: { product_id: string; quantity: number; unit_price: number; is_demo: boolean }[];
      subtotal: number;
      autoShippingBoxes: number;
      autoShippingFee: number;
      allDemo: boolean;
    }
  | { ok: false; message: string };

/**
 * 장바구니 항목을 서버가 다시 가격을 매겨 검증한다 — 새 주문 생성
 * (placeDealerCartOrder)과 기존 주문 수정(updateDealerCartOrder)이 완전히
 * 같은 로직을 쓰도록 공유하는 부분. 가격/할인/데모구매 가능 여부는 항상
 * 클라이언트를 신뢰하지 않고 서버가 자기 DB에서 다시 계산한다.
 */
async function priceDealerCartItems(
  supabase: ReturnType<typeof createClient>,
  items: { productId: string; quantity: number; isDemo: boolean }[]
): Promise<PricedCart> {
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

  const productIds = [...new Set(items.map((i) => i.productId))];
  const { data: products, error: productsError } = await supabase
    .from("dealer_catalog")
    .select("product_id, name, unit_price, product_type, fixed_dealer_price, category, demo_purchase_allowed")
    .in("product_id", productIds);
  if (productsError || !products) {
    return { ok: false, message: "상품 정보를 불러오지 못했습니다." };
  }
  const byId = new Map(products.map((p) => [p.product_id, p]));

  const discountRatePercent = Number(dealer.discount_rate ?? 0);
  let subtotal = 0;
  let paddleQty = 0;
  const rows: { product_id: string; quantity: number; unit_price: number; is_demo: boolean }[] = [];

  for (const it of items) {
    const product = byId.get(it.productId);
    if (!product) {
      return { ok: false, message: "상품 정보를 찾을 수 없는 항목이 있습니다. 새로고침 후 다시 시도해주세요." };
    }
    // Authoritative check — never trust the client's isDemo flag for a
    // product that has demo purchases disabled (e.g. a paddle with its own
    // dedicated "(Demo)" SKU). The UI already hides the checkbox for these,
    // but a request could still be crafted to set isDemo:true directly.
    if (it.isDemo && !product.demo_purchase_allowed) {
      return {
        ok: false,
        message: `"${product.name}"은(는) 데모구매가 불가한 상품입니다. 새로고침 후 다시 시도해주세요.`,
      };
    }
    const unitPrice = calcDealerUnitPrice({
      mapPrice: Number(product.unit_price ?? 0),
      productType: product.product_type,
      discountRatePercent,
      isDemo: it.isDemo,
      fixedDealerPrice: product.fixed_dealer_price,
    });
    subtotal += unitPrice * it.quantity;
    if (product.category === "패들") paddleQty += it.quantity;
    rows.push({ product_id: it.productId, quantity: it.quantity, unit_price: unitPrice, is_demo: it.isDemo });
  }

  const autoShippingBoxes = Math.ceil(paddleQty / SHIPPING_BOX_SIZE);
  const autoShippingFee = autoShippingBoxes * SHIPPING_FEE_PER_BOX;
  const allDemo = rows.every((r) => r.is_demo);

  return { ok: true, dealerId: dealer.id, rows, subtotal, autoShippingBoxes, autoShippingFee, allDemo };
}

function validateCartInput(items: { productId: string; quantity: number; isDemo: boolean }[]): string | null {
  if (!items.length) return "담긴 상품이 없습니다.";
  for (const it of items) {
    if (!Number.isFinite(it.quantity) || it.quantity < 1) return "수량을 확인해주세요.";
  }
  return null;
}

/**
 * Called from the cart review modal when a dealer taps "주문 확정". One
 * `dealer_orders` row is created for the whole cart (status "draft"), with
 * one `dealer_order_items` row per line — matching how a real 견적서 groups
 * many products (regular and demo lines side by side) into one document.
 *
 * Deliberately does NOT touch `inventory` here: stock is only decremented
 * once an admin confirms payment on /dealer-orders (see
 * confirmDealerOrderPayment in dealer-order-admin.ts). Ordering past
 * available stock is allowed on purpose — a shortfall becomes a backorder
 * signal (negative current_stock) rather than a blocked confirmation,
 * matching how 이지어드민 already treats backorders (auto re-orders on next
 * import, but doesn't always happen, so this app needs to keep it visible
 * too).
 */
export async function placeDealerCartOrder(
  items: { productId: string; quantity: number; isDemo: boolean }[]
): Promise<PlaceOrderResult> {
  const inputError = validateCartInput(items);
  if (inputError) return { ok: false, message: inputError };

  const supabase = createClient();
  const priced = await priceDealerCartItems(supabase, items);
  if (!priced.ok) return priced;

  // 딜러별/연도별 순번으로 주문 번호를 미리 발급 (예: KR05-2630). dealers 행을
  // for update로 잠그는 DB 함수라 동시 주문에도 번호가 겹치지 않는다. 번호
  // 발급이 실패해도(예: kr_code 미설정) 주문 자체는 계속 생성되도록 order_number
  // 는 null로 두고 진행한다.
  const { data: orderNumber, error: orderNumberError } = await supabase.rpc("assign_dealer_order_number", {
    p_dealer_id: priced.dealerId,
  });
  if (orderNumberError) {
    console.error("assign_dealer_order_number failed", orderNumberError);
  }

  const { data: order, error: orderError } = await supabase
    .from("dealer_orders")
    .insert({
      dealer_id: priced.dealerId,
      status: "draft",
      order_type: priced.allDemo ? "demo" : "regular",
      total_amount: priced.subtotal,
      auto_shipping_boxes: priced.autoShippingBoxes,
      auto_shipping_fee: priced.autoShippingFee,
      order_number: orderNumber ?? null,
    })
    .select("id")
    .single();
  if (orderError || !order) {
    return { ok: false, message: `주문 생성에 실패했습니다: ${orderError?.message ?? ""}` };
  }

  const { error: itemsError } = await supabase.from("dealer_order_items").insert(
    priced.rows.map((r) => ({
      order_id: order.id,
      product_id: r.product_id,
      quantity: r.quantity,
      unit_price: r.unit_price,
      is_demo: r.is_demo,
    }))
  );
  if (itemsError) {
    return { ok: false, message: `주문 상품 등록에 실패했습니다: ${itemsError.message}` };
  }

  revalidatePath("/order");
  return {
    ok: true,
    message: "주문이 접수되었습니다. 담당자가 재고와 배송비를 확인한 뒤 최종 견적서를 보내드릴게요.",
  };
}

/**
 * 딜러가 이미 넣은 자기 주문을 고친다 — 담당자가 아직 손대지 않은
 * (status="draft") 주문에 한해서만 허용된다(RLS에서도 0025 마이그레이션으로
 * 다시 한 번 막아둠). 품목을 통째로 다시 계산해서 교체하고, 주문번호·상태·
 * 생성일은 그대로 둔다 — 새 번호를 다시 발급받지 않는다.
 */
export async function updateDealerCartOrder(
  orderId: string,
  items: { productId: string; quantity: number; isDemo: boolean }[]
): Promise<PlaceOrderResult> {
  const inputError = validateCartInput(items);
  if (inputError) return { ok: false, message: inputError };

  const supabase = createClient();
  const priced = await priceDealerCartItems(supabase, items);
  if (!priced.ok) return priced;

  const { data: existing, error: existingError } = await supabase
    .from("dealer_orders")
    .select("id, dealer_id, status")
    .eq("id", orderId)
    .maybeSingle();
  if (existingError || !existing) {
    return { ok: false, message: "주문을 찾을 수 없습니다." };
  }
  if (existing.dealer_id !== priced.dealerId) {
    return { ok: false, message: "본인 주문만 수정할 수 있습니다." };
  }
  if (existing.status !== "draft") {
    return { ok: false, message: "담당자가 이미 확인 중인 주문은 수정할 수 없습니다. 관리자에게 문의해주세요." };
  }

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

  revalidatePath("/order");
  return { ok: true, message: "주문이 수정되었습니다." };
}

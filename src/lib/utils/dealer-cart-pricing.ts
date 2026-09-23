import type { createClient } from "@/lib/supabase/server";
import { calcDealerUnitPrice } from "@/lib/utils/pricing";

// 딜러 장바구니/주문 품목에 서버가 다시 가격을 매기는 공통 로직. "use server"
// 파일(dealer-portal.ts, dealer-order-admin.ts) 양쪽에서 그대로 가져다 쓴다 —
// 이 파일 자체는 서버 액션이 아니라 평범한 유틸이라 동기 함수를 섞어 둘 수
// 있다 (Next.js는 "use server" 파일의 모든 export가 async여야 한다고 요구함).

export type PricedCart =
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

const SHIPPING_BOX_SIZE = 10; // 패들 10개당 배송 1박스
// 부가세 포함 5,500원/박스 (2026-09-21 변경, 이전 5,000원) — 이 금액 위에
// 별도로 부가세를 추가로 얹지 않는다. 딜러 화면에는 어차피 노출되지 않고,
// 관리자 쪽(OrderDetailModal 등)에서도 그대로 더하기만 한다.
export const SHIPPING_FEE_PER_BOX = 5500;

/**
 * 장바구니 항목을 서버가 다시 가격을 매겨 검증한다 — 이미 확정된 dealerId를
 * 알고 있을 때 쓰는 핵심 로직. 딜러 본인이 로그인해서 부르는 쪽
 * (dealer-portal.ts)과 관리자가 딜러 주문을 대신 고치는 쪽
 * (dealer-order-admin.ts의 updateDealerOrderItemsAdmin)이 둘 다 이 함수를
 * 공유해서, 가격/할인/데모구매 가능 여부 판정이 항상 한 곳에서만 계산된다.
 */
export async function priceCartItemsForDealer(
  supabase: ReturnType<typeof createClient>,
  dealerId: string,
  items: { productId: string; quantity: number; isDemo: boolean }[]
): Promise<PricedCart> {
  const { data: dealer, error: dealerError } = await supabase
    .from("dealers")
    .select("id, discount_rate")
    .eq("id", dealerId)
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
    // Authoritative check — never trust the caller's isDemo flag for a
    // product that has demo purchases disabled (e.g. a paddle with its own
    // dedicated "(Demo)" SKU).
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

export function validateCartInput(items: { productId: string; quantity: number; isDemo: boolean }[]): string | null {
  if (!items.length) return "담긴 상품이 없습니다.";
  for (const it of items) {
    if (!Number.isFinite(it.quantity) || it.quantity < 1) return "수량을 확인해주세요.";
  }
  return null;
}

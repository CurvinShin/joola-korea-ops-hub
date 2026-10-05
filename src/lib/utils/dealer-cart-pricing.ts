import type { createClient } from "@/lib/supabase/server";
import { calcDealerUnitPrice, calcHardgoodsPrice } from "@/lib/utils/pricing";

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

type ActivePromotion = {
  promotionId: string;
  promoGroup: string;
  promoPrice: number;
  discountRatePercent: number;
  maxQtyPerDealer: number | null;
  startsOn: string;
  endsOn: string;
};

// 오늘 날짜(한국 시간, YYYY-MM-DD) — 프로모션 활성 기간 비교에 쓴다. KST
// 기준 하루 단위라 서버가 어느 타임존에서 돌든 결과가 같다.
function todayKst(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

/**
 * 요청된 상품들 중 "오늘" 기준으로 활성화된 프로모션이 걸린 상품만 골라
 * product_id -> 프로모션 정보로 매핑한다. 데모구매에는 절대 적용하지
 * 않으므로(호출하는 쪽에서 isDemo 항목은 아예 조회 대상에서 뺀다), 여기서는
 * "이 상품에 지금 적용 가능한 프로모션이 있는가"만 본다.
 */
async function fetchActivePromotions(
  supabase: ReturnType<typeof createClient>,
  productIds: string[]
): Promise<Map<string, ActivePromotion>> {
  const map = new Map<string, ActivePromotion>();
  if (productIds.length === 0) return map;

  const { data, error } = await supabase
    .from("product_promotion_items")
    .select(
      "product_id, product_promotions(id, promo_group, promo_price, discount_rate_percent, max_qty_per_dealer, starts_on, ends_on, active)"
    )
    .in("product_id", productIds);
  if (error || !data) return map;

  const today = todayKst();
  for (const row of data as unknown as {
    product_id: string;
    product_promotions: {
      id: string;
      promo_group: string;
      promo_price: number;
      discount_rate_percent: number;
      max_qty_per_dealer: number | null;
      starts_on: string;
      ends_on: string;
      active: boolean;
    } | null;
  }[]) {
    const promo = row.product_promotions;
    if (!promo || !promo.active) continue;
    if (today < promo.starts_on || today > promo.ends_on) continue;
    map.set(row.product_id, {
      promotionId: promo.id,
      promoGroup: promo.promo_group,
      promoPrice: Number(promo.promo_price),
      discountRatePercent: Number(promo.discount_rate_percent),
      maxQtyPerDealer: promo.max_qty_per_dealer,
      startsOn: promo.starts_on,
      endsOn: promo.ends_on,
    });
  }
  return map;
}

/**
 * 이 딜러가 주어진 상품들에 대해, 주어진 기간(날짜) 안에 이미 주문한(취소
 * 제외) 수량 합계 — 프로모션 딜러당 수량 제한 검사에 쓴다. excludeOrderIds를
 * 주면 그 주문들 자체는 빼고 계산한다(딜러/관리자가 이미 넣은 주문을 그대로
 * 다시 저장하거나, 여러 주문을 하나로 합칠 때 자기 자신과 중복으로 걸리지
 * 않도록).
 */
async function sumPriorPromoQuantity(
  supabase: ReturnType<typeof createClient>,
  dealerId: string,
  productIds: string[],
  startsOn: string,
  endsOn: string,
  excludeOrderIds?: string[]
): Promise<number> {
  if (productIds.length === 0) return 0;

  const { data: orders } = await supabase
    .from("dealer_orders")
    .select("id")
    .eq("dealer_id", dealerId)
    .neq("status", "cancelled")
    .gte("order_date", startsOn)
    .lte("order_date", endsOn);
  const excluded = new Set(excludeOrderIds ?? []);
  const orderIds = (orders ?? []).map((o) => o.id).filter((id) => !excluded.has(id));
  if (orderIds.length === 0) return 0;

  const { data: items } = await supabase
    .from("dealer_order_items")
    .select("quantity")
    .in("order_id", orderIds)
    .in("product_id", productIds)
    .eq("is_demo", false);
  return (items ?? []).reduce((sum, r) => sum + r.quantity, 0);
}

/**
 * 장바구니 항목을 서버가 다시 가격을 매겨 검증한다 — 이미 확정된 dealerId를
 * 알고 있을 때 쓰는 핵심 로직. 딜러 본인이 로그인해서 부르는 쪽
 * (dealer-portal.ts)과 관리자가 딜러 주문을 대신 고치는 쪽
 * (dealer-order-admin.ts의 updateDealerOrderItemsAdmin)이 둘 다 이 함수를
 * 공유해서, 가격/할인/데모구매 가능 여부 판정이 항상 한 곳에서만 계산된다.
 *
 * opts.excludeOrderIds: 이미 존재하는 주문(들)을 수정/합치는 경우, 프로모션
 * 수량 한도 검사에서 "이미 주문한 수량"에 그 주문들 자신을 두 번 세지
 * 않도록 빼준다(새 주문 생성 시에는 생략).
 */
export async function priceCartItemsForDealer(
  supabase: ReturnType<typeof createClient>,
  dealerId: string,
  items: { productId: string; quantity: number; isDemo: boolean }[],
  opts?: { excludeOrderIds?: string[] }
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
  // 데모구매는 프로모션 대상에서 항상 제외 — 정식 구매 품목에 한해서만 조회.
  const promoEligibleIds = [...new Set(items.filter((i) => !i.isDemo).map((i) => i.productId))];
  const promoByProduct = await fetchActivePromotions(supabase, promoEligibleIds);

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

    const promo = it.isDemo ? undefined : promoByProduct.get(it.productId);
    const unitPrice = promo
      ? calcHardgoodsPrice(promo.promoPrice, promo.discountRatePercent)
      : calcDealerUnitPrice({
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

  // 프로모션 딜러당 수량 제한 — 같은 promo_group을 공유하는 상품들의 이번
  // 장바구니 수량을 합산해서, 이미 주문한(같은 기간 내) 수량과 더해 한도를
  // 넘는지 확인한다. 한 그룹에 여러 상품(예: PRO V 전 쉐입)이 걸려 있어도
  // 한도는 그룹 전체 합산 기준이다.
  const groupRequests = new Map<
    string,
    { cap: number; productIds: Set<string>; requestedQty: number; startsOn: string; endsOn: string }
  >();
  for (const it of items) {
    if (it.isDemo) continue;
    const promo = promoByProduct.get(it.productId);
    if (!promo || promo.maxQtyPerDealer == null) continue;
    const g = groupRequests.get(promo.promoGroup) ?? {
      cap: promo.maxQtyPerDealer,
      productIds: new Set<string>(),
      requestedQty: 0,
      startsOn: promo.startsOn,
      endsOn: promo.endsOn,
    };
    g.productIds.add(it.productId);
    g.requestedQty += it.quantity;
    groupRequests.set(promo.promoGroup, g);
  }
  for (const g of groupRequests.values()) {
    const priorQty = await sumPriorPromoQuantity(
      supabase,
      dealerId,
      [...g.productIds],
      g.startsOn,
      g.endsOn,
      opts?.excludeOrderIds
    );
    if (priorQty + g.requestedQty > g.cap) {
      const remaining = Math.max(g.cap - priorQty, 0);
      return {
        ok: false,
        message: `이번 프로모션은 딜러당 최대 ${g.cap}개까지 구매 가능합니다. 이미 ${priorQty}개 주문하셨고, 남은 구매 가능 수량은 ${remaining}개입니다.`,
      };
    }
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

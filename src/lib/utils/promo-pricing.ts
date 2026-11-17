import { calcHardgoodsPrice } from "@/lib/utils/pricing";

// 딜러 주문 화면(/order)에서 "지금 진행 중인" 프로모션 한 건. 서버 컴포넌트가
// product_promotions(+items)를 읽어 이 모양으로 만들어 클라이언트에 내려준다.
// 실제 주문 금액은 항상 서버(dealer-cart-pricing.ts)가 다시 계산하므로, 이
// 값은 화면 표시용이다 — 같은 공식(calcHardgoodsPrice)을 써서 두 곳의 금액이
// 어긋나지 않게 한다.
export interface DealerPromo {
  id: string;
  name: string;
  promoGroup: string;
  promoPrice: number;
  discountRatePercent: number;
  maxQtyPerDealer: number | null;
  startsOn: string;
  endsOn: string;
  // 딜러가 행사가로 주문할 수 있는 마지막 날. null이면 종료일(endsOn)까지.
  dealerOrderUntil: string | null;
  productIds: string[];
  // 이 딜러가 지금까지(같은 promo_group·같은 기간) 주문하고 남은 구매 가능 수량. 한도 없으면 null.
  remainingQty?: number | null;
}

export type PromoByProduct = Record<string, DealerPromo>;

export function promoUnitPrice(promo: DealerPromo): number {
  return calcHardgoodsPrice(promo.promoPrice, promo.discountRatePercent);
}

// 딜러가 행사가로 주문할 수 있는 마지막 날 — 마감일을 따로 정하지 않았으면 종료일.
// 딜러 화면에서 실제로 숨기는 건 DB 정책(0055)이 하고, 이 함수는 표시·판정용이다.
export function dealerOrderDeadline(endsOn: string, dealerOrderUntil: string | null | undefined): string {
  return dealerOrderUntil || endsOn;
}

export type PromoPhase = "inactive" | "upcoming" | "ordering" | "orderClosed" | "ended";

// 관리 화면 상태 배지용. today는 한국 날짜(YYYY-MM-DD).
// orderClosed = 프로모션 기간 중이지만 딜러 주문은 마감된 상태(예: 블프 11/14~11/15).
export function promoPhase(
  promo: { active: boolean; starts_on: string; ends_on: string; dealer_order_until?: string | null },
  today: string
): PromoPhase {
  if (!promo.active) return "inactive";
  if (today < promo.starts_on) return "upcoming";
  if (today > promo.ends_on) return "ended";
  if (today > dealerOrderDeadline(promo.ends_on, promo.dealer_order_until)) return "orderClosed";
  return "ordering";
}

// 프로모션 저장 전 날짜 검사. 문제가 없으면 null, 있으면 화면에 보여 줄 문구.
export function validatePromoDates(startsOn: string, endsOn: string, dealerOrderUntil: string | null): string | null {
  if (endsOn < startsOn) return "종료일은 시작일보다 빠를 수 없습니다.";
  if (dealerOrderUntil && (dealerOrderUntil < startsOn || dealerOrderUntil > endsOn)) {
    return "딜러 주문 마감일은 시작일과 종료일 사이여야 합니다.";
  }
  return null;
}

export function buildPromoByProduct(promos: DealerPromo[]): PromoByProduct {
  const map: PromoByProduct = {};
  for (const promo of promos) {
    for (const productId of promo.productIds) {
      map[productId] = promo;
    }
  }
  return map;
}

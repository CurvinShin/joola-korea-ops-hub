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
  productIds: string[];
}

export type PromoByProduct = Record<string, DealerPromo>;

export function promoUnitPrice(promo: DealerPromo): number {
  return calcHardgoodsPrice(promo.promoPrice, promo.discountRatePercent);
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

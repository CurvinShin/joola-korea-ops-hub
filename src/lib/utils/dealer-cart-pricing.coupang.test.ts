import { describe, expect, it } from "vitest";
import { priceCartItemsForDealer } from "./dealer-cart-pricing";

// 테이블별 고정 응답을 돌려주는 가짜 supabase 클라이언트 — 체인(select/eq/in/single)은 모두 자기 자신을 돌려준다.
function fakeSupabase(tables: Record<string, unknown>) {
  return {
    from(table: string) {
      const result = { data: tables[table] ?? [], error: null };
      const builder: Record<string, unknown> = {
        then: (resolve: (v: unknown) => unknown) => resolve(result),
        single: () => Promise.resolve({ data: tables[table], error: null }),
      };
      for (const m of ["select", "eq", "in", "neq", "gte", "lte"]) builder[m] = () => builder;
      return builder;
    },
  } as never;
}

const products = [
  { product_id: "p1", name: "Primo Indoor Plus", unit_price: null, product_type: "hardgoods", fixed_dealer_price: null, category: "공", demo_purchase_allowed: true },
  { product_id: "p2", name: "Hyperion CAS 16", unit_price: 329000, product_type: "hardgoods", fixed_dealer_price: null, category: "패들", demo_purchase_allowed: true },
];

describe("쿠팡로켓 딜러 주문 가격", () => {
  it("모든 품목 0원, 배송비 0, 가격 미등록 상품도 통과한다", async () => {
    const supabase = fakeSupabase({
      dealers: { id: "d-coupang", discount_rate: 0, kr_code: "쿠팡로켓" },
      dealer_catalog: products,
    });
    const r = await priceCartItemsForDealer(supabase, "d-coupang", [
      { productId: "p1", quantity: 13, isDemo: false },
      { productId: "p2", quantity: 25, isDemo: false },
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.subtotal).toBe(0);
    expect(r.autoShippingFee).toBe(0);
    expect(r.autoShippingBoxes).toBe(0);
    expect(r.rows.every((row) => row.unit_price === 0)).toBe(true);
  });

  it("일반 딜러는 가격 미등록 상품이면 여전히 막는다", async () => {
    const supabase = fakeSupabase({
      dealers: { id: "d-1", discount_rate: 30, kr_code: "KR05" },
      dealer_catalog: products,
    });
    const r = await priceCartItemsForDealer(supabase, "d-1", [{ productId: "p1", quantity: 1, isDemo: false }]);
    expect(r.ok).toBe(false);
  });
});

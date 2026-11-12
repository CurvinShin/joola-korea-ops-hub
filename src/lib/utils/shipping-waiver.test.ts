import { describe, expect, it } from "vitest";
import { isShippingWaived, SHIPPING_WAIVER_THRESHOLD } from "./dealer-cart-pricing";

describe("isShippingWaived (견적서 1건당 부가세 포함 500만원 이상)", () => {
  it("공급가액 × 1.1이 500만원 미만이면 면제하지 않는다", () => {
    expect(isShippingWaived(4_500_000)).toBe(false); // 4,950,000
    expect(isShippingWaived(871_100)).toBe(false);
  });
  it("부가세 포함 500만원부터 면제한다 (경계값)", () => {
    expect(isShippingWaived(4_545_454)).toBe(false); // 4,999,999
    expect(isShippingWaived(4_545_455)).toBe(true); // 5,000,001
    expect(Math.round(5_000_000 / 1.1) * 1.1).toBeGreaterThanOrEqual(SHIPPING_WAIVER_THRESHOLD - 1);
  });
  it("실제 견적서 사례: KR10-2662 / KR13-2617 / KR09-2631은 면제, KR07-2606은 면제 아님", () => {
    expect(isShippingWaived(6_771_700)).toBe(true);
    expect(isShippingWaived(12_132_900)).toBe(true);
    expect(isShippingWaived(11_371_500)).toBe(true);
    expect(isShippingWaived(871_100)).toBe(false);
  });
});

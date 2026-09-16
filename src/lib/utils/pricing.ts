/**
 * Dealer pricing formulas — the single source of truth for both the server
 * action that places an order (dealer-portal.ts, authoritative) and the
 * client-side preview shown in the order UI (OrderRow.tsx, display only).
 *
 * Reference: joola_pricing_stock_logic.md
 *   - hardgoods: VAT excluded first, then the dealer's own discount rate,
 *     rounded to the nearest ₩100.
 *   - apparel: flat 60% off MSRP for every dealer regardless of their
 *     individual discount rate, no VAT adjustment, rounded to the nearest ₩1.
 *   - demo purchase ("데모구매"): fixed 65% off MSRP, VAT excluded first,
 *     same rounding as hardgoods. Applies uniformly across product types —
 *     dealers never receive free samples, a demo purchase is simply billed
 *     at this fixed discount instead of the dealer's normal rate.
 *
 * All prices are VAT-exclusive (공급가액); 경리나라 adds 10% VAT on top when
 * the actual 견적서 is created there.
 */

export type ProductType = "hardgoods" | "apparel";

const VAT_RATE = 0.1;
const DEMO_DISCOUNT = 0.65;
const APPAREL_DISCOUNT = 0.6;

function round100(n: number): number {
  return Math.round(n / 100) * 100;
}

function clampNonNegative(n: number): number {
  return n < 0 ? 0 : n;
}

export function calcHardgoodsPrice(mapPrice: number, discountRatePercent: number): number {
  const discount = discountRatePercent / 100;
  return clampNonNegative(round100((mapPrice / (1 + VAT_RATE)) * (1 - discount)));
}

export function calcApparelPrice(mapPrice: number): number {
  return clampNonNegative(Math.round(mapPrice * (1 - APPAREL_DISCOUNT)));
}

export function calcDemoPrice(mapPrice: number): number {
  return clampNonNegative(round100((mapPrice / (1 + VAT_RATE)) * (1 - DEMO_DISCOUNT)));
}

/**
 * The single entry point both call sites should use: given a product's MSRP
 * (mapPrice, stored as products.unit_price), its type, the dealer's discount
 * rate (0-100, percent), and whether this line is a demo purchase, returns
 * the VAT-exclusive unit price to charge.
 */
export function calcDealerUnitPrice(params: {
  mapPrice: number;
  productType: ProductType;
  discountRatePercent: number;
  isDemo: boolean;
}): number {
  const { mapPrice, productType, discountRatePercent, isDemo } = params;
  if (isDemo) return calcDemoPrice(mapPrice);
  if (productType === "apparel") return calcApparelPrice(mapPrice);
  return calcHardgoodsPrice(mapPrice, discountRatePercent);
}

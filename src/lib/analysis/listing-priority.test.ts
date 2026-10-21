import { describe, expect, it } from "vitest";
import { buildListingPriority, familyOf, keyOf, type QuoteItemRow } from "./listing-priority";

let seq = 0;
function row(over: Partial<QuoteItemRow> & { product_name: string; kr_code: string }): QuoteItemRow {
  seq += 1;
  return {
    order_no: `O${seq}`,
    quote_date: "2026-10-01",
    category: "패들",
    subcategory: null,
    quantity: 2,
    unit_price: 100000,
    amount: 200000,
    ...over,
  };
}

describe("familyOf", () => {
  it("색상·사이즈·PDF 줄바꿈 공백이 달라도 같은 제품군으로 묶는다", () => {
    const a = familyOf("123456 JOOLA Scorpeus Pro IV 16mm, Black");
    const b = familyOf("123457 JOOLA Scor peus ProIV 14mm");
    expect(a.key).toBe(b.key);
    expect(a.label).toBe("Scorpeus Pro IV");
  });

  it("Pro IV와 Pro V는 다른 제품군이다", () => {
    expect(familyOf("Perseus Pro V 16mm").key).not.toBe(familyOf("Perseus Pro IV 16mm").key);
  });

  it("Hyperion Vision은 Hyperion Pro V로 잘못 묶이지 않는다", () => {
    expect(familyOf("Hyperion Vision CAS 16mm").label).toBe("Hyperion Vision");
  });

  it("규칙에 없는 제품은 코드·색상을 걷어낸 이름으로 묶는다", () => {
    const a = familyOf("654321 JOOLA Dash Paddle - Blue");
    const b = familyOf("654322 JOOLA Dash Paddle - Red");
    expect(a.key).toBe(b.key);
  });
});

describe("keyOf", () => {
  it("대소문자·공백·특수문자를 무시한다", () => {
    expect(keyOf("HC-40")).toBe("hc40");
    expect(keyOf("Neoprene 패들 커버")).toBe("neoprene패들커버");
  });
});

describe("buildListingPriority", () => {
  const base = [
    row({ kr_code: "A", product_name: "111111 Scorpeus Pro IV" }),
    row({ kr_code: "B", product_name: "111111 Scorpeus Pro IV" }),
    row({ kr_code: "A", product_name: "222222 Wristband" }),
    row({ kr_code: "B", product_name: "222222 Wristband" }),
  ];

  it("딜러 1곳만 산 제품(독점·단발 대량 구매)은 순위에서 빼고 제외 목록에 둔다", () => {
    const res = buildListingPriority([...base, row({ kr_code: "A", product_name: "333333 Dash Paddle 800", quantity: 800, amount: 8_000_000 })]);
    expect(res.candidates.map((c) => c.label)).not.toContain("Dash Paddle 800");
    expect(res.excluded.find((e) => e.label.startsWith("Dash"))?.reason).toBe("exclusive");
  });

  it("데모 판매와 0원 무상 품목은 수요로 세지 않는다", () => {
    const res = buildListingPriority([
      row({ kr_code: "A", product_name: "444444 Magnus Pro IV (demo)" }),
      row({ kr_code: "B", product_name: "444444 Magnus Pro IV (demo)" }),
      row({ kr_code: "A", product_name: "555555 Graf Pro V", amount: 0 }),
      row({ kr_code: "B", product_name: "555555 Graf Pro V", amount: 0 }),
    ]);
    expect(res.candidates).toHaveLength(0);
    expect(res.itemCount).toBe(0);
  });

  it("이미 등록된 제품군은 후보에서 빠진다", () => {
    const res = buildListingPriority(base, { listedKeys: new Set(["wristband"]) });
    expect(res.candidates.map((c) => c.label)).toEqual(["Scorpeus Pro IV"]);
    expect(res.excluded.find((e) => e.label === "Wristband")?.reason).toBe("listed");
  });

  it("최근 10주 수량은 가장 최근 견적서 날짜를 기준으로 센다", () => {
    const res = buildListingPriority([
      row({ kr_code: "A", product_name: "111111 Scorpeus Pro IV", quote_date: "2026-01-05", quantity: 5 }),
      row({ kr_code: "B", product_name: "111111 Scorpeus Pro IV", quote_date: "2026-10-01", quantity: 3 }),
    ]);
    expect(res.dataThrough).toBe("2026-10-01");
    expect(res.candidates[0].quantity).toBe(8);
    expect(res.candidates[0].recentQuantity).toBe(3);
  });

  it("지난 순위와 비교해 변동을 계산하고 새로 등장한 제품은 null이다", () => {
    const res = buildListingPriority(base, { previousRanks: new Map([["scorpeuspro iv".replace(/\s/g, ""), 5]]) });
    const sc = res.candidates.find((c) => c.label === "Scorpeus Pro IV")!;
    expect(sc.rankChange).toBe(5 - sc.rank);
    expect(res.candidates.find((c) => c.label === "Wristband")!.rankChange).toBeNull();
  });
});

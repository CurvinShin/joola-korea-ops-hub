import { describe, expect, it } from "vitest";
import { parseOrderPaste } from "./order-paste";

const catalog = [
  { product_id: "p1", sku: "600001", name: "Primo Indoor Plus" },
  { product_id: "p2", sku: "18500", name: "Hyperion CAS 16" },
];

describe("parseOrderPaste", () => {
  it("공백·탭·쉼표·x 구분을 모두 읽고 같은 SKU는 합친다", () => {
    const r = parseOrderPaste("600001 13\n18500\t5\n600001,2\n18500 x 1", catalog);
    expect(r.errors).toEqual([]);
    expect(r.lines.map((l) => [l.sku, l.quantity])).toEqual([
      ["600001", 15],
      ["18500", 6],
    ]);
  });

  it("없는 SKU와 형식 오류는 줄 번호와 함께 알려준다", () => {
    const r = parseOrderPaste("999999 3\n그냥 글자\n\n600001 0", catalog);
    expect(r.lines).toEqual([]);
    expect(r.errors).toHaveLength(3);
    expect(r.errors[0]).toContain("1번째 줄");
    expect(r.errors[1]).toContain("2번째 줄");
    expect(r.errors[2]).toContain("4번째 줄");
  });
});

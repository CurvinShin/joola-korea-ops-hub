import { describe, expect, it } from "vitest";
import { buildImportPlan, categoryOf, parseCsv, parseHqStockCsv, roundUpTo } from "./import-plan";

const csv = [
  "SKU,UPC,Item,Department,Class,On Hand Quantity,Quantity Committed,Available Quantity,Outer Carton Quantity,Incoming Inventory,QtyDemand,Sum of TotalCuft,item CUFT,Discontinued?",
  '600001,1,"JOOLA Primo Indoor Plus Pickleball - Neon Green, 3 Pack",Pickleball,Equipment : Balls : Indoor Balls,,,,288,,,0,0,No',
  "600091,2,JOOLA HC-40 Pickleball - Shock Yellow - 3 Pack,Pickleball,Equipment : Balls : Hardcourt Balls,295,,295,24,,,0,0,No",
  "600556,3,JOOLA Perseus Pro V Ben Johns Blaze Red 14mm,Pickleball,Rackets : Paddles : Individual,6970,215,6755,25,,,0,0,Yes",
  "600477,4,JOOLA Dash Pickleball Paddle - Bolt Blue,Pickleball,Rackets : Paddles : Individual,100,100,,25,,,0,0,Yes",
  "14575,5,JOOLA Essential Visor (White),Apparel,Accessories : Headwear : Hats,215,5,210,100,,,0,0,No",
].join("\n");

describe("parseCsv / parseHqStockCsv", () => {
  it("따옴표 안의 쉼표를 처리한다", () => {
    expect(parseCsv('a,"b,c",d\n1,2,3')).toEqual([["a", "b,c", "d"], ["1", "2", "3"]]);
  });
  it("본사 재고 CSV를 SKU별로 읽는다 (빈 가용 = 0, 단종 표시)", () => {
    const r = parseHqStockCsv(csv);
    if ("error" in r) throw new Error(r.error);
    expect(r.stock.get("600001")?.available).toBe(0);
    expect(r.stock.get("600001")?.carton).toBe(288);
    expect(r.stock.get("600556")?.discontinued).toBe(true);
    expect(r.stock.get("600477")?.available).toBe(0);
  });
  it("다른 CSV면 에러", () => {
    expect("error" in parseHqStockCsv("a,b\n1,2")).toBe(true);
  });
});

describe("categoryOf", () => {
  it("제품군을 판단한다", () => {
    expect(categoryOf("JOOLA Perseus Pro V Ben Johns", "Rackets : Paddles : Individual")).toBe("PRO V");
    expect(categoryOf("JOOLA Hyperion Pro IV 14mm", "Rackets : Paddles : Individual")).toBe("PRO IV");
    expect(categoryOf("JOOLA HC-40 Pickleball - 3 Pack", "Equipment : Balls : Hardcourt Balls")).toBe("볼");
    expect(categoryOf("JOOLA Dash Pickleball Paddle - Bolt Blue", "Rackets : Paddles : Individual")).toBe("Dash 패들");
    expect(categoryOf("JOOLA Essential Visor", "Accessories : Headwear : Hats")).toBe("모자");
    expect(categoryOf("x", "", "특수")).toBe("특수");
  });
});

describe("buildImportPlan", () => {
  const r = parseHqStockCsv(csv);
  if ("error" in r) throw new Error(r.error);
  const hq = r.stock;
  it("딜러 요청과 직접 입력을 SKU별로 합친다", () => {
    const rows = buildImportPlan(
      [
        { sku: "600556", name: "", qty: 6, source: "딜러" },
        { sku: "600556", name: "", qty: 4, source: "딜러" },
        { sku: "600556", name: "", qty: 10, source: "직접" },
      ],
      hq,
      new Map([["600556", 4]])
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ category: "PRO V", dealerQty: 10, manualQty: 10, importQty: 20, hqAvailable: 6755, tplAvailable: 4, hqShortage: 0, source: "딜러 10 + 직접 10" });
    expect(rows[0].notes).toContain("본사 단종 표시");
  });
  it("볼은 카톤 단위로 올리고, 본사 가용이 모자라면 부족 수량을 계산한다", () => {
    const rows = buildImportPlan([{ sku: "600001", name: "", qty: 1000, source: "직접" }], hq, new Map());
    expect(rows[0].importQty).toBe(1152); // 288 × 4
    expect(rows[0].hqShortage).toBe(1152);
    const hc = buildImportPlan([{ sku: "600091", name: "", qty: 600, source: "직접" }], hq, new Map());
    expect(hc[0].importQty).toBe(600);
    expect(hc[0].hqShortage).toBe(305);
  });
  it("패들은 카톤 올림 없이 요청 수량 그대로, 가용 0이면 전량 부족", () => {
    const rows = buildImportPlan([{ sku: "600477", name: "", qty: 88, source: "직접" }], hq, new Map());
    expect(rows[0].importQty).toBe(88);
    expect(rows[0].hqShortage).toBe(88);
  });
  it("본사 CSV에 없는 SKU는 확인 필요로 표시한다", () => {
    const rows = buildImportPlan([{ sku: "99999", name: "임의 상품", qty: 3, source: "직접" }], hq, new Map());
    expect(rows[0].hqAvailable).toBeNull();
    expect(rows[0].notes.join()).toContain("확인 필요");
  });
  it("roundUpTo", () => {
    expect(roundUpTo(1000, 288)).toBe(1152);
    expect(roundUpTo(0, 288)).toBe(0);
    expect(roundUpTo(7, 1)).toBe(7);
  });
});

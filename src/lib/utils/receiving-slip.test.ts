import { describe, expect, it } from "vitest";
import {
  buildReceivingRows,
  buildRegistrationSheet,
  buildSlipSheet,
  isValidEan13,
  parseBarcodeRows,
  parsePackingRows,
  REGISTRATION_HEADER,
} from "./receiving-slip";

const packing = [
  ["JOOLA GLOBAL LIMITED"],
  [],
  ["PO#", "SKU", "Item Description", "Qty (pcs)", "Total Ctn", "HBL"],
  ["PO-1", 600477.0, "JOOLA Dash Pickleball Paddle - Bolt Blue", 400, 16, "X"],
  ["PO-1", 1111, "1111 header card", 40, 1, "X"],
  ["PO-2", "600016", "Perseus Pro IV", 24, 2, "X"],
  ["PO-2", "600016.0", "Perseus Pro IV", 6, 1, "X"],
  ["PO-3", 600981, "Luggage tag", null, null, "X"],
  ["TOTAL", "", "", 470, 20, ""],
  ["Cargo deliver to"],
];

describe("parsePackingRows", () => {
  it("SKU별로 합산하고 TOTAL 행에서 멈춘다", () => {
    const r = parsePackingRows(packing);
    expect(r.lines).toEqual([
      { sku: "600477", name: "JOOLA Dash Pickleball Paddle - Bolt Blue", qty: 400 },
      { sku: "1111", name: "1111 header card", qty: 40 },
      { sku: "600016", name: "Perseus Pro IV", qty: 30 },
    ]);
    expect(r.declaredTotal).toBe(470);
    expect(r.warnings).toEqual(["SKU 600981: 수량을 읽지 못해 건너뜀"]);
  });
  it("TOTAL과 합계가 다르면 경고", () => {
    const bad = packing.map((r) => (r[0] === "TOTAL" ? ["TOTAL", "", "", 999] : r));
    expect(parsePackingRows(bad).warnings.some((w) => w.includes("999"))).toBe(true);
  });
  it("머리글이 없으면 빈 결과", () => {
    expect(parsePackingRows([["a", "b"]]).lines).toEqual([]);
  });
});

describe("parseBarcodeRows", () => {
  const rows = [
    ["SKU", "UPC", "Item"],
    [600477, 4070116004779, "JOOLA Dash Pickleball Paddle - Bolt Blue"],
    ["1111", "- None -", "1111"],
    ["600091", "4070116000917", "JOOLA HC-40"],
  ];
  it("UPC가 있는 행만 SKU로 읽는다", () => {
    const m = parseBarcodeRows(rows);
    expect(m.size).toBe(2);
    expect(m.get("600477")?.upc).toBe("4070116004779");
    expect(m.get("600091")?.item).toBe("JOOLA HC-40");
    expect(m.has("1111")).toBe(false);
  });
});

describe("isValidEan13", () => {
  it("검산 숫자", () => {
    expect(isValidEan13("4070116004779")).toBe(true);
    expect(isValidEan13("4070116004778")).toBe(false);
  });
});

describe("buildReceivingRows / 전표 / 상품등록", () => {
  const lines = parsePackingRows(packing).lines;
  const hub = new Map([["600016", { name: "Perseus Pro IV", ezadmin_code: "05304" }]]);
  const excluded = new Set(["1111"]);

  it("Hub 코드가 있으면 ready, 없으면 needsRegistration, 제외는 excluded", () => {
    const rows = buildReceivingRows({ lines, hub, manualCodes: {}, excluded });
    expect(rows.map((r) => r.status)).toEqual(["needsRegistration", "excluded", "ready"]);
  });

  it("직접 입력한 5자리 코드는 전표에 들어가고, 형식이 틀리면 무시", () => {
    const ok = buildReceivingRows({ lines, hub, manualCodes: { "600477": "07860" }, excluded });
    expect(ok[0]).toMatchObject({ code: "07860", status: "ready" });
    const bad = buildReceivingRows({ lines, hub, manualCodes: { "600477": "7860" }, excluded });
    expect(bad[0]).toMatchObject({ code: null, status: "needsRegistration" });
  });

  it("전표는 상품코드·요청수량·입고수량 3열, 코드 없는 줄·제외 줄은 뺀다", () => {
    const rows = buildReceivingRows({ lines, hub, manualCodes: {}, excluded });
    expect(buildSlipSheet(rows)).toEqual([
      ["상품코드", "요청수량", "입고수량"],
      ["05304", 30, 30],
    ]);
  });

  it("상품등록 양식: 74열, 이름은 'SKU 품명', 공급처, 바코드(숫자)", () => {
    const rows = buildReceivingRows({ lines, hub, manualCodes: {}, excluded });
    const barcodes = parseBarcodeRows([
      ["SKU", "UPC", "Item"],
      [600477, 4070116004779, "JOOLA Dash Pickleball Paddle - Bolt Blue"],
    ]);
    const r = buildRegistrationSheet(rows, barcodes);
    expect(r.sheet[0]).toHaveLength(74);
    expect(r.sheet).toHaveLength(2);
    const row = r.sheet[1];
    expect(row).toHaveLength(REGISTRATION_HEADER.length);
    expect(row[0]).toBe("600477 JOOLA Dash Pickleball Paddle - Bolt Blue");
    expect(row[1]).toBe("스포츠스쿼드");
    expect(row[REGISTRATION_HEADER.indexOf("바코드")]).toBe(4070116004779);
    expect(r.missingBarcode).toEqual([]);
  });

  it("바코드를 못 찾으면 목록에 남긴다", () => {
    const rows = buildReceivingRows({ lines, hub, manualCodes: {}, excluded });
    expect(buildRegistrationSheet(rows, new Map()).missingBarcode).toEqual(["600477"]);
  });
});

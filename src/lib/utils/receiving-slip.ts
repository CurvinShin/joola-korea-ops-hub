/**
 * 입고전표 만들기 — 수입 패킹리스트(PL & CI)를 읽어 이지어드민 입고전표·상품등록 양식으로 바꾼다.
 *
 * 흐름 (화면: /inventory/receiving)
 *  1) 패킹리스트의 SKU별 수량을 모은다 (같은 SKU가 여러 줄이면 합산).
 *  2) Hub 제품의 상품코드(products.ezadmin_code)와 SKU로 매칭한다.
 *  3) 상품코드가 없는 제품(한국에 처음 들어오는 제품)은 바코드 파일(SKU·UPC)로 상품등록 양식을 만든다.
 *  4) 상품코드가 모두 정해지면 `상품코드 · 요청수량 · 입고수량` 3열 입고전표를 만든다.
 *
 * 이 파일은 엑셀을 직접 읽지 않고, 이미 행 배열로 바뀐 데이터만 다룬다 (테스트하기 쉽게).
 */

export type Row = unknown[];

export interface PackingLine {
  sku: string;
  name: string;
  qty: number;
}

export interface PackingParse {
  lines: PackingLine[];
  /** 패킹리스트 맨 아래 TOTAL 행의 수량 (없으면 null) — 합계 검산용 */
  declaredTotal: number | null;
  warnings: string[];
}

function text(v: unknown): string {
  return v === null || v === undefined ? "" : String(v).replace(/ /g, " ").trim();
}

/** 12345, "12345", "12345.0" → "12345". 숫자가 아니면 null. */
export function normalizeSku(v: unknown): string | null {
  if (typeof v === "number" && Number.isFinite(v)) return String(Math.round(v));
  const s = text(v).replace(/\.0+$/, "");
  return /^\d+$/.test(s) ? s : null;
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = text(v).replace(/,/g, "");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** 패킹리스트 한 시트(행 배열)에서 SKU·품명·수량을 읽는다. 표 머리글(SKU, Qty)을 못 찾으면 lines가 빈 배열. */
export function parsePackingRows(rows: Row[]): PackingParse {
  const warnings: string[] = [];
  let hdr = -1;
  let skuCol = -1;
  let qtyCol = -1;
  let nameCol = -1;

  for (let r = 0; r < Math.min(rows.length, 80); r++) {
    const cells = rows[r].map((c) => text(c).toLowerCase());
    const s = cells.findIndex((c) => c === "sku");
    const q = cells.findIndex((c) => /^qty/.test(c));
    if (s !== -1 && q !== -1) {
      hdr = r;
      skuCol = s;
      qtyCol = q;
      nameCol = cells.findIndex((c) => c.includes("description"));
      break;
    }
  }
  if (hdr === -1) return { lines: [], declaredTotal: null, warnings };

  const bySku = new Map<string, PackingLine>();
  let declaredTotal: number | null = null;

  for (let r = hdr + 1; r < rows.length; r++) {
    const row = rows[r];
    const first = row.map((c) => text(c)).find((c) => c !== "") ?? "";
    if (/^total/i.test(first)) {
      declaredTotal = toNumber(row[qtyCol]);
      break;
    }
    const sku = normalizeSku(row[skuCol]);
    if (!sku) continue;
    const qty = toNumber(row[qtyCol]);
    if (qty === null || qty <= 0) {
      warnings.push(`SKU ${sku}: 수량을 읽지 못해 건너뜀`);
      continue;
    }
    const name = nameCol === -1 ? "" : text(row[nameCol]);
    const prev = bySku.get(sku);
    if (prev) {
      prev.qty += qty;
      if (!prev.name && name) prev.name = name;
    } else {
      bySku.set(sku, { sku, name, qty });
    }
  }

  const lines = Array.from(bySku.values());
  const sum = lines.reduce((a, l) => a + l.qty, 0);
  if (declaredTotal !== null && declaredTotal !== sum) {
    warnings.push(`패킹리스트 TOTAL(${declaredTotal})과 SKU별 합계(${sum})가 다릅니다. 파일을 확인해주세요.`);
  }
  return { lines, declaredTotal, warnings };
}

export interface BarcodeInfo {
  upc: string;
  item: string;
}

/** 바코드 파일(CSV/엑셀)의 SKU·UPC·Item 열을 읽는다. UPC가 없거나 "- None -"인 행은 건너뛴다. */
export function parseBarcodeRows(rows: Row[]): Map<string, BarcodeInfo> {
  const out = new Map<string, BarcodeInfo>();
  let hdr = -1;
  let skuCol = -1;
  let upcCol = -1;
  let itemCol = -1;
  for (let r = 0; r < Math.min(rows.length, 20); r++) {
    const cells = rows[r].map((c) => text(c).toLowerCase());
    const s = cells.findIndex((c) => c === "sku");
    const u = cells.findIndex((c) => c === "upc" || c === "barcode" || c === "바코드");
    if (s !== -1 && u !== -1) {
      hdr = r;
      skuCol = s;
      upcCol = u;
      itemCol = cells.findIndex((c) => c === "item" || c === "item name" || c === "name");
      break;
    }
  }
  if (hdr === -1) return out;

  for (let r = hdr + 1; r < rows.length; r++) {
    const row = rows[r];
    const sku = normalizeSku(row[skuCol]);
    if (!sku) continue;
    const raw = row[upcCol];
    const upc = typeof raw === "number" ? String(Math.round(raw)) : text(raw).replace(/\.0+$/, "");
    if (!/^\d{8,14}$/.test(upc)) continue;
    out.set(sku, { upc, item: itemCol === -1 ? "" : text(row[itemCol]) });
  }
  return out;
}

/** EAN-13 검산 숫자가 맞는지 (13자리가 아니면 검사하지 않고 true). */
export function isValidEan13(upc: string): boolean {
  if (!/^\d{13}$/.test(upc)) return true;
  const sum = upc
    .slice(0, 12)
    .split("")
    .reduce((a, d, i) => a + Number(d) * (i % 2 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === Number(upc[12]);
}

/** 상품코드는 이지어드민이 부여하는 5자리 숫자(앞자리 0 포함 가능). */
export function isValidEzadminCode(code: string): boolean {
  return /^\d{5}$/.test(code.trim());
}

export type RowStatus = "ready" | "needsRegistration" | "excluded";

export interface ReceivingRow {
  sku: string;
  /** 패킹리스트 품명 */
  name: string;
  qty: number;
  /** Hub 제품 이름 (Hub에 없으면 null) */
  hubName: string | null;
  /** 최종 상품코드 — Hub 값, 없으면 직접 입력한 값, 없으면 null */
  code: string | null;
  excluded: boolean;
  status: RowStatus;
}

/** 자리수가 짧은 SKU(예: 1111 헤더카드)는 제품이 아니라 포장 부자재일 가능성이 커서 기본으로 제외한다. */
export function isLikelyNonProduct(sku: string): boolean {
  return sku.length < 5;
}

export function buildReceivingRows(params: {
  lines: PackingLine[];
  hub: Map<string, { name: string; ezadmin_code: string | null }>;
  manualCodes: Record<string, string>;
  excluded: Set<string>;
}): ReceivingRow[] {
  const { lines, hub, manualCodes, excluded } = params;
  return lines.map((l) => {
    const h = hub.get(l.sku) ?? null;
    const hubCode = h?.ezadmin_code && h.ezadmin_code.trim() !== "" ? h.ezadmin_code.trim() : null;
    const typed = (manualCodes[l.sku] ?? "").trim();
    const code = hubCode ?? (isValidEzadminCode(typed) ? typed : null);
    const isExcluded = excluded.has(l.sku);
    return {
      sku: l.sku,
      name: l.name,
      qty: l.qty,
      hubName: h?.name ?? null,
      code,
      excluded: isExcluded,
      status: isExcluded ? "excluded" : code ? "ready" : "needsRegistration",
    };
  });
}

export const SLIP_HEADER = ["상품코드", "요청수량", "입고수량"] as const;

/** 이지어드민 입고전표 일괄업로드 양식: 상품코드 · 요청수량 · 입고수량 (요청=입고). 코드가 없는 줄은 뺀다. */
export function buildSlipSheet(rows: ReceivingRow[]): (string | number)[][] {
  const body = rows
    .filter((r) => r.status === "ready" && r.code)
    .map((r) => [r.code as string, r.qty, r.qty] as (string | number)[]);
  return [Array.from(SLIP_HEADER), ...body];
}

/** 이지어드민 상품등록 일괄등록 양식의 열 머리글 (74열, 순서 그대로). */
export const REGISTRATION_HEADER = [
  "상품명", "공급처코드 / 공급처명", "공급처 상품명", "공급처 옵션", "원산지", "택배비", "중량", "원가", "공급가", "판매가", "시중가",
  "옵션1", "옵션2", "옵션3", "옵션관리", "바코드", "대표 이미지", "설명 이미지1", "설명 이미지2", "설명 이미지3", "설명 이미지4",
  "설명 이미지5", "비고 이미지", "상품설명", "상품설명2", "재고경고수량", "재고위험수량", "합포불가", "동일상품 합포가능 수량", "로케이션",
  "메모", "제조사", "사은품", "담당MD", "관리자(정)", "관리자(부)", "무료배송", "카테고리", "배송타입", "매장간이동", "판매시작일",
  "입고대기", "판매처코드 / 판매처명", "상품태그", "상품추가항목1", "상품추가항목2", "상품추가항목3", "상품추가항목4", "상품추가항목5",
  "상품추가항목6", "상품추가항목7", "상품추가항목8", "상품추가항목9", "상품추가항목10", "소진시 품절", "입고시 품절해제",
  "소진시 일시품절", "입고시 일시품절해제", "옵션추가항목1", "옵션추가항목2", "옵션추가항목3", "옵션추가항목4", "옵션추가항목5",
  "옵션추가금액(원가)", "옵션추가금액(판매가)", "매칭시 자동취소", "유통기한 경고 설정", "판매상태", "원가메모", "재고단위1",
  "재고단위2", "재고단위3", "재고단위4", "재고단위5",
] as const;

export const SUPPLIER_NAME = "스포츠스쿼드";
const BARCODE_COL = REGISTRATION_HEADER.indexOf("바코드");

export interface RegistrationBuild {
  sheet: (string | number)[][];
  /** 바코드를 못 찾아 비워 둔 SKU */
  missingBarcode: string[];
  /** 13자리인데 검산 숫자가 안 맞는 SKU */
  suspectBarcode: string[];
}

/** 상품코드가 아직 없는(제외하지 않은) 제품들의 상품등록 양식. 상품명은 "SKU 품명", 바코드는 SKU로 찾는다. */
export function buildRegistrationSheet(rows: ReceivingRow[], barcodes: Map<string, BarcodeInfo>): RegistrationBuild {
  const missingBarcode: string[] = [];
  const suspectBarcode: string[] = [];
  const body: (string | number)[][] = [];
  for (const r of rows) {
    if (r.status !== "needsRegistration") continue;
    const b = barcodes.get(r.sku);
    const row: (string | number)[] = REGISTRATION_HEADER.map(() => "");
    const itemName = (b?.item || r.name).replace(/^\d{4,}\s+/, "").trim();
    row[0] = `${r.sku} ${itemName}`;
    row[1] = SUPPLIER_NAME;
    if (b) {
      row[BARCODE_COL] = Number(b.upc);
      if (!isValidEan13(b.upc)) suspectBarcode.push(r.sku);
    } else {
      missingBarcode.push(r.sku);
    }
    body.push(row);
  }
  return { sheet: [Array.from(REGISTRATION_HEADER), ...body], missingBarcode, suspectBarcode };
}

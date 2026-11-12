// 수입요청서 만들기 — 딜러 수입 요청 + 상시 수입 필요 목록 + 본사 재고(CSV) + 한국 3PL(허브) 재고를 합쳐
// 상품(SKU)별 수입 요청 수량과 부족 여부를 계산한다. (화면/엑셀 어디서나 같은 규칙을 쓰도록 순수 함수로 분리)

export type NeedSource = "딜러" | "직접";

export type NeedLine = {
  sku: string;
  name: string;
  qty: number;
  source: NeedSource;
  category?: string | null;
  note?: string | null;
};

export type HqStock = {
  name: string;
  available: number; // Available Quantity (비어 있으면 0)
  incoming: number; // Incoming Inventory
  carton: number; // Outer Carton Quantity
  discontinued: boolean;
  klass: string; // "Equipment : Balls : Hardcourt Balls"
};

export type PlanRow = {
  sku: string;
  name: string;
  category: string;
  dealerQty: number;
  manualQty: number;
  needQty: number; // 딜러 + 직접
  importQty: number; // 단위 올림 후 최종 수입 수량
  unit: number; // 올림 단위 (1이면 올림 없음)
  hqAvailable: number | null; // null = 본사 CSV에 없음(또는 CSV 미첨부)
  hqIncoming: number;
  tplAvailable: number | null; // null = 허브에 없는 상품
  hqShortage: number; // 본사 가용으로 못 채우는 수량
  source: string; // "딜러 12 + 직접 5"
  notes: string[];
};

export function categoryOf(name: string, klass: string, explicit?: string | null): string {
  if (explicit && explicit.trim()) return explicit.trim();
  const n = name.toLowerCase();
  const k = klass.toLowerCase();
  if (/\bpro iv\b/.test(n) && k.includes("paddle")) return "PRO IV";
  if (/\bpro v\b/.test(n) && k.includes("paddle")) return "PRO V";
  if (/\bpro iv\b/.test(n) && !k) return "PRO IV";
  if (/\bpro v\b/.test(n) && !k) return "PRO V";
  if (k.includes("balls") || /pickleball\s*-.*(pack|ball)|\bhc-?40\b/.test(n)) return "볼";
  if (/\bdash\b/.test(n) && (k.includes("paddle") || !k)) return "Dash 패들";
  if (k.includes("headwear")) return "모자";
  if (k.includes("keychain")) return "키체인";
  if (k.includes("bags")) return "가방";
  const parts = klass.split(":").map((s) => s.trim()).filter(Boolean);
  return parts[1] ?? parts[0] ?? "기타";
}

const CATEGORY_ORDER = ["PRO IV", "PRO V", "볼", "Dash 패들", "모자", "키체인", "가방"];
const catRank = (c: string) => {
  const i = CATEGORY_ORDER.indexOf(c);
  return i < 0 ? CATEGORY_ORDER.length : i;
};

export function roundUpTo(qty: number, unit: number): number {
  if (qty <= 0) return 0;
  if (unit <= 1) return qty;
  return Math.ceil(qty / unit) * unit;
}

/**
 * @param lines 딜러 접수 요청 + 상시 필요 목록 (SKU 중복 가능)
 * @param hq 본사 재고 CSV (SKU → 재고). CSV를 안 올렸으면 빈 Map
 * @param tpl 한국 3PL(허브) 가용 재고 (SKU → 수량, 음수 가능)
 */
export function buildImportPlan(lines: NeedLine[], hq: Map<string, HqStock>, tpl: Map<string, number>): PlanRow[] {
  const bySku = new Map<string, NeedLine[]>();
  for (const l of lines) {
    if (!l.sku || !(l.qty > 0)) continue;
    const arr = bySku.get(l.sku) ?? [];
    arr.push(l);
    bySku.set(l.sku, arr);
  }

  const rows: PlanRow[] = [];
  for (const [sku, ls] of bySku) {
    const h = hq.get(sku);
    const dealerQty = ls.filter((l) => l.source === "딜러").reduce((s, l) => s + l.qty, 0);
    const manualQty = ls.filter((l) => l.source === "직접").reduce((s, l) => s + l.qty, 0);
    const needQty = dealerQty + manualQty;
    const name = h?.name || ls.find((l) => l.name)?.name || "";
    const explicit = ls.find((l) => l.category)?.category ?? null;
    const category = categoryOf(name, h?.klass ?? "", explicit);
    // 볼은 본사 카톤(Outer Carton) 단위로만 출하되므로 카톤 단위로 올림. 패들 등은 요청 수량 그대로.
    const unit = category === "볼" && h && h.carton > 1 ? h.carton : 1;
    const importQty = roundUpTo(needQty, unit);
    const hqAvailable = h ? h.available : null;
    const hqShortage = hqAvailable === null ? 0 : Math.max(0, importQty - Math.max(0, hqAvailable));
    const tplAvailable = tpl.has(sku) ? (tpl.get(sku) as number) : null;

    const notes: string[] = [];
    for (const l of ls) if (l.note && l.note.trim()) notes.push(l.note.trim());
    if (unit > 1 && importQty !== needQty) notes.push(`카톤 ${unit}개 단위로 올림 (요청 ${needQty}개)`);
    if (h) {
      if (hqShortage > 0) notes.push(`본사 가용 ${Math.max(0, hqAvailable ?? 0)}개로 ${hqShortage}개 부족${h.incoming > 0 ? ` (본사 입고예정 ${h.incoming}개)` : ""}`);
      if (h.discontinued) notes.push("본사 단종 표시");
    } else if (hq.size > 0) {
      notes.push("본사 재고 CSV에 없는 SKU — 확인 필요");
    }

    const srcParts: string[] = [];
    if (dealerQty > 0) srcParts.push(`딜러 ${dealerQty}`);
    if (manualQty > 0) srcParts.push(`직접 ${manualQty}`);

    rows.push({
      sku,
      name,
      category,
      dealerQty,
      manualQty,
      needQty,
      importQty,
      unit,
      hqAvailable,
      hqIncoming: h?.incoming ?? 0,
      tplAvailable,
      hqShortage,
      source: srcParts.join(" + "),
      notes,
    });
  }

  rows.sort((a, b) => catRank(a.category) - catRank(b.category) || a.sku.localeCompare(b.sku));
  return rows;
}

// ---------- CSV (본사 재고 searchresults.csv) ----------

/** 따옴표/줄바꿈을 지원하는 최소 CSV 파서 */
export function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let q = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(cur);
      cur = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(cur);
      cur = "";
      if (row.length > 1 || row[0] !== "") out.push(row);
      row = [];
    } else cur += c;
  }
  if (cur !== "" || row.length) {
    row.push(cur);
    out.push(row);
  }
  return out;
}

const num = (v: string | undefined) => {
  const n = Number(String(v ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
};

/** 본사 재고 CSV → SKU별 재고. 필수 열이 없으면 에러 메시지를 반환 */
export function parseHqStockCsv(text: string): { stock: Map<string, HqStock> } | { error: string } {
  const rows = parseCsv(text);
  if (rows.length < 2) return { error: "CSV에 데이터가 없습니다." };
  const head = rows[0].map((h) => h.trim());
  const idx = (name: string) => head.indexOf(name);
  const iSku = idx("SKU");
  const iAvail = idx("Available Quantity");
  if (iSku < 0 || iAvail < 0) return { error: "본사 재고 CSV(searchresults)가 아닌 것 같습니다. 'SKU', 'Available Quantity' 열이 필요합니다." };
  const iItem = idx("Item");
  const iClass = idx("Class");
  const iInc = idx("Incoming Inventory");
  const iCarton = idx("Outer Carton Quantity");
  const iDisc = idx("Discontinued?");
  const stock = new Map<string, HqStock>();
  for (const r of rows.slice(1)) {
    const sku = (r[iSku] ?? "").trim();
    if (!sku) continue;
    stock.set(sku, {
      name: iItem >= 0 ? (r[iItem] ?? "").trim() : "",
      available: num(r[iAvail]),
      incoming: iInc >= 0 ? num(r[iInc]) : 0,
      carton: iCarton >= 0 ? Math.max(1, num(r[iCarton])) : 1,
      discontinued: iDisc >= 0 ? (r[iDisc] ?? "").trim().toLowerCase() === "yes" : false,
      klass: iClass >= 0 ? (r[iClass] ?? "").trim() : "",
    });
  }
  return { stock };
}

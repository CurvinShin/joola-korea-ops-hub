/**
 * "2026 해외발주" 폴더(발주번호별 하위 폴더)에서 발주서·포장명세서 엑셀을 읽어
 * 허브에 저장할 형태로 정리한다. 브라우저에서 실행된다(서버로는 정리된 결과만 보냄).
 *
 *  - 폴더 이름  → 발주번호(JKOREA26-15 (EX)), 구분(EX/SAMPLE), 종료 여부((CLOSED)), 메모
 *  - Purchase Order*.xlsx → 품목(SKU·품목명·수량). 금액은 읽지 않는다.
 *  - "PL & CI" 엑셀(.xls/.xlsx) → 선적일, 운송장(HAWB). 같은 폴더의 PDF 파일명에서도 운송장 번호를 찾는다.
 */

type XLSXModule = typeof import("xlsx");

export interface ParsedItem {
  sku: string;
  name: string;
  qty: number;
}

export interface ParsedShipment {
  date: string | null;
  tracking: string | null;
  carrier: string | null;
  doc: string | null;
}

export interface ParsedPo {
  poNumber: string;
  kind: "EX" | "SAMPLE";
  closed: boolean;
  folder: string;
  memo: string | null;
  orderDate: string | null;
  items: ParsedItem[];
  shipments: ParsedShipment[];
  warnings: string[];
}

export interface ParseResult {
  pos: ParsedPo[];
  ignored: string[];
}

type Row = unknown[];

const PO_KEY_RE = /JKO\w{0,3}A(\d\d)-(\d\d)/i;
const PL_NAME_RE = /pl\s*&\s*ci/i;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toIso(XLSX: XLSXModule, v: unknown): string | null {
  if (typeof v === "number" && v > 20000 && v < 80000) {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${pad(d.m)}-${pad(d.d)}`;
  }
  if (typeof v === "string") {
    const m = v.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
    if (m) return `${m[1]}-${pad(Number(m[2]))}-${pad(Number(m[3]))}`;
  }
  return null;
}

function cellText(v: unknown) {
  return v === null || v === undefined ? "" : String(v).trim();
}

function cleanName(n: unknown) {
  return cellText(n)
    .replace(/^(\d{4,}\s+)+/, "")
    .replace(/\s+/g, " ");
}

function poNumberOf(key: RegExpMatchArray, kind: "EX" | "SAMPLE") {
  return `JKOREA${key[1]}-${key[2]} (${kind})`;
}

/** 폴더 이름에서 메모(Socks, RALLY POP 등)만 뽑는다. */
function memoFromFolder(folder: string) {
  const m = folder
    .replace(/^\d+\.\s*/, "")
    .replace(/JKO\w{0,3}A\d\d-\d\d\s*\((EX|SAMPLE)\)/gi, " ")
    .replace(/\((closed|open)\)/gi, " ")
    .replace(/[&_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return m || null;
}

async function readSheets(XLSX: XLSXModule, file: File) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  return wb.SheetNames.map((name) => ({
    name,
    rows: XLSX.utils.sheet_to_json<Row>(wb.Sheets[name], { header: 1, raw: true, defval: null }),
  }));
}

function parsePoRows(XLSX: XLSXModule, rows: Row[]): { items: ParsedItem[]; date: string | null; ok: boolean } {
  let date: string | null = null;
  let hdrIdx = -1;
  let cols: Record<string, number> = {};
  for (let r = 0; r < Math.min(rows.length, 60); r++) {
    const cells = rows[r].map((c) => cellText(c).toLowerCase());
    if (date === null && cells[0] && /^date/.test(cells[0])) {
      for (let i = 1; i < rows[r].length; i++) {
        const iso = toIso(XLSX, rows[r][i]);
        if (iso) {
          date = iso;
          break;
        }
      }
    }
    if (cells.includes("sku") && cells.some((c) => /^q.?ty/.test(c))) {
      hdrIdx = r;
      cells.forEach((c, i) => {
        if (c && !(c in cols)) cols[c] = i;
      });
      break;
    }
  }
  if (hdrIdx < 0) return { items: [], date, ok: false };
  const skuI = cols["sku"];
  const qtyI = Object.entries(cols).find(([k]) => /^q.?ty/.test(k))![1];
  const nameI = Object.entries(cols).find(([k]) => /item|name|desc/.test(k))?.[1];
  const items: ParsedItem[] = [];
  for (let r = hdrIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    const sku = cellText(row[skuI]);
    if (!sku) {
      if (/^total/i.test(cellText(row[0]))) break;
      continue;
    }
    const qty = Math.round(Number(row[qtyI]));
    if (!Number.isFinite(qty)) continue;
    items.push({ sku, name: cleanName(nameI === undefined ? "" : row[nameI]), qty });
  }
  return { items, date, ok: true };
}

interface PlRow {
  po: string;
  sku: string;
  name: string;
  qty: number;
  hawb: string | null;
}

function parsePlRows(XLSX: XLSXModule, rows: Row[]): { date: string | null; rows: PlRow[] } {
  let date: string | null = null;
  let hdr: Record<string, number> | null = null;
  const out: PlRow[] = [];
  for (const row of rows) {
    const cells = row.map((c) => cellText(c).toLowerCase());
    if (date === null) {
      const i = cells.findIndex((c) => c.startsWith("date"));
      if (i >= 0) {
        for (let k = i + 1; k < row.length; k++) {
          const iso = toIso(XLSX, row[k]);
          if (iso) {
            date = iso;
            break;
          }
        }
      }
    }
    if (!hdr) {
      if (cells.some((c) => c.startsWith("po")) && cells.includes("sku")) {
        hdr = {};
        cells.forEach((c, i) => {
          if (c && !(c in hdr!)) hdr![c] = i;
        });
      }
      continue;
    }
    const poI = Object.entries(hdr).find(([k]) => k.startsWith("po"))![1];
    const skuI = hdr["sku"];
    const qtyI = Object.entries(hdr).find(([k]) => k.startsWith("qty"))?.[1];
    const nameI = Object.entries(hdr).find(([k]) => /desc|item/.test(k))?.[1];
    const hawbI = Object.entries(hdr).find(([k]) => /hawb|awb|tracking/.test(k))?.[1];
    const po = cellText(row[poI]);
    const sku = cellText(row[skuI]);
    if (!po || !sku) continue;
    out.push({
      po,
      sku,
      name: cleanName(nameI === undefined ? "" : row[nameI]),
      qty: qtyI === undefined ? 0 : Math.round(Number(row[qtyI])) || 0,
      hawb: hawbI === undefined ? null : cellText(row[hawbI]) || null,
    });
  }
  return { date, rows: out };
}

/** PL 행의 PO# → 표준 발주번호 (JKOREA26-15 (EX)). 우리 발주번호가 아니면 null. */
function normalizePo(po: string): string | null {
  const key = po.match(PO_KEY_RE);
  if (!key) return null;
  return poNumberOf(key, /sample/i.test(po) ? "SAMPLE" : "EX");
}

function trackingFromNames(names: string[]): { tracking: string; carrier: string | null } | null {
  for (const n of names) {
    let m = n.match(/SZXLTKOR\d+/i) || n.match(/XLTSZX\d+/i) || n.match(/\bGL\d{8}\b/i);
    if (m) return { tracking: m[0].toUpperCase(), carrier: null };
    m = n.match(/(\d{12})-FedEx/i) || n.match(/FedEx#?\s*(\d{12})/i);
    if (m) return { tracking: m[1], carrier: "FedEx" };
  }
  return null;
}

export async function parseOverseasFolder(files: File[]): Promise<ParseResult> {
  const mod = (await import("xlsx")) as unknown as XLSXModule & { default?: XLSXModule };
  const XLSX: XLSXModule = mod.default ?? mod;
  const ignored: string[] = [];

  // 1) 발주 폴더별로 파일을 묶는다 ("1. JKOREA26-01 (EX) (CLOSED)" 같은 이름의 폴더).
  const groups = new Map<string, File[]>();
  for (const f of files) {
    const parts = (f.webkitRelativePath || f.name).split("/");
    const idx = parts.findIndex((p, i) => i < parts.length - 1 && /^\d+\.\s/.test(p));
    if (idx < 0) continue;
    const list = groups.get(parts[idx]) ?? [];
    list.push(f);
    groups.set(parts[idx], list);
  }

  const pos = new Map<string, ParsedPo>();
  const plBuckets: { folder: string; file: File; names: string[] }[] = [];

  for (const [folder, list] of Array.from(groups.entries())) {
    const names = list.map((f) => f.name);
    const key = folder.match(PO_KEY_RE);
    const kind: "EX" | "SAMPLE" = /\(SAMPLE\)/i.test(folder) ? "SAMPLE" : "EX";
    const closed = /closed/i.test(folder);

    const poFile = list.find((f) => /purchase\s*order.*\.xlsx$/i.test(f.name) && !f.name.startsWith("~$"));
    if (key && poFile) {
      const poNumber = poNumberOf(key, kind);
      const sheets = await readSheets(XLSX, poFile);
      const compact = (s: string) => s.replace(/\s+/g, "");
      const wanted = new RegExp(`JKO\\w{0,3}A${key[1]}-${key[2]}`, "i");
      const matched = sheets.filter((s) => wanted.test(compact(s.name)));
      const candidates = matched.length ? [matched[matched.length - 1]] : sheets;
      let parsed: ReturnType<typeof parsePoRows> | null = null;
      for (const c of candidates) {
        const p = parsePoRows(XLSX, c.rows);
        if (p.ok) {
          parsed = p;
          break;
        }
      }
      const warnings: string[] = [];
      if (!parsed) warnings.push("발주서에서 SKU/수량 표를 찾지 못했습니다.");
      pos.set(poNumber, {
        poNumber,
        kind,
        closed,
        folder,
        memo: memoFromFolder(folder),
        orderDate: parsed?.date ?? null,
        items: parsed?.items ?? [],
        shipments: [],
        warnings,
      });
    } else if (key && !poFile) {
      // 발주서 엑셀이 없는 폴더: 포장명세서에서 품목을 채운다(아래 3단계).
    } else {
      // 폴더 이름에 발주번호가 없는 경우(예: 창고 입고 서류) — 포장명세서만 사용.
    }

    // 포장명세서 목록 (같은 이름의 .xls/.xlsx가 둘 다 있으면 .xlsx만)
    const plFiles = list.filter((f) => PL_NAME_RE.test(f.name) && /\.(xls|xlsx)$/i.test(f.name) && !f.name.startsWith("~$"));
    const baseOf = (n: string) => n.replace(/\.(xls|xlsx)$/i, "");
    for (const f of plFiles) {
      if (/\.xls$/i.test(f.name) && plFiles.some((g) => /\.xlsx$/i.test(g.name) && baseOf(g.name) === baseOf(f.name))) continue;
      plBuckets.push({ folder, file: f, names });
    }
    const otherIgnored = list.filter(
      (f) => !(f === poFile) && !plFiles.includes(f) && !/\.(pdf|jpe?g|png)$/i.test(f.name)
    );
    for (const f of otherIgnored) ignored.push(`${folder}/${f.name}`);
  }

  // 2) 포장명세서 → 선적일·운송장 (+ 발주서가 없는 발주의 품목)
  const plOnlyItems = new Map<string, Map<string, ParsedItem>>();
  const plOnlyFolder = new Map<string, string>();
  const plOnlyShips = new Map<string, ParsedShipment[]>();
  for (const b of plBuckets) {
    let parsed: ReturnType<typeof parsePlRows>;
    try {
      const sheets = await readSheets(XLSX, b.file);
      const first = sheets.find((s) => s.rows.some((r) => r.some((c) => /^sku$/i.test(cellText(c))))) ?? sheets[0];
      parsed = parsePlRows(XLSX, first.rows);
    } catch {
      ignored.push(`${b.folder}/${b.file.name} (읽지 못함)`);
      continue;
    }
    const nameTrack = trackingFromNames(b.names);
    const perPo = new Map<string, Set<string>>();
    for (const r of parsed.rows) {
      const po = normalizePo(r.po);
      if (!po) continue;
      if (r.hawb) {
        const s = perPo.get(po) ?? new Set<string>();
        s.add(r.hawb);
        perPo.set(po, s);
      } else if (!perPo.has(po)) {
        perPo.set(po, new Set());
      }
      if (!pos.has(po)) {
        // 발주서 엑셀이 없는 발주 — 포장명세서 품목으로 대신 채운다.
        const m = plOnlyItems.get(po) ?? new Map<string, ParsedItem>();
        const prev = m.get(r.sku);
        m.set(r.sku, { sku: r.sku, name: r.name, qty: (prev?.qty ?? 0) + r.qty });
        plOnlyItems.set(po, m);
        plOnlyFolder.set(po, b.folder);
      }
    }
    for (const [po, hawbs] of Array.from(perPo.entries())) {
      const list = hawbs.size ? Array.from(hawbs) : nameTrack ? [nameTrack.tracking] : [null];
      for (const t of list) {
        const carrier = t && /^\d{12}$/.test(t) ? "FedEx" : nameTrack && nameTrack.tracking === t ? nameTrack.carrier : null;
        const shipment: ParsedShipment = { date: parsed.date, tracking: t, carrier, doc: b.file.name.replace(/\s+/g, " ") };
        // 아직 만들어지지 않은 발주(발주서 없음)는 임시 보관
        const target = pos.get(po);
        if (target) {
          if (!target.shipments.some((s) => s.date === shipment.date && s.tracking === shipment.tracking)) target.shipments.push(shipment);
        } else {
          const arr = plOnlyShips.get(po) ?? [];
          if (!arr.some((s) => s.date === shipment.date && s.tracking === shipment.tracking)) arr.push(shipment);
          plOnlyShips.set(po, arr);
        }
      }
    }
  }

  // 3) 발주서 엑셀이 없는 발주 만들기
  for (const [po, items] of Array.from(plOnlyItems.entries())) {
    const key = po.match(PO_KEY_RE)!;
    const folder = plOnlyFolder.get(po) ?? "";
    const ownFolder = Array.from(groups.keys()).find((f) => {
      const k = f.match(PO_KEY_RE);
      return k && k[1] === key[1] && k[2] === key[2];
    });
    const ships = plOnlyShips.get(po) ?? [];
    pos.set(po, {
      poNumber: po,
      kind: /sample/i.test(po) ? "SAMPLE" : "EX",
      closed: ownFolder ? /closed/i.test(ownFolder) : false,
      folder: ownFolder ?? folder,
      memo: ownFolder ? memoFromFolder(ownFolder) : null,
      orderDate: null,
      items: Array.from(items.values()),
      shipments: ships,
      warnings: ["발주서 엑셀이 없어 포장명세서 기준으로 품목을 채웠습니다."],
    });
  }

  // 4) 발주일: 발주서 날짜, 단 선적일보다 늦으면 선적일(양식 복사로 날짜가 안 바뀐 경우)
  for (const p of Array.from(pos.values())) {
    const dates = p.shipments.map((s) => s.date).filter((d): d is string => !!d).sort();
    const first = dates[0];
    if (first && (!p.orderDate || p.orderDate > first)) p.orderDate = first;
  }

  const sorted = Array.from(pos.values()).sort((a, b) => a.poNumber.localeCompare(b.poNumber));
  return { pos: sorted, ignored };
}

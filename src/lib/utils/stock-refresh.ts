import * as cheerio from "cheerio";

/**
 * "현재고조회" 실사 엑셀(HTML 포맷 .xls) 파싱 + 브랜드 상품번호 매칭 로직.
 *
 * 두 벌의 상품 코드가 존재한다:
 *  - `상품코드` (이지어드민 내부 관리코드, 5자리, 앞자리 0 포함 가능) — 아직
 *    카탈로그에 없는 품목을 `catalog_gaps.source_sku`로 식별할 때 씀.
 *  - `상품명` 맨 앞에 붙은 브랜드 상품번호 (3자리 이상 숫자) — `products.sku`와
 *    매칭되는 진짜 키. (참고: joola_pricing_stock_logic.md §2)
 */

export interface ParsedStockRow {
  /** 이지어드민 내부 관리코드 (5자리, 원본 텍스트 그대로 — 앞자리 0 보존) */
  sourceSku: string;
  /** 상품명 원본 (브랜드 코드 포함) */
  rawName: string;
  /** 가용재고 (정상재고 − 출고요청대기수량) */
  qty: number;
}

const REQUIRED_COLUMNS = ["상품코드", "상품명", "가용재고"] as const;

export function extractLeadingCode(name: string): {
  brandSku: string | null;
  productName: string;
} {
  const n = name.replace(/^율라코리아/, "").trim();
  const m = n.match(/^(\d{3,})[,]?\s+(.*)$/) || n.match(/^(\d{3,})(\S.*)$/);
  return m ? { brandSku: m[1], productName: m[2].trim() } : { brandSku: null, productName: n };
}

export function parseStockHtml(html: string): ParsedStockRow[] {
  const $ = cheerio.load(html);
  const table = $("table").first();
  if (table.length === 0) {
    throw new Error("파일에서 표를 찾을 수 없습니다. 이지어드민 '현재고조회' 엑셀 파일이 맞는지 확인해주세요.");
  }

  const rows = table.find("tr").toArray();
  if (rows.length < 2) {
    throw new Error("표에 데이터 행이 없습니다.");
  }

  const headerCells = $(rows[0])
    .find("td,th")
    .toArray()
    .map((el) => $(el).text().trim());

  const colIndex: Record<string, number> = {};
  for (const col of REQUIRED_COLUMNS) {
    const i = headerCells.indexOf(col);
    if (i === -1) {
      throw new Error(
        `필수 열 "${col}"을(를) 찾을 수 없습니다. 이지어드민 '현재고조회' 엑셀 형식이 바뀌었을 수 있습니다.`
      );
    }
    colIndex[col] = i;
  }

  const out: ParsedStockRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = $(rows[r])
      .find("td,th")
      .toArray()
      .map((el) => $(el).text().trim());
    const maxIdx = Math.max(colIndex["상품코드"], colIndex["상품명"], colIndex["가용재고"]);
    if (cells.length <= maxIdx) continue;

    const rawName = cells[colIndex["상품명"]];
    if (!rawName) continue;

    const sourceSku = cells[colIndex["상품코드"]] ?? "";
    const qtyRaw = (cells[colIndex["가용재고"]] ?? "0").replace(/,/g, "").trim();
    const qty = Number.parseInt(qtyRaw, 10);

    out.push({ sourceSku, rawName, qty: Number.isFinite(qty) ? qty : 0 });
  }
  return out;
}

/** 파일명(예: 현재고조회_20260916202030_63077952.xls)에서 실사 기준일시를 추출. KST 기준. */
export function parseSnapshotTimestamp(filename: string): string {
  const m = filename.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
  if (!m) return new Date().toISOString();
  const [, y, mo, d, h, mi, s] = m;
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}+09:00`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

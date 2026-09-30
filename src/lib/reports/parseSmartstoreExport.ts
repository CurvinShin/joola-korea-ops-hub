import * as XLSX from "xlsx";
import { classifySmartstoreProduct } from "@/lib/reports/classifySmartstoreProduct";

// 스마트스토어 "주문조회" 엑셀(복호화된 버퍼)을 파싱해서 smartstore_order_items
// 테이블에 upsert할 행 배열로 바꾼다.
//
// 원본 엑셀에는 구매자명/구매자ID/수취인명 컬럼(고객 개인정보)이 있지만, 이
// 함수는 그 컬럼들을 절대 읽지 않는다 — SmartstoreOrderRow 타입 자체에 그
// 필드가 아예 없어서, 실수로라도 나중에 다른 코드가 채워 넣을 수 없다.
export interface SmartstoreOrderRow {
  product_order_no: string;
  order_no: string | null;
  order_date: string; // YYYY-MM-DD
  order_status: string;
  is_valid_sale: boolean;
  product_no: string | null;
  product_name: string;
  option_info: string | null;
  sales_option_info: string | null;
  quantity: number;
  category: string;
  subcategory: string | null;
  source_file: string;
}

export interface ParseResult {
  rows: SmartstoreOrderRow[];
  totalRowsInFile: number;
  skippedNoOrderNo: number;
  unclassifiedProductNames: string[];
}

// 재고 차감/매출 반영 관점에서 "유효 판매"로 볼 수 없는 상태.
const INVALID_STATUSES = new Set(["취소", "반품", "미결제취소"]);

function excelDateToYmd(value: unknown): string | null {
  if (value instanceof Date) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof value === "string") {
    // "2026-09-30 07:11:14" 같은 문자열로 올 수도 있다.
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  }
  return null;
}

export function parseSmartstoreExport(buffer: Buffer, sourceFileName: string): ParseResult {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames.includes("주문조회") ? "주문조회" : workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // 필요한 컬럼만 명시적으로 골라 쓴다 — 구매자명/구매자ID/수취인명 등은
  // 아래 어디에서도 참조하지 않는다.
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

  const rows: SmartstoreOrderRow[] = [];
  const unclassified = new Set<string>();
  let skippedNoOrderNo = 0;

  for (const r of raw) {
    const productOrderNo = r["상품주문번호"] != null ? String(r["상품주문번호"]).trim() : "";
    if (!productOrderNo) {
      skippedNoOrderNo += 1;
      continue;
    }

    const orderDate = excelDateToYmd(r["주문일시"]);
    if (!orderDate) {
      skippedNoOrderNo += 1;
      continue;
    }

    const productName = r["상품명"] != null ? String(r["상품명"]).trim() : "";
    const status = r["주문상태"] != null ? String(r["주문상태"]).trim() : "";
    const { category, subcategory } = classifySmartstoreProduct(productName);
    if (category === "미분류") unclassified.add(productName);

    rows.push({
      product_order_no: productOrderNo,
      order_no: r["주문번호"] != null ? String(r["주문번호"]).trim() : null,
      order_date: orderDate,
      order_status: status,
      is_valid_sale: !INVALID_STATUSES.has(status),
      product_no: r["상품번호"] != null ? String(r["상품번호"]).trim() : null,
      product_name: productName,
      option_info: r["옵션정보"] != null ? String(r["옵션정보"]).trim() : null,
      sales_option_info: r["판매옵션정보"] != null ? String(r["판매옵션정보"]).trim() : null,
      quantity: Number(r["수량"] ?? 0),
      category,
      subcategory,
      source_file: sourceFileName,
    });
  }

  return {
    rows,
    totalRowsInFile: raw.length,
    skippedNoOrderNo,
    unclassifiedProductNames: Array.from(unclassified),
  };
}

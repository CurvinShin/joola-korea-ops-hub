import * as XLSX from "xlsx";

// 스마트스토어(네이버) "SettleCaseByCase"(정산 데이터) 엑셀 내보내기를
// 파싱한다. 이 내보내기에는 수량이 없고(그래서 smartstore_order_items에서
// product_order_no로 조인해서 가져온다), 금액/정산 관련 컬럼 위주다.
//
// 개인정보 처리 방지: 원본 엑셀에는 구매자명 컬럼이 있지만(고객 개인정보),
// 이 함수는 그 값을 절대 읽지 않는다 — SettleCaseByCaseRow 타입 자체에 그
// 필드가 없다. "금액 변동일"도 월말 정산 산출물에는 쓰지 않아 제외한다.
export interface SettleCaseByCaseRow {
  no: string | null;
  order_no: string | null;
  product_order_no: string;
  type: string | null; // 구분
  product_name: string; // 상품명 (네이버 등록명, 한글)
  paid_at: string | null; // 결제일
  settle_expected_at: string | null; // 정산예정일
  settle_completed_at: string | null; // 정산완료일
  settle_base_date: string | null; // 정산기준일
  tax_base_date: string | null; // 세금신고기준일
  settle_status: string | null; // 정산상태
  settle_base_amount: number | null; // 정산기준금액
  npay_fee: number | null; // Npay 수수료
  sales_linked_fee_total: number | null; // 매출 연동 수수료 합계
  interest_free_fee: number | null; // 무이자할부 수수료
  benefit_amount: number | null; // 혜택금액
  settle_expected_amount: number | null; // 정산예정금액
  contract_no: string | null; // 계약번호
}

export interface SettleParseResult {
  rows: SettleCaseByCaseRow[];
  totalRowsInFile: number;
  skippedNoOrderNo: number;
}

function strOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// 날짜 컬럼은 이 정산 데이터 안에서는 조인/계산에 쓰지 않고 그대로
// 산출물에 옮겨 적기만 하면 되므로, Date는 ISO 날짜 문자열로, 그 외(문자열
// 등)는 그대로 문자열로 둔다.
function dateOrRaw(v: unknown): string | null {
  if (v instanceof Date) {
    const y = v.getUTCFullYear();
    const m = String(v.getUTCMonth() + 1).padStart(2, "0");
    const d = String(v.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return strOrNull(v);
}

export function parseSettleCaseByCase(buffer: Buffer, _sourceFileName: string): SettleParseResult {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames.includes("SettleCaseByCase") ? "SettleCaseByCase" : workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // 구매자명 컬럼은 아래 어디에서도 참조하지 않는다.
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

  const rows: SettleCaseByCaseRow[] = [];
  let skippedNoOrderNo = 0;

  for (const r of raw) {
    const productOrderNo = r["상품주문번호"] != null ? String(r["상품주문번호"]).trim() : "";
    if (!productOrderNo) {
      skippedNoOrderNo += 1;
      continue;
    }
    rows.push({
      no: strOrNull(r["No."]),
      order_no: strOrNull(r["주문번호"]),
      product_order_no: productOrderNo,
      type: strOrNull(r["구분"]),
      product_name: strOrNull(r["상품명"]) ?? "",
      paid_at: dateOrRaw(r["결제일"]),
      settle_expected_at: dateOrRaw(r["정산예정일"]),
      settle_completed_at: dateOrRaw(r["정산완료일"]),
      settle_base_date: dateOrRaw(r["정산기준일"]),
      tax_base_date: dateOrRaw(r["세금신고기준일"]),
      settle_status: strOrNull(r["정산상태"]),
      settle_base_amount: numOrNull(r["정산기준금액"]),
      npay_fee: numOrNull(r["Npay 수수료"]),
      sales_linked_fee_total: numOrNull(r["매출 연동 수수료 합계"]),
      interest_free_fee: numOrNull(r["무이자할부 수수료"]),
      benefit_amount: numOrNull(r["혜택금액"]),
      settle_expected_amount: numOrNull(r["정산예정금액"]),
      contract_no: strOrNull(r["계약번호"]),
    });
  }

  return { rows, totalRowsInFile: raw.length, skippedNoOrderNo };
}

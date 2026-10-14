import * as XLSX from "xlsx";

// 제이디로지스 "엑셀 수동발주 주문양식"을 만드는 도우미.
//
// 양식: 주문번호 · 수취인 · 운송장번호 · 연락처 · 수취인주소(전체) · 품목명 · 옵션명 · 수량 · 배송메세지 · 비고
//  - 한 줄이 "출고 한 건"이고 줄마다 주문번호가 하나씩 붙는다(기존 택배 양식 복사와 같은 규칙).
//  - 같은 주문 안의 같은 상품(SKU)은 일반/데모 구분 없이 수량을 합쳐 한 줄로 만든다.
//  - 운송장번호·옵션명·배송메세지·비고는 시스템에 값이 없어 빈 칸으로 둔다.
//  - 주문번호는 "발주하는 날짜(KST) + -순번(2자리)" 이고, 같은 날 두 번째 발주부터는 순번이 이어진다.

export const DISPATCH_HEADERS = [
  "주문번호",
  "수취인",
  "운송장번호",
  "연락처",
  "수취인주소(전체)",
  "품목명",
  "옵션명",
  "수량",
  "배송메세지",
  "비고",
] as const;

export type DispatchOrderInput = {
  id: string;
  dealers: { name: string; address: string | null; ship_recipient: string | null; contact_phone: string | null } | null;
  dealer_order_items: { quantity: number; products: { name: string; sku: string } | null }[];
};

type Line = { sku: string; name: string; quantity: number };

/** 한 딜러 주문의 품목을 SKU 기준으로 합쳐 "출고 줄" 목록으로 만든다. */
export function dispatchLinesForOrder(order: DispatchOrderInput): Line[] {
  const merged = new Map<string, Line>();
  for (const item of order.dealer_order_items ?? []) {
    const sku = item.products?.sku ?? "";
    const name = item.products?.name ?? "";
    const key = sku || name;
    if (!key) continue;
    const existing = merged.get(key);
    if (existing) existing.quantity += item.quantity;
    else merged.set(key, { sku, name, quantity: item.quantity });
  }
  return [...merged.values()];
}

/** 발주서 전체에 필요한 줄 수(= 필요한 주문번호 개수). */
export function countDispatchLines(orders: DispatchOrderInput[]): number {
  return orders.reduce((sum, o) => sum + dispatchLinesForOrder(o).length, 0);
}

export const dateKeyKst = (d = new Date()) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });

/** "20261014-03" 형태(순번은 최소 2자리). */
export function dispatchOrderNumber(dateKey: string, seq: number): string {
  return `${dateKey.replace(/-/g, "")}-${String(seq).padStart(2, "0")}`;
}

/** 파일명 앞부분(차수·확장자 제외). 차수(-2차, -3차)는 DB 함수가 붙인다. */
export function dispatchFileBase(dateKey: string): string {
  return `${dateKey.replace(/-/g, "")}-제이디로지스_엑셀 수동발주_주문양식`;
}

export type DispatchRow = string[]; // DISPATCH_HEADERS 순서의 10칸 (수량도 문자열로 저장)

export function buildDispatchRows(orders: DispatchOrderInput[], dateKey: string, seqStart: number): DispatchRow[] {
  const rows: DispatchRow[] = [];
  let seq = seqStart;
  for (const order of orders) {
    const dealer = order.dealers;
    for (const line of dispatchLinesForOrder(order)) {
      rows.push([
        dispatchOrderNumber(dateKey, seq),
        dealer?.ship_recipient ?? "",
        "",
        dealer?.contact_phone ?? "",
        dealer?.address ?? "",
        line.sku ? `${line.sku} ${line.name}` : line.name,
        "",
        String(line.quantity),
        "",
        "",
      ]);
      seq += 1;
    }
  }
  return rows;
}

/** 수취인·주소·연락처가 비어 있는 딜러(발주서에서 빈칸으로 나가는 곳) 이름 목록. */
export function dealersMissingShipInfo(orders: DispatchOrderInput[]): string[] {
  const names = new Set<string>();
  for (const o of orders) {
    const d = o.dealers;
    if (!d) continue;
    if (!d.ship_recipient || !d.contact_phone || !d.address) names.add(d.name);
  }
  return [...names];
}

export function buildDispatchWorkbook(rows: DispatchRow[]): Buffer {
  const aoa: (string | number)[][] = [
    [...DISPATCH_HEADERS],
    ...rows.map((r) => r.map((cell, i) => (i === 7 && /^\d+$/.test(cell) ? Number(cell) : cell))),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [
    { wch: 14 }, // 주문번호
    { wch: 12 }, // 수취인
    { wch: 14 }, // 운송장번호
    { wch: 16 }, // 연락처
    { wch: 67 }, // 수취인주소(전체)
    { wch: 91 }, // 품목명
    { wch: 14 }, // 옵션명
    { wch: 8 }, // 수량
    { wch: 20 }, // 배송메세지
    { wch: 20 }, // 비고
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function xlsxResponseHeaders(fileName: string): Record<string, string> {
  return {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="dispatch.xlsx"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    "Cache-Control": "no-store",
    "Access-Control-Expose-Headers": "Content-Disposition, X-Dispatch-Info",
  };
}

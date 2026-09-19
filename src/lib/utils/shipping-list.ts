import type { DealerOrderAdminRow } from "@/lib/types/database.types";

/**
 * 딜러 주문을 택배 발송용 엑셀 양식(주문번호·수취인·운송장번호·연락처·
 * 수취인주소(전체)·품목명·옵션명·수량·배송메세지·비고)에 맞춰 행 단위로
 * 변환한다. 화면에 붙여넣기만 하면 되도록 탭으로 구분된 값들을 만든다.
 *
 * - 주문번호는 "{주문일(YYYYMMDD)}-{그 날짜 안에서의 순번}" 형식이다. 순번은
 *   주문일마다 다시 1부터 시작하며, 화면에서 일부 주문만 체크해서 복사해도
 *   번호가 매번 바뀌지 않도록 항상 전체 주문 목록 기준으로 매겨진다.
 * - 같은 상품(SKU)은 일반판매/데모 여부와 상관없이 수량을 합쳐 한 줄로
 *   보낸다 — 택배는 물건 단위로 나가고, 데모 여부는 회계상 구분일 뿐이다.
 * - 배송비는 실제로 보낼 물건이 아니라서 애초에 dealer_order_items에 없고,
 *   여기서도 제외된다.
 * - 운송장번호·옵션명·배송메세지·비고는 이 시스템에 값이 없어 빈 칸으로
 *   둔다(양식상 칸 자체는 있어야 해서 빈 문자열로 채운다).
 */
export interface ShippingListOrderRows {
  orderId: string;
  rows: string[][];
}

// 주문 목록 전체를 기준으로 주문번호(날짜별 순번)를 매기면서, 각 딜러
// 주문(id)별로 행을 묶어서 반환한다 — 화면에서 체크된 주문만 골라
// 복사하더라도 주문번호는 항상 같게 유지하기 위함이다.
export function buildShippingListRowsByOrder(
  orders: (DealerOrderAdminRow & { order_date: string })[]
): ShippingListOrderRows[] {
  const seqByDate = new Map<string, number>();
  const result: ShippingListOrderRows[] = [];

  for (const order of orders) {
    const dealer = order.dealers;

    const merged = new Map<string, { sku: string; name: string; quantity: number }>();
    for (const item of order.dealer_order_items ?? []) {
      const sku = item.products?.sku ?? "";
      const name = item.products?.name ?? "";
      const key = sku || name;
      if (!key) continue;
      const existing = merged.get(key);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        merged.set(key, { sku, name, quantity: item.quantity });
      }
    }

    const dateKey = order.order_date;
    const orderRows: string[][] = [];
    for (const { sku, name, quantity } of merged.values()) {
      const seq = (seqByDate.get(dateKey) ?? 0) + 1;
      seqByDate.set(dateKey, seq);
      const orderNumber = `${dateKey.replace(/-/g, "")}-${seq}`;

      orderRows.push([
        orderNumber,
        dealer?.ship_recipient ?? "",
        "",
        dealer?.contact_phone ?? "",
        dealer?.address ?? "",
        sku ? `${sku} ${name}` : name,
        "",
        String(quantity),
        "",
        "",
      ]);
    }

    result.push({ orderId: order.id, rows: orderRows });
  }

  return result;
}

// 하위 호환/단순 사용을 위한 헬퍼 — 전체 주문을 그대로 다 합친 행 목록.
export function buildShippingListRows(
  orders: (DealerOrderAdminRow & { order_date: string })[]
): string[][] {
  return buildShippingListRowsByOrder(orders).flatMap((o) => o.rows);
}

export function shippingListRowsToTsv(rows: string[][]): string {
  return rows.map((r) => r.join("\t")).join("\n");
}

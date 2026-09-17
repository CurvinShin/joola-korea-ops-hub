import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, Thead, Tr, Th, Td } from "@/components/ui/Table";
import { DealerOrderRowActions } from "@/components/dealer-orders/DealerOrderRowActions";
import { OrderDetailModal } from "@/components/dealer-orders/OrderDetailModal";
import { dealerOrderTypeLabel } from "@/lib/utils/labels";
import type { DealerOrderAdminRow } from "@/lib/types/database.types";

export const dynamic = "force-dynamic";

const currency = (n: number) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n);

export default async function DealerOrdersPage() {
  const supabase = createClient();
  const { data: orders, error } = await supabase
    .from("dealer_orders")
    .select(
      "id, order_date, status, order_type, synced_to_accounting, total_amount, auto_shipping_boxes, auto_shipping_fee, manual_shipping_fee, confirmed_total_amount, order_number, stock_deducted, dealers(name, address, ship_recipient, payment_terms), dealer_order_items(quantity, unit_price, is_demo, products(name, sku))"
    )
    .order("order_date", { ascending: false })
    .limit(100);

  const rows = (orders ?? []) as unknown as (DealerOrderAdminRow & { order_date: string })[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">딜러 주문</h1>
        <p className="text-sm text-slate-500">
          딜러가 사이트에서 넣은 주문입니다. 확인 후 경리나라에서 견적서/발주서를 작성하고, 아래에서 처리 상태를
          체크해주세요.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>주문 {rows.length}건</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && <p className="p-5 text-sm text-red-600">{error.message}</p>}
          {rows.length > 0 ? (
            <Table>
              <Thead>
                <Tr>
                  <Th>주문일</Th>
                  <Th>딜러</Th>
                  <Th>상품</Th>
                  <Th>구분</Th>
                  <Th>공급가액</Th>
                  <Th>배송비 확정</Th>
                  <Th></Th>
                </Tr>
              </Thead>
              <tbody>
                {rows.map((o) => (
                  <Tr key={o.id}>
                    <Td className="whitespace-nowrap">{o.order_date}</Td>
                    <Td className="font-medium text-slate-900">{o.dealers?.name ?? "—"}</Td>
                    <Td>
                      <OrderDetailModal order={o} />
                    </Td>
                    <Td>
                      <Badge tone={o.order_type === "demo" ? "purple" : "slate"}>
                        {dealerOrderTypeLabel[o.order_type] ?? o.order_type}
                      </Badge>
                    </Td>
                    <Td>
                      {currency(Number(o.total_amount))}
                      {o.confirmed_total_amount != null && (
                        <span className="ml-1 text-[10px] text-slate-400">(확정)</span>
                      )}
                    </Td>
                    <Td>
                      {o.manual_shipping_fee != null
                        ? currency(Number(o.auto_shipping_fee) + Number(o.manual_shipping_fee))
                        : o.auto_shipping_fee > 0
                          ? `${currency(Number(o.auto_shipping_fee))} (패들만)`
                          : "미확정"}
                    </Td>
                    <Td className="text-right">
                      <DealerOrderRowActions
                        orderId={o.id}
                        status={o.status}
                        synced={o.synced_to_accounting}
                        autoShippingFee={Number(o.auto_shipping_fee)}
                        manualShippingFee={o.manual_shipping_fee != null ? Number(o.manual_shipping_fee) : null}
                        suggestedTotal={
                          Number(o.total_amount) + Number(o.auto_shipping_fee) + Number(o.manual_shipping_fee ?? 0)
                        }
                      />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="p-8 text-center text-sm text-slate-400">아직 들어온 딜러 주문이 없습니다.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

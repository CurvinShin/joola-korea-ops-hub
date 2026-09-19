import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { DealerOrdersTable } from "@/components/dealer-orders/DealerOrdersTable";
import { buildShippingListRowsByOrder } from "@/lib/utils/shipping-list";
import type { DealerOrderAdminRow } from "@/lib/types/database.types";

export const dynamic = "force-dynamic";

export default async function DealerOrdersPage() {
  const supabase = createClient();
  const { data: orders, error } = await supabase
    .from("dealer_orders")
    .select(
      "id, order_date, status, order_type, synced_to_accounting, total_amount, auto_shipping_boxes, auto_shipping_fee, manual_shipping_fee, confirmed_total_amount, order_number, stock_deducted, dealers(name, address, ship_recipient, payment_terms, contact_phone), dealer_order_items(quantity, unit_price, is_demo, products(name, sku))"
    )
    .order("order_date", { ascending: false })
    .limit(100);

  const rows = (orders ?? []) as unknown as (DealerOrderAdminRow & { order_date: string })[];
  const shippingRowsByOrder = Object.fromEntries(
    buildShippingListRowsByOrder(rows).map((o) => [o.orderId, o.rows])
  );

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
          <DealerOrdersTable rows={rows} shippingRowsByOrder={shippingRowsByOrder} />
        </CardContent>
      </Card>
    </div>
  );
}

import { format, addMonths } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DealerOrdersTable } from "@/components/dealer-orders/DealerOrdersTable";
import { buildShippingListRowsByOrder } from "@/lib/utils/shipping-list";
import type { DealerOrderAdminRow, DealerCatalogRow } from "@/lib/types/database.types";

export const dynamic = "force-dynamic";

// "YYYY-MM" <-> "2026년 10월" 상호 변환. 드롭다운 키/쿼리 파라미터는
// YYYY-MM을, 화면 표시는 한글 라벨을 쓴다.
function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return `${y}년 ${Number(m)}월`;
}

export default async function DealerOrdersPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const supabase = createClient();

  // 주문이 계속 쌓이면서 "최신 100건"만 보여주던 기존 방식은 바쁜 달이 있으면
  // 그 안에서도 오래된 주문이 화면에서 잘려 나가는 문제가 있었다. 월 단위로
  // 나눠서 보게 하고, 기본값은 이번 달로 좁혀서 매번 전체를 안 불러와도
  // 되게 한다. 드롭다운에 쓸 "어떤 달에 몇 건 있는지"는 order_date 한
  // 컬럼만 가볍게 먼저 조회해서 뽑는다(품목/딜러 조인 없이).
  const { data: dateRows } = await supabase.from("dealer_orders").select("order_date");
  const countByMonth = new Map<string, number>();
  for (const row of dateRows ?? []) {
    const key = (row.order_date as string).slice(0, 7); // "YYYY-MM"
    countByMonth.set(key, (countByMonth.get(key) ?? 0) + 1);
  }
  const totalCount = (dateRows ?? []).length;

  const currentMonthKey = format(new Date(), "yyyy-MM");
  const monthKeys = Array.from(new Set([currentMonthKey, ...countByMonth.keys()])).sort((a, b) =>
    a < b ? 1 : -1
  );

  const month: string =
    searchParams.month && (searchParams.month === "all" || monthKeys.includes(searchParams.month))
      ? searchParams.month
      : currentMonthKey;

  let ordersQuery = supabase
    .from("dealer_orders")
    .select(
      "id, dealer_id, order_date, created_at, status, order_type, synced_to_accounting, total_amount, auto_shipping_boxes, auto_shipping_fee, manual_shipping_fee, confirmed_total_amount, order_number, stock_deducted, shipped_at, dealers(name, address, ship_recipient, payment_terms, contact_phone), dealer_order_items(product_id, quantity, unit_price, is_demo, products(name, sku, category))"
    )
    .order("created_at", { ascending: false });

  if (month === "all") {
    ordersQuery = ordersQuery.limit(300);
  } else {
    const start = `${month}-01`;
    const end = format(addMonths(new Date(`${start}T00:00:00`), 1), "yyyy-MM-dd");
    ordersQuery = ordersQuery.gte("order_date", start).lt("order_date", end).limit(500);
  }

  const [{ data: orders, error }, { data: catalog }] = await Promise.all([
    ordersQuery,
    // draft 주문을 관리자가 직접 수정할 때 SKU로 품목을 추가할 수 있게 —
    // 딜러 주문 화면(/order)이 쓰는 것과 같은 카탈로그를 그대로 가져온다.
    supabase.from("dealer_catalog").select("*").order("name"),
  ]);

  const rows = (orders ?? []) as unknown as (DealerOrderAdminRow & { order_date: string })[];
  const catalogRows = (catalog ?? []) as DealerCatalogRow[];
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

      <form className="flex flex-wrap items-center gap-2">
        <Select name="month" defaultValue={month} className="max-w-[220px]">
          {monthKeys.map((key) => (
            <option key={key} value={key}>
              {monthLabel(key)} ({countByMonth.get(key) ?? 0}건)
              {key === currentMonthKey ? " · 이번 달" : ""}
            </option>
          ))}
          <option value="all">전체 ({totalCount}건)</option>
        </Select>
        <Button type="submit" variant="secondary" size="sm">
          보기
        </Button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>
            {month === "all" ? "전체" : monthLabel(month)} 주문 {rows.length}건
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && <p className="p-5 text-sm text-red-600">{error.message}</p>}
          <DealerOrdersTable rows={rows} shippingRowsByOrder={shippingRowsByOrder} catalog={catalogRows} />
        </CardContent>
      </Card>
    </div>
  );
}

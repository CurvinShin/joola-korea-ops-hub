import { createAdminClient } from "@/lib/supabase/admin";
import { isZeroPriceDealerCode } from "@/lib/config/coupang";

export const dynamic = "force-dynamic";

// 로그인 세션 없이(=auth.role() = 'authenticated' RLS를 만족시킬 수 없는 곳에서)
// Ops Hub 핵심 숫자 몇 개만 뽑아주는 JSON 엔드포인트. 노트북에서 돌아가는
// "Ops 도서관(Obsidian)" 자동 업데이트 스크립트가 주기적으로 이 URL 하나만
// 호출해서 현황 노트를 갱신한다. 기존 /public-report/[token] 페이지와 동일한
// 토큰 게이트 + service-role(admin) 클라이언트 패턴을 그대로 재사용했다 —
// 새 보안 모델을 만들지 않기 위해서다. 고객 개인정보는 다루지 않는다
// (딜러 주문 합계/SKU 매핑 개수/재고 등 내부 운영 숫자뿐).
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const expectedToken = process.env.PUBLIC_REPORT_TOKEN;
  if (!expectedToken || params.token !== expectedToken) {
    return new Response("Not found", { status: 404 });
  }

  const supabase = createAdminClient();

  // 최근 3개월(이번 달 포함) 딜러 주문 집계용 시작일
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - 2);
  since.setUTCDate(1);
  const sinceStr = since.toISOString().slice(0, 10);

  const [ordersRes, skuCountRes, inventoryRes, pendingRes, dealerRowsRes, recentOrdersRes] = await Promise.all([
    supabase.from("dealer_orders").select("dealer_id, order_date, total_amount").gte("order_date", sinceStr),
    supabase.from("smartstore_sku_map").select("*", { count: "exact", head: true }),
    // 대시보드의 "재고 부족 SKU"와 같은 기준(단종 상품 제외)으로 센다.
    supabase.from("inventory_status").select("is_low_stock, discontinued"),
    // 입금 확인 대기(draft) 주문 — 건수와 가장 오래된 주문일만(딜러 이름 등은 포함하지 않음).
    supabase
      .from("dealer_orders")
      .select("dealer_id, order_date")
      .eq("status", "draft")
      .order("order_date", { ascending: true }),
    // 딜러별 현황용 — 사업자(딜러) 이름·상태만 읽는다. 담당자 이름/연락처/주소/이메일은 select하지 않는다.
    supabase.from("dealers").select("id, name, status, kr_code"),
    // 최근 주문(취소 제외) — 딜러별 최근 주문 3건/마지막 주문일/입금대기 집계용.
    supabase
      .from("dealer_orders")
      .select("dealer_id, order_number, order_date, status, total_amount, confirmed_total_amount")
      .neq("status", "cancelled")
      .order("order_date", { ascending: false })
      .limit(2000),
  ]);

  const firstError =
    ordersRes.error?.message ??
    skuCountRes.error?.message ??
    inventoryRes.error?.message ??
    pendingRes.error?.message ??
    dealerRowsRes.error?.message ??
    recentOrdersRes.error?.message;
  if (firstError) {
    return Response.json({ error: firstError }, { status: 500 });
  }

  // 쿠팡 로켓그로스 입고용 가상 딜러("쿠팡로켓")는 딜러 수·매출·입금대기 집계에서 뺀다.
  const zeroPriceDealerIds = new Set(
    (dealerRowsRes.data ?? []).filter((d) => isZeroPriceDealerCode(d.kr_code)).map((d) => d.id)
  );
  const realDealerRows = (dealerRowsRes.data ?? []).filter((d) => !zeroPriceDealerIds.has(d.id));

  const byMonth = new Map<string, { orderCount: number; revenue: number }>();
  for (const o of (ordersRes.data ?? []).filter((o) => !zeroPriceDealerIds.has(o.dealer_id))) {
    const ym = String(o.order_date).slice(0, 7);
    const entry = byMonth.get(ym) ?? { orderCount: 0, revenue: 0 };
    entry.orderCount += 1;
    entry.revenue += Number(o.total_amount ?? 0);
    byMonth.set(ym, entry);
  }

  const lowStockProductCount = (inventoryRes.data ?? []).filter((r) => r.is_low_stock && !r.discontinued).length;
  const pendingOrders = (pendingRes.data ?? []).filter((o) => !zeroPriceDealerIds.has(o.dealer_id));

  // 딜러별 현황 (연락처 등 개인정보 없음: 사업자 이름, 주문번호, 날짜, 상태, 금액만)
  const ordersByDealer = new Map<string, NonNullable<typeof recentOrdersRes.data>>();
  for (const o of recentOrdersRes.data ?? []) {
    const list = ordersByDealer.get(o.dealer_id) ?? [];
    list.push(o);
    ordersByDealer.set(o.dealer_id, list);
  }
  const dealers = realDealerRows.map((d) => {
    const list = ordersByDealer.get(d.id) ?? []; // 이미 최신순
    const pending = list.filter((o) => o.status === "draft");
    return {
      name: d.name,
      status: d.status,
      lastOrderDate: list[0]?.order_date ?? null,
      pendingPaymentCount: pending.length,
      oldestPendingPaymentDate: pending.length ? pending[pending.length - 1].order_date : null,
      recentOrders: list.slice(0, 3).map((o) => ({
        orderNumber: o.order_number,
        orderDate: o.order_date,
        status: o.status,
        amount: Number(o.confirmed_total_amount ?? o.total_amount ?? 0),
      })),
    };
  });

  return Response.json({
    generatedAt: new Date().toISOString(),
    dealerOrdersByMonth: Object.fromEntries(
      Array.from(byMonth.entries()).sort(([a], [b]) => a.localeCompare(b))
    ),
    smartstoreSkuMapCount: skuCountRes.count ?? 0,
    dealerCount: realDealerRows.length,
    lowStockProductCount,
    pendingPaymentOrderCount: pendingOrders.length,
    oldestPendingPaymentOrderDate: pendingOrders[0]?.order_date ?? null,
    dealers,
  });
}

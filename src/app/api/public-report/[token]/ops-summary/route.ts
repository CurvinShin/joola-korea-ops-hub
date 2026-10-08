import { createAdminClient } from "@/lib/supabase/admin";

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

  const [ordersRes, skuCountRes, dealersCountRes, inventoryRes] = await Promise.all([
    supabase.from("dealer_orders").select("order_date, total_amount").gte("order_date", sinceStr),
    supabase.from("smartstore_sku_map").select("*", { count: "exact", head: true }),
    supabase.from("dealers").select("*", { count: "exact", head: true }),
    supabase.from("inventory").select("current_stock, low_stock_threshold"),
  ]);

  const firstError =
    ordersRes.error?.message ??
    skuCountRes.error?.message ??
    dealersCountRes.error?.message ??
    inventoryRes.error?.message;
  if (firstError) {
    return Response.json({ error: firstError }, { status: 500 });
  }

  const byMonth = new Map<string, { orderCount: number; revenue: number }>();
  for (const o of ordersRes.data ?? []) {
    const ym = String(o.order_date).slice(0, 7);
    const entry = byMonth.get(ym) ?? { orderCount: 0, revenue: 0 };
    entry.orderCount += 1;
    entry.revenue += Number(o.total_amount ?? 0);
    byMonth.set(ym, entry);
  }

  const lowStockProductCount = (inventoryRes.data ?? []).filter(
    (r) => r.current_stock <= r.low_stock_threshold
  ).length;

  return Response.json({
    generatedAt: new Date().toISOString(),
    dealerOrdersByMonth: Object.fromEntries(
      Array.from(byMonth.entries()).sort(([a], [b]) => a.localeCompare(b))
    ),
    smartstoreSkuMapCount: skuCountRes.count ?? 0,
    dealerCount: dealersCountRes.count ?? 0,
    lowStockProductCount,
  });
}

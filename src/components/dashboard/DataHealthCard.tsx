import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

type Issue = {
  key: string;
  label: string;
  count: number;
  samples: string[];
  href: string;
  // true면 "반드시 고쳐야 하는 문제", false면 참고용 정보
  critical: boolean;
};

function sinceDate(days: number): string {
  const d = new Date(Date.now() - days * 86400000);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

/**
 * 대시보드 "데이터 점검" 카드. 빠진 가격이나 0원 주문처럼 "시스템이 조용히 넘어가서"
 * 나중에 딜러 문의로 발견되던 문제를 미리 찾아 보여준다. 읽기 전용 조회만 한다.
 * 조회가 실패한 항목은 조용히 건너뛴다(대시보드 전체가 깨지지 않게).
 */
export async function DataHealthCard() {
  const supabase = createClient();
  const since = sinceDate(60);

  const [noPrice, badRate, zeroItems, zeroOrders, noImage] = await Promise.all([
    supabase
      .from("products")
      .select("sku, name", { count: "exact" })
      .eq("discontinued", false)
      .or("unit_price.is.null,unit_price.eq.0")
      .limit(5),
    supabase
      .from("dealers")
      .select("kr_code, name", { count: "exact" })
      .eq("status", "active")
      .or("discount_rate.is.null,discount_rate.gte.100")
      .limit(5),
    supabase
      .from("dealer_order_items")
      .select("quantity, dealer_orders!inner(order_number, status, order_date), products(sku)", { count: "exact" })
      .eq("unit_price", 0)
      .neq("dealer_orders.status", "cancelled")
      .gte("dealer_orders.order_date", since)
      .limit(5),
    supabase
      .from("dealer_orders")
      .select("order_number, order_date", { count: "exact" })
      .eq("total_amount", 0)
      .neq("status", "cancelled")
      .gte("order_date", since)
      .limit(5),
    supabase
      .from("products")
      .select("sku", { count: "exact", head: true })
      .eq("discontinued", false)
      .is("image_url", null),
  ]);

  const issues: Issue[] = [];

  if (!noPrice.error && (noPrice.count ?? 0) > 0) {
    issues.push({
      key: "noPrice",
      label: "소비자가가 비어 있거나 0원인 상품 (딜러 주문이 0원으로 계산됨)",
      count: noPrice.count ?? 0,
      samples: (noPrice.data ?? []).map((p) => `${p.sku} ${p.name}`),
      href: "/inventory",
      critical: true,
    });
  }
  if (!badRate.error && (badRate.count ?? 0) > 0) {
    issues.push({
      key: "badRate",
      label: "할인율이 비어 있거나 100% 이상인 활성 딜러",
      count: badRate.count ?? 0,
      samples: (badRate.data ?? []).map((d) => `${d.kr_code ?? ""} ${d.name}`.trim()),
      href: "/dealers",
      critical: true,
    });
  }
  if (!zeroOrders.error && (zeroOrders.count ?? 0) > 0) {
    issues.push({
      key: "zeroOrders",
      label: "최근 60일 주문 중 합계가 0원인 주문",
      count: zeroOrders.count ?? 0,
      samples: (zeroOrders.data ?? []).map((o) => `${o.order_number ?? "번호 미발급"} (${o.order_date})`),
      href: "/dealer-orders",
      critical: true,
    });
  }
  if (!zeroItems.error && (zeroItems.count ?? 0) > 0) {
    issues.push({
      key: "zeroItems",
      label: "최근 60일 주문 중 단가가 0원인 품목 (사은품이면 정상)",
      count: zeroItems.count ?? 0,
      samples: (zeroItems.data as unknown as { dealer_orders: { order_number: string | null }; products: { sku: string } | null }[] ?? []).map(
        (it) => `${it.dealer_orders?.order_number ?? "번호 미발급"} · ${it.products?.sku ?? ""}`
      ),
      href: "/dealer-orders",
      critical: false,
    });
  }
  if (!noImage.error && (noImage.count ?? 0) > 0) {
    issues.push({
      key: "noImage",
      label: "사진이 없는 판매 중 상품",
      count: noImage.count ?? 0,
      samples: [],
      href: "/inventory",
      critical: false,
    });
  }

  const criticalCount = issues.filter((i) => i.critical).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>데이터 점검</CardTitle>
        {criticalCount > 0 ? (
          <Badge tone="red">확인 필요 {criticalCount}건</Badge>
        ) : (
          <Badge tone="green">이상 없음</Badge>
        )}
      </CardHeader>
      <CardContent>
        {issues.length === 0 ? (
          <p className="text-sm text-slate-500">가격·할인율·주문 금액에서 빠진 데이터가 발견되지 않았습니다.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {issues.map((i) => (
              <li key={i.key} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm text-slate-900">
                    <span className={i.critical ? "font-semibold text-red-600" : "font-medium text-slate-600"}>
                      {i.count}건
                    </span>{" "}
                    {i.label}
                  </p>
                  {i.samples.length > 0 && (
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      {i.samples.join(" · ")}
                      {i.count > i.samples.length ? " …" : ""}
                    </p>
                  )}
                </div>
                <Link href={i.href} className="shrink-0 text-xs font-medium text-brand-600 hover:underline">
                  확인하기
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

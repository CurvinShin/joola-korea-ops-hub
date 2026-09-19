import { createClient } from "@/lib/supabase/server";
import { DealerOrderWorkspace } from "@/components/order/DealerOrderWorkspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { dealerOrderStatusLabel, dealerOrderTypeLabel } from "@/lib/utils/labels";
import type { DealerCatalogRow } from "@/lib/types/database.types";

export const dynamic = "force-dynamic";

const currency = (n: number) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n);

export default async function OrderPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("dealer_id")
    .eq("id", user?.id ?? "")
    .single();

  if (!profile?.dealer_id) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <p className="text-sm text-slate-500">
          이 계정에는 연결된 딜러 정보가 없습니다. JOOLA Korea 관리자에게 문의해주세요.
        </p>
      </div>
    );
  }

  const [{ data: dealer }, { data: catalog }, { data: orders }] = await Promise.all([
    supabase.from("dealers").select("id, name, discount_rate").eq("id", profile.dealer_id).single(),
    supabase.from("dealer_catalog").select("*").order("name"),
    supabase
      .from("dealer_orders")
      .select(
        "id, order_date, status, order_type, total_amount, auto_shipping_fee, manual_shipping_fee, dealer_order_items(quantity, unit_price, is_demo, products(name, sku))"
      )
      .eq("dealer_id", profile.dealer_id)
      .order("order_date", { ascending: false })
      .limit(20),
  ]);

  const discountRate = Number(dealer?.discount_rate ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{dealer?.name ?? "딜러"} 주문</h1>
        <p className="text-sm text-slate-500">
          적용 할인율 {discountRate}% — 필요한 상품을 장바구니에 담고 상단의 &ldquo;주문하기&rdquo;로 한 번에
          주문하세요.
        </p>
        <p className="mt-1 text-xs text-slate-400">
          재고가 부족해도 주문은 접수됩니다(백오더). 화면에 표시되는 금액은 송금하실 금액이 아닙니다 —
          이메일로 받으실 견적서에는 국내배송비가 추가되니, 이메일로 발송되는 배송비를 확인하신 후 입금해주세요.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>제품 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {catalog && catalog.length > 0 ? (
            <DealerOrderWorkspace catalog={catalog as DealerCatalogRow[]} discountRate={discountRate} />
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">등록된 제품이 없습니다.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>내 주문 내역</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {orders && orders.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {orders.map((o: any) => (
                <div key={o.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm text-slate-900">
                      {o.order_date} ·{" "}
                      {o.dealer_order_items
                        ?.map((it: any) => `${it.products?.name ?? ""}${it.is_demo ? "(데모)" : ""}`)
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {o.dealer_order_items?.reduce((sum: number, it: any) => sum + it.quantity, 0) ?? 0}개
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {o.order_type === "demo" && (
                      <Badge tone="purple">{dealerOrderTypeLabel[o.order_type]}</Badge>
                    )}
                    <Badge tone="blue">{dealerOrderStatusLabel[o.status] ?? o.status}</Badge>
                    <span className="text-sm font-medium text-slate-900">
                      {currency(Number(o.total_amount))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">주문 내역이 없습니다.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

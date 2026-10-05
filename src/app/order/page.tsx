import { createClient } from "@/lib/supabase/server";
import { DealerOrderWorkspace } from "@/components/order/DealerOrderWorkspace";
import { MyOrdersList, type MyOrderRow } from "@/components/order/MyOrdersList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { DealerCatalogRow } from "@/lib/types/database.types";
import type { CartItem } from "@/components/order/CartContext";
import type { EditOrderPrefill } from "@/components/order/DealerOrderWorkspace";
import { NoticeBanner } from "@/components/notices/NoticeBanner";
import type { DealerPromo } from "@/lib/utils/promo-pricing";

export const dynamic = "force-dynamic";

export default async function OrderPage({
  searchParams,
}: {
  searchParams?: { edit?: string };
}) {
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

  const [{ data: dealer }, { data: catalog }, { data: orders }, { data: promoRows }] = await Promise.all([
    supabase.from("dealers").select("id, name, discount_rate").eq("id", profile.dealer_id).single(),
    supabase.from("dealer_catalog").select("*").order("name"),
    supabase
      .from("dealer_orders")
      .select(
        "id, order_date, status, order_type, order_number, total_amount, auto_shipping_fee, manual_shipping_fee, dealer_order_items(quantity, unit_price, is_demo, products(name, sku))"
      )
      .eq("dealer_id", profile.dealer_id)
      .order("order_date", { ascending: false })
      .limit(20),
    // 딜러에게는 RLS가 "활성 + 오늘이 기간 안"인 프로모션만 돌려준다 — 예정/종료된
    // 건 여기서 따로 거르지 않아도 안 보인다.
    supabase
      .from("product_promotions")
      .select(
        "id, name, promo_group, promo_price, discount_rate_percent, max_qty_per_dealer, starts_on, ends_on, product_promotion_items(product_id)"
      )
      .order("starts_on"),
  ]);

  const promos: DealerPromo[] = ((promoRows ?? []) as any[]).map((r) => ({
    id: r.id,
    name: r.name,
    promoGroup: r.promo_group,
    promoPrice: Number(r.promo_price),
    discountRatePercent: Number(r.discount_rate_percent),
    maxQtyPerDealer: r.max_qty_per_dealer,
    startsOn: r.starts_on,
    endsOn: r.ends_on,
    productIds: (r.product_promotion_items ?? []).map((i: { product_id: string }) => i.product_id),
  }));

  const discountRate = Number(dealer?.discount_rate ?? 0);
  const catalogRows = (catalog ?? []) as DealerCatalogRow[];

  // ?edit=<id>로 들어왔으면 본인의 draft 주문인지 다시 확인하고, 그 주문의
  // 품목을 현재 카탈로그와 매칭해서 장바구니에 채울 CartItem[]으로 만든다 —
  // 담당자가 이미 확인 중인 주문이거나 다른 딜러 주문이면 조용히 무시한다.
  let editOrder: EditOrderPrefill | null = null;
  let editOrderUnavailable = false;
  const editId = searchParams?.edit;
  if (editId) {
    const { data: target } = await supabase
      .from("dealer_orders")
      .select("id, order_date, order_number, status, dealer_id, dealer_order_items(product_id, quantity, is_demo)")
      .eq("id", editId)
      .maybeSingle();

    if (target && target.dealer_id === profile.dealer_id && target.status === "draft") {
      const catalogById = new Map(catalogRows.map((c) => [c.product_id, c]));
      const items: CartItem[] = (target.dealer_order_items ?? [])
        .map((it: any) => {
          const product = catalogById.get(it.product_id);
          if (!product) return null;
          return {
            productId: product.product_id,
            sku: product.sku,
            name: product.name,
            category: product.category,
            imageUrl: product.image_url,
            mapPrice: Number(product.unit_price ?? 0),
            productType: product.product_type,
            fixedDealerPrice: product.fixed_dealer_price,
            availableStock: product.available_stock,
            quantity: it.quantity,
            isDemo: it.is_demo,
          } satisfies CartItem;
        })
        .filter((i: CartItem | null): i is CartItem => i !== null);

      if (items.length > 0) {
        editOrder = {
          id: target.id,
          label: `${target.order_date} · ${target.order_number ?? "번호 미발급"}`,
          items,
        };
      } else {
        editOrderUnavailable = true;
      }
    } else {
      editOrderUnavailable = true;
    }
  }

  return (
    <div className="space-y-6">
      <NoticeBanner dealerId={profile.dealer_id} />

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
        {editOrderUnavailable && (
          <p className="mt-1 text-xs text-red-600">
            이 주문은 수정할 수 없습니다 — 이미 담당자가 확인 중이거나 존재하지 않는 주문입니다.
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>제품 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {catalogRows.length > 0 ? (
            <DealerOrderWorkspace
              catalog={catalogRows}
              discountRate={discountRate}
              editOrder={editOrder}
              promos={promos}
            />
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
          <MyOrdersList orders={(orders ?? []) as unknown as MyOrderRow[]} />
        </CardContent>
      </Card>
    </div>
  );
}

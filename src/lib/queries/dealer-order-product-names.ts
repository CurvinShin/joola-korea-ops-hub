import type { createClient } from "@/lib/supabase/server";

type Supabase = ReturnType<typeof createClient>;

interface OrderWithItems {
  dealer_order_items: {
    product_id: string;
    products: { name: string; sku: string } | null;
  }[];
}

/**
 * 딜러 계정은 products 테이블을 직접 읽을 수 없어서(직원 전용 RLS) 주문 품목에
 * 조인한 products가 항상 null이다. 대신 dealer_ordered_products 뷰(0043)에서
 * 이름/SKU를 따로 읽어 각 품목의 products에 채워 넣는다. 뷰 조회가 실패해도
 * (마이그레이션 전 등) 화면은 그대로 열리고 상품명만 빈칸으로 남는다.
 */
export async function fillProductNames<T extends OrderWithItems>(supabase: Supabase, orders: T[]): Promise<T[]> {
  const ids = [...new Set(orders.flatMap((o) => (o.dealer_order_items ?? []).map((it) => it.product_id)))];
  if (ids.length === 0) return orders;

  const { data } = await supabase.from("dealer_ordered_products").select("product_id, sku, name").in("product_id", ids);
  const byId = new Map((data ?? []).map((p) => [p.product_id as string, { name: p.name as string, sku: p.sku as string }]));

  for (const o of orders) {
    for (const it of o.dealer_order_items ?? []) {
      it.products = byId.get(it.product_id) ?? it.products ?? null;
    }
  }
  return orders;
}

import type { SupabaseClient } from "@supabase/supabase-js";

export interface DealerQuoteItemRow {
  kr_code: string | null;
  order_no: string | null;
  quote_date: string;
  product_name: string;
  category: string;
  subcategory: string | null;
  quantity: number;
  amount: number;
}

export const TOP_CATEGORIES = ["패들", "공", "악세사리", "의류", "신발"] as const;
export const PADDLE_SUBS = [
  "프로V",
  "프로IV",
  "프로 1·2세대",
  "비전",
  "엣지",
  "챔피언",
  "3S",
  "PowerFX",
  "기타(엔트리)",
  "기타(세트)",
] as const;

function monthKey(dateStr: string) {
  return dateStr.slice(0, 7);
}

export interface ProductCategoryReport {
  rows: DealerQuoteItemRow[];
  dealerNameByKrCode: Map<string, string>;
  totalAmount: number;
  byCategory: Map<string, { qty: number; amount: number }>;
  byPaddleSub: Map<string, { qty: number; amount: number }>;
  paddleTotal: number;
  dealerKrCodes: string[];
  byDealerCategory: Map<string, Map<string, number>>;
  months: string[];
  byMonthCategory: Map<string, Map<string, number>>;
  currentMonth: string | null;
  prevMonth: string | null;
  currentMonthTotal: number;
  prevMonthTotal: number;
  momChange: number | null;
  lastQuoteDate: string | null;
  generatedAt: string;
}

// Supabase(PostgREST)는 한 번 조회에 최대 1,000행까지만 돌려준다. 견적서 품목과
// 스마트스토어 주문이 1,000행을 넘으면서 "가장 최근 달"이 조용히 잘려 나가
// 화면 숫자가 8월에 멈춰 있던 적이 있어서, 반드시 이 함수로 페이지를 이어 붙여
// 전부 읽어온다. 정렬 기준이 같은 값에서 겹치면 페이지 경계에서 행이 빠지거나
// 중복될 수 있으니 호출하는 쪽에서 고유한 열(id 등)을 마지막 정렬 기준으로 둔다.
export const PAGE_SIZE = 1000;

export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`데이터를 읽지 못했습니다: ${error.message}`);
    const batch = (data ?? []) as T[];
    all.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return all;
}

/**
 * Fetches dealer_quote_items + dealers and aggregates them into everything
 * the 제품군 분석 page (internal and public) needs to render. Shared so the
 * authenticated /sales/product-categories page and the no-login
 * /public-report/[token] page can never drift apart — same numbers, two
 * different Supabase clients (regular vs. service-role/admin).
 */
export async function getProductCategoryReport(supabase: SupabaseClient): Promise<ProductCategoryReport> {
  const [items, { data: dealers }] = await Promise.all([
    fetchAllPages<DealerQuoteItemRow>((from, to) =>
      supabase
        .from("dealer_quote_items")
        .select("kr_code, order_no, quote_date, product_name, category, subcategory, quantity, amount")
        .order("quote_date", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)
    ),
    supabase.from("dealers").select("kr_code, name"),
  ]);

  const rows = items;
  const dealerNameByKrCode = new Map<string, string>();
  for (const d of dealers ?? []) {
    if (d.kr_code) dealerNameByKrCode.set(d.kr_code, d.name);
  }

  const totalAmount = rows.reduce((sum, r) => sum + Number(r.amount), 0);

  const byCategory = new Map<string, { qty: number; amount: number }>();
  for (const cat of TOP_CATEGORIES) byCategory.set(cat, { qty: 0, amount: 0 });
  for (const r of rows) {
    const cur = byCategory.get(r.category) ?? { qty: 0, amount: 0 };
    cur.qty += Number(r.quantity);
    cur.amount += Number(r.amount);
    byCategory.set(r.category, cur);
  }

  const byPaddleSub = new Map<string, { qty: number; amount: number }>();
  for (const sub of PADDLE_SUBS) byPaddleSub.set(sub, { qty: 0, amount: 0 });
  const paddleTotal = byCategory.get("패들")?.amount ?? 0;
  for (const r of rows) {
    if (r.category !== "패들" || !r.subcategory) continue;
    const cur = byPaddleSub.get(r.subcategory) ?? { qty: 0, amount: 0 };
    cur.qty += Number(r.quantity);
    cur.amount += Number(r.amount);
    byPaddleSub.set(r.subcategory, cur);
  }

  const dealerKrCodes = Array.from(new Set(rows.map((r) => r.kr_code).filter((v): v is string => !!v))).sort();
  const byDealerCategory = new Map<string, Map<string, number>>();
  for (const kr of dealerKrCodes) byDealerCategory.set(kr, new Map());
  for (const r of rows) {
    if (!r.kr_code) continue;
    const m = byDealerCategory.get(r.kr_code)!;
    m.set(r.category, (m.get(r.category) ?? 0) + Number(r.amount));
  }

  const months = Array.from(new Set(rows.map((r) => monthKey(r.quote_date)))).sort();
  const byMonthCategory = new Map<string, Map<string, number>>();
  for (const m of months) byMonthCategory.set(m, new Map());
  for (const r of rows) {
    const key = monthKey(r.quote_date);
    const m = byMonthCategory.get(key)!;
    m.set(r.category, (m.get(r.category) ?? 0) + Number(r.amount));
  }

  const currentMonth = months.length > 0 ? months[months.length - 1] : null;
  const prevMonth = months.length >= 2 ? months[months.length - 2] : null;
  const currentMonthTotal = currentMonth
    ? Array.from(byMonthCategory.get(currentMonth)?.values() ?? []).reduce((a, b) => a + b, 0)
    : 0;
  const prevMonthTotal = prevMonth
    ? Array.from(byMonthCategory.get(prevMonth)?.values() ?? []).reduce((a, b) => a + b, 0)
    : 0;
  const momChange = prevMonth && prevMonthTotal > 0 ? (currentMonthTotal - prevMonthTotal) / prevMonthTotal : null;

  const lastQuoteDate = rows.length > 0 ? rows[rows.length - 1].quote_date : null;

  return {
    rows,
    dealerNameByKrCode,
    totalAmount,
    byCategory,
    byPaddleSub,
    paddleTotal,
    dealerKrCodes,
    byDealerCategory,
    months,
    byMonthCategory,
    currentMonth,
    prevMonth,
    currentMonthTotal,
    prevMonthTotal,
    momChange,
    lastQuoteDate,
    generatedAt: new Date().toISOString(),
  };
}


// ---------------------------------------------------------------------
// 스마트스토어(네이버) "제품군별 판매 수량" 분석
// ---------------------------------------------------------------------
// 딜러 견적서와 달리 스마트스토어 주문조회 내보내기에는 금액이 없어서(정산액은
// 담당자가 /sales에서 직접 입력) 이 리포트는 전부 "수량" 기준이다. 금액 기준
// 리포트(ProductCategoryReport)와는 별도 타입으로 분리해서 화면에서도 서로
// 다른 기준이라는 걸 명확히 구분해서 보여준다.
export interface SmartstoreOrderItemRow {
  order_date: string;
  order_status: string;
  is_valid_sale: boolean;
  product_no: string | null;
  product_name: string;
  quantity: number;
  category: string;
  subcategory: string | null;
}

export interface SmartstoreCategoryReport {
  hasData: boolean;
  totalQuantity: number;
  byCategory: Map<string, number>;
  byPaddleSub: Map<string, number>;
  paddleQuantity: number;
  byMonthCategory: Map<string, Map<string, number>>;
  months: string[];
  topProducts: { productNo: string | null; productName: string; category: string; quantity: number }[];
  unclassifiedCount: number;
  lastOrderDate: string | null;
  excludedCount: number;
}

function smartstoreMonthKey(dateStr: string) {
  return dateStr.slice(0, 7);
}

export async function getSmartstoreCategoryReport(supabase: SupabaseClient): Promise<SmartstoreCategoryReport> {
  const allRows = await fetchAllPages<SmartstoreOrderItemRow>((from, to) =>
    supabase
      .from("smartstore_order_items")
      .select("order_date, order_status, is_valid_sale, product_no, product_name, quantity, category, subcategory")
      .order("order_date", { ascending: true })
      .order("product_order_no", { ascending: true })
      .range(from, to)
  );
  const rows = allRows.filter((r) => r.is_valid_sale);
  const excludedCount = allRows.length - rows.length;

  const byCategory = new Map<string, number>();
  for (const cat of TOP_CATEGORIES) byCategory.set(cat, 0);
  const byPaddleSub = new Map<string, number>();
  for (const sub of PADDLE_SUBS) byPaddleSub.set(sub, 0);

  const productTotals = new Map<string, { productNo: string | null; productName: string; category: string; quantity: number }>();
  const byMonthCategory = new Map<string, Map<string, number>>();
  let unclassifiedCount = 0;

  for (const r of rows) {
    const qty = Number(r.quantity);
    byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + qty);
    if (r.category === "패들" && r.subcategory) {
      byPaddleSub.set(r.subcategory, (byPaddleSub.get(r.subcategory) ?? 0) + qty);
    }
    if (r.category === "미분류") unclassifiedCount += 1;

    const key = r.product_no ?? r.product_name;
    const cur = productTotals.get(key) ?? {
      productNo: r.product_no,
      productName: r.product_name,
      category: r.category,
      quantity: 0,
    };
    cur.quantity += qty;
    productTotals.set(key, cur);

    const monthKey = smartstoreMonthKey(r.order_date);
    const m = byMonthCategory.get(monthKey) ?? new Map<string, number>();
    m.set(r.category, (m.get(r.category) ?? 0) + qty);
    byMonthCategory.set(monthKey, m);
  }

  const totalQuantity = Array.from(byCategory.values()).reduce((a, b) => a + b, 0);
  const paddleQuantity = byCategory.get("패들") ?? 0;
  const months = Array.from(byMonthCategory.keys()).sort();
  const topProducts = Array.from(productTotals.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 15);
  const lastOrderDate = rows.length > 0 ? rows[rows.length - 1].order_date : null;

  return {
    hasData: allRows.length > 0,
    totalQuantity,
    byCategory,
    byPaddleSub,
    paddleQuantity,
    byMonthCategory,
    months,
    topProducts,
    unclassifiedCount,
    lastOrderDate,
    excludedCount,
  };
}

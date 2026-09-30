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
  "비전",
  "엣지",
  "챔피언",
  "3S",
  "PowerFX",
  "기타(엔트리)",
  "기타(세트)",
  "기타(C2 CFS)",
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

/**
 * Fetches dealer_quote_items + dealers and aggregates them into everything
 * the 제품군 분석 page (internal and public) needs to render. Shared so the
 * authenticated /sales/product-categories page and the no-login
 * /public-report/[token] page can never drift apart — same numbers, two
 * different Supabase clients (regular vs. service-role/admin).
 */
export async function getProductCategoryReport(supabase: SupabaseClient): Promise<ProductCategoryReport> {
  const [{ data: items }, { data: dealers }] = await Promise.all([
    supabase
      .from("dealer_quote_items")
      .select("kr_code, order_no, quote_date, product_name, category, subcategory, quantity, amount")
      .order("quote_date", { ascending: true }),
    supabase.from("dealers").select("kr_code, name"),
  ]);

  const rows = (items ?? []) as DealerQuoteItemRow[];
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

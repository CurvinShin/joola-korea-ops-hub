import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { dealerOrderStatusLabel, dealerOrderTypeLabel } from "@/lib/utils/labels";
import { fillProductNames } from "@/lib/queries/dealer-order-product-names";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const currency = (n: number) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n);

const statusTone: Record<string, "slate" | "amber" | "blue" | "green" | "red"> = {
  draft: "amber",
  confirmed: "blue",
  shipped: "blue",
  delivered: "green",
  cancelled: "red",
};

interface HistoryItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  is_demo: boolean;
  products: { name: string; sku: string } | null;
}

interface HistoryOrder {
  id: string;
  order_date: string;
  status: string;
  order_type: string;
  order_number: string | null;
  total_amount: number;
  auto_shipping_fee: number | null;
  manual_shipping_fee: number | null;
  confirmed_total_amount: number | null;
  payment_confirmed_at: string | null;
  shipped_at: string | null;
  dealer_order_items: HistoryItem[];
}

// 최근 12개월 선택지(KST 기준 이번 달부터).
function recentMonths(): string[] {
  const kstNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const out: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(kstNow.getFullYear(), kstNow.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  const next = new Date(y, m, 1); // m은 1-based → 다음 달 1일
  const nextStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`;
  return { from: `${month}-01`, to: nextStr };
}

function buildHref(params: { status?: string; month?: string; page?: number }) {
  const sp = new URLSearchParams();
  if (params.status) sp.set("status", params.status);
  if (params.month) sp.set("month", params.month);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return qs ? `/order/history?${qs}` : "/order/history";
}

export default async function OrderHistoryPage({
  searchParams,
}: {
  searchParams: { status?: string; month?: string; page?: string };
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

  const status = searchParams.status && searchParams.status in dealerOrderStatusLabel ? searchParams.status : "";
  const months = recentMonths();
  const month = searchParams.month && /^\d{4}-\d{2}$/.test(searchParams.month) ? searchParams.month : "";
  const page = Math.max(1, Number(searchParams.page) || 1);

  // 본인 주문만 — RLS(dealer_orders_select)가 이미 막지만 dealer_id 조건도 같이 건다.
  let listQuery = supabase
    .from("dealer_orders")
    .select(
      "id, order_date, status, order_type, order_number, total_amount, auto_shipping_fee, manual_shipping_fee, confirmed_total_amount, payment_confirmed_at, shipped_at, dealer_order_items(product_id, quantity, unit_price, is_demo, products(name, sku))",
      { count: "exact" }
    )
    .eq("dealer_id", profile.dealer_id)
    .order("order_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (status) listQuery = listQuery.eq("status", status);
  if (month) {
    const { from, to } = monthRange(month);
    listQuery = listQuery.gte("order_date", from).lt("order_date", to);
  }

  // 요약 카드는 필터 조건에 맞는 전체 주문(페이지 무관)을 기준으로 센다.
  let summaryQuery = supabase
    .from("dealer_orders")
    .select("status, total_amount")
    .eq("dealer_id", profile.dealer_id);
  if (status) summaryQuery = summaryQuery.eq("status", status);
  if (month) {
    const { from, to } = monthRange(month);
    summaryQuery = summaryQuery.gte("order_date", from).lt("order_date", to);
  }

  const [{ data: orders, count, error }, { data: summaryRows }] = await Promise.all([listQuery, summaryQuery]);

  const rows = await fillProductNames(supabase, (orders ?? []) as unknown as HistoryOrder[]);
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeSummary = (summaryRows ?? []).filter((r) => r.status !== "cancelled");
  const summaryAmount = activeSummary.reduce((s, r) => s + Number(r.total_amount ?? 0), 0);
  const waitingCount = (summaryRows ?? []).filter((r) => r.status === "draft").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">내 주문 내역</h1>
          <p className="text-sm text-slate-500">
            지금까지 주문한 내역과 처리 상태를 확인할 수 있습니다. 주문을 누르면 상품별 상세가 펼쳐집니다.
          </p>
        </div>
        <Link href="/order" className="text-sm text-brand-600 hover:underline">
          ← 주문하러 가기
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-slate-400">주문 건수</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{total}건</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-slate-400">주문 금액 합계 (취소 제외)</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{currency(summaryAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-slate-400">입금 확인 대기</p>
            <p className="mt-1 text-lg font-semibold text-amber-700">{waitingCount}건</p>
          </CardContent>
        </Card>
      </div>

      <form action="/order/history" method="get" className="flex flex-wrap items-center gap-2">
        <Select name="month" defaultValue={month} className="w-40">
          <option value="">전체 기간</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {m.replace("-", "년 ")}월
            </option>
          ))}
        </Select>
        <Select name="status" defaultValue={status} className="w-44">
          <option value="">전체 상태</option>
          {Object.entries(dealerOrderStatusLabel).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="secondary" size="sm">
          조회
        </Button>
        {(status || month) && (
          <Link href="/order/history" className="text-xs text-slate-500 hover:underline">
            필터 해제
          </Link>
        )}
      </form>

      <Card>
        <CardHeader>
          <CardTitle>주문 {total}건</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && <p className="p-5 text-sm text-red-600">{error.message}</p>}
          {rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">조건에 맞는 주문이 없습니다.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {rows.map((o) => {
                const items = o.dealer_order_items ?? [];
                const totalQty = items.reduce((s, it) => s + it.quantity, 0);
                const itemsSubtotal = items.reduce((s, it) => s + Number(it.unit_price) * it.quantity, 0);
                const shippingFee = Number(o.auto_shipping_fee ?? 0) + Number(o.manual_shipping_fee ?? 0);
                const isConfirmed = o.confirmed_total_amount != null;
                const grandTotal = isConfirmed ? Number(o.confirmed_total_amount) : itemsSubtotal + shippingFee;
                const summaryNames = items
                  .map((it) => it.products?.name)
                  .filter(Boolean)
                  .slice(0, 2)
                  .join(", ");
                const more = items.length > 2 ? ` 외 ${items.length - 2}종` : "";
                return (
                  <details key={o.id} className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-slate-900">
                          {o.order_date} · {summaryNames || "—"}
                          {more}
                        </p>
                        <p className="text-xs text-slate-400">
                          {totalQty}개{o.order_number ? ` · ${o.order_number}` : " · 번호 미발급"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {o.order_type === "demo" && <Badge tone="purple">{dealerOrderTypeLabel[o.order_type]}</Badge>}
                        <Badge tone={statusTone[o.status] ?? "slate"}>
                          {dealerOrderStatusLabel[o.status] ?? o.status}
                        </Badge>
                        <span className="w-28 text-right text-sm font-medium text-slate-900">
                          {currency(grandTotal)}
                        </span>
                        <span className="text-slate-400 transition-transform group-open:rotate-90">›</span>
                      </div>
                    </summary>

                    <div className="space-y-3 bg-slate-50/60 px-5 pb-4 pt-2">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-slate-400">
                            <th className="py-1 font-normal">상품</th>
                            <th className="py-1 text-right font-normal">수량</th>
                            <th className="py-1 text-right font-normal">공급가</th>
                            <th className="py-1 text-right font-normal">합계</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((it, idx) => (
                            <tr key={idx} className="border-t border-slate-100 text-slate-700">
                              <td className="py-1.5">
                                {it.products?.name ?? "—"}
                                {it.is_demo && <span className="ml-1 text-xs text-purple-600">(데모)</span>}
                                <span className="ml-2 text-xs text-slate-400">{it.products?.sku}</span>
                              </td>
                              <td className="py-1.5 text-right">{it.quantity}</td>
                              <td className="py-1.5 text-right">{currency(Number(it.unit_price))}</td>
                              <td className="py-1.5 text-right">{currency(Number(it.unit_price) * it.quantity)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div className="ml-auto w-full max-w-xs space-y-1 text-sm">
                        <div className="flex justify-between text-slate-600">
                          <span>상품 공급가 합계</span>
                          <span>{currency(itemsSubtotal)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>국내배송비</span>
                          <span>{shippingFee > 0 ? currency(shippingFee) : "—"}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold text-slate-900">
                          <span>{isConfirmed ? "확정 금액" : "예상 금액"}</span>
                          <span>{currency(grandTotal)}</span>
                        </div>
                        {!isConfirmed && (
                          <p className="text-[11px] text-slate-400">
                            예상 금액입니다. 입금하실 최종 금액은 이메일로 받으신 견적서를 확인해주세요.
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>입금 확인: {o.payment_confirmed_at ? o.payment_confirmed_at.slice(0, 10) : "대기 중"}</span>
                        <span>출고일: {o.shipped_at ? o.shipped_at.slice(0, 10) : "—"}</span>
                        {o.status === "draft" && (
                          <Link href={`/order?edit=${o.id}`} className="font-medium text-brand-600 hover:underline">
                            주문 수정하기
                          </Link>
                        )}
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 text-sm">
          {page > 1 ? (
            <Link href={buildHref({ status, month, page: page - 1 })} className="text-brand-600 hover:underline">
              ← 이전
            </Link>
          ) : (
            <span className="text-slate-300">← 이전</span>
          )}
          <span className="text-slate-500">
            {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={buildHref({ status, month, page: page + 1 })} className="text-brand-600 hover:underline">
              다음 →
            </Link>
          ) : (
            <span className="text-slate-300">다음 →</span>
          )}
        </div>
      )}
    </div>
  );
}

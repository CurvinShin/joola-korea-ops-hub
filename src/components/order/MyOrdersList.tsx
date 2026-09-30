"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { mergeDealerDraftOrders } from "@/lib/actions/dealer-portal";
import { dealerOrderStatusLabel, dealerOrderTypeLabel } from "@/lib/utils/labels";

const currency = (n: number) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n);

export interface MyOrderRow {
  id: string;
  order_date: string;
  status: string;
  order_type: string;
  order_number: string | null;
  total_amount: number;
  dealer_order_items: {
    quantity: number;
    is_demo: boolean;
    products: { name: string; sku: string } | null;
  }[];
}

// 딜러 본인의 "내 주문 내역" — 여러 번 나눠서 넣은 draft 주문을 체크박스로
// 골라 하나로 합칠 수 있게 한다. 입금 확인 전(draft) 주문끼리만 합칠 수
// 있어서, 체크박스도 그 상태의 주문에만 보여준다.
export function MyOrdersList({ orders }: { orders: MyOrderRow[] }) {
  const router = useRouter();
  const [mergeSelected, setMergeSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(id: string) {
    setResult(null);
    setMergeSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleMerge() {
    if (mergeSelected.size < 2) return;
    if (!confirm(`선택한 ${mergeSelected.size}건의 주문을 하나로 합칠까요? 되돌릴 수 없습니다.`)) return;
    setResult(null);
    startTransition(async () => {
      const res = await mergeDealerDraftOrders(Array.from(mergeSelected));
      setResult({ ok: res.ok, text: res.message });
      if (res.ok) {
        setMergeSelected(new Set());
        router.refresh();
      }
    });
  }

  if (orders.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">주문 내역이 없습니다.</p>;
  }

  return (
    <div>
      {mergeSelected.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-brand-50/40 px-5 py-2.5">
          <p className="text-xs text-slate-600">주문 합치기: {mergeSelected.size}건 선택됨</p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setMergeSelected(new Set())}>
              선택 해제
            </Button>
            <Button type="button" size="sm" disabled={mergeSelected.size < 2 || isPending} onClick={handleMerge}>
              {isPending ? "합치는 중..." : "선택한 주문 합치기"}
            </Button>
          </div>
        </div>
      )}
      {result && (
        <p className={`px-5 pt-2 text-xs ${result.ok ? "text-emerald-600" : "text-red-600"}`}>{result.text}</p>
      )}

      <div className="divide-y divide-slate-100">
        {orders.map((o) => (
          <div key={o.id} className="flex items-center justify-between gap-3 px-5 py-3">
            <div className="flex items-center gap-3">
              {o.status === "draft" ? (
                <input
                  type="checkbox"
                  checked={mergeSelected.has(o.id)}
                  onChange={() => toggle(o.id)}
                  aria-label="주문 합치기에 포함"
                  className="h-4 w-4 shrink-0 rounded border-slate-300"
                />
              ) : (
                <span className="w-4 shrink-0" />
              )}
              <div>
                <p className="text-sm text-slate-900">
                  {o.order_date} ·{" "}
                  {o.dealer_order_items
                    .map((it) => `${it.products?.name ?? ""}${it.is_demo ? "(데모)" : ""}`)
                    .filter(Boolean)
                    .join(", ") || "—"}
                </p>
                <p className="text-xs text-slate-400">
                  {o.dealer_order_items.reduce((sum, it) => sum + it.quantity, 0)}개
                  {o.order_number ? ` · ${o.order_number}` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {o.status === "draft" && (
                <a href={`/order?edit=${o.id}`} className="text-xs text-brand-600 hover:underline">
                  수정
                </a>
              )}
              {o.order_type === "demo" && <Badge tone="purple">{dealerOrderTypeLabel[o.order_type]}</Badge>}
              <Badge tone="blue">{dealerOrderStatusLabel[o.status] ?? o.status}</Badge>
              <span className="text-sm font-medium text-slate-900">{currency(Number(o.total_amount))}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

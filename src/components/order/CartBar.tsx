"use client";

import { useCart, calcCartTotals } from "@/components/order/CartContext";
import { Button } from "@/components/ui/Button";

const currency = (n: number) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n);

export function CartBar() {
  const { items, discountRate, open, editingOrderId } = useCart();
  if (items.length === 0) return null;

  const { estimatedTotal } = calcCartTotals(items, discountRate);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="sticky top-0 z-30 -mx-6 mb-4 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-3 shadow-sm backdrop-blur">
      <div className="text-sm text-slate-600">
        {editingOrderId && (
          <span className="mr-1.5 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
            주문 수정 중
          </span>
        )}
        장바구니 <span className="font-semibold text-slate-900">{itemCount}개</span> · 예상 합계(부가세포함){" "}
        <span className="font-semibold text-brand-700">{currency(estimatedTotal)}</span>
      </div>
      <Button onClick={open}>{editingOrderId ? "수정 내용 보기" : "장바구니 보기 · 주문하기"}</Button>
    </div>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import { useCart, calcCartTotals } from "@/components/order/CartContext";
import { placeDealerCartOrder } from "@/lib/actions/dealer-portal";
import { Button } from "@/components/ui/Button";

const currency = (n: number) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n);

function CartLineQuantityInput({
  quantity,
  disabled,
  onChange,
}: {
  quantity: number;
  disabled?: boolean;
  onChange: (next: number) => void;
}) {
  const [text, setText] = useState(String(quantity));

  useEffect(() => {
    setText(String(quantity));
  }, [quantity]);

  function commit(raw: string) {
    const parsed = parseInt(raw, 10);
    const next = Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
    onChange(next);
    setText(String(next));
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      aria-label="수량"
      disabled={disabled}
      value={text}
      onChange={(e) => setText(e.target.value.replace(/[^0-9]/g, ""))}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      className="w-10 rounded border border-transparent bg-white text-center text-sm focus:border-brand-300 focus:outline-none"
    />
  );
}

export function CartReviewModal() {
  const { items, discountRate, isOpen, close, updateQuantity, removeItem, clear } = useCart();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  if (!isOpen) return null;

  const { lines, subtotal, vat, estimatedTotal } = calcCartTotals(items, discountRate);

  function handleSubmit() {
    setResult(null);
    startTransition(async () => {
      const res = await placeDealerCartOrder(
        items.map((i) => ({ productId: i.productId, quantity: i.quantity, isDemo: i.isDemo }))
      );
      setResult({ ok: res.ok, text: res.message });
      if (res.ok) clear();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-10">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">장바구니 · 주문 확인</h2>
          <button
            onClick={close}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100 px-5">
          {lines.length === 0 && <p className="py-8 text-center text-sm text-slate-400">담긴 상품이 없습니다.</p>}
          {lines.map((line) => (
            <div key={`${line.productId}:${line.isDemo}`} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">
                  {line.name}
                  {line.isDemo && (
                    <span className="ml-1.5 rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                      데모구매
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-400">
                  {line.sku} · {currency(line.unitPrice)} / 개
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-1.5 py-1">
                  <button
                    type="button"
                    className="h-6 w-6 rounded text-slate-500 hover:bg-slate-100"
                    disabled={isPending}
                    onClick={() => updateQuantity(line.productId, line.isDemo, line.quantity - 1)}
                  >
                    −
                  </button>
                  <CartLineQuantityInput
                    quantity={line.quantity}
                    disabled={isPending}
                    onChange={(next) => updateQuantity(line.productId, line.isDemo, next)}
                  />
                  <button
                    type="button"
                    className="h-6 w-6 rounded text-slate-500 hover:bg-slate-100"
                    disabled={isPending}
                    onClick={() => updateQuantity(line.productId, line.isDemo, line.quantity + 1)}
                  >
                    +
                  </button>
                </div>
                <p className="w-24 text-right text-sm font-medium text-slate-900">{currency(line.lineTotal)}</p>
                <button
                  type="button"
                  className="text-xs text-red-600 hover:underline"
                  disabled={isPending}
                  onClick={() => removeItem(line.productId, line.isDemo)}
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-1.5 border-t border-slate-100 px-5 py-4 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>공급가액 합계</span>
            <span>{currency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>부가세 (10%)</span>
            <span>{currency(vat)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-100 pt-1.5 text-base font-semibold text-slate-900">
            <span>예상 합계</span>
            <span>{currency(estimatedTotal)}</span>
          </div>

          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
            재고 상황에 따라 수량이 조정될 수 있습니다. 이 화면의 금액은 송금하실 금액이 아니며, 이메일로
            받으실 견적서에는 국내배송비가 추가됩니다. 이메일로 발송되는 배송비를 확인하신 후 송금 바랍니다.
          </p>

          {result && (
            <p className={`text-sm ${result.ok ? "text-emerald-600" : "text-red-600"}`}>{result.text}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={close}>
              {result?.ok ? "닫기" : "취소"}
            </Button>
            {!result?.ok && (
              <Button onClick={handleSubmit} disabled={isPending || lines.length === 0}>
                {isPending ? "처리 중..." : "주문 확정"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

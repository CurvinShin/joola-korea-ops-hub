"use client";

import { useState, useTransition } from "react";
import { placeDealerOrder } from "@/lib/actions/dealer-portal";
import { Button } from "@/components/ui/Button";
import type { DealerCatalogRow } from "@/lib/types/database.types";

const currency = (n: number) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n);

export function OrderRow({ product, discountRate }: { product: DealerCatalogRow; discountRate: number }) {
  const [quantity, setQuantity] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const basePrice = Number(product.unit_price ?? 0);
  const unitPrice = Math.round(basePrice * (1 - discountRate / 100));
  const subtotal = unitPrice * quantity;
  const outOfStock = product.available_stock <= 0;

  function clampQuantity(next: number) {
    return Math.min(Math.max(next, 1), Math.max(product.available_stock, 1));
  }

  function handleOrder() {
    setMessage(null);
    startTransition(async () => {
      const result = await placeDealerOrder(product.product_id, quantity);
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok) setQuantity(1);
    });
  }

  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            className="h-14 w-14 rounded-lg border border-slate-200 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-[11px] text-slate-400">
            사진 없음
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-slate-900">{product.name}</p>
          <p className="text-xs text-slate-400">{product.sku}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {outOfStock ? (
              <span className="text-red-600">품절</span>
            ) : (
              <>가용 재고 {product.available_stock}개</>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-900">{currency(unitPrice)}</p>
          {discountRate > 0 && (
            <p className="text-xs text-slate-400 line-through">{currency(basePrice)}</p>
          )}
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-1.5 py-1">
          <button
            type="button"
            className="h-6 w-6 rounded text-slate-500 hover:bg-slate-100 disabled:opacity-40"
            disabled={outOfStock || isPending}
            onClick={() => setQuantity((q) => clampQuantity(q - 1))}
          >
            −
          </button>
          <span className="w-8 text-center text-sm">{quantity}</span>
          <button
            type="button"
            className="h-6 w-6 rounded text-slate-500 hover:bg-slate-100 disabled:opacity-40"
            disabled={outOfStock || isPending}
            onClick={() => setQuantity((q) => clampQuantity(q + 1))}
          >
            +
          </button>
        </div>

        <div className="w-24 text-right text-sm font-semibold text-brand-700">{currency(subtotal)}</div>

        <Button size="sm" disabled={outOfStock || isPending} onClick={handleOrder}>
          주문하기
        </Button>
      </div>

      {message && (
        <p className={`text-xs sm:ml-auto ${message.ok ? "text-emerald-600" : "text-red-600"}`}>{message.text}</p>
      )}
    </div>
  );
}

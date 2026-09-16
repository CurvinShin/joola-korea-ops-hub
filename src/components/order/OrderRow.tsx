"use client";

import { useState } from "react";
import { useCart } from "@/components/order/CartContext";
import { Button } from "@/components/ui/Button";
import { calcDealerUnitPrice } from "@/lib/utils/pricing";
import type { DealerCatalogRow } from "@/lib/types/database.types";

const currency = (n: number) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n);

export function OrderRow({ product, discountRate }: { product: DealerCatalogRow; discountRate: number }) {
  const { addItem, open } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [isDemo, setIsDemo] = useState(false);
  const [added, setAdded] = useState(false);

  const mapPrice = Number(product.unit_price ?? 0);
  const unitPrice = calcDealerUnitPrice({
    mapPrice,
    productType: product.product_type,
    discountRatePercent: discountRate,
    isDemo,
    fixedDealerPrice: product.fixed_dealer_price,
  });
  const subtotal = unitPrice * quantity;
  const outOfStock = product.available_stock <= 0;

  function clampQuantity(next: number) {
    return Math.max(next, 1);
  }

  function handleAddToCart() {
    addItem(product, quantity, isDemo);
    setAdded(true);
    setQuantity(1);
    setIsDemo(false);
    setTimeout(() => setAdded(false), 1500);
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
              <span className="text-red-600">재고 없음 (백오더 주문 가능)</span>
            ) : (
              <>가용 재고 {product.available_stock}개</>
            )}
          </p>
          <label className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
            <input type="checkbox" checked={isDemo} onChange={(e) => setIsDemo(e.target.checked)} />
            데모구매 (소비자가 65% 할인)
          </label>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-xs text-slate-400">소비자가 {currency(mapPrice)}</p>
          <p className="text-sm font-semibold text-slate-900">공급가 {currency(unitPrice)}</p>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-1.5 py-1">
          <button
            type="button"
            className="h-6 w-6 rounded text-slate-500 hover:bg-slate-100"
            onClick={() => setQuantity((q) => clampQuantity(q - 1))}
          >
            −
          </button>
          <span className="w-8 text-center text-sm">{quantity}</span>
          <button
            type="button"
            className="h-6 w-6 rounded text-slate-500 hover:bg-slate-100"
            onClick={() => setQuantity((q) => clampQuantity(q + 1))}
          >
            +
          </button>
        </div>

        <div className="w-28 text-right">
          <p className="text-[10px] text-slate-400">공급가 합계</p>
          <p className="text-sm font-semibold text-brand-700">{currency(subtotal)}</p>
        </div>

        <Button size="sm" variant={added ? "secondary" : "primary"} onClick={handleAddToCart}>
          {added ? "담았습니다 ✓" : "담기"}
        </Button>
      </div>
      {added && (
        <button type="button" onClick={open} className="text-xs text-brand-600 hover:underline sm:ml-auto">
          장바구니 보기 →
        </button>
      )}
    </div>
  );
}

"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { DealerCatalogRow } from "@/lib/types/database.types";
import { calcDealerUnitPrice } from "@/lib/utils/pricing";

export interface CartItem {
  productId: string;
  sku: string;
  name: string;
  category: string | null;
  imageUrl: string | null;
  mapPrice: number;
  productType: DealerCatalogRow["product_type"];
  fixedDealerPrice: number | null;
  availableStock: number;
  quantity: number;
  isDemo: boolean;
}

interface CartContextValue {
  items: CartItem[];
  discountRate: number;
  addItem: (product: DealerCatalogRow, quantity: number, isDemo: boolean) => void;
  updateQuantity: (productId: string, isDemo: boolean, quantity: number) => void;
  removeItem: (productId: string, isDemo: boolean) => void;
  clear: () => void;
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

// A cart line is keyed by (productId, isDemo) — the same product ordered
// once as a regular purchase and once as a demo purchase are two separate
// lines with two separate prices, exactly like the sample 견적서 (item
// 601885 appears twice: once regular, once "(demo)").
function lineKey(productId: string, isDemo: boolean) {
  return `${productId}:${isDemo ? "demo" : "regular"}`;
}

export function CartProvider({ discountRate, children }: { discountRate: number; children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = useCallback((product: DealerCatalogRow, quantity: number, isDemo: boolean) => {
    setItems((prev) => {
      const key = lineKey(product.product_id, isDemo);
      const existing = prev.find((i) => lineKey(i.productId, i.isDemo) === key);
      if (existing) {
        return prev.map((i) =>
          lineKey(i.productId, i.isDemo) === key ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [
        ...prev,
        {
          productId: product.product_id,
          sku: product.sku,
          name: product.name,
          category: product.category,
          imageUrl: product.image_url,
          mapPrice: Number(product.unit_price ?? 0),
          productType: product.product_type,
          fixedDealerPrice: product.fixed_dealer_price,
          availableStock: product.available_stock,
          quantity,
          isDemo,
        },
      ];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, isDemo: boolean, quantity: number) => {
    setItems((prev) =>
      prev
        .map((i) => (lineKey(i.productId, i.isDemo) === lineKey(productId, isDemo) ? { ...i, quantity } : i))
        .filter((i) => i.quantity > 0)
    );
  }, []);

  const removeItem = useCallback((productId: string, isDemo: boolean) => {
    setItems((prev) => prev.filter((i) => lineKey(i.productId, i.isDemo) !== lineKey(productId, isDemo)));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      discountRate,
      addItem,
      updateQuantity,
      removeItem,
      clear,
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }),
    [items, discountRate, addItem, updateQuantity, removeItem, clear, isOpen]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside a CartProvider");
  return ctx;
}

const SHIPPING_BOX_SIZE = 10; // 패들 10개당 배송 1박스
const SHIPPING_FEE_PER_BOX = 5000;
const VAT_RATE = 0.1;

export function calcCartTotals(items: CartItem[], discountRate: number) {
  let subtotal = 0;
  let paddleQty = 0;
  const lines = items.map((item) => {
    const unitPrice = calcDealerUnitPrice({
      mapPrice: item.mapPrice,
      productType: item.productType,
      discountRatePercent: discountRate,
      isDemo: item.isDemo,
      fixedDealerPrice: item.fixedDealerPrice,
    });
    const lineTotal = unitPrice * item.quantity;
    subtotal += lineTotal;
    if (item.category === "패들") paddleQty += item.quantity;
    return { ...item, unitPrice, lineTotal };
  });
  const autoShippingBoxes = Math.ceil(paddleQty / SHIPPING_BOX_SIZE);
  const autoShippingFee = autoShippingBoxes * SHIPPING_FEE_PER_BOX;
  const taxableBase = subtotal + autoShippingFee;
  const vat = Math.round(taxableBase * VAT_RATE);
  const estimatedTotal = taxableBase + vat;
  return { lines, subtotal, paddleQty, autoShippingBoxes, autoShippingFee, vat, estimatedTotal };
}

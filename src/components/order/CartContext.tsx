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
  // 기존 주문을 고치는 중이면 그 주문 id/표시용 라벨이 들어간다 (예:
  // "2026-09-10 · KR05-2630"). 새로 담는 중이면 둘 다 null.
  editingOrderId: string | null;
  editingOrderLabel: string | null;
  addItem: (product: DealerCatalogRow, quantity: number, isDemo: boolean) => void;
  updateQuantity: (productId: string, isDemo: boolean, quantity: number) => void;
  removeItem: (productId: string, isDemo: boolean) => void;
  clear: () => void;
  startEditingOrder: (orderId: string, label: string, items: CartItem[]) => void;
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
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editingOrderLabel, setEditingOrderLabel] = useState<string | null>(null);

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

  const clear = useCallback(() => {
    setItems([]);
    setEditingOrderId(null);
    setEditingOrderLabel(null);
  }, []);

  // 이미 넣어둔 주문(draft 상태)을 고치기 시작할 때 — 그 주문의 품목으로
  // 장바구니를 통째로 채우고 "수정 모드"로 표시한다.
  const startEditingOrder = useCallback((orderId: string, label: string, orderItems: CartItem[]) => {
    setItems(orderItems);
    setEditingOrderId(orderId);
    setEditingOrderLabel(label);
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      discountRate,
      editingOrderId,
      editingOrderLabel,
      addItem,
      updateQuantity,
      removeItem,
      clear,
      startEditingOrder,
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }),
    [
      items,
      discountRate,
      editingOrderId,
      editingOrderLabel,
      addItem,
      updateQuantity,
      removeItem,
      clear,
      startEditingOrder,
      isOpen,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside a CartProvider");
  return ctx;
}

const SHIPPING_BOX_SIZE = 10; // 패들 10개당 배송 1박스
// 부가세 포함 5,500원/박스 (2026-09-21 변경, 이전 5,000원). 화면에는 표시하지
// 않지만 dealer-portal.ts와 값을 맞춰둔다.
const SHIPPING_FEE_PER_BOX = 5500;
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
  // 배송비(패들 박스 계산 등)는 화면에 더 이상 보여주지 않는다 — 딜러에게는
  // "이 화면 금액은 송금액이 아니고, 실제 배송비 포함 금액은 이메일 견적서로
  // 안내한다"고 명시했으므로, 예상 합계에도 배송비를 섞지 않는다. 계산 자체는
  // (참고용으로) 그대로 반환하되, 부가세/합계 산정에서는 뺐다.
  const autoShippingBoxes = Math.ceil(paddleQty / SHIPPING_BOX_SIZE);
  const autoShippingFee = autoShippingBoxes * SHIPPING_FEE_PER_BOX;
  const taxableBase = subtotal;
  const vat = Math.round(taxableBase * VAT_RATE);
  const estimatedTotal = taxableBase + vat;
  return { lines, subtotal, paddleQty, autoShippingBoxes, autoShippingFee, vat, estimatedTotal };
}

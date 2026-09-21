"use client";

import { useEffect, useRef } from "react";
import { CartProvider, useCart, type CartItem } from "@/components/order/CartContext";
import { CartBar } from "@/components/order/CartBar";
import { CartReviewModal } from "@/components/order/CartReviewModal";
import { CatalogBrowser } from "@/components/order/CatalogBrowser";
import type { DealerCatalogRow } from "@/lib/types/database.types";

export interface EditOrderPrefill {
  id: string;
  label: string;
  items: CartItem[];
}

// /order?edit=<id>로 들어왔을 때 그 주문 내용을 장바구니에 채우고 수정
// 모달을 자동으로 열어준다. CartProvider 안에서만 쓸 수 있어서 별도
// 컴포넌트로 뺐다 — mount 시 한 번만 실행되도록 ref로 막는다.
function EditOrderBootstrap({ editOrder }: { editOrder: EditOrderPrefill }) {
  const { startEditingOrder, open } = useCart();
  const loadedOrderId = useRef<string | null>(null);

  useEffect(() => {
    if (loadedOrderId.current === editOrder.id) return;
    loadedOrderId.current = editOrder.id;
    startEditingOrder(editOrder.id, editOrder.label, editOrder.items);
    open();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editOrder.id]);

  return null;
}

export function DealerOrderWorkspace({
  catalog,
  discountRate,
  editOrder,
}: {
  catalog: DealerCatalogRow[];
  discountRate: number;
  editOrder?: EditOrderPrefill | null;
}) {
  return (
    <CartProvider discountRate={discountRate}>
      {editOrder && <EditOrderBootstrap editOrder={editOrder} />}
      <CartBar />
      <CatalogBrowser catalog={catalog} discountRate={discountRate} />
      <CartReviewModal />
    </CartProvider>
  );
}

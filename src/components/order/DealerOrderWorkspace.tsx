"use client";

import { useEffect, useMemo, useRef } from "react";
import { CartProvider, useCart, type CartItem } from "@/components/order/CartContext";
import { CartBar } from "@/components/order/CartBar";
import { CartReviewModal } from "@/components/order/CartReviewModal";
import { CatalogBrowser } from "@/components/order/CatalogBrowser";
import { buildPromoByProduct, type DealerPromo } from "@/lib/utils/promo-pricing";
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

export interface ReorderPrefill {
  id: string;
  items: { productId: string; quantity: number; isDemo: boolean }[];
}

// /order?reorder=<id>로 들어왔을 때 과거 주문의 품목을 "새" 장바구니에 담고 장바구니를
// 연다. 수정 모드(startEditingOrder)와 달리 기존 주문은 건드리지 않는다. 현재 카탈로그에
// 없는 상품(단종 등)은 건너뛰고, 데모구매가 더 이상 불가한 상품은 정상구매로 담는다.
function ReorderBootstrap({ reorder, catalog }: { reorder: ReorderPrefill; catalog: DealerCatalogRow[] }) {
  const { addItem, open } = useCart();
  const loadedId = useRef<string | null>(null);

  useEffect(() => {
    if (loadedId.current === reorder.id) return;
    loadedId.current = reorder.id;
    const byId = new Map(catalog.map((c) => [c.product_id, c]));
    for (const it of reorder.items) {
      const product = byId.get(it.productId);
      if (!product) continue;
      addItem(product, it.quantity, it.isDemo && product.demo_purchase_allowed);
    }
    open();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reorder.id]);

  return null;
}

export function DealerOrderWorkspace({
  catalog,
  discountRate,
  editOrder,
  reorder,
  promos = [],
}: {
  catalog: DealerCatalogRow[];
  discountRate: number;
  editOrder?: EditOrderPrefill | null;
  reorder?: ReorderPrefill | null;
  promos?: DealerPromo[];
}) {
  const promoByProduct = useMemo(() => buildPromoByProduct(promos), [promos]);
  return (
    <CartProvider discountRate={discountRate} promoByProduct={promoByProduct}>
      {editOrder && <EditOrderBootstrap editOrder={editOrder} />}
      {!editOrder && reorder && <ReorderBootstrap reorder={reorder} catalog={catalog} />}
      <CartBar />
      <CatalogBrowser catalog={catalog} discountRate={discountRate} promos={promos} />
      <CartReviewModal />
    </CartProvider>
  );
}

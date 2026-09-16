"use client";

import { CartProvider } from "@/components/order/CartContext";
import { CartBar } from "@/components/order/CartBar";
import { CartReviewModal } from "@/components/order/CartReviewModal";
import { CatalogBrowser } from "@/components/order/CatalogBrowser";
import type { DealerCatalogRow } from "@/lib/types/database.types";

export function DealerOrderWorkspace({
  catalog,
  discountRate,
}: {
  catalog: DealerCatalogRow[];
  discountRate: number;
}) {
  return (
    <CartProvider discountRate={discountRate}>
      <CartBar />
      <CatalogBrowser catalog={catalog} discountRate={discountRate} />
      <CartReviewModal />
    </CartProvider>
  );
}

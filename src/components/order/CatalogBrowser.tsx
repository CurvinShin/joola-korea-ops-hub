"use client";

import { useMemo, useState } from "react";
import { OrderRow } from "@/components/order/OrderRow";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";
import type { DealerCatalogRow } from "@/lib/types/database.types";

// Fixed display order for category tabs — not alphabetical, matches how
// JOOLA Korea actually thinks about the product lineup (paddles first,
// clothing/socks last). Anything with an unexpected category value still
// shows up under "전체" and, as a fallback, its own tab.
const CATEGORY_ORDER = ["패들", "가방", "액세서리", "공", "어셈블리", "신발", "양말", "의류"];

export function CatalogBrowser({
  catalog,
  discountRate,
}: {
  catalog: DealerCatalogRow[];
  discountRate: number;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const present = new Set(catalog.map((p) => p.category).filter((c): c is string => !!c));
    const ordered = CATEGORY_ORDER.filter((c) => present.has(c));
    const extra = [...present].filter((c) => !CATEGORY_ORDER.includes(c)).sort();
    return [...ordered, ...extra];
  }, [catalog]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((p) => {
      if (category && p.category !== category) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    });
  }, [catalog, query, category]);

  return (
    <div>
      <div className="space-y-3 border-b border-slate-100 pb-4">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="상품명 또는 상품코드로 검색..."
          className="max-w-sm"
        />
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              category === null ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            전체 ({catalog.length})
          </button>
          {categories.map((c) => {
            const count = catalog.filter((p) => p.category === c).length;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium",
                  category === c ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {c} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length > 0 ? (
        filtered.map((p) => <OrderRow key={p.product_id} product={p} discountRate={discountRate} />)
      ) : (
        <p className="py-8 text-center text-sm text-slate-400">검색 결과가 없습니다.</p>
      )}
    </div>
  );
}

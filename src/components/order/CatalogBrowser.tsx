"use client";

import { useMemo, useState } from "react";
import { OrderRow } from "@/components/order/OrderRow";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";
import { CATEGORY_ORDER } from "@/lib/utils/categoryOrder";
import type { DealerCatalogRow } from "@/lib/types/database.types";

export function CatalogBrowser({
  catalog,
  discountRate,
}: {
  catalog: DealerCatalogRow[];
  discountRate: number;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [subcategory, setSubcategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const present = new Set(catalog.map((p) => p.category).filter((c): c is string => !!c));
    const ordered = CATEGORY_ORDER.filter((c) => present.has(c));
    const extra = [...present].filter((c) => !CATEGORY_ORDER.includes(c)).sort();
    return [...ordered, ...extra];
  }, [catalog]);

  // 선택된 카테고리 안에서만 의미가 있는 서브카테고리 목록 (예: 패들 → Champion/Edge/Pro)
  const subcategories = useMemo(() => {
    if (!category) return [];
    const present = new Set(
      catalog
        .filter((p) => p.category === category)
        .map((p) => p.subcategory)
        .filter((s): s is string => !!s)
    );
    return [...present].sort();
  }, [catalog, category]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((p) => {
      if (category && p.category !== category) return false;
      if (subcategory && p.subcategory !== subcategory) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    });
  }, [catalog, query, category, subcategory]);

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
            onClick={() => {
              setCategory(null);
              setSubcategory(null);
            }}
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
                onClick={() => {
                  setCategory(c);
                  setSubcategory(null);
                }}
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

        {category && subcategories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSubcategory(null)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                subcategory === null ? "bg-slate-700 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
              )}
            >
              전체
            </button>
            {subcategories.map((s) => {
              const count = catalog.filter((p) => p.category === category && p.subcategory === s).length;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSubcategory(s)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium",
                    subcategory === s ? "bg-slate-700 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                  )}
                >
                  {s} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {filtered.length > 0 ? (
        filtered.map((p) => <OrderRow key={p.product_id} product={p} discountRate={discountRate} />)
      ) : (
        <p className="py-8 text-center text-sm text-slate-400">검색 결과가 없습니다.</p>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { OrderRow } from "@/components/order/OrderRow";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";
import { CATEGORY_ORDER } from "@/lib/utils/categoryOrder";
import { buildPromoByProduct, promoUnitPrice, type DealerPromo } from "@/lib/utils/promo-pricing";
import type { DealerCatalogRow } from "@/lib/types/database.types";

const currency = (n: number) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n);

// "2026-11-15" -> "11/15"
const shortDate = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;

export function CatalogBrowser({
  catalog,
  discountRate,
  promos = [],
}: {
  catalog: DealerCatalogRow[];
  discountRate: number;
  promos?: DealerPromo[];
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [promoId, setPromoId] = useState<string | null>(null);

  const promoByProduct = useMemo(() => buildPromoByProduct(promos), [promos]);

  // 프로모션별로 "지금 카탈로그에 실제로 있는" 상품 수 — 등록은 됐지만 카탈로그에서
  // 빠진 상품(단종 등)이 있어도 버튼의 개수와 눌렀을 때 보이는 개수가 같게 센다.
  const promoCounts = useMemo(() => {
    const catalogIds = new Set(catalog.map((p) => p.product_id));
    return new Map(promos.map((p) => [p.id, p.productIds.filter((id) => catalogIds.has(id)).length]));
  }, [catalog, promos]);
  const selectedPromo = promos.find((p) => p.id === promoId) ?? null;

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
      if (selectedPromo && promoByProduct[p.product_id]?.id !== selectedPromo.id) return false;
      if (category && p.category !== category) return false;
      if (subcategory && p.subcategory !== subcategory) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    });
  }, [catalog, query, category, subcategory, selectedPromo, promoByProduct]);

  return (
    <div>
      {promos.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold text-amber-900">진행 중인 프로모션</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {promos.map((promo) => (
              <button
                key={promo.id}
                type="button"
                onClick={() => {
                  setPromoId(promoId === promo.id ? null : promo.id);
                  setCategory(null);
                  setSubcategory(null);
                  setQuery("");
                }}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium",
                  promoId === promo.id
                    ? "border-amber-600 bg-amber-600 text-white"
                    : "border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
                )}
              >
                {promo.name} ({promoCounts.get(promo.id) ?? 0}개)
              </button>
            ))}
          </div>
          {selectedPromo && (
            <div className="mt-3 text-xs text-amber-900">
              <p>
                {shortDate(selectedPromo.startsOn)} ~ {shortDate(selectedPromo.endsOn)} · 행사 소비자가{" "}
                {currency(selectedPromo.promoPrice)} · 공급가 {currency(promoUnitPrice(selectedPromo))}
                {selectedPromo.maxQtyPerDealer != null &&
                  ` · 딜러당 최대 ${selectedPromo.maxQtyPerDealer}개 (행사 기간 누적)`}
              </p>
              <p className="mt-0.5 text-amber-700">
                데모구매는 행사 대상이 아니며 기존 데모 가격이 적용됩니다.{" "}
                <button type="button" onClick={() => setPromoId(null)} className="underline">
                  전체 제품 보기
                </button>
              </p>
            </div>
          )}
        </div>
      )}

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
        filtered.map((p) => (
          <OrderRow key={p.product_id} product={p} discountRate={discountRate} promo={promoByProduct[p.product_id]} />
        ))
      ) : (
        <p className="py-8 text-center text-sm text-slate-400">검색 결과가 없습니다.</p>
      )}
    </div>
  );
}

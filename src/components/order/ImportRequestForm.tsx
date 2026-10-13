"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";

type Option = { product_id: string; sku: string; name: string };

/**
 * 재고 없는 상품 중에서 검색해 고르고 수량/메모를 남기는 수입 요청 폼.
 * 실제 저장은 서버 액션(createImportRequest)이 한다 — 재고가 있는 상품이면 거기서 한 번 더 막는다.
 */
export function ImportRequestForm({
  action,
  options,
  preselectId,
}: {
  action: (formData: FormData) => void | Promise<void>;
  options: Option[];
  preselectId?: string;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>(
    preselectId && options.some((o) => o.product_id === preselectId) ? preselectId : ""
  );

  const selected = options.find((o) => o.product_id === selectedId) ?? null;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return options.filter((o) => o.name.toLowerCase().includes(q) || o.sku.toLowerCase().includes(q)).slice(0, 8);
  }, [options, query]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="product_id" value={selectedId} />

      <div>
        <Label>수입 요청할 상품 (재고 없는 상품 {options.length}개 중 선택)</Label>
        {selected ? (
          <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
            <span className="text-slate-800">
              <span className="text-xs text-slate-500">{selected.sku}</span> {selected.name}
            </span>
            <button type="button" onClick={() => setSelectedId("")} className="text-xs text-slate-500 underline">
              다시 고르기
            </button>
          </div>
        ) : (
          <>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="상품명 또는 상품코드로 검색..."
            />
            {matches.length > 0 && (
              <ul className="mt-1 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
                {matches.map((o) => (
                  <li key={o.product_id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(o.product_id)}
                      className="block w-full px-3 py-2 text-left hover:bg-slate-50"
                    >
                      <span className="text-xs text-slate-400">{o.sku}</span> {o.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {query.trim() && matches.length === 0 && (
              <p className="mt-1 text-xs text-slate-400">
                검색 결과가 없습니다. 재고가 있는 상품은 &ldquo;주문하기&rdquo;에서 바로 주문할 수 있습니다.
              </p>
            )}
          </>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <div>
          <Label htmlFor="quantity">희망 수량</Label>
          <Input id="quantity" name="quantity" type="number" min={1} step={1} defaultValue={1} required />
        </div>
        <div>
          <Label htmlFor="note">메모 (선택)</Label>
          <Textarea id="note" name="note" rows={2} placeholder="예: 행사용이라 12월 안에 필요합니다" maxLength={300} />
        </div>
      </div>

      <Button type="submit" disabled={!selectedId}>
        수입 요청 남기기
      </Button>
    </form>
  );
}

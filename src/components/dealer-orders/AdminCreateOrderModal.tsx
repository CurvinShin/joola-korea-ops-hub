"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { createDealerOrderAdmin } from "@/lib/actions/dealer-order-admin";
import { parseOrderPaste } from "@/lib/utils/order-paste";
import { isZeroPriceDealerCode } from "@/lib/config/coupang";
import type { DealerCatalogRow } from "@/lib/types/database.types";

export interface CreateOrderDealer {
  id: string;
  name: string;
  kr_code: string | null;
}

interface Line {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  isDemo: boolean;
}

/**
 * 관리자가 딜러(또는 쿠팡로켓 로켓그로스 입고) 대신 주문을 직접 만드는 창.
 * - 쿠팡로켓: 버튼 한 번으로 딜러가 미리 선택되고, 금액은 0원으로 저장된다.
 * - 상품은 "SKU 수량" 목록을 한꺼번에 붙여넣거나(엑셀 두 열 복사 가능) SKU를 하나씩 추가.
 */
export function AdminCreateOrderModal({
  dealers,
  catalog,
}: {
  dealers: CreateOrderDealer[];
  catalog: DealerCatalogRow[];
}) {
  const [open, setOpen] = useState(false);
  const [dealerId, setDealerId] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [paste, setPaste] = useState("");
  const [pasteErrors, setPasteErrors] = useState<string[]>([]);
  const [skuInput, setSkuInput] = useState("");
  const [skuQty, setSkuQty] = useState("1");
  const [skuDemo, setSkuDemo] = useState(false);
  const [skuError, setSkuError] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const coupang = dealers.find((d) => isZeroPriceDealerCode(d.kr_code));
  const dealer = dealers.find((d) => d.id === dealerId) ?? null;
  const isCoupang = isZeroPriceDealerCode(dealer?.kr_code);

  const catalogBySku = useMemo(() => new Map(catalog.map((c) => [c.sku.trim().toLowerCase(), c])), [catalog]);
  const totalQty = lines.reduce((sum, l) => sum + l.quantity, 0);

  function openWith(id: string) {
    setDealerId(id);
    setLines([]);
    setPaste("");
    setPasteErrors([]);
    setSkuInput("");
    setSkuQty("1");
    setSkuDemo(false);
    setSkuError(null);
    setResult(null);
    setOpen(true);
  }

  function mergeLine(next: Line) {
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.productId === next.productId && l.isDemo === next.isDemo);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + next.quantity };
        return copy;
      }
      return [...prev, next];
    });
  }

  function applyPaste() {
    const parsed = parseOrderPaste(paste, catalog);
    setPasteErrors(parsed.errors);
    for (const l of parsed.lines) mergeLine({ ...l, isDemo: false });
    // 반영된 줄은 입력창에서 지우고, 오류가 난 줄만 남겨 고치기 쉽게 한다.
    if (parsed.errors.length === 0) setPaste("");
  }

  function addBySku() {
    const trimmed = skuInput.trim();
    if (!trimmed) return;
    const product = catalogBySku.get(trimmed.toLowerCase());
    if (!product) {
      setSkuError("해당 SKU를 가진 상품을 찾을 수 없습니다.");
      return;
    }
    const qty = parseInt(skuQty, 10);
    if (!Number.isFinite(qty) || qty < 1) {
      setSkuError("수량을 확인해주세요.");
      return;
    }
    const demo = skuDemo && !isCoupang;
    if (demo && !product.demo_purchase_allowed) {
      setSkuError(`"${product.name}"은(는) 데모구매가 불가한 상품입니다.`);
      return;
    }
    mergeLine({ productId: product.product_id, sku: product.sku, name: product.name, quantity: qty, isDemo: demo });
    setSkuInput("");
    setSkuQty("1");
    setSkuDemo(false);
    setSkuError(null);
  }

  function setQty(productId: string, isDemo: boolean, quantity: number) {
    setLines((prev) =>
      prev
        .map((l) => (l.productId === productId && l.isDemo === isDemo ? { ...l, quantity } : l))
        .filter((l) => l.quantity > 0)
    );
  }

  function submit() {
    if (!dealerId) {
      setResult({ ok: false, text: "딜러를 선택해주세요." });
      return;
    }
    if (lines.length === 0) {
      setResult({ ok: false, text: "상품을 1개 이상 추가해주세요." });
      return;
    }
    setResult(null);
    startTransition(async () => {
      const res = await createDealerOrderAdmin(
        dealerId,
        lines.map((l) => ({ productId: l.productId, quantity: l.quantity, isDemo: l.isDemo }))
      );
      setResult({ ok: res.ok, text: res.message });
      if (res.ok) {
        setLines([]);
        setPaste("");
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {coupang && (
          <Button type="button" size="sm" onClick={() => openWith(coupang.id)}>
            + 쿠팡로켓 주문 만들기
          </Button>
        )}
        <Button type="button" size="sm" variant="secondary" onClick={() => openWith("")}>
          + 딜러 주문 대신 만들기
        </Button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-10"
          onClick={() => setOpen(false)}
        >
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">
                {isCoupang ? "쿠팡로켓 주문 만들기" : "주문 직접 만들기"}
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-500">1. 딜러</p>
                <Select value={dealerId} onChange={(e) => setDealerId(e.target.value)}>
                  <option value="">선택하세요</option>
                  {dealers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                      {d.kr_code ? ` (${d.kr_code})` : ""}
                    </option>
                  ))}
                </Select>
                {isCoupang && (
                  <p className="mt-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
                    쿠팡로켓 주문은 금액이 0원으로 저장되고 배송비도 붙지 않습니다. 수취인·주소·전화번호는
                    발주서 엑셀에 자동으로 들어갑니다.
                  </p>
                )}
              </div>

              <div>
                <p className="mb-1 text-xs font-semibold text-slate-500">
                  2. 상품 — 한 줄에 &ldquo;SKU 수량&rdquo;을 붙여넣으세요 (엑셀 두 열 복사도 가능)
                </p>
                <Textarea
                  rows={4}
                  value={paste}
                  onChange={(e) => setPaste(e.target.value)}
                  placeholder={"600001 13\n18500 5"}
                  className="font-mono text-xs"
                />
                {pasteErrors.length > 0 && (
                  <ul className="mt-1 space-y-0.5 text-xs text-red-600">
                    {pasteErrors.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                )}
                <div className="mt-1.5">
                  <Button type="button" size="sm" variant="secondary" disabled={!paste.trim()} onClick={applyPaste}>
                    붙여넣은 목록 반영
                  </Button>
                </div>
              </div>

              <div>
                <p className="mb-1 text-xs font-semibold text-slate-500">또는 하나씩 추가</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    list="admin-order-sku-list"
                    value={skuInput}
                    onChange={(e) => {
                      setSkuInput(e.target.value);
                      setSkuError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addBySku();
                      }
                    }}
                    placeholder="SKU 입력 (예: 600001)"
                    className="max-w-[200px]"
                  />
                  <datalist id="admin-order-sku-list">
                    {catalog.map((c) => (
                      <option key={c.product_id} value={c.sku}>
                        {c.name}
                      </option>
                    ))}
                  </datalist>
                  <Input
                    type="number"
                    min={1}
                    value={skuQty}
                    onChange={(e) => setSkuQty(e.target.value)}
                    className="w-20"
                  />
                  {!isCoupang && (
                    <label className="flex items-center gap-1 text-xs text-slate-600">
                      <input type="checkbox" checked={skuDemo} onChange={(e) => setSkuDemo(e.target.checked)} />
                      데모구매
                    </label>
                  )}
                  <Button type="button" size="sm" variant="secondary" disabled={!skuInput.trim()} onClick={addBySku}>
                    추가
                  </Button>
                </div>
                {skuInput.trim() && catalogBySku.get(skuInput.trim().toLowerCase()) && (
                  <p className="mt-1 text-xs text-slate-500">
                    {catalogBySku.get(skuInput.trim().toLowerCase())?.name}
                  </p>
                )}
                {skuError && <p className="mt-1 text-xs text-red-600">{skuError}</p>}
              </div>

              <div>
                <p className="mb-1 text-xs font-semibold text-slate-500">
                  주문 품목 {lines.length}개 · 총 {totalQty}개
                </p>
                {lines.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                    아직 추가된 상품이 없습니다.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                    {lines.map((l) => (
                      <li key={`${l.productId}-${l.isDemo}`} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                        <span className="min-w-0 flex-1 truncate text-slate-700">
                          <span className="mr-1.5 font-mono text-slate-500">{l.sku}</span>
                          {l.name}
                          {l.isDemo && <span className="ml-1.5 text-purple-600">(데모)</span>}
                        </span>
                        <Input
                          type="number"
                          min={1}
                          value={l.quantity}
                          onChange={(e) => setQty(l.productId, l.isDemo, parseInt(e.target.value, 10) || 0)}
                          className="w-20"
                        />
                        <button
                          type="button"
                          onClick={() => setQty(l.productId, l.isDemo, 0)}
                          className="text-slate-400 hover:text-red-600"
                          aria-label="삭제"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {result && (
                <p className={`rounded-md px-3 py-2 text-xs ${result.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                  {result.text}
                  {result.ok && " 목록에서 주문을 체크하고 발주서 엑셀을 만드세요."}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                닫기
              </Button>
              <Button type="button" disabled={isPending || lines.length === 0 || !dealerId} onClick={submit}>
                {isPending ? "만드는 중…" : "주문 만들기"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

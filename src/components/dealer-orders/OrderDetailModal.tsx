"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Table, Thead, Tr, Th, Td } from "@/components/ui/Table";
import { dealerOrderStatusLabel, dealerOrderTypeLabel } from "@/lib/utils/labels";
import { COMPANY_INFO } from "@/lib/config/company";
import { updateDealerOrderItemsAdmin } from "@/lib/actions/dealer-order-admin";
import type { DealerOrderAdminRow, DealerCatalogRow } from "@/lib/types/database.types";

const currency = (n: number) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n);

function CopyableCell({ text, mono }: { text: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // clipboard API unavailable — fail silently, the text is still visible to copy by hand
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`group inline-flex items-center gap-1 rounded text-xs text-slate-600 hover:text-brand-600 ${mono ? "font-mono" : ""}`}
      title="클릭하면 복사됩니다"
    >
      {text}
      <span className="text-slate-300 group-hover:text-brand-500">{copied ? "✓" : "⧉"}</span>
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="shrink-0 text-slate-400">{label}</span>
      <span className="text-right text-slate-700">{value}</span>
    </div>
  );
}

// 견적서 "비고" 칸에 그대로 붙여넣을 수 있는 텍스트 — 경리나라 등 외부 프로그램에
// 옮겨 적을 필요 없이 한 번 클릭으로 클립보드에 복사되도록 제공한다.
const REMARKS_TEXT = `담당자 : ${COMPANY_INFO.contactName}\n입금계좌 : ${COMPANY_INFO.bankName} ${COMPANY_INFO.bankAccountNumber} (${COMPANY_INFO.bankAccountHolder})`;

function RemarksBlock() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(REMARKS_TEXT);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // clipboard API unavailable — fail silently, the text is still visible to copy by hand
    }
  }

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500">비고 (견적서용, 클릭하면 복사됩니다)</p>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded text-xs text-slate-500 hover:text-brand-600"
        >
          {copied ? "✓ 복사됨" : "⧉ 복사"}
        </button>
      </div>
      <pre
        onClick={copy}
        className="cursor-pointer whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-700"
      >
        {REMARKS_TEXT}
      </pre>
    </div>
  );
}

interface EditableLine {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  isDemo: boolean;
}

function buildEditableLines(order: DealerOrderAdminRow): EditableLine[] {
  return (order.dealer_order_items ?? []).map((it) => ({
    productId: it.product_id,
    sku: it.products?.sku ?? "",
    name: it.products?.name ?? "(알 수 없는 상품)",
    quantity: it.quantity,
    isDemo: it.is_demo,
  }));
}

export function OrderDetailModal({
  order,
  catalog,
}: {
  order: DealerOrderAdminRow & { order_date: string };
  catalog: DealerCatalogRow[];
}) {
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [lines, setLines] = useState<EditableLine[]>(() => buildEditableLines(order));
  const [skuInput, setSkuInput] = useState("");
  const [skuQty, setSkuQty] = useState("1");
  const [skuDemo, setSkuDemo] = useState(false);
  const [skuError, setSkuError] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const items = order.dealer_order_items ?? [];
  const totalQty = items.reduce((sum, it) => sum + it.quantity, 0);
  const itemsSubtotal = items.reduce((sum, it) => sum + it.unit_price * it.quantity, 0);
  const shippingFee = Number(order.auto_shipping_fee ?? 0) + Number(order.manual_shipping_fee ?? 0);
  // 입금 확인 시 관리자가 견적서에 맞춰 직접 고쳐 입력한 금액이 있으면 그것을, 없으면(아직 입금 전) 상품 공급가액 + 배송비로 계산한 예상 금액을 보여준다.
  const grandTotal = order.confirmed_total_amount != null ? Number(order.confirmed_total_amount) : itemsSubtotal + shippingFee;
  const isConfirmedTotal = order.confirmed_total_amount != null;
  const dealer = order.dealers;
  // 입금 확인(재고 차감) 전 주문만 관리자가 직접 고칠 수 있게 한다 — 그
  // 이후는 이미 재고가 빠져나간 뒤라 품목이 바뀌면 재고도 같이 보정해야
  // 하는데 아직 그 로직이 없다. updateDealerOrderItemsAdmin도 서버에서
  // 같은 조건을 다시 확인한다.
  const canEdit = order.status === "draft";

  const catalogBySku = useMemo(
    () => new Map(catalog.map((c) => [c.sku.trim().toLowerCase(), c])),
    [catalog]
  );
  const matchedProduct = skuInput.trim() ? catalogBySku.get(skuInput.trim().toLowerCase()) ?? null : null;

  function startEditing() {
    setLines(buildEditableLines(order));
    setSaveResult(null);
    setSkuInput("");
    setSkuQty("1");
    setSkuDemo(false);
    setSkuError(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setSaveResult(null);
  }

  function updateLineQuantity(productId: string, isDemo: boolean, quantity: number) {
    setLines((prev) =>
      prev
        .map((l) => (l.productId === productId && l.isDemo === isDemo ? { ...l, quantity } : l))
        .filter((l) => l.quantity > 0)
    );
  }

  function removeLine(productId: string, isDemo: boolean) {
    setLines((prev) => prev.filter((l) => !(l.productId === productId && l.isDemo === isDemo)));
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
    if (skuDemo && !product.demo_purchase_allowed) {
      setSkuError(`"${product.name}"은(는) 데모구매가 불가한 상품입니다.`);
      return;
    }
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.productId === product.product_id && l.isDemo === skuDemo);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + qty };
        return next;
      }
      return [
        ...prev,
        { productId: product.product_id, sku: product.sku, name: product.name, quantity: qty, isDemo: skuDemo },
      ];
    });
    setSkuInput("");
    setSkuQty("1");
    setSkuDemo(false);
    setSkuError(null);
  }

  function handleSave() {
    if (lines.length === 0) {
      setSaveResult({ ok: false, text: "품목이 1개 이상 있어야 합니다." });
      return;
    }
    setSaveResult(null);
    startTransition(async () => {
      const payload = lines.map((l) => ({ productId: l.productId, quantity: l.quantity, isDemo: l.isDemo }));
      const res = await updateDealerOrderItemsAdmin(order.id, payload);
      setSaveResult({ ok: res.ok, text: res.message });
      if (res.ok) setIsEditing(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-brand-600 hover:underline"
      >
        주문내용 확인 ({items.length}개 품목 · {totalQty}개)
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-10"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-3xl rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  {dealer?.name ?? "—"} 주문내용
                  {order.order_number && (
                    <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-medium text-slate-600">
                      {order.order_number}
                    </span>
                  )}
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  주문일 {order.order_date} ·{" "}
                  <Badge tone={order.order_type === "demo" ? "purple" : "slate"}>
                    {dealerOrderTypeLabel[order.order_type] ?? order.order_type}
                  </Badge>{" "}
                  <Badge tone="blue">{dealerOrderStatusLabel[order.status] ?? order.status}</Badge>
                </p>
              </div>
              <div className="flex items-center gap-3">
                {canEdit && !isEditing && (
                  <button
                    type="button"
                    onClick={startEditing}
                    className="text-xs font-medium text-brand-600 hover:underline"
                  >
                    품목 수정
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="닫기"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-5">
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <p className="mb-1.5 text-xs font-semibold text-slate-500">배송지 정보</p>
                  <div className="space-y-1">
                    <InfoRow label="수령인" value={dealer?.ship_recipient ?? "—"} />
                    <InfoRow label="배송지" value={dealer?.address ?? "—"} />
                    <InfoRow label="결제조건" value={dealer?.payment_terms ?? "—"} />
                  </div>
                </div>
                <RemarksBlock />
              </div>

              {!isEditing ? (
                <>
                  <Table>
                    <Thead>
                      <Tr>
                        <Th>#</Th>
                        <Th>SKU</Th>
                        <Th>품목명</Th>
                        <Th className="text-right">수량</Th>
                        <Th className="text-right">단가</Th>
                        <Th className="text-right">공급가액</Th>
                        <Th>비고</Th>
                      </Tr>
                    </Thead>
                    <tbody>
                      {items.map((it, i) => (
                        <Tr key={i}>
                          <Td className="text-slate-400">{i + 1}</Td>
                          <Td>{it.products?.sku ? <CopyableCell text={it.products.sku} mono /> : "—"}</Td>
                          <Td>{it.products?.name ? <CopyableCell text={it.products.name} /> : "—"}</Td>
                          <Td className="text-right">{it.quantity}</Td>
                          <Td className="text-right">{currency(it.unit_price)}</Td>
                          <Td className="text-right">{currency(it.unit_price * it.quantity)}</Td>
                          <Td>{it.is_demo && <Badge tone="purple">데모</Badge>}</Td>
                        </Tr>
                      ))}
                      {shippingFee > 0 && (
                        <Tr>
                          <Td className="text-slate-400">{items.length + 1}</Td>
                          <Td>—</Td>
                          <Td>배송비</Td>
                          <Td className="text-right">1</Td>
                          <Td className="text-right">{currency(shippingFee)}</Td>
                          <Td className="text-right">{currency(shippingFee)}</Td>
                          <Td></Td>
                        </Tr>
                      )}
                    </tbody>
                  </Table>

                  <div className="mt-4 flex justify-end border-t border-slate-100 pt-4">
                    <div className="w-64 space-y-1 text-sm">
                      <div className="flex justify-between text-slate-500">
                        <span>상품 공급가액</span>
                        <span>{currency(itemsSubtotal)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>배송비</span>
                        <span>{shippingFee > 0 ? currency(shippingFee) : "미확정"}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-100 pt-1 text-base font-semibold text-slate-900">
                        <span>{isConfirmedTotal ? "합계 (확정)" : "합계 (예상)"}</span>
                        <span>{currency(grandTotal)}</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
                    입금 확인 전 주문만 수정할 수 있습니다. 저장하면 단가·공급가액이 딜러 할인율 기준으로 다시
                    계산되고, 주문번호는 그대로 유지됩니다.
                  </p>
                  <Table>
                    <Thead>
                      <Tr>
                        <Th>SKU</Th>
                        <Th>품목명</Th>
                        <Th className="text-right">수량</Th>
                        <Th>구분</Th>
                        <Th></Th>
                      </Tr>
                    </Thead>
                    <tbody>
                      {lines.map((line) => (
                        <Tr key={`${line.productId}:${line.isDemo}`}>
                          <Td className="font-mono text-xs text-slate-500">{line.sku || "—"}</Td>
                          <Td>
                            {line.name}
                            {line.isDemo && (
                              <span className="ml-1.5 rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                                데모
                              </span>
                            )}
                          </Td>
                          <Td className="text-right">
                            <input
                              type="number"
                              min={1}
                              value={line.quantity}
                              disabled={isPending}
                              onChange={(e) =>
                                updateLineQuantity(
                                  line.productId,
                                  line.isDemo,
                                  Math.max(1, parseInt(e.target.value, 10) || 1)
                                )
                              }
                              className="w-16 rounded border border-slate-300 px-2 py-1 text-right text-sm"
                            />
                          </Td>
                          <Td>{line.isDemo ? "데모" : "정상"}</Td>
                          <Td className="text-right">
                            <button
                              type="button"
                              className="text-xs text-red-600 hover:underline"
                              disabled={isPending}
                              onClick={() => removeLine(line.productId, line.isDemo)}
                            >
                              삭제
                            </button>
                          </Td>
                        </Tr>
                      ))}
                      {lines.length === 0 && (
                        <Tr>
                          <Td colSpan={5} className="py-4 text-center text-xs text-slate-400">
                            품목이 없습니다. 아래에서 SKU로 추가해주세요.
                          </Td>
                        </Tr>
                      )}
                    </tbody>
                  </Table>

                  <div className="mt-3 rounded-lg border border-dashed border-slate-300 p-3">
                    <p className="mb-2 text-xs font-semibold text-slate-500">SKU로 품목 추가</p>
                    <div className="flex flex-wrap items-end gap-2">
                      <div>
                        <label className="mb-1 block text-[11px] text-slate-400">SKU</label>
                        <Input
                          value={skuInput}
                          onChange={(e) => {
                            setSkuInput(e.target.value);
                            setSkuError(null);
                          }}
                          placeholder="예: 601885"
                          className="!w-36 py-1.5 text-sm"
                          disabled={isPending}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-slate-400">수량</label>
                        <Input
                          type="number"
                          min={1}
                          value={skuQty}
                          onChange={(e) => setSkuQty(e.target.value)}
                          className="!w-20 py-1.5 text-sm"
                          disabled={isPending}
                        />
                      </div>
                      <label className="flex items-center gap-1.5 pb-2 text-xs text-slate-500">
                        <input
                          type="checkbox"
                          checked={skuDemo}
                          onChange={(e) => setSkuDemo(e.target.checked)}
                          disabled={isPending}
                        />
                        데모구매
                      </label>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={isPending || !skuInput.trim()}
                        onClick={addBySku}
                      >
                        추가
                      </Button>
                      <div className="min-w-[10rem] text-xs">
                        {skuInput.trim() &&
                          (matchedProduct ? (
                            <span className="text-emerald-600">→ {matchedProduct.name}</span>
                          ) : (
                            <span className="text-slate-400">일치하는 상품 없음</span>
                          ))}
                      </div>
                    </div>
                    {skuError && <p className="mt-1.5 text-xs text-red-600">{skuError}</p>}
                  </div>

                  {saveResult && (
                    <p className={`mt-3 text-sm ${saveResult.ok ? "text-emerald-600" : "text-red-600"}`}>
                      {saveResult.text}
                    </p>
                  )}

                  <div className="mt-3 flex justify-end gap-2">
                    <Button type="button" variant="secondary" size="sm" disabled={isPending} onClick={cancelEditing}>
                      취소
                    </Button>
                    <Button type="button" size="sm" disabled={isPending || lines.length === 0} onClick={handleSave}>
                      {isPending ? "저장 중..." : "저장"}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-100 px-5 py-3">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

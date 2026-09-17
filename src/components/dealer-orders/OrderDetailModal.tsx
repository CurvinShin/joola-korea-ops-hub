"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, Thead, Tr, Th, Td } from "@/components/ui/Table";
import { dealerOrderStatusLabel, dealerOrderTypeLabel } from "@/lib/utils/labels";
import { COMPANY_INFO } from "@/lib/config/company";
import type { DealerOrderAdminRow } from "@/lib/types/database.types";

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

export function OrderDetailModal({ order }: { order: DealerOrderAdminRow & { order_date: string } }) {
  const [open, setOpen] = useState(false);

  const items = order.dealer_order_items ?? [];
  const totalQty = items.reduce((sum, it) => sum + it.quantity, 0);
  const itemsSubtotal = items.reduce((sum, it) => sum + it.unit_price * it.quantity, 0);
  const shippingFee = Number(order.auto_shipping_fee ?? 0) + Number(order.manual_shipping_fee ?? 0);
  // 입금 확인 시 관리자가 견적서에 맞춰 직접 고치 입력한 금액이 있으면 그것을, 없으면(아직 입금 전) 상품 공급가액 + 배송비로 계산한 예상 금액을 보여준다.
  const grandTotal = order.confirmed_total_amount != null ? Number(order.confirmed_total_amount) : itemsSubtotal + shippingFee;
  const isConfirmedTotal = order.confirmed_total_amount != null;
  const dealer = order.dealers;

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
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="닫기"
              >
                ✕
              </button>
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

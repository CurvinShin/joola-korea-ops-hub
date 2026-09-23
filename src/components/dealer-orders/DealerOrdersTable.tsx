"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, Thead, Tr, Th, Td } from "@/components/ui/Table";
import { DealerOrderRowActions } from "@/components/dealer-orders/DealerOrderRowActions";
import { OrderDetailModal } from "@/components/dealer-orders/OrderDetailModal";
import { ShippingListCopyButton } from "@/components/dealer-orders/ShippingListCopyButton";
import { dealerOrderTypeLabel } from "@/lib/utils/labels";
import { shippingListRowsToTsv } from "@/lib/utils/shipping-list";
import type { DealerOrderAdminRow, DealerCatalogRow } from "@/lib/types/database.types";

const currency = (n: number) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n);

// 딜러 주문 목록 + 택배 양식 복사 체크박스. 기본값은 전체 체크 해제 —
// 오늘 새로 들어온 것 등 필요한 주문만 골라 체크한 뒤 복사하는 방식이다.
export function DealerOrdersTable({
  rows,
  shippingRowsByOrder,
  catalog,
}: {
  rows: (DealerOrderAdminRow & { order_date: string })[];
  shippingRowsByOrder: Record<string, string[][]>;
  catalog: DealerCatalogRow[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(rows.map((o) => o.id)));
  }

  function selectNone() {
    setSelected(new Set());
  }

  const allSelected = rows.length > 0 && selected.size === rows.length;

  const { tsv, rowCount } = useMemo(() => {
    const selectedRows = rows
      .filter((o) => selected.has(o.id))
      .flatMap((o) => shippingRowsByOrder[o.id] ?? []);
    return { tsv: shippingListRowsToTsv(selectedRows), rowCount: selectedRows.length };
  }, [rows, selected, shippingRowsByOrder]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
        <p className="text-sm text-slate-500">
          {selected.size > 0 ? `${selected.size}건 선택됨 (택배 ${rowCount}줄)` : "택배 양식으로 복사할 주문을 체크하세요"}
        </p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={selectAll}>
            전체 선택
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={selectNone}>
            전체 해제
          </Button>
          <ShippingListCopyButton tsv={tsv} rowCount={rowCount} />
        </div>
      </div>

      {rows.length > 0 ? (
        <Table>
          <Thead>
            <Tr>
              <Th className="w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => (e.target.checked ? selectAll() : selectNone())}
                  aria-label="전체 선택"
                  className="h-4 w-4 rounded border-slate-300"
                />
              </Th>
              <Th>주문일</Th>
              <Th>딜러</Th>
              <Th>상품</Th>
              <Th>구분</Th>
              <Th>공급가액</Th>
              <Th>배송비 확정</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <tbody>
            {rows.map((o) => (
              <Tr key={o.id}>
                <Td>
                  <input
                    type="checkbox"
                    checked={selected.has(o.id)}
                    onChange={() => toggle(o.id)}
                    aria-label={`${o.dealers?.name ?? "주문"} 택배 양식에 포함`}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                </Td>
                <Td className="whitespace-nowrap">{o.order_date}</Td>
                <Td className="font-medium text-slate-900">{o.dealers?.name ?? "—"}</Td>
                <Td>
                  <OrderDetailModal order={o} catalog={catalog} />
                </Td>
                <Td>
                  <Badge tone={o.order_type === "demo" ? "purple" : "slate"}>
                    {dealerOrderTypeLabel[o.order_type] ?? o.order_type}
                  </Badge>
                </Td>
                <Td>
                  {currency(Number(o.total_amount))}
                  {o.confirmed_total_amount != null && (
                    <span className="ml-1 text-[10px] text-slate-400">(확정)</span>
                  )}
                </Td>
                <Td>
                  {o.manual_shipping_fee != null
                    ? currency(Number(o.auto_shipping_fee) + Number(o.manual_shipping_fee))
                    : o.auto_shipping_fee > 0
                      ? `${currency(Number(o.auto_shipping_fee))} (패들만)`
                      : "미확정"}
                </Td>
                <Td className="text-right">
                  <DealerOrderRowActions
                    orderId={o.id}
                    status={o.status}
                    synced={o.synced_to_accounting}
                    autoShippingFee={Number(o.auto_shipping_fee)}
                    manualShippingFee={o.manual_shipping_fee != null ? Number(o.manual_shipping_fee) : null}
                    suggestedTotal={
                      Number(o.total_amount) + Number(o.auto_shipping_fee) + Number(o.manual_shipping_fee ?? 0)
                    }
                  />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <p className="p-8 text-center text-sm text-slate-400">아직 들어온 딜러 주문이 없습니다.</p>
      )}
    </div>
  );
}

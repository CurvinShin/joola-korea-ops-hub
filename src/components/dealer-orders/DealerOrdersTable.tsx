"use client";

import { useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { Table, Thead, Tr, Th, Td } from "@/components/ui/Table";
import { DealerOrderRowActions } from "@/components/dealer-orders/DealerOrderRowActions";
import { OrderDetailModal } from "@/components/dealer-orders/OrderDetailModal";
import { ShippingListCopyButton } from "@/components/dealer-orders/ShippingListCopyButton";
import { mergeDealerOrdersAdmin } from "@/lib/actions/dealer-order-admin";
import { dealerOrderTypeLabel } from "@/lib/utils/labels";
import { shippingListRowsToTsv } from "@/lib/utils/shipping-list";
import type { DealerOrderAdminRow, DealerCatalogRow } from "@/lib/types/database.types";

const currency = (n: number) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n);

type SortKey = "created_desc" | "created_asc" | "dealer_name" | "amount_desc";

const SORT_LABELS: Record<SortKey, string> = {
  created_desc: "주문일순 (최신 먼저)",
  created_asc: "주문일순 (오래된 먼저)",
  dealer_name: "딜러명순",
  amount_desc: "공급가액순 (높은 금액 먼저)",
};

// 딜러 주문 목록 + 택배 양식 복사 체크박스 + 주문 합치기. 기본값은 전체 체크
// 해제 — 오늘 새로 들어온 것 등 필요한 주문만 골라 체크한 뒤 복사/합치기
// 하는 방식이다.
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
  const [sortKey, setSortKey] = useState<SortKey>("created_desc");
  const [mergeSelected, setMergeSelected] = useState<Set<string>>(new Set());
  const [mergeResult, setMergeResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [isMerging, startMergeTransition] = useTransition();

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

  // 정렬: 어떤 기준을 고르든 "경리나라 입력완료" 체크된 주문은 항상 맨
  // 아래로 보낸다 — 이미 처리 끝난 주문이 눈에 계속 걸리지 않게. 주문일은
  // order_date(date, 시각 정보 없음) 대신 created_at(실제 접수 시각)으로
  // 정렬해야 같은 날짜에 여러 건 들어와도 진짜 시간 순서대로 나열된다.
  const sortedRows = useMemo(() => {
    const indexed = rows.map((r, i) => ({ r, i }));
    indexed.sort((a, b) => {
      if (a.r.synced_to_accounting !== b.r.synced_to_accounting) {
        return a.r.synced_to_accounting ? 1 : -1;
      }
      switch (sortKey) {
        case "created_asc":
          return a.r.created_at < b.r.created_at ? -1 : a.r.created_at > b.r.created_at ? 1 : a.i - b.i;
        case "dealer_name": {
          const cmp = (a.r.dealers?.name ?? "").localeCompare(b.r.dealers?.name ?? "", "ko");
          return cmp !== 0 ? cmp : a.i - b.i;
        }
        case "amount_desc": {
          const diff = Number(b.r.total_amount) - Number(a.r.total_amount);
          return diff !== 0 ? diff : a.i - b.i;
        }
        case "created_desc":
        default:
          return a.r.created_at < b.r.created_at ? 1 : a.r.created_at > b.r.created_at ? -1 : a.i - b.i;
      }
    });
    return indexed.map(({ r }) => r);
  }, [rows, sortKey]);

  function toggleMerge(id: string) {
    setMergeResult(null);
    setMergeSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const mergeSelectedRows = rows.filter((o) => mergeSelected.has(o.id));
  const mergeDealerIds = new Set(mergeSelectedRows.map((o) => o.dealer_id));
  const mergeMixedDealers = mergeDealerIds.size > 1;
  const canMerge = mergeSelectedRows.length >= 2 && !mergeMixedDealers;

  function handleMerge() {
    if (!canMerge) return;
    if (!confirm(`선택한 ${mergeSelectedRows.length}건의 주문을 하나로 합칠까요? 되돌릴 수 없습니다.`)) return;
    setMergeResult(null);
    startMergeTransition(async () => {
      const res = await mergeDealerOrdersAdmin(Array.from(mergeSelected));
      setMergeResult({ ok: res.ok, text: res.message });
      if (res.ok) setMergeSelected(new Set());
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
        <p className="text-sm text-slate-500">
          {selected.size > 0 ? `${selected.size}건 선택됨 (택배 ${rowCount}줄)` : "택배 양식으로 복사할 주문을 체크하세요"}
        </p>
        <div className="flex items-center gap-2">
          <Select
            aria-label="정렬 기준"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="!w-auto py-1.5 text-xs"
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </Select>
          <Button type="button" variant="ghost" size="sm" onClick={selectAll}>
            전체 선택
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={selectNone}>
            전체 해제
          </Button>
          <ShippingListCopyButton tsv={tsv} rowCount={rowCount} />
        </div>
      </div>

      {mergeSelected.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-brand-50/40 px-5 py-2.5">
          <p className="text-xs text-slate-600">
            주문 합치기: {mergeSelected.size}건 선택됨
            {mergeMixedDealers && (
              <span className="ml-2 text-red-600">같은 딜러의 주문만 합칠 수 있어요.</span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setMergeSelected(new Set())}>
              선택 해제
            </Button>
            <Button type="button" size="sm" disabled={!canMerge || isMerging} onClick={handleMerge}>
              {isMerging ? "합치는 중..." : "선택한 주문 합치기"}
            </Button>
          </div>
        </div>
      )}
      {mergeResult && (
        <p className={`px-5 pt-2 text-xs ${mergeResult.ok ? "text-emerald-600" : "text-red-600"}`}>
          {mergeResult.text}
        </p>
      )}

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
              <Th title="입금 확인 전(임시) 주문끼리만, 같은 딜러끼리만 합칠 수 있어요">합치기</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <tbody>
            {sortedRows.map((o) => (
              <Tr key={o.id} className={o.synced_to_accounting ? "opacity-60" : undefined}>
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
                <Td>
                  {o.status === "draft" ? (
                    <input
                      type="checkbox"
                      checked={mergeSelected.has(o.id)}
                      onChange={() => toggleMerge(o.id)}
                      aria-label={`${o.dealers?.name ?? "주문"} 합치기에 포함`}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  ) : (
                    <span className="text-xs text-slate-300">—</span>
                  )}
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

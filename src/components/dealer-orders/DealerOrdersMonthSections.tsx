"use client";

import { useState } from "react";
import { DealerOrdersTable } from "@/components/dealer-orders/DealerOrdersTable";
import type { DealerOrderAdminRow, DealerCatalogRow } from "@/lib/types/database.types";

const currency = (n: number) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n);

export interface DealerOrderMonthGroup {
  key: string; // "2026-10"
  label: string; // "2026년 10월"
  rows: (DealerOrderAdminRow & { order_date: string })[];
}

// 여러 달이 한 화면에 섞여 있을 때(주로 "전체" 보기) 달마다 접고 펼 수 있게
// 묶어서 보여준다. 체크박스/택배양식/합치기 같은 선택 상태는
// DealerOrdersTable이 섹션(달)마다 따로 들고 있어서 다른 달과 섞이지
// 않는다 — 어차피 "합치기"는 같은 딜러 주문끼리만 되고, 보통 같은 달
// 안에서 들어온 주문들이라 자연스러운 경계다.
export function DealerOrdersMonthSections({
  groups,
  shippingRowsByOrder,
  catalog,
  defaultOpenKey,
}: {
  groups: DealerOrderMonthGroup[];
  shippingRowsByOrder: Record<string, string[][]>;
  catalog: DealerCatalogRow[];
  defaultOpenKey: string;
}) {
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set([defaultOpenKey]));

  function toggle(key: string) {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  if (groups.length === 0) {
    return <p className="p-8 text-center text-sm text-slate-400">아직 들어온 딜러 주문이 없습니다.</p>;
  }

  return (
    <div className="divide-y divide-slate-100">
      {groups.map((g) => {
        const open = openKeys.has(g.key);
        const revenueSum = g.rows.reduce((sum, o) => sum + Number(o.total_amount), 0);
        const groupShippingRows = Object.fromEntries(
          g.rows.map((o) => [o.id, shippingRowsByOrder[o.id] ?? []])
        );
        return (
          <div key={g.key}>
            <button
              type="button"
              onClick={() => toggle(g.key)}
              className="flex w-full items-center justify-between gap-2 px-5 py-3 text-left hover:bg-slate-50"
              aria-expanded={open}
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <span className={`inline-block text-slate-400 transition-transform ${open ? "rotate-90" : ""}`}>
                  ▶
                </span>
                {g.label}
              </span>
              <span className="text-xs text-slate-500">
                {g.rows.length}건 · 공급가액 합계 {currency(revenueSum)}
              </span>
            </button>
            {open && <DealerOrdersTable rows={g.rows} shippingRowsByOrder={groupShippingRows} catalog={catalog} />}
          </div>
        );
      })}
    </div>
  );
}

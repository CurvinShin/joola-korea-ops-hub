"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { DealerCategorySection } from "@/components/sales/DealerCategorySection";
import { SmartstoreCategorySection } from "@/components/sales/SmartstoreCategorySection";
import type { ProductCategoryReport, SmartstoreCategoryReport } from "@/lib/reports/productCategoryReport";

type Tab = "dealer" | "smartstore" | "all";

const TABS: { key: Tab; label: string }[] = [
  { key: "dealer", label: "딜러 구매" },
  { key: "smartstore", label: "스마트스토어" },
  { key: "all", label: "전체" },
];

// 딜러(금액 기준)와 스마트스토어(수량 기준) 데이터가 서로 다른 소스라 한 화면에
// 다 뿌려두면 헷갈리기 쉬워서 탭으로 나눴다. "전체" 탭은 예전처럼 둘 다 이어서
// 보여준다. 데이터는 이미 서버에서 다 가져와 있고(report/smartstoreReport),
// 탭 전환은 그 중 어떤 걸 보여줄지만 클라이언트에서 고르는 것 — 탭을 눌러도
// 다시 서버에 요청하지 않는다.
export function ProductCategoryReportView({
  report,
  smartstoreReport,
}: {
  report: ProductCategoryReport;
  smartstoreReport?: SmartstoreCategoryReport;
}) {
  const [tab, setTab] = useState<Tab>("all");

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium",
              tab === t.key
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "dealer" && <DealerCategorySection report={report} />}

      {tab === "smartstore" &&
        (smartstoreReport ? (
          <SmartstoreCategorySection smartstoreReport={smartstoreReport} />
        ) : (
          <p className="py-10 text-center text-sm text-slate-500">스마트스토어 데이터를 불러올 수 없습니다.</p>
        ))}

      {tab === "all" && (
        <div className="space-y-10">
          <DealerCategorySection report={report} />
          {smartstoreReport && (
            <div className="space-y-6 border-t border-slate-200 pt-8">
              <h2 className="text-lg font-semibold text-slate-900">스마트스토어 판매 현황 (수량 기준)</h2>
              <SmartstoreCategorySection smartstoreReport={smartstoreReport} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

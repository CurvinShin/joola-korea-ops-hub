"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Table, Thead, Tr, Th, Td } from "@/components/ui/Table";
import { cn } from "@/lib/utils/cn";
import { CATEGORY_ORDER } from "@/lib/utils/categoryOrder";
import type { CatalogGap, InventoryStatusRow } from "@/lib/types/database.types";
import type { deleteProduct as deleteProductAction } from "@/lib/actions/inventory";
import type { dismissCatalogGap as dismissCatalogGapAction } from "@/lib/actions/catalog-gaps";

// 상태 탭 — 주소의 ?status= 값과 1:1로 대응한다(새로고침·링크 공유 시에도 유지).
export type InventoryStatus = "all" | "backorder" | "low" | "incoming" | "discontinued" | "gaps";

export const INVENTORY_STATUSES: InventoryStatus[] = ["all", "backorder", "low", "incoming", "discontinued", "gaps"];

const STATUS_LABEL: Record<InventoryStatus, string> = {
  all: "전체",
  backorder: "백오더",
  low: "재고 부족",
  incoming: "입고 예정",
  discontinued: "단종",
  gaps: "카탈로그 미매칭",
};

const STATUS_HINT: Partial<Record<InventoryStatus, string>> = {
  backorder:
    "재고가 마이너스인 품목입니다 (가장 많이 모자란 순). 딜러 주문 입금 확인 시 재고가 부족해도 차감돼 내려간 것이니, 이지어드민에서 자동 발주가 걸리지 않았다면 직접 발주해주세요.",
  low: "재고가 부족 기준 이하로 내려간 품목입니다 (단종·백오더 제외, 적은 순).",
  incoming: "입고 예정 수량이 있는 품목입니다 (입고 예정일 빠른 순).",
  discontinued: "단종 처리된 품목입니다.",
  gaps: "실사 재고에는 있지만 가격/유형 정보가 없어 아직 제품으로 등록하지 못한 품목입니다. “제품으로 등록”을 누르면 상품코드·제품명·수량이 채워진 입력 창이 열립니다.",
};

function statusHref(status: InventoryStatus, extra?: string) {
  const params: string[] = [];
  if (status !== "all") params.push(`status=${status}`);
  if (extra) params.push(extra);
  return params.length ? `/inventory?${params.join("&")}` : "/inventory";
}

function matchesStatus(r: InventoryStatusRow, status: InventoryStatus) {
  switch (status) {
    case "backorder":
      return r.current_stock < 0;
    case "low":
      return !r.discontinued && r.current_stock >= 0 && r.is_low_stock;
    case "incoming":
      return r.incoming_qty > 0;
    case "discontinued":
      return !!r.discontinued;
    default:
      return true;
  }
}

export function InventoryBrowser({
  rows,
  gaps,
  status,
  deleteProduct,
  dismissGap,
}: {
  rows: InventoryStatusRow[];
  gaps: CatalogGap[];
  status: InventoryStatus;
  deleteProduct: typeof deleteProductAction;
  dismissGap: typeof dismissCatalogGapAction;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [subcategory, setSubcategory] = useState<string | null>(null);

  // 탭이 바뀌면 이전 탭에서 고른 카테고리가 새 탭에 없을 수 있어 초기화한다.
  useEffect(() => {
    setCategory(null);
    setSubcategory(null);
  }, [status]);

  const counts = useMemo(() => {
    const c: Record<InventoryStatus, number> = {
      all: rows.length,
      backorder: 0,
      low: 0,
      incoming: 0,
      discontinued: 0,
      gaps: gaps.length,
    };
    for (const r of rows) {
      if (matchesStatus(r, "backorder")) c.backorder++;
      if (matchesStatus(r, "low")) c.low++;
      if (matchesStatus(r, "incoming")) c.incoming++;
      if (matchesStatus(r, "discontinued")) c.discontinued++;
    }
    return c;
  }, [rows, gaps]);

  // 상태 탭으로 먼저 좁힌 목록 위에서 카테고리·검색이 동작한다.
  const statusRows = useMemo(() => {
    const list = rows.filter((r) => matchesStatus(r, status));
    if (status === "backorder") return [...list].sort((a, b) => a.current_stock - b.current_stock);
    if (status === "low") return [...list].sort((a, b) => a.available_stock - b.available_stock);
    if (status === "incoming")
      return [...list].sort((a, b) => (a.eta ?? "9999-12-31").localeCompare(b.eta ?? "9999-12-31"));
    return list;
  }, [rows, status]);

  const categories = useMemo(() => {
    const present = new Set(statusRows.map((r) => r.category).filter((c): c is string => !!c));
    const ordered = CATEGORY_ORDER.filter((c) => present.has(c));
    const extra = [...present].filter((c) => !CATEGORY_ORDER.includes(c)).sort();
    return [...ordered, ...extra];
  }, [statusRows]);

  // 선택된 카테고리 안에서만 의미가 있는 서브카테고리 목록 (예: 패들 → Champion/Edge/Pro)
  const subcategories = useMemo(() => {
    if (!category) return [];
    const present = new Set(
      statusRows
        .filter((r) => r.category === category)
        .map((r) => r.subcategory)
        .filter((s): s is string => !!s)
    );
    return [...present].sort();
  }, [statusRows, category]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return statusRows.filter((r) => {
      if (category && r.category !== category) return false;
      if (subcategory && r.subcategory !== subcategory) return false;
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q);
    });
  }, [statusRows, query, category, subcategory]);

  const filteredGaps = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return gaps;
    return gaps.filter((g) => g.source_name.toLowerCase().includes(q) || (g.source_sku ?? "").toLowerCase().includes(q));
  }, [gaps, query]);

  const isGaps = status === "gaps";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-3">
        {INVENTORY_STATUSES.map((key) => {
          const active = status === key;
          const urgent = (key === "backorder" || key === "gaps") && counts[key] > 0;
          return (
            <Link
              key={key}
              href={statusHref(key)}
              scroll={false}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? key === "backorder"
                    ? "bg-red-600 text-white"
                    : key === "gaps"
                      ? "bg-amber-500 text-white"
                      : "bg-slate-800 text-white"
                  : urgent
                    ? key === "backorder"
                      ? "bg-red-50 text-red-700 hover:bg-red-100"
                      : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                    : "bg-slate-50 text-slate-500 hover:bg-slate-100"
              )}
            >
              {STATUS_LABEL[key]} {counts[key]}
            </Link>
          );
        })}
      </div>

      {STATUS_HINT[status] && <p className="text-xs text-slate-500">{STATUS_HINT[status]}</p>}

      {!isGaps && (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setCategory(null);
            setSubcategory(null);
          }}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
            category === null ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          전체 ({statusRows.length})
        </button>
        {categories.map((c) => {
          const count = statusRows.filter((r) => r.category === c).length;
          return (
            <button
              key={c}
              type="button"
              onClick={() => {
                setCategory(c);
                setSubcategory(null);
              }}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                category === c ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {c} ({count})
            </button>
          );
        })}
      </div>
      )}

      {!isGaps && category && subcategories.length > 0 && (
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
            const count = statusRows.filter((r) => r.category === category && r.subcategory === s).length;
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

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="이름 또는 상품코드로 검색... (입력하는 대로 바로 검색됩니다)"
        className="max-w-xs"
      />

      {isGaps ? (
        filteredGaps.length > 0 ? (
          <Table>
            <Thead>
              <Tr>
                <Th>브랜드 상품번호</Th>
                <Th>상품명 (원본)</Th>
                <Th>실사 수량</Th>
                <Th>내부관리코드</Th>
                <Th>비고</Th>
                <Th></Th>
              </Tr>
            </Thead>
            <tbody>
              {filteredGaps.map((g) => {
                const brandSku = g.source_name.replace(/^율라코리아/, "").trim().match(/^(\d{3,})/)?.[1] ?? null;
                return (
                  <Tr key={g.id}>
                    <Td className="font-mono text-xs">{brandSku ?? "—"}</Td>
                    <Td>{g.source_name}</Td>
                    <Td>{g.qty}</Td>
                    <Td className="font-mono text-xs text-slate-500">{g.source_sku ?? "—"}</Td>
                    <Td className="text-slate-500">{g.note ?? "—"}</Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-3">
                        <Link
                          href={statusHref("gaps", `register=${g.id}`)}
                          scroll={false}
                          className="text-brand-600 hover:underline"
                        >
                          제품으로 등록
                        </Link>
                        <form action={dismissGap.bind(null, g.id)}>
                          <button className="text-red-600 hover:underline">확인 완료 (삭제)</button>
                        </form>
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <p className="p-8 text-center text-sm text-slate-400">
            {gaps.length === 0 ? "미매칭 품목이 없습니다." : "검색 결과가 없습니다."}
          </p>
        )
      ) : filtered.length > 0 ? (
        <Table>
          <Thead>
            <Tr>
              <Th>사진</Th>
              <Th>상품코드</Th>
              <Th>제품</Th>
              <Th>카테고리</Th>
              <Th>{status === "backorder" ? "현재고 (부족)" : "가용 재고"}</Th>
              <Th>입고 예정</Th>
              <Th>상태</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <tbody>
            {filtered.map((r) => (
              <Tr key={r.product_id}>
                <Td>
                  {r.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.image_url} alt={r.name} loading="lazy" className="h-10 w-10 rounded object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-100 text-[10px] text-slate-400">
                      없음
                    </div>
                  )}
                </Td>
                <Td className="font-mono text-xs">{r.sku}</Td>
                <Td>{r.name}</Td>
                <Td>
                  {r.category ?? "—"}
                  {r.subcategory && <span className="text-slate-400"> · {r.subcategory}</span>}
                </Td>
                <Td>
                  {status === "backorder" ? (
                    <span className="font-semibold text-red-600">
                      {r.current_stock}
                      <span className="ml-1 text-xs font-normal">(부족 {-r.current_stock}개)</span>
                    </span>
                  ) : (
                    <span className={r.available_stock < 0 ? "font-semibold text-red-600" : undefined}>
                      {r.available_stock}
                    </span>
                  )}
                </Td>
                <Td>{r.incoming_qty > 0 ? `${r.incoming_qty}개 (입고예정일 ${r.eta ?? "—"})` : "—"}</Td>
                <Td>
                  {r.discontinued ? (
                    <Badge tone="slate">단종</Badge>
                  ) : r.current_stock < 0 ? (
                    <Badge tone="red">백오더</Badge>
                  ) : r.is_low_stock ? (
                    <Badge tone="amber">재고 부족</Badge>
                  ) : (
                    <Badge tone="green">재고 있음</Badge>
                  )}
                </Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-3">
                    <Link href={statusHref(status, `edit=${r.product_id}`)} className="text-brand-600 hover:underline">
                      수정
                    </Link>
                    <form action={deleteProduct.bind(null, r.product_id)}>
                      <button className="text-red-600 hover:underline">삭제</button>
                    </form>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <p className="p-8 text-center text-sm text-slate-400">검색 결과가 없습니다.</p>
      )}
    </div>
  );
}

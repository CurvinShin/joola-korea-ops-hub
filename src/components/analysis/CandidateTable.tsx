"use client";

import { useState } from "react";
import type { PriorityRow } from "@/lib/analysis/listing-priority";
import { Table, Thead, Tr, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { ConfirmButton } from "@/components/ui/ConfirmButton";

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

// 입점 후보 표. 관리자는 체크박스로 여러 제품군을 골라 한 번에 "등록됨"으로 표시할 수 있다.
export function CandidateTable({
  candidates,
  isAdmin,
  markAction,
}: {
  candidates: PriorityRow[];
  isAdmin: boolean;
  markAction: (formData: FormData) => Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = candidates.length > 0 && selected.size === candidates.length;

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <form action={markAction}>
      {isAdmin && (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <ConfirmButton
            size="sm"
            variant="secondary"
            disabled={selected.size === 0}
            message={`선택한 ${selected.size}개 제품군을 스마트스토어에 이미 등록된 제품으로 표시할까요?\n다음 분석부터 후보에서 빠집니다(아래 목록에서 되돌릴 수 있습니다).`}
          >
            선택한 {selected.size}개 등록됨으로 표시
          </ConfirmButton>
          <span className="text-xs text-slate-500">표시한 제품군은 후보에서 빠지고, 아래 &ldquo;이미 등록된 제품군&rdquo;에서 되돌릴 수 있습니다.</span>
        </div>
      )}
      <div className="overflow-x-auto">
        <Table>
          <Thead>
            <Tr>
              {isAdmin && (
                <Th>
                  <input
                    type="checkbox"
                    aria-label="전체 선택"
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(candidates.map((c) => c.key)))}
                  />
                </Th>
              )}
              <Th>순위</Th>
              <Th>제품군</Th>
              <Th>분류</Th>
              <Th>점수</Th>
              <Th>구매 딜러</Th>
              <Th>주문</Th>
              <Th>총 수량</Th>
              <Th>최근 10주 수량</Th>
              <Th>딜러 공급가(중앙값)</Th>
              <Th>변동</Th>
            </Tr>
          </Thead>
          <tbody>
            {candidates.map((c) => (
              <Tr key={c.key}>
                {isAdmin && (
                  <Td>
                    <input
                      type="checkbox"
                      name="family_key"
                      value={c.key}
                      aria-label={`${c.label} 선택`}
                      checked={selected.has(c.key)}
                      onChange={() => toggle(c.key)}
                    />
                    <input type="hidden" name={`label:${c.key}`} value={c.label} />
                  </Td>
                )}
                <Td>{c.rank}</Td>
                <Td>
                  <div className="font-medium text-slate-900">{c.label}</div>
                  <div className="max-w-xs truncate text-xs text-slate-500" title={c.sampleNames.join(" / ")}>
                    {c.sampleNames[0]}
                  </div>
                </Td>
                <Td>{c.category}</Td>
                <Td>{c.score.toFixed(1)}</Td>
                <Td>{c.dealers}곳</Td>
                <Td>{c.orders}건</Td>
                <Td>{c.quantity.toLocaleString("ko-KR")}</Td>
                <Td>{c.recentQuantity.toLocaleString("ko-KR")}</Td>
                <Td>{c.medianUnitPrice > 0 ? won(c.medianUnitPrice) : "-"}</Td>
                <Td>
                  {c.rankChange === undefined ? (
                    "-"
                  ) : c.rankChange === null ? (
                    <Badge tone="purple">신규</Badge>
                  ) : c.rankChange > 0 ? (
                    <span className="text-emerald-700">▲{c.rankChange}</span>
                  ) : c.rankChange < 0 ? (
                    <span className="text-red-600">▼{-c.rankChange}</span>
                  ) : (
                    "–"
                  )}
                </Td>
              </Tr>
            ))}
            {candidates.length === 0 && (
              <Tr>
                <Td colSpan={isAdmin ? 11 : 10}>후보가 없습니다.</Td>
              </Tr>
            )}
          </tbody>
        </Table>
      </div>
    </form>
  );
}

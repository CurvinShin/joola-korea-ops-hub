"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Table, Thead, Tr, Th, Td } from "@/components/ui/Table";
import type { InventoryStatusRow } from "@/lib/types/database.types";
import type { deleteProduct as deleteProductAction } from "@/lib/actions/inventory";

export function InventoryBrowser({
  rows,
  deleteProduct,
}: {
  rows: InventoryStatusRow[];
  deleteProduct: typeof deleteProductAction;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <div className="space-y-4">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="이름 또는 상품코드로 검색... (입력하는 대로 바로 검색됩니다)"
        className="max-w-xs"
      />

      {filtered.length > 0 ? (
        <Table>
          <Thead>
            <Tr>
              <Th>사진</Th>
              <Th>상품코드</Th>
              <Th>제품</Th>
              <Th>카테고리</Th>
              <Th>가용 재고</Th>
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
                    <img src={r.image_url} alt={r.name} className="h-10 w-10 rounded object-cover" />
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
                <Td>{r.available_stock}</Td>
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
                    <Link href={`/inventory?edit=${r.product_id}`} className="text-brand-600 hover:underline">
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

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { dismissCatalogGap } from "@/lib/actions/catalog-gaps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, Thead, Tr, Th, Td } from "@/components/ui/Table";

export const dynamic = "force-dynamic";

export default async function UnmatchedStockPage() {
  const supabase = createClient();
  const { data: rows, error } = await supabase
    .from("catalog_gaps")
    .select("*")
    .order("qty", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/inventory" className="text-sm text-brand-600 hover:underline">
          ← 재고로 돌아가기
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">카탈로그 미매칭 재고</h1>
        <p className="text-sm text-slate-500">
          실사 재고에는 있지만 가격표(카탈로그)에 브랜드 상품번호가 매칭되지 않아 아직 제품으로 등록하지 못한
          품목입니다. 가격/유형을 확인해 &ldquo;재고&rdquo; 페이지에서 제품으로 추가한 뒤, 이 목록에서
          지워주세요.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{rows?.length ?? 0}건</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && <p className="p-5 text-sm text-red-600">{error.message}</p>}
          {rows && rows.length > 0 ? (
            <Table>
              <Thead>
                <Tr>
                  <Th>실사 상품코드</Th>
                  <Th>상품명 (원본)</Th>
                  <Th>실사 수량</Th>
                  <Th>비고</Th>
                  <Th></Th>
                </Tr>
              </Thead>
              <tbody>
                {rows.map((r) => (
                  <Tr key={r.id}>
                    <Td className="font-mono text-xs">{r.source_sku ?? "—"}</Td>
                    <Td>{r.source_name}</Td>
                    <Td>{r.qty}</Td>
                    <Td className="text-slate-500">{r.note ?? "—"}</Td>
                    <Td className="text-right">
                      <form action={dismissCatalogGap.bind(null, r.id)}>
                        <button className="text-red-600 hover:underline">확인 완료 (삭제)</button>
                      </form>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="p-8 text-center text-sm text-slate-400">미매칭 품목이 없습니다.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

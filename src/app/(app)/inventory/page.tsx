import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createProduct, updateProduct, deleteProduct } from "@/lib/actions/inventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Table, Thead, Tr, Th, Td } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { ProductForm } from "@/components/inventory/ProductForm";

export const dynamic = "force-dynamic";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: { q?: string; new?: string; edit?: string };
}) {
  const supabase = createClient();
  let query = supabase.from("inventory_status").select("*").order("name");
  if (searchParams.q) {
    query = query.or(`name.ilike.%${searchParams.q}%,sku.ilike.%${searchParams.q}%`);
  }
  const { data: rows, error } = await query;

  const editRow = searchParams.edit ? rows?.find((r) => r.product_id === searchParams.edit) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">재고</h1>
          <p className="text-sm text-slate-500">재고 수량, 입고 예정, 재고 부족 알림입니다.</p>
        </div>
        <Link href="/inventory?new=1">
          <Button>제품 추가</Button>
        </Link>
      </div>

      <form className="flex gap-3">
        <Input name="q" placeholder="이름 또는 SKU로 검색..." defaultValue={searchParams.q} className="max-w-xs" />
        <Button type="submit" variant="secondary">
          검색
        </Button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>제품 {rows?.length ?? 0}개</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && <p className="p-5 text-sm text-red-600">{error.message}</p>}
          {rows && rows.length > 0 ? (
            <Table>
              <Thead>
                <Tr>
                  <Th>SKU</Th>
                  <Th>제품</Th>
                  <Th>카테고리</Th>
                  <Th>가용 재고</Th>
                  <Th>입고 예정</Th>
                  <Th>상태</Th>
                  <Th></Th>
                </Tr>
              </Thead>
              <tbody>
                {rows.map((r) => (
                  <Tr key={r.product_id}>
                    <Td className="font-mono text-xs">{r.sku}</Td>
                    <Td>{r.name}</Td>
                    <Td>{r.category ?? "—"}</Td>
                    <Td>{r.available_stock}</Td>
                    <Td>{r.incoming_qty > 0 ? `${r.incoming_qty}개 (입고예정일 ${r.eta ?? "—"})` : "—"}</Td>
                    <Td>
                      {r.discontinued ? (
                        <Badge tone="slate">단종</Badge>
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
            <p className="p-8 text-center text-sm text-slate-400">등록된 제품이 없습니다.</p>
          )}
        </CardContent>
      </Card>

      {searchParams.new && (
        <Modal title="제품 추가" closeHref="/inventory">
          <ProductForm action={createProduct} />
        </Modal>
      )}

      {editRow && (
        <Modal title={`${editRow.name} 수정`} closeHref="/inventory">
          <ProductForm action={updateProduct.bind(null, editRow.product_id)} defaultValues={editRow} />
        </Modal>
      )}
    </div>
  );
}

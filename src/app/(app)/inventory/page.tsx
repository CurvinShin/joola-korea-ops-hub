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
          <h1 className="text-xl font-semibold text-slate-900">Inventory</h1>
          <p className="text-sm text-slate-500">Stock levels, incoming shipments, and low-stock alerts.</p>
        </div>
        <Link href="/inventory?new=1">
          <Button>Add product</Button>
        </Link>
      </div>

      <form className="flex gap-3">
        <Input name="q" placeholder="Search by name or SKU..." defaultValue={searchParams.q} className="max-w-xs" />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>{rows?.length ?? 0} products</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && <p className="p-5 text-sm text-red-600">{error.message}</p>}
          {rows && rows.length > 0 ? (
            <Table>
              <Thead>
                <Tr>
                  <Th>SKU</Th>
                  <Th>Product</Th>
                  <Th>Category</Th>
                  <Th>Available</Th>
                  <Th>Incoming</Th>
                  <Th>Status</Th>
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
                    <Td>{r.incoming_qty > 0 ? `${r.incoming_qty} (ETA ${r.eta ?? "—"})` : "—"}</Td>
                    <Td>
                      {r.discontinued ? (
                        <Badge tone="slate">Discontinued</Badge>
                      ) : r.is_low_stock ? (
                        <Badge tone="amber">Low stock</Badge>
                      ) : (
                        <Badge tone="green">In stock</Badge>
                      )}
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-3">
                        <Link href={`/inventory?edit=${r.product_id}`} className="text-brand-600 hover:underline">
                          Edit
                        </Link>
                        <form action={deleteProduct.bind(null, r.product_id)}>
                          <button className="text-red-600 hover:underline">Delete</button>
                        </form>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="p-8 text-center text-sm text-slate-400">No products yet.</p>
          )}
        </CardContent>
      </Card>

      {searchParams.new && (
        <Modal title="Add product" closeHref="/inventory">
          <ProductForm action={createProduct} />
        </Modal>
      )}

      {editRow && (
        <Modal title={`Edit ${editRow.name}`} closeHref="/inventory">
          <ProductForm action={updateProduct.bind(null, editRow.product_id)} defaultValues={editRow} />
        </Modal>
      )}
    </div>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder } from "@/lib/actions/purchase-orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, Thead, Tr, Th, Td } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { PurchaseOrderForm } from "@/components/purchase-orders/PurchaseOrderForm";
import { shippingStatusLabel, customsStatusLabel } from "@/lib/utils/labels";

export const dynamic = "force-dynamic";

const currency = (n: number) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n);

const shippingTone: Record<string, "slate" | "blue" | "amber" | "green"> = {
  not_shipped: "slate",
  in_transit: "blue",
  arrived_port: "amber",
  cleared_customs: "amber",
  delivered: "green",
};

const customsTone: Record<string, "slate" | "blue" | "amber" | "green"> = {
  not_started: "slate",
  in_progress: "blue",
  cleared: "green",
  held: "amber",
};

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: { new?: string; edit?: string };
}) {
  const supabase = createClient();
  const { data: orders, error } = await supabase
    .from("purchase_orders")
    .select("*")
    .order("order_date", { ascending: false });

  const editRow = searchParams.edit ? orders?.find((o) => o.id === searchParams.edit) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">발주 / 수입관리</h1>
          <p className="text-sm text-slate-500">공급업체 발주서, 배송·통관 현황 및 입고 수량입니다.</p>
        </div>
        <Link href="/purchase-orders?new=1">
          <Button>발주 추가</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>발주 {orders?.length ?? 0}건</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && <p className="p-5 text-sm text-red-600">{error.message}</p>}
          {orders && orders.length > 0 ? (
            <Table>
              <Thead>
                <Tr>
                  <Th>발주번호</Th>
                  <Th>공급업체</Th>
                  <Th>발주일</Th>
                  <Th>입고 예정일</Th>
                  <Th>배송 상태</Th>
                  <Th>통관 상태</Th>
                  <Th>입고 완료</Th>
                  <Th>총 비용</Th>
                  <Th></Th>
                </Tr>
              </Thead>
              <tbody>
                {orders.map((o) => (
                  <Tr key={o.id}>
                    <Td className="font-mono text-xs">{o.po_number}</Td>
                    <Td>{o.supplier}</Td>
                    <Td>{o.order_date}</Td>
                    <Td>{o.eta ?? "—"}</Td>
                    <Td>
                      <Badge tone={shippingTone[o.shipping_status] ?? "slate"}>
                        {shippingStatusLabel[o.shipping_status] ?? o.shipping_status}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge tone={customsTone[o.customs_status] ?? "slate"}>
                        {customsStatusLabel[o.customs_status] ?? o.customs_status}
                      </Badge>
                    </Td>
                    <Td>{o.received ? <Badge tone="green">완료</Badge> : <Badge tone="slate">미완료</Badge>}</Td>
                    <Td>{currency(Number(o.total_cost ?? 0))}</Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-3">
                        <Link href={`/purchase-orders?edit=${o.id}`} className="text-brand-600 hover:underline">
                          수정
                        </Link>
                        <form action={deletePurchaseOrder.bind(null, o.id)}>
                          <button className="text-red-600 hover:underline">삭제</button>
                        </form>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="p-8 text-center text-sm text-slate-400">등록된 발주가 없습니다.</p>
          )}
        </CardContent>
      </Card>

      {searchParams.new && (
        <Modal title="발주 추가" closeHref="/purchase-orders">
          <PurchaseOrderForm action={createPurchaseOrder} />
        </Modal>
      )}

      {editRow && (
        <Modal title={`${editRow.po_number} 수정`} closeHref="/purchase-orders">
          <PurchaseOrderForm action={updatePurchaseOrder.bind(null, editRow.id)} defaultValues={editRow} />
        </Modal>
      )}
    </div>
  );
}

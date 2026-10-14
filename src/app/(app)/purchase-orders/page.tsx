import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  setPurchaseOrderClosed,
} from "@/lib/actions/purchase-orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Table, Thead, Tr, Th, Td } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { PurchaseOrderForm } from "@/components/purchase-orders/PurchaseOrderForm";
import { OverseasSyncPanel } from "@/components/purchase-orders/OverseasSyncPanel";
import { shippingStatusLabel } from "@/lib/utils/labels";

export const dynamic = "force-dynamic";

const shippingTone: Record<string, "slate" | "blue" | "amber" | "green"> = {
  not_shipped: "slate",
  in_transit: "blue",
  arrived_port: "amber",
  cleared_customs: "amber",
  delivered: "green",
};

const nf = new Intl.NumberFormat("ko-KR");

interface PoRow {
  id: string;
  po_number: string;
  supplier: string;
  order_date: string;
  eta: string | null;
  shipping_status: string;
  closed: boolean;
  synced_state: string | null;
  po_kind: string | null;
  notes: string | null;
  item_count: number | null;
  total_qty: number | null;
  [key: string]: unknown;
}

interface ShipmentRow {
  id: string;
  po_id: string;
  ship_date: string | null;
  tracking_no: string | null;
  carrier: string | null;
  doc_name: string | null;
}

interface ItemRow {
  id: string;
  po_id: string;
  line_no: number;
  sku: string;
  item_name: string | null;
  qty: number;
}

/** PostgREST or() 필터 문법을 깨뜨리는 문자를 제거한다. */
function safeTerm(q: string) {
  return q.replace(/[,()%*\\]/g, " ").trim();
}

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: { new?: string; edit?: string; view?: string; q?: string };
}) {
  const supabase = createClient();
  const q = safeTerm(searchParams.q ?? "");

  const [{ data: ordersRaw, error }, { data: shipmentsRaw }] = await Promise.all([
    supabase.from("purchase_orders").select("*").order("order_date", { ascending: false }).order("po_number", { ascending: false }),
    supabase.from("overseas_po_shipments").select("*").order("ship_date", { ascending: true }),
  ]);
  const orders = (ordersRaw ?? []) as PoRow[];
  const shipments = (shipmentsRaw ?? []) as ShipmentRow[];

  const shipmentsByPo = new Map<string, ShipmentRow[]>();
  for (const s of shipments) {
    const list = shipmentsByPo.get(s.po_id) ?? [];
    list.push(s);
    shipmentsByPo.set(s.po_id, list);
  }

  // 검색: SKU·품목명에 검색어가 들어 있는 발주만 보여주고, 어떤 품목이 걸렸는지 같이 보여준다.
  const matchedLines = new Map<string, ItemRow[]>();
  let visible = orders;
  if (q) {
    const { data: hit } = await supabase
      .from("overseas_po_items")
      .select("*")
      .or(`sku.ilike.%${q}%,item_name.ilike.%${q}%`)
      .order("line_no", { ascending: true })
      .limit(500);
    for (const it of (hit ?? []) as ItemRow[]) {
      const list = matchedLines.get(it.po_id) ?? [];
      list.push(it);
      matchedLines.set(it.po_id, list);
    }
    const ql = q.toLowerCase();
    visible = orders.filter(
      (o) =>
        matchedLines.has(o.id) ||
        o.po_number.toLowerCase().includes(ql) ||
        (o.notes ?? "").toLowerCase().includes(ql)
    );
  }

  const editRow = searchParams.edit ? orders.find((o) => o.id === searchParams.edit) : undefined;
  const viewRow = searchParams.view ? orders.find((o) => o.id === searchParams.view) : undefined;

  let viewItems: ItemRow[] = [];
  if (viewRow) {
    const { data } = await supabase
      .from("overseas_po_items")
      .select("*")
      .eq("po_id", viewRow.id)
      .order("line_no", { ascending: true })
      .limit(2000);
    viewItems = (data ?? []) as ItemRow[];
  }

  const keep = q ? `&q=${encodeURIComponent(q)}` : "";
  const closeHref = q ? `/purchase-orders?q=${encodeURIComponent(q)}` : "/purchase-orders";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">해외 발주 / 수입관리</h1>
          <p className="text-sm text-slate-500">
            해외 공급업체 발주서의 품목·수량, 선적일과 운송장입니다. 엑셀을 열지 않고 여기서 확인하세요.
          </p>
        </div>
        <Link href="/purchase-orders?new=1">
          <Button>발주 추가</Button>
        </Link>
      </div>

      <OverseasSyncPanel existing={orders.map((o) => ({
          po_number: o.po_number,
          item_count: o.item_count,
          synced_state: o.synced_state,
          has_shipments: shipmentsByPo.has(o.id),
        }))} />

      <form className="flex flex-wrap items-center gap-2" action="/purchase-orders">
        <Input
          name="q"
          placeholder="SKU·품목명·발주번호 검색 (예: 601067, Kosmos)"
          defaultValue={searchParams.q ?? ""}
          className="w-80"
        />
        <Button type="submit" variant="secondary">
          검색
        </Button>
        {q && (
          <Link href="/purchase-orders" className="text-sm text-slate-500 hover:underline">
            검색 해제
          </Link>
        )}
      </form>

      <Card>
        <CardHeader>
          <CardTitle>
            발주 {visible.length}건{q ? ` (전체 ${orders.length}건 중 검색 결과)` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && <p className="p-5 text-sm text-red-600">{error.message}</p>}
          {visible.length > 0 ? (
            <Table>
              <Thead>
                <Tr>
                  <Th>발주번호</Th>
                  <Th>발주일</Th>
                  <Th>선적일 · 운송장</Th>
                  <Th>품목 / 수량</Th>
                  <Th>상태</Th>
                  <Th></Th>
                </Tr>
              </Thead>
              <tbody>
                {visible.map((o) => {
                  const ships = shipmentsByPo.get(o.id) ?? [];
                  const lines = matchedLines.get(o.id) ?? [];
                  return (
                    <Tr key={o.id}>
                      <Td>
                        <Link
                          href={`/purchase-orders?view=${o.id}${keep}`}
                          className="font-mono text-xs font-semibold text-brand-600 hover:underline"
                        >
                          {o.po_number}
                        </Link>
                        {o.notes && <div className="text-xs text-slate-500">{o.notes}</div>}
                        {lines.length > 0 && (
                          <div className="mt-1 space-y-0.5 text-xs text-slate-600">
                            {lines.slice(0, 5).map((l) => (
                              <div key={l.id}>
                                <span className="font-mono">{l.sku}</span> {l.item_name} · {nf.format(l.qty)}개
                              </div>
                            ))}
                            {lines.length > 5 && <div className="text-slate-400">…외 {lines.length - 5}건</div>}
                          </div>
                        )}
                      </Td>
                      <Td>{o.order_date}</Td>
                      <Td>
                        {ships.length > 0 ? (
                          <div className="space-y-0.5 text-xs">
                            {ships.map((s) => (
                              <div key={s.id}>
                                <span className="text-slate-700">{s.ship_date ?? "선적일 미상"}</span>
                                {s.tracking_no && (
                                  <span className="ml-2 font-mono text-slate-500">
                                    {s.carrier ? `${s.carrier} ` : ""}
                                    {s.tracking_no}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </Td>
                      <Td>
                        {o.item_count ? (
                          <span className="text-sm">
                            {nf.format(o.item_count)}종 · {nf.format(o.total_qty ?? 0)}개
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </Td>
                      <Td>
                        <div className="flex flex-wrap items-center gap-1">
                          {o.po_kind === "SAMPLE" && <Badge tone="purple">샘플</Badge>}
                          <Badge tone={shippingTone[o.shipping_status] ?? "slate"}>
                            {shippingStatusLabel[o.shipping_status] ?? o.shipping_status}
                          </Badge>
                          {o.closed ? <Badge tone="green">종료</Badge> : <Badge tone="amber">진행 중</Badge>}
                        </div>
                      </Td>
                      <Td className="text-right">
                        <div className="flex flex-wrap items-center justify-end gap-3 text-sm">
                          <Link href={`/purchase-orders?view=${o.id}${keep}`} className="text-brand-600 hover:underline">
                            내용 보기
                          </Link>
                          <Link href={`/purchase-orders?edit=${o.id}`} className="text-brand-600 hover:underline">
                            수정
                          </Link>
                          <form action={setPurchaseOrderClosed.bind(null, o.id, !o.closed)}>
                            <button className="text-slate-600 hover:underline">
                              {o.closed ? "종료 취소" : "종료 처리"}
                            </button>
                          </form>
                          <form action={deletePurchaseOrder.bind(null, o.id)}>
                            <ConfirmButton
                              variant="ghost"
                              size="sm"
                              className="!p-0 text-red-600 hover:underline"
                              message={`${o.po_number} 발주와 품목·선적 기록을 모두 삭제할까요? 되돌릴 수 없습니다.`}
                            >
                              삭제
                            </ConfirmButton>
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
              {q ? "검색 결과가 없습니다." : "등록된 발주가 없습니다."}
            </p>
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
          <PurchaseOrderForm action={updatePurchaseOrder.bind(null, editRow.id)} defaultValues={editRow as never} />
        </Modal>
      )}

      {viewRow && (
        <Modal title={viewRow.po_number} closeHref={closeHref} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <div className="text-xs text-slate-500">발주일</div>
                {viewRow.order_date}
              </div>
              <div>
                <div className="text-xs text-slate-500">품목 / 수량</div>
                {nf.format(viewRow.item_count ?? viewItems.length)}종 · {nf.format(viewRow.total_qty ?? 0)}개
              </div>
              <div>
                <div className="text-xs text-slate-500">상태</div>
                {viewRow.closed ? "종료" : "진행 중"}
              </div>
              <div>
                <div className="text-xs text-slate-500">메모</div>
                {viewRow.notes ?? "—"}
              </div>
            </div>

            <div>
              <div className="mb-1 text-xs font-medium text-slate-500">선적 · 운송장</div>
              {(shipmentsByPo.get(viewRow.id) ?? []).length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {(shipmentsByPo.get(viewRow.id) ?? []).map((s) => (
                    <li key={s.id}>
                      {s.ship_date ?? "선적일 미상"}
                      {s.tracking_no && (
                        <span className="ml-2 font-mono text-slate-600">
                          {s.carrier ? `${s.carrier} ` : ""}
                          {s.tracking_no}
                        </span>
                      )}
                      {s.doc_name && <span className="ml-2 text-xs text-slate-400">({s.doc_name})</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400">선적 기록이 없습니다.</p>
              )}
            </div>

            <div>
              <div className="mb-1 text-xs font-medium text-slate-500">품목</div>
              {viewItems.length > 0 ? (
                <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-slate-100">
                  <Table>
                    <Thead>
                      <Tr>
                        <Th>#</Th>
                        <Th>SKU</Th>
                        <Th>품목명</Th>
                        <Th className="text-right">수량</Th>
                      </Tr>
                    </Thead>
                    <tbody>
                      {viewItems.map((it) => (
                        <Tr key={it.id}>
                          <Td className="text-xs text-slate-400">{it.line_no}</Td>
                          <Td className="font-mono text-xs">{it.sku}</Td>
                          <Td className="text-sm">{it.item_name}</Td>
                          <Td className="text-right">{nf.format(it.qty)}</Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-slate-400">저장된 품목이 없습니다.</p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { cancelImportBatch, confirmImportBatch, markImportReceived, undoImportReceived } from "@/lib/actions/import-requests";
import { addImportNeed, deleteImportNeed, setImportNeedDone } from "@/lib/actions/import-needs";
import { Input, Label } from "@/components/ui/Input";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { IMPORT_STATUS_LABEL, IMPORT_STATUS_TONE } from "@/lib/utils/import-month";

export const dynamic = "force-dynamic";

const dateKst = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });

type Row = {
  id: string;
  dealer_id: string;
  product_id: string;
  sku: string;
  product_name: string;
  quantity: number;
  note: string | null;
  status: string;
  batch_id: string | null;
  submitted_at: string | null;
  order_id: string | null;
  created_at: string;
  dealers: { name: string } | null;
  dealer_orders: { order_number: string | null } | null;
};

export default async function ImportRequestsPage({
  searchParams,
}: {
  searchParams: { batch?: string; created?: string; dealers?: string; failed?: string; error?: string; undone?: string; deleted?: string; need_added?: string; need_deleted?: string; need_updated?: string; showdone?: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user?.id ?? "").single();
  const isAdmin = me?.role === "admin";

  const { data, error } = await supabase
    .from("import_requests")
    .select(
      "id, dealer_id, product_id, sku, product_name, quantity, note, status, batch_id, submitted_at, order_id, created_at, dealers(name), dealer_orders(order_number)"
    )
    .neq("status", "cancelled")
    .order("created_at", { ascending: true })
    .limit(3000);
  const all = (data ?? []) as unknown as Row[];

  // 상시 수입 필요 목록 (직접 입력). 테이블이 아직 없으면(마이그레이션 전) 안내만 보여준다.
  type NeedRow = { id: string; sku: string; product_name: string; category: string | null; quantity: number; note: string | null; status: string; created_at: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: needData, error: needErr } = await (supabase as any)
    .from("import_needs")
    .select("id, sku, product_name, category, quantity, note, status, created_at")
    .order("created_at", { ascending: true })
    .limit(500);
  const allNeeds = (needData ?? []) as NeedRow[];
  const showDone = searchParams.showdone === "1";
  const openNeeds = allNeeds.filter((n) => n.status === "open");
  const doneNeeds = allNeeds.filter((n) => n.status === "done");
  const shownNeeds = showDone ? allNeeds : openNeeds;

  // 확정된 배치 목록(최신순)
  const batchMap = new Map<string, { id: string; at: string; qty: number; products: Set<string>; open: number; received: number }>();
  for (const r of all) {
    if (!r.batch_id) continue;
    const b = batchMap.get(r.batch_id) ?? { id: r.batch_id, at: r.submitted_at ?? r.created_at, qty: 0, products: new Set<string>(), open: 0, received: 0 };
    b.qty += r.quantity;
    b.products.add(r.product_id);
    if (r.status === "submitted") b.open += 1;
    if (r.status === "received") b.received += 1;
    batchMap.set(r.batch_id, b);
  }
  const batches = [...batchMap.values()].sort((a, b) => (a.at < b.at ? 1 : -1));

  const viewBatch = searchParams.batch && batchMap.has(searchParams.batch) ? searchParams.batch : "pending";
  const rows = viewBatch === "pending" ? all.filter((r) => r.status === "requested") : all.filter((r) => r.batch_id === viewBatch);

  const byProduct = new Map<
    string,
    { productId: string; sku: string; name: string; total: number; dealers: Set<string>; byStatus: Record<string, number>; rows: Row[] }
  >();
  for (const r of rows) {
    const g =
      byProduct.get(r.product_id) ??
      { productId: r.product_id, sku: r.sku, name: r.product_name, total: 0, dealers: new Set<string>(), byStatus: {}, rows: [] };
    g.total += r.quantity;
    g.dealers.add(r.dealer_id);
    g.byStatus[r.status] = (g.byStatus[r.status] ?? 0) + r.quantity;
    g.rows.push(r);
    byProduct.set(r.product_id, g);
  }
  const groups = [...byProduct.values()].sort((a, b) => b.total - a.total);
  const totalQty = rows.reduce((s, r) => s + r.quantity, 0);
  const dealerCount = new Set(rows.map((r) => r.dealer_id)).size;
  const pendingCount = all.filter((r) => r.status === "requested").length;

  const batchInfo = viewBatch === "pending" ? null : batchMap.get(viewBatch);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">수입 요청</h1>
        <p className="text-sm text-slate-500">
          딜러들이 재고 없는 상품에 남긴 수입 희망 요청을 한 달 동안 모았다가, 매달 10일경 한 번에 확정합니다. 확정하면 딜러별 백오더
          주문이 자동으로 만들어지고, 지사장님 승인용 수입 요청서(엑셀)를 내려받을 수 있습니다.
        </p>
      </div>

      {searchParams.created !== undefined && (
        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          수입 요청을 확정했습니다. 딜러 {searchParams.dealers ?? "0"}곳 중 {searchParams.created}곳의 백오더 주문(접수 상태)이 자동으로
          만들어졌습니다.{" "}
          {searchParams.batch && (
            <a className="font-medium underline" href={`/import-requests/export?batch=${searchParams.batch}`}>
              수입 요청서 내려받기
            </a>
          )}
          {searchParams.failed && (
            <p className="mt-1 text-amber-800">
              주문이 자동 생성되지 않은 딜러(요청은 확정됨, 주문은 직접 만들어주세요): {searchParams.failed}
            </p>
          )}
        </div>
      )}
      {searchParams.undone !== undefined && (
        <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          수입 요청 확정을 취소했습니다. 요청 {searchParams.undone}건이 접수 대기로 돌아왔고, 자동 생성된 백오더 주문 {searchParams.deleted ?? "0"}건을 삭제했습니다.
        </p>
      )}
      {searchParams.error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{searchParams.error}</p>}
      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error.message}</p>}

      {(searchParams.need_added || searchParams.need_deleted || searchParams.need_updated) && (
        <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {searchParams.need_added ? "상시 수입 필요 목록에 추가했습니다." : searchParams.need_deleted ? "목록에서 삭제했습니다." : "상태를 바꿨습니다."}
        </p>
      )}

      {/* 수입요청서 만들기: 딜러 접수 요청 + 상시 필요 목록 + 본사 재고 CSV → 엑셀 */}
      <Card id="needs">
        <CardHeader>
          <CardTitle>수입요청서 만들기</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-xs leading-relaxed text-slate-500">
            수입이 필요한 시기에 본사 재고 CSV(searchresults)를 올리면, 딜러 접수 요청과 아래 &ldquo;상시 수입 필요 목록&rdquo;을 SKU별로
            합치고 본사 가용·한국 3PL 가용과 비교해 수입요청서(엑셀)를 만들어 드립니다. 내려받기만 하며 요청을 확정하거나 목록을 바꾸지 않습니다.
          </p>

          <form action="/import-requests/generate" method="post" encType="multipart/form-data" className="flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="hq_csv">본사 재고 CSV (선택)</Label>
              <input id="hq_csv" name="hq_csv" type="file" accept=".csv,text/csv" className="block text-sm text-slate-700" />
            </div>
            <label className="flex items-center gap-1.5 text-sm text-slate-700">
              <input type="checkbox" name="include_dealer" defaultChecked /> 딜러 접수 요청 {pendingCount}건 포함
            </label>
            <label className="flex items-center gap-1.5 text-sm text-slate-700">
              <input type="checkbox" name="include_needs" defaultChecked /> 상시 필요 목록 {openNeeds.length}건 포함
            </label>
            <Button type="submit">수입요청서 엑셀 만들기</Button>
          </form>

          <div className="border-t border-slate-100 pt-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">상시 수입 필요 목록 (직접 입력)</h3>
            {needErr ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                상시 수입 필요 목록 테이블이 아직 없습니다. 마이그레이션 0080을 적용하면 사용할 수 있습니다.
              </p>
            ) : (
              <>
                <form action={addImportNeed} className="grid gap-2 sm:grid-cols-[110px_1fr_90px_120px_1fr_auto] sm:items-end">
                  <div>
                    <Label htmlFor="n_sku">SKU</Label>
                    <Input id="n_sku" name="sku" required placeholder="예: 600556" />
                  </div>
                  <div>
                    <Label htmlFor="n_name">상품명 (비우면 Hub에서 가져옴)</Label>
                    <Input id="n_name" name="product_name" />
                  </div>
                  <div>
                    <Label htmlFor="n_qty">수량</Label>
                    <Input id="n_qty" name="quantity" type="number" min={1} required />
                  </div>
                  <div>
                    <Label htmlFor="n_cat">제품군 (선택)</Label>
                    <Input id="n_cat" name="category" placeholder="비우면 자동" />
                  </div>
                  <div>
                    <Label htmlFor="n_note">메모</Label>
                    <Input id="n_note" name="note" placeholder="예: SSK 대표님 지참" />
                  </div>
                  <Button type="submit">추가</Button>
                </form>

                {shownNeeds.length === 0 ? (
                  <p className="py-4 text-sm text-slate-400">등록된 수입 필요 품목이 없습니다.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
                    {shownNeeds.map((n) => (
                      <li key={n.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                        <span className={`min-w-0 ${n.status === "done" ? "text-slate-400 line-through" : "text-slate-900"}`}>
                          <span className="text-xs text-slate-400">{n.sku}</span> {n.product_name || "(상품명 없음)"}
                          {n.category ? <span className="ml-1 text-xs text-slate-400">[{n.category}]</span> : null}
                          {n.note ? <span className="ml-1 text-xs text-slate-500">· {n.note}</span> : null}
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <b className="tabular-nums">{n.quantity}개</b>
                          <form action={setImportNeedDone}>
                            <input type="hidden" name="id" value={n.id} />
                            <input type="hidden" name="done" value={n.status === "done" ? "0" : "1"} />
                            <Button type="submit" size="sm" variant="secondary">
                              {n.status === "done" ? "되돌리기" : "처리 완료"}
                            </Button>
                          </form>
                          <form action={deleteImportNeed}>
                            <input type="hidden" name="id" value={n.id} />
                            <ConfirmButton size="sm" variant="secondary" message="이 항목을 목록에서 삭제할까요?">
                              삭제
                            </ConfirmButton>
                          </form>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {doneNeeds.length > 0 && (
                  <p className="mt-2 text-xs text-slate-500">
                    <Link className="underline" href={showDone ? "/import-requests#needs" : "/import-requests?showdone=1#needs"}>
                      {showDone ? "처리 완료 항목 숨기기" : `처리 완료 ${doneNeeds.length}건 보기`}
                    </Link>
                  </p>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 보기 선택 */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link
          href="/import-requests"
          className={`rounded-full border px-3 py-1 ${
            viewBatch === "pending" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          접수 대기 {pendingCount}건
        </Link>
        {batches.map((b) => (
          <Link
            key={b.id}
            href={`/import-requests?batch=${b.id}`}
            className={`rounded-full border px-3 py-1 ${
              viewBatch === b.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {dateKst(b.at)} 확정 · {b.products.size}종 {b.qty}개{b.open > 0 ? " · 입고 대기" : ""}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {viewBatch === "pending" ? "접수 대기" : `${batchInfo ? dateKst(batchInfo.at) : ""} 확정분`} · 상품 {groups.length}종 · 총 {totalQty}개 · 딜러{" "}
            {dealerCount}곳
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={`/import-requests/export?batch=${viewBatch}`}
              className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {viewBatch === "pending" ? "수입 요청서 미리보기(엑셀)" : "수입 요청서 내려받기(엑셀)"}
            </a>
            {viewBatch === "pending" && pendingCount > 0 && isAdmin && (
              <form action={confirmImportBatch}>
                <Button type="submit">수입 요청 확정 — 백오더 주문 자동 생성</Button>
              </form>
            )}
            {viewBatch === "pending" && pendingCount > 0 && !isAdmin && (
              <span className="text-xs text-slate-500">확정은 관리자(admin)만 할 수 있습니다.</span>
            )}
            {batchInfo && batchInfo.received > 0 && isAdmin && (
              <form action={undoImportReceived}>
                <input type="hidden" name="batch_id" value={batchInfo.id} />
                <ConfirmButton variant="secondary" message={'이 확정분의 "입고 완료" 표시를 모두 취소할까요? (수입 요청 완료 상태로 돌아갑니다)'}>
                  입고 완료 전체 취소
                </ConfirmButton>
              </form>
            )}
            {batchInfo && batchInfo.received === 0 && isAdmin && (
              <form action={cancelImportBatch}>
                <input type="hidden" name="batch_id" value={batchInfo.id} />
                <ConfirmButton
                  variant="secondary"
                  message={"이 수입 요청 확정을 취소할까요?\n자동 생성된 백오더 주문(아직 임시 상태이고 내용이 그대로인 것)을 삭제하고, 요청을 접수 대기로 되돌립니다. 하나라도 안 맞으면 아무것도 바꾸지 않습니다."}
                >
                  확정 취소 (접수 대기로 되돌리기)
                </ConfirmButton>
              </form>
            )}
            {batchInfo && batchInfo.open > 0 && isAdmin && (
              <form action={markImportReceived}>
                <input type="hidden" name="batch_id" value={batchInfo.id} />
                <Button type="submit" variant="secondary">
                  이 확정분 전체 &ldquo;입고 완료&rdquo;
                </Button>
              </form>
            )}
          </div>
          {viewBatch === "pending" && pendingCount > 0 && (
            <p className="text-xs leading-relaxed text-slate-500">
              확정하면 ① 딜러별로 요청 수량을 합쳐 백오더 주문(접수 상태)이 자동 생성되고(가격·할인·프로모션·배송비는 딜러가 직접 주문할
              때와 동일하게 계산), ② 요청은 &ldquo;수입 요청 완료&rdquo;로 바뀌어 더 이상 접수 대기에 남지 않습니다. 엑셀의 &ldquo;최근
              6개월 판매추이&rdquo; 시트로 상품별 판매 흐름을 함께 확인할 수 있습니다. 매달 10일경이 기준이지만 날짜는 정해져 있지 않아
              원할 때 언제든 확정할 수 있습니다.
            </p>
          )}

          {groups.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              {viewBatch === "pending" ? "접수 대기 중인 수입 요청이 없습니다." : "이 확정분에 요청이 없습니다."}
            </p>
          ) : (
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {groups.map((g) => (
                <details key={g.productId} className="group">
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-slate-50">
                    <span className="min-w-0 text-sm text-slate-900">
                      <span className="text-xs text-slate-400">{g.sku}</span> {g.name}
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-sm">
                      <b className="tabular-nums">{g.total}개</b>
                      <span className="text-xs text-slate-500">딜러 {g.dealers.size}곳</span>
                      {Object.entries(g.byStatus).map(([st, qty]) => (
                        <Badge key={st} tone={IMPORT_STATUS_TONE[st] ?? "slate"}>
                          {IMPORT_STATUS_LABEL[st] ?? st} {qty}
                        </Badge>
                      ))}
                    </span>
                  </summary>
                  <div className="space-y-2 bg-slate-50 px-4 py-3">
                    <ul className="space-y-1 text-xs text-slate-600">
                      {g.rows.map((r) => (
                        <li key={r.id}>
                          {dateKst(r.created_at)} · {r.dealers?.name ?? "—"} · {r.quantity}개{r.note ? ` · ${r.note}` : ""}
                          {r.dealer_orders?.order_number ? ` · 백오더 주문 ${r.dealer_orders.order_number}` : ""} ·{" "}
                          <span className="text-slate-400">{IMPORT_STATUS_LABEL[r.status] ?? r.status}</span>
                        </li>
                      ))}
                    </ul>
                    {g.byStatus["received"] && isAdmin && viewBatch !== "pending" ? (
                      <form action={undoImportReceived}>
                        <input type="hidden" name="batch_id" value={viewBatch} />
                        <input type="hidden" name="product_id" value={g.productId} />
                        <ConfirmButton size="sm" variant="secondary" message={'이 상품의 "입고 완료" 표시를 취소할까요?'}>
                          이 상품 &ldquo;입고 완료&rdquo; 취소
                        </ConfirmButton>
                      </form>
                    ) : null}
                    {g.byStatus["submitted"] && isAdmin && viewBatch !== "pending" ? (
                      <form action={markImportReceived}>
                        <input type="hidden" name="batch_id" value={viewBatch} />
                        <input type="hidden" name="product_id" value={g.productId} />
                        <Button type="submit" size="sm" variant="secondary">
                          이 상품 &ldquo;입고 완료&rdquo;로 표시
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </details>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

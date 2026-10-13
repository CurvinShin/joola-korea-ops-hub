import { createClient } from "@/lib/supabase/server";
import { createImportRequest, cancelImportRequest } from "@/lib/actions/import-requests";
import { ImportRequestForm } from "@/components/order/ImportRequestForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { IMPORT_STATUS_LABEL, IMPORT_STATUS_TONE } from "@/lib/utils/import-month";

export const dynamic = "force-dynamic";

const dateKst = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });

export default async function DealerImportRequestsPage({
  searchParams,
}: {
  searchParams: { product?: string; done?: string; error?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("dealer_id")
    .eq("id", user?.id ?? "")
    .single();

  if (!profile?.dealer_id) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <p className="text-sm text-slate-500">딜러 계정으로 로그인하면 수입 요청을 남길 수 있습니다.</p>
      </div>
    );
  }

  const [{ data: catalog }, { data: requests }] = await Promise.all([
    supabase.from("dealer_catalog").select("product_id, sku, name, available_stock").lte("available_stock", 0).order("name"),
    supabase
      .from("import_requests")
      .select("id, sku, product_name, quantity, note, status, created_at, order_id, dealer_orders(order_number)")
      .eq("dealer_id", profile.dealer_id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const options = (catalog ?? []).map((c) => ({ product_id: c.product_id as string, sku: c.sku as string, name: c.name as string }));
  const rows = (requests ?? []) as unknown as {
    id: string;
    sku: string;
    product_name: string;
    quantity: number;
    note: string | null;
    status: string;
    created_at: string;
    order_id: string | null;
    dealer_orders: { order_number: string | null } | null;
  }[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">수입 요청</h1>
        <p className="text-sm text-slate-500">현재 재고가 없는 상품을 다음 수입 때 함께 들여오도록 희망 수량을 남기는 곳입니다.</p>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-relaxed text-blue-900">
        <p className="font-semibold">수입 요청은 이렇게 처리됩니다</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px]">
          <li>
            남겨주신 요청은 <b>바로 수입 요청되지 않습니다.</b> 한 달 동안 모인 요청을 JOOLA Korea가 매달 <b>10일경</b>{" "}
            <b>1개월치를 몰아서 한 번에</b> 수입 요청합니다.
          </li>
          <li>
            수입 요청이 확정되면 요청하신 수량으로 <b>백오더 주문이 자동으로 만들어져</b> &ldquo;내 주문 내역&rdquo;에 접수 상태로
            나타납니다. (아래 내역에서 주문번호를 확인할 수 있어요.)
          </li>
          <li>입고까지는 요청하신 날부터 시간이 걸릴 수 있고, 입고 일정은 확정되는 대로 별도로 안내드립니다.</li>
          <li>아직 &ldquo;접수&rdquo; 상태인 요청은 아래 내역에서 직접 취소할 수 있습니다. 수입 요청이 확정된 뒤의 변경은 담당자에게 문의해주세요.</li>
        </ul>
      </div>

      {searchParams.done && (
        <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800">수입 요청이 접수되었습니다.</p>
      )}
      {searchParams.error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{searchParams.error}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>새 수입 요청</CardTitle>
        </CardHeader>
        <CardContent>
          <ImportRequestForm action={createImportRequest} options={options} preselectId={searchParams.product} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>내 요청 내역 {rows.length}건</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">아직 남긴 요청이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="text-slate-900">
                      <span className="text-xs text-slate-400">{r.sku}</span> {r.product_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {dateKst(r.created_at)} · {r.quantity}개{r.note ? ` · ${r.note}` : ""}
                      {r.dealer_orders?.order_number ? ` · 백오더 주문 ${r.dealer_orders.order_number}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge tone={IMPORT_STATUS_TONE[r.status] ?? "slate"}>{IMPORT_STATUS_LABEL[r.status] ?? r.status}</Badge>
                    {r.status === "requested" && (
                      <form action={cancelImportRequest.bind(null, r.id)}>
                        <button className="text-xs text-red-600 hover:underline">취소</button>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

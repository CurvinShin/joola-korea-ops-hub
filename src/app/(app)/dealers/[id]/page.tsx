import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { updateDealer, deleteDealer } from "@/lib/actions/dealers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, Thead, Tr, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DealerForm } from "@/components/dealers/DealerForm";
import { format, startOfYear } from "date-fns";

export const dynamic = "force-dynamic";

const currency = (n: number) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n);

export default async function DealerDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const yearStart = format(startOfYear(new Date()), "yyyy-MM-dd");

  const [{ data: dealer }, { data: orders }] = await Promise.all([
    supabase.from("dealers").select("*").eq("id", params.id).maybeSingle(),
    supabase
      .from("dealer_orders")
      .select("id, order_date, status, total_amount")
      .eq("dealer_id", params.id)
      .order("order_date", { ascending: false }),
  ]);

  if (!dealer) notFound();

  const ytdTotal = (orders ?? [])
    .filter((o) => o.order_date >= yearStart)
    .reduce((sum, o) => sum + Number(o.total_amount), 0);
  const moqPct = dealer.moq_target > 0 ? Math.min(100, Math.round((ytdTotal / dealer.moq_target) * 100)) : null;

  const updateWithId = updateDealer.bind(null, dealer.id);
  const deleteWithId = deleteDealer.bind(null, dealer.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dealers" className="text-xs text-slate-400 hover:underline">
            ← All dealers
          </Link>
          <h1 className="text-xl font-semibold text-slate-900">{dealer.name}</h1>
        </div>
        <form action={deleteWithId}>
          <Button type="submit" variant="danger" size="sm">
            Delete dealer
          </Button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>YTD purchases vs. MOQ target</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-semibold text-slate-900">{currency(ytdTotal)}</span>
                <span className="text-slate-400">
                  target {dealer.moq_target > 0 ? currency(dealer.moq_target) : "not set"}
                </span>
              </div>
              {moqPct !== null && (
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-brand-600" style={{ width: `${moqPct}%` }} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Order history</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {orders && orders.length > 0 ? (
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Date</Th>
                      <Th>Status</Th>
                      <Th>Amount</Th>
                    </Tr>
                  </Thead>
                  <tbody>
                    {orders.map((o) => (
                      <Tr key={o.id}>
                        <Td>{o.order_date}</Td>
                        <Td>
                          <Badge tone="blue">{o.status}</Badge>
                        </Td>
                        <Td>{currency(Number(o.total_amount))}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p className="p-8 text-center text-sm text-slate-400">
                  No orders logged for this dealer yet. Orders are added from the (Phase 2) Sales module.
                </p>
              )}
            </CardContent>
          </Card>

          {dealer.outstanding_issues && (
            <Card>
              <CardHeader>
                <CardTitle>Outstanding issues</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-700">{dealer.outstanding_issues}</CardContent>
            </Card>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Edit dealer</CardTitle>
          </CardHeader>
          <CardContent>
            <DealerForm action={updateWithId} defaultValues={dealer} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, Thead, Tr, Th, Td } from "@/components/ui/Table";
import { format, startOfMonth } from "date-fns";

export const dynamic = "force-dynamic"; // always show live data, never cache

const currency = (n: number) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n);

export default async function DashboardPage() {
  const supabase = createClient();
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const today = format(new Date(), "yyyy-MM-dd");

  const [
    { count: activeDealerCount },
    { data: lowStockRows },
    { data: recentOrders },
    { data: upcomingEvents },
    { data: pendingTasks },
    { data: monthSales },
    { data: monthTarget },
  ] = await Promise.all([
    supabase.from("dealers").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("inventory_status").select("*").eq("is_low_stock", true).eq("discontinued", false),
    supabase
      .from("dealer_orders")
      .select("id, order_date, status, total_amount, dealers(name)")
      .order("order_date", { ascending: false })
      .limit(5),
    supabase
      .from("events")
      .select("id, name, event_date, location")
      .gte("event_date", today)
      .order("event_date", { ascending: true })
      .limit(5),
    supabase
      .from("tasks")
      .select("id, title, priority, due_date, status")
      .neq("status", "done")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(6),
    supabase.from("sales_transactions").select("amount").gte("sale_date", monthStart),
    supabase.from("sales_targets").select("target_amount").eq("period_month", monthStart).is("channel", null).maybeSingle(),
  ]);

  const monthSalesTotal = (monthSales ?? []).reduce((sum, r) => sum + Number(r.amount), 0);
  const target = monthTarget?.target_amount ? Number(monthTarget.target_amount) : null;
  const pctOfTarget = target ? Math.round((monthSalesTotal / target) * 100) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Live snapshot of JOOLA Korea operations.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Active dealers" value={String(activeDealerCount ?? 0)} />
        <KpiCard
          label="Low-stock SKUs"
          value={String(lowStockRows?.length ?? 0)}
          tone={(lowStockRows?.length ?? 0) > 0 ? "warning" : "default"}
          hint="Available stock at or below threshold"
        />
        <KpiCard
          label="Month-to-date sales"
          value={currency(monthSalesTotal)}
          hint={pctOfTarget !== null ? `${pctOfTarget}% of ${currency(target!)} target` : "No target set for this month"}
        />
        <KpiCard label="Open tasks" value={String(pendingTasks?.length ?? 0)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent dealer orders</CardTitle>
            <Link href="/dealers" className="text-xs font-medium text-brand-600 hover:underline">
              View dealers
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentOrders && recentOrders.length > 0 ? (
              <Table>
                <Thead>
                  <Tr>
                    <Th>Dealer</Th>
                    <Th>Date</Th>
                    <Th>Status</Th>
                    <Th>Amount</Th>
                  </Tr>
                </Thead>
                <tbody>
                  {recentOrders.map((o: any) => (
                    <Tr key={o.id}>
                      <Td>{o.dealers?.name ?? "—"}</Td>
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
              <EmptyState label="No dealer orders logged yet." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming events</CardTitle>
            <Link href="/events" className="text-xs font-medium text-brand-600 hover:underline">
              View events
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {upcomingEvents && upcomingEvents.length > 0 ? (
              <Table>
                <Thead>
                  <Tr>
                    <Th>Event</Th>
                    <Th>Date</Th>
                    <Th>Location</Th>
                  </Tr>
                </Thead>
                <tbody>
                  {upcomingEvents.map((e) => (
                    <Tr key={e.id}>
                      <Td>{e.name}</Td>
                      <Td>{e.event_date}</Td>
                      <Td>{e.location ?? "—"}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <EmptyState label="No upcoming events scheduled." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low-stock alerts</CardTitle>
            <Link href="/inventory" className="text-xs font-medium text-brand-600 hover:underline">
              View inventory
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {lowStockRows && lowStockRows.length > 0 ? (
              <Table>
                <Thead>
                  <Tr>
                    <Th>Product</Th>
                    <Th>Available</Th>
                    <Th>Incoming</Th>
                  </Tr>
                </Thead>
                <tbody>
                  {lowStockRows.map((r) => (
                    <Tr key={r.product_id}>
                      <Td>{r.name}</Td>
                      <Td>
                        <Badge tone="amber">{r.available_stock}</Badge>
                      </Td>
                      <Td>{r.incoming_qty > 0 ? `${r.incoming_qty} (ETA ${r.eta ?? "—"})` : "—"}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <EmptyState label="All products are above their low-stock threshold." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending tasks</CardTitle>
            <Link href="/tasks" className="text-xs font-medium text-brand-600 hover:underline">
              View tasks
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {pendingTasks && pendingTasks.length > 0 ? (
              <Table>
                <Thead>
                  <Tr>
                    <Th>Task</Th>
                    <Th>Priority</Th>
                    <Th>Due</Th>
                  </Tr>
                </Thead>
                <tbody>
                  {pendingTasks.map((t) => (
                    <Tr key={t.id}>
                      <Td>{t.title}</Td>
                      <Td>
                        <Badge tone={t.priority === "urgent" || t.priority === "high" ? "red" : "slate"}>
                          {t.priority}
                        </Badge>
                      </Td>
                      <Td>{t.due_date ?? "—"}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <EmptyState label="No open tasks. Nice work." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick links</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {[
            { href: "/dealers?new=1", label: "Add dealer" },
            { href: "/inventory?new=1", label: "Add product" },
            { href: "/events?new=1", label: "Add event" },
            { href: "/tasks?new=1", label: "Add task" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
            >
              {l.label}
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="px-5 py-8 text-center text-sm text-slate-400">{label}</p>;
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, Thead, Tr, Th, Td } from "@/components/ui/Table";
import { format, startOfMonth } from "date-fns";
import { orderStatusLabel, taskPriorityLabel } from "@/lib/utils/labels";

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
        <h1 className="text-xl font-semibold text-slate-900">대시보드</h1>
        <p className="text-sm text-slate-500">JOOLA Korea 운영 현황을 실시간으로 보여줍니다.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="활성 딜러 수" value={String(activeDealerCount ?? 0)} />
        <KpiCard
          label="재고 부족 SKU"
          value={String(lowStockRows?.length ?? 0)}
          tone={(lowStockRows?.length ?? 0) > 0 ? "warning" : "default"}
          hint="가용 재고가 기준치 이하인 상품"
        />
        <KpiCard
          label="이번 달 누적 매출"
          value={currency(monthSalesTotal)}
          hint={pctOfTarget !== null ? `목표 ${currency(target!)} 대비 ${pctOfTarget}%` : "이번 달 목표가 설정되지 않았습니다"}
        />
        <KpiCard label="미완료 작업" value={String(pendingTasks?.length ?? 0)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>최근 딜러 주문</CardTitle>
            <Link href="/dealers" className="text-xs font-medium text-brand-600 hover:underline">
              딜러 보기
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentOrders && recentOrders.length > 0 ? (
              <Table>
                <Thead>
                  <Tr>
                    <Th>딜러</Th>
                    <Th>날짜</Th>
                    <Th>상태</Th>
                    <Th>금액</Th>
                  </Tr>
                </Thead>
                <tbody>
                  {recentOrders.map((o: any) => (
                    <Tr key={o.id}>
                      <Td>{o.dealers?.name ?? "—"}</Td>
                      <Td>{o.order_date}</Td>
                      <Td>
                        <Badge tone="blue">{orderStatusLabel[o.status] ?? o.status}</Badge>
                      </Td>
                      <Td>{currency(Number(o.total_amount))}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <EmptyState label="아직 등록된 딜러 주문이 없습니다." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>다가오는 이벤트</CardTitle>
            <Link href="/events" className="text-xs font-medium text-brand-600 hover:underline">
              이벤트 보기
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {upcomingEvents && upcomingEvents.length > 0 ? (
              <Table>
                <Thead>
                  <Tr>
                    <Th>이벤트</Th>
                    <Th>날짜</Th>
                    <Th>장소</Th>
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
              <EmptyState label="예정된 이벤트가 없습니다." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>재고 부족 알림</CardTitle>
            <Link href="/inventory" className="text-xs font-medium text-brand-600 hover:underline">
              재고 보기
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {lowStockRows && lowStockRows.length > 0 ? (
              <Table>
                <Thead>
                  <Tr>
                    <Th>제품</Th>
                    <Th>가용 재고</Th>
                    <Th>입고 예정</Th>
                  </Tr>
                </Thead>
                <tbody>
                  {lowStockRows.map((r) => (
                    <Tr key={r.product_id}>
                      <Td>{r.name}</Td>
                      <Td>
                        <Badge tone="amber">{r.available_stock}</Badge>
                      </Td>
                      <Td>{r.incoming_qty > 0 ? `${r.incoming_qty}개 (입고예정일 ${r.eta ?? "—"})` : "—"}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <EmptyState label="모든 제품의 재고가 부족 기준치 이상입니다." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>대기 중인 작업</CardTitle>
            <Link href="/tasks" className="text-xs font-medium text-brand-600 hover:underline">
              작업 보기
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {pendingTasks && pendingTasks.length > 0 ? (
              <Table>
                <Thead>
                  <Tr>
                    <Th>작업</Th>
                    <Th>우선순위</Th>
                    <Th>마감일</Th>
                  </Tr>
                </Thead>
                <tbody>
                  {pendingTasks.map((t) => (
                    <Tr key={t.id}>
                      <Td>{t.title}</Td>
                      <Td>
                        <Badge tone={t.priority === "urgent" || t.priority === "high" ? "red" : "slate"}>
                          {taskPriorityLabel[t.priority] ?? t.priority}
                        </Badge>
                      </Td>
                      <Td>{t.due_date ?? "—"}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <EmptyState label="미완료 작업이 없습니다. 수고하셨습니다!" />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>바로가기</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {[
            { href: "/dealers?new=1", label: "딜러 추가" },
            { href: "/inventory?new=1", label: "제품 추가" },
            { href: "/events?new=1", label: "이벤트 추가" },
            { href: "/tasks?new=1", label: "작업 추가" },
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

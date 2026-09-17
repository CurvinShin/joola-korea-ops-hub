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
import { orderStatusLabel } from "@/lib/utils/labels";

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
            ← 전체 딜러
          </Link>
          <h1 className="text-xl font-semibold text-slate-900">{dealer.name}</h1>
        </div>
        <form action={deleteWithId}>
          <Button type="submit" variant="danger" size="sm">
            딜러 삭제
          </Button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>연간 누적 구매액 대비 MOQ 목표</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-2 text-xs text-slate-400">이 사이트(주문서)를 통해 들어온 주문만 집계한 값입니다.</p>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-semibold text-slate-900">{currency(ytdTotal)}</span>
                <span className="text-slate-400">
                  목표 {dealer.moq_target > 0 ? currency(dealer.moq_target) : "미설정"}
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
              <CardTitle>실제 구매액 (견적서 기준)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-xs text-slate-400">
                딥 폴더의 2026년 견적서를 기준으로 집계했습니다(견적서가 있으면 구매한 것으로 보고
                합산). 이 사이트 주문과는 별도입니다.
                {dealer.quote_amount_as_of && (
                  <> 기준일: {dealer.quote_amount_as_of}</>
                )}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400">올해 누적</p>
                  <p className="text-base font-semibold text-slate-900">
                    {dealer.ytd_quote_amount != null ? currency(Number(dealer.ytd_quote_amount)) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">이번달</p>
                  <p className="text-base font-semibold text-slate-900">
                    {dealer.mtd_quote_amount != null ? currency(Number(dealer.mtd_quote_amount)) : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>주문 이력</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {orders && orders.length > 0 ? (
                <Table>
                  <Thead>
                    <Tr>
                      <Th>날짜</Th>
                      <Th>상태</Th>
                      <Th>금액</Th>
                    </Tr>
                  </Thead>
                  <tbody>
                    {orders.map((o) => (
                      <Tr key={o.id}>
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
                <p className="p-8 text-center text-sm text-slate-400">
                  이 딜러의 주문 내역이 아직 없습니다. 주문은 (2단계 예정) 영업 모듈에서 추가됩니다.
                </p>
              )}
            </CardContent>
          </Card>

          {dealer.outstanding_issues && (
            <Card>
              <CardHeader>
                <CardTitle>미해결 이슈</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-700">{dealer.outstanding_issues}</CardContent>
            </Card>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>딜러 정보 수정</CardTitle>
          </CardHeader>
          <CardContent>
            <DealerForm action={updateWithId} defaultValues={dealer} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

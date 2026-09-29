import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Table, Thead, Tr, Th, Td } from "@/components/ui/Table";
import { SmartstoreSettlementsPanel, type SmartstoreEntry } from "@/components/sales/SmartstoreSettlementsPanel";
import { SMARTSTORE_SOURCE } from "@/lib/utils/sales";

export const dynamic = "force-dynamic";

const currency = (n: number) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n);

// "2026-09-17" -> "2026-09"
function monthKey(dateStr: string) {
  return dateStr.slice(0, 7);
}

function sumValues(map: Map<string, number>) {
  return Array.from(map.values()).reduce((sum, v) => sum + v, 0);
}

function sumForYear(map: Map<string, number>, year: string) {
  return Array.from(map.entries())
    .filter(([month]) => month.startsWith(year))
    .reduce((sum, [, amount]) => sum + amount, 0);
}

export default async function SalesPage() {
  const supabase = createClient();

  // 딜러 매출은 dealer_quotes(견적서 합계금액, 부가세·배송비 포함)을 그대로
  // 월별로 더한 값 — 새로 입력할 필요 없이 이미 있는 데이터를 그대로 쓴다.
  // 스마트스토어 매출은 담당자가 매월 직접 입력하는 정산액
  // (sales_transactions, channel="ecommerce")이다.
  const [{ data: quotes }, { data: smartstoreRows }] = await Promise.all([
    supabase.from("dealer_quotes").select("quote_date, amount"),
    supabase
      .from("sales_transactions")
      .select("id, sale_date, amount")
      .eq("channel", "ecommerce")
      .eq("source", SMARTSTORE_SOURCE)
      .order("sale_date", { ascending: false }),
  ]);

  const dealerByMonth = new Map<string, number>();
  for (const q of quotes ?? []) {
    const key = monthKey(q.quote_date);
    dealerByMonth.set(key, (dealerByMonth.get(key) ?? 0) + Number(q.amount));
  }

  const smartstoreEntries: SmartstoreEntry[] = (smartstoreRows ?? []).map((r) => ({
    id: r.id,
    month: monthKey(r.sale_date),
    amount: Number(r.amount),
  }));
  const smartstoreByMonth = new Map<string, number>();
  for (const entry of smartstoreEntries) {
    smartstoreByMonth.set(entry.month, entry.amount);
  }

  const allMonths = Array.from(new Set([...dealerByMonth.keys(), ...smartstoreByMonth.keys()])).sort().reverse();
  const rows = allMonths.map((month) => {
    const dealerAmount = dealerByMonth.get(month) ?? 0;
    const smartstoreAmount = smartstoreByMonth.get(month) ?? 0;
    return { month, dealerAmount, smartstoreAmount, total: dealerAmount + smartstoreAmount };
  });

  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentYear = currentMonth.slice(0, 4);

  const thisMonthDealer = dealerByMonth.get(currentMonth) ?? 0;
  const thisMonthSmartstore = smartstoreByMonth.get(currentMonth) ?? 0;
  const thisYearDealer = sumForYear(dealerByMonth, currentYear);
  const thisYearSmartstore = sumForYear(smartstoreByMonth, currentYear);
  const dealerTotalAll = sumValues(dealerByMonth);
  const smartstoreTotalAll = sumValues(smartstoreByMonth);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">영업</h1>
        <p className="text-sm text-slate-500">
          딜러 매출(견적서 기준)과 스마트스토어 매출(정산 기준)을 월별로 합산해서 보여줍니다.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="이번 달 총매출"
          value={currency(thisMonthDealer + thisMonthSmartstore)}
          hint={`딜러 ${currency(thisMonthDealer)} · 스마트스토어 ${currency(thisMonthSmartstore)}`}
        />
        <KpiCard
          label={`${currentYear}년 누계 총매출`}
          value={currency(thisYearDealer + thisYearSmartstore)}
          hint={`딜러 ${currency(thisYearDealer)} · 스마트스토어 ${currency(thisYearSmartstore)}`}
        />
        <KpiCard label="딜러 매출 누계 (전체 기간)" value={currency(dealerTotalAll)} hint="견적서 합계금액 기준" />
        <KpiCard
          label="스마트스토어 매출 누계 (전체 기간)"
          value={currency(smartstoreTotalAll)}
          hint="정산 기준, 아래에서 입력"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>월별 매출</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length > 0 ? (
            <Table>
              <Thead>
                <Tr>
                  <Th>월</Th>
                  <Th className="text-right">딜러 매출</Th>
                  <Th className="text-right">스마트스토어 매출</Th>
                  <Th className="text-right">합계</Th>
                </Tr>
              </Thead>
              <tbody>
                {rows.map((r) => (
                  <Tr key={r.month}>
                    <Td className="font-medium text-slate-900">{r.month}</Td>
                    <Td className="text-right">{currency(r.dealerAmount)}</Td>
                    <Td className="text-right">{currency(r.smartstoreAmount)}</Td>
                    <Td className="text-right font-medium text-slate-900">{currency(r.total)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="p-8 text-center text-sm text-slate-400">아직 매출 데이터가 없습니다.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>스마트스토어 월별 정산 입력</CardTitle>
        </CardHeader>
        <CardContent>
          <SmartstoreSettlementsPanel initialEntries={smartstoreEntries} />
        </CardContent>
      </Card>
    </div>
  );
}

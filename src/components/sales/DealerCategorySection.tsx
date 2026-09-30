import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Table, Thead, Tr, Th, Td } from "@/components/ui/Table";
import { CategoryCharts } from "@/components/sales/CategoryCharts";
import { TOP_CATEGORIES, PADDLE_SUBS, type ProductCategoryReport } from "@/lib/reports/productCategoryReport";

const currency = (n: number) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n);
const numberFmt = (n: number) => new Intl.NumberFormat("ko-KR").format(n);
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

// "딜러 구매" 탭 — 딜러 견적서(dealer_quote_items) 금액 기준 분석. 예전에는
// ProductCategoryReportView 안에 스마트스토어 섹션과 함께 한 덩어리였는데,
// 딜러/스마트스토어/전체 탭으로 나누면서 별도 컴포넌트로 뺐다.
export function DealerCategorySection({ report }: { report: ProductCategoryReport }) {
  const {
    rows,
    dealerNameByKrCode,
    totalAmount,
    byCategory,
    byPaddleSub,
    paddleTotal,
    dealerKrCodes,
    byDealerCategory,
    months,
    byMonthCategory,
    currentMonth,
    currentMonthTotal,
    momChange,
    lastQuoteDate,
  } = report;

  const pieData = TOP_CATEGORIES.map((cat) => ({
    name: cat,
    value: byCategory.get(cat)?.amount ?? 0,
  })).filter((d) => d.value > 0);

  const paddleBarData = PADDLE_SUBS.map((sub) => ({
    name: sub,
    amount: byPaddleSub.get(sub)?.amount ?? 0,
  })).filter((d) => d.amount > 0);

  const monthBarData = months.map((m) => {
    const entry: Record<string, string | number> = { month: m };
    for (const cat of TOP_CATEGORIES) {
      entry[cat] = byMonthCategory.get(m)?.get(cat) ?? 0;
    }
    return entry;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="누계 공급가액" value={currency(totalAmount)} hint={`품목 ${numberFmt(rows.length)}건 기준`} />
        <KpiCard
          label="패들 비중"
          value={totalAmount > 0 ? pct(paddleTotal / totalAmount) : "-"}
          hint={currency(paddleTotal)}
        />
        <KpiCard
          label={currentMonth ? `${currentMonth} 공급가액` : "이번 달 공급가액"}
          value={currency(currentMonthTotal)}
          hint={momChange !== null ? `전월 대비 ${momChange >= 0 ? "+" : ""}${pct(momChange)}` : "전월 데이터 없음"}
          tone={momChange !== null && momChange < 0 ? "warning" : "default"}
        />
        <KpiCard
          label="딜러 수"
          value={`${dealerKrCodes.length}개사`}
          hint={lastQuoteDate ? `최신 견적일자 ${lastQuoteDate}` : undefined}
        />
      </div>

      <CategoryCharts
        pieData={pieData}
        paddleBarData={paddleBarData}
        monthBarData={monthBarData}
        categories={[...TOP_CATEGORIES]}
      />

      <Card>
        <CardHeader>
          <CardTitle>대분류별 요약</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <Thead>
              <Tr>
                <Th>대분류</Th>
                <Th className="text-right">수량</Th>
                <Th className="text-right">공급가액</Th>
                <Th className="text-right">비중</Th>
              </Tr>
            </Thead>
            <tbody>
              {TOP_CATEGORIES.map((cat) => {
                const v = byCategory.get(cat) ?? { qty: 0, amount: 0 };
                return (
                  <Tr key={cat}>
                    <Td className="font-medium text-slate-900">{cat}</Td>
                    <Td className="text-right">{numberFmt(v.qty)}</Td>
                    <Td className="text-right">{currency(v.amount)}</Td>
                    <Td className="text-right">{totalAmount > 0 ? pct(v.amount / totalAmount) : "-"}</Td>
                  </Tr>
                );
              })}
              <Tr className="bg-slate-50 font-semibold">
                <Td>합계</Td>
                <Td className="text-right">
                  {numberFmt(TOP_CATEGORIES.reduce((s, c) => s + (byCategory.get(c)?.qty ?? 0), 0))}
                </Td>
                <Td className="text-right">{currency(totalAmount)}</Td>
                <Td className="text-right">100%</Td>
              </Tr>
            </tbody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>패들 세부 라인별 요약</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <Thead>
              <Tr>
                <Th>라인(Tier)</Th>
                <Th className="text-right">수량</Th>
                <Th className="text-right">공급가액</Th>
                <Th className="text-right">패들 내 비중</Th>
              </Tr>
            </Thead>
            <tbody>
              {PADDLE_SUBS.map((sub) => {
                const v = byPaddleSub.get(sub) ?? { qty: 0, amount: 0 };
                if (v.qty === 0 && v.amount === 0) return null;
                return (
                  <Tr key={sub}>
                    <Td className="font-medium text-slate-900">{sub}</Td>
                    <Td className="text-right">{numberFmt(v.qty)}</Td>
                    <Td className="text-right">{currency(v.amount)}</Td>
                    <Td className="text-right">{paddleTotal > 0 ? pct(v.amount / paddleTotal) : "-"}</Td>
                  </Tr>
                );
              })}
              <Tr className="bg-slate-50 font-semibold">
                <Td>패들 합계</Td>
                <Td className="text-right">
                  {numberFmt(PADDLE_SUBS.reduce((s, sub) => s + (byPaddleSub.get(sub)?.qty ?? 0), 0))}
                </Td>
                <Td className="text-right">{currency(paddleTotal)}</Td>
                <Td className="text-right">100%</Td>
              </Tr>
            </tbody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>딜러별 대분류 공급가액</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <Thead>
              <Tr>
                <Th>딜러</Th>
                {TOP_CATEGORIES.map((cat) => (
                  <Th key={cat} className="text-right">
                    {cat}
                  </Th>
                ))}
                <Th className="text-right">합계</Th>
              </Tr>
            </Thead>
            <tbody>
              {dealerKrCodes.map((kr) => {
                const m = byDealerCategory.get(kr) ?? new Map<string, number>();
                const rowTotal = Array.from(m.values()).reduce((a, b) => a + b, 0);
                return (
                  <Tr key={kr}>
                    <Td className="font-medium text-slate-900">
                      {dealerNameByKrCode.get(kr) ?? kr} <span className="text-slate-400">({kr})</span>
                    </Td>
                    {TOP_CATEGORIES.map((cat) => (
                      <Td key={cat} className="text-right">
                        {currency(m.get(cat) ?? 0)}
                      </Td>
                    ))}
                    <Td className="text-right font-semibold">{currency(rowTotal)}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>월별 대분류 공급가액</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <Thead>
              <Tr>
                <Th>월</Th>
                {TOP_CATEGORIES.map((cat) => (
                  <Th key={cat} className="text-right">
                    {cat}
                  </Th>
                ))}
                <Th className="text-right">합계</Th>
              </Tr>
            </Thead>
            <tbody>
              {months.map((m) => {
                const mm = byMonthCategory.get(m) ?? new Map<string, number>();
                const rowTotal = Array.from(mm.values()).reduce((a, b) => a + b, 0);
                return (
                  <Tr key={m}>
                    <Td className="font-medium text-slate-900">{m}</Td>
                    {TOP_CATEGORIES.map((cat) => (
                      <Td key={cat} className="text-right">
                        {currency(mm.get(cat) ?? 0)}
                      </Td>
                    ))}
                    <Td className="text-right font-semibold">{currency(rowTotal)}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>참고 사항</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-slate-500">
          <p>
            데이터는 딜러 견적서(dealer_quote_items) 품목 기준이며, 배송비 항목은 제외했습니다. 새 견적서가
            나올 때마다 이 테이블에 품목이 추가되는 방식으로 갱신됩니다(자동 업로드 기능은 아직 없음).
          </p>
          <p>
            2025년 견적서는 아직 반영되어 있지 않습니다(iCloud 미다운로드 상태로 읽지 못했던 파일들). 2026년
            견적서 기준으로만 집계됩니다.
          </p>
          <p>
            패들 세부 라인 분류는 품목명 기준 규칙 분류이며, 상품 마스터(products.category/subcategory)의
            Champion/Edge/Pro 3단계 체계와는 다른 별도 체계입니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

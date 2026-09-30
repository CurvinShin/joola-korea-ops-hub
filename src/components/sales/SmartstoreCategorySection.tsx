import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Table, Thead, Tr, Th, Td } from "@/components/ui/Table";
import { SmartstoreCharts } from "@/components/sales/SmartstoreCharts";
import { TOP_CATEGORIES, PADDLE_SUBS, type SmartstoreCategoryReport } from "@/lib/reports/productCategoryReport";

const numberFmt = (n: number) => new Intl.NumberFormat("ko-KR").format(n);
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

// "스마트스토어" 탭 — 주문조회 엑셀 업로드 기반, 수량 기준 분석 (금액 데이터
// 없음). 아직 한 번도 업로드하지 않았으면(hasData=false) 안내 메시지만 보여준다.
export function SmartstoreCategorySection({ smartstoreReport }: { smartstoreReport: SmartstoreCategoryReport }) {
  if (!smartstoreReport.hasData) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-slate-500">
          아직 업로드된 스마트스토어 데이터가 없습니다. 위 &ldquo;스마트스토어 주문조회 최신화&rdquo;에서
          파일을 올려주세요.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">
        스마트스토어 주문조회 내보내기에는 판매 금액이 없어 수량 기준으로만 보여줍니다. 딜러 데이터와는
        서로 다른 소스입니다.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="누계 판매 수량" value={`${numberFmt(smartstoreReport.totalQuantity)}개`} hint="취소·반품 제외" />
        <KpiCard
          label="패들 비중"
          value={
            smartstoreReport.totalQuantity > 0
              ? pct(smartstoreReport.paddleQuantity / smartstoreReport.totalQuantity)
              : "-"
          }
          hint={`${numberFmt(smartstoreReport.paddleQuantity)}개`}
        />
        <KpiCard
          label="최근 주문일"
          value={smartstoreReport.lastOrderDate ?? "-"}
          hint={`제외된 주문(취소·반품 등) ${numberFmt(smartstoreReport.excludedCount)}건`}
        />
        <KpiCard
          label="미분류 품목"
          value={`${numberFmt(smartstoreReport.unclassifiedCount)}건`}
          tone={smartstoreReport.unclassifiedCount > 0 ? "warning" : "default"}
          hint={smartstoreReport.unclassifiedCount > 0 ? "새 상품명 — 분류 규칙 보강 필요" : "전부 분류됨"}
        />
      </div>

      <SmartstoreCharts
        pieData={[...TOP_CATEGORIES, "미분류"]
          .map((cat) => ({ name: cat, value: smartstoreReport.byCategory.get(cat) ?? 0 }))
          .filter((d) => d.value > 0)}
        paddleBarData={PADDLE_SUBS.map((sub) => ({
          name: sub,
          qty: smartstoreReport.byPaddleSub.get(sub) ?? 0,
        })).filter((d) => d.qty > 0)}
        monthBarData={smartstoreReport.months.map((m) => {
          const entry: Record<string, string | number> = { month: m };
          for (const cat of [...TOP_CATEGORIES, "미분류"]) {
            entry[cat] = smartstoreReport.byMonthCategory.get(m)?.get(cat) ?? 0;
          }
          return entry;
        })}
        categories={[...TOP_CATEGORIES, "미분류"]}
      />

      <Card>
        <CardHeader>
          <CardTitle>스마트스토어 대분류별 판매 수량</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <Thead>
              <Tr>
                <Th>대분류</Th>
                <Th className="text-right">수량</Th>
                <Th className="text-right">비중</Th>
              </Tr>
            </Thead>
            <tbody>
              {[...TOP_CATEGORIES, "미분류"].map((cat) => {
                const qty = smartstoreReport.byCategory.get(cat) ?? 0;
                if (qty === 0) return null;
                return (
                  <Tr key={cat}>
                    <Td className="font-medium text-slate-900">{cat}</Td>
                    <Td className="text-right">{numberFmt(qty)}</Td>
                    <Td className="text-right">
                      {smartstoreReport.totalQuantity > 0 ? pct(qty / smartstoreReport.totalQuantity) : "-"}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>스마트스토어 베스트셀러 (상품별, 상위 15)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <Thead>
              <Tr>
                <Th>상품명</Th>
                <Th>대분류</Th>
                <Th className="text-right">수량</Th>
              </Tr>
            </Thead>
            <tbody>
              {smartstoreReport.topProducts.map((p) => (
                <Tr key={p.productNo ?? p.productName}>
                  <Td className="text-slate-900">{p.productName}</Td>
                  <Td>{p.category}</Td>
                  <Td className="text-right">{numberFmt(p.quantity)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

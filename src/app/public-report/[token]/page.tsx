import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProductCategoryReport, getSmartstoreCategoryReport } from "@/lib/reports/productCategoryReport";
import { ProductCategoryReportView } from "@/components/sales/ProductCategoryReportView";
import { RefreshButton } from "@/components/ui/RefreshButton";

export const dynamic = "force-dynamic";

// 로그인 없이 열람 가능한 공개 보고서 페이지. 접근 제어는 전적으로 URL에 담긴
// token 하나뿐이다 — 이 링크를 아는 사람은 누구든 볼 수 있으므로, 이 링크는
// 비밀번호처럼 취급해서 필요한 사람에게만 직접 전달해야 한다(공개 채널에 올리지
// 말 것). 토큰이 유출됐다고 판단되면 PUBLIC_REPORT_TOKEN 환경변수 값을 바꾸고
// 재배포하면 새 링크로 즉시 교체된다(코드 변경 불필요).
export default async function PublicProductCategoryReportPage({ params }: { params: { token: string } }) {
  const expectedToken = process.env.PUBLIC_REPORT_TOKEN;
  if (!expectedToken || params.token !== expectedToken) {
    notFound();
  }

  const supabase = createAdminClient();
  const [report, smartstoreReport] = await Promise.all([
    getProductCategoryReport(supabase),
    getSmartstoreCategoryReport(supabase),
  ]);

  return (
    <main className="mx-auto min-h-screen max-w-6xl space-y-6 bg-slate-50 px-4 py-8 sm:px-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">JOOLA Korea 운영 허브</p>
          <h1 className="text-xl font-semibold text-slate-900">제품군 분석 보고서</h1>
          <p className="mt-1 text-sm text-slate-500">
            딜러 견적서 품목 데이터를 패들(세부 라인 포함)·공·악세사리·의류·신발로 분류한 판매 현황입니다.
          </p>
        </div>
        <RefreshButton />
      </div>

      <ProductCategoryReportView report={report} smartstoreReport={smartstoreReport} />

      <p className="pt-2 text-center text-[11px] text-slate-400">
        이 페이지는 비공개 링크로만 열람 가능합니다 · 외부 공유 시 주의해주세요
      </p>
    </main>
  );
}

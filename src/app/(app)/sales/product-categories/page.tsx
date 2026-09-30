import { createClient } from "@/lib/supabase/server";
import { getProductCategoryReport, getSmartstoreCategoryReport } from "@/lib/reports/productCategoryReport";
import { ProductCategoryReportView } from "@/components/sales/ProductCategoryReportView";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SmartstoreUploadForm } from "@/components/sales/SmartstoreUploadForm";

export const dynamic = "force-dynamic";

export default async function ProductCategoriesPage() {
  const supabase = createClient();
  const [report, smartstoreReport] = await Promise.all([
    getProductCategoryReport(supabase),
    getSmartstoreCategoryReport(supabase),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">제품군 분석</h1>
          <p className="text-sm text-slate-500">
            딜러 견적서 품목 데이터를 패들(세부 라인 포함)·공·악세사리·의류·신발로 분류해 보여줍니다. 새 견적서가
            반영될 때마다 이 페이지도 함께 갱신됩니다.
          </p>
        </div>
        <RefreshButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>스마트스토어 주문조회 최신화</CardTitle>
        </CardHeader>
        <CardContent>
          <SmartstoreUploadForm />
        </CardContent>
      </Card>

      <ProductCategoryReportView report={report} smartstoreReport={smartstoreReport} />
    </div>
  );
}

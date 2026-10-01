import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SmartstoreSettlementTool, type ProductCandidate } from "@/components/sales/SmartstoreSettlementTool";
import type { SkuMapRow } from "@/lib/actions/smartstore-settlement";

export const dynamic = "force-dynamic";

export default async function SmartstoreSettlementPage() {
  const supabase = createClient();
  const [{ data, error }, { data: productRows }] = await Promise.all([
    supabase.from("smartstore_sku_map").select("*").order("product_name", { ascending: true }),
    // SKU 매핑 추가 시 "후보 상품" 목록을 보여주는 데 쓴다 — 기존 products
    // 테이블(딜러 카탈로그 등에 이미 쓰이는 SKU/영문명의 원천)을 그대로 재사용.
    supabase.from("products").select("sku, name, discontinued").order("name", { ascending: true }),
  ]);

  const skuMapRows = (data ?? []) as SkuMapRow[];
  const products = (productRows ?? []) as ProductCandidate[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">월말 정산 (스마트스토어)</h1>
        <p className="text-sm text-slate-500">
          매달 Jeff에게 전달하는 &ldquo;스마트스토어 수식 적용 내역&rdquo; 파일을 자동으로 만듭니다. SettleCaseByCase
          엑셀만 올리면, 수량과 상품명(SKU 포함)이 자동으로 채워집니다.
        </p>
      </div>

      {error && (
        <Card>
          <CardHeader>
            <CardTitle>오류</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-red-600">{error.message}</CardContent>
        </Card>
      )}

      <SmartstoreSettlementTool skuMapRows={skuMapRows} products={products} />
    </div>
  );
}

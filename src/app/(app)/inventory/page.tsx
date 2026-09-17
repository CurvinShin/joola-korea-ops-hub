import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createProduct, updateProduct, deleteProduct } from "@/lib/actions/inventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ProductForm } from "@/components/inventory/ProductForm";
import { InventoryBrowser } from "@/components/inventory/InventoryBrowser";

export const dynamic = "force-dynamic";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: { q?: string; new?: string; edit?: string; category?: string; subcategory?: string };
}) {
  const supabase = createClient();
  let query = supabase.from("inventory_status").select("*").order("name");
  if (searchParams.category) {
    query = query.eq("category", searchParams.category);
  }
  if (searchParams.subcategory) {
    query = query.eq("subcategory", searchParams.subcategory);
  }
  const { data: rows, error } = await query;

  // 필터 드롭다운에 쓸 카테고리 전체 목록 — 지금 필터링된 결과와 무관하게 항상 전체
  // 선택지가 보이도록 products 테이블에서 따로 조회한다.
  const { data: categoryRows } = await supabase.from("products").select("category").not("category", "is", null);
  const categories = Array.from(new Set((categoryRows ?? []).map((r) => r.category as string))).sort();

  // 카테고리 빠른 필터(원클릭 탭)용 카테고리별 개수
  const categoryCounts: Record<string, number> = {};
  for (const r of categoryRows ?? []) {
    const cat = r.category as string | null;
    if (cat) categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
  }
  const { count: totalProductCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true });

  // 서브카테고리는 선택된 카테고리 안에서만 의미가 있으므로, 카테고리가 선택된
  // 경우에만 그 안의 서브카테고리 목록을 조회한다.
  let subcategories: string[] = [];
  if (searchParams.category) {
    const { data: subcategoryRows } = await supabase
      .from("products")
      .select("subcategory")
      .eq("category", searchParams.category)
      .not("subcategory", "is", null);
    subcategories = Array.from(new Set((subcategoryRows ?? []).map((r) => r.subcategory as string))).sort();
  }

  const editRow = searchParams.edit ? rows?.find((r) => r.product_id === searchParams.edit) : undefined;

  const { count: gapCount } = await supabase
    .from("catalog_gaps")
    .select("id", { count: "exact", head: true });

  const { count: backorderCount } = await supabase
    .from("inventory_status")
    .select("product_id", { count: "exact", head: true })
    .lt("current_stock", 0);

  const { data: lastSnapshot } = await supabase
    .from("inventory_snapshots")
    .select("snapshot_at")
    .order("snapshot_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">재고</h1>
          <p className="text-sm text-slate-500">재고 수량, 입고 예정, 재고 부족 알림입니다.</p>
          {lastSnapshot && (
            <p className="mt-0.5 text-xs text-slate-400">
              마지막 재고 최신화:{" "}
              {new Intl.DateTimeFormat("ko-KR", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Asia/Seoul",
              }).format(new Date(lastSnapshot.snapshot_at))}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href="/inventory/refresh">
            <Button variant="secondary">재고 최신화</Button>
          </Link>
          <Link href="/inventory?new=1">
            <Button>제품 추가</Button>
          </Link>
        </div>
      </div>

      {!!gapCount && (
        <Link
          href="/inventory/unmatched"
          className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 hover:bg-amber-100"
        >
          <span>카탈로그 미매칭 재고 {gapCount}건 — 가격/유형 정보가 없어 제품으로 등록하지 못한 품목이 있습니다</span>
          <span className="font-medium">보기 →</span>
        </Link>
      )}

      {!!backorderCount && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span>
            백오더(재고 마이너스) {backorderCount}건 — 딜러 주문 입금 확인 시 재고가 부족해도 차감되어 마이너스로
            내려간 품목입니다. 이지어드민에서 자동 발주가 걸리지 않았다면 직접 발주해주세요.
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Link
          href={{ pathname: "/inventory", query: searchParams.q ? { q: searchParams.q } : {} }}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            !searchParams.category
              ? "bg-brand-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          전체 ({totalProductCount ?? 0})
        </Link>
        {categories.map((c) => (
          <Link
            key={c}
            href={{
              pathname: "/inventory",
              query: searchParams.q ? { q: searchParams.q, category: c } : { category: c },
            }}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              searchParams.category === c
                ? "bg-brand-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {c} ({categoryCounts[c] ?? 0})
          </Link>
        ))}
      </div>

      {searchParams.category && subcategories.length > 0 && (
        <form className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="category" value={searchParams.category ?? ""} />
          <select
            name="subcategory"
            defaultValue={searchParams.subcategory ?? ""}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            <option value="">전체 서브카테고리</option>
            {subcategories.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <Button type="submit" variant="secondary">
            적용
          </Button>
          {(searchParams.category || searchParams.subcategory) && (
            <Link href="/inventory" className="text-xs text-slate-400 hover:underline">
              필터 초기화
            </Link>
          )}
        </form>
      )}

      <Card>
        <CardHeader>
          <CardTitle>제품 {rows?.length ?? 0}개</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && <p className="p-5 text-sm text-red-600">{error.message}</p>}
          {rows && rows.length > 0 ? (
            <div className="p-4">
              <InventoryBrowser rows={rows} deleteProduct={deleteProduct} />
            </div>
          ) : (
            <p className="p-8 text-center text-sm text-slate-400">등록된 제품이 없습니다.</p>
          )}
        </CardContent>
      </Card>

      {searchParams.new && (
        <Modal title="제품 추가" closeHref="/inventory">
          <ProductForm action={createProduct} />
        </Modal>
      )}

      {editRow && (
        <Modal title={`${editRow.name} 수정`} closeHref="/inventory">
          <ProductForm action={updateProduct.bind(null, editRow.product_id)} defaultValues={editRow} />
        </Modal>
      )}
    </div>
  );
}

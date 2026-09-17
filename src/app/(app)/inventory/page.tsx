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
  searchParams: { new?: string; edit?: string };
}) {
  const supabase = createClient();

  // 카테고리·서브카테고리·검색은 모두 InventoryBrowser 안에서 즉시(클라이언트 사이드)
  // 처리하므로, 여기서는 전체 목록을 한 번만 불러온다 (제품 수가 많지 않아 충분히 빠름).
  const { data: rows, error } = await supabase.from("inventory_status").select("*").order("name");

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

      <Card>
        <CardHeader>
          <CardTitle>제품 {rows?.length ?? 0}개</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && <p className="p-5 text-sm text-red-600">{error.message}</p>}
          {rows && rows.length > 0 ? (
            <div className="space-y-4 p-4">
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

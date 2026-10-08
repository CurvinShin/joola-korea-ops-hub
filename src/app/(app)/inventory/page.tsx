import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createProduct, createProductFromGap, updateProduct, deleteProduct } from "@/lib/actions/inventory";
import { dismissCatalogGap } from "@/lib/actions/catalog-gaps";
import { extractLeadingCode } from "@/lib/utils/stock-refresh";
import type { CatalogGap } from "@/lib/types/database.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ProductForm } from "@/components/inventory/ProductForm";
import { InventoryBrowser, INVENTORY_STATUSES, type InventoryStatus } from "@/components/inventory/InventoryBrowser";

export const dynamic = "force-dynamic";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: { new?: string; edit?: string; status?: string; register?: string };
}) {
  const supabase = createClient();

  // 상태 탭(?status=)은 주소에 담겨 있어서 배너·탭 링크로 바로 열리고 새로고침해도 유지된다.
  const status: InventoryStatus = INVENTORY_STATUSES.includes(searchParams.status as InventoryStatus)
    ? (searchParams.status as InventoryStatus)
    : "all";
  const listHref = status === "all" ? "/inventory" : `/inventory?status=${status}`;

  // 카테고리·서브카테고리·검색은 모두 InventoryBrowser 안에서 즉시(클라이언트 사이드)
  // 처리하므로, 여기서는 전체 목록을 한 번만 불러온다 (제품 수가 많지 않아 충분히 빠름).
  const { data: rows, error } = await supabase.from("inventory_status").select("*").order("name");

  const editRow = searchParams.edit ? rows?.find((r) => r.product_id === searchParams.edit) : undefined;

  // "신제품" 영역 — new_arrival_batch가 채워진 상품 중 가장 최근 날짜와
  // 같은 상품만 보여준다. 다음 배치가 더 최근 날짜로 등록되면 이전 배치는
  // 조건을 만족하지 못해 자동으로 빠진다 (수동 정리 불필요).
  const latestBatch = (rows ?? []).reduce<string | null>((latest, r) => {
    if (!r.new_arrival_batch) return latest;
    return !latest || r.new_arrival_batch > latest ? r.new_arrival_batch : latest;
  }, null);
  const newArrivals = latestBatch ? (rows ?? []).filter((r) => r.new_arrival_batch === latestBatch) : [];

  const { data: gapRows } = await supabase.from("catalog_gaps").select("*").order("qty", { ascending: false });
  const gaps = (gapRows ?? []) as CatalogGap[];
  const gapCount = gaps.length;

  const backorderCount = (rows ?? []).filter((r) => r.current_stock < 0).length;

  const registerGap = searchParams.register ? gaps.find((g) => g.id === searchParams.register) : undefined;
  const registerDefaults = registerGap
    ? (() => {
        const { brandSku, productName } = extractLeadingCode(registerGap.source_name);
        return { sku: brandSku ?? "", name: productName, current_stock: registerGap.qty };
      })()
    : undefined;

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

      {!!gapCount && status !== "gaps" && (
        <Link
          href="/inventory?status=gaps"
          className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 hover:bg-amber-100"
        >
          <span>카탈로그 미매칭 재고 {gapCount}건 — 가격/유형 정보가 없어 제품으로 등록하지 못한 품목이 있습니다</span>
          <span className="font-medium">보기 →</span>
        </Link>
      )}

      {newArrivals.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge tone="blue">신제품</Badge>
              <span>
                {new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeZone: "Asia/Seoul" }).format(
                  new Date(latestBatch as string)
                )}{" "}
                등록 ({newArrivals.length}종)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {newArrivals.map((r) => (
                <Link
                  key={r.product_id}
                  href={`/inventory?edit=${r.product_id}`}
                  className="flex items-center gap-3 rounded-lg border border-blue-100 bg-white px-3 py-2.5 hover:border-blue-300"
                >
                  {r.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.image_url} alt={r.name} loading="lazy" className="h-11 w-11 rounded object-cover" />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] text-slate-400">
                      없음
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{r.name}</p>
                    <p className="text-xs text-slate-400">
                      {r.sku}
                      {r.category && <span> · {r.category}</span>}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!!backorderCount && status !== "backorder" && (
        <Link
          href="/inventory?status=backorder"
          className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 hover:bg-red-100"
        >
          <span>
            백오더(재고 마이너스) {backorderCount}건 — 딜러 주문 입금 확인 시 재고가 부족해도 차감되어 마이너스로
            내려간 품목입니다. 이지어드민에서 자동 발주가 걸리지 않았다면 직접 발주해주세요.
          </span>
          <span className="shrink-0 pl-3 font-medium">보기 →</span>
        </Link>
      )}

      <Card>
        <CardHeader>
          <CardTitle>제품 {rows?.length ?? 0}개</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && <p className="p-5 text-sm text-red-600">{error.message}</p>}
          {rows && rows.length > 0 ? (
            <div className="space-y-4 p-4">
              <InventoryBrowser rows={rows} gaps={gaps} status={status} deleteProduct={deleteProduct} dismissGap={dismissCatalogGap} />
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

      {registerGap && registerDefaults && (
        <Modal title="미매칭 재고를 제품으로 등록" closeHref="/inventory?status=gaps">
          <div className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <p>실사 원본: {registerGap.source_name}</p>
            <p>실사 수량 {registerGap.qty}개 · 내부관리코드 {registerGap.source_sku ?? "—"}</p>
            <p className="mt-1 text-slate-400">
              상품코드·제품명·재고를 채워 두었습니다. 카테고리, 상품 구분(가격 공식)과 사진을 확인하고 저장하면 제품으로
              등록되면서 이 미매칭 목록에서 자동으로 빠집니다.
            </p>
          </div>
          <ProductForm action={createProductFromGap.bind(null, registerGap.id)} defaultValues={registerDefaults} />
        </Modal>
      )}

      {editRow && (
        <Modal title={`${editRow.name} 수정`} closeHref={listHref}>
          <ProductForm action={updateProduct.bind(null, editRow.product_id)} defaultValues={editRow} />
        </Modal>
      )}
    </div>
  );
}

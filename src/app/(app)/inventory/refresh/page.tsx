import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StockRefreshForm } from "@/components/inventory/StockRefreshForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(iso));
}

export default async function StockRefreshPage() {
  const supabase = createClient();
  const { data: lastSnapshot } = await supabase
    .from("inventory_snapshots")
    .select("*")
    .order("snapshot_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/inventory" className="text-sm text-brand-600 hover:underline">
          ← 재고로 돌아가기
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">재고 최신화</h1>
        <p className="text-sm text-slate-500">
          이지어드민에서 내려받은 &ldquo;현재고조회&rdquo; 실사 엑셀을 올리면 브랜드 상품번호로 자동
          매칭해서 재고 수량을 갱신합니다. 매칭 안 되는 품목은 &ldquo;카탈로그 미매칭 재고&rdquo;
          게시판에 반영됩니다.
        </p>
      </div>

      {lastSnapshot && (
        <Card>
          <CardHeader>
            <CardTitle>마지막 최신화</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-slate-600">
            <p>실사 기준일시: {formatDateTime(lastSnapshot.snapshot_at)}</p>
            <p>
              파일: {lastSnapshot.filename} · 재고 갱신 {lastSnapshot.matched_count}건 · 미매칭 갱신{" "}
              {lastSnapshot.gap_updated_count}건 · 신규 미매칭 {lastSnapshot.gap_new_count}건
            </p>
            {lastSnapshot.uploaded_by && <p className="text-slate-400">처리: {lastSnapshot.uploaded_by}</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>새 실사 파일 업로드</CardTitle>
        </CardHeader>
        <CardContent>
          <StockRefreshForm />
        </CardContent>
      </Card>
    </div>
  );
}

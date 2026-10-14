import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { groupAssetsByCategory, type MarketingAssetRow } from "@/lib/utils/marketing-assets";

export const dynamic = "force-dynamic";

export default async function DealerAssetsPage() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("marketing_assets")
    .select("id, title, category, url, description, audience, sort_order")
    .eq("audience", "dealers")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(500);
  const rows = (data ?? []) as unknown as MarketingAssetRow[];
  const groups = groupAssetsByCategory(rows);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">마케팅 에셋</h1>
        <p className="text-sm text-slate-500">
          제품 이미지, 브로셔, 로고 등 판매에 활용하실 수 있는 자료입니다. 제목을 누르면 다운로드 페이지가 열립니다.
        </p>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error.message}</p>}
      {groups.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">아직 등록된 자료가 없습니다.</p>
      ) : (
        groups.map((g) => (
          <Card key={g.category}>
            <CardHeader>
              <CardTitle>{g.category}</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100 p-0">
              {g.items.map((r) => (
                <div key={r.id} className="space-y-1 px-5 py-3">
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand-700 hover:underline">
                    {r.title} ↗
                  </a>
                  {r.description && <p className="whitespace-pre-line text-xs text-slate-500">{r.description}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

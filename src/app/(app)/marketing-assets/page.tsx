import { createClient } from "@/lib/supabase/server";
import { createMarketingAsset, updateMarketingAsset, deleteMarketingAsset } from "@/lib/actions/marketing-assets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import {
  ASSET_AUDIENCE_LABEL,
  ASSET_CATEGORY_SUGGESTIONS,
  groupAssetsByCategory,
  type MarketingAssetRow,
} from "@/lib/utils/marketing-assets";

export const dynamic = "force-dynamic";

function AssetFields({ row }: { row?: MarketingAssetRow }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>제목</Label>
          <Input name="title" defaultValue={row?.title ?? ""} maxLength={120} required />
        </div>
        <div>
          <Label>분류</Label>
          <Input name="category" list="asset-categories" defaultValue={row?.category ?? "제품 이미지"} maxLength={40} required />
          <datalist id="asset-categories">
            {ASSET_CATEGORY_SUGGESTIONS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
      </div>
      <div>
        <Label>다운로드 링크</Label>
        <Input name="url" defaultValue={row?.url ?? ""} placeholder="https://..." required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>설명 (선택)</Label>
          <Textarea name="description" rows={2} defaultValue={row?.description ?? ""} maxLength={500} />
        </div>
        <div>
          <Label>공개 범위</Label>
          <Select name="audience" defaultValue={row?.audience ?? "dealers"}>
            <option value="dealers">딜러 공개 (딜러에게도 보임)</option>
            <option value="internal">내부용 (관리자만)</option>
          </Select>
        </div>
      </div>
    </div>
  );
}

export default async function MarketingAssetsPage({ searchParams }: { searchParams: { error?: string } }) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("marketing_assets")
    .select("id, title, category, url, description, audience, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(1000);
  const rows = (data ?? []) as unknown as MarketingAssetRow[];
  const groups = groupAssetsByCategory(rows);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">마케팅 에셋</h1>
        <p className="text-sm text-slate-500">
          제품 이미지, 브로셔, 로고, 영상 등 다운로드 링크(구글 드라이브, 드롭박스 등)를 한곳에 모아 둡니다. &ldquo;딜러
          공개&rdquo;로 둔 링크는 딜러 화면의 &ldquo;마케팅 에셋&rdquo; 메뉴에도 나타나 딜러가 직접 내려받을 수 있습니다.
        </p>
      </div>

      {searchParams.error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{searchParams.error}</p>}
      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error.message}</p>}

      <Card>
        <CardHeader>
          <CardTitle>새 링크 추가</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createMarketingAsset} className="space-y-3">
            <AssetFields />
            <Button type="submit">링크 추가</Button>
          </form>
        </CardContent>
      </Card>

      {groups.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">등록된 링크가 없습니다.</p>
      ) : (
        groups.map((g) => (
          <Card key={g.category}>
            <CardHeader>
              <CardTitle>
                {g.category} ({g.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100 p-0">
              {g.items.map((r) => (
                <div key={r.id} className="space-y-1.5 px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand-700 hover:underline">
                      {r.title} ↗
                    </a>
                    <Badge tone={r.audience === "dealers" ? "purple" : "slate"}>{ASSET_AUDIENCE_LABEL[r.audience]}</Badge>
                  </div>
                  {r.description && <p className="whitespace-pre-line text-xs text-slate-500">{r.description}</p>}
                  <p className="break-all text-[11px] text-slate-400">{r.url}</p>
                  <details className="text-sm">
                    <summary className="cursor-pointer text-xs text-brand-600 hover:underline">수정 / 삭제</summary>
                    <div className="mt-3 space-y-3 rounded-lg bg-slate-50 p-4">
                      <form action={updateMarketingAsset.bind(null, r.id)} className="space-y-3">
                        <AssetFields row={r} />
                        <Button type="submit" size="sm">
                          수정 저장
                        </Button>
                      </form>
                      <form action={deleteMarketingAsset.bind(null, r.id)}>
                        <button className="text-xs text-red-600 hover:underline">이 링크 삭제</button>
                      </form>
                    </div>
                  </details>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

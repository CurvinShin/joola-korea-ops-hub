import { createClient } from "@/lib/supabase/server";
import { createAppUpdate, updateAppUpdate, deleteAppUpdate } from "@/lib/actions/app-updates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import {
  UPDATE_AUDIENCE_LABEL,
  UPDATE_KIND_LABEL,
  UPDATE_KIND_TONE,
  groupUpdatesByMonth,
  monthTitle,
  type AppUpdateRow,
} from "@/lib/utils/app-updates";

export const dynamic = "force-dynamic";

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });

function UpdateFields({ row }: { row?: AppUpdateRow }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label>날짜</Label>
          <Input type="date" name="released_on" defaultValue={row?.released_on ?? today()} required />
        </div>
        <div>
          <Label>종류</Label>
          <Select name="kind" defaultValue={row?.kind ?? "new"}>
            <option value="new">새 기능</option>
            <option value="improved">개선</option>
            <option value="fixed">수정</option>
          </Select>
        </div>
        <div>
          <Label>공개 범위</Label>
          <Select name="audience" defaultValue={row?.audience ?? "internal"}>
            <option value="internal">내부용 (관리자만)</option>
            <option value="dealers">딜러 공개 (딜러에게도 보임)</option>
          </Select>
        </div>
      </div>
      <div>
        <Label>제목</Label>
        <Input name="title" defaultValue={row?.title ?? ""} maxLength={120} required />
      </div>
      <div>
        <Label>내용</Label>
        <Textarea name="body" rows={4} defaultValue={row?.body ?? ""} maxLength={3000} />
      </div>
    </div>
  );
}

export default async function UpdatesPage({ searchParams }: { searchParams: { error?: string; audience?: string } }) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("app_updates")
    .select("id, released_on, kind, audience, title, body")
    .order("released_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);

  const all = (data ?? []) as unknown as AppUpdateRow[];
  const filter = searchParams.audience === "internal" || searchParams.audience === "dealers" ? searchParams.audience : "all";
  const rows = filter === "all" ? all : all.filter((r) => r.audience === filter);
  const months = groupUpdatesByMonth(rows);

  const tab = (value: string, label: string, count: number) => (
    <a
      key={value}
      href={value === "all" ? "/updates" : `/updates?audience=${value}`}
      className={`rounded-full border px-3 py-1 text-sm ${
        filter === value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label} {count}
    </a>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">업데이트 기록</h1>
        <p className="text-sm text-slate-500">
          Hub에 추가·수정된 기능을 모아 둔 기록입니다. 항목마다 &ldquo;내부용&rdquo;과 &ldquo;딜러 공개&rdquo;를 고를 수 있고, 딜러 공개로 표시한
          항목은 딜러 화면의 &ldquo;업데이트 소식&rdquo;에도 나타납니다. 딜러에게 보이는 글에는 내부 작업 내용을 적지 마세요.
        </p>
      </div>

      {searchParams.error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{searchParams.error}</p>}
      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error.message}</p>}

      <Card>
        <CardHeader>
          <CardTitle>새 기록 추가</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAppUpdate} className="space-y-3">
            <UpdateFields />
            <Button type="submit">기록 추가</Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {tab("all", "전체", all.length)}
        {tab("dealers", "딜러 공개", all.filter((r) => r.audience === "dealers").length)}
        {tab("internal", "내부용", all.filter((r) => r.audience === "internal").length)}
      </div>

      {months.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">기록이 없습니다.</p>
      ) : (
        months.map((m) => (
          <Card key={m.month}>
            <CardHeader>
              <CardTitle>{monthTitle(m.month)}</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100 p-0">
              {m.items.map((r) => (
                <div key={r.id} className="space-y-2 px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs tabular-nums text-slate-400">{r.released_on}</span>
                    <Badge tone={UPDATE_KIND_TONE[r.kind] ?? "slate"}>{UPDATE_KIND_LABEL[r.kind] ?? r.kind}</Badge>
                    <Badge tone={r.audience === "dealers" ? "purple" : "slate"}>{UPDATE_AUDIENCE_LABEL[r.audience]}</Badge>
                    <span className="text-sm font-medium text-slate-900">{r.title}</span>
                  </div>
                  {r.body && <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{r.body}</p>}
                  <details className="text-sm">
                    <summary className="cursor-pointer text-brand-600 hover:underline">수정 / 삭제</summary>
                    <div className="mt-3 space-y-3 rounded-lg bg-slate-50 p-4">
                      <form action={updateAppUpdate.bind(null, r.id)} className="space-y-3">
                        <UpdateFields row={r} />
                        <Button type="submit" size="sm">
                          수정 저장
                        </Button>
                      </form>
                      <form action={deleteAppUpdate.bind(null, r.id)}>
                        <button className="text-xs text-red-600 hover:underline">이 기록 삭제</button>
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

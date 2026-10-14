import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  UPDATE_KIND_LABEL,
  UPDATE_KIND_TONE,
  groupUpdatesByMonth,
  monthTitle,
  type AppUpdateRow,
} from "@/lib/utils/app-updates";

export const dynamic = "force-dynamic";

export default async function DealerUpdatesPage() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("app_updates")
    .select("id, released_on, kind, audience, title, body")
    .eq("audience", "dealers")
    .order("released_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(300);
  const rows = (data ?? []) as unknown as AppUpdateRow[];
  const months = groupUpdatesByMonth(rows);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">업데이트 소식</h1>
        <p className="text-sm text-slate-500">주문 페이지에 새로 추가되거나 바뀐 기능을 모아 두었습니다.</p>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error.message}</p>}
      {months.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">아직 등록된 소식이 없습니다.</p>
      ) : (
        months.map((m) => (
          <Card key={m.month}>
            <CardHeader>
              <CardTitle>{monthTitle(m.month)}</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100 p-0">
              {m.items.map((r) => (
                <div key={r.id} className="space-y-1.5 px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs tabular-nums text-slate-400">{r.released_on}</span>
                    <Badge tone={UPDATE_KIND_TONE[r.kind] ?? "slate"}>{UPDATE_KIND_LABEL[r.kind] ?? r.kind}</Badge>
                    <span className="text-sm font-medium text-slate-900">{r.title}</span>
                  </div>
                  {r.body && <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{r.body}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

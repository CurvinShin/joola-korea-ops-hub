import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

const size = (n: number | null) => (n ? `${(n / 1024 / 1024).toFixed(1)}MB` : "");

export default async function DealerOrderListPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("dealer_id")
    .eq("id", user?.id ?? "")
    .single();

  if (!profile?.dealer_id) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <p className="text-sm text-slate-500">딜러 계정으로 로그인하면 오더리스트를 내려받을 수 있습니다.</p>
      </div>
    );
  }

  const [{ data: dealer }, { data: files }] = await Promise.all([
    supabase.from("dealers").select("name, discount_rate").eq("id", profile.dealer_id).single(),
    // RLS가 "내 등급 + 게시일이 지난" 파일만 돌려준다.
    supabase
      .from("order_list_files")
      .select("id, title, tier, visible_from, effective_on, file_name, file_size, created_at")
      .order("visible_from", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const rate = Number(dealer?.discount_rate ?? 0);
  const list = files ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">오더리스트 다운로드</h1>
        <p className="text-sm text-slate-500">
          {dealer?.name ?? "딜러"}님의 등급(할인율 {rate}%)에 맞는 오더리스트(엑셀)입니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>내 등급 오더리스트</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {list.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">
              아직 내려받을 수 있는 오더리스트가 없습니다. 준비되면 이곳에 올라옵니다.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {list.map((f, i) => (
                <li key={f.id} className="flex items-center justify-between gap-3 px-5 py-4 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      {f.title}
                      {i === 0 && (
                        <span className="ml-2 align-middle">
                          <Badge tone="green">최신</Badge>
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      {f.effective_on ? `${f.effective_on} 시행 · ` : ""}게시 {f.visible_from}
                      {f.file_size ? ` · ${size(f.file_size)}` : ""}
                    </p>
                  </div>
                  <a
                    href={`/order/order-list/${f.id}/download`}
                    className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                  >
                    다운로드
                  </a>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-slate-400">
        파일이 크면 내려받는 데 시간이 걸릴 수 있습니다. 가격은 시행일부터 주문 화면에 자동으로 반영됩니다.
      </p>
    </div>
  );
}

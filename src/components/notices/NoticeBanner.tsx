import { createClient } from "@/lib/supabase/server";
import { acknowledgeNotice } from "@/lib/actions/notices";

/**
 * 딜러 주문 화면(/order) 맨 위에 붙는 "약한 확인" 배너. site_notices의
 * select RLS가 이미 "활성 + 게시 기간 + 이 딜러가 대상인지"를 전부
 * 걸러주므로, 여기서는 그 결과에서 이 딜러가 아직 확인 안 한 것만
 * 추려서 보여주면 된다. "확인"을 누르지 않아도 주문 자체는 그대로
 * 진행할 수 있다 — 클릭 여부는 관리자 화면(공지사항 목록)에서 추적용으로만
 * 쓰인다.
 */
export async function NoticeBanner({ dealerId }: { dealerId: string }) {
  const supabase = createClient();

  const [{ data: notices }, { data: acked }] = await Promise.all([
    supabase.from("site_notices").select("id, title, body").order("publish_on", { ascending: false }),
    supabase.from("notice_acknowledgments").select("notice_id").eq("dealer_id", dealerId),
  ]);

  const ackedIds = new Set((acked ?? []).map((a) => a.notice_id));
  const unacknowledged = (notices ?? []).filter((n) => !ackedIds.has(n.id));

  if (unacknowledged.length === 0) return null;

  return (
    <div className="space-y-3">
      {unacknowledged.map((n) => (
        <div key={n.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-amber-900">{n.title}</p>
              <p className="mt-1 whitespace-pre-line text-sm text-amber-800">{n.body}</p>
            </div>
            <form action={acknowledgeNotice.bind(null, n.id)}>
              <button
                type="submit"
                className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
              >
                확인
              </button>
            </form>
          </div>
        </div>
      ))}
    </div>
  );
}

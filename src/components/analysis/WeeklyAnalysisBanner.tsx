import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// 월요일 자동 분석 결과가 나왔고 아직 "확인했어요"를 누르지 않았을 때만 화면 위쪽에 뜨는 알림.
// 표(quote_analysis_reports)가 아직 없거나 읽기에 실패하면 아무것도 그리지 않는다(다른 화면을 막지 않는다).
export async function WeeklyAnalysisBanner() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("quote_analysis_reports")
      .select("id, generated_at, data_through, is_stale")
      .is("acknowledged_at", null)
      .order("generated_at", { ascending: false })
      .limit(1);
    if (error || !data || data.length === 0) return null;
    const r = data[0] as { id: string; generated_at: string; data_through: string | null; is_stale: boolean };
    const when = new Date(r.generated_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric" });
    return (
      <div className="border-b border-blue-200 bg-blue-50 px-6 py-3 text-sm text-blue-900">
        <span className="font-medium">견적서 분석 결과가 나왔습니다</span>
        <span className="ml-2 text-blue-800">
          ({when} 분석 · 견적서 {r.data_through ?? "-"}일분까지 반영)
        </span>
        {r.is_stale && (
          <span className="ml-2 text-amber-800">
            · 최근 견적서가 아직 반영되지 않아 결과가 오래된 데이터 기준입니다
          </span>
        )}
        <Link href="/sales/listing-priority" className="ml-3 font-medium underline">
          확인하러 가기
        </Link>
      </div>
    );
  } catch {
    return null;
  }
}

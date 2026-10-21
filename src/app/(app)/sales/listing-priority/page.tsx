import { createClient } from "@/lib/supabase/server";
import { buildListingPriority, MIN_DEALERS, RECENT_WINDOW_DAYS } from "@/lib/analysis/listing-priority";
import { fetchAllQuoteItems, fetchListedKeys, latestReportRanks, daysBetween, seoulToday } from "@/lib/analysis/report-service";
import {
  acknowledgeAnalysisReport,
  markFamiliesListed,
  runListingAnalysisNow,
  unacknowledgeAnalysisReport,
  unmarkFamilyListed,
} from "@/lib/actions/listing-priority";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StoreProductUploadForm } from "@/components/analysis/StoreProductUploadForm";
import { CandidateTable } from "@/components/analysis/CandidateTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

const dateKst = (iso: string) => new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

export default async function ListingPriorityPage({
  searchParams,
}: {
  searchParams: { error?: string; ok?: string };
}) {
  const supabase = createClient();

  const [{ data: allowed }, rows, listedKeys, previousRanks, listedRes, reportRes] = await Promise.all([
    supabase.rpc("can_write"),
    fetchAllQuoteItems(supabase),
    fetchListedKeys(supabase),
    latestReportRanks(supabase),
    supabase.from("smartstore_listed_families").select("family_key, label, marked_at, source").order("label"),
    supabase
      .from("quote_analysis_reports")
      .select("id, generated_at, data_through, is_stale, acknowledged_at")
      .order("generated_at", { ascending: false })
      .limit(1),
  ]);
  const isAdmin = allowed === true;
  const result = buildListingPriority(rows, { listedKeys, previousRanks });
  const listed = (listedRes.data ?? []) as { family_key: string; label: string; marked_at: string; source: string }[];
  const report = (reportRes.data?.[0] ?? null) as {
    id: string;
    generated_at: string;
    data_through: string | null;
    is_stale: boolean;
    acknowledged_at: string | null;
  } | null;

  const today = seoulToday();
  const lag = result.dataThrough ? daysBetween(result.dataThrough, today) : null;
  const top = result.candidates.slice(0, 30);
  const exclusive = result.excluded.filter((e) => e.reason === "exclusive").sort((a, b) => b.quantity - a.quantity);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">스마트스토어 입점 우선순위</h1>
        <p className="text-sm text-slate-500">
          딜러 견적서에서 많이 팔린 제품군 중 아직 스마트스토어에 올라가지 않은 제품을 순위로 보여 줍니다. 매주 월요일
          오전 10시(한국 시간)에 자동으로 분석하고, 결과가 나오면 화면 위쪽에 알림이 뜹니다.
        </p>
      </div>

      {searchParams.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{searchParams.error}</div>
      )}
      {searchParams.ok && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{searchParams.ok}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>분석 상태</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <p>
            반영된 견적서: <b>{result.dataThrough ?? "없음"}</b>일분까지(품목 {result.itemCount.toLocaleString("ko-KR")}건)
            {lag !== null && lag > 7 && (
              <Badge tone="amber" className="ml-2">
                {lag}일 전 데이터 — 새 견적서를 반영하면 더 정확해집니다
              </Badge>
            )}
          </p>
          <p>
            마지막 자동 분석:{" "}
            {report ? (
              <>
                {dateKst(report.generated_at)}{" "}
                {report.acknowledged_at ? <Badge tone="green">확인 완료</Badge> : <Badge tone="blue">확인 대기</Badge>}
              </>
            ) : (
              "아직 없음(첫 분석 전)"
            )}
          </p>
          {isAdmin ? (
            <div className="flex flex-wrap gap-2">
              <form action={runListingAnalysisNow}>
                <Button type="submit" variant="secondary" size="sm">
                  지금 다시 분석
                </Button>
              </form>
              {report && !report.acknowledged_at && (
                <form action={acknowledgeAnalysisReport}>
                  <input type="hidden" name="report_id" value={report.id} />
                  <Button type="submit" size="sm">
                    확인했어요
                  </Button>
                </form>
              )}
              {report && report.acknowledged_at && (
                <form action={unacknowledgeAnalysisReport}>
                  <input type="hidden" name="report_id" value={report.id} />
                  <Button type="submit" variant="secondary" size="sm">
                    알림 다시 표시
                  </Button>
                </form>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500">분석 실행·확인 처리는 관리자만 할 수 있습니다.</p>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>스마트스토어 상품 목록으로 등록된 제품 걸러내기</CardTitle>
          </CardHeader>
          <CardContent>
            <StoreProductUploadForm />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>입점 후보 상위 {top.length}개 (아직 스마트스토어에 없는 제품군)</CardTitle>
        </CardHeader>
        <CardContent>
          <CandidateTable candidates={top} isAdmin={isAdmin} markAction={markFamiliesListed} />
          <p className="mt-3 text-xs text-slate-500">
            금액·공급가는 딜러 공급가(부가세 별도)입니다. 딜러가 산 수량이므로 소비자 수요와는 다를 수 있고, 재고는 반영하지
            않았습니다.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>스마트스토어에 이미 등록된 제품군 ({listed.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {listed.map((l) => (
              <span key={l.family_key} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                {l.label}
                {l.source === "store" && <span className="text-xs text-slate-400">파일</span>}
                {isAdmin && (
                  <form action={unmarkFamilyListed}>
                    <input type="hidden" name="family_key" value={l.family_key} />
                    <button type="submit" className="text-xs text-slate-500 underline hover:text-slate-800">
                      되돌리기
                    </button>
                  </form>
                )}
              </span>
            ))}
            {listed.length === 0 && <span className="text-sm text-slate-500">표시된 제품군이 없습니다.</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>계산 기준</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          <p>
            점수 = 구매한 딜러 수 35% + 주문 건수 25% + 최근 {RECENT_WINDOW_DAYS / 7}주 수량 25% + 매출 15% (각각 전체
            제품군 중 상대 순위로 환산).
          </p>
          <p>
            제외: 데모 판매((demo) 표시)와 0원 무상 품목, 딜러 {MIN_DEALERS}곳 미만이 산 제품(독점 판매 패들 등 한 곳이
            대량으로 산 경우), 이미 스마트스토어에 등록된 제품군.
          </p>
          {exclusive.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-slate-600">딜러 1곳만 산 제품 보기 ({exclusive.length}개, 순위에서 제외됨)</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">
                {exclusive.slice(0, 60).map((e) => (
                  <li key={e.key}>
                    {e.label} <span className="text-xs text-slate-500">({e.category} · {e.quantity.toLocaleString("ko-KR")}개)</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

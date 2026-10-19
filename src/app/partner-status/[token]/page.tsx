import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashStatusToken } from "@/lib/partner/crypto";
import { facilityTierLabel } from "@/lib/partner/tier";
import type { FacilityTier, PartnerApplicationStatus } from "@/lib/types/database.types";

export const dynamic = "force-dynamic";

// 신청자 전용 결과 확인 페이지. URL의 토큰을 해시해서 신청서를 찾는다(DB에는 해시만 있다).
// 개인정보는 보여 주지 않고 상태·티어·담당자 메시지만 보여 준다.
const statusText: Record<PartnerApplicationStatus, string> = {
  pending: "검토 중",
  approved: "승인",
  rejected: "거절",
};

export default async function PartnerStatusPage({ params }: { params: { token: string } }) {
  const { data: app } = await createAdminClient()
    .from("partner_applications")
    .select("facility_name, status, expected_tier, final_tier, decision_message, created_at, decided_at")
    .eq("status_token_hash", hashStatusToken(params.token))
    .maybeSingle();
  if (!app) notFound();

  const status = app.status as PartnerApplicationStatus;
  const tierName = (t: string | null) => (t ? facilityTierLabel[t as FacilityTier] : "담당자 검토 필요");

  return (
    <main className="mx-auto min-h-screen max-w-xl space-y-6 bg-slate-50 px-4 py-8 sm:px-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">JOOLA KOREA 브랜드 파트너 신청</p>
        <h1 className="text-xl font-semibold text-slate-900">{app.facility_name}</h1>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
        <p>
          진행 상태: <span className="font-semibold text-slate-900">{statusText[status]}</span>
        </p>
        <p>신청일: {new Date(app.created_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}</p>
        {status === "pending" && (
          <>
            <p>예상 티어(신청 시 자동 계산): {tierName(app.expected_tier)}</p>
            <p className="rounded-lg bg-slate-50 p-3 text-slate-600">
              JOOLA KOREA가 제출하신 내용을 검증하고 있습니다. 검증 결과에 따라 최종 티어가 예상 티어와 달라질 수
              있습니다.
            </p>
          </>
        )}
        {status === "approved" && (
          <p>
            최종 티어: <span className="font-semibold text-brand-700">{tierName(app.final_tier)}</span>
          </p>
        )}
        {app.decision_message && (
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="mb-1 text-xs font-medium text-slate-500">JOOLA KOREA 메시지</p>
            <p className="whitespace-pre-wrap">{app.decision_message}</p>
          </div>
        )}
      </div>

      <p className="text-center text-[11px] text-slate-400">이 링크는 신청하신 분만 알고 있는 주소입니다 · 다른 사람과 공유하지 마세요</p>
    </main>
  );
}

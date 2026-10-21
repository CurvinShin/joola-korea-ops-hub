import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashStatusToken } from "@/lib/partner/crypto";
import { facilityTierLabel } from "@/lib/partner/tier";
import { PartnerNetInquiryForm } from "@/components/partner/PartnerNetInquiryForm";
import { ContractView } from "@/components/partner/ContractView";
import { PartnerContractSign } from "@/components/partner/PartnerContractSign";
import type { PartnerContractRow } from "@/lib/partner/contract-template";
import {
  BRANDING_GUIDE,
  DESIGN_PROPOSAL_URL,
  NET_DELIVERY_NOTICE,
  PRONET_PRICE,
  SYMMETRY_NET_PRICE,
  additionalNetsNeeded,
  freeNetPolicyText,
  won,
} from "@/lib/partner/onboarding";
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
    .select(
      "id, facility_name, status, expected_tier, final_tier, decision_message, created_at, decided_at, courts_count, pii_purged_at, branding_ack_at, pronet_purchase_qty, symmetry_purchase_qty, net_inquiry_at",
    )
    .eq("status_token_hash", hashStatusToken(params.token))
    .maybeSingle();
  if (!app) notFound();

  const { data: contractData } = await createAdminClient()
    .from("partner_contracts")
    .select("status, content, content_hash, partner_signed_at, partner_signer_name, joola_signed_at")
    .eq("application_id", app.id)
    .maybeSingle();
  const contract = contractData as Pick<
    PartnerContractRow,
    "status" | "content" | "content_hash" | "partner_signed_at" | "partner_signer_name" | "joola_signed_at"
  > | null;
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });

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

      {status === "approved" && app.final_tier && !app.pii_purged_at && (
        <>
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
            <h2 className="text-base font-semibold text-slate-900">1. 코트 브랜딩</h2>
            <a
              href={DESIGN_PROPOSAL_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              브랜딩 시안 확인하기
            </a>
            <ul className="list-disc space-y-1 pl-5">
              {BRANDING_GUIDE.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
            <h2 className="text-base font-semibold text-slate-900">2. 네트 구매 문의</h2>
            <p>{freeNetPolicyText(app.final_tier as FacilityTier, app.courts_count)}</p>
            <p>
              프로네트는 {won(PRONET_PRICE)}(부가세 포함), 시미트리 네트는 {won(SYMMETRY_NET_PRICE)}(부가세 포함)에 구매하실 수 있습니다.
            </p>
            <ul className="list-disc space-y-1 rounded-lg bg-slate-50 p-3 pl-7 text-slate-600">
              {NET_DELIVERY_NOTICE.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <PartnerNetInquiryForm
              token={params.token}
              additionalNeeded={additionalNetsNeeded(app.final_tier as FacilityTier, app.courts_count)}
              initialPronet={app.pronet_purchase_qty}
              initialSymmetry={app.symmetry_purchase_qty}
              alreadySubmitted={!!app.net_inquiry_at}
            />
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
            <h2 className="text-base font-semibold text-slate-900">3. 계약서</h2>
            {!app.net_inquiry_at && (
              <p>위 2번의 네트 구매 문의를 저장하시면 계약서가 이 화면에 바로 열립니다.</p>
            )}
            {app.net_inquiry_at && !contract && (
              <p className="rounded-lg bg-slate-50 p-3 text-slate-600">
                계약서를 준비하고 있습니다. 사업자 정보 확인이 끝나면 이 화면에서 바로 서명하실 수 있습니다. 잠시 뒤 다시 확인해 주세요.
              </p>
            )}
            {contract && (
              <>
                <p className="text-slate-600">
                  진행 상태:{" "}
                  <span className="font-semibold text-slate-900">
                    {contract.status === "pending_partner" && "서명 대기"}
                    {contract.status === "pending_joola" && "서명 완료 · JOOLA KOREA 대표 서명 대기"}
                    {contract.status === "signed" && "계약 체결 완료"}
                    {contract.status === "void" && "무효"}
                  </span>
                </p>
                <div className="max-h-[28rem] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <ContractView contract={contract.content} />
                </div>
                {contract.status === "pending_partner" && (
                  <PartnerContractSign token={params.token} contentHash={contract.content_hash} />
                )}
                {contract.partner_signed_at && (
                  <p className="text-xs text-slate-500">
                    신청자 서명: {contract.partner_signer_name} · {fmtDate(contract.partner_signed_at)}
                  </p>
                )}
                {contract.joola_signed_at && (
                  <p className="text-xs text-slate-500">JOOLA KOREA 서명: {fmtDate(contract.joola_signed_at)}</p>
                )}
              </>
            )}
          </div>
        </>
      )}

      <p className="text-center text-[11px] text-slate-400">이 링크는 신청하신 분만 알고 있는 주소입니다 · 다른 사람과 공유하지 마세요</p>
    </main>
  );
}

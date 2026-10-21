import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  approvePartnerApplication,
  purgeApprovedPartnerData,
  undoPartnerApproval,
  rejectPartnerApplication,
  setPartnerBusinessNumber,
} from "@/lib/actions/partner-applications";
import { decryptSecret } from "@/lib/partner/crypto";
import { contractStatusLabel, type PartnerContractStatus } from "@/lib/partner/contract-template";
import { additionalNetsNeeded, freeProNets, netTotal, won, type PartnerOnboardingFields } from "@/lib/partner/onboarding";
import { computeTier, facilityTierLabel, MAX_SCORE, TIER_CONFIG, type TierInput } from "@/lib/partner/tier";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { JoolaSignLinkButton } from "@/components/partner/JoolaSignLinkButton";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { krRegionLabel, partnerApplicationStatusLabel } from "@/lib/utils/labels";
import type {
  FacilityTier,
  PartnerApplication,
  PartnerApplicationAttachment,
  PartnerApplicationStatus,
} from "@/lib/types/database.types";

export const dynamic = "force-dynamic";

const statusTone: Record<PartnerApplicationStatus, "amber" | "green" | "red"> = {
  pending: "amber",
  approved: "green",
  rejected: "red",
};

const salesLabel: Record<PartnerApplication["sales_capability"], string> = {
  wholesale: "도매 가능(신청 단계 15점, 딜러십·초도 구매 확인 시 25점)",
  retail: "도소매",
  none: "판매 불가",
};

const attachmentLabel: Record<PartnerApplicationAttachment["kind"], string> = {
  court_photo: "코트 사진",
  business_license: "사업자등록증",
  sns_capture: "SNS·DUPR 캡처",
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="shrink-0 text-slate-400">{label}</span>
      <span className="text-right text-slate-700">{value}</span>
    </div>
  );
}

function tierInputOf(app: PartnerApplication): TierInput {
  const a = app.answers ?? {};
  return {
    region: app.region,
    courtsCount: app.courts_count,
    venueSuitable: app.venue_suitable,
    salesCapability: app.sales_capability,
    wholesaleVerified: false,
    proNetInstalled: false,
    priorPartnerClaimed: !!a.prior_partner_claim,
    // 승인 때 담당자가 확인한 경우에만 true로 저장된다.
    priorPartnerVerified: !!a.prior_partner_verified,
    ops: {
      regularLessons: !!a.ops_regularLessons,
      hostedEvents: !!a.ops_hostedEvents,
      monthlyUsers800: !!a.ops_monthlyUsers800,
      salesStaff: !!a.ops_salesStaff,
    },
    access: {
      carOnly: !!a.access_carOnly,
      subway10min: !!a.access_subway10min,
      bus5min: !!a.access_bus5min,
      residential: !!a.access_residential,
      parking: !!a.access_parking,
    },
    coach: {
      dupr4: !!a.coach_dupr4,
      nationalPodium: !!a.coach_nationalPodium,
      snsReach: !!a.coach_snsReach,
      certifiedOr3Years: !!a.coach_certifiedOr3Years,
    },
  };
}

export default async function PartnerApplicationDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  // RLS상 관리자만 행이 보인다. 행이 보였다는 것 자체가 권한 확인이라, 그 뒤에만
  // 계좌 복호화와 첨부 임시 링크(60초)를 만든다.
  const { data } = await supabase.from("partner_applications").select("*").eq("id", params.id).maybeSingle();
  if (!data) notFound();
  const app = data as PartnerApplication & PartnerOnboardingFields;
  const { data: contractRow } = await supabase
    .from("partner_contracts")
    .select("status, partner_signed_at, partner_signer_name, joola_signed_at")
    .eq("application_id", params.id)
    .maybeSingle();
  const contract = contractRow as {
    status: PartnerContractStatus;
    partner_signed_at: string | null;
    partner_signer_name: string | null;
    joola_signed_at: string | null;
  } | null;
  const status = app.status;

  let accountNumber = "—";
  if (app.account_number_enc) {
    try {
      accountNumber = decryptSecret(app.account_number_enc);
    } catch {
      accountNumber = "(복호화 실패 — PARTNER_DATA_KEY 확인 필요)";
    }
  }

  const attachments = app.attachments ?? [];
  const storage = attachments.length > 0 ? createAdminClient().storage.from("partner-applications") : null;
  const signed = await Promise.all(
    attachments.map(async (att) => {
      const { data: s } = await storage!.createSignedUrl(att.path, 60);
      return { ...att, url: s?.signedUrl ?? null };
    })
  );

  const baseInput = tierInputOf(app);
  const tier = computeTier(baseInput);
  const claimed = baseInput.priorPartnerClaimed;
  const bonusVerified = baseInput.priorPartnerVerified;
  // 이력 확인 시 점수·티어(승인 전 참고용)
  const withBonus = computeTier({ ...baseInput, priorPartnerVerified: true });
  const bonusPoints = TIER_CONFIG.priorPartnerBonus;
  const approveWithId = approvePartnerApplication.bind(null, app.id);
  const rejectWithId = rejectPartnerApplication.bind(null, app.id);
  const purgeWithId = purgeApprovedPartnerData.bind(null, app.id);
  const undoWithId = undoPartnerApproval.bind(null, app.id);
  // 승인된 신청서는 시설의 파트너십 상태가 '종료'일 때만 개인정보를 삭제할 수 있다.
  let facilityEnded = false;
  let facilityInDiscussion = false;
  if (status === "approved" && app.facility_id && !app.pii_purged_at) {
    const { data: fac } = await supabase
      .from("facilities")
      .select("partnership_status")
      .eq("id", app.facility_id)
      .maybeSingle();
    facilityEnded = fac?.partnership_status === "ended";
    facilityInDiscussion = fac?.partnership_status === "in_discussion";
  }
  const setBusinessNumberWithId = setPartnerBusinessNumber.bind(null, app.id);
  const defaultTier: FacilityTier = app.expected_tier ?? "champion";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/partner-applications" className="text-xs text-slate-400 hover:underline">
          ← 전체 신청서
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-slate-900">{app.facility_name}</h1>
          <Badge tone={statusTone[status]}>{partnerApplicationStatusLabel[status]}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>자동 계산(신청자 자가 응답 기준)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <InfoRow label="점수" value={`${tier.score} / ${MAX_SCORE}`} />
              <InfoRow label="예상 티어" value={app.expected_tier ? facilityTierLabel[app.expected_tier] : "담당자 검토 필요"} />
              <InfoRow label="조건 충족 시 가능 티어" value={app.potential_tier ? facilityTierLabel[app.potential_tier] : "—"} />
              <InfoRow
                label="세부 점수"
                value={`지역×코트 ${tier.breakdown.regionCourt} · 판매 ${tier.breakdown.sales} · 운영 ${tier.breakdown.ops} · 접근성 ${tier.breakdown.access} · 코치 ${tier.breakdown.coach}${tier.breakdown.bonus ? ` · 기존 파트너 가산 ${tier.breakdown.bonus}` : ""}`}
              />
              <InfoRow
                label="기존 파트너 이력"
                value={
                  bonusVerified
                    ? `확인됨(+${bonusPoints}점 반영)`
                    : claimed
                      ? `신청자가 '있음'으로 응답 — 확인 전(확인 시 ${withBonus.score}점)`
                      : "신청자 응답 없음"
                }
              />
              {claimed && !bonusVerified && withBonus.tier !== tier.tier && (
                <p className="text-xs text-slate-400">
                  이력을 확인해 +{bonusPoints}점을 반영하면 예상 티어는 {withBonus.tier ? facilityTierLabel[withBonus.tier] : "담당자 검토 필요"}입니다.
                </p>
              )}
              <InfoRow label="판매 가능 여부" value={salesLabel[app.sales_capability]} />
              {app.review_reasons.length > 0 && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {app.review_reasons.map((r) => (
                    <p key={r}>· {r}</p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>신청 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {app.pii_purged_at && (
                <p className="mb-2 text-xs text-slate-500">
                  {status === "rejected" ? "거절 처리로" : "계약 종료 후 삭제 요청으로"} 개인정보·계좌·첨부가 삭제되었습니다(
                  {new Date(app.pii_purged_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}).
                </p>
              )}
              <InfoRow label="지역" value={krRegionLabel[app.region] ?? app.region} />
              <InfoRow label="코트 수" value={String(app.courts_count)} />
              <InfoRow label="천장·공간 충분" value={app.venue_suitable ? "예" : "아니오"} />
              <InfoRow label="주소" value={app.address ?? "—"} />
              <InfoRow label="사업자등록번호" value={app.business_number ?? (app.pii_purged_at ? "삭제됨" : "(미입력 — 승인 전 필수)")} />
              <InfoRow label="업태·종목" value={app.business_type ?? "—"} />
              <InfoRow label="대표자" value={[app.representative_name, app.representative_phone].filter(Boolean).join(" · ") || "—"} />
              <InfoRow label="신청 담당자" value={[app.applicant_name, app.applicant_phone].filter(Boolean).join(" · ") || "—"} />
              <InfoRow label="이메일" value={app.email ?? "—"} />
              <InfoRow label="정산 계좌" value={[app.bank_name, app.account_holder, accountNumber].filter(Boolean).join(" · ")} />
              <InfoRow label="SNS / DUPR" value={[app.sns_id, app.dupr_id].filter(Boolean).join(" / ") || "—"} />
              <InfoRow label="신청일" value={new Date(app.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>증빙 자료</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {signed.length === 0 && <p className="text-slate-400">첨부 없음</p>}
              {signed.map((s) => (
                <p key={s.path}>
                  {attachmentLabel[s.kind]} ·{" "}
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noreferrer" className="text-brand-700 underline">
                      {s.name}
                    </a>
                  ) : (
                    <span className="text-slate-400">{s.name} (링크 생성 실패)</span>
                  )}
                </p>
              ))}
              {signed.length > 0 && <p className="text-xs text-slate-400">링크는 1분 동안만 열립니다. 만료되면 새로고침하세요.</p>}
            </CardContent>
          </Card>

          {status === "approved" && app.final_tier && (
            <Card>
              <CardHeader>
                <CardTitle>승인 후 진행 (브랜딩·네트)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <InfoRow label="무상 프로네트" value={`${freeProNets(app.final_tier, app.courts_count)}개`} />
                <InfoRow label="추가로 필요한 코트" value={`${additionalNetsNeeded(app.final_tier, app.courts_count)}개`} />
                <InfoRow
                  label="브랜딩 안내 확인"
                  value={app.branding_ack_at ? new Date(app.branding_ack_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "아직 확인 전"}
                />
                {app.net_inquiry_at ? (
                  <>
                    <InfoRow label="프로네트 구매" value={`${app.pronet_purchase_qty ?? 0}개`} />
                    <InfoRow label="시미트리 네트 구매" value={`${app.symmetry_purchase_qty ?? 0}개`} />
                    <InfoRow label="예상 금액" value={`${won(netTotal(app.pronet_purchase_qty ?? 0, app.symmetry_purchase_qty ?? 0))} (부가세 포함)`} />
                    <InfoRow label="문의 접수" value={new Date(app.net_inquiry_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} />
                  </>
                ) : (
                  <p className="text-sm text-slate-400">신청자가 아직 네트 수량을 입력하지 않았습니다.</p>
                )}
                <InfoRow label="계약서" value={contract ? contractStatusLabel[contract.status] : "아직 생성 전"} />
                {contract?.partner_signed_at && (
                  <InfoRow
                    label="신청자 서명"
                    value={`${contract.partner_signer_name ?? ""} · ${new Date(contract.partner_signed_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`}
                  />
                )}
                {contract?.status === "pending_joola" && <JoolaSignLinkButton applicationId={app.id} />}
                {contract?.joola_signed_at && (
                  <InfoRow label="JOOLA 서명" value={new Date(contract.joola_signed_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} />
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {status === "pending" ? (
            <>
              {!app.business_number && (
                <Card>
                  <CardHeader>
                    <CardTitle>사업자등록번호 입력</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form action={setBusinessNumberWithId} className="space-y-3">
                      <p className="text-xs text-slate-500">신청 때 비워 둔 번호입니다. 받은 뒤 입력해야 승인할 수 있습니다.</p>
                      <Input name="business_number" placeholder="000-00-00000" required />
                      <Button type="submit" variant="secondary" className="w-full">
                        저장
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader>
                  <CardTitle>승인</CardTitle>
                </CardHeader>
                <CardContent>
                  <form action={approveWithId} className="space-y-3">
                    <div>
                      <Label htmlFor="final_tier">최종 티어</Label>
                      <Select id="final_tier" name="final_tier" defaultValue={defaultTier}>
                        <option value="pro">Pro Court</option>
                        <option value="edge">Edge Court</option>
                        <option value="champion">Champion Court</option>
                      </Select>
                      <p className="mt-1 text-xs text-slate-400">
                        Pro는 도매(별도의 딜러십 계약·초도 1,000만원 구매)와 Pro Net 설치가 확인됐을 때만 선택하세요.
                      </p>
                    </div>
                    <label className="flex items-start gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        name="prior_partner_verified"
                        defaultChecked={false}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span>
                        기존 파트너 시설에 문제가 없었던 이력을 확인했습니다(+{bonusPoints}점)
                        {claimed ? "" : " — 신청자는 응답하지 않았습니다"}
                      </span>
                    </label>
                    <p className="text-xs text-slate-400">
                      체크하면 +{bonusPoints}점을 반영한 점수로 위 최종 티어를 직접 골라 주세요. 티어는 자동으로 바뀌지 않습니다.
                    </p>
                    <div>
                      <Label htmlFor="approve_message">신청자에게 보일 메시지 (선택)</Label>
                      <Textarea id="approve_message" name="decision_message" rows={3} />
                    </div>
                    <ConfirmButton
                      className="w-full"
                      message="이 신청서를 승인하고 시설(협의중)로 등록합니다. 계속할까요? (승인 후에도 '승인 취소'로 되돌릴 수 있습니다)"
                    >
                      승인하고 시설에 등록(협의중)
                    </ConfirmButton>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>거절</CardTitle>
                </CardHeader>
                <CardContent>
                  <form action={rejectWithId} className="space-y-3">
                    <div>
                      <Label htmlFor="reject_message">거절 메시지 (신청자에게 보입니다)</Label>
                      <Textarea id="reject_message" name="decision_message" rows={4} required />
                    </div>
                    <p className="text-xs text-slate-500">
                      거절하면 개인정보·계좌·첨부 파일이 바로 삭제되고 시설명·지역·점수·거절 사유만 남습니다. 되돌릴 수
                      없습니다.
                    </p>
                    <ConfirmButton
                      variant="danger"
                      className="w-full"
                      message="거절하면 개인정보·계좌·첨부 파일이 바로 삭제되고 되돌릴 수 없습니다. 정말 거절할까요?"
                    >
                      거절
                    </ConfirmButton>
                  </form>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>처리 결과</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <InfoRow label="상태" value={partnerApplicationStatusLabel[status]} />
                {app.final_tier && <InfoRow label="최종 티어" value={facilityTierLabel[app.final_tier]} />}
                {app.decided_at && <InfoRow label="처리일" value={new Date(app.decided_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} />}
                {app.decision_message && <p className="whitespace-pre-wrap text-sm text-slate-700">{app.decision_message}</p>}
                {app.facility_id && (
                  <Link href={`/facilities/${app.facility_id}`} className="text-sm text-brand-700 hover:underline">
                    등록된 시설 보기 →
                  </Link>
                )}
              </CardContent>
            </Card>
          )}
          {status === "approved" && !app.pii_purged_at && facilityInDiscussion && (
            <Card>
              <CardHeader>
                <CardTitle>승인 취소</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={undoWithId} className="space-y-3">
                  <p className="text-xs text-slate-500">
                    실수로 승인했을 때 되돌립니다. 승인 때 만들어진 &quot;협의중&quot; 시설을 지우고 신청서를 다시 &quot;검토 중&quot;으로 돌립니다.
                    시설이 이미 활성·종료로 바뀌었다면 취소할 수 없습니다.
                  </p>
                  <ConfirmButton
                    variant="secondary"
                    className="w-full"
                    message="승인을 취소합니다. 등록된 협의중 시설이 삭제되고 신청서가 다시 검토 중으로 돌아갑니다. 계속할까요?"
                  >
                    승인 취소
                  </ConfirmButton>
                </form>
              </CardContent>
            </Card>
          )}
          {status === "approved" && !app.pii_purged_at && (
            <Card>
              <CardHeader>
                <CardTitle>계약 종료 후 개인정보 삭제</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {facilityEnded ? (
                  <form action={purgeWithId} className="space-y-3">
                    <p className="text-xs text-slate-500">
                      신청서의 주소·사업자등록번호·대표자·연락처·이메일·계좌·SNS 정보와 첨부 파일이 바로 삭제됩니다. 시설 정보에 복사된
                      대표자·담당자 이름·이메일·전화·인스타그램도 함께 비워집니다. 시설명·지역·주소·코트 수·티어·점수·처리 기록만
                      남습니다. 되돌릴 수 없습니다.
                    </p>
                    <div>
                      <Label htmlFor="confirm_name">확인을 위해 시설명을 그대로 입력하세요</Label>
                      <Input id="confirm_name" name="confirm_name" placeholder={app.facility_name} required autoComplete="off" />
                    </div>
                    <Button type="submit" variant="danger" className="w-full">
                      개인정보 삭제
                    </Button>
                  </form>
                ) : (
                  <p className="text-xs text-slate-500">
                    시설의 파트너십 상태가 “종료”로 바뀐 뒤에 개인정보를 삭제할 수 있습니다. 시설 화면에서 상태를 먼저 바꿔 주세요.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

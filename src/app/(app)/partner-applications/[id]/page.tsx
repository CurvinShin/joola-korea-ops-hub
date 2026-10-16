import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  approvePartnerApplication,
  rejectPartnerApplication,
  setPartnerBusinessNumber,
} from "@/lib/actions/partner-applications";
import { decryptSecret } from "@/lib/partner/crypto";
import { computeTier, facilityTierLabel, MAX_SCORE, type TierInput } from "@/lib/partner/tier";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
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
  wholesale: "도매 가능(신청 단계 10점, 딜러십·초도 구매 확인 시 20점)",
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
    demoPackagePurchase: app.demo_package_intent,
    proNetInstalled: false,
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
  const app = data as PartnerApplication;
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

  const tier = computeTier(tierInputOf(app));
  const approveWithId = approvePartnerApplication.bind(null, app.id);
  const rejectWithId = rejectPartnerApplication.bind(null, app.id);
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
                value={`지역×코트 ${tier.breakdown.regionCourt} · 판매 ${tier.breakdown.sales} · 운영 ${tier.breakdown.ops} · 접근성 ${tier.breakdown.access} · 코치 ${tier.breakdown.coach}`}
              />
              <InfoRow label="판매 가능 여부" value={salesLabel[app.sales_capability]} />
              <InfoRow label="데모 패키지 구매 희망" value={app.demo_package_intent ? "예" : "아니오"} />
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
                  거절 처리로 개인정보·계좌·첨부가 삭제되었습니다({new Date(app.pii_purged_at).toLocaleDateString("ko-KR")}).
                </p>
              )}
              <InfoRow label="지역" value={krRegionLabel[app.region] ?? app.region} />
              <InfoRow label="코트 수" value={String(app.courts_count)} />
              <InfoRow label="천장·공간 충분" value={app.venue_suitable ? "예" : "아니오"} />
              <InfoRow label="주소" value={app.address ?? "—"} />
              <InfoRow label="사업자등록번호" value={app.business_number ?? "(미입력 — 승인 전 필수)"} />
              <InfoRow label="업태·종목" value={app.business_type ?? "—"} />
              <InfoRow label="대표자" value={[app.representative_name, app.representative_phone].filter(Boolean).join(" · ") || "—"} />
              <InfoRow label="신청 담당자" value={[app.applicant_name, app.applicant_phone].filter(Boolean).join(" · ") || "—"} />
              <InfoRow label="이메일" value={app.email ?? "—"} />
              <InfoRow label="정산 계좌" value={[app.bank_name, app.account_holder, accountNumber].filter(Boolean).join(" · ")} />
              <InfoRow label="SNS / DUPR" value={[app.sns_id, app.dupr_id].filter(Boolean).join(" / ") || "—"} />
              <InfoRow label="신청일" value={new Date(app.created_at).toLocaleString("ko-KR")} />
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
                        Pro는 도매(딜러십 계약·초도 1,000만원 구매)·데모 패키지·Pro Net 설치가 확인됐을 때만 선택하세요.
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="approve_message">신청자에게 보일 메시지 (선택)</Label>
                      <Textarea id="approve_message" name="decision_message" rows={3} />
                    </div>
                    <Button type="submit" className="w-full">
                      승인하고 시설에 등록(협의중)
                    </Button>
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
                    <Button type="submit" variant="danger" className="w-full">
                      거절
                    </Button>
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
                {app.decided_at && <InfoRow label="처리일" value={new Date(app.decided_at).toLocaleString("ko-KR")} />}
                {app.decision_message && <p className="whitespace-pre-wrap text-sm text-slate-700">{app.decision_message}</p>}
                {app.facility_id && (
                  <Link href={`/facilities/${app.facility_id}`} className="text-sm text-brand-700 hover:underline">
                    등록된 시설 보기 →
                  </Link>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

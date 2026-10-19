"use client";

import { useRef, useState, useTransition } from "react";
import { useFormState } from "react-dom";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { requestUploadTargets, submitPartnerApplication, type SubmitResult } from "@/lib/actions/partner-applications";
import {
  computePotentialTier,
  computeTier,
  facilityTierLabel,
  MAX_SCORE,
  type SalesCapability,
  type TierInput,
} from "@/lib/partner/tier";
import type { KrRegion, PartnerApplicationAttachment } from "@/lib/types/database.types";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { krRegionLabel } from "@/lib/utils/labels";

const FILE_FIELDS: { name: string; kind: PartnerApplicationAttachment["kind"]; label: string; hint: string; multiple?: boolean }[] = [
  { name: "file_court_photo", kind: "court_photo", label: "코트 사진 (선택)", hint: "공사 전 공간 사진도 괜찮습니다. 여러 장 선택 가능", multiple: true },
  { name: "file_business_license", kind: "business_license", label: "사업자등록증", hint: "아직 없으면 비워 두세요(승인 전에는 필요합니다)" },
  { name: "file_sns_capture", kind: "sns_capture", label: "SNS·DUPR 캡처 (선택)", hint: "아래 ID를 적으셨다면 생략해도 됩니다" },
];

function Check({ name, label }: { name: string; label: string }) {
  return (
    <label className="flex items-start gap-2 text-sm text-slate-700">
      <input type="checkbox" name={name} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
      <span>{label}</span>
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <legend className="px-1 text-sm font-semibold text-slate-900">{title}</legend>
      {children}
    </fieldset>
  );
}

function readTierInput(form: HTMLFormElement): TierInput | null {
  const fd = new FormData(form);
  const region = fd.get("region") as KrRegion | "" | null;
  const sales = fd.get("sales_capability") as SalesCapability | null;
  if (!region || !sales) return null;
  const on = (k: string) => fd.get(k) === "on";
  return {
    region,
    courtsCount: Number(fd.get("courts_count") || 0),
    venueSuitable: on("venue_suitable"),
    salesCapability: sales,
    wholesaleVerified: false,
    proNetInstalled: false,
    priorPartnerClaimed: on("prior_partner_claim"),
    priorPartnerVerified: false,
    ops: {
      regularLessons: on("ops_regularLessons"),
      hostedEvents: on("ops_hostedEvents"),
      monthlyUsers800: on("ops_monthlyUsers800"),
      salesStaff: on("ops_salesStaff"),
    },
    access: {
      carOnly: on("access_carOnly"),
      subway10min: on("access_subway10min"),
      bus5min: on("access_bus5min"),
      residential: on("access_residential"),
      parking: on("access_parking"),
    },
    coach: {
      dupr4: on("coach_dupr4"),
      nationalPodium: on("coach_nationalPodium"),
      snsReach: on("coach_snsReach"),
      certifiedOr3Years: on("coach_certifiedOr3Years"),
    },
  };
}

function TierPreview({ input }: { input: TierInput | null }) {
  if (!input) {
    return <p className="text-sm text-slate-500">지역과 제품 판매 가능 여부를 선택하면 예상 티어가 표시됩니다.</p>;
  }
  const now = computeTier(input);
  const potential = computePotentialTier(input);
  return (
    <div className="space-y-2 text-sm">
      <p>
        예상 점수 <span className="font-semibold">{now.score}</span> / {MAX_SCORE} · 예상 티어{" "}
        <span className="font-semibold text-brand-700">{now.tier ? facilityTierLabel[now.tier] : "담당자 검토 필요"}</span>
      </p>
      {potential.tier && potential.tier !== now.tier && (
        <p className="text-slate-600">
          {input.salesCapability === "wholesale" ? "딜러십 계약과 초도 물량 1,000만원(부가세 별도) 구매를 마치고, " : ""}
          Pro Net 설치 조건을 채우면 <span className="font-semibold">{facilityTierLabel[potential.tier]}</span>
          까지 가능합니다.
        </p>
      )}
      {input.priorPartnerClaimed && (
        <p className="text-xs text-slate-500">
          기존 파트너 이력 가산 5점은 담당자가 이력을 확인한 뒤 반영되며, 지금 점수에는 들어 있지 않습니다.
        </p>
      )}
      {input.salesCapability === "wholesale" && (
        <p className="text-xs text-slate-500">
          도매 가능은 딜러십 계약과 초도 구매를 마친 뒤에 20점으로 인정되며, 지금은 10점으로 계산됩니다.
        </p>
      )}
    </div>
  );
}

export function PartnerApplyForm({ invite }: { invite: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [tierInput, setTierInput] = useState<TierInput | null>(null);
  const [state, formAction] = useFormState<SubmitResult | null, FormData>(submitPartnerApplication, null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, startTransition] = useTransition();

  const refresh = () => {
    if (formRef.current) setTierInput(readTierInput(formRef.current));
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploadError(null);
    const fd = new FormData(e.currentTarget);
    const picked: { kind: PartnerApplicationAttachment["kind"]; file: File }[] = [];
    for (const f of FILE_FIELDS) {
      for (const file of fd.getAll(f.name)) {
        if (file instanceof File && file.size > 0) picked.push({ kind: f.kind, file });
      }
      fd.delete(f.name);
    }

    if (picked.length > 0) {
      setUploading(true);
      try {
        const targets = await requestUploadTargets({
          invite,
          files: picked.map((p) => ({ kind: p.kind, type: p.file.type, size: p.file.size })),
        });
        if (!targets.ok) {
          setUploadError(targets.error);
          return;
        }
        const storage = createClient().storage.from("partner-applications");
        const uploaded: PartnerApplicationAttachment[] = [];
        for (const [i, p] of picked.entries()) {
          const t = targets.uploads[i];
          const { error } = await storage.uploadToSignedUrl(t.path, t.token, p.file, { contentType: p.file.type });
          if (error) {
            setUploadError("파일을 올리지 못했습니다. 다시 시도해주세요.");
            return;
          }
          uploaded.push({ kind: p.kind, path: t.path, name: p.file.name.slice(0, 200) });
        }
        fd.set("attachment_batch", targets.batchId);
        fd.set("attachments", JSON.stringify(uploaded));
      } finally {
        setUploading(false);
      }
    }

    startTransition(() => formAction(fd));
  }

  if (state?.ok) {
    return (
      <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-900">
        <p className="text-base font-semibold">신청서가 접수되었습니다.</p>
        <p>
          예상 티어:{" "}
          <span className="font-semibold">{state.expectedTier ? facilityTierLabel[state.expectedTier] : "담당자 검토 필요"}</span> (
          {state.score}점)
        </p>
        <p className="rounded-lg bg-white/70 p-3 text-slate-700">
          제출하신 내용은 JOOLA KOREA가 다시 검증한 뒤 최종 티어를 확정합니다. 검증 결과에 따라 예상 티어와 달라지거나
          신청이 거절될 수 있습니다.
        </p>
        <div className="space-y-1">
          <p className="font-medium">결과 확인 링크 — 꼭 저장해 두세요</p>
          <p className="text-xs text-emerald-800">이 링크는 다시 보여 드릴 수 없습니다. 북마크하거나 복사해 두세요.</p>
          <Link href={state.statusPath} className="break-all text-brand-700 underline">
            {typeof window !== "undefined" ? `${window.location.origin}${state.statusPath}` : state.statusPath}
          </Link>
        </div>
      </div>
    );
  }

  const busy = uploading || submitting;

  return (
    <form ref={formRef} onSubmit={handleSubmit} onChange={refresh} className="space-y-5">
      <input type="hidden" name="invite" value={invite} />
      {/* 자동 제출 방지용. 사람에게는 보이지 않는다. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          웹사이트
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <Section title="시설 정보">
        <div>
          <Label htmlFor="facility_name">시설명</Label>
          <Input id="facility_name" name="facility_name" required />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="region">지역 (시/도)</Label>
            <Select id="region" name="region" required defaultValue="">
              <option value="" disabled>
                선택해주세요
              </option>
              {Object.entries(krRegionLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="courts_count">대관·경기가 가능한 코트 수</Label>
            <Input id="courts_count" name="courts_count" type="number" min={0} max={100} required />
          </div>
        </div>
        <div>
          <Label htmlFor="address">주소</Label>
          <Input id="address" name="address" required />
        </div>
        <Check name="venue_suitable" label="천장 높이와 코트 앞뒤 공간이 대관·경기를 하기에 충분합니다" />
      </Section>

      <Section title="사업자·연락처">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="business_number">사업자등록번호 (없으면 비워 두세요)</Label>
            <Input id="business_number" name="business_number" />
          </div>
          <div>
            <Label htmlFor="business_type">업태·종목</Label>
            <Input id="business_type" name="business_type" />
          </div>
          <div>
            <Label htmlFor="representative_name">대표자 이름</Label>
            <Input id="representative_name" name="representative_name" required />
          </div>
          <div>
            <Label htmlFor="representative_phone">대표자 연락처</Label>
            <Input id="representative_phone" name="representative_phone" type="tel" required />
          </div>
          <div>
            <Label htmlFor="applicant_name">신청 담당자 (대표와 다를 때)</Label>
            <Input id="applicant_name" name="applicant_name" />
          </div>
          <div>
            <Label htmlFor="applicant_phone">신청 담당자 연락처</Label>
            <Input id="applicant_phone" name="applicant_phone" type="tel" />
          </div>
        </div>
        <div>
          <Label htmlFor="email">이메일</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <p className="text-xs text-slate-500">파트너십 계약은 사업자 대표가 계약 주체가 되어야 하며, 직원 명의로는 신청할 수 없습니다.</p>
      </Section>

      <Section title="정산 계좌 (법인/개인 사업자)">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="bank_name">은행명</Label>
            <Input id="bank_name" name="bank_name" required />
          </div>
          <div>
            <Label htmlFor="account_holder">예금주</Label>
            <Input id="account_holder" name="account_holder" required />
          </div>
          <div>
            <Label htmlFor="account_number">계좌번호</Label>
            <Input id="account_number" name="account_number" inputMode="numeric" required />
          </div>
        </div>
      </Section>

      <Section title="제품 판매">
        {(
          [
            ["wholesale", "도매 가능 — 재고를 두고 연 5천만원 이상 구매 가능(도매 구매에는 별도의 딜러십 계약이 필요합니다)"],
            ["retail", "도소매 — 재고를 두기 어렵고 연 5천만원 미만 구매 예상(JOOLA 딜러 소개)"],
            ["none", "판매 불가 — 사업자에 판매업이 없음"],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="flex items-start gap-2 text-sm text-slate-700">
            <input type="radio" name="sales_capability" value={value} required className="mt-0.5 h-4 w-4 border-slate-300 text-brand-600" />
            <span>{label}</span>
          </label>
        ))}
      </Section>

      <Section title="기존 파트너 이력">
        <Check
          name="prior_partner_claim"
          label="이미 JOOLA 브랜드 파트너 시설을 운영 중인 대표자입니다(2호점·3호점 신청)"
        />
        <p className="text-xs text-slate-500">
          기존 시설에 문제가 없었던 이력이 담당자 확인으로 인정되면 총점에 5점이 더해집니다. 체크만으로는 확정되지 않습니다.
        </p>
      </Section>

      <Section title="운영">
        <Check name="ops_regularLessons" label="정기 레슨·클래스를 운영합니다" />
        <Check name="ops_hostedEvents" label="자체 대회·리그를 열어 본 경험이 있습니다" />
        <Check name="ops_monthlyUsers800" label="월 이용자가 중복 포함 800명 이상입니다(주 200명 이상)" />
        <Check name="ops_salesStaff" label="JOOLA 제품을 공부하고 판매를 맡을 전담 인력이 있습니다" />
      </Section>

      <Section title="접근성·입지">
        <Check name="access_carOnly" label="개인 차량으로만 갈 수 있습니다(대중교통 이용 어려움)" />
        <Check name="access_subway10min" label="지하철역에서 걸어서 10분 이내입니다" />
        <Check name="access_bus5min" label="버스 정류장에서 걸어서 5분 이내입니다" />
        <Check name="access_residential" label="아파트 단지 등 주거지 중심에 있습니다" />
        <Check name="access_parking" label="이용자 주차가 가능합니다" />
      </Section>

      <Section title="소속 코치">
        <Check name="coach_dupr4" label="DUPR 4.0 이상인 코치가 있습니다" />
        <Check name="coach_nationalPodium" label="전국대회 1부 또는 OPEN 입상 경력이 있는 코치가 있습니다" />
        <Check name="coach_snsReach" label="SNS 팔로워 1,000명 이상, 또는 500명 이상이면서 주 1회 이상 코칭 영상을 올립니다" />
        <Check name="coach_certifiedOr3Years" label="지도자 자격증이 있거나 피클볼 지도 경력이 3년 이상입니다" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="sns_id">SNS 계정 ID</Label>
            <Input id="sns_id" name="sns_id" placeholder="@handle" />
          </div>
          <div>
            <Label htmlFor="dupr_id">DUPR ID</Label>
            <Input id="dupr_id" name="dupr_id" />
          </div>
        </div>
      </Section>

      <Section title="증빙 자료">
        {FILE_FIELDS.map((f) => (
          <div key={f.name}>
            <Label htmlFor={f.name}>{f.label}</Label>
            <input
              id={f.name}
              type="file"
              name={f.name}
              multiple={f.multiple}
              accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700"
            />
            <p className="mt-1 text-xs text-slate-400">{f.hint} · 파일당 10MB 이하, 전체 6개까지</p>
          </div>
        ))}
      </Section>

      <Section title="예상 티어">
        <TierPreview input={tierInput} />
        <p className="text-xs text-slate-500">
          예상 티어는 입력하신 내용으로 자동 계산한 결과이며 확정이 아닙니다. 제출하신 내용은 JOOLA KOREA가 다시 검증한 뒤
          최종 티어와 혜택을 확정합니다.
        </p>
      </Section>

      <Section title="혜택·의무 안내 확인">
        <p className="text-xs text-slate-600">
          페이지 위쪽의 「브랜드 파트너 혜택·의무 안내」는 신청 단계의 안내이며, 정식 계약서는 별도로 체결합니다.
        </p>
        <Check name="benefit_notice" label="혜택·의무 안내를 읽고 이해했으며, 정식 계약서는 별도로 체결됨에 동의합니다" />
      </Section>

      <Section title="개인정보 수집·이용 동의">
        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
          <li>
            수집 항목: 시설명·주소, 사업자등록번호·업태, 대표자·신청 담당자 이름과 연락처, 이메일, 정산 계좌(은행명·예금주·계좌번호),
            SNS·DUPR ID, 증빙 파일
          </li>
          <li>이용 목적: 브랜드 파트너 신청 검토와 티어 확정, 파트너십 계약 연락, 대관료 지급, 세무회계 프로그램에 파트너 정보 등록</li>
          <li>
            보관: 신청이 거절되면 개인정보·계좌·증빙 파일을 바로 삭제하고 시설명·지역·점수·거절 사유만 남깁니다. 승인된 경우
            파트너십(계약) 기간 동안만 보관하며, 계약이 끝나면 삭제합니다.
          </li>
          <li>동의하지 않으실 수 있으며, 이 경우 신청이 접수되지 않습니다.</li>
        </ul>
        <Check name="consent" label="위 내용을 확인했고 개인정보 수집·이용에 동의합니다" />
      </Section>

      {(uploadError || (state && !state.ok)) && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {uploadError ?? (state && !state.ok ? state.error : null)}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={busy}>
        {uploading ? "파일 올리는 중..." : submitting ? "제출 중..." : "신청서 제출"}
      </Button>
    </form>
  );
}

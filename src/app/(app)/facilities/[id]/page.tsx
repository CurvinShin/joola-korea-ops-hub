import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { updateFacility, deleteFacility } from "@/lib/actions/facilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FacilityForm } from "@/components/facilities/FacilityForm";
import { FacilityContractFiles, type ContractFileRow } from "@/components/facilities/FacilityContractFiles";
import type { FacilityTier, PartnershipStatus } from "@/lib/types/database.types";
import { facilityTierLabel } from "@/lib/partner/tier";
import { partnershipStatusLabel, krRegionLabel } from "@/lib/utils/labels";
import { facilityContractRecord } from "@/lib/partner/contract-record";
import { loadHubContracts, loadContractFileCounts } from "@/lib/partner/contract-record-server";
import { contractStatusLabel } from "@/lib/partner/contract-template";

export const dynamic = "force-dynamic";

const statusTone: Record<PartnershipStatus, "green" | "amber" | "slate" | "red"> = {
  active: "green",
  in_discussion: "amber",
  prospect: "slate",
  ended: "red",
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="shrink-0 text-slate-400">{label}</span>
      <span className="text-right text-slate-700">{value}</span>
    </div>
  );
}

export default async function FacilityDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: facility } = await supabase.from("facilities").select("*").eq("id", params.id).maybeSingle();

  if (!facility) notFound();

  const { data: contractFileRows } = await supabase
    .from("facility_contract_files")
    .select("id, file_name, file_size, created_at")
    .eq("facility_id", facility.id)
    .order("created_at", { ascending: false });
  const contractFiles = (contractFileRows ?? []) as ContractFileRow[];

  const keptCount = (await loadContractFileCounts([facility.id])).get(facility.id) ?? 0;

  const hubContract = (await loadHubContracts([facility.id])).get(facility.id);
  const contractRecord = facilityContractRecord({
    hubStatus: hubContract?.status,
    // 체크박스를 눌렀거나, 허브에 계약서 PDF를 올려 두었으면 "보관 중"으로 본다.
    pdfKept: facility.contract_pdf_kept || keptCount > 0,
    partnershipStatus: facility.partnership_status,
  });

  const updateWithId = updateFacility.bind(null, facility.id);
  const deleteWithId = deleteFacility.bind(null, facility.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/facilities" className="text-xs text-slate-400 hover:underline">
            ← 전체 시설
          </Link>
          <h1 className="text-xl font-semibold text-slate-900">{facility.name}</h1>
        </div>
        <form action={deleteWithId}>
          <Button type="submit" variant="danger" size="sm">
            시설 삭제
          </Button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="mb-2 flex items-center gap-2">
                <Badge tone={statusTone[facility.partnership_status as PartnershipStatus]}>
                  {partnershipStatusLabel[facility.partnership_status] ?? facility.partnership_status}
                </Badge>
                {facility.tier && <Badge tone="purple">{facilityTierLabel[facility.tier as FacilityTier]}</Badge>}
                {facility.branding_installed && <Badge tone="blue">브랜딩 설치</Badge>}
                {facility.demo_paddles_provided && <Badge tone="purple">데모 패들</Badge>}
                {facility.product_display && <Badge tone="slate">제품 진열</Badge>}
              </div>
              <InfoRow label="지역" value={facility.region ? krRegionLabel[facility.region] : "—"} />
              <InfoRow label="주소" value={facility.address ?? "—"} />
              <InfoRow label="대표자명" value={facility.representative_name ?? "—"} />
              <InfoRow label="인스타그램" value={facility.instagram_handle ?? "—"} />
              <InfoRow label="담당자" value={facility.contact_name ?? "—"} />
              <InfoRow label="이메일주소" value={facility.contact_email ?? "—"} />
              <InfoRow label="전화번호" value={facility.contact_phone ?? "—"} />
              <InfoRow label="코트 수" value={facility.courts_count != null ? String(facility.courts_count) : "—"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>계약서 서명 상태</CardTitle>
              <Badge tone={contractRecord.tone}>{contractRecord.label}</Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-slate-500">{contractRecord.hint}</p>
              <InfoRow
                label="허브 전자서명"
                value={hubContract && hubContract.status !== "void" ? contractStatusLabel[hubContract.status] : "해당 없음"}
              />
              <InfoRow label="서명본 PDF 보관" value={
                  keptCount > 0
                    ? `보관 중 (허브에 ${keptCount}개 업로드)`
                    : facility.contract_pdf_kept
                      ? "보관 중 (체크 표시)"
                      : "아직 없음"
                } />
              <InfoRow
                label="서명일"
                value={
                  facility.contract_signed_on
                    ? new Date(`${facility.contract_signed_on}T00:00:00+09:00`).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })
                    : "—"
                }
              />
              <InfoRow label="보관 위치" value={facility.contract_file_note ?? "—"} />
              {hubContract && (
                <Link href={`/partner-applications/${hubContract.applicationId}`} className="block text-xs text-brand-700 hover:underline">
                  허브 신청서·계약서 보기 →
                </Link>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>계약서 PDF</CardTitle>
              <Badge tone="slate">관리자 전용</Badge>
            </CardHeader>
            <CardContent>
              <FacilityContractFiles facilityId={facility.id} files={contractFiles} />
            </CardContent>
          </Card>

          {facility.sponsorship_details && (
            <Card>
              <CardHeader>
                <CardTitle>스폰서십 세부사항</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-700">{facility.sponsorship_details}</CardContent>
            </Card>
          )}

          {facility.notes && (
            <Card>
              <CardHeader>
                <CardTitle>메모</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-700">{facility.notes}</CardContent>
            </Card>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>시설 정보 수정</CardTitle>
          </CardHeader>
          <CardContent>
            <FacilityForm action={updateWithId} defaultValues={facility} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

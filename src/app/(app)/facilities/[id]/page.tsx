import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { updateFacility, deleteFacility } from "@/lib/actions/facilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FacilityForm } from "@/components/facilities/FacilityForm";
import type { PartnershipStatus } from "@/lib/types/database.types";
import { partnershipStatusLabel, krRegionLabel } from "@/lib/utils/labels";

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

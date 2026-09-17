import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createFacility } from "@/lib/actions/facilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, Thead, Tr, Th, Td } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { FacilityForm } from "@/components/facilities/FacilityForm";
import { KoreaFacilityMap } from "@/components/facilities/KoreaFacilityMap";
import type { PartnershipStatus } from "@/lib/types/database.types";
import { partnershipStatusLabel, krRegionLabel } from "@/lib/utils/labels";

export const dynamic = "force-dynamic";

const statusTone: Record<PartnershipStatus, "green" | "amber" | "slate" | "red"> = {
  active: "green",
  in_discussion: "amber",
  prospect: "slate",
  ended: "red",
};

export default async function FacilitiesPage({
  searchParams,
}: {
  searchParams: { new?: string };
}) {
  const supabase = createClient();
  const { data: facilities, error } = await supabase
    .from("facilities")
    .select("*")
    .order("region", { ascending: true, nullsFirst: false })
    .order("name");

  const rows = facilities ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">시설 / 브랜드 파트너십</h1>
          <p className="text-sm text-slate-500">코트, 브랜딩 설치, 체험용 패들, 시설별 파트너십 현황입니다.</p>
        </div>
        <Link href="/facilities?new=1">
          <Button>시설 추가</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>지역별 브랜딩 코트 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <KoreaFacilityMap facilities={rows.map((f) => ({ id: f.id, name: f.name, region: f.region }))} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>시설 {rows.length}곳</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && <p className="p-5 text-sm text-red-600">{error.message}</p>}
          {rows.length > 0 ? (
            <Table>
              <Thead>
                <Tr>
                  <Th>이름</Th>
                  <Th>지역</Th>
                  <Th>주소</Th>
                  <Th>대표자</Th>
                  <Th>파트너십 상태</Th>
                  <Th>코트 수</Th>
                </Tr>
              </Thead>
              <tbody>
                {rows.map((f) => (
                  <Tr key={f.id}>
                    <Td>
                      <Link href={`/facilities/${f.id}`} className="font-medium text-brand-700 hover:underline">
                        {f.name}
                      </Link>
                    </Td>
                    <Td>{f.region ? krRegionLabel[f.region] : "—"}</Td>
                    <Td className="max-w-xs truncate">{f.address ?? "—"}</Td>
                    <Td>{f.representative_name ?? "—"}</Td>
                    <Td>
                      <Badge tone={statusTone[f.partnership_status as PartnershipStatus]}>
                        {partnershipStatusLabel[f.partnership_status] ?? f.partnership_status}
                      </Badge>
                    </Td>
                    <Td>{f.courts_count ?? "—"}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="p-8 text-center text-sm text-slate-400">등록된 시설이 없습니다.</p>
          )}
        </CardContent>
      </Card>

      {searchParams.new && (
        <Modal title="시설 추가" closeHref="/facilities">
          <FacilityForm action={createFacility} />
        </Modal>
      )}
    </div>
  );
}

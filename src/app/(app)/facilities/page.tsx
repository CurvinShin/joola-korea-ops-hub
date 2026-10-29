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
import { Input, Select } from "@/components/ui/Input";
import { partnershipStatusLabel, krRegionLabel, krZones } from "@/lib/utils/labels";
import { facilityContractRecord, contractRecordLabel, contractRecordKeys } from "@/lib/partner/contract-record";
import { loadHubContracts } from "@/lib/partner/contract-record-server";

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
  searchParams: { new?: string; zone?: string; status?: string; q?: string; contract?: string };
}) {
  const supabase = createClient();
  const { data: facilities, error } = await supabase
    .from("facilities")
    .select("*")
    .order("region", { ascending: true, nullsFirst: false })
    .order("name");

  const rows = facilities ?? [];

  // 계약서 서명 상태: 허브 전자서명 상태(자동) + 서명본 PDF 보관 체크(직접 입력)를 합쳐서 계산한다.
  const hubContracts = await loadHubContracts(rows.map((f) => f.id));
  const contractOf = (f: (typeof rows)[number]) =>
    facilityContractRecord({
      hubStatus: hubContracts.get(f.id)?.status,
      pdfKept: f.contract_pdf_kept,
      partnershipStatus: f.partnership_status,
    });

  // --- 필터 + 권역 묶음 -------------------------------------------------
  const statusFilter = searchParams.status && searchParams.status in partnershipStatusLabel ? searchParams.status : "";
  const q = (searchParams.q ?? "").trim().toLowerCase();
  const contractFilter = contractRecordKeys.some((k) => k === searchParams.contract) ? searchParams.contract! : "";
  const zoneFilter =
    searchParams.zone === "none" || krZones.some((z) => z.key === searchParams.zone) ? searchParams.zone! : "";

  // 상태·검색어 필터를 먼저 적용한 결과로 권역별 개수를 센다(칩의 숫자).
  const baseRows = rows.filter((f) => {
    if (statusFilter && f.partnership_status !== statusFilter) return false;
    if (contractFilter && contractOf(f).key !== contractFilter) return false;
    if (q && !`${f.name} ${f.address ?? ""} ${f.representative_name ?? ""}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const zoneOf = (region: string | null): string =>
    region ? krZones.find((z) => z.regions.includes(region))?.key ?? "none" : "none";

  const zoneCounts: Record<string, number> = {};
  for (const f of baseRows) {
    const k = zoneOf(f.region);
    zoneCounts[k] = (zoneCounts[k] ?? 0) + 1;
  }

  const sections = [...krZones.map((z) => ({ key: z.key, label: z.label, regions: z.regions })), { key: "none", label: "지역 미지정", regions: [] as string[] }]
    .filter((z) => !zoneFilter || z.key === zoneFilter)
    .map((z) => {
      const list = baseRows
        .filter((f) => zoneOf(f.region) === z.key)
        .sort(
          (a, b) =>
            z.regions.indexOf(a.region ?? "") - z.regions.indexOf(b.region ?? "") || a.name.localeCompare(b.name, "ko")
        );
      const byRegion = z.regions
        .map((r) => ({ r, n: list.filter((f) => f.region === r).length }))
        .filter((x) => x.n > 0);
      return { ...z, list, byRegion };
    })
    .filter((z) => z.list.length > 0);

  const chipHref = (zone: string) => {
    const sp = new URLSearchParams();
    if (zone) sp.set("zone", zone);
    if (statusFilter) sp.set("status", statusFilter);
    if (contractFilter) sp.set("contract", contractFilter);
    if (searchParams.q) sp.set("q", searchParams.q);
    const qs = sp.toString();
    return qs ? `/facilities?${qs}` : "/facilities";
  };
  const chipClass = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs ${
      active ? "border-brand-600 bg-brand-50 font-medium text-brand-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
    }`;

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

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={chipHref("")} className={chipClass(!zoneFilter)}>
            전체 {baseRows.length}
          </Link>
          {[...krZones.map((z) => ({ key: z.key, label: z.label })), { key: "none", label: "지역 미지정" }].map((z) => (
            <Link key={z.key} href={chipHref(z.key)} className={chipClass(zoneFilter === z.key)}>
              {z.label} {zoneCounts[z.key] ?? 0}
            </Link>
          ))}
        </div>

        <form action="/facilities" method="get" className="flex flex-wrap items-center gap-2">
          {zoneFilter && <input type="hidden" name="zone" value={zoneFilter} />}
          <Input name="q" placeholder="시설명·주소·대표자 검색" defaultValue={searchParams.q ?? ""} className="w-60" />
          <Select name="status" defaultValue={statusFilter} className="w-40">
            <option value="">전체 상태</option>
            {Object.entries(partnershipStatusLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Select name="contract" defaultValue={contractFilter} className="w-48">
            <option value="">전체 계약서 상태</option>
            {contractRecordKeys.map((key) => (
              <option key={key} value={key}>
                {contractRecordLabel[key]}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="secondary" size="sm">
            조회
          </Button>
          {(zoneFilter || statusFilter || contractFilter || q) && (
            <Link href="/facilities" className="text-xs text-slate-500 hover:underline">
              필터 해제
            </Link>
          )}
        </form>
      </div>

      {error && <p className="text-sm text-red-600">{error.message}</p>}

      {sections.length === 0 ? (
        <Card>
          <CardContent>
            <p className="py-6 text-center text-sm text-slate-400">
              {rows.length === 0 ? "등록된 시설이 없습니다." : "조건에 맞는 시설이 없습니다."}
            </p>
          </CardContent>
        </Card>
      ) : (
        sections.map((z) => (
          <Card key={z.key}>
            <CardHeader>
              <CardTitle>
                {z.label} · {z.list.length}곳
              </CardTitle>
              <span className="text-xs text-slate-500">
                {z.key === "none"
                  ? "시설 상세에서 지역을 지정하면 해당 권역으로 이동합니다"
                  : z.byRegion.map((x) => `${krRegionLabel[x.r]} ${x.n}`).join(" · ")}
              </span>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <Thead>
                  <Tr>
                    <Th>이름</Th>
                    <Th>지역</Th>
                    <Th>주소</Th>
                    <Th>대표자</Th>
                    <Th>파트너십 상태</Th>
                    <Th>계약서</Th>
                    <Th>코트 수</Th>
                  </Tr>
                </Thead>
                <tbody>
                  {z.list.map((f) => (
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
                      <Td>
                        <Badge tone={contractOf(f).tone} title={contractOf(f).hint}>
                          {contractOf(f).label}
                        </Badge>
                      </Td>
                      <Td>{f.courts_count ?? "—"}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}

      {searchParams.new && (
        <Modal title="시설 추가" closeHref="/facilities">
          <FacilityForm action={createFacility} />
        </Modal>
      )}
    </div>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, Thead, Tr, Th, Td } from "@/components/ui/Table";
import { facilityTierLabel } from "@/lib/partner/tier";
import { krRegionLabel, partnerApplicationStatusLabel } from "@/lib/utils/labels";
import type { FacilityTier, PartnerApplicationStatus } from "@/lib/types/database.types";

export const dynamic = "force-dynamic";

const STATUSES: PartnerApplicationStatus[] = ["pending", "approved", "rejected"];

// 로그인 없는 초대 링크(/partner-apply/[invite])로 들어온 브랜드 파트너 신청서 목록.
// 개인정보·계좌가 들어 있어 RLS상 관리자만 행이 보인다.
export default async function PartnerApplicationsPage({ searchParams }: { searchParams: { status?: string } }) {
  const supabase = createClient();
  const filter: PartnerApplicationStatus = STATUSES.includes(searchParams.status as PartnerApplicationStatus)
    ? (searchParams.status as PartnerApplicationStatus)
    : "pending";
  const { data: rows, error } = await supabase
    .from("partner_applications")
    .select("id, facility_name, region, courts_count, status, expected_score, expected_tier, final_tier, review_reasons, created_at")
    .eq("status", filter)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">브랜드 파트너 신청</h1>
        <p className="mt-1 text-sm text-slate-500">
          예상 티어는 신청자 자가 응답으로 계산한 값입니다. 내용을 검증한 뒤 최종 티어를 정해 승인하거나, 메시지를 남겨
          거절하세요.
        </p>
      </div>

      <div className="flex gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/partner-applications?status=${s}`}
            className={`rounded-full px-3 py-1 text-sm ${filter === s ? "bg-brand-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
          >
            {partnerApplicationStatusLabel[s]}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {partnerApplicationStatusLabel[filter]} {rows?.length ?? 0}건
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <p className="p-5 text-sm text-red-600">신청서를 불러오지 못했습니다: {error.message}</p>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>시설명</Th>
                  <Th>지역</Th>
                  <Th>코트</Th>
                  <Th>점수</Th>
                  <Th>예상 티어</Th>
                  <Th>최종 티어</Th>
                  <Th>신청일</Th>
                </Tr>
              </Thead>
              <tbody>
                {(rows ?? []).map((r) => (
                  <Tr key={r.id}>
                    <Td>
                      <Link href={`/partner-applications/${r.id}`} className="font-medium text-brand-700 hover:underline">
                        {r.facility_name}
                      </Link>
                      {r.review_reasons?.length > 0 && (
                        <Badge tone="red" className="ml-2">
                          검토 필요
                        </Badge>
                      )}
                    </Td>
                    <Td>{krRegionLabel[r.region] ?? r.region}</Td>
                    <Td>{r.courts_count}</Td>
                    <Td>{r.expected_score}</Td>
                    <Td>{r.expected_tier ? facilityTierLabel[r.expected_tier as FacilityTier] : "—"}</Td>
                    <Td>{r.final_tier ? facilityTierLabel[r.final_tier as FacilityTier] : "—"}</Td>
                    <Td>{new Date(r.created_at).toLocaleDateString("ko-KR")}</Td>
                  </Tr>
                ))}
                {(rows ?? []).length === 0 && (
                  <Tr>
                    <Td colSpan={7} className="text-center text-slate-400">
                      신청서가 없습니다.
                    </Td>
                  </Tr>
                )}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

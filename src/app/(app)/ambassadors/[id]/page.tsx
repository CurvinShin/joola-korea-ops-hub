import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { updateAmbassador, deleteAmbassador } from "@/lib/actions/ambassadors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AmbassadorForm } from "@/components/ambassadors/AmbassadorForm";
import type { ContractStatus } from "@/lib/types/database.types";
import { ambassadorTypeLabel, contractStatusLabel } from "@/lib/utils/labels";

export const dynamic = "force-dynamic";

const statusTone: Record<ContractStatus, "green" | "amber" | "slate" | "red"> = {
  active: "green",
  negotiating: "amber",
  prospect: "slate",
  expired: "red",
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

export default async function AmbassadorDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: ambassador } = await supabase.from("ambassadors").select("*").eq("id", params.id).maybeSingle();

  if (!ambassador) notFound();

  const updateWithId = updateAmbassador.bind(null, ambassador.id);
  const deleteWithId = deleteAmbassador.bind(null, ambassador.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/ambassadors" className="text-xs text-slate-400 hover:underline">
            ← 전체 앰버서더
          </Link>
          <h1 className="text-xl font-semibold text-slate-900">{ambassador.name}</h1>
        </div>
        <form action={deleteWithId}>
          <Button type="submit" variant="danger" size="sm">
            삭제
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
                <Badge tone="blue">{ambassadorTypeLabel[ambassador.type] ?? ambassador.type}</Badge>
                <Badge tone={statusTone[ambassador.contract_status as ContractStatus]}>
                  {contractStatusLabel[ambassador.contract_status] ?? ambassador.contract_status}
                </Badge>
              </div>
              <InfoRow label="이메일주소" value={ambassador.email ?? "—"} />
              <InfoRow label="전화번호" value={ambassador.phone ?? "—"} />
              <InfoRow label="인스타그램" value={ambassador.social_media_handle ?? "—"} />
              <InfoRow label="주력 패들" value={ambassador.main_paddle ?? "—"} />
              <InfoRow label="듀퍼 (DUPR)" value={ambassador.dupr_rating != null ? String(ambassador.dupr_rating) : "—"} />
              <InfoRow label="전달한 용품" value={ambassador.equipment_support ?? "—"} />
              <InfoRow label="보상 조건" value={ambassador.compensation ?? "—"} />
              <InfoRow
                label="계약 기간"
                value={
                  ambassador.contract_start || ambassador.contract_end
                    ? `${ambassador.contract_start ?? "—"} ~ ${ambassador.contract_end ?? "—"}`
                    : "—"
                }
              />
            </CardContent>
          </Card>

          {ambassador.kpi && (
            <Card>
              <CardHeader>
                <CardTitle>KPI</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-700">{ambassador.kpi}</CardContent>
            </Card>
          )}

          {ambassador.content_obligations && (
            <Card>
              <CardHeader>
                <CardTitle>콘텐츠 의무사항</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-700">{ambassador.content_obligations}</CardContent>
            </Card>
          )}

          {ambassador.performance_notes && (
            <Card>
              <CardHeader>
                <CardTitle>기타 메모</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-700">{ambassador.performance_notes}</CardContent>
            </Card>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>정보 수정</CardTitle>
          </CardHeader>
          <CardContent>
            <AmbassadorForm action={updateWithId} defaultValues={ambassador} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

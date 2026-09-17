import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAmbassador } from "@/lib/actions/ambassadors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, Thead, Tr, Th, Td } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
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

export default async function AmbassadorsPage({
  searchParams,
}: {
  searchParams: { new?: string };
}) {
  const supabase = createClient();
  const { data: ambassadors, error } = await supabase.from("ambassadors").select("*").order("name");

  const rows = ambassadors ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">선수 / 앰버서더 / 인플루언서</h1>
          <p className="text-sm text-slate-500">계약, 보상, 장비 지원 및 콘텐츠 의무사항입니다.</p>
        </div>
        <Link href="/ambassadors?new=1">
          <Button>앰버서더 추가</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>앰버서더 {rows.length}명</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && <p className="p-5 text-sm text-red-600">{error.message}</p>}
          {rows.length > 0 ? (
            <Table>
              <Thead>
                <Tr>
                  <Th>이름</Th>
                  <Th>구분</Th>
                  <Th>계약 상태</Th>
                  <Th>인스타그램</Th>
                  <Th>주력 패들</Th>
                  <Th className="text-right">듀퍼</Th>
                </Tr>
              </Thead>
              <tbody>
                {rows.map((a) => (
                  <Tr key={a.id}>
                    <Td>
                      <Link href={`/ambassadors/${a.id}`} className="font-medium text-brand-700 hover:underline">
                        {a.name}
                      </Link>
                    </Td>
                    <Td>{ambassadorTypeLabel[a.type] ?? a.type}</Td>
                    <Td>
                      <Badge tone={statusTone[a.contract_status as ContractStatus]}>
                        {contractStatusLabel[a.contract_status] ?? a.contract_status}
                      </Badge>
                    </Td>
                    <Td>{a.social_media_handle ?? "—"}</Td>
                    <Td>{a.main_paddle ?? "—"}</Td>
                    <Td className="text-right">{a.dupr_rating ?? "—"}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="p-8 text-center text-sm text-slate-400">등록된 앰버서더가 없습니다.</p>
          )}
        </CardContent>
      </Card>

      {searchParams.new && (
        <Modal title="앰버서더 추가" closeHref="/ambassadors">
          <AmbassadorForm action={createAmbassador} />
        </Modal>
      )}
    </div>
  );
}

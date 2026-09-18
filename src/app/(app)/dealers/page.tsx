import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createDealer } from "@/lib/actions/dealers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Table, Thead, Tr, Th, Td } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { DealerForm } from "@/components/dealers/DealerForm";
import type { DealerStatus } from "@/lib/types/database.types";
import { dealerStatusLabel } from "@/lib/utils/labels";
import { formatDealerSegment } from "@/lib/utils/dealerSegments";

export const dynamic = "force-dynamic";

const currency = (n: number) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n);

const statusTone: Record<DealerStatus, "green" | "amber" | "slate" | "red"> = {
  active: "green",
  pending: "amber",
  inactive: "slate",
  terminated: "red",
};

export default async function DealersPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; new?: string };
}) {
  const supabase = createClient();
  let query = supabase
    .from("dealers")
    .select("*")
    .order("kr_code", { ascending: true, nullsFirst: false })
    .order("name");

  if (searchParams.q) {
    query = query.ilike("name", `%${searchParams.q}%`);
  }
  if (searchParams.status) {
    query = query.eq("status", searchParams.status);
  }

  const { data: dealers, error } = await query;

  const ytdGrandTotal = (dealers ?? []).reduce((sum, d) => sum + Number(d.ytd_quote_amount ?? 0), 0);
  const mtdGrandTotal = (dealers ?? []).reduce((sum, d) => sum + Number(d.mtd_quote_amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">딜러</h1>
          <p className="text-sm text-slate-500">딜러별 계약, 할인율, 주문 현황입니다.</p>
        </div>
        <Link href="/dealers?new=1">
          <Button>딜러 추가</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>구매액 합계 (견적서 기준)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-slate-400">
            아래 목록에 표시된 딜러 {dealers?.length ?? 0}곳 기준 합계입니다.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-slate-400">올해 구매액 합계</p>
              <p className="text-lg font-semibold text-slate-900">{currency(ytdGrandTotal)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">이번달 구매액 합계</p>
              <p className="text-lg font-semibold text-slate-900">{currency(mtdGrandTotal)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <form className="flex flex-wrap gap-3">
        <Input name="q" placeholder="이름으로 검색..." defaultValue={searchParams.q} className="max-w-xs" />
        <Select name="status" defaultValue={searchParams.status ?? ""} className="max-w-[160px]">
          <option value="">전체 상태</option>
          <option value="active">활성</option>
          <option value="pending">대기</option>
          <option value="inactive">비활성</option>
          <option value="terminated">계약 종료</option>
        </Select>
        <Button type="submit" variant="secondary">
          필터
        </Button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>딜러 {dealers?.length ?? 0}곳</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && <p className="p-5 text-sm text-red-600">{error.message}</p>}
          {dealers && dealers.length > 0 ? (
            <Table>
              <Thead>
                <Tr>
                  <Th>이름</Th>
                  <Th>세그먼트</Th>
                  <Th>상태</Th>
                  <Th>지역</Th>
                  <Th>할인율</Th>
                  <Th>계약 종료일</Th>
                  <Th className="text-right">
                    올해 구매액
                    <span className="ml-1 font-normal text-slate-400">(견적서)</span>
                  </Th>
                  <Th className="text-right">이번달 구매액</Th>
                </Tr>
              </Thead>
              <tbody>
                {dealers.map((d) => (
                  <Tr key={d.id}>
                    <Td>
                      <Link href={`/dealers/${d.id}`} className="font-medium text-brand-700 hover:underline">
                        {d.name}
                      </Link>
                    </Td>
                    <Td className="text-xs">
                      {formatDealerSegment(d.segment_category, d.segment_subcategory, d.segment_detail)}
                    </Td>
                    <Td>
                      <Badge tone={statusTone[d.status as DealerStatus]}>
                        {dealerStatusLabel[d.status] ?? d.status}
                      </Badge>
                    </Td>
                    <Td>{d.region ?? "—"}</Td>
                    <Td>{d.discount_rate}%</Td>
                    <Td>{d.contract_end ?? "—"}</Td>
                    <Td className="text-right">
                      {d.ytd_quote_amount != null ? currency(Number(d.ytd_quote_amount)) : "—"}
                    </Td>
                    <Td className="text-right">
                      {d.mtd_quote_amount != null ? currency(Number(d.mtd_quote_amount)) : "—"}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="p-8 text-center text-sm text-slate-400">조건에 맞는 딜러가 없습니다.</p>
          )}
        </CardContent>
      </Card>

      {searchParams.new && (
        <Modal title="딜러 추가" closeHref="/dealers">
          <DealerForm action={createDealer} />
        </Modal>
      )}
    </div>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createClaim, updateClaim, deleteClaim, setClaimStatus } from "@/lib/actions/claims";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, Thead, Tr, Th, Td } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import {
  ClaimForm,
  CLAIM_KIND_LABELS,
  CLAIM_CHANNEL_LABELS,
  CLAIM_STATUS_LABELS,
} from "@/components/claims/ClaimForm";
import type { RefundClaimRow } from "@/lib/types/database.types";

export const dynamic = "force-dynamic";

const won = (n: number) => `${new Intl.NumberFormat("ko-KR").format(Math.round(n))}원`;

const TABS: { key: string; label: string }[] = [
  { key: "active", label: "진행 중 + 대기" },
  { key: "waiting", label: "응답 대기" },
  { key: "done", label: "완료" },
  { key: "all", label: "전체" },
];

function daysSince(dateStr: string) {
  const start = new Date(`${dateStr}T00:00:00+09:00`).getTime();
  const nowKst = Date.now();
  return Math.max(0, Math.floor((nowKst - start) / 86400000));
}

export default async function ClaimsPage({
  searchParams,
}: {
  searchParams: { new?: string; edit?: string; status?: string };
}) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("refund_claims")
    .select("*")
    .order("opened_on", { ascending: true });
  const all = (data ?? []) as RefundClaimRow[];

  const tab = TABS.some((t) => t.key === searchParams.status) ? searchParams.status! : "active";
  const rows = all.filter((r) => {
    if (tab === "all") return true;
    if (tab === "done") return r.status === "done";
    if (tab === "waiting") return r.status === "waiting";
    return r.status !== "done";
  });
  // 오래 열린 건이 위로 오도록: 진행 중은 접수일 오름차순, 완료는 최근순
  if (tab === "done") rows.sort((a, b) => (b.resolved_on ?? "").localeCompare(a.resolved_on ?? ""));

  const openRows = all.filter((r) => r.status !== "done");
  const staleCount = openRows.filter((r) => daysSince(r.opened_on) >= 3).length;
  const openAmount = openRows.reduce((s, r) => s + Number(r.amount_krw ?? 0), 0);

  const editRow = searchParams.edit ? all.find((r) => r.id === searchParams.edit) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">환불·클레임</h1>
          <p className="text-sm text-slate-500">
            환불·교환·클레임이 며칠째 열려 있는지 한눈에 봅니다. 상대 답을 기다리는 건은 &quot;응답 대기&quot;로 두세요.
          </p>
        </div>
        <Link href="/claims?new=1">
          <Button>건 추가</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent>
            <p className="text-xs text-slate-500">열려 있는 건</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{openRows.length}건</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs text-slate-500">3일 넘게 열린 건</p>
            <p className={`mt-1 text-2xl font-semibold ${staleCount > 0 ? "text-red-600" : "text-slate-900"}`}>{staleCount}건</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs text-slate-500">열린 건 금액 합계</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{won(openAmount)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "active" ? "/claims" : `/claims?status=${t.key}`}
            scroll={false}
            className={`rounded-full px-3 py-1 text-sm ${
              tab === t.key ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{rows.length}건</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && <p className="p-5 text-sm text-red-600">{error.message}</p>}
          {rows.length > 0 ? (
            <Table>
              <Thead>
                <Tr>
                  <Th>접수일</Th>
                  <Th>경과</Th>
                  <Th>종류</Th>
                  <Th>채널</Th>
                  <Th>거래처/고객</Th>
                  <Th>제품·사유</Th>
                  <Th>금액</Th>
                  <Th>상태</Th>
                  <Th>다음 할 일</Th>
                  <Th></Th>
                </Tr>
              </Thead>
              <tbody>
                {rows.map((r) => {
                  const d = daysSince(r.opened_on);
                  const isOpen = r.status !== "done";
                  return (
                    <Tr key={r.id}>
                      <Td>{r.opened_on}</Td>
                      <Td>
                        {isOpen ? (
                          <span className={d >= 3 ? "font-semibold text-red-600" : ""}>{d}일째</span>
                        ) : (
                          <span className="text-slate-400">{r.resolved_on ?? "—"}</span>
                        )}
                      </Td>
                      <Td>{CLAIM_KIND_LABELS[r.kind] ?? r.kind}</Td>
                      <Td>{CLAIM_CHANNEL_LABELS[r.channel] ?? r.channel}</Td>
                      <Td className="font-medium text-slate-900">{r.counterparty}</Td>
                      <Td className="max-w-xs whitespace-pre-line">{r.product_summary ?? "—"}</Td>
                      <Td>{won(Number(r.amount_krw ?? 0))}</Td>
                      <Td>
                        <Badge tone={r.status === "done" ? "green" : r.status === "waiting" ? "blue" : "amber"}>
                          {CLAIM_STATUS_LABELS[r.status]}
                        </Badge>
                      </Td>
                      <Td className="max-w-xs">{r.next_action ?? "—"}</Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-3 whitespace-nowrap">
                          {r.status === "open" && (
                            <form action={setClaimStatus.bind(null, r.id, "waiting")}>
                              <button className="text-blue-700 hover:underline">대기로</button>
                            </form>
                          )}
                          {r.status !== "done" && (
                            <form action={setClaimStatus.bind(null, r.id, "done")}>
                              <button className="text-emerald-700 hover:underline">완료</button>
                            </form>
                          )}
                          <Link href={`/claims?edit=${r.id}`} className="text-brand-600 hover:underline">
                            수정
                          </Link>
                          <form action={deleteClaim.bind(null, r.id)}>
                            <button className="text-red-600 hover:underline">삭제</button>
                          </form>
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          ) : (
            <p className="p-8 text-center text-sm text-slate-400">해당하는 건이 없습니다.</p>
          )}
        </CardContent>
      </Card>

      {searchParams.new && (
        <Modal title="환불·클레임 건 추가" closeHref="/claims">
          <ClaimForm action={createClaim} />
        </Modal>
      )}

      {editRow && (
        <Modal title={`${editRow.counterparty} 수정`} closeHref="/claims">
          <ClaimForm action={updateClaim.bind(null, editRow.id)} defaultValues={editRow} />
        </Modal>
      )}
    </div>
  );
}

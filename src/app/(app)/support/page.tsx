import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  createSupportShipment,
  updateSupportShipment,
  deleteSupportShipment,
  markSupportShipped,
} from "@/lib/actions/support";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, Thead, Tr, Th, Td } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { SupportForm, SUPPORT_CATEGORY_LABELS } from "@/components/support/SupportForm";
import type { SupportShipmentRow } from "@/lib/types/database.types";

export const dynamic = "force-dynamic";

const won = (n: number) => `${new Intl.NumberFormat("ko-KR").format(Math.round(n))}원`;

const TABS: { key: string; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "pending", label: "준비 중" },
  { key: "shipped", label: "출고 완료" },
];

export default async function SupportPage({
  searchParams,
}: {
  searchParams: { new?: string; edit?: string; status?: string };
}) {
  const supabase = createClient();
  const [{ data: rowsRaw, error }, { data: events }] = await Promise.all([
    supabase.from("support_shipments").select("*").order("shipped_on", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("events").select("id, name, event_date").order("event_date", { ascending: false }),
  ]);
  const all = (rowsRaw ?? []) as SupportShipmentRow[];
  const eventList = (events ?? []) as { id: string; name: string; event_date: string }[];
  const eventName = new Map(eventList.map((e) => [e.id, e.name]));

  const status = TABS.some((t) => t.key === searchParams.status) ? searchParams.status! : "all";
  const rows = status === "all" ? all : all.filter((r) => r.status === status);

  const month = new Date().toISOString().slice(0, 7);
  const thisMonth = all.filter((r) => r.shipped_on.startsWith(month));
  const sum = (xs: SupportShipmentRow[]) => xs.reduce((s, r) => s + Number(r.value_krw ?? 0), 0);
  const pendingCount = all.filter((r) => r.status === "pending").length;

  const byCategory = new Map<string, { count: number; value: number }>();
  for (const r of all) {
    const cur = byCategory.get(r.category) ?? { count: 0, value: 0 };
    cur.count += 1;
    cur.value += Number(r.value_krw ?? 0);
    byCategory.set(r.category, cur);
  }

  const editRow = searchParams.edit ? all.find((r) => r.id === searchParams.edit) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">협찬·지원</h1>
          <p className="text-sm text-slate-500">
            브랜드 파트너십, 인플루언서, 대회·행사 지원, 선수 장비 지원 출고 기록입니다. 받는 곳은 이름/단체명만 적어주세요.
          </p>
        </div>
        <Link href="/support?new=1">
          <Button>지원 건 추가</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent>
            <p className="text-xs text-slate-500">이번 달 건수</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{thisMonth.length}건</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs text-slate-500">이번 달 금액</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{won(sum(thisMonth))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs text-slate-500">준비 중 (미출고)</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{pendingCount}건</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs text-slate-500">누적 금액 ({all.length}건)</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{won(sum(all))}</p>
          </CardContent>
        </Card>
      </div>

      {byCategory.size > 0 && (
        <p className="text-xs text-slate-500">
          구분별 누적:{" "}
          {Array.from(byCategory.entries())
            .map(([k, v]) => `${SUPPORT_CATEGORY_LABELS[k] ?? k} ${v.count}건 ${won(v.value)}`)
            .join(" · ")}
        </p>
      )}

      <div className="flex gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "all" ? "/support" : `/support?status=${t.key}`}
            scroll={false}
            className={`rounded-full px-3 py-1 text-sm ${
              status === t.key ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>지원 기록 {rows.length}건</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && <p className="p-5 text-sm text-red-600">{error.message}</p>}
          {rows.length > 0 ? (
            <Table>
              <Thead>
                <Tr>
                  <Th>날짜</Th>
                  <Th>구분</Th>
                  <Th>받는 곳</Th>
                  <Th>품목·수량</Th>
                  <Th>행사</Th>
                  <Th>금액</Th>
                  <Th>상태</Th>
                  <Th></Th>
                </Tr>
              </Thead>
              <tbody>
                {rows.map((r) => (
                  <Tr key={r.id}>
                    <Td>{r.shipped_on}</Td>
                    <Td>{SUPPORT_CATEGORY_LABELS[r.category] ?? r.category}</Td>
                    <Td className="font-medium text-slate-900">{r.recipient_name}</Td>
                    <Td className="max-w-xs whitespace-pre-line">{r.items}</Td>
                    <Td>{r.event_id ? eventName.get(r.event_id) ?? "—" : "—"}</Td>
                    <Td>{won(Number(r.value_krw ?? 0))}</Td>
                    <Td>
                      {r.status === "shipped" ? <Badge tone="green">출고 완료</Badge> : <Badge tone="amber">준비 중</Badge>}
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-3">
                        {r.status === "pending" && (
                          <form action={markSupportShipped.bind(null, r.id)}>
                            <button className="text-emerald-700 hover:underline">출고 처리</button>
                          </form>
                        )}
                        <Link href={`/support?edit=${r.id}`} className="text-brand-600 hover:underline">
                          수정
                        </Link>
                        <form action={deleteSupportShipment.bind(null, r.id)}>
                          <button className="text-red-600 hover:underline">삭제</button>
                        </form>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="p-8 text-center text-sm text-slate-400">기록이 없습니다.</p>
          )}
        </CardContent>
      </Card>

      {searchParams.new && (
        <Modal title="지원 건 추가" closeHref="/support">
          <SupportForm action={createSupportShipment} events={eventList} />
        </Modal>
      )}

      {editRow && (
        <Modal title={`${editRow.recipient_name} 수정`} closeHref="/support">
          <SupportForm action={updateSupportShipment.bind(null, editRow.id)} defaultValues={editRow} events={eventList} />
        </Modal>
      )}
    </div>
  );
}

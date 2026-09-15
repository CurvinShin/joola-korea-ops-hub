import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createEvent, updateEvent, deleteEvent } from "@/lib/actions/events";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, Thead, Tr, Th, Td } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { EventForm } from "@/components/events/EventForm";

export const dynamic = "force-dynamic";

const currency = (n: number) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n);

export default async function EventsPage({
  searchParams,
}: {
  searchParams: { new?: string; edit?: string };
}) {
  const supabase = createClient();
  const { data: events, error } = await supabase.from("events").select("*").order("event_date", { ascending: false });

  const today = new Date().toISOString().slice(0, 10);
  const editRow = searchParams.edit ? events?.find((e) => e.id === searchParams.edit) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">이벤트</h1>
          <p className="text-sm text-slate-500">스폰서십, 예산, 행사 후 리포트입니다.</p>
        </div>
        <Link href="/events?new=1">
          <Button>이벤트 추가</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>이벤트 {events?.length ?? 0}건</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && <p className="p-5 text-sm text-red-600">{error.message}</p>}
          {events && events.length > 0 ? (
            <Table>
              <Thead>
                <Tr>
                  <Th>이벤트</Th>
                  <Th>날짜</Th>
                  <Th>장소</Th>
                  <Th>예산</Th>
                  <Th>참가 인원</Th>
                  <Th>현장 매출</Th>
                  <Th></Th>
                </Tr>
              </Thead>
              <tbody>
                {events.map((e) => (
                  <Tr key={e.id}>
                    <Td className="font-medium text-slate-900">{e.name}</Td>
                    <Td>
                      {e.event_date}{" "}
                      {e.event_date >= today && <Badge tone="blue">예정</Badge>}
                    </Td>
                    <Td>{e.location ?? "—"}</Td>
                    <Td>{currency(Number(e.budget ?? 0))}</Td>
                    <Td>
                      {e.actual_participants ?? "—"} / {e.expected_participants ?? "—"} (예상)
                    </Td>
                    <Td>{currency(Number(e.onsite_sales ?? 0))}</Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-3">
                        <Link href={`/events?edit=${e.id}`} className="text-brand-600 hover:underline">
                          수정
                        </Link>
                        <form action={deleteEvent.bind(null, e.id)}>
                          <button className="text-red-600 hover:underline">삭제</button>
                        </form>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="p-8 text-center text-sm text-slate-400">등록된 이벤트가 없습니다.</p>
          )}
        </CardContent>
      </Card>

      {searchParams.new && (
        <Modal title="이벤트 추가" closeHref="/events">
          <EventForm action={createEvent} />
        </Modal>
      )}

      {editRow && (
        <Modal title={`${editRow.name} 수정`} closeHref="/events">
          <EventForm action={updateEvent.bind(null, editRow.id)} defaultValues={editRow} />
        </Modal>
      )}
    </div>
  );
}

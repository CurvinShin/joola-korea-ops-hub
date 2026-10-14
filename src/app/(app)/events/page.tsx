import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createEvent, updateEvent, updateEventResult, deleteEvent } from "@/lib/actions/events";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, Thead, Tr, Th, Td } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { EventForm } from "@/components/events/EventForm";
import { EventResultForm } from "@/components/events/EventResultForm";

export const dynamic = "force-dynamic";

const currency = (n: number) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n);

type EventRowExt = {
  id: string;
  name: string;
  event_date: string;
  location: string | null;
  organizer: string | null;
  budget: number | null;
  expected_participants: number | null;
  actual_participants: number | null;
  onsite_sales: number | null;
  sponsorship_details: string | null;
  notes: string | null;
  post_event_report: string | null;
  actual_cost: number | null;
  result_links: string | null;
};

const hasResult = (e: EventRowExt) => !!(e.post_event_report && e.post_event_report.trim());

export default async function EventsPage({
  searchParams,
}: {
  searchParams: { new?: string; edit?: string; result?: string; view?: string };
}) {
  const supabase = createClient();
  const { data, error } = await supabase.from("events").select("*").order("event_date", { ascending: false });
  const events = (data ?? []) as unknown as EventRowExt[];

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const needsResult = events.filter((e) => e.event_date < today && !hasResult(e));
  const upcoming = events.filter((e) => e.event_date >= today);
  const past = events.filter((e) => e.event_date < today);

  const view = ["upcoming", "past", "needs"].includes(searchParams.view ?? "") ? (searchParams.view as string) : "all";
  const shown = view === "upcoming" ? upcoming : view === "past" ? past : view === "needs" ? needsResult : events;

  const editRow = searchParams.edit ? events.find((e) => e.id === searchParams.edit) : undefined;
  const resultRow = searchParams.result ? events.find((e) => e.id === searchParams.result) : undefined;

  const tab = (value: string, label: string, count: number) => (
    <Link
      key={value}
      href={value === "all" ? "/events" : `/events?view=${value}`}
      className={`rounded-full border px-3 py-1 text-sm ${
        view === value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label} {count}
    </Link>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">이벤트</h1>
          <p className="text-sm text-slate-500">스폰서십, 예산, 그리고 행사가 끝난 뒤의 결과(참가 인원·매출·지출·후기)를 기록합니다.</p>
        </div>
        <Link href="/events?new=1">
          <Button>이벤트 추가</Button>
        </Link>
      </div>

      {needsResult.length > 0 && view !== "needs" && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          결과를 아직 적지 않은 지난 이벤트가 {needsResult.length}건 있습니다.{" "}
          <Link href="/events?view=needs" className="font-medium underline">
            결과 작성하러 가기
          </Link>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {tab("all", "전체", events.length)}
        {tab("upcoming", "예정", upcoming.length)}
        {tab("past", "지난 이벤트", past.length)}
        {tab("needs", "결과 작성 필요", needsResult.length)}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>이벤트 {shown.length}건</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && <p className="p-5 text-sm text-red-600">{error.message}</p>}
          {shown.length > 0 ? (
            <Table>
              <Thead>
                <Tr>
                  <Th>이벤트</Th>
                  <Th>날짜</Th>
                  <Th>장소</Th>
                  <Th>예산 / 실제 지출</Th>
                  <Th>참가 인원</Th>
                  <Th>현장 매출</Th>
                  <Th></Th>
                </Tr>
              </Thead>
              <tbody>
                {shown.map((e) => {
                  const isPast = e.event_date < today;
                  const done = hasResult(e);
                  return (
                    <Tr key={e.id}>
                      <Td className="font-medium text-slate-900">
                        <p>{e.name}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {!isPast && <Badge tone="blue">예정</Badge>}
                          {isPast && done && <Badge tone="green">결과 작성 완료</Badge>}
                          {isPast && !done && <Badge tone="amber">결과 작성 필요</Badge>}
                        </div>
                        {done && (
                          <details className="mt-2 font-normal">
                            <summary className="cursor-pointer text-xs text-brand-600 hover:underline">결과 보기</summary>
                            <div className="mt-1.5 max-w-md space-y-1.5 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                              <p className="whitespace-pre-line">{e.post_event_report}</p>
                              {e.result_links && (
                                <ul className="space-y-0.5">
                                  {e.result_links
                                    .split("\n")
                                    .map((l) => l.trim())
                                    .filter(Boolean)
                                    .map((l, i) =>
                                      /^https?:\/\//i.test(l) ? (
                                        <li key={i}>
                                          <a href={l} target="_blank" rel="noopener noreferrer" className="break-all text-brand-600 hover:underline">
                                            {l}
                                          </a>
                                        </li>
                                      ) : (
                                        <li key={i} className="break-all">
                                          {l}
                                        </li>
                                      )
                                    )}
                                </ul>
                              )}
                            </div>
                          </details>
                        )}
                      </Td>
                      <Td>{e.event_date}</Td>
                      <Td>{e.location ?? "—"}</Td>
                      <Td className="text-xs">
                        <p>{currency(Number(e.budget ?? 0))}</p>
                        <p className="text-slate-400">{e.actual_cost != null ? currency(Number(e.actual_cost)) : "지출 미입력"}</p>
                      </Td>
                      <Td>
                        {e.actual_participants ?? "—"} / {e.expected_participants ?? "—"} (예상)
                      </Td>
                      <Td>{currency(Number(e.onsite_sales ?? 0))}</Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-3">
                          <Link href={`/events?result=${e.id}`} className="font-medium text-brand-600 hover:underline">
                            {done ? "결과 수정" : "결과 작성"}
                          </Link>
                          <Link href={`/events?edit=${e.id}`} className="text-brand-600 hover:underline">
                            수정
                          </Link>
                          <form action={deleteEvent.bind(null, e.id)}>
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
            <p className="p-8 text-center text-sm text-slate-400">
              {view === "needs" ? "결과를 적어야 할 이벤트가 없습니다." : "등록된 이벤트가 없습니다."}
            </p>
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

      {resultRow && (
        <Modal title={`${resultRow.name} · 결과 작성`} closeHref="/events">
          <EventResultForm action={updateEventResult.bind(null, resultRow.id)} defaultValues={resultRow} budget={resultRow.budget} />
        </Modal>
      )}
    </div>
  );
}

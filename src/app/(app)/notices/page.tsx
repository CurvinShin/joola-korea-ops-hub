import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createNotice, updateNotice, deleteNotice } from "@/lib/actions/notices";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, Thead, Tr, Th, Td } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { NoticeForm } from "@/components/notices/NoticeForm";

export const dynamic = "force-dynamic";

function todayKst(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

export default async function NoticesPage({
  searchParams,
}: {
  searchParams: { new?: string; edit?: string };
}) {
  const supabase = createClient();

  const [{ data: rows, error }, { data: dealers }] = await Promise.all([
    supabase
      .from("site_notices")
      .select("*, notice_acknowledgments(count), notice_dealer_targets(count)")
      .order("publish_on", { ascending: false }),
    supabase.from("dealers").select("id, name").order("name"),
  ]);

  const dealerList = dealers ?? [];
  const totalDealerCount = dealerList.length;
  const today = todayKst();

  let editDealerIds: string[] = [];
  if (searchParams.edit) {
    const { data: targets } = await supabase
      .from("notice_dealer_targets")
      .select("dealer_id")
      .eq("notice_id", searchParams.edit);
    editDealerIds = (targets ?? []).map((t) => t.dealer_id);
  }
  const editRow = searchParams.edit ? rows?.find((r) => r.id === searchParams.edit) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">공지사항</h1>
          <p className="text-sm text-slate-500">
            딜러 주문 화면 상단 배너로 노출되는 공지를 관리합니다. &ldquo;확인&rdquo; 클릭 여부는 추적되지만
            클릭하지 않아도 화면 이용에는 제한이 없습니다.
          </p>
        </div>
        <Link href="/notices?new=1">
          <Button>공지 추가</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>공지 {rows?.length ?? 0}건</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && <p className="p-5 text-sm text-red-600">{error.message}</p>}
          {rows && rows.length > 0 ? (
            <Table>
              <Thead>
                <Tr>
                  <Th>제목</Th>
                  <Th>공개 대상</Th>
                  <Th>게시 기간</Th>
                  <Th>확인 현황</Th>
                  <Th>상태</Th>
                  <Th></Th>
                </Tr>
              </Thead>
              <tbody>
                {rows.map((r) => {
                  const ackCount =
                    (r as unknown as { notice_acknowledgments: { count: number }[] }).notice_acknowledgments?.[0]
                      ?.count ?? 0;
                  const targetCount =
                    (r as unknown as { notice_dealer_targets: { count: number }[] }).notice_dealer_targets?.[0]
                      ?.count ?? 0;
                  const denominator = r.target_mode === "specific" ? targetCount : totalDealerCount;
                  const inWindow = today >= r.publish_on && (!r.expires_on || today <= r.expires_on);
                  return (
                    <Tr key={r.id}>
                      <Td>{r.title}</Td>
                      <Td>{r.target_mode === "all" ? "전체 딜러" : `특정 딜러 ${targetCount}곳`}</Td>
                      <Td className="text-xs">
                        {r.publish_on} ~ {r.expires_on ?? "계속"}
                      </Td>
                      <Td>
                        {ackCount}/{denominator}곳 확인
                      </Td>
                      <Td>
                        {!r.active ? (
                          <Badge tone="slate">비활성</Badge>
                        ) : inWindow ? (
                          <Badge tone="green">게시중</Badge>
                        ) : today < r.publish_on ? (
                          <Badge tone="blue">예정</Badge>
                        ) : (
                          <Badge tone="slate">종료</Badge>
                        )}
                      </Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-3">
                          <Link href={`/notices?edit=${r.id}`} className="text-brand-600 hover:underline">
                            수정
                          </Link>
                          <form action={deleteNotice.bind(null, r.id)}>
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
            <p className="p-8 text-center text-sm text-slate-400">등록된 공지가 없습니다.</p>
          )}
        </CardContent>
      </Card>

      {searchParams.new && (
        <Modal title="공지 추가" closeHref="/notices">
          <NoticeForm action={createNotice} dealers={dealerList} />
        </Modal>
      )}

      {editRow && (
        <Modal title={`${editRow.title} 수정`} closeHref="/notices">
          <NoticeForm
            action={updateNotice.bind(null, editRow.id)}
            defaultValues={editRow}
            dealers={dealerList}
            defaultDealerIds={editDealerIds}
          />
        </Modal>
      )}
    </div>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createNotice, updateNotice, deleteNotice } from "@/lib/actions/notices";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, Thead, Tr, Th, Td } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Input";
import { NoticeForm } from "@/components/notices/NoticeForm";
import { PromotionAnnounceModal } from "@/components/notices/PromotionAnnounceModal";

export const dynamic = "force-dynamic";

function todayKst(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

export default async function NoticesPage({
  searchParams,
}: {
  searchParams: { new?: string; edit?: string; announce?: string };
}) {
  const supabase = createClient();

  const [{ data: rows, error }, { data: dealers }, { data: promos }, { data: allAcks }, { data: allTargets }] =
    await Promise.all([
    supabase
      .from("site_notices")
      .select("*, notice_acknowledgments(count), notice_dealer_targets(count)")
      .order("publish_on", { ascending: false }),
    supabase.from("dealers").select("id, name, classification, status").order("name"),
    supabase
      .from("product_promotions")
      .select("id, name, promo_price, discount_rate_percent, max_qty_per_dealer, starts_on, ends_on")
      .order("starts_on", { ascending: false }),
    supabase.from("notice_acknowledgments").select("notice_id, dealer_id"),
    supabase.from("notice_dealer_targets").select("notice_id, dealer_id"),
  ]);

  const dealerList = dealers ?? [];

  // 공지별 "확인한/아직 확인하지 않은 딜러" 계산용. 전체 대상 공지의 대상은 활성 딜러이고,
  // 특정 딜러 공지의 대상은 notice_dealer_targets에 들어 있는 딜러다.
  const activeDealerList = dealerList.filter((d) => d.status === "active");
  const dealerNameById = new Map(dealerList.map((d) => [d.id, d.name]));
  const acksByNotice = new Map<string, Set<string>>();
  for (const a of allAcks ?? []) {
    if (!acksByNotice.has(a.notice_id)) acksByNotice.set(a.notice_id, new Set());
    acksByNotice.get(a.notice_id)!.add(a.dealer_id);
  }
  const targetsByNotice = new Map<string, string[]>();
  for (const t of allTargets ?? []) {
    targetsByNotice.set(t.notice_id, [...(targetsByNotice.get(t.notice_id) ?? []), t.dealer_id]);
  }
  const today = todayKst();
  const promoList = promos ?? [];
  const announcePromo = searchParams.announce ? promoList.find((p) => p.id === searchParams.announce) : undefined;
  const announceCount = announcePromo
    ? (rows ?? []).filter((r) => (r as unknown as { promotion_id: string | null }).promotion_id === announcePromo.id).length
    : 0;

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
        <div className="flex flex-wrap items-center justify-end gap-2">
          {promoList.length > 0 && (
            <form action="/notices" method="get" className="flex items-center gap-2">
              <Select name="announce" defaultValue="" required className="max-w-[16rem]">
                <option value="" disabled>
                  프로모션 선택…
                </option>
                {promoList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.starts_on} ~ {p.ends_on})
                  </option>
                ))}
              </Select>
              <Button type="submit" variant="secondary">
                프로모션 시작 공지
              </Button>
            </form>
          )}
          <Link href="/notices?new=1">
            <Button>공지 추가</Button>
          </Link>
        </div>
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
                  const targetIds =
                    r.target_mode === "specific"
                      ? targetsByNotice.get(r.id) ?? []
                      : activeDealerList.map((d) => d.id);
                  const acked = acksByNotice.get(r.id) ?? new Set<string>();
                  const confirmedCount = targetIds.filter((id) => acked.has(id)).length;
                  const unconfirmedNames = targetIds
                    .filter((id) => !acked.has(id))
                    .map((id) => dealerNameById.get(id) ?? "")
                    .filter(Boolean);
                  const targetCount = targetIds.length;
                  const inWindow = today >= r.publish_on && (!r.expires_on || today <= r.expires_on);
                  return (
                    <Tr key={r.id}>
                      <Td>
                        {r.title}
                        {(r as unknown as { promotion_id: string | null }).promotion_id && (
                          <span className="ml-2 align-middle">
                            <Badge tone="blue">프로모션</Badge>
                          </span>
                        )}
                      </Td>
                      <Td>{r.target_mode === "all" ? "전체 딜러" : `특정 딜러 ${targetCount}곳`}</Td>
                      <Td className="text-xs">
                        {r.publish_on} ~ {r.expires_on ?? "계속"}
                      </Td>
                      <Td>
                        <p>
                          {confirmedCount}/{targetCount}곳 확인
                        </p>
                        {unconfirmedNames.length > 0 && (
                          <details className="mt-0.5">
                            <summary className="cursor-pointer text-xs text-amber-700 hover:underline">
                              미확인 {unconfirmedNames.length}곳 보기
                            </summary>
                            <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
                              {unconfirmedNames.join(", ")}
                            </p>
                          </details>
                        )}
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

      {announcePromo && (
        <PromotionAnnounceModal
          promo={announcePromo}
          dealers={dealerList}
          today={today}
          alreadyAnnouncedCount={announceCount}
          returnTo="/notices"
        />
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

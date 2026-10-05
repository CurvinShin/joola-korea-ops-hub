import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createPromotion, updatePromotion, deletePromotion } from "@/lib/actions/promotions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, Thead, Tr, Th, Td } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { PromotionForm } from "@/components/promotions/PromotionForm";

export const dynamic = "force-dynamic";

const currency = (n: number) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n);

function todayKst(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

export default async function PromotionsPage({
  searchParams,
}: {
  searchParams: { new?: string; edit?: string };
}) {
  const supabase = createClient();

  const { data: rows, error } = await supabase
    .from("product_promotions")
    .select("*, product_promotion_items(count)")
    .order("starts_on", { ascending: false });

  const today = todayKst();

  let editSkuList = "";
  if (searchParams.edit) {
    const { data: items } = await supabase
      .from("product_promotion_items")
      .select("products(sku)")
      .eq("promotion_id", searchParams.edit);
    editSkuList = ((items ?? []) as unknown as { products: { sku: string } | null }[])
      .map((i) => i.products?.sku)
      .filter((sku): sku is string => Boolean(sku))
      .sort()
      .join("\n");
  }
  const editRow = searchParams.edit ? rows?.find((r) => r.id === searchParams.edit) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">프로모션 관리</h1>
          <p className="text-sm text-slate-500">
            기간 한정 특가(예: 블랙프라이데이)를 등록하면 딜러 주문 화면에 자동으로 할인가가 적용됩니다.
          </p>
        </div>
        <Link href="/promotions?new=1">
          <Button>프로모션 추가</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>프로모션 {rows?.length ?? 0}건</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && <p className="p-5 text-sm text-red-600">{error.message}</p>}
          {rows && rows.length > 0 ? (
            <Table>
              <Thead>
                <Tr>
                  <Th>이름</Th>
                  <Th>그룹 코드</Th>
                  <Th>소비자가</Th>
                  <Th>딜러 할인</Th>
                  <Th>딜러당 한도</Th>
                  <Th>기간</Th>
                  <Th>적용 상품</Th>
                  <Th>상태</Th>
                  <Th></Th>
                </Tr>
              </Thead>
              <tbody>
                {rows.map((r) => {
                  const itemCount = (r as unknown as { product_promotion_items: { count: number }[] })
                    .product_promotion_items?.[0]?.count ?? 0;
                  const inWindow = today >= r.starts_on && today <= r.ends_on;
                  return (
                    <Tr key={r.id}>
                      <Td>{r.name}</Td>
                      <Td className="font-mono text-xs">{r.promo_group}</Td>
                      <Td>{currency(Number(r.promo_price))}</Td>
                      <Td>{Number(r.discount_rate_percent)}%</Td>
                      <Td>{r.max_qty_per_dealer ?? "제한 없음"}</Td>
                      <Td className="text-xs">
                        {r.starts_on} ~ {r.ends_on}
                      </Td>
                      <Td>{itemCount}개</Td>
                      <Td>
                        {!r.active ? (
                          <Badge tone="slate">비활성</Badge>
                        ) : inWindow ? (
                          <Badge tone="green">진행중</Badge>
                        ) : today < r.starts_on ? (
                          <Badge tone="blue">예정</Badge>
                        ) : (
                          <Badge tone="slate">종료</Badge>
                        )}
                      </Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-3">
                          <Link href={`/promotions?edit=${r.id}`} className="text-brand-600 hover:underline">
                            수정
                          </Link>
                          <form action={deletePromotion.bind(null, r.id)}>
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
            <p className="p-8 text-center text-sm text-slate-400">등록된 프로모션이 없습니다.</p>
          )}
        </CardContent>
      </Card>

      {searchParams.new && (
        <Modal title="프로모션 추가" closeHref="/promotions">
          <PromotionForm action={createPromotion} />
        </Modal>
      )}

      {editRow && (
        <Modal title={`${editRow.name} 수정`} closeHref="/promotions">
          <PromotionForm action={updatePromotion.bind(null, editRow.id)} defaultValues={{ ...editRow, skuList: editSkuList }} />
        </Modal>
      )}
    </div>
  );
}

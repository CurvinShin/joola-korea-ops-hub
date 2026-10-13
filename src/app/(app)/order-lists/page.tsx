import { createClient } from "@/lib/supabase/server";
import { deleteOrderListFile } from "@/lib/actions/order-lists";
import { OrderListUploadForm } from "@/components/order-lists/OrderListUploadForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, Thead, Tr, Th, Td } from "@/components/ui/Table";

export const dynamic = "force-dynamic";

const todayKst = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
const size = (n: number | null) => (n ? `${(n / 1024 / 1024).toFixed(1)}MB` : "—");

export default async function OrderListsPage() {
  const supabase = createClient();
  const [{ data: files, error }, { data: dealers }] = await Promise.all([
    supabase
      .from("order_list_files")
      .select("id, title, tier, visible_from, effective_on, file_name, file_size, created_at")
      .order("visible_from", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("dealers").select("discount_rate, status"),
  ]);

  const today = todayKst();
  const list = files ?? [];
  const uploadedTiers = new Set(list.map((f) => f.tier as number));

  // 활성 딜러가 몇 곳이 어떤 등급인지 — 파일이 없는 등급 딜러에게는 아무것도 안 보이므로 알려준다.
  const tierCounts = new Map<number, number>();
  for (const d of dealers ?? []) {
    if (d.status !== "active") continue;
    const t = Math.round(Number(d.discount_rate ?? 0));
    tierCounts.set(t, (tierCounts.get(t) ?? 0) + 1);
  }
  const noFileTiers = [...tierCounts.entries()].filter(([t]) => !uploadedTiers.has(t) && t > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">오더리스트</h1>
        <p className="text-sm text-slate-500">
          딜러에게 내려받게 할 오더리스트(엑셀)를 등급별로 올리는 곳입니다. 딜러는 &ldquo;오더리스트&rdquo; 메뉴에서 자기 등급(할인율)에
          맞는 파일만, 게시일부터 볼 수 있습니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>새 오더리스트 올리기</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderListUploadForm today={today} />
          {noFileTiers.length > 0 && (
            <p className="mt-3 text-xs text-amber-700">
              참고: 할인율{" "}
              {noFileTiers.map(([t, n]) => `${t}% 딜러 ${n}곳`).join(", ")}에 해당하는 파일은 아직 없어서 해당 딜러에게는 보이지 않습니다.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>올려 둔 파일 {list.length}개</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && <p className="p-5 text-sm text-red-600">{error.message}</p>}
          {list.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">아직 올린 파일이 없습니다.</p>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>제목</Th>
                  <Th>등급</Th>
                  <Th>게시일</Th>
                  <Th>시행일</Th>
                  <Th>크기</Th>
                  <Th>상태</Th>
                  <Th></Th>
                </Tr>
              </Thead>
              <tbody>
                {list.map((f) => (
                  <Tr key={f.id}>
                    <Td>
                      {f.title}
                      <p className="text-xs text-slate-400">{f.file_name}</p>
                    </Td>
                    <Td>{f.tier}%</Td>
                    <Td className="text-xs">{f.visible_from}</Td>
                    <Td className="text-xs">{f.effective_on ?? "—"}</Td>
                    <Td className="text-xs">{size(f.file_size)}</Td>
                    <Td>
                      {today >= f.visible_from ? <Badge tone="green">딜러에게 보임</Badge> : <Badge tone="blue">게시 예정</Badge>}
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-3">
                        <a href={`/order/order-list/${f.id}/download`} className="text-brand-600 hover:underline">
                          다운로드
                        </a>
                        <form action={deleteOrderListFile.bind(null, f.id)}>
                          <button className="text-red-600 hover:underline">삭제</button>
                        </form>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

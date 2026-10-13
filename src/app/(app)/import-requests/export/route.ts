import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { IMPORT_STATUS_LABEL, kstMonthKey } from "@/lib/utils/import-month";

export const dynamic = "force-dynamic";

type Req = {
  id: string;
  dealer_id: string;
  product_id: string;
  sku: string;
  product_name: string;
  quantity: number;
  note: string | null;
  status: string;
  created_at: string;
  submitted_at: string | null;
  dealers: { name: string } | null;
  dealer_orders: { order_number: string | null } | null;
};

// "2026-10" 기준으로 n개월 전 "YYYY-MM"
function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const idx = y * 12 + (m - 1) + delta;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`;
}

// 견적서 품목명("600556 JOOLA Perseus ...")의 맨 앞 상품코드
function leadingSku(name: string): string | null {
  const m = /^\s*(\d{4,6})\b/.exec(name);
  return m ? m[1] : null;
}

function trendLabel(recent: number, prev: number): string {
  if (recent === 0 && prev === 0) return "판매 없음";
  if (prev === 0) return "신규 판매";
  const ratio = recent / prev;
  if (ratio > 1.1) return `▲ 증가 (+${Math.round((ratio - 1) * 100)}%)`;
  if (ratio < 0.9) return `▼ 감소 (${Math.round((ratio - 1) * 100)}%)`;
  return "– 비슷함";
}

/**
 * 수입 요청서(엑셀). batch=pending 이면 지금 접수 대기 중인 요청(미리보기), batch=<id> 이면 확정된 그 배치.
 * 시트: ① 수입 요청 요약 ② 최근 6개월 판매추이 ③ 딜러별 요청 내역 ④ 계산 기준
 * 판매추이는 견적서 품목(dealer_quote_items)을 기준으로 하고, 아직 견적서로 반영되지 않은 최근 Hub 주문은 이어 붙인다.
 */
export async function GET(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!me || me.role === "dealer") return new NextResponse("Forbidden", { status: 403 });

  const batch = new URL(req.url).searchParams.get("batch") ?? "pending";

  let q = supabase
    .from("import_requests")
    .select(
      "id, dealer_id, product_id, sku, product_name, quantity, note, status, created_at, submitted_at, dealers(name), dealer_orders(order_number)"
    )
    .neq("status", "cancelled")
    .order("created_at", { ascending: true });
  q = batch === "pending" ? q.eq("status", "requested") : q.eq("batch_id", batch);
  const { data, error } = await q;
  if (error) return new NextResponse(error.message, { status: 500 });
  const reqs = (data ?? []) as unknown as Req[];
  if (reqs.length === 0) return new NextResponse("해당하는 수입 요청이 없습니다.", { status: 404 });

  const refIso = reqs.find((r) => r.submitted_at)?.submitted_at ?? new Date().toISOString();
  const refDate = new Date(refIso).toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const refMonth = kstMonthKey(refIso);
  const fullMonths = [-6, -5, -4, -3, -2, -1].map((d) => addMonths(refMonth, d)); // 최근 6개월(완결된 달)
  const windowStart = `${fullMonths[0]}-01`;

  // 상품별 요청 합계
  const productIds = [...new Set(reqs.map((r) => r.product_id))];
  const skuByProduct = new Map(reqs.map((r) => [r.product_id, r.sku]));
  const skus = new Set(reqs.map((r) => r.sku));

  // 재고
  const { data: inv } = await supabase
    .from("inventory_status")
    .select("product_id, current_stock, available_stock, incoming_qty, eta")
    .in("product_id", productIds);
  const invById = new Map((inv ?? []).map((r) => [r.product_id as string, r]));

  // 판매 이력 ① 견적서 품목
  const sales = new Map<string, Map<string, number>>(); // sku -> month -> qty
  const addSale = (sku: string, month: string, qty: number) => {
    const m = sales.get(sku) ?? new Map<string, number>();
    m.set(month, (m.get(month) ?? 0) + qty);
    sales.set(sku, m);
  };
  const { data: lastQuote } = await supabase
    .from("dealer_quote_items")
    .select("quote_date")
    .order("quote_date", { ascending: false })
    .limit(1);
  const quoteCutoff = (lastQuote?.[0]?.quote_date as string | undefined) ?? windowStart;

  for (let from = 0; ; from += 1000) {
    const { data: page } = await supabase
      .from("dealer_quote_items")
      .select("quote_date, product_name, quantity")
      .gte("quote_date", windowStart)
      .order("quote_date", { ascending: true })
      .range(from, from + 999);
    const rows = page ?? [];
    for (const r of rows) {
      const sku = leadingSku(String(r.product_name));
      if (!sku || !skus.has(sku)) continue;
      addSale(sku, String(r.quote_date).slice(0, 7), Number(r.quantity));
    }
    if (rows.length < 1000) break;
  }

  // 판매 이력 ② 견적서에 아직 반영되지 않은(견적서 마지막 날짜 이후) Hub 주문 — 입금 확인된 주문만
  const { data: hubItems } = await supabase
    .from("dealer_order_items")
    .select("product_id, quantity, dealer_orders!inner(order_date, status)")
    .in("product_id", productIds)
    .gt("dealer_orders.order_date", quoteCutoff)
    .in("dealer_orders.status", ["confirmed", "shipped", "delivered"]);
  for (const it of (hubItems ?? []) as unknown as {
    product_id: string;
    quantity: number;
    dealer_orders: { order_date: string };
  }[]) {
    const sku = skuByProduct.get(it.product_id);
    if (sku) addSale(sku, it.dealer_orders.order_date.slice(0, 7), Number(it.quantity));
  }

  // 상품별 집계
  type G = { sku: string; name: string; productId: string; total: number; dealers: Set<string> };
  const groups = new Map<string, G>();
  for (const r of reqs) {
    const g = groups.get(r.product_id) ?? { sku: r.sku, name: r.product_name, productId: r.product_id, total: 0, dealers: new Set() };
    g.total += r.quantity;
    g.dealers.add(r.dealer_id);
    groups.set(r.product_id, g);
  }
  const list = [...groups.values()].sort((a, b) => b.total - a.total);

  const monthQty = (sku: string, m: string) => sales.get(sku)?.get(m) ?? 0;
  const sum6 = (sku: string) => fullMonths.reduce((s, m) => s + monthQty(sku, m), 0);
  const recent3 = (sku: string) => fullMonths.slice(3).reduce((s, m) => s + monthQty(sku, m), 0);
  const prev3 = (sku: string) => fullMonths.slice(0, 3).reduce((s, m) => s + monthQty(sku, m), 0);

  const wb = XLSX.utils.book_new();
  const title = batch === "pending" ? `수입 요청서 (미리보기 · 아직 확정 전) — ${refDate}` : `수입 요청서 — ${refDate} 확정`;

  // ① 요약
  const summary: (string | number)[][] = [
    [title],
    [`요청 ${reqs.length}건 · 상품 ${list.length}종 · 총 ${list.reduce((s, g) => s + g.total, 0)}개 · 딜러 ${new Set(reqs.map((r) => r.dealer_id)).size}곳`],
    [],
    ["No", "상품코드", "상품명", "요청 합계(개)", "요청 딜러 수", "현재 재고", "가용 재고", "입고 예정(개)", "입고 예정일", "최근 6개월 판매(개)", "월평균(개)", "요청 수량 ÷ 월평균(개월분)", "판매 추세(최근3개월 vs 이전3개월)"],
  ];
  list.forEach((g, i) => {
    const inv1 = invById.get(g.productId) as { current_stock: number; available_stock: number; incoming_qty: number; eta: string | null } | undefined;
    const total6 = sum6(g.sku);
    const avg = total6 / 6;
    summary.push([
      i + 1,
      g.sku,
      g.name,
      g.total,
      g.dealers.size,
      inv1?.current_stock ?? "",
      inv1?.available_stock ?? "",
      inv1?.incoming_qty ?? "",
      inv1?.eta ?? "",
      total6,
      Math.round(avg * 10) / 10,
      avg > 0 ? Math.round((g.total / avg) * 10) / 10 : "판매 이력 없음",
      trendLabel(recent3(g.sku), prev3(g.sku)),
    ]);
  });
  const ws1 = XLSX.utils.aoa_to_sheet(summary);
  ws1["!cols"] = [{ wch: 5 }, { wch: 10 }, { wch: 58 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 10 }, { wch: 22 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws1, "수입 요청 요약");

  // ② 판매추이
  const monthLabels = fullMonths.map((m) => `${m}`);
  const trend: (string | number)[][] = [
    [`최근 6개월 판매추이 — ${fullMonths[0]} ~ ${fullMonths[5]} (딜러 판매 수량, 데모구매 포함)`],
    [],
    ["상품코드", "상품명", ...monthLabels, `${refMonth}(진행 중)`, "6개월 합계", "월평균", "최근 3개월", "이전 3개월", "추세"],
  ];
  for (const g of list) {
    const row: (string | number)[] = [g.sku, g.name, ...fullMonths.map((m) => monthQty(g.sku, m)), monthQty(g.sku, refMonth)];
    const total6 = sum6(g.sku);
    row.push(total6, Math.round((total6 / 6) * 10) / 10, recent3(g.sku), prev3(g.sku), trendLabel(recent3(g.sku), prev3(g.sku)));
    trend.push(row);
  }
  const ws2 = XLSX.utils.aoa_to_sheet(trend);
  ws2["!cols"] = [{ wch: 10 }, { wch: 58 }, ...fullMonths.map(() => ({ wch: 9 })), { wch: 14 }, { wch: 11 }, { wch: 9 }, { wch: 11 }, { wch: 11 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, ws2, "최근 6개월 판매추이");

  // ③ 딜러별 요청 내역
  const detail: (string | number)[][] = [["딜러", "상품코드", "상품명", "수량", "요청일", "메모", "상태", "백오더 주문번호"]];
  for (const r of [...reqs].sort((a, b) => a.sku.localeCompare(b.sku) || a.created_at.localeCompare(b.created_at))) {
    detail.push([
      r.dealers?.name ?? "",
      r.sku,
      r.product_name,
      r.quantity,
      new Date(r.created_at).toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" }),
      r.note ?? "",
      IMPORT_STATUS_LABEL[r.status] ?? r.status,
      r.dealer_orders?.order_number ?? "",
    ]);
  }
  const ws3 = XLSX.utils.aoa_to_sheet(detail);
  ws3["!cols"] = [{ wch: 28 }, { wch: 10 }, { wch: 58 }, { wch: 8 }, { wch: 12 }, { wch: 36 }, { wch: 14 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws3, "딜러별 요청 내역");

  // ④ 계산 기준
  const notes = [
    ["계산 기준 / 참고"],
    [],
    ["판매 수량 출처", "딜러 견적서 품목(dealer_quote_items)의 수량을 상품코드로 맞춰 월별로 더했습니다. 견적서의 마지막 날짜 이후에 입금 확인된 Hub 딜러 주문은 이어서 더했습니다."],
    ["기간", `${fullMonths[0]} ~ ${fullMonths[5]} (이번 달 ${refMonth}은 진행 중이라 6개월 합계·월평균에서 제외하고 별도 열로만 표시)`],
    ["포함 범위", "딜러(B2B) 판매만 포함합니다. 데모구매 수량은 포함, 스마트스토어(소비자) 판매는 포함하지 않았습니다."],
    ["상품코드 매칭", "견적서 품목명 맨 앞 상품코드와 같은 코드만 합산했습니다. 코드가 없는 품목은 집계되지 않을 수 있습니다."],
    ["요청÷월평균", "이번 요청 수량이 최근 6개월 월평균 판매량의 몇 개월분인지 보여줍니다(판매 이력이 없으면 '판매 이력 없음')."],
    ["추세", "최근 3개월 판매량을 이전 3개월과 비교해 ±10% 이내면 '비슷함'으로 표시합니다."],
    ["재고", "현재 재고/가용 재고/입고 예정은 이 파일을 만든 시점의 Hub 재고 기준입니다."],
  ];
  const ws4 = XLSX.utils.aoa_to_sheet(notes);
  ws4["!cols"] = [{ wch: 18 }, { wch: 120 }];
  XLSX.utils.book_append_sheet(wb, ws4, "계산 기준");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const fileName = `수입요청서_${refDate}${batch === "pending" ? "_미리보기" : ""}.xlsx`;
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="import-request-${refDate}.xlsx"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "no-store",
    },
  });
}

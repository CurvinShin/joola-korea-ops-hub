import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { buildImportPlan, parseHqStockCsv, type HqStock, type NeedLine } from "@/lib/utils/import-plan";

export const dynamic = "force-dynamic";

/**
 * 수입요청서 만들기: 딜러 접수 요청 + 상시 수입 필요 목록(직접 입력)을 합치고,
 * 본사 재고 CSV(searchresults)와 Hub의 한국 3PL 가용 재고를 비교해 엑셀로 내려준다.
 * 이 요청은 아무것도 저장하거나 확정하지 않는다(내려받기 전용).
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!me || me.role === "dealer") return new NextResponse("Forbidden", { status: 403 });

  const form = await req.formData();
  const includeDealer = form.get("include_dealer") === "on";
  const includeNeeds = form.get("include_needs") === "on";
  const file = form.get("hq_csv");

  // 본사 재고 CSV (선택)
  let hq = new Map<string, HqStock>();
  let hqLabel = "본사 재고 CSV 없음 (본사 가용 비교 생략)";
  if (file instanceof File && file.size > 0) {
    if (file.size > 20 * 1024 * 1024) return new NextResponse("CSV 파일이 너무 큽니다(20MB 이하).", { status: 400 });
    const parsed = parseHqStockCsv(await file.text());
    if ("error" in parsed) return new NextResponse(parsed.error, { status: 400 });
    hq = parsed.stock;
    hqLabel = `본사 재고 CSV: ${file.name} (SKU ${hq.size}개)`;
  }

  const lines: NeedLine[] = [];
  type DealerReq = { sku: string; product_name: string; quantity: number; note: string | null; created_at: string; dealers: { name: string } | null };
  let dealerReqs: DealerReq[] = [];
  if (includeDealer) {
    const { data, error } = await supabase
      .from("import_requests")
      .select("sku, product_name, quantity, note, created_at, dealers(name)")
      .eq("status", "requested")
      .order("created_at", { ascending: true });
    if (error) return new NextResponse(error.message, { status: 500 });
    dealerReqs = (data ?? []) as unknown as DealerReq[];
    for (const r of dealerReqs) lines.push({ sku: r.sku, name: r.product_name, qty: r.quantity, source: "딜러" });
  }

  type Need = { id: string; sku: string; product_name: string; category: string | null; quantity: number; note: string | null; created_at: string };
  let needs: Need[] = [];
  if (includeNeeds) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from("import_needs").select("id, sku, product_name, category, quantity, note, created_at").eq("status", "open").order("created_at", { ascending: true });
    if (error) return new NextResponse(error.message, { status: 500 });
    needs = (data ?? []) as Need[];
    for (const n of needs) lines.push({ sku: n.sku, name: n.product_name, qty: n.quantity, source: "직접", category: n.category, note: n.note });
  }
  if (lines.length === 0) return new NextResponse("합칠 요청이 없습니다. 딜러 접수 요청이나 상시 수입 필요 목록을 먼저 확인해주세요.", { status: 404 });

  // 한국 3PL(Hub) 가용 재고 + Hub 상품명 (CSV에 없는 SKU의 이름 보완)
  const skus = [...new Set(lines.map((l) => l.sku))];
  const tpl = new Map<string, number>();
  const hubName = new Map<string, string>();
  for (let i = 0; i < skus.length; i += 200) {
    const { data } = await supabase.from("inventory_status").select("sku, name, available_stock").in("sku", skus.slice(i, i + 200));
    for (const r of data ?? []) {
      tpl.set(r.sku as string, Number(r.available_stock ?? 0));
      hubName.set(r.sku as string, r.name as string);
    }
  }
  for (const l of lines) if (!l.name) l.name = hubName.get(l.sku) ?? "";

  const rows = buildImportPlan(lines, hq, tpl);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const hasHq = hq.size > 0;

  const wb = XLSX.utils.book_new();

  // ① 수입 요청 (2026-11-09 수입요청서와 같은 양식)
  const aoa: (string | number | null)[][] = [
    ["수입 요청 리스트"],
    [`작성일 ${today} · ${hqLabel} · 한국 3PL 가용은 Hub 현재 가용 재고 · 딜러 접수 요청${includeDealer ? "" : "(제외)"} + 상시 수입 필요 목록${includeNeeds ? "" : "(제외)"}`],
    [],
    ["No", "제품군", "SKU", "상품명", "수입 수량", "구분", "본사 가용", "한국 3PL 가용", "비고"],
  ];
  rows.forEach((r, i) => {
    aoa.push([i + 1, r.category, r.sku, r.name, r.importQty, r.source, r.hqAvailable === null ? "" : r.hqAvailable, r.tplAvailable === null ? "" : r.tplAvailable, r.notes.join(" / ")]);
  });
  const lastDataRow = 4 + rows.length; // 1-based, 헤더가 4행
  aoa.push([], [null, null, null, "총 수입 수량", rows.reduce((s, r) => s + r.importQty, 0)]);
  const cats = [...new Set(rows.map((r) => r.category))];
  const ws1 = XLSX.utils.aoa_to_sheet(aoa);
  // 제품군별 합계는 수식으로 (엑셀에서 수량을 고치면 같이 바뀐다)
  const baseRow = aoa.length; // 0-based index of next row
  cats.forEach((c, i) => {
    const rowNo = baseRow + i + 1;
    XLSX.utils.sheet_add_aoa(ws1, [[null, null, null, `${c} 합계`, { t: "n", f: `SUMIF($B$5:$B$${lastDataRow},"${c}",$E$5:$E$${lastDataRow})` }]], { origin: `A${rowNo}` });
  });
  ws1["!cols"] = [{ wch: 5 }, { wch: 11 }, { wch: 10 }, { wch: 60 }, { wch: 11 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, ws1, "수입 요청");

  // ② 산출 근거
  const basis: (string | number)[][] = [["SKU", "제품군", "상품명", "딜러 요청", "직접 입력", "요청 합계", "올림 단위", "수입 수량", "본사 가용", "본사 입고예정", "본사 부족", "한국 3PL 가용"]];
  for (const r of rows) {
    basis.push([r.sku, r.category, r.name, r.dealerQty, r.manualQty, r.needQty, r.unit, r.importQty, r.hqAvailable ?? "", r.hqIncoming, r.hqAvailable === null ? "" : r.hqShortage, r.tplAvailable ?? ""]);
  }
  const ws2 = XLSX.utils.aoa_to_sheet(basis);
  ws2["!cols"] = [{ wch: 10 }, { wch: 11 }, { wch: 58 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws2, "산출 근거");

  // ③ 요청 내역 (딜러 + 직접)
  const detail: (string | number)[][] = [["구분", "딜러/작성", "SKU", "상품명", "수량", "등록일", "메모"]];
  for (const r of dealerReqs) {
    detail.push(["딜러", r.dealers?.name ?? "", r.sku, r.product_name, r.quantity, new Date(r.created_at).toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" }), r.note ?? ""]);
  }
  for (const n of needs) {
    detail.push(["직접", "지사", n.sku, n.product_name || hubName.get(n.sku) || "", n.quantity, new Date(n.created_at).toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" }), n.note ?? ""]);
  }
  const ws3 = XLSX.utils.aoa_to_sheet(detail);
  ws3["!cols"] = [{ wch: 8 }, { wch: 28 }, { wch: 10 }, { wch: 58 }, { wch: 8 }, { wch: 12 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, ws3, "요청 내역");

  // ④ 계산 기준
  const notes = [
    ["계산 기준"],
    [],
    ["수입 수량", "딜러 접수 요청 + 상시 수입 필요 목록의 같은 SKU 수량을 합친 값입니다. 볼은 본사 카톤(Outer Carton) 단위로 올림합니다. 패들·용품은 요청 수량 그대로입니다."],
    ["본사 가용", "본사 재고 CSV의 Available Quantity(없으면 0). 본사 가용보다 수입 수량이 많으면 비고에 부족 수량을 적습니다."],
    ["한국 3PL 가용", "Hub 재고관리의 현재 가용 재고(현재고−예약). 마이너스는 백오더(이미 받은 주문이 재고보다 많음)입니다. 수입 수량에서 자동으로 빼지 않고 참고용으로만 보여줍니다."],
    ["제품군", "상품명·본사 분류로 자동 판단합니다. 상시 수입 필요 목록에서 제품군을 직접 적으면 그 값을 우선합니다."],
    ["이 파일", "내려받기 전용입니다. 딜러 요청 확정·상시 목록 처리 완료는 별도로 눌러야 반영됩니다."],
  ];
  const ws4 = XLSX.utils.aoa_to_sheet(notes);
  ws4["!cols"] = [{ wch: 16 }, { wch: 130 }];
  XLSX.utils.book_append_sheet(wb, ws4, "계산 기준");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const fileName = `수입요청서_${today}.xlsx`;
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="import-request-${today}.xlsx"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "no-store",
    },
  });
}

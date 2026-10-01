"use server";

import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import * as officeCrypto from "officecrypto-tool";
import { createClient } from "@/lib/supabase/server";
import { parseSettleCaseByCase } from "@/lib/reports/parseSettleCaseByCase";

// ---------------------------------------------------------------------------
// SKU 매핑(product_no -> sku/영문명) 관리
// ---------------------------------------------------------------------------

export interface SkuMapRow {
  product_no: string;
  product_name: string;
  sku: string;
  english_name: string;
  updated_at: string;
}

export type UpsertSkuMapResult = { ok: true } | { ok: false; error: string };

export async function upsertSmartstoreSkuMap(
  _prevState: UpsertSkuMapResult | null,
  formData: FormData
): Promise<UpsertSkuMapResult> {
  const productNo = String(formData.get("product_no") || "").trim();
  const productName = String(formData.get("product_name") || "").trim();
  const sku = String(formData.get("sku") || "").trim();
  const englishName = String(formData.get("english_name") || "").trim();

  if (!productNo) return { ok: false, error: "상품번호를 입력해주세요." };
  if (!sku) return { ok: false, error: "SKU를 입력해주세요." };
  if (!englishName) return { ok: false, error: "영문 제품명을 입력해주세요." };

  const supabase = createClient();
  const { error } = await supabase.from("smartstore_sku_map").upsert(
    {
      product_no: productNo,
      product_name: productName || "(미입력)",
      sku,
      english_name: englishName,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "product_no" }
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/sales/smartstore-settlement");
  return { ok: true };
}

export async function deleteSmartstoreSkuMap(productNo: string): Promise<UpsertSkuMapResult> {
  const supabase = createClient();
  const { error } = await supabase.from("smartstore_sku_map").delete().eq("product_no", productNo);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/sales/smartstore-settlement");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// 월말 정산 파일 생성
// ---------------------------------------------------------------------------

export interface UnmappedProduct {
  product_no: string | null;
  product_name: string;
  count: number;
}

export interface MissingOrderDataRow {
  product_order_no: string;
  product_name: string;
}

export type SettlementResult =
  | {
      ok: true;
      filename: string;
      fileBase64: string;
      summary: { totalRows: number; matchedRows: number; excludedRows: number };
    }
  | {
      ok: false;
      error: string;
      unmapped?: UnmappedProduct[];
      missingOrderData?: MissingOrderDataRow[];
    };

const OUTPUT_HEADER = [
  "No.",
  "주문번호",
  "상품주문번호",
  "구분",
  "상품명",
  "수량",
  "결제일",
  "상품명(SKU 포함)",
  "정산예정일",
  "정산완료일",
  "정산기준일",
  "세금신고기준일",
  "정산상태",
  "정산기준금액",
  "Npay 수수료",
  "매출 연동 수수료 합계",
  "무이자할부 수수료",
  "혜택금액",
  "정산예정금액",
  "계약번호",
] as const;

// SettleCaseByCase에는 실제 상품 판매 행 외에 "기본배송비", "반품배송비",
// "교환배송비" 같은 배송비 정산 행도 섞여 있다. 이런 행은 상품이 아니라서
// smartstore_order_items(주문조회 기준)에 애초에 대응하는 행이 없고, 제품별
// 수량/SKU 집계 목적(Jeff에게 전달하는 자료)에도 필요 없어 자동으로 제외한다.
function isNonProductRow(productName: string): boolean {
  return productName.includes("배송비");
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// 이 월말 정산 파일은 고객 개인정보(구매자명 등)를 전혀 담지 않는다 —
// parseSettleCaseByCase가 애초에 그 컬럼을 읽지 않고, 이 함수도 상품/수량/
// 정산 금액 정보만 다룬다.
export async function generateSmartstoreSettlement(
  _prevState: SettlementResult | null,
  formData: FormData
): Promise<SettlementResult> {
  try {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "SettleCaseByCase 엑셀 파일을 선택해주세요." };
    }
    const password = String(formData.get("password") || "");

    let buffer: Buffer<ArrayBufferLike> = Buffer.from(await file.arrayBuffer());
    let encrypted = false;
    try {
      encrypted = officeCrypto.isEncrypted(buffer);
    } catch {
      encrypted = false;
    }
    if (encrypted) {
      if (!password) return { ok: false, error: "비밀번호로 보호된 파일입니다. 비밀번호를 입력해주세요." };
      try {
        buffer = await officeCrypto.decrypt(buffer, { password });
      } catch {
        return { ok: false, error: "비밀번호가 올바르지 않거나 파일을 열 수 없습니다." };
      }
    }

    const parsed = parseSettleCaseByCase(buffer, file.name);
    if (parsed.rows.length === 0) {
      return { ok: false, error: "엑셀에서 읽을 수 있는 정산 행이 없습니다. 'SettleCaseByCase' 형식인지 확인해주세요." };
    }

    // 배송비 등 상품이 아닌 행은 수량/SKU 매칭 대상에서 아예 제외한다.
    const productRows = parsed.rows.filter((r) => !isNonProductRow(r.product_name));
    const excludedRows = parsed.rows.length - productRows.length;
    if (productRows.length === 0) {
      return { ok: false, error: "배송비 등을 제외하면 남는 상품 판매 행이 없습니다." };
    }

    const supabase = createClient();

    // 1) product_order_no로 smartstore_order_items에서 수량/상품번호 조회
    //    (해당 월의 "주문조회" 파일을 /sales/product-categories에서 먼저
    //    업로드해둔 상태여야 한다 — 이 테이블이 그 데이터의 원천이다).
    const orderNos = Array.from(new Set(productRows.map((r) => r.product_order_no)));
    type OrderItemLite = { product_order_no: string; product_no: string | null; product_name: string; quantity: number };
    const orderItemByOrderNo = new Map<string, OrderItemLite>();
    for (const batch of chunk(orderNos, 300)) {
      const { data, error } = await supabase
        .from("smartstore_order_items")
        .select("product_order_no, product_no, product_name, quantity")
        .in("product_order_no", batch);
      if (error) return { ok: false, error: `주문 데이터 조회 실패: ${error.message}` };
      for (const row of (data ?? []) as OrderItemLite[]) {
        orderItemByOrderNo.set(row.product_order_no, row);
      }
    }

    const missingOrderData: MissingOrderDataRow[] = [];
    for (const r of productRows) {
      if (!orderItemByOrderNo.has(r.product_order_no)) {
        missingOrderData.push({ product_order_no: r.product_order_no, product_name: r.product_name });
      }
    }
    if (missingOrderData.length > 0) {
      return {
        ok: false,
        error: `${missingOrderData.length}건의 주문은 수량 정보를 찾을 수 없습니다. 이 달의 "주문조회" 파일을 제품군 분석 페이지에서 먼저 업로드해주세요.`,
        missingOrderData: missingOrderData.slice(0, 30),
      };
    }

    // 2) product_no로 smartstore_sku_map에서 SKU/영문명 조회
    const productNos = Array.from(
      new Set(Array.from(orderItemByOrderNo.values()).map((o) => o.product_no).filter((v): v is string => !!v))
    );
    const skuMap = new Map<string, SkuMapRow>();
    for (const batch of chunk(productNos, 300)) {
      const { data, error } = await supabase.from("smartstore_sku_map").select("*").in("product_no", batch);
      if (error) return { ok: false, error: `SKU 매핑 조회 실패: ${error.message}` };
      for (const row of (data ?? []) as SkuMapRow[]) {
        skuMap.set(row.product_no, row);
      }
    }

    const unmappedCount = new Map<string, UnmappedProduct>();
    for (const r of productRows) {
      const item = orderItemByOrderNo.get(r.product_order_no)!;
      const key = item.product_no ?? `__noNo__:${item.product_name}`;
      if (!item.product_no || !skuMap.has(item.product_no)) {
        const existing = unmappedCount.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          unmappedCount.set(key, { product_no: item.product_no, product_name: item.product_name, count: 1 });
        }
      }
    }
    if (unmappedCount.size > 0) {
      return {
        ok: false,
        error: `${unmappedCount.size}개 상품이 아직 SKU 매핑에 없습니다. 아래에서 매핑을 추가한 뒤 다시 시도해주세요.`,
        unmapped: Array.from(unmappedCount.values()),
      };
    }

    // 3) 최종 산출물 조립 (구매자명 컬럼은 애초에 parsed row에 없고, 배송비
    // 행은 productRows 필터링 단계에서 이미 제외됨)
    const aoa: (string | number | null)[][] = [Array.from(OUTPUT_HEADER)];
    for (const r of productRows) {
      const item = orderItemByOrderNo.get(r.product_order_no)!;
      const skuRow = item.product_no ? skuMap.get(item.product_no) : undefined;
      const skuDisplay = skuRow ? `${skuRow.sku} ${skuRow.english_name}` : "";
      aoa.push([
        r.no,
        r.order_no,
        r.product_order_no,
        r.type,
        r.product_name,
        item.quantity,
        r.paid_at,
        skuDisplay,
        r.settle_expected_at,
        r.settle_completed_at,
        r.settle_base_date,
        r.tax_base_date,
        r.settle_status,
        r.settle_base_amount,
        r.npay_fee,
        r.sales_linked_fee_total,
        r.interest_free_fee,
        r.benefit_amount,
        r.settle_expected_amount,
        r.contract_no,
      ]);
    }

    const sheet = XLSX.utils.aoa_to_sheet(aoa);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "정산기준 판매");
    const outBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

    // 파일명에 쓸 월 — 결제일(paid_at) 중 가장 많이 등장하는 연-월을 사용.
    const monthCounts = new Map<string, number>();
    for (const r of productRows) {
      const ym = r.paid_at?.slice(0, 7);
      if (ym) monthCounts.set(ym, (monthCounts.get(ym) ?? 0) + 1);
    }
    let topMonth: string | null = null;
    let topCount = 0;
    for (const [ym, c] of monthCounts) {
      if (c > topCount) {
        topCount = c;
        topMonth = ym;
      }
    }
    const monthLabel = topMonth ? `${Number(topMonth.slice(5, 7))}월` : "자동생성";
    const filename = `스마트스토어 수식 적용 내역(${monthLabel}).xlsx`;

    return {
      ok: true,
      filename,
      fileBase64: outBuffer.toString("base64"),
      summary: { totalRows: parsed.rows.length, matchedRows: productRows.length, excludedRows },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다." };
  }
}

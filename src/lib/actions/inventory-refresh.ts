"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { extractLeadingCode, parseSnapshotTimestamp, parseStockHtml } from "@/lib/utils/stock-refresh";

export interface RefreshSummary {
  filename: string;
  snapshotAt: string;
  totalRows: number;
  matchedUpdated: number;
  codesUpdated: number;
  gapsUpdated: number;
  gapsNew: number;
}

export type RefreshResult = { ok: true; summary: RefreshSummary } | { ok: false; error: string };

/**
 * 셀프서비스 재고 최신화: 이지어드민 "현재고조회" 실사 엑셀(HTML 포맷 .xls)을
 * 업로드하면 곧바로 반영한다. 그동안 사람이 SQL로 수동 반영해오던 절차를
 * 그대로 자동화한 것 — 로직은 joola_pricing_stock_logic.md §3 워크플로와 동일:
 *
 *   1. 상품명에서 SKU(우리 고유 번호)를 추출해 `products.sku`와 매칭 → 매칭되면
 *      `inventory.current_stock`을 실사 값으로 덮어쓰고, 같은 행의 이지어드민
 *      `상품코드`를 `products.ezadmin_code`에 맞춰 둔다 (재고의 진실 소스는
 *      항상 최신 실사 스냅샷).
 *   2. 매칭 안 되는 품목은 이지어드민 `상품코드`로 기존 `catalog_gaps`
 *      행을 찾아 수량만 갱신하거나, 처음 보는 코드면 새로 등록한다 — "오더리스트
 *      부재품목" 게시판에서 계속 보이게 하기 위함.
 *   3. 실행 결과를 `inventory_snapshots`에 기록해 "마지막 최신화" 이력을 남긴다.
 */
export async function refreshInventoryFromFile(
  _prevState: RefreshResult | null,
  formData: FormData
): Promise<RefreshResult> {
  try {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "업로드할 파일을 선택해주세요." };
    }

    const html = await file.text();
    const rows = parseStockHtml(html);
    if (rows.length === 0) {
      return { ok: false, error: "표에서 읽을 수 있는 데이터 행이 없습니다." };
    }

    const supabase = createClient();

    const { data: products, error: prodErr } = await supabase.from("products").select("id, sku, ezadmin_code");
    if (prodErr) return { ok: false, error: `상품 목록 조회 실패: ${prodErr.message}` };
    const skuToProductId = new Map((products ?? []).map((p) => [p.sku, p.id as string]));
    const currentCodeByProductId = new Map(
      (products ?? []).map((p) => [p.id as string, (p.ezadmin_code as string | null) ?? null])
    );

    const { data: gaps, error: gapErr } = await supabase.from("catalog_gaps").select("id, source_sku");
    if (gapErr) return { ok: false, error: `미매칭 재고 목록 조회 실패: ${gapErr.message}` };
    const gapIdBySku = new Map(
      (gaps ?? []).filter((g) => g.source_sku).map((g) => [g.source_sku as string, g.id as string])
    );

    const matchedUpdates: { product_id: string; current_stock: number }[] = [];
    // 상품코드가 새로 생겼거나 바뀐 제품만 담는다 (같으면 쓰지 않는다).
    const codeUpdates: { product_id: string; ezadmin_code: string }[] = [];
    const gapUpdates: { id: string; qty: number }[] = [];
    const gapInserts: { source_sku: string | null; source_name: string; qty: number }[] = [];
    const seenGapSku = new Set<string>();

    for (const row of rows) {
      const { brandSku } = extractLeadingCode(row.rawName);
      const productId = brandSku ? skuToProductId.get(brandSku) : undefined;
      if (productId) {
        matchedUpdates.push({ product_id: productId, current_stock: row.qty });
        if (row.sourceSku && currentCodeByProductId.get(productId) !== row.sourceSku) {
          codeUpdates.push({ product_id: productId, ezadmin_code: row.sourceSku });
        }
        continue;
      }

      const key = row.sourceSku || row.rawName;
      if (seenGapSku.has(key)) continue; // guard against duplicate rows in the source file
      seenGapSku.add(key);

      const existingGapId = row.sourceSku ? gapIdBySku.get(row.sourceSku) : undefined;
      if (existingGapId) {
        gapUpdates.push({ id: existingGapId, qty: row.qty });
      } else {
        gapInserts.push({ source_sku: row.sourceSku || null, source_name: row.rawName, qty: row.qty });
      }
    }

    if (matchedUpdates.length > 0) {
      const { error } = await supabase
        .from("inventory")
        .upsert(
          matchedUpdates.map((u) => ({
            ...u,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: "product_id" }
        );
      if (error) return { ok: false, error: `재고 갱신 실패: ${error.message}` };
    }

    // 상품코드 맞추기: 한 번에 몇 건씩 나눠서 보낸다.
    for (let i = 0; i < codeUpdates.length; i += 25) {
      const chunk = codeUpdates.slice(i, i + 25);
      const results = await Promise.all(
        chunk.map((c) =>
          supabase.from("products").update({ ezadmin_code: c.ezadmin_code }).eq("id", c.product_id)
        )
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) return { ok: false, error: `상품코드 갱신 실패: ${failed.error.message}` };
    }

    for (const g of gapUpdates) {
      const { error } = await supabase.from("catalog_gaps").update({ qty: g.qty }).eq("id", g.id);
      if (error) return { ok: false, error: `미매칭 재고 갱신 실패: ${error.message}` };
    }

    if (gapInserts.length > 0) {
      const { error } = await supabase.from("catalog_gaps").insert(gapInserts);
      if (error) return { ok: false, error: `신규 미매칭 품목 등록 실패: ${error.message}` };
    }

    // 맥에서 받은 한글 파일명은 자모가 풀어진 형태(NFD)라 화면에서 깨져 보이므로 합쳐서(NFC) 저장한다.
    const filename = file.name.normalize("NFC");
    const snapshotAt = parseSnapshotTimestamp(filename);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: logErr } = await supabase.from("inventory_snapshots").insert({
      filename,
      snapshot_at: snapshotAt,
      uploaded_by: user?.email ?? null,
      total_rows: rows.length,
      matched_count: matchedUpdates.length,
      gap_updated_count: gapUpdates.length,
      gap_new_count: gapInserts.length,
    });
    if (logErr) return { ok: false, error: `이력 저장 실패: ${logErr.message}` };

    revalidatePath("/inventory");
    revalidatePath("/inventory/unmatched");
    revalidatePath("/inventory/refresh");

    return {
      ok: true,
      summary: {
        filename,
        snapshotAt,
        totalRows: rows.length,
        matchedUpdated: matchedUpdates.length,
        codesUpdated: codeUpdates.length,
        gapsUpdated: gapUpdates.length,
        gapsNew: gapInserts.length,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다." };
  }
}

"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deriveFolderState } from "@/lib/utils/overseas-po-parse";

const payloadSchema = z.array(
  z.object({
    poNumber: z.string().min(1).max(100),
    kind: z.enum(["EX", "SAMPLE"]),
    closed: z.boolean(),
    folder: z.string().max(300),
    memo: z.string().max(200).nullable(),
    orderDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    items: z
      .array(
        z.object({
          sku: z.string().min(1).max(60),
          name: z.string().max(300),
          qty: z.number().int().min(0).max(10_000_000),
        })
      )
      .max(3000),
    shipments: z
      .array(
        z.object({
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
          tracking: z.string().max(100).nullable(),
          carrier: z.string().max(50).nullable(),
          doc: z.string().max(300).nullable(),
        })
      )
      .max(50),
  })
);

export type SyncResult =
  | { ok: true; created: number; updated: number; items: number; shipments: number }
  | { ok: false; error: string };


/**
 * 해외 발주 폴더 최신화: 브라우저에서 읽은 발주서/포장명세서 내용을 저장한다.
 *  - 새 발주번호는 만들고, 이미 있는 발주는 품목·선적 기록만 새로 채운다.
 *  - 상태는 "폴더 기준 상태"가 지난번 최신화 때와 달라졌을 때만 바꾼다
 *    (폴더 이름에 (CLOSED)가 붙음, 포장명세서가 새로 생김). 새 파일이 없어도 이런 변화가 있으면
 *    상태가 갱신되고, 변화가 없으면 관리자가 직접 고친 상태는 그대로 둔다.
 *  - 금액은 저장하지 않는다.
 */
export async function syncOverseasPurchaseOrders(json: string): Promise<SyncResult> {
  try {
    const parsed = payloadSchema.safeParse(JSON.parse(json));
    if (!parsed.success) return { ok: false, error: "읽은 데이터 형식이 올바르지 않습니다." };
    const list = parsed.data;
    if (list.length === 0) return { ok: false, error: "저장할 발주가 없습니다." };

    const supabase = createClient();
    const numbers = list.map((p) => p.poNumber);
    const { data: existing, error: exErr } = await supabase
      .from("purchase_orders")
      .select("id, po_number, notes, closed, shipping_status, synced_state")
      .in("po_number", numbers);
    if (exErr) return { ok: false, error: exErr.message };
    const byNumber = new Map((existing ?? []).map((e) => [e.po_number as string, e]));
    const { data: shipRows } = await supabase
      .from("overseas_po_shipments")
      .select("po_id")
      .in("po_id", (existing ?? []).map((e) => e.id as string));
    const hadShipments = new Set((shipRows ?? []).map((r) => r.po_id as string));

    let created = 0;
    let updated = 0;
    let itemCount = 0;
    let shipmentCount = 0;

    for (const p of list) {
      const totalQty = p.items.reduce((s, i) => s + i.qty, 0);
      const cur = byNumber.get(p.poNumber);
      let poId: string;
      const state = deriveFolderState(p.closed, p.shipments.length + (cur && hadShipments.has(cur.id as string) ? 1 : 0));

      if (!cur) {
        const shipping = p.closed ? "delivered" : p.shipments.length > 0 ? "in_transit" : "not_shipped";
        const { data, error } = await supabase
          .from("purchase_orders")
          .insert({
            po_number: p.poNumber,
            supplier: "Joola Global Limited",
            order_date: p.orderDate ?? new Date().toISOString().slice(0, 10),
            shipping_status: shipping,
            customs_status: p.closed ? "cleared" : "not_started",
            received: p.closed,
            closed: p.closed,
            synced_state: state,
            po_kind: p.kind,
            source_folder: p.folder,
            notes: p.memo,
            item_count: p.items.length,
            total_qty: totalQty,
          })
          .select("id")
          .single();
        if (error || !data) return { ok: false, error: `${p.poNumber} 저장 실패: ${error?.message ?? "알 수 없음"}` };
        poId = data.id as string;
        created++;
      } else {
        poId = cur.id as string;
        const patch: Record<string, unknown> = { po_kind: p.kind, source_folder: p.folder };
        if (p.items.length > 0) {
          patch.item_count = p.items.length;
          patch.total_qty = totalQty;
        }
        if (!cur.notes && p.memo) patch.notes = p.memo;
        patch.synced_state = state;
        if (cur.synced_state !== state) {
          if (state === "closed") {
            patch.closed = true;
            patch.received = true;
            patch.shipping_status = "delivered";
            patch.customs_status = "cleared";
          } else {
            if (cur.closed && cur.synced_state === "closed") {
              // 폴더에서 (CLOSED)가 빠진 경우에만 종료를 풀어 준다
              patch.closed = false;
              patch.received = false;
            }
            if (state === "shipped" && cur.shipping_status === "not_shipped") patch.shipping_status = "in_transit";
          }
        }
        const { error } = await supabase.from("purchase_orders").update(patch).eq("id", poId);
        if (error) return { ok: false, error: `${p.poNumber} 수정 실패: ${error.message}` };
        updated++;
      }

      if (p.items.length > 0) {
        const del = await supabase.from("overseas_po_items").delete().eq("po_id", poId);
        if (del.error) return { ok: false, error: `${p.poNumber} 품목 정리 실패: ${del.error.message}` };
        const rows = p.items.map((i, idx) => ({ po_id: poId, line_no: idx + 1, sku: i.sku, item_name: i.name, qty: i.qty }));
        for (let k = 0; k < rows.length; k += 300) {
          const ins = await supabase.from("overseas_po_items").insert(rows.slice(k, k + 300));
          if (ins.error) return { ok: false, error: `${p.poNumber} 품목 저장 실패: ${ins.error.message}` };
        }
        itemCount += rows.length;
      }

      if (p.shipments.length > 0) {
        const del = await supabase.from("overseas_po_shipments").delete().eq("po_id", poId);
        if (del.error) return { ok: false, error: `${p.poNumber} 선적 정리 실패: ${del.error.message}` };
        const rows = p.shipments.map((s) => ({
          po_id: poId,
          ship_date: s.date,
          tracking_no: s.tracking,
          carrier: s.carrier,
          doc_name: s.doc,
        }));
        const ins = await supabase.from("overseas_po_shipments").insert(rows);
        if (ins.error) return { ok: false, error: `${p.poNumber} 선적 저장 실패: ${ins.error.message}` };
        shipmentCount += rows.length;
      }
    }

    revalidatePath("/purchase-orders");
    return { ok: true, created, updated, items: itemCount, shipments: shipmentCount };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "저장 중 오류가 발생했습니다." };
  }
}

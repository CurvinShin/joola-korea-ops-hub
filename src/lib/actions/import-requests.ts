"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { priceCartItemsForDealer } from "@/lib/utils/dealer-cart-pricing";

const BASE = "/order/import-requests";

function fail(message: string): never {
  redirect(`${BASE}?error=${encodeURIComponent(message)}`);
}

/**
 * 딜러가 재고 없는 상품에 대해 수입 요청을 남긴다. 요청은 즉시 수입되지 않고
 * 한 달치를 모아 JOOLA Korea가 한 번에 수입 요청한다(관리자 화면 "수입 요청").
 */
export async function createImportRequest(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("dealer_id")
    .eq("id", user?.id ?? "")
    .single();
  if (!profile?.dealer_id) fail("딜러 계정으로 로그인해야 요청할 수 있습니다.");

  const productId = String(formData.get("product_id") ?? "");
  const quantity = Number(formData.get("quantity"));
  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || null;
  if (!productId) fail("수입 요청할 상품을 선택해주세요.");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000) fail("수량은 1개 이상의 숫자로 입력해주세요.");

  const { data: product } = await supabase
    .from("dealer_catalog")
    .select("product_id, sku, name, available_stock")
    .eq("product_id", productId)
    .maybeSingle();
  if (!product) fail("상품 정보를 찾을 수 없습니다. 새로고침 후 다시 시도해주세요.");
  if (product.available_stock > 0) {
    fail("현재 재고가 있는 상품입니다. 주문하기에서 바로 주문해주세요.");
  }

  const { error } = await supabase.from("import_requests").insert({
    dealer_id: profile.dealer_id,
    product_id: product.product_id,
    sku: product.sku,
    product_name: product.name,
    quantity,
    note,
    created_by: user?.id ?? null,
  });
  if (error) fail(`요청 저장에 실패했습니다: ${error.message}`);

  revalidatePath(BASE);
  redirect(`${BASE}?done=1`);
}

/** 딜러가 아직 '접수' 상태인 자기 요청을 취소한다(RLS가 본인 + 접수 상태만 허용). */
export async function cancelImportRequest(id: string) {
  const supabase = createClient();
  await supabase.from("import_requests").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", id).eq("status", "requested");
  revalidatePath(BASE);
  revalidatePath("/import-requests");
}

/**
 * 관리자: 지금까지 "접수" 상태로 쌓인 수입 요청을 한 번에 확정한다(매달 10일경).
 *  1) 딜러별로 요청 수량을 모아 백오더 주문(draft)을 자동 생성한다 — 가격·할인·프로모션·배송비 계산은
 *     딜러가 직접 주문할 때와 똑같이 priceCartItemsForDealer를 쓴다.
 *  2) 요청을 "수입 요청 완료"로 바꾸고 같은 batch_id로 묶는다.
 *  3) 결과 화면으로 이동한다 — 거기서 수입 요청서(엑셀)를 내려받는다.
 * 어떤 딜러의 주문 자동 생성이 실패해도(가격 미등록, 프로모션 한도 등) 요청 자체는 확정되고,
 * 실패한 딜러는 결과 화면에 표시되어 담당자가 직접 주문을 만들면 된다.
 */
export async function confirmImportBatch() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user?.id ?? "").single();
  if (me?.role !== "admin") {
    redirect(`/import-requests?error=${encodeURIComponent("관리자만 수입 요청을 확정할 수 있습니다.")}`);
  }

  const { data: pending } = await supabase
    .from("import_requests")
    .select("id, dealer_id, product_id, quantity, dealers(name)")
    .eq("status", "requested")
    .order("created_at", { ascending: true });
  const reqs = (pending ?? []) as unknown as {
    id: string;
    dealer_id: string;
    product_id: string;
    quantity: number;
    dealers: { name: string } | null;
  }[];
  if (reqs.length === 0) {
    redirect(`/import-requests?error=${encodeURIComponent("확정할 접수 요청이 없습니다.")}`);
  }

  const batchId = crypto.randomUUID();
  const submittedAt = new Date().toISOString();
  const noteDate = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });

  const byDealer = new Map<string, { name: string; reqIds: string[]; qtyByProduct: Map<string, number> }>();
  for (const r of reqs) {
    const d = byDealer.get(r.dealer_id) ?? { name: r.dealers?.name ?? "딜러", reqIds: [], qtyByProduct: new Map<string, number>() };
    d.reqIds.push(r.id);
    d.qtyByProduct.set(r.product_id, (d.qtyByProduct.get(r.product_id) ?? 0) + r.quantity);
    byDealer.set(r.dealer_id, d);
  }

  let created = 0;
  const failed: string[] = [];

  for (const [dealerId, d] of byDealer) {
    let orderId: string | null = null;
    try {
      const priced = await priceCartItemsForDealer(
        supabase,
        dealerId,
        [...d.qtyByProduct.entries()].map(([productId, quantity]) => ({ productId, quantity, isDemo: false }))
      );
      if (!priced.ok) {
        failed.push(`${d.name}(${priced.message})`);
      } else {
        const { data: orderNumber } = await supabase.rpc("assign_dealer_order_number", { p_dealer_id: dealerId });
        const { data: order, error: orderError } = await supabase
          .from("dealer_orders")
          .insert({
            dealer_id: dealerId,
            status: "draft",
            order_type: "regular",
            total_amount: priced.subtotal,
            auto_shipping_boxes: priced.autoShippingBoxes,
            auto_shipping_fee: priced.autoShippingFee,
            order_number: orderNumber ?? null,
            notes: `수입 요청 백오더 (${noteDate} 확정)`,
          })
          .select("id")
          .single();
        if (orderError || !order) {
          failed.push(`${d.name}(주문 생성 실패)`);
        } else {
          const { error: itemsError } = await supabase.from("dealer_order_items").insert(
            priced.rows.map((r) => ({
              order_id: order.id,
              product_id: r.product_id,
              quantity: r.quantity,
              unit_price: r.unit_price,
              is_demo: r.is_demo,
            }))
          );
          if (itemsError) {
            await supabase.from("dealer_orders").delete().eq("id", order.id);
            failed.push(`${d.name}(주문 상품 등록 실패)`);
          } else {
            orderId = order.id;
            created += 1;
          }
        }
      }
    } catch (e) {
      failed.push(`${d.name}(${e instanceof Error ? e.message : "오류"})`);
    }

    await supabase
      .from("import_requests")
      .update({ status: "submitted", batch_id: batchId, submitted_at: submittedAt, order_id: orderId, updated_at: submittedAt })
      .in("id", d.reqIds);
  }

  revalidatePath("/import-requests");
  revalidatePath("/dealer-orders");
  revalidatePath(BASE);

  const params = new URLSearchParams({ batch: batchId, created: String(created), dealers: String(byDealer.size) });
  if (failed.length > 0) params.set("failed", failed.join(" / ").slice(0, 600));
  redirect(`/import-requests?${params.toString()}`);
}

/** 관리자: 확정된 수입 요청(배치)의 상품이 입고되면 "입고 완료"로 표시한다. */
export async function markImportReceived(formData: FormData) {
  const batchId = String(formData.get("batch_id") ?? "");
  const productId = String(formData.get("product_id") ?? "");
  if (!batchId) return;
  const supabase = createClient();
  let q = supabase
    .from("import_requests")
    .update({ status: "received", updated_at: new Date().toISOString() })
    .eq("batch_id", batchId)
    .eq("status", "submitted");
  if (productId) q = q.eq("product_id", productId);
  const { error } = await q;
  if (error) throw new Error(error.message);
  revalidatePath("/import-requests");
  revalidatePath(BASE);
}

"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const promotionSchema = z.object({
  name: z.string().min(1, "프로모션 이름을 입력해주세요"),
  promo_group: z.string().min(1, "그룹 코드를 입력해주세요"),
  promo_price: z.coerce.number().min(0, "소비자가를 입력해주세요"),
  discount_rate_percent: z.coerce.number().min(0).max(100),
  max_qty_per_dealer: z.coerce.number().int().min(1).optional(),
  starts_on: z.string().min(1, "시작일을 입력해주세요"),
  ends_on: z.string().min(1, "종료일을 입력해주세요"),
  active: z.coerce.boolean().optional(),
  sku_list: z.string().optional().or(z.literal("")),
});

function parsePromotionForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  raw.active = formData.has("active") ? "true" : "false";
  if (raw.max_qty_per_dealer === "") delete raw.max_qty_per_dealer;
  const parsed = promotionSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map((e) => e.message).join(", "));
  }
  if (parsed.data.ends_on < parsed.data.starts_on) {
    throw new Error("종료일은 시작일보다 빠를 수 없습니다.");
  }
  return parsed.data;
}

// "600589, 600592\n600595" 처럼 콤마/줄바꿈/공백 섞어 붙여넣어도 다 받는다.
function splitSkuList(raw: string): string[] {
  return [...new Set(raw.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean))];
}

/**
 * sku_list에 적힌 SKU들을 products.id로 바꿔서 promotionId에 연결한다.
 * 존재하지 않는 SKU가 섞여 있으면 전체를 에러로 되돌린다(일부만 조용히
 * 빠지면 나중에 "왜 이 상품은 할인이 안 걸리지" 하는 문제를 디버그하기
 * 어렵다).
 */
async function syncPromotionItems(
  supabase: ReturnType<typeof createClient>,
  promotionId: string,
  skuListRaw: string
) {
  const skus = splitSkuList(skuListRaw ?? "");

  const { error: deleteError } = await supabase
    .from("product_promotion_items")
    .delete()
    .eq("promotion_id", promotionId);
  if (deleteError) throw new Error(`기존 상품 연결 삭제 실패: ${deleteError.message}`);

  if (skus.length === 0) return;

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, sku")
    .in("sku", skus);
  if (productsError) throw new Error(`상품 조회 실패: ${productsError.message}`);

  const foundSkus = new Set((products ?? []).map((p) => p.sku));
  const missing = skus.filter((s) => !foundSkus.has(s));
  if (missing.length > 0) {
    throw new Error(`존재하지 않는 SKU가 있습니다: ${missing.join(", ")}`);
  }

  const { error: insertError } = await supabase
    .from("product_promotion_items")
    .insert((products ?? []).map((p) => ({ promotion_id: promotionId, product_id: p.id })));
  if (insertError) throw new Error(`상품 연결 실패: ${insertError.message}`);
}

export async function createPromotion(formData: FormData) {
  const supabase = createClient();
  const data = parsePromotionForm(formData);

  const { data: promo, error } = await supabase
    .from("product_promotions")
    .insert({
      name: data.name,
      promo_group: data.promo_group,
      promo_price: data.promo_price,
      discount_rate_percent: data.discount_rate_percent,
      max_qty_per_dealer: data.max_qty_per_dealer ?? null,
      starts_on: data.starts_on,
      ends_on: data.ends_on,
      active: data.active ?? true,
    })
    .select("id")
    .single();
  if (error || !promo) throw new Error(error?.message ?? "프로모션 생성에 실패했습니다.");

  await syncPromotionItems(supabase, promo.id, data.sku_list ?? "");

  revalidatePath("/promotions");
  redirect("/promotions");
}

export async function updatePromotion(id: string, formData: FormData) {
  const supabase = createClient();
  const data = parsePromotionForm(formData);

  const { error } = await supabase
    .from("product_promotions")
    .update({
      name: data.name,
      promo_group: data.promo_group,
      promo_price: data.promo_price,
      discount_rate_percent: data.discount_rate_percent,
      max_qty_per_dealer: data.max_qty_per_dealer ?? null,
      starts_on: data.starts_on,
      ends_on: data.ends_on,
      active: data.active ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await syncPromotionItems(supabase, id, data.sku_list ?? "");

  revalidatePath("/promotions");
  redirect("/promotions");
}

export async function deletePromotion(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("product_promotions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/promotions");
  redirect("/promotions");
}

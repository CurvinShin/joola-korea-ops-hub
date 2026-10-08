"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const productSchema = z.object({
  sku: z.string().min(1, "상품코드(SKU)를 입력해주세요"),
  name: z.string().min(1, "제품명을 입력해주세요"),
  category: z.string().optional().or(z.literal("")),
  subcategory: z.string().optional().or(z.literal("")),
  product_type: z.enum(["hardgoods", "apparel"]).default("hardgoods"),
  fixed_dealer_price: z.coerce.number().min(0).optional(),
  image_url: z.string().url("올바른 URL 형식이 아닙니다").optional().or(z.literal("")),
  unit_cost: z.coerce.number().min(0).optional(),
  unit_price: z.coerce.number().min(0).optional(),
  discontinued: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  demo_purchase_allowed: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  new_arrival_batch: z.string().optional().or(z.literal("")),
  current_stock: z.coerce.number().min(0).default(0),
  reserved_stock: z.coerce.number().min(0).default(0),
  incoming_qty: z.coerce.number().min(0).default(0),
  eta: z.string().optional().or(z.literal("")),
  low_stock_threshold: z.coerce.number().min(0).default(10),
});

function parseProductForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  // Checkbox inputs are absent from FormData when unchecked.
  raw.discontinued = formData.has("discontinued") ? "true" : "false";
  raw.demo_purchase_allowed = formData.has("demo_purchase_allowed") ? "true" : "false";
  // An empty optional number field arrives as "" — treat it as "not set"
  // rather than letting z.coerce.number() turn it into 0.
  if (raw.fixed_dealer_price === "") delete raw.fixed_dealer_price;
  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map((e) => e.message).join(", "));
  }
  return parsed.data;
}

// products + inventory 한 쌍을 만든다. createProduct(제품 추가)와
// createProductFromGap(미매칭 재고에서 등록)이 같은 로직을 공유한다.
async function insertProductWithInventory(data: ReturnType<typeof parseProductForm>) {
  const supabase = createClient();

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      sku: data.sku,
      name: data.name,
      category: data.category || null,
      subcategory: data.subcategory || null,
      product_type: data.product_type,
      fixed_dealer_price: data.fixed_dealer_price ?? null,
      image_url: data.image_url || null,
      unit_cost: data.unit_cost ?? null,
      unit_price: data.unit_price ?? null,
      discontinued: data.discontinued ?? false,
      demo_purchase_allowed: data.demo_purchase_allowed ?? true,
      new_arrival_batch: data.new_arrival_batch || null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { error: invError } = await supabase.from("inventory").insert({
    product_id: product.id,
    current_stock: data.current_stock,
    reserved_stock: data.reserved_stock,
    incoming_qty: data.incoming_qty,
    eta: data.eta || null,
    low_stock_threshold: data.low_stock_threshold,
  });
  if (invError) throw new Error(invError.message);
}

export async function createProduct(formData: FormData) {
  const data = parseProductForm(formData);
  await insertProductWithInventory(data);

  revalidatePath("/inventory");
  redirect("/inventory");
}

/**
 * 재고 > "미매칭" 탭에서 "제품으로 등록"을 눌러 만든 제품. 제품을 정상적으로
 * 등록한 뒤 해당 미매칭 행(catalog_gaps)을 지워서, 등록과 동시에 목록에서
 * 빠지게 한다. 제품 등록이 실패하면 예외가 나므로 미매칭 행은 그대로 남는다.
 */
export async function createProductFromGap(gapId: string, formData: FormData) {
  const data = parseProductForm(formData);
  await insertProductWithInventory(data);

  const supabase = createClient();
  const { error } = await supabase.from("catalog_gaps").delete().eq("id", gapId);
  if (error) throw new Error(`제품은 등록됐지만 미매칭 목록에서 지우지 못했습니다: ${error.message}`);

  revalidatePath("/inventory");
  revalidatePath("/inventory/unmatched");
  redirect("/inventory?status=gaps");
}

export async function updateProduct(id: string, formData: FormData) {
  const supabase = createClient();
  const data = parseProductForm(formData);

  const { error } = await supabase
    .from("products")
    .update({
      sku: data.sku,
      name: data.name,
      category: data.category || null,
      subcategory: data.subcategory || null,
      product_type: data.product_type,
      fixed_dealer_price: data.fixed_dealer_price ?? null,
      image_url: data.image_url || null,
      unit_cost: data.unit_cost ?? null,
      unit_price: data.unit_price ?? null,
      discontinued: data.discontinued ?? false,
      demo_purchase_allowed: data.demo_purchase_allowed ?? true,
      new_arrival_batch: data.new_arrival_batch || null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  const { error: invError } = await supabase.from("inventory").upsert({
    product_id: id,
    current_stock: data.current_stock,
    reserved_stock: data.reserved_stock,
    incoming_qty: data.incoming_qty,
    eta: data.eta || null,
    low_stock_threshold: data.low_stock_threshold,
    updated_at: new Date().toISOString(),
  });
  if (invError) throw new Error(invError.message);

  revalidatePath("/inventory");
  redirect("/inventory");
}

export async function deleteProduct(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/inventory");
  redirect("/inventory");
}

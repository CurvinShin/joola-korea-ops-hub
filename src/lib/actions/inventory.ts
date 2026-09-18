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
  discontinued: z.coerce.boolean().optional(),
  demo_purchase_allowed: z.coerce.boolean().optional(),
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

export async function createProduct(formData: FormData) {
  const supabase = createClient();
  const data = parseProductForm(formData);

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

  revalidatePath("/inventory");
  redirect("/inventory");
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

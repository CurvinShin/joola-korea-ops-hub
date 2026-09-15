"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const purchaseOrderSchema = z.object({
  po_number: z.string().min(1, "발주번호를 입력해주세요"),
  supplier: z.string().min(1, "공급업체를 입력해주세요"),
  order_date: z.string().min(1, "발주일을 입력해주세요"),
  eta: z.string().optional().or(z.literal("")),
  shipping_status: z.enum(["not_shipped", "in_transit", "arrived_port", "cleared_customs", "delivered"]),
  customs_status: z.enum(["not_started", "in_progress", "cleared", "held"]),
  received: z.coerce.boolean().optional(),
  total_cost: z.coerce.number().min(0).default(0),
  notes: z.string().optional().or(z.literal("")),
});

function parsePurchaseOrderForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  // Checkbox inputs are absent from FormData when unchecked.
  raw.received = formData.has("received") ? "true" : "false";
  const parsed = purchaseOrderSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map((e) => e.message).join(", "));
  }
  const d = parsed.data;
  return {
    ...d,
    eta: d.eta || null,
    notes: d.notes || null,
    received: d.received ?? false,
  };
}

export async function createPurchaseOrder(formData: FormData) {
  const supabase = createClient();
  const data = parsePurchaseOrderForm(formData);
  const { error } = await supabase.from("purchase_orders").insert(data);
  if (error) throw new Error(error.message);
  revalidatePath("/purchase-orders");
  redirect("/purchase-orders");
}

export async function updatePurchaseOrder(id: string, formData: FormData) {
  const supabase = createClient();
  const data = parsePurchaseOrderForm(formData);
  const { error } = await supabase.from("purchase_orders").update(data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/purchase-orders");
  redirect("/purchase-orders");
}

export async function deletePurchaseOrder(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("purchase_orders").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/purchase-orders");
  redirect("/purchase-orders");
}

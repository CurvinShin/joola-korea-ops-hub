"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  shipped_on: z.string().min(1, "날짜를 입력해주세요"),
  category: z.enum(["partnership", "event_support", "influencer", "athlete", "other"]),
  recipient_name: z.string().min(1, "받는 곳을 입력해주세요"),
  event_id: z.string().optional().or(z.literal("")),
  items: z.string().min(1, "품목을 입력해주세요"),
  value_krw: z.coerce.number().min(0).default(0),
  status: z.enum(["pending", "shipped"]),
  notes: z.string().optional().or(z.literal("")),
});

function parse(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error(parsed.error.errors.map((e) => e.message).join(", "));
  const d = parsed.data;
  return { ...d, event_id: d.event_id || null, notes: d.notes || null };
}

export async function createSupportShipment(formData: FormData) {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("support_shipments")
    .insert({ ...parse(formData), created_by: auth.user?.id ?? null });
  if (error) throw new Error(error.message);
  revalidatePath("/support");
  redirect("/support");
}

export async function updateSupportShipment(id: string, formData: FormData) {
  const supabase = createClient();
  const { error } = await supabase
    .from("support_shipments")
    .update({ ...parse(formData), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/support");
  redirect("/support");
}

export async function markSupportShipped(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("support_shipments")
    .update({ status: "shipped", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/support");
  redirect("/support");
}

export async function deleteSupportShipment(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("support_shipments").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/support");
  redirect("/support");
}

"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const dealerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  classification: z.enum(["flagship", "standard", "online_only", "distributor"]),
  status: z.enum(["active", "pending", "inactive", "terminated"]),
  contact_name: z.string().optional().or(z.literal("")),
  contact_email: z.string().email().optional().or(z.literal("")),
  contact_phone: z.string().optional().or(z.literal("")),
  region: z.string().optional().or(z.literal("")),
  contract_start: z.string().optional().or(z.literal("")),
  contract_end: z.string().optional().or(z.literal("")),
  discount_rate: z.coerce.number().min(0).max(100).default(0),
  moq_target: z.coerce.number().min(0).default(0),
  outstanding_issues: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

function parseDealerForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = dealerSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map((e) => e.message).join(", "));
  }
  // Convert empty-string optional fields to null so Postgres date/text columns stay clean.
  const data = parsed.data;
  return {
    ...data,
    contact_name: data.contact_name || null,
    contact_email: data.contact_email || null,
    contact_phone: data.contact_phone || null,
    region: data.region || null,
    contract_start: data.contract_start || null,
    contract_end: data.contract_end || null,
    outstanding_issues: data.outstanding_issues || null,
    notes: data.notes || null,
  };
}

export async function createDealer(formData: FormData) {
  const supabase = createClient();
  const data = parseDealerForm(formData);
  const { error } = await supabase.from("dealers").insert(data);
  if (error) throw new Error(error.message);
  revalidatePath("/dealers");
  redirect("/dealers");
}

export async function updateDealer(id: string, formData: FormData) {
  const supabase = createClient();
  const data = parseDealerForm(formData);
  const { error } = await supabase.from("dealers").update(data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dealers");
  revalidatePath(`/dealers/${id}`);
  redirect(`/dealers/${id}`);
}

export async function deleteDealer(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("dealers").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dealers");
  redirect("/dealers");
}

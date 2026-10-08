"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  opened_on: z.string().min(1, "접수일을 입력해주세요"),
  kind: z.enum(["refund", "exchange", "claim"]),
  channel: z.enum(["dealer", "smartstore", "direct", "other"]),
  counterparty: z.string().min(1, "거래처/고객을 입력해주세요"),
  product_summary: z.string().optional().or(z.literal("")),
  amount_krw: z.coerce.number().min(0).default(0),
  status: z.enum(["open", "waiting", "done"]),
  next_action: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

function parse(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error(parsed.error.errors.map((e) => e.message).join(", "));
  const d = parsed.data;
  return {
    ...d,
    product_summary: d.product_summary || null,
    next_action: d.next_action || null,
    notes: d.notes || null,
    resolved_on: d.status === "done" ? new Date().toISOString().slice(0, 10) : null,
  };
}

export async function createClaim(formData: FormData) {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("refund_claims")
    .insert({ ...parse(formData), created_by: auth.user?.id ?? null });
  if (error) throw new Error(error.message);
  revalidatePath("/claims");
  redirect("/claims");
}

export async function updateClaim(id: string, formData: FormData) {
  const supabase = createClient();
  const { error } = await supabase
    .from("refund_claims")
    .update({ ...parse(formData), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/claims");
  redirect("/claims");
}

export async function setClaimStatus(id: string, status: "open" | "waiting" | "done") {
  const supabase = createClient();
  const { error } = await supabase
    .from("refund_claims")
    .update({
      status,
      resolved_on: status === "done" ? new Date().toISOString().slice(0, 10) : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/claims");
  redirect("/claims");
}

export async function deleteClaim(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("refund_claims").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/claims");
  redirect("/claims");
}

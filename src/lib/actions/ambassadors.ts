"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ambassadorSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요"),
  type: z.enum(["player", "ambassador", "influencer", "junior", "creator"]),
  contract_status: z.enum(["prospect", "negotiating", "active", "expired", "ended"]),
  contract_start: z.string().optional().or(z.literal("")),
  contract_end: z.string().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  social_media_handle: z.string().optional().or(z.literal("")),
  main_paddle: z.string().optional().or(z.literal("")),
  dupr_rating: z.coerce.number().min(0).max(8).optional(),
  birth_date: z.string().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  affiliation: z.string().optional().or(z.literal("")),
  shipping_address: z.string().optional().or(z.literal("")),
  equipment_support: z.string().optional().or(z.literal("")),
  compensation: z.string().optional().or(z.literal("")),
  kpi: z.string().optional().or(z.literal("")),
  content_obligations: z.string().optional().or(z.literal("")),
  performance_notes: z.string().optional().or(z.literal("")),
});

function parseAmbassadorForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = ambassadorSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map((e) => e.message).join(", "));
  }
  const data = parsed.data;
  return {
    name: data.name,
    type: data.type,
    contract_status: data.contract_status,
    contract_start: data.contract_start || null,
    contract_end: data.contract_end || null,
    email: data.email || null,
    phone: data.phone || null,
    social_media_handle: data.social_media_handle || null,
    main_paddle: data.main_paddle || null,
    dupr_rating: data.dupr_rating ?? null,
    birth_date: data.birth_date || null,
    gender: data.gender || null,
    affiliation: data.affiliation || null,
    shipping_address: data.shipping_address || null,
    equipment_support: data.equipment_support || null,
    compensation: data.compensation || null,
    kpi: data.kpi || null,
    content_obligations: data.content_obligations || null,
    performance_notes: data.performance_notes || null,
  };
}

export async function createAmbassador(formData: FormData) {
  const supabase = createClient();
  const data = parseAmbassadorForm(formData);
  const { error } = await supabase.from("ambassadors").insert(data);
  if (error) throw new Error(error.message);
  revalidatePath("/ambassadors");
  redirect("/ambassadors");
}

export async function updateAmbassador(id: string, formData: FormData) {
  const supabase = createClient();
  const data = parseAmbassadorForm(formData);
  const { error } = await supabase.from("ambassadors").update(data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/ambassadors");
  revalidatePath(`/ambassadors/${id}`);
  redirect(`/ambassadors/${id}`);
}

export async function deleteAmbassador(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("ambassadors").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/ambassadors");
  redirect("/ambassadors");
}

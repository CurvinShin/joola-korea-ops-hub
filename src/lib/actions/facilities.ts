"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const KR_REGIONS = [
  "seoul", "incheon", "gyeonggi", "gangwon", "chungbuk", "chungnam",
  "daejeon", "sejong", "jeonbuk", "jeonnam", "gwangju", "gyeongbuk",
  "daegu", "gyeongnam", "busan", "ulsan", "jeju",
] as const;

const facilitySchema = z.object({
  name: z.string().min(1, "시설명을 입력해주세요"),
  region: z.enum(KR_REGIONS).optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  representative_name: z.string().optional().or(z.literal("")),
  instagram_handle: z.string().optional().or(z.literal("")),
  contact_name: z.string().optional().or(z.literal("")),
  contact_email: z.string().email().optional().or(z.literal("")),
  contact_phone: z.string().optional().or(z.literal("")),
  courts_count: z.coerce.number().int().min(0).optional(),
  partnership_status: z.enum(["prospect", "in_discussion", "active", "ended"]),
  branding_installed: z.union([z.literal("on"), z.literal("")]).optional(),
  demo_paddles_provided: z.union([z.literal("on"), z.literal("")]).optional(),
  product_display: z.union([z.literal("on"), z.literal("")]).optional(),
  sponsorship_details: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

function parseFacilityForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = facilitySchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map((e) => e.message).join(", "));
  }
  const data = parsed.data;
  return {
    name: data.name,
    region: data.region || null,
    address: data.address || null,
    representative_name: data.representative_name || null,
    instagram_handle: data.instagram_handle || null,
    contact_name: data.contact_name || null,
    contact_email: data.contact_email || null,
    contact_phone: data.contact_phone || null,
    courts_count: data.courts_count ?? null,
    partnership_status: data.partnership_status,
    branding_installed: data.branding_installed === "on",
    demo_paddles_provided: data.demo_paddles_provided === "on",
    product_display: data.product_display === "on",
    sponsorship_details: data.sponsorship_details || null,
    notes: data.notes || null,
  };
}

export async function createFacility(formData: FormData) {
  const supabase = createClient();
  const data = parseFacilityForm(formData);
  const { error } = await supabase.from("facilities").insert(data);
  if (error) throw new Error(error.message);
  revalidatePath("/facilities");
  redirect("/facilities");
}

export async function updateFacility(id: string, formData: FormData) {
  const supabase = createClient();
  const data = parseFacilityForm(formData);
  const { error } = await supabase.from("facilities").update(data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/facilities");
  revalidatePath(`/facilities/${id}`);
  redirect(`/facilities/${id}`);
}

export async function deleteFacility(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("facilities").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/facilities");
  redirect("/facilities");
}

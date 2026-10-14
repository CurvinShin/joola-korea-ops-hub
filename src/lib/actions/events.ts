"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const eventSchema = z.object({
  name: z.string().min(1, "이벤트명을 입력해주세요"),
  event_date: z.string().min(1, "날짜를 입력해주세요"),
  location: z.string().optional().or(z.literal("")),
  organizer: z.string().optional().or(z.literal("")),
  budget: z.coerce.number().min(0).default(0),
  expected_participants: z.coerce.number().min(0).optional(),
  actual_participants: z.coerce.number().min(0).optional(),
  onsite_sales: z.coerce.number().min(0).default(0),
  sponsorship_details: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  post_event_report: z.string().optional().or(z.literal("")),
});

function parseEventForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = eventSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.errors.map((e) => e.message).join(", "));
  const d = parsed.data;
  return {
    ...d,
    location: d.location || null,
    organizer: d.organizer || null,
    sponsorship_details: d.sponsorship_details || null,
    notes: d.notes || null,
    post_event_report: d.post_event_report || null,
    expected_participants: d.expected_participants ?? null,
    actual_participants: d.actual_participants ?? null,
  };
}

export async function createEvent(formData: FormData) {
  const supabase = createClient();
  const data = parseEventForm(formData);
  const { error } = await supabase.from("events").insert(data);
  if (error) throw new Error(error.message);
  revalidatePath("/events");
  redirect("/events");
}

export async function updateEvent(id: string, formData: FormData) {
  const supabase = createClient();
  const data = parseEventForm(formData);
  const { error } = await supabase.from("events").update(data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/events");
  redirect("/events");
}

const resultSchema = z.object({
  actual_participants: z.coerce.number().min(0).optional(),
  onsite_sales: z.coerce.number().min(0).default(0),
  actual_cost: z.coerce.number().min(0).optional(),
  post_event_report: z.string().optional().or(z.literal("")),
  result_links: z.string().optional().or(z.literal("")),
});

/** 행사가 끝난 뒤 결과(참가 인원·현장 매출·지출·후기·자료 링크)만 저장한다. */
export async function updateEventResult(id: string, formData: FormData) {
  const supabase = createClient();
  const raw = Object.fromEntries(formData.entries());
  // 비어 있는 숫자 칸은 undefined로 둬서 0이 아닌 "미입력"으로 저장한다.
  for (const key of ["actual_participants", "actual_cost"]) {
    if (raw[key] === "") delete raw[key];
  }
  const parsed = resultSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.errors.map((e) => e.message).join(", "));
  const d = parsed.data;
  const { error } = await supabase
    .from("events")
    .update({
      actual_participants: d.actual_participants ?? null,
      onsite_sales: d.onsite_sales,
      actual_cost: d.actual_cost ?? null,
      post_event_report: d.post_event_report?.trim() || null,
      result_links: d.result_links?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/events");
  redirect("/events");
}

export async function deleteEvent(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/events");
  redirect("/events");
}

"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const eventSchema = z.object({
  name: z.string().min(1, "Name is required"),
  event_date: z.string().min(1, "Date is required"),
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

export async function deleteEvent(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/events");
  redirect("/events");
}

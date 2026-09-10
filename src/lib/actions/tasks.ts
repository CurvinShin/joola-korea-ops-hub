"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.enum([
    "dealer",
    "inventory",
    "sales",
    "purchase_order",
    "event",
    "facility",
    "ambassador",
    "marketing",
    "general",
  ]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["open", "in_progress", "blocked", "done"]),
  due_date: z.string().optional().or(z.literal("")),
  related_dealer_id: z.string().optional().or(z.literal("")),
  related_event_id: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

function parseTaskForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = taskSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.errors.map((e) => e.message).join(", "));
  const d = parsed.data;
  return {
    ...d,
    due_date: d.due_date || null,
    related_dealer_id: d.related_dealer_id || null,
    related_event_id: d.related_event_id || null,
    notes: d.notes || null,
  };
}

export async function createTask(formData: FormData) {
  const supabase = createClient();
  const data = parseTaskForm(formData);
  const { error } = await supabase.from("tasks").insert(data);
  if (error) throw new Error(error.message);
  revalidatePath("/tasks");
  redirect("/tasks");
}

export async function updateTask(id: string, formData: FormData) {
  const supabase = createClient();
  const data = parseTaskForm(formData);
  const { error } = await supabase.from("tasks").update(data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/tasks");
  redirect("/tasks");
}

export async function setTaskStatus(id: string, status: string) {
  const supabase = createClient();
  const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/tasks");
}

export async function deleteTask(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/tasks");
  redirect("/tasks");
}

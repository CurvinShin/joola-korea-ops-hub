"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  released_on: z.string().min(1, "날짜를 입력해주세요"),
  kind: z.enum(["new", "improved", "fixed"]),
  audience: z.enum(["internal", "dealers"]),
  title: z.string().trim().min(1, "제목을 입력해주세요").max(120, "제목은 120자 이내로 입력해주세요"),
  body: z.string().trim().max(3000, "내용은 3000자 이내로 입력해주세요"),
});

function back(message?: string): never {
  redirect(message ? `/updates?error=${encodeURIComponent(message)}` : "/updates");
}

function parse(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) back(parsed.error.errors.map((e) => e.message).join(", "));
  return parsed.data;
}

function refresh() {
  revalidatePath("/updates");
  revalidatePath("/order/updates");
}

export async function createAppUpdate(formData: FormData) {
  const data = parse(formData);
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("app_updates").insert({ ...data, created_by: user?.id ?? null });
  if (error) back(`저장하지 못했습니다: ${error.message}`);
  refresh();
  back();
}

export async function updateAppUpdate(id: string, formData: FormData) {
  const data = parse(formData);
  const supabase = createClient();
  const { error } = await supabase
    .from("app_updates")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) back(`수정하지 못했습니다: ${error.message}`);
  refresh();
  back();
}

export async function deleteAppUpdate(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("app_updates").delete().eq("id", id);
  if (error) back(`삭제하지 못했습니다: ${error.message}`);
  refresh();
  back();
}

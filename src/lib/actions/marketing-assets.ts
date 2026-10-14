"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { normalizeAssetUrl } from "@/lib/utils/marketing-assets";

const schema = z.object({
  title: z.string().trim().min(1, "제목을 입력해주세요").max(120, "제목은 120자 이내로 입력해주세요"),
  category: z.string().trim().min(1, "분류를 입력해주세요").max(40, "분류는 40자 이내로 입력해주세요"),
  url: z.string().trim().min(1, "링크를 입력해주세요"),
  description: z.string().trim().max(500, "설명은 500자 이내로 입력해주세요").optional().or(z.literal("")),
  audience: z.enum(["internal", "dealers"]),
});

function back(message?: string): never {
  redirect(message ? `/marketing-assets?error=${encodeURIComponent(message)}` : "/marketing-assets");
}

function parse(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) back(parsed.error.errors.map((e) => e.message).join(", "));
  const url = normalizeAssetUrl(parsed.data.url);
  if (!url) back("링크 주소 형식이 올바르지 않습니다. https:// 로 시작하는 주소를 넣어주세요.");
  return { ...parsed.data, url, description: parsed.data.description || null };
}

function refresh() {
  revalidatePath("/marketing-assets");
  revalidatePath("/order/assets");
}

export async function createMarketingAsset(formData: FormData) {
  const data = parse(formData);
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("marketing_assets").insert({ ...data, created_by: user?.id ?? null });
  if (error) back(`저장하지 못했습니다: ${error.message}`);
  refresh();
  back();
}

export async function updateMarketingAsset(id: string, formData: FormData) {
  const data = parse(formData);
  const supabase = createClient();
  const { error } = await supabase
    .from("marketing_assets")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) back(`수정하지 못했습니다: ${error.message}`);
  refresh();
  back();
}

export async function deleteMarketingAsset(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("marketing_assets").delete().eq("id", id);
  if (error) back(`삭제하지 못했습니다: ${error.message}`);
  refresh();
  back();
}

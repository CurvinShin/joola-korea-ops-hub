"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type RegisterOrderListInput = {
  title: string;
  tier: number;
  visibleFrom: string;
  effectiveOn: string | null;
  storagePath: string;
  fileName: string;
  fileSize: number | null;
};

/**
 * 브라우저가 Storage 버킷('order-lists')에 파일을 올린 뒤(파일이 커서 서버를 거치지 않음),
 * 그 파일을 오더리스트 목록에 등록한다. 관리자(admin)만 등록할 수 있다(RLS).
 */
export async function registerOrderListFile(input: RegisterOrderListInput): Promise<{ ok: boolean; message?: string }> {
  const title = input.title.trim();
  if (!title) return { ok: false, message: "제목을 입력해주세요." };
  if (!Number.isInteger(input.tier) || input.tier < 1 || input.tier > 100) {
    return { ok: false, message: "딜러 등급(할인율)을 확인해주세요." };
  }
  if (!input.storagePath.startsWith(`${input.tier}/`)) {
    return { ok: false, message: "파일 경로가 올바르지 않습니다." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.visibleFrom)) return { ok: false, message: "게시일을 확인해주세요." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("order_list_files").insert({
    title,
    tier: input.tier,
    visible_from: input.visibleFrom,
    effective_on: input.effectiveOn || null,
    storage_path: input.storagePath,
    file_name: input.fileName,
    file_size: input.fileSize,
    created_by: user?.id ?? null,
  });
  if (error) return { ok: false, message: error.message };

  revalidatePath("/order-lists");
  revalidatePath("/order/order-list");
  return { ok: true };
}

/** 목록에서 지우고 Storage의 실제 파일도 같이 지운다. */
export async function deleteOrderListFile(id: string) {
  const supabase = createClient();
  const { data: row } = await supabase.from("order_list_files").select("storage_path").eq("id", id).maybeSingle();
  if (!row) return;
  const { error } = await supabase.from("order_list_files").delete().eq("id", id);
  if (error) throw new Error(error.message);
  // 행이 지워진(=관리자 권한이 확인된) 뒤에만 실제 파일을 지운다.
  await createAdminClient().storage.from("order-lists").remove([row.storage_path]);
  revalidatePath("/order-lists");
  revalidatePath("/order/order-list");
}

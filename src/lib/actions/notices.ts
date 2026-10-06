"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const noticeSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요"),
  body: z.string().min(1, "내용을 입력해주세요"),
  target_mode: z.enum(["all", "specific"]),
  publish_on: z.string().min(1, "게시일을 입력해주세요"),
  expires_on: z.string().optional().or(z.literal("")),
  active: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
});

function parseNoticeForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  raw.active = formData.has("active") ? "true" : "false";
  const parsed = noticeSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map((e) => e.message).join(", "));
  }
  if (parsed.data.expires_on && parsed.data.expires_on < parsed.data.publish_on) {
    throw new Error("종료일은 게시일보다 빠를 수 없습니다.");
  }
  const dealerIds = formData.getAll("dealer_ids").map(String).filter(Boolean);
  if (parsed.data.target_mode === "specific" && dealerIds.length === 0) {
    throw new Error("특정 딜러만 공개하려면 대상 딜러를 1곳 이상 선택해주세요.");
  }
  return { ...parsed.data, dealerIds };
}

/**
 * notice_dealer_targets를 폼에서 체크한 딜러 목록으로 통째로 교체한다.
 * target_mode가 "all"이어도 체크된 딜러가 있으면 그대로 저장해둔다 — RLS
 * select 정책은 target_mode='all'이면 이 테이블을 아예 안 보므로 무해하고,
 * 나중에 "specific"으로 바꿀 때 이전에 고르던 목록이 남아있으면 편하다.
 */
async function syncNoticeTargets(
  supabase: ReturnType<typeof createClient>,
  noticeId: string,
  dealerIds: string[]
) {
  const { error: deleteError } = await supabase
    .from("notice_dealer_targets")
    .delete()
    .eq("notice_id", noticeId);
  if (deleteError) throw new Error(`기존 대상 딜러 삭제 실패: ${deleteError.message}`);

  if (dealerIds.length === 0) return;

  const { error: insertError } = await supabase
    .from("notice_dealer_targets")
    .insert(dealerIds.map((dealerId) => ({ notice_id: noticeId, dealer_id: dealerId })));
  if (insertError) throw new Error(`대상 딜러 등록 실패: ${insertError.message}`);
}

export async function createNotice(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const data = parseNoticeForm(formData);

  const { data: notice, error } = await supabase
    .from("site_notices")
    .insert({
      title: data.title,
      body: data.body,
      target_mode: data.target_mode,
      publish_on: data.publish_on,
      expires_on: data.expires_on || null,
      active: data.active ?? true,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error || !notice) throw new Error(error?.message ?? "공지 생성에 실패했습니다.");

  await syncNoticeTargets(supabase, notice.id, data.dealerIds);

  revalidatePath("/notices");
  revalidatePath("/order");
  redirect("/notices");
}

export async function updateNotice(id: string, formData: FormData) {
  const supabase = createClient();
  const data = parseNoticeForm(formData);

  const { error } = await supabase
    .from("site_notices")
    .update({
      title: data.title,
      body: data.body,
      target_mode: data.target_mode,
      publish_on: data.publish_on,
      expires_on: data.expires_on || null,
      active: data.active ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await syncNoticeTargets(supabase, id, data.dealerIds);

  revalidatePath("/notices");
  revalidatePath("/order");
  redirect("/notices");
}

export async function deleteNotice(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("site_notices").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/notices");
  revalidatePath("/order");
}

/**
 * 딜러가 /order 상단 배너에서 "확인"을 누르면 호출된다. 이미 확인한 공지를
 * 다시 눌러도(중복 클릭, 새로고침 타이밍 등) 에러 없이 조용히 넘어가도록
 * ignoreDuplicates upsert를 쓴다 — 이 배너는 "약한 확인"이라 실패해도 화면을
 * 막지 않으므로 호출하는 쪽에서도 결과를 신경 쓰지 않는다.
 */
export async function acknowledgeNotice(noticeId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("dealer_id")
    .eq("id", user?.id ?? "")
    .single();
  if (!profile?.dealer_id) return;

  await supabase
    .from("notice_acknowledgments")
    .upsert(
      { notice_id: noticeId, dealer_id: profile.dealer_id },
      { onConflict: "notice_id,dealer_id", ignoreDuplicates: true }
    );

  revalidatePath("/order");
}

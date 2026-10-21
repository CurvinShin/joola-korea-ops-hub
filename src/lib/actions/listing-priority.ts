"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateQuoteAnalysisReport } from "@/lib/analysis/report-service";

const PAGE = "/sales/listing-priority";

// 알림 배너는 모든 화면(layout)에 붙어 있어서 layout 단위로 다시 그리게 한다.
function refresh() {
  revalidatePath(PAGE);
  revalidatePath("/", "layout");
}

function back(params?: { error?: string; ok?: string }): never {
  const qs = params?.error
    ? `?error=${encodeURIComponent(params.error)}`
    : params?.ok
      ? `?ok=${encodeURIComponent(params.ok)}`
      : "";
  redirect(`${PAGE}${qs}`);
}

// "확인했어요": 알림 배너를 끈다. 쓰기 권한(관리자)은 RLS가 확인한다.
export async function acknowledgeAnalysisReport(formData: FormData): Promise<void> {
  const id = String(formData.get("report_id") ?? "");
  if (!id) back({ error: "분석 기록을 찾지 못했습니다." });
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("quote_analysis_reports")
    .update({ acknowledged_at: new Date().toISOString(), acknowledged_by: user?.id ?? null })
    .eq("id", id)
    .select("id");
  if (error || !data || data.length === 0) back({ error: "확인 처리를 하지 못했습니다(관리자만 가능합니다)." });
  refresh();
  back();
}

// 되돌리기: 확인 표시를 지워 알림 배너를 다시 띄운다.
export async function unacknowledgeAnalysisReport(formData: FormData): Promise<void> {
  const id = String(formData.get("report_id") ?? "");
  if (!id) back({ error: "분석 기록을 찾지 못했습니다." });
  const supabase = createClient();
  const { data, error } = await supabase
    .from("quote_analysis_reports")
    .update({ acknowledged_at: null, acknowledged_by: null })
    .eq("id", id)
    .select("id");
  if (error || !data || data.length === 0) back({ error: "알림을 다시 표시하지 못했습니다(관리자만 가능합니다)." });
  refresh();
  back();
}

// 이미 스마트스토어에 올라간 제품군으로 표시 → 다음 분석부터 후보에서 빠진다.
export async function markFamilyListed(formData: FormData): Promise<void> {
  const key = String(formData.get("family_key") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  if (!key || !label) back({ error: "제품군 정보가 비어 있습니다." });
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("smartstore_listed_families")
    .upsert({ family_key: key, label, marked_by: user?.id ?? null }, { onConflict: "family_key" });
  if (error) back({ error: "등록됨으로 표시하지 못했습니다(관리자만 가능합니다)." });
  refresh();
  back();
}

// 되돌리기: 등록됨 표시를 지워 다시 후보에 넣는다.
export async function unmarkFamilyListed(formData: FormData): Promise<void> {
  const key = String(formData.get("family_key") ?? "").trim();
  if (!key) back({ error: "제품군 정보가 비어 있습니다." });
  const supabase = createClient();
  const { error } = await supabase.from("smartstore_listed_families").delete().eq("family_key", key);
  if (error) back({ error: "등록됨 표시를 취소하지 못했습니다(관리자만 가능합니다)." });
  refresh();
  back();
}

// 지금 바로 분석해서 새 기록(=알림)을 만든다. 기록 저장은 서버 권한으로 하므로 관리자인지 먼저 확인한다.
export async function runListingAnalysisNow(): Promise<void> {
  const supabase = createClient();
  const { data: allowed } = await supabase.rpc("can_write");
  if (allowed !== true) back({ error: "관리자만 분석을 실행할 수 있습니다." });
  const res = await generateQuoteAnalysisReport(supabase, createAdminClient());
  if (!res.ok) back({ error: res.error });
  refresh();
  back({ ok: "분석을 새로 했습니다." });
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import * as XLSX from "xlsx";
import { generateQuoteAnalysisReport } from "@/lib/analysis/report-service";
import { matchStoreProducts, parseStoreProductRows } from "@/lib/analysis/store-listing";

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

// 체크박스로 고른 제품군을 한꺼번에 "등록됨"으로 표시한다. 라벨은 family_key별 hidden 입력(label:<key>)에서 읽는다.
export async function markFamiliesListed(formData: FormData): Promise<void> {
  const keys = Array.from(new Set(formData.getAll("family_key").map((v) => String(v).trim()).filter(Boolean)));
  if (keys.length === 0) back({ error: "선택한 제품군이 없습니다." });
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const rows = keys.map((key) => ({
    family_key: key,
    label: String(formData.get(`label:${key}`) ?? "").trim() || key,
    marked_by: user?.id ?? null,
  }));
  const { error } = await supabase.from("smartstore_listed_families").upsert(rows, { onConflict: "family_key" });
  if (error) back({ error: "등록됨으로 표시하지 못했습니다(관리자만 가능합니다)." });
  refresh();
  back({ ok: `${rows.length}개 제품군을 등록됨으로 표시했습니다. 아래 목록에서 되돌릴 수 있습니다.` });
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

// ---------------------------------------------------------------------------
// 스마트스토어 "상품 목록" 파일 업로드 → 이미 올라간 제품군을 자동으로 표시
// ---------------------------------------------------------------------------
export interface StoreUploadSummary {
  filename: string;
  productCount: number; // 판매 중인 상품 수(판매종료·삭제 제외)
  ignoredCount: number;
  matched: Array<{ label: string; count: number }>;
  unmatched: string[]; // 제품군을 못 찾은 상품명(화면에서 사람이 확인)
  removed: string[]; // 이전 자동·미리 넣은 표시 중 이번 파일에 없어서 빠진 제품군
}
export type StoreUploadResult = { ok: true; summary: StoreUploadSummary } | { ok: false; error: string };

function readRows(buffer: Buffer): Array<Record<string, unknown>> {
  const isZip = buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b; // .xlsx는 zip(PK)으로 시작
  let wb: XLSX.WorkBook;
  if (isZip) {
    wb = XLSX.read(buffer, { type: "buffer" });
  } else {
    let text = new TextDecoder("utf-8").decode(buffer).replace(/^﻿/, "");
    if (text.includes("�")) text = new TextDecoder("euc-kr").decode(buffer); // 엑셀에서 저장한 CSV(CP949) 대비
    wb = XLSX.read(text, { type: "string" });
  }
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
}

export async function importStoreProductList(
  _prev: StoreUploadResult | null,
  formData: FormData
): Promise<StoreUploadResult> {
  try {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return { ok: false, error: "상품 목록 파일(.csv 또는 .xlsx)을 선택해주세요." };
    if (file.size > 5 * 1024 * 1024) return { ok: false, error: "파일이 너무 큽니다(5MB 이하)." };

    const supabase = createClient();
    const { data: allowed } = await supabase.rpc("can_write");
    if (allowed !== true) return { ok: false, error: "관리자만 업로드할 수 있습니다." };

    const parsed = parseStoreProductRows(readRows(Buffer.from(await file.arrayBuffer())));
    if (!parsed.ok) return { ok: false, error: parsed.error };
    const match = matchStoreProducts(parsed.products);
    if (match.matched.length === 0) {
      return { ok: false, error: "상품명에서 알려진 제품군을 하나도 찾지 못했습니다. 파일이 맞는지 확인해주세요." };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 사람이 직접 표시한 것(manual)은 그대로 두고, 미리 넣은 값(seed)·이전 파일 결과(store)만 이번 파일로 교체한다.
    const { data: existing, error: readErr } = await supabase
      .from("smartstore_listed_families")
      .select("family_key, label, source");
    if (readErr) return { ok: false, error: "등록된 제품군 목록을 읽지 못했습니다." };
    const manualKeys = new Set((existing ?? []).filter((r) => r.source === "manual").map((r) => r.family_key as string));
    const replaceable = (existing ?? []).filter((r) => r.source !== "manual");

    const { error: delErr } = await supabase.from("smartstore_listed_families").delete().in("source", ["seed", "store"]);
    if (delErr) return { ok: false, error: "이전 표시를 지우지 못했습니다." };

    const rows = match.matched
      .filter((m) => !manualKeys.has(m.key))
      .map((m) => ({ family_key: m.key, label: m.label, marked_by: user?.id ?? null, source: "store" }));
    if (rows.length > 0) {
      const { error: insErr } = await supabase.from("smartstore_listed_families").insert(rows);
      if (insErr) return { ok: false, error: `등록됨 표시를 저장하지 못했습니다: ${insErr.message}` };
    }

    const newKeys = new Set(match.matched.map((m) => m.key));
    refresh();
    return {
      ok: true,
      summary: {
        filename: file.name.normalize("NFC"),
        productCount: match.productCount,
        ignoredCount: match.ignoredCount,
        matched: match.matched.map((m) => ({ label: m.label, count: m.count })),
        unmatched: match.unmatched,
        removed: replaceable.filter((r) => !newKeys.has(r.family_key as string)).map((r) => r.label as string),
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "파일을 처리하지 못했습니다." };
  }
}

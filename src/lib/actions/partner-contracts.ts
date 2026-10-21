"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hashIp, hashStatusToken, newStatusToken } from "@/lib/partner/crypto";
import { hashContract } from "@/lib/partner/contract-service";
import type { RenderedContract } from "@/lib/partner/contract-template";

// 브랜드 파트너(신청자) 전자서명. 로그인이 없으므로 상태 확인 토큰(해시 비교)이 곧 인증이다.
// 서명 이미지·접속 정보·본문 지문(해시)을 함께 저장해 나중에 변조 여부를 확인할 수 있게 한다.

export type SignResult = { ok: true } | { ok: false; error: string };

const MAX_SIGNATURE_CHARS = 300_000;
const MIN_SIGNATURE_CHARS = 1_500; // 아무것도 그리지 않은 빈 서명판을 걸러내는 최소 크기

const signSchema = z.object({
  token: z.string().min(1),
  content_hash: z.string().length(64),
  typed_name: z.string().trim().min(1).max(50),
  signature_png: z
    .string()
    .startsWith("data:image/png;base64,")
    .max(MAX_SIGNATURE_CHARS),
  // 직인은 선택. 안 올리면 빈 문자열로 온다.
  seal_png: z
    .string()
    .max(MAX_SIGNATURE_CHARS)
    .refine((v) => v === "" || v.startsWith("data:image/png;base64,"))
    .optional(),
});

function normalizeName(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

function clientIp(): string {
  const h = headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function signContractAsPartner(_prev: SignResult | null, formData: FormData): Promise<SignResult> {
  const parsed = signSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: "서명(그림)과 대표자 이름을 입력해 주세요." };
  if (formData.get("agree") !== "on") return { ok: false, error: "계약 내용에 동의하셔야 서명할 수 있습니다." };
  if (parsed.data.signature_png.length < MIN_SIGNATURE_CHARS) {
    return { ok: false, error: "서명 칸에 서명을 그려 주세요." };
  }

  const admin = createAdminClient();
  const { data: app } = await admin
    .from("partner_applications")
    .select("id, status, representative_name, pii_purged_at")
    .eq("status_token_hash", hashStatusToken(parsed.data.token))
    .maybeSingle();
  if (!app || app.status !== "approved" || app.pii_purged_at) {
    return { ok: false, error: "승인된 신청서를 찾을 수 없습니다." };
  }

  const { data: contract } = await admin
    .from("partner_contracts")
    .select("id, status, content, content_hash")
    .eq("application_id", app.id)
    .maybeSingle();
  if (!contract) return { ok: false, error: "계약서를 찾을 수 없습니다." };
  if (contract.status !== "pending_partner") return { ok: false, error: "이미 서명된 계약서입니다." };

  // 화면에서 본 계약서와 저장된 계약서가 같은지, 저장된 본문이 변조되지 않았는지 확인한다.
  if (hashContract(contract.content as RenderedContract) !== contract.content_hash) {
    return { ok: false, error: "계약서 내용을 확인하지 못했습니다. 담당자에게 문의해 주세요." };
  }
  if (parsed.data.content_hash !== contract.content_hash) {
    return { ok: false, error: "계약서가 변경되었습니다. 페이지를 새로고침한 뒤 내용을 다시 확인해 주세요." };
  }

  // 서명자는 신청서의 대표자여야 한다(직원 서명 방지).
  if (!app.representative_name || normalizeName(parsed.data.typed_name) !== normalizeName(app.representative_name)) {
    return { ok: false, error: "서명자는 사업자등록증의 대표자 이름과 같아야 합니다." };
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from("partner_contracts")
    .update({
      status: "pending_joola",
      partner_signed_at: now,
      partner_signer_name: parsed.data.typed_name,
      partner_signature_png: parsed.data.signature_png,
      partner_seal_png: parsed.data.seal_png ? parsed.data.seal_png : null,
      partner_ip_hash: hashIp(clientIp()),
      partner_user_agent: (headers().get("user-agent") ?? "").slice(0, 300),
      updated_at: now,
    })
    .eq("id", contract.id)
    .eq("status", "pending_partner");
  if (error) return { ok: false, error: "서명을 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." };

  revalidatePath(`/partner-applications/${app.id}`);
  revalidatePath(`/partner-status/${parsed.data.token}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// JOOLA 대표 서명. 직원이 서명 링크를 만들고(토큰은 해시만 저장), 대표가 로그인 없이 그 링크로 서명한다.
// ---------------------------------------------------------------------------

export type JoolaLinkResult = { ok: true; url: string } | { ok: false; error: string };

// 직원(관리자) 전용. 신청자 서명이 끝난 계약서에 대해서만 만들 수 있고, 다시 만들면 이전 링크는 쓸 수 없게 된다.
export async function createJoolaSignLink(applicationId: string): Promise<JoolaLinkResult> {
  const supabase = createClient();
  const token = newStatusToken();
  const { data, error } = await supabase
    .from("partner_contracts")
    .update({ joola_sign_token_hash: hashStatusToken(token), updated_at: new Date().toISOString() })
    .eq("application_id", applicationId)
    .eq("status", "pending_joola")
    .select("id");
  if (error || !data || data.length === 0) {
    return { ok: false, error: "신청자 서명이 끝난 계약서만 서명 링크를 만들 수 있습니다." };
  }
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "joola-korea-ops-hub.vercel.app";
  const proto = host.startsWith("localhost") ? "http" : "https";
  revalidatePath(`/partner-applications/${applicationId}`);
  return { ok: true, url: `${proto}://${host}/contract-sign/${token}` };
}

const joolaSignSchema = z.object({
  token: z.string().min(1),
  content_hash: z.string().length(64),
  typed_name: z.string().trim().min(1).max(50),
  signature_png: z.string().startsWith("data:image/png;base64,").max(MAX_SIGNATURE_CHARS),
  seal_png: z
    .string()
    .max(MAX_SIGNATURE_CHARS)
    .refine((v) => v === "" || v.startsWith("data:image/png;base64,"))
    .optional(),
});

function seoulToday(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
}

export async function signContractAsJoola(_prev: SignResult | null, formData: FormData): Promise<SignResult> {
  const parsed = joolaSignSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: "서명(그림 또는 이미지)과 서명자 이름을 입력해 주세요." };
  if (formData.get("agree") !== "on") return { ok: false, error: "계약 내용을 확인하셨다면 동의에 체크해 주세요." };
  if (parsed.data.signature_png.length < MIN_SIGNATURE_CHARS) {
    return { ok: false, error: "서명 칸에 서명을 그리거나 이미지를 올려 주세요." };
  }

  const admin = createAdminClient();
  const { data: contract } = await admin
    .from("partner_contracts")
    .select("id, application_id, status, content, content_hash")
    .eq("joola_sign_token_hash", hashStatusToken(parsed.data.token))
    .maybeSingle();
  if (!contract) return { ok: false, error: "서명 링크가 올바르지 않거나 만료되었습니다." };
  if (contract.status !== "pending_joola") return { ok: false, error: "이미 서명이 끝났거나 서명할 수 없는 계약서입니다." };

  if (hashContract(contract.content as RenderedContract) !== contract.content_hash) {
    return { ok: false, error: "계약서 내용을 확인하지 못했습니다. 담당자에게 문의해 주세요." };
  }
  if (parsed.data.content_hash !== contract.content_hash) {
    return { ok: false, error: "계약서가 변경되었습니다. 페이지를 새로고침한 뒤 내용을 다시 확인해 주세요." };
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await admin
    .from("partner_contracts")
    .update({
      status: "signed",
      joola_signed_at: now,
      joola_signer_name: parsed.data.typed_name,
      joola_signature_png: parsed.data.signature_png,
      joola_seal_png: parsed.data.seal_png ? parsed.data.seal_png : null,
      joola_ip_hash: hashIp(clientIp()),
      joola_user_agent: (headers().get("user-agent") ?? "").slice(0, 300),
      effective_date: seoulToday(),
      updated_at: now,
    })
    .eq("id", contract.id)
    .eq("status", "pending_joola")
    .select("id");
  if (error || !updated || updated.length === 0) {
    return { ok: false, error: "서명을 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  }

  // 계약이 체결되면 신청서로 만들어진 '협의중' 시설을 '활성'으로 바꾼다.
  // 이미 활성·종료 등으로 직원이 바꾼 시설은 건드리지 않는다. 되돌리려면 시설 화면에서 상태를 직접 고친다.
  const { data: linked } = await admin
    .from("partner_applications")
    .select("facility_id")
    .eq("id", contract.application_id)
    .maybeSingle();
  if (linked?.facility_id) {
    await admin
      .from("facilities")
      .update({ partnership_status: "active", updated_at: now })
      .eq("id", linked.facility_id)
      .eq("partnership_status", "in_discussion");
    revalidatePath("/facilities");
    revalidatePath(`/facilities/${linked.facility_id}`);
  }

  revalidatePath(`/partner-applications/${contract.application_id}`);
  revalidatePath(`/contract-sign/${parsed.data.token}`);
  return { ok: true };
}

"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashIp, hashStatusToken } from "@/lib/partner/crypto";
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
    return { ok: false, error: "서명자는 신청서에 적은 대표자 이름과 같아야 합니다." };
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from("partner_contracts")
    .update({
      status: "pending_joola",
      partner_signed_at: now,
      partner_signer_name: parsed.data.typed_name,
      partner_signature_png: parsed.data.signature_png,
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

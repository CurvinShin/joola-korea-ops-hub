import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CONTRACT_TEMPLATE_VERSION,
  contractPlainText,
  renderContract,
  type RenderedContract,
} from "./contract-template";
import type { FacilityTier } from "@/lib/types/database.types";

// SERVER-ONLY. service-role 클라이언트를 쓰므로 클라이언트 컴포넌트에서 가져오지 말 것.

export function hashContract(c: RenderedContract): string {
  return createHash("sha256").update(contractPlainText(c)).digest("hex");
}

export type ContractResult = { ok: true } | { ok: false; error: string };

// 승인된 신청서로 계약서를 만든다. 아직 아무도 서명하지 않았다면 최신 내용(네트 수량 등)으로 다시 만든다.
// 이미 신청자가 서명했다면 내용을 바꾸지 않고 오류를 돌려준다.
export async function upsertContractForApplication(applicationId: string): Promise<ContractResult> {
  const admin = createAdminClient();
  const { data: app } = await admin
    .from("partner_applications")
    .select(
      "id, status, final_tier, courts_count, facility_name, address, business_number, representative_name, pii_purged_at, pronet_purchase_qty, symmetry_purchase_qty, net_inquiry_at",
    )
    .eq("id", applicationId)
    .maybeSingle();
  if (!app || app.status !== "approved" || !app.final_tier || app.pii_purged_at) {
    return { ok: false, error: "승인된 신청서를 찾을 수 없습니다." };
  }
  if (!app.net_inquiry_at) return { ok: false, error: "네트 문의가 먼저 저장되어야 합니다." };
  if (!app.address || !app.business_number || !app.representative_name) {
    return { ok: false, error: "계약서에 필요한 정보(주소·사업자등록번호·대표자)가 비어 있습니다." };
  }

  const { data: existing } = await admin
    .from("partner_contracts")
    .select("id, partner_signed_at")
    .eq("application_id", applicationId)
    .maybeSingle();
  if (existing?.partner_signed_at) {
    return { ok: false, error: "이미 서명된 계약서는 바꿀 수 없습니다." };
  }

  const content = renderContract({
    facilityName: app.facility_name,
    address: app.address,
    businessNumber: app.business_number,
    representativeName: app.representative_name,
    tier: app.final_tier as FacilityTier,
    courts: app.courts_count,
    pronetPurchaseQty: app.pronet_purchase_qty ?? 0,
    symmetryPurchaseQty: app.symmetry_purchase_qty ?? 0,
  });
  const now = new Date().toISOString();
  const row = {
    application_id: applicationId,
    status: "pending_partner",
    template_version: CONTRACT_TEMPLATE_VERSION,
    content,
    content_hash: hashContract(content),
    generated_at: now,
    updated_at: now,
  };
  const { error } = existing
    ? await admin.from("partner_contracts").update(row).eq("id", existing.id)
    : await admin.from("partner_contracts").insert(row);
  if (error) return { ok: false, error: "계약서를 저장하지 못했습니다." };
  return { ok: true };
}

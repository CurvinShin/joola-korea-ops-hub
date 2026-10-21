import { createAdminClient } from "@/lib/supabase/admin";
import { hashStatusToken } from "@/lib/partner/crypto";
import { buildSignedContractPdf, contractPdfResponse, type SignedContractPdfInput } from "@/lib/partner/contract-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// JOOLA 대표 서명 링크(토큰 해시로 비교)에서 내려받는 계약서 PDF. 양쪽 서명이 끝난 계약서만 내려준다.
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const admin = createAdminClient();
  const { data: contract } = await admin
    .from("partner_contracts")
    .select(
      "application_id, status, content, content_hash, template_version, effective_date, partner_signed_at, partner_signer_name, partner_signature_png, partner_seal_png, joola_signed_at, joola_signer_name, joola_signature_png, joola_seal_png",
    )
    .eq("joola_sign_token_hash", hashStatusToken(params.token))
    .maybeSingle();
  if (!contract) return new Response("Not found", { status: 404 });
  if (contract.status !== "signed") return new Response("계약이 아직 체결되지 않았습니다.", { status: 409 });

  const { data: app } = await admin
    .from("partner_applications")
    .select("facility_name")
    .eq("id", contract.application_id)
    .maybeSingle();
  const facilityName = app?.facility_name ?? "partner";

  const bytes = await buildSignedContractPdf({ facilityName, ...contract } as SignedContractPdfInput);
  return contractPdfResponse(bytes, facilityName);
}

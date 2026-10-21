import { createAdminClient } from "@/lib/supabase/admin";
import { hashStatusToken } from "@/lib/partner/crypto";
import { buildSignedContractPdf, contractPdfFileName, type SignedContractPdfInput } from "@/lib/partner/contract-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 신청자 본인용 계약서 PDF. 상태 확인 링크의 토큰(해시로 비교)이 곧 인증이다. 양쪽 서명이 끝난 계약서만 내려준다.
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const admin = createAdminClient();
  const { data: app } = await admin
    .from("partner_applications")
    .select("id, facility_name")
    .eq("status_token_hash", hashStatusToken(params.token))
    .maybeSingle();
  if (!app) return new Response("Not found", { status: 404 });

  const { data: contract } = await admin
    .from("partner_contracts")
    .select(
      "status, content, content_hash, template_version, effective_date, partner_signed_at, partner_signer_name, partner_signature_png, partner_seal_png, joola_signed_at, joola_signer_name, joola_signature_png, joola_seal_png",
    )
    .eq("application_id", app.id)
    .maybeSingle();
  if (!contract || contract.status !== "signed") {
    return new Response("계약이 아직 체결되지 않았습니다.", { status: 409 });
  }

  const bytes = await buildSignedContractPdf({ facilityName: app.facility_name, ...contract } as SignedContractPdfInput);
  const name = contractPdfFileName(app.facility_name);
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${name.ascii}"; filename*=UTF-8''${name.utf8}`,
      "Cache-Control": "private, no-store",
    },
  });
}

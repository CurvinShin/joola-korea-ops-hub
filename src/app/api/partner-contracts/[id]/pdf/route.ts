import { createClient } from "@/lib/supabase/server";
import { buildSignedContractPdf, contractPdfResponse, type SignedContractPdfInput } from "@/lib/partner/contract-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 직원용 계약서 PDF. [id]는 신청서 id. 로그인(미들웨어)과 RLS(관리자만 partner_contracts를 읽을 수 있음)로 접근을 막는다.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: contract } = await supabase
    .from("partner_contracts")
    .select(
      "status, content, content_hash, template_version, effective_date, partner_signed_at, partner_signer_name, partner_signature_png, partner_seal_png, joola_signed_at, joola_signer_name, joola_signature_png, joola_seal_png",
    )
    .eq("application_id", params.id)
    .maybeSingle();
  if (!contract) return new Response("Not found", { status: 404 });
  if (contract.status !== "signed") return new Response("계약이 아직 체결되지 않았습니다.", { status: 409 });

  const { data: app } = await supabase.from("partner_applications").select("facility_name").eq("id", params.id).maybeSingle();
  const facilityName = app?.facility_name ?? "partner";

  const bytes = await buildSignedContractPdf({ facilityName, ...contract } as SignedContractPdfInput);
  return contractPdfResponse(bytes, facilityName);
}

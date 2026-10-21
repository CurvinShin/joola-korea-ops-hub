import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashStatusToken } from "@/lib/partner/crypto";
import { ContractView } from "@/components/partner/ContractView";
import { JoolaContractSign } from "@/components/partner/JoolaContractSign";
import type { PartnerContractRow } from "@/lib/partner/contract-template";

export const dynamic = "force-dynamic";

// JOOLA 대표 전용 계약서 서명 페이지. 로그인 없이 열리며, 링크의 토큰(해시로 비교)이 곧 인증이다.
export default async function ContractSignPage({ params }: { params: { token: string } }) {
  const { data } = await createAdminClient()
    .from("partner_contracts")
    .select("status, content, content_hash, partner_signed_at, partner_signer_name, joola_signed_at")
    .eq("joola_sign_token_hash", hashStatusToken(params.token))
    .maybeSingle();
  if (!data) notFound();
  const contract = data as Pick<
    PartnerContractRow,
    "status" | "content" | "content_hash" | "partner_signed_at" | "partner_signer_name" | "joola_signed_at"
  >;
  const fmt = (iso: string) => new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

  return (
    <main className="mx-auto min-h-screen max-w-xl space-y-6 bg-slate-50 px-4 py-8 sm:px-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">JOOLA KOREA 브랜드 파트너 계약</p>
        <h1 className="text-xl font-semibold text-slate-900">JOOLA 대표 서명</h1>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
        <div className="max-h-[28rem] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-4">
          <ContractView contract={contract.content} />
        </div>
        {contract.partner_signed_at && (
          <p className="text-xs text-slate-500">
            브랜드 파트너 서명: {contract.partner_signer_name} · {fmt(contract.partner_signed_at)}
          </p>
        )}
        {contract.status === "pending_joola" && (
          <JoolaContractSign token={params.token} contentHash={contract.content_hash} />
        )}
        {contract.status === "signed" && (
          <p className="rounded-lg bg-green-50 p-3 text-green-700">
            계약이 체결되었습니다{contract.joola_signed_at ? ` (${fmt(contract.joola_signed_at)})` : ""}.
          </p>
        )}
        {contract.status === "pending_partner" && (
          <p className="rounded-lg bg-slate-50 p-3 text-slate-600">아직 브랜드 파트너의 서명이 끝나지 않았습니다.</p>
        )}
        {contract.status === "void" && <p className="rounded-lg bg-slate-50 p-3 text-slate-600">무효 처리된 계약서입니다.</p>}
      </div>
      <p className="text-center text-[11px] text-slate-400">이 링크는 JOOLA KOREA 대표만 사용하는 주소입니다 · 다른 사람과 공유하지 마세요</p>
    </main>
  );
}

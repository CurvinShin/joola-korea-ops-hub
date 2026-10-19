import { notFound } from "next/navigation";
import { isValidInviteToken } from "@/lib/partner/crypto";
import { PartnerApplyForm } from "@/components/partner/PartnerApplyForm";
import { PartnerBenefitsNotice } from "@/components/partner/PartnerBenefitsNotice";

export const dynamic = "force-dynamic";

// 로그인 없이 여는 브랜드 파트너(시설) 신청 페이지. 접근 제어는 URL의 초대 코드
// (PARTNER_APPLY_INVITE_TOKEN) 하나뿐이다 — 링크가 퍼졌다고 판단되면 환경변수 값을
// 바꾸고 재배포하면 새 링크로 교체된다. 미들웨어는 이 경로를 /login으로 보내지 않게만 한다.
export default function PartnerApplyPage({ params }: { params: { invite: string } }) {
  if (!isValidInviteToken(params.invite)) notFound();

  return (
    <main className="mx-auto min-h-screen max-w-2xl space-y-6 bg-slate-50 px-4 py-8 sm:px-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">JOOLA KOREA</p>
        <h1 className="text-xl font-semibold text-slate-900">브랜드 파트너(시설) 신청</h1>
        <p className="mt-1 text-sm text-slate-500">
          작성하신 내용으로 예상 티어(Pro / Edge / Champion Court)가 자동 계산됩니다. 제출 후 JOOLA KOREA가 내용을
          검증해 승인 여부와 최종 티어를 알려 드립니다.
        </p>
      </div>
      <PartnerBenefitsNotice />
      <PartnerApplyForm invite={params.invite} />
    </main>
  );
}

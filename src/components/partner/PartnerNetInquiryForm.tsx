"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { submitNetInquiry, type NetInquiryResult } from "@/lib/actions/partner-applications";
import { PRONET_PRICE, SYMMETRY_NET_PRICE, netTotal, won } from "@/lib/partner/onboarding";

interface Props {
  token: string;
  additionalNeeded: number;
  initialPronet: number | null;
  initialSymmetry: number | null;
  alreadySubmitted: boolean;
}

// 브랜딩 안내 확인 + 네트 추가 구매 수량. 저장 후에도 같은 화면에서 다시 고칠 수 있다.
export function PartnerNetInquiryForm({ token, additionalNeeded, initialPronet, initialSymmetry, alreadySubmitted }: Props) {
  const [state, formAction] = useFormState<NetInquiryResult | null, FormData>(submitNetInquiry, null);
  const [pronet, setPronet] = useState(String(initialPronet ?? 0));
  const [symmetry, setSymmetry] = useState(String(initialSymmetry ?? 0));
  const total = netTotal(Math.max(0, Number(pronet) || 0), Math.max(0, Number(symmetry) || 0));

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      {additionalNeeded > 0 ? (
        <>
          <p className="text-sm text-slate-600">
            무상 지급분 외에 네트가 더 필요한 코트는 <span className="font-semibold">{additionalNeeded}개</span>입니다.
            프로네트와 시미트리 네트의 합이 {additionalNeeded}개 이하로 수량을 입력해 주세요. 구매하지 않으시면 0으로 두세요.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pronet_qty">프로네트 (개)</Label>
              <Input id="pronet_qty" name="pronet_qty" type="number" min={0} max={additionalNeeded} value={pronet} onChange={(e) => setPronet(e.target.value)} />
              <p className="mt-1 text-xs text-slate-400">개당 {won(PRONET_PRICE)} (부가세 포함)</p>
            </div>
            <div>
              <Label htmlFor="symmetry_qty">시미트리 네트 (개)</Label>
              <Input id="symmetry_qty" name="symmetry_qty" type="number" min={0} max={additionalNeeded} value={symmetry} onChange={(e) => setSymmetry(e.target.value)} />
              <p className="mt-1 text-xs text-slate-400">개당 {won(SYMMETRY_NET_PRICE)} (부가세 포함)</p>
            </div>
          </div>
          <p className="text-sm text-slate-700">예상 금액: <span className="font-semibold">{won(total)}</span> (부가세 포함)</p>
        </>
      ) : (
        <>
          <input type="hidden" name="pronet_qty" value="0" />
          <input type="hidden" name="symmetry_qty" value="0" />
          <p className="text-sm text-slate-600">무상 지급분으로 모든 코트의 네트가 충족되어 추가 구매는 필요하지 않습니다.</p>
        </>
      )}
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input type="checkbox" name="branding_ack" defaultChecked={alreadySubmitted} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
        <span>위 브랜딩 안내를 확인했습니다.</span>
      </label>
      {state && !state.ok && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      {state?.ok && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">저장되었습니다. 담당자가 확인 후 견적서를 안내드립니다.</p>}
      <Button type="submit" className="w-full">
        {alreadySubmitted ? "수정해서 다시 저장" : "확인 내용 저장"}
      </Button>
    </form>
  );
}

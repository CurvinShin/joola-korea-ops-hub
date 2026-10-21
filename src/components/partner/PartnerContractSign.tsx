"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { SignaturePad } from "@/components/partner/SignaturePad";
import { signContractAsPartner, type SignResult } from "@/lib/actions/partner-contracts";

interface Props {
  token: string;
  contentHash: string;
}

// 신청자 전자서명 화면: 대표자 이름 입력 + 서명(직접 그리기 또는 이미지 올리기) + 동의 체크.
export function PartnerContractSign({ token, contentHash }: Props) {
  const [state, formAction] = useFormState<SignResult | null, FormData>(signContractAsPartner, null);
  const [png, setPng] = useState("");

  if (state?.ok) {
    return (
      <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
        서명이 완료되었습니다. JOOLA KOREA 대표 서명이 끝나면 계약이 체결됩니다.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-slate-200 p-4">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="content_hash" value={contentHash} />
      <input type="hidden" name="signature_png" value={png} />
      <h4 className="text-sm font-semibold text-slate-900">전자서명</h4>
      <div>
        <Label htmlFor="typed_name">대표자 이름 (신청서에 적은 이름과 같아야 합니다)</Label>
        <Input id="typed_name" name="typed_name" autoComplete="off" required />
      </div>
      <div>
        <p className="mb-1 text-sm font-medium text-slate-700">서명</p>
        <SignaturePad onChange={setPng} />
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input type="checkbox" name="agree" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
        <span>위 계약서의 모든 내용을 읽고 이해했으며, 이에 동의하여 전자서명합니다.</span>
      </label>
      {state && !state.ok && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={!png}>
        서명하고 제출하기
      </Button>
    </form>
  );
}

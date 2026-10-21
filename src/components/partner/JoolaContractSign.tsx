"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { SignaturePad } from "@/components/partner/SignaturePad";
import { SealUpload } from "@/components/partner/SealUpload";
import { signContractAsJoola, type SignResult } from "@/lib/actions/partner-contracts";

interface Props {
  token: string;
  contentHash: string;
}

// JOOLA 대표 서명 화면: 서명자 이름 + 서명(그리기·이미지) + 직인 이미지 + 확인 체크.
export function JoolaContractSign({ token, contentHash }: Props) {
  const [state, formAction] = useFormState<SignResult | null, FormData>(signContractAsJoola, null);
  const [png, setPng] = useState("");
  const [seal, setSeal] = useState("");

  if (state?.ok) {
    return <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">서명이 완료되어 계약이 체결되었습니다.</p>;
  }

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-slate-200 p-4">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="content_hash" value={contentHash} />
      <input type="hidden" name="signature_png" value={png} />
      <input type="hidden" name="seal_png" value={seal} />
      <h4 className="text-sm font-semibold text-slate-900">JOOLA KOREA 대표 서명</h4>
      <div>
        <Label htmlFor="typed_name">서명자 이름</Label>
        <Input id="typed_name" name="typed_name" autoComplete="off" required />
      </div>
      <div>
        <p className="mb-1 text-sm font-medium text-slate-700">서명</p>
        <SignaturePad onChange={setPng} />
      </div>
      <SealUpload onChange={setSeal} />
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input type="checkbox" name="agree" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
        <span>위 계약서의 내용을 확인했으며, JOOLA KOREA를 대표하여 서명합니다.</span>
      </label>
      {state && !state.ok && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={!png}>
        서명하고 계약 체결하기
      </Button>
    </form>
  );
}

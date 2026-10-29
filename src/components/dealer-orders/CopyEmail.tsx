"use client";

import { useState } from "react";

// 딜러 담당자 이메일 — 클릭하면 클립보드에 복사된다(메일 쓸 때 바로 붙여넣기).
// 이메일은 딜러 수정 화면의 "담당자 이메일"에서 입력한다. 비어 있으면 아무것도 그리지 않는다.
export function CopyEmail({ email }: { email: string | null | undefined }) {
  const [copied, setCopied] = useState(false);
  if (!email) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(email as string);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // clipboard API unavailable — the text is still visible to copy by hand
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="group inline-flex items-center gap-1 rounded text-xs font-normal text-slate-500 hover:text-brand-600"
      title="클릭하면 복사됩니다"
    >
      {email}
      <span className="text-slate-300 group-hover:text-brand-500">{copied ? "✓ 복사됨" : "⧉"}</span>
    </button>
  );
}

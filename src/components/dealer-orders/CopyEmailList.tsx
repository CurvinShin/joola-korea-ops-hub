"use client";

import { useState } from "react";
import { CopyEmail } from "@/components/dealer-orders/CopyEmail";

// 담당자 이메일 + 추가 이메일을 한 묶음으로 보여준다.
// 주소 하나하나는 클릭하면 복사되고, 두 개 이상이면 "전체 복사"로 한 번에 붙여넣을 수 있다
// (받는 사람 칸에 그대로 붙여넣을 수 있도록 쉼표+공백으로 이어서 복사).
// 이메일은 딜러 수정 화면에서 입력한다. 주소가 하나도 없으면 아무것도 그리지 않는다.
export function buildEmailList(primary: string | null | undefined, cc: string[] | null | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of [primary, ...(cc ?? [])]) {
    const email = raw?.trim();
    if (!email) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(email);
  }
  return out;
}

export function CopyEmailList({
  primary,
  cc,
  compact = false,
}: {
  primary: string | null | undefined;
  cc: string[] | null | undefined;
  compact?: boolean;
}) {
  const [copiedAll, setCopiedAll] = useState(false);
  const emails = buildEmailList(primary, cc);
  if (emails.length === 0) return null;

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(emails.join(", "));
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1200);
    } catch {
      // clipboard API unavailable — the addresses are still visible to copy by hand
    }
  }

  const allButton =
    emails.length > 1 ? (
      <button
        type="button"
        onClick={copyAll}
        className="rounded text-xs font-medium text-brand-600 hover:underline"
        title="모든 이메일을 쉼표로 이어서 복사합니다"
      >
        {copiedAll ? "✓ 복사됨" : compact ? `외 ${emails.length - 1}개 · 전체 복사` : `전체 ${emails.length}개 복사`}
      </button>
    ) : null;

  if (compact) {
    return (
      <span className="flex flex-col items-start gap-0.5">
        <CopyEmail email={emails[0]} />
        {allButton}
      </span>
    );
  }

  return (
    <span className="flex flex-col items-end gap-0.5">
      {emails.map((email) => (
        <CopyEmail key={email} email={email} />
      ))}
      {allButton}
    </span>
  );
}

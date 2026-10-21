"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { createJoolaSignLink } from "@/lib/actions/partner-contracts";

// 관리자 전용: JOOLA 대표 서명 링크를 만든다. 링크는 만든 직후 한 번만 보이며(DB에는 해시만 저장),
// 다시 만들면 이전 링크는 쓸 수 없다.
export function JoolaSignLinkButton({ applicationId }: { applicationId: string }) {
  const [pending, start] = useTransition();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function make() {
    setError("");
    setCopied(false);
    start(async () => {
      const r = await createJoolaSignLink(applicationId);
      if (r.ok) setUrl(r.url);
      else setError(r.error);
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="secondary" className="w-full" onClick={make} disabled={pending}>
        {url ? "서명 링크 다시 만들기 (이전 링크는 사용 불가)" : "JOOLA 대표 서명 링크 만들기"}
      </Button>
      {error && <p className="rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</p>}
      {url && (
        <div className="space-y-1 rounded-lg bg-slate-50 p-3">
          <p className="break-all text-xs text-slate-600">{url}</p>
          <Button type="button" variant="secondary" onClick={copy}>
            {copied ? "복사됨" : "링크 복사"}
          </Button>
          <p className="text-[11px] text-slate-400">이 링크는 지금만 볼 수 있습니다. 대표님께만 전달해 주세요.</p>
        </div>
      )}
    </div>
  );
}

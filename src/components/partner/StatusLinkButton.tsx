"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { regenerateStatusLink } from "@/lib/actions/partner-applications";

// 관리자 전용: 링크를 잃어버린 신청자에게 줄 새 상태 확인 링크를 만든다.
// 링크는 만든 직후 한 번만 보이고(DB에는 해시만 저장), 만들면 이전 링크는 더 이상 열리지 않는다.
export function StatusLinkButton({ applicationId, facilityName }: { applicationId: string; facilityName: string }) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<"" | "link" | "message">("");

  const message = url
    ? `안녕하세요, 율라코리아 신종엽 과장입니다.\n${facilityName} 브랜드 파트너 진행 상황(브랜딩 시안, 네트 문의, 계약서)은 아래 링크에서 확인하실 수 있습니다. 이전 링크는 사용하실 수 없으니 이 링크를 이용해 주세요.\n${url}`
    : "";

  function make() {
    setError("");
    setCopied("");
    setConfirming(false);
    start(async () => {
      const r = await regenerateStatusLink(applicationId);
      if (r.ok) setUrl(r.url);
      else setError(r.error);
    });
  }

  async function copy(text: string, which: "link" | "message") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
    } catch {
      setCopied("");
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        신청자가 상태 확인 링크를 잃어버렸을 때 새 링크를 만들어 전달합니다. 보안상 기존 링크는 다시 보여 드릴 수 없고,
        새로 만들면 이전 링크는 열리지 않습니다.
      </p>
      {!confirming && !url && (
        <Button type="button" variant="secondary" className="w-full" onClick={() => setConfirming(true)} disabled={pending}>
          신청자에게 줄 새 링크 만들기
        </Button>
      )}
      {confirming && (
        <div className="space-y-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          <p>새 링크를 만들면 신청자가 가지고 있는 이전 링크는 더 이상 열리지 않습니다. 계속할까요?</p>
          <div className="flex gap-2">
            <Button type="button" onClick={make} disabled={pending}>
              만들기
            </Button>
            <Button type="button" variant="secondary" onClick={() => setConfirming(false)}>
              취소
            </Button>
          </div>
        </div>
      )}
      {error && <p className="rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</p>}
      {url && (
        <div className="space-y-2 rounded-lg bg-slate-50 p-3">
          <p className="break-all text-xs text-slate-600">{url}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => copy(url, "link")}>
              {copied === "link" ? "링크 복사됨" : "링크만 복사"}
            </Button>
            <Button type="button" onClick={() => copy(message, "message")}>
              {copied === "message" ? "메시지 복사됨" : "안내 메시지와 함께 복사"}
            </Button>
          </div>
          <p className="text-[11px] text-slate-400">이 링크는 지금만 볼 수 있습니다. 새로고침하면 사라지니 바로 복사해 전달해 주세요.</p>
        </div>
      )}
    </div>
  );
}

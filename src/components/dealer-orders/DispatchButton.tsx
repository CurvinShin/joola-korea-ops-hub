"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type Info = { fileName: string; batchNo: number; first: string; last: string; lines: number; orders: number; missing: string[] };

/**
 * 선택한 딜러 주문으로 제이디로지스 발주서(엑셀)를 만들어 내려받는다.
 * 번호(YYYYMMDD-01…)와 차수(-2차, -3차)는 서버가 그날의 이전 발주에 이어서 배정한다.
 */
export function DispatchButton({
  orderIds,
  draftCount,
  dispatchedCount,
}: {
  orderIds: string[];
  draftCount: number;
  dispatchedCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function run() {
    if (orderIds.length === 0) return;
    if (dispatchedCount > 0) {
      setMessage({ ok: false, text: `이미 발주한 주문이 ${dispatchedCount}건 포함되어 있습니다. 선택에서 빼주세요.` });
      return;
    }
    const warn = draftCount > 0 ? `\n\n※ 입금 확인 전(임시) 주문이 ${draftCount}건 포함되어 있습니다.` : "";
    if (!confirm(`선택한 ${orderIds.length}건으로 발주서를 만들까요?\n만들면 발주 번호가 배정되고 "발주 완료"로 표시됩니다.${warn}`)) return;

    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/dealer-orders/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds }),
      });
      if (!res.ok) {
        let text = "발주서를 만들지 못했습니다.";
        try {
          const j = (await res.json()) as { error?: string };
          if (j.error) text = j.error;
        } catch {
          /* ignore */
        }
        setMessage({ ok: false, text });
        return;
      }
      const info = JSON.parse(decodeURIComponent(res.headers.get("X-Dispatch-Info") ?? "{}")) as Info;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = info.fileName || "발주서.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      const miss = info.missing?.length ? ` · 수취인/연락처/주소가 비어 있는 딜러: ${info.missing.join(", ")}` : "";
      setMessage({
        ok: true,
        text: `${info.fileName} 저장 (${info.batchNo}차) · ${info.first} ~ ${info.last} · ${info.lines}줄${miss}`,
      });
      router.refresh();
    } catch {
      setMessage({ ok: false, text: "네트워크 오류로 발주서를 만들지 못했습니다. 다시 시도해주세요." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" size="sm" disabled={busy || orderIds.length === 0} onClick={run}>
        {busy ? "만드는 중..." : `발주서 엑셀 만들기${orderIds.length ? ` (${orderIds.length}건)` : ""}`}
      </Button>
      {message && <p className={`max-w-md text-right text-xs ${message.ok ? "text-emerald-600" : "text-red-600"}`}>{message.text}</p>}
    </div>
  );
}

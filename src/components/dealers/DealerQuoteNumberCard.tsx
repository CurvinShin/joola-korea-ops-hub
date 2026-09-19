"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { issueNextQuoteNumber, syncQuoteNumberSeq } from "@/lib/actions/dealer-quote-number";

// 아직 발급되지 않았을 때 화면에 보여줄 "다음 번호" 미리보기 — 실제 발급
// (RPC 호출)과 똑같은 규칙(연도 바뀌면 01로 리셋)을 그대로 따라간다.
function previewNumber(krCode: string, nextSeq: number, lastSeqYear: string | null) {
  const currentYear = String(new Date().getFullYear()).slice(-2);
  const seq = lastSeqYear === currentYear ? nextSeq : 1;
  return `${krCode}-${currentYear}${String(seq).padStart(2, "0")}`;
}

export function DealerQuoteNumberCard({
  dealerId,
  krCode,
  nextSeq,
  lastSeqYear,
}: {
  dealerId: string;
  krCode: string;
  nextSeq: number;
  lastSeqYear: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [issued, setIssued] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  function handleIssue() {
    setMessage(null);
    startTransition(async () => {
      const result = await issueNextQuoteNumber(dealerId);
      if (result.ok) {
        setIssued(result.number);
        router.refresh();
      } else {
        setMessage({ tone: "error", text: result.error });
      }
    });
  }

  async function copyIssued() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable — fail silently
    }
  }

  function handleSync() {
    if (!manualValue.trim()) return;
    setMessage(null);
    startTransition(async () => {
      const result = await syncQuoteNumberSeq(dealerId, krCode, manualValue.trim());
      if (result.ok) {
        setMessage({ tone: "ok", text: result.message });
        setManualValue("");
        router.refresh();
      } else {
        setMessage({ tone: "error", text: result.error });
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>다음 견적서 번호</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-400">
              경리나라 등 사이트 밖에서 견적서를 작성할 때 이 번호를 순서대로 쓰면 됩니다.
            </p>
            <p className="mt-1 font-mono text-lg font-semibold text-slate-900">
              {issued ?? previewNumber(krCode, nextSeq, lastSeqYear)}
              {issued && <span className="ml-2 text-xs font-normal text-emerald-600">발급됨</span>}
            </p>
          </div>
          <div className="flex gap-2">
            {issued && (
              <Button type="button" variant="secondary" size="sm" onClick={copyIssued}>
                {copied ? "✓ 복사됨" : "복사"}
              </Button>
            )}
            <Button type="button" size="sm" onClick={handleIssue} disabled={isPending}>
              {isPending ? "처리 중..." : "발급 (다음 번호 사용 처리)"}
            </Button>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3">
          <p className="mb-1.5 text-xs text-slate-400">
            번호를 직접 매겼거나 건너뛴 경우, 다음 자동 번호가 겹치지 않도록 여기서 맞춰두세요. (예:{" "}
            {previewNumber(krCode, nextSeq, lastSeqYear)})
          </p>
          <div className="flex gap-2">
            <Input
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              placeholder={`${krCode}-2613`}
              className="max-w-[200px]"
            />
            <Button type="button" variant="secondary" size="sm" onClick={handleSync} disabled={isPending}>
              동기화
            </Button>
          </div>
        </div>

        {message && (
          <p className={`text-xs ${message.tone === "error" ? "text-red-600" : "text-emerald-600"}`}>{message.text}</p>
        )}
      </CardContent>
    </Card>
  );
}

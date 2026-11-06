"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { confirmOrderNumber, saveOrderNumber } from "@/lib/actions/dealer-order-number";

/**
 * 주문 번호 확인·수정. 주문이 들어오면 번호가 "임시"로 붙고, 경리나라에서 실제 견적서를 만든 뒤
 * 같은 번호면 [확정], 다르면 [수정]으로 맞춘다. 맞추면 이 딜러의 다음 자동 번호도 같이 맞춰진다.
 */
export function OrderNumberEditor({
  orderId,
  orderNumber,
  confirmed,
}: {
  orderId: string;
  orderNumber: string | null;
  confirmed: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(orderNumber ?? "");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const prefix = orderNumber ? orderNumber.split("-")[0] : "KR00";

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const res = await saveOrderNumber(orderId, value);
      if (res.ok) {
        setEditing(false);
        setMessage({
          tone: "ok",
          text: res.inQuoteHistory
            ? `${res.number}(으)로 확정했습니다. 견적서 이력에 같은 번호가 있습니다.`
            : `${res.number}(으)로 확정했습니다.`,
        });
        router.refresh();
      } else {
        setMessage({ tone: "error", text: res.message });
      }
    });
  }

  function handleConfirm() {
    setMessage(null);
    startTransition(async () => {
      const res = await confirmOrderNumber(orderId);
      if (res.ok) {
        setMessage({ tone: "ok", text: "번호를 확정했습니다." });
        router.refresh();
      } else {
        setMessage({ tone: "error", text: res.message });
      }
    });
  }

  return (
    <div
      className={`mb-4 rounded-lg border p-3 ${
        orderNumber && !confirmed ? "border-amber-200 bg-amber-50" : "border-slate-100 bg-slate-50"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">견적서 번호</span>
          {orderNumber ? (
            <span className="font-mono text-sm font-semibold text-slate-900">{orderNumber}</span>
          ) : (
            <span className="text-sm text-slate-400">없음</span>
          )}
          {orderNumber && <Badge tone={confirmed ? "green" : "amber"}>{confirmed ? "확정" : "임시"}</Badge>}
        </div>
        {!editing && (
          <div className="flex gap-2">
            {orderNumber && !confirmed && (
              <Button type="button" size="sm" disabled={isPending} onClick={handleConfirm}>
                {isPending ? "처리 중..." : "이 번호로 확정"}
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isPending}
              onClick={() => {
                setValue(orderNumber ?? "");
                setMessage(null);
                setEditing(true);
              }}
            >
              번호 수정
            </Button>
          </div>
        )}
      </div>

      {orderNumber && !confirmed && !editing && (
        <p className="mt-1.5 text-xs text-amber-800">
          자동으로 붙은 임시 번호입니다. 경리나라 견적서 번호와 같은지 확인한 뒤 확정하거나, 다르면 수정하세요.
        </p>
      )}

      {editing && (
        <div className="mt-2 space-y-1.5">
          <div className="flex flex-wrap gap-2">
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={`${prefix}-2613`}
              className="max-w-[200px]"
              autoFocus
            />
            <Button type="button" size="sm" disabled={isPending || !value.trim()} onClick={handleSave}>
              {isPending ? "저장 중..." : "저장하고 확정"}
            </Button>
            <Button type="button" variant="secondary" size="sm" disabled={isPending} onClick={() => setEditing(false)}>
              취소
            </Button>
          </div>
          <p className="text-xs text-slate-400">
            경리나라 견적서 번호를 그대로 입력하세요. 저장하면 이 딜러의 다음 자동 번호도 겹치지 않게 맞춰집니다.
          </p>
        </div>
      )}

      {message && (
        <p className={`mt-1.5 text-xs ${message.tone === "error" ? "text-red-600" : "text-emerald-700"}`}>{message.text}</p>
      )}
    </div>
  );
}

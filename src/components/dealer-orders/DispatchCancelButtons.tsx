"use client";

import { useState, useTransition } from "react";
import { cancelDispatchBatch, cancelOrderDispatch, restoreDispatchBatch } from "@/lib/actions/dispatch";

/** 주문 한 건의 "발주 완료" 표시를 지우는 작은 버튼(딜러 주문 목록 안). */
export function OrderDispatchCancel({ orderId }: { orderId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="ml-1">
      <button
        type="button"
        disabled={pending}
        className="text-[10px] font-normal text-red-600 hover:underline disabled:opacity-50"
        onClick={() => {
          if (!confirm("이 주문의 발주 완료 표시를 취소할까요?\n(이미 만든 엑셀 파일과 번호는 기록에 남고, 다시 발주하면 새 번호가 배정됩니다)")) return;
          setError(null);
          start(async () => {
            const r = await cancelOrderDispatch(orderId);
            if (!r.ok) setError(r.message);
          });
        }}
      >
        발주 취소
      </button>
      {error && <span className="ml-1 text-[10px] text-red-600">{error}</span>}
    </span>
  );
}

/** 발주서 기록 한 줄의 "이 발주서 취소/복원" 버튼. */
export function BatchDispatchCancel({ batchId, cancelled }: { batchId: string; cancelled: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        className={`text-xs hover:underline disabled:opacity-50 ${cancelled ? "text-brand-600" : "text-red-600"}`}
        onClick={() => {
          const ask = cancelled
            ? "취소했던 이 발주서를 복원할까요? 포함됐던 주문에 발주 완료 표시가 다시 붙습니다."
            : "이 발주서를 취소할까요?\n포함된 모든 주문의 발주 완료 표시가 지워져 다시 발주할 수 있게 됩니다. (엑셀 파일과 번호 기록은 남습니다)";
          if (!confirm(ask)) return;
          setMsg(null);
          start(async () => {
            const r = cancelled ? await restoreDispatchBatch(batchId) : await cancelDispatchBatch(batchId);
            setMsg({ ok: r.ok, text: r.message });
          });
        }}
      >
        {cancelled ? "복원" : "이 발주서 취소"}
      </button>
      {msg && <span className={`text-xs ${msg.ok ? "text-emerald-600" : "text-red-600"}`}>{msg.text}</span>}
    </span>
  );
}

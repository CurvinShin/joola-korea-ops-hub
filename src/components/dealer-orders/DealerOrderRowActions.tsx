"use client";

import { useState, useTransition } from "react";
import {
  confirmDealerOrderPayment,
  deleteDealerOrder,
  rejectDealerOrder,
  setDealerOrderStatus,
  setDealerOrderSynced,
  updateConfirmedTotalAmount,
} from "@/lib/actions/dealer-order-admin";
import { Select, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { dealerOrderStatusLabel } from "@/lib/utils/labels";

// Status transitions reachable *after* payment has already been confirmed —
// "draft" is deliberately excluded here since going back to draft would
// leave stock already deducted with nothing tracking it; use "취소" instead,
// which knows to restore stock.
const POST_CONFIRM_STATUSES = ["confirmed", "shipped", "delivered"] as const;

export function DealerOrderRowActions({
  orderId,
  status,
  synced,
  autoShippingFee,
  manualShippingFee,
  suggestedTotal,
  confirmedTotalAmount,
}: {
  orderId: string;
  status: string;
  synced: boolean;
  autoShippingFee: number;
  manualShippingFee: number | null;
  suggestedTotal: number;
  confirmedTotalAmount: number | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [shippingInput, setShippingInput] = useState(
    manualShippingFee != null ? String(manualShippingFee) : ""
  );
  // 실제 견적서(배송비 포함) 금액에 맞춰 관리자가 직접 조정할 수 있는 총액.
  // 상품 공급가액 + 자동/추가 배송비로 계산한 값을 기본으로 보여주되,
  // 견적서 금액과 정확히 일치시킬 수 있도록 자유롭게 고칠 수 있게 한다.
  const [totalInput, setTotalInput] = useState(String(suggestedTotal));
  // 입금 확인이 끝난 뒤에도 확정 총액을 다시 고칠 수 있게 하는 별도 입력칸 —
  // 위 totalInput/입금 확인 버튼은 draft에서 딱 한 번 확정할 때만 쓰인다.
  const [confirmedTotalInput, setConfirmedTotalInput] = useState(
    confirmedTotalAmount != null ? String(confirmedTotalAmount) : String(suggestedTotal)
  );
  // 입금 확인/확정총액 저장이 실패했을 때 이유를 보여주기 위한 상태 — 예전엔
  // 서버 액션이 그냥 에러를 throw하기만 하고 화면에서 아무것도 잡지 않아서,
  // 실패해도 버튼을 눌렀는데 아무 반응이 없는 것처럼만 보였다.
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-2">
      {error && <p className="max-w-[220px] text-right text-[11px] font-medium text-red-600">{error}</p>}
      <label className="flex items-center gap-1.5 text-xs text-slate-500">
        <input
          type="checkbox"
          defaultChecked={synced}
          disabled={isPending}
          onChange={(e) => startTransition(() => setDealerOrderSynced(orderId, e.target.checked))}
        />
        경리나라 입력완료
      </label>

      {status === "draft" ? (
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            min={0}
            placeholder="추가 배송비"
            value={shippingInput}
            onChange={(e) => setShippingInput(e.target.value)}
            className="!w-28 py-1 text-xs"
            disabled={isPending}
          />
          <div className="flex flex-col items-start gap-0.5">
            <span className="text-[10px] leading-none text-slate-400">확정총액(배송비포함)</span>
            <Input
              type="number"
              min={0}
              title="견적서(배송비 포함) 금액과 일치시키려면 여기서 직접 고치세요"
              value={totalInput}
              onChange={(e) => setTotalInput(e.target.value)}
              className="!w-32 py-1 text-xs font-medium"
              disabled={isPending}
            />
          </div>
          <Button
            size="sm"
            disabled={isPending || totalInput === ""}
            onClick={() => {
              setError(null);
              const total = Number(totalInput);
              const shipping = shippingInput === "" ? null : Number(shippingInput);
              if (!Number.isFinite(total)) {
                setError("확정총액 숫자를 확인해주세요.");
                return;
              }
              if (shipping != null && !Number.isFinite(shipping)) {
                setError("추가 배송비 숫자를 확인해주세요.");
                return;
              }
              startTransition(async () => {
                const result = await confirmDealerOrderPayment(orderId, shipping, total);
                if (!result.ok) setError(result.message);
              });
            }}
          >
            입금 확인 (재고 차감)
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={isPending}
            onClick={() => startTransition(() => rejectDealerOrder(orderId))}
          >
            거절
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-end gap-1.5">
          {autoShippingFee > 0 || manualShippingFee != null ? (
            <span className="text-[11px] text-slate-400">
              배송비 자동 {autoShippingFee.toLocaleString()}원
              {manualShippingFee != null ? ` + 추가 ${manualShippingFee.toLocaleString()}원` : ""}
            </span>
          ) : null}
          {status !== "cancelled" && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] leading-none text-slate-400">확정총액 수정</span>
              <Input
                type="number"
                min={0}
                value={confirmedTotalInput}
                onChange={(e) => setConfirmedTotalInput(e.target.value)}
                className="!w-32 py-1 text-xs font-medium"
                disabled={isPending}
              />
              <Button
                size="sm"
                variant="secondary"
                disabled={isPending || confirmedTotalInput === ""}
                onClick={() => {
                  setError(null);
                  const total = Number(confirmedTotalInput);
                  if (!Number.isFinite(total)) {
                    setError("금액을 확인해주세요.");
                    return;
                  }
                  startTransition(async () => {
                    const result = await updateConfirmedTotalAmount(orderId, total);
                    if (!result.ok) setError(result.message);
                  });
                }}
              >
                저장
              </Button>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            {status !== "cancelled" ? (
              <Select
                defaultValue={status}
                disabled={isPending}
                className="!w-auto py-1"
                onChange={(e) => startTransition(() => setDealerOrderStatus(orderId, e.target.value))}
              >
                {POST_CONFIRM_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {dealerOrderStatusLabel[value]}
                  </option>
                ))}
              </Select>
            ) : (
              <span className="text-xs text-slate-400">{dealerOrderStatusLabel.cancelled}</span>
            )}
            {status === "cancelled" && (
              <Button
                size="sm"
                variant="danger"
                disabled={isPending}
                onClick={() => {
                  if (confirm("이 취소된 주문을 완전히 삭제할까요? 되돌릴 수 없습니다.")) {
                    startTransition(() => deleteDealerOrder(orderId));
                  }
                }}
              >
                삭제
              </Button>
            )}
            {status !== "cancelled" && (
              <Button
                size="sm"
                variant="danger"
                disabled={isPending}
                onClick={() => startTransition(() => rejectDealerOrder(orderId))}
              >
                취소(재고 복원)
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import {
  confirmDealerOrderPayment,
  rejectDealerOrder,
  setDealerOrderStatus,
  setDealerOrderSynced,
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
}: {
  orderId: string;
  status: string;
  synced: boolean;
  autoShippingFee: number;
  manualShippingFee: number | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [shippingInput, setShippingInput] = useState(
    manualShippingFee != null ? String(manualShippingFee) : ""
  );

  return (
    <div className="flex flex-col items-end gap-2">
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
          <Button
            size="sm"
            disabled={isPending}
            onClick={() =>
              startTransition(() =>
                confirmDealerOrderPayment(orderId, shippingInput === "" ? null : Number(shippingInput))
              )
            }
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
        <div className="flex items-center gap-1.5">
          {autoShippingFee > 0 || manualShippingFee != null ? (
            <span className="text-[11px] text-slate-400">
              배송비 자동 {autoShippingFee.toLocaleString()}원
              {manualShippingFee != null ? ` + 추가 ${manualShippingFee.toLocaleString()}원` : ""}
            </span>
          ) : null}
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
      )}
    </div>
  );
}

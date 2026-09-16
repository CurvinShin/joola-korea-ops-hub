"use client";

import { useTransition } from "react";
import { setDealerOrderStatus, setDealerOrderSynced } from "@/lib/actions/dealer-order-admin";
import { Select } from "@/components/ui/Input";
import { dealerOrderStatusLabel } from "@/lib/utils/labels";

export function DealerOrderRowActions({
  orderId,
  status,
  synced,
}: {
  orderId: string;
  status: string;
  synced: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-end gap-3">
      <label className="flex items-center gap-1.5 text-xs text-slate-500">
        <input
          type="checkbox"
          defaultChecked={synced}
          disabled={isPending}
          onChange={(e) => startTransition(() => setDealerOrderSynced(orderId, e.target.checked))}
        />
        경리나라 입력완료
      </label>
      <Select
        defaultValue={status}
        disabled={isPending}
        className="!w-auto py-1"
        onChange={(e) => startTransition(() => setDealerOrderStatus(orderId, e.target.value))}
      >
        {Object.entries(dealerOrderStatusLabel).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
    </div>
  );
}

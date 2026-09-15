import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { shippingStatusLabel, customsStatusLabel } from "@/lib/utils/labels";
import type { PurchaseOrder } from "@/lib/types/database.types";

export function PurchaseOrderForm({
  action,
  defaultValues,
}: {
  action: (formData: FormData) => void;
  defaultValues?: Partial<PurchaseOrder>;
}) {
  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="po_number">발주번호 (PO)</Label>
          <Input id="po_number" name="po_number" required defaultValue={defaultValues?.po_number} />
        </div>
        <div>
          <Label htmlFor="supplier">공급업체</Label>
          <Input id="supplier" name="supplier" required defaultValue={defaultValues?.supplier} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="order_date">발주일</Label>
          <Input id="order_date" name="order_date" type="date" required defaultValue={defaultValues?.order_date} />
        </div>
        <div>
          <Label htmlFor="eta">입고 예정일</Label>
          <Input id="eta" name="eta" type="date" defaultValue={defaultValues?.eta ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="shipping_status">배송 상태</Label>
          <Select id="shipping_status" name="shipping_status" defaultValue={defaultValues?.shipping_status ?? "not_shipped"}>
            {Object.entries(shippingStatusLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="customs_status">통관 상태</Label>
          <Select id="customs_status" name="customs_status" defaultValue={defaultValues?.customs_status ?? "not_started"}>
            {Object.entries(customsStatusLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="total_cost">총 비용 (원)</Label>
        <Input id="total_cost" name="total_cost" type="number" defaultValue={defaultValues?.total_cost ?? 0} />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="received" defaultChecked={defaultValues?.received} />
        입고 완료
      </label>

      <div>
        <Label htmlFor="notes">메모</Label>
        <Textarea id="notes" name="notes" rows={2} defaultValue={defaultValues?.notes ?? ""} />
      </div>

      <Button type="submit" className="w-full">
        발주 저장
      </Button>
    </form>
  );
}

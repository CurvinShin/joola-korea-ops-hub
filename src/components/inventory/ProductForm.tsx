import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import type { InventoryStatusRow } from "@/lib/types/database.types";

export function ProductForm({
  action,
  defaultValues,
}: {
  action: (formData: FormData) => void;
  defaultValues?: Partial<InventoryStatusRow>;
}) {
  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="sku">상품코드 (SKU)</Label>
          <Input id="sku" name="sku" required defaultValue={defaultValues?.sku} />
        </div>
        <div>
          <Label htmlFor="name">제품명</Label>
          <Input id="name" name="name" required defaultValue={defaultValues?.name} />
        </div>
      </div>

      <div>
        <Label htmlFor="category">카테고리</Label>
        <Input id="category" name="category" defaultValue={defaultValues?.category ?? ""} />
      </div>

      <div>
        <Label htmlFor="image_url">제품 사진 URL</Label>
        <Input
          id="image_url"
          name="image_url"
          type="url"
          placeholder="https://joola.com/... 에서 사진 주소를 복사해 붙여넣으세요"
          defaultValue={defaultValues?.image_url ?? ""}
        />
        <p className="mt-1 text-xs text-slate-400">비워두면 딜러 주문 페이지에 &ldquo;사진 없음&rdquo;으로 표시됩니다.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="current_stock">현재 재고</Label>
          <Input id="current_stock" name="current_stock" type="number" defaultValue={defaultValues?.current_stock ?? 0} />
        </div>
        <div>
          <Label htmlFor="reserved_stock">예약 재고</Label>
          <Input id="reserved_stock" name="reserved_stock" type="number" defaultValue={defaultValues?.reserved_stock ?? 0} />
        </div>
        <div>
          <Label htmlFor="low_stock_threshold">재고 부족 기준</Label>
          <Input
            id="low_stock_threshold"
            name="low_stock_threshold"
            type="number"
            defaultValue={defaultValues?.low_stock_threshold ?? 10}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="incoming_qty">입고 예정 수량</Label>
          <Input id="incoming_qty" name="incoming_qty" type="number" defaultValue={defaultValues?.incoming_qty ?? 0} />
        </div>
        <div>
          <Label htmlFor="eta">입고 예정일</Label>
          <Input id="eta" name="eta" type="date" defaultValue={defaultValues?.eta ?? ""} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="discontinued" defaultChecked={defaultValues?.discontinued} />
        단종
      </label>

      <Button type="submit" className="w-full">
        제품 저장
      </Button>
    </form>
  );
}

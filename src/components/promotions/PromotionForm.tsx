import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import type { ProductPromotion } from "@/lib/types/database.types";

export function PromotionForm({
  action,
  defaultValues,
}: {
  action: (formData: FormData) => void;
  defaultValues?: Partial<ProductPromotion> & { skuList?: string };
}) {
  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="name">프로모션 이름</Label>
        <Input id="name" name="name" required defaultValue={defaultValues?.name} placeholder="예: 2026 블랙프라이데이 — PRO V" />
      </div>

      <div>
        <Label htmlFor="promo_group">그룹 코드</Label>
        <Input
          id="promo_group"
          name="promo_group"
          required
          defaultValue={defaultValues?.promo_group}
          placeholder="예: bf2026_pro_v"
        />
        <p className="mt-1 text-xs text-slate-400">
          딜러별 구매 수량 한도는 같은 그룹 코드를 쓰는 상품끼리 합산됩니다 (예: PRO V 전체 쉐입 합쳐서 10개).
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="promo_price">프로모션 소비자가 (원)</Label>
          <Input
            id="promo_price"
            name="promo_price"
            type="number"
            required
            defaultValue={defaultValues?.promo_price}
          />
        </div>
        <div>
          <Label htmlFor="discount_rate_percent">딜러 공급율 할인 (%)</Label>
          <Input
            id="discount_rate_percent"
            name="discount_rate_percent"
            type="number"
            step="0.01"
            required
            defaultValue={defaultValues?.discount_rate_percent}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="max_qty_per_dealer">딜러당 최대 구매 수량 (비워두면 제한 없음)</Label>
        <Input
          id="max_qty_per_dealer"
          name="max_qty_per_dealer"
          type="number"
          min={1}
          defaultValue={defaultValues?.max_qty_per_dealer ?? ""}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="starts_on">시작일</Label>
          <Input id="starts_on" name="starts_on" type="date" required defaultValue={defaultValues?.starts_on} />
        </div>
        <div>
          <Label htmlFor="ends_on">종료일</Label>
          <Input id="ends_on" name="ends_on" type="date" required defaultValue={defaultValues?.ends_on} />
        </div>
      </div>

      <div>
        <Label htmlFor="sku_list">적용 상품 SKU (쉼표, 줄바꿈으로 구분)</Label>
        <Textarea
          id="sku_list"
          name="sku_list"
          rows={5}
          defaultValue={defaultValues?.skuList ?? ""}
          placeholder={"600589, 600592\n600595\n..."}
        />
        <p className="mt-1 text-xs text-slate-400">
          저장 시 이 목록으로 적용 상품이 통째로 교체됩니다. 존재하지 않는 SKU가 있으면 저장이 거부됩니다.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="active" defaultChecked={defaultValues?.active ?? true} />
        활성화 (끄면 딜러 화면에 즉시 적용 중단)
      </label>

      <Button type="submit" className="w-full">
        프로모션 저장
      </Button>
    </form>
  );
}

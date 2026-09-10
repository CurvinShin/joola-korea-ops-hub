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
          <Label htmlFor="sku">SKU</Label>
          <Input id="sku" name="sku" required defaultValue={defaultValues?.sku} />
        </div>
        <div>
          <Label htmlFor="name">Product name</Label>
          <Input id="name" name="name" required defaultValue={defaultValues?.name} />
        </div>
      </div>

      <div>
        <Label htmlFor="category">Category</Label>
        <Input id="category" name="category" defaultValue={defaultValues?.category ?? ""} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="current_stock">Current stock</Label>
          <Input id="current_stock" name="current_stock" type="number" defaultValue={defaultValues?.current_stock ?? 0} />
        </div>
        <div>
          <Label htmlFor="reserved_stock">Reserved</Label>
          <Input id="reserved_stock" name="reserved_stock" type="number" defaultValue={defaultValues?.reserved_stock ?? 0} />
        </div>
        <div>
          <Label htmlFor="low_stock_threshold">Low-stock threshold</Label>
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
          <Label htmlFor="incoming_qty">Incoming quantity</Label>
          <Input id="incoming_qty" name="incoming_qty" type="number" defaultValue={defaultValues?.incoming_qty ?? 0} />
        </div>
        <div>
          <Label htmlFor="eta">Estimated arrival</Label>
          <Input id="eta" name="eta" type="date" defaultValue={defaultValues?.eta ?? ""} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="discontinued" defaultChecked={defaultValues?.discontinued} />
        Discontinued
      </label>

      <Button type="submit" className="w-full">
        Save product
      </Button>
    </form>
  );
}

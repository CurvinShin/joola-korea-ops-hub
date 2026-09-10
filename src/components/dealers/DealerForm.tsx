import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import type { Dealer } from "@/lib/types/database.types";

export function DealerForm({
  action,
  defaultValues,
}: {
  action: (formData: FormData) => void;
  defaultValues?: Partial<Dealer>;
}) {
  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="name">Dealer name</Label>
        <Input id="name" name="name" required defaultValue={defaultValues?.name} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="classification">Classification</Label>
          <Select id="classification" name="classification" defaultValue={defaultValues?.classification ?? "standard"}>
            <option value="flagship">Flagship</option>
            <option value="standard">Standard</option>
            <option value="online_only">Online only</option>
            <option value="distributor">Distributor</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" defaultValue={defaultValues?.status ?? "pending"}>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
            <option value="terminated">Terminated</option>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="contact_name">Contact name</Label>
          <Input id="contact_name" name="contact_name" defaultValue={defaultValues?.contact_name ?? ""} />
        </div>
        <div>
          <Label htmlFor="contact_email">Contact email</Label>
          <Input id="contact_email" name="contact_email" type="email" defaultValue={defaultValues?.contact_email ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="contact_phone">Contact phone</Label>
          <Input id="contact_phone" name="contact_phone" defaultValue={defaultValues?.contact_phone ?? ""} />
        </div>
        <div>
          <Label htmlFor="region">Region</Label>
          <Input id="region" name="region" defaultValue={defaultValues?.region ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="contract_start">Contract start</Label>
          <Input id="contract_start" name="contract_start" type="date" defaultValue={defaultValues?.contract_start ?? ""} />
        </div>
        <div>
          <Label htmlFor="contract_end">Contract end</Label>
          <Input id="contract_end" name="contract_end" type="date" defaultValue={defaultValues?.contract_end ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="discount_rate">Discount rate (%)</Label>
          <Input
            id="discount_rate"
            name="discount_rate"
            type="number"
            step="0.01"
            defaultValue={defaultValues?.discount_rate ?? 0}
          />
        </div>
        <div>
          <Label htmlFor="moq_target">Annual MOQ target (KRW)</Label>
          <Input id="moq_target" name="moq_target" type="number" defaultValue={defaultValues?.moq_target ?? 0} />
        </div>
      </div>

      <div>
        <Label htmlFor="outstanding_issues">Outstanding issues</Label>
        <Textarea id="outstanding_issues" name="outstanding_issues" rows={2} defaultValue={defaultValues?.outstanding_issues ?? ""} />
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} defaultValue={defaultValues?.notes ?? ""} />
      </div>

      <Button type="submit" className="w-full">
        Save dealer
      </Button>
    </form>
  );
}

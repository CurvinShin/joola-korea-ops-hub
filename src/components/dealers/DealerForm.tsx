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
        <Label htmlFor="name">딜러명</Label>
        <Input id="name" name="name" required defaultValue={defaultValues?.name} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="classification">분류</Label>
          <Select id="classification" name="classification" defaultValue={defaultValues?.classification ?? "standard"}>
            <option value="flagship">플래그십</option>
            <option value="standard">일반</option>
            <option value="online_only">온라인 전용</option>
            <option value="distributor">총판</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="status">상태</Label>
          <Select id="status" name="status" defaultValue={defaultValues?.status ?? "pending"}>
            <option value="active">활성</option>
            <option value="pending">대기</option>
            <option value="inactive">비활성</option>
            <option value="terminated">계약 종료</option>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="contact_name">담당자 이름</Label>
          <Input id="contact_name" name="contact_name" defaultValue={defaultValues?.contact_name ?? ""} />
        </div>
        <div>
          <Label htmlFor="contact_email">담당자 이메일</Label>
          <Input id="contact_email" name="contact_email" type="email" defaultValue={defaultValues?.contact_email ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="contact_phone">담당자 전화번호</Label>
          <Input id="contact_phone" name="contact_phone" defaultValue={defaultValues?.contact_phone ?? ""} />
        </div>
        <div>
          <Label htmlFor="region">지역</Label>
          <Input id="region" name="region" defaultValue={defaultValues?.region ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="contract_start">계약 시작일</Label>
          <Input id="contract_start" name="contract_start" type="date" defaultValue={defaultValues?.contract_start ?? ""} />
        </div>
        <div>
          <Label htmlFor="contract_end">계약 종료일</Label>
          <Input id="contract_end" name="contract_end" type="date" defaultValue={defaultValues?.contract_end ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="discount_rate">할인율 (%)</Label>
          <Input
            id="discount_rate"
            name="discount_rate"
            type="number"
            step="0.01"
            defaultValue={defaultValues?.discount_rate ?? 0}
          />
        </div>
        <div>
          <Label htmlFor="moq_target">연간 MOQ 목표 (원)</Label>
          <Input id="moq_target" name="moq_target" type="number" defaultValue={defaultValues?.moq_target ?? 0} />
        </div>
      </div>

      <div>
        <Label htmlFor="outstanding_issues">미해결 이슈</Label>
        <Textarea id="outstanding_issues" name="outstanding_issues" rows={2} defaultValue={defaultValues?.outstanding_issues ?? ""} />
      </div>

      <div>
        <Label htmlFor="notes">메모</Label>
        <Textarea id="notes" name="notes" rows={2} defaultValue={defaultValues?.notes ?? ""} />
      </div>

      <Button type="submit" className="w-full">
        딜러 저장
      </Button>
    </form>
  );
}

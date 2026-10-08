import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import type { RefundClaimRow } from "@/lib/types/database.types";

export const CLAIM_KIND_LABELS: Record<string, string> = {
  refund: "환불",
  exchange: "교환",
  claim: "클레임",
};
export const CLAIM_CHANNEL_LABELS: Record<string, string> = {
  dealer: "딜러",
  smartstore: "스마트스토어",
  direct: "직접 판매",
  other: "기타",
};
export const CLAIM_STATUS_LABELS: Record<string, string> = {
  open: "진행 중",
  waiting: "응답 대기",
  done: "완료",
};

export function ClaimForm({
  action,
  defaultValues,
}: {
  action: (formData: FormData) => void;
  defaultValues?: Partial<RefundClaimRow>;
}) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="opened_on">접수일</Label>
          <Input id="opened_on" name="opened_on" type="date" required defaultValue={defaultValues?.opened_on ?? today} />
        </div>
        <div>
          <Label htmlFor="kind">종류</Label>
          <Select id="kind" name="kind" defaultValue={defaultValues?.kind ?? "refund"}>
            {Object.entries(CLAIM_KIND_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="channel">채널</Label>
          <Select id="channel" name="channel" defaultValue={defaultValues?.channel ?? "dealer"}>
            {Object.entries(CLAIM_CHANNEL_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="counterparty">거래처 / 고객 (딜러 코드나 상호 — 연락처는 적지 않기)</Label>
        <Input id="counterparty" name="counterparty" required defaultValue={defaultValues?.counterparty} />
      </div>

      <div>
        <Label htmlFor="product_summary">제품·사유</Label>
        <Textarea id="product_summary" name="product_summary" rows={2} defaultValue={defaultValues?.product_summary ?? ""} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="amount_krw">금액 (원)</Label>
          <Input id="amount_krw" name="amount_krw" type="number" min={0} defaultValue={defaultValues?.amount_krw ?? 0} />
        </div>
        <div>
          <Label htmlFor="status">상태</Label>
          <Select id="status" name="status" defaultValue={defaultValues?.status ?? "open"}>
            {Object.entries(CLAIM_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="next_action">다음 할 일 / 기다리는 것</Label>
        <Input id="next_action" name="next_action" defaultValue={defaultValues?.next_action ?? ""} placeholder="예: 경리나라 회신 대기" />
      </div>

      <div>
        <Label htmlFor="notes">메모</Label>
        <Textarea id="notes" name="notes" rows={2} defaultValue={defaultValues?.notes ?? ""} />
      </div>

      <Button type="submit" className="w-full">
        저장
      </Button>
    </form>
  );
}

import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import type { SupportShipmentRow } from "@/lib/types/database.types";

export const SUPPORT_CATEGORY_LABELS: Record<string, string> = {
  partnership: "브랜드 파트너십",
  event_support: "대회·행사 지원",
  influencer: "인플루언서",
  athlete: "선수·앰버서더",
  other: "기타",
};

export function SupportForm({
  action,
  defaultValues,
  events,
}: {
  action: (formData: FormData) => void;
  defaultValues?: Partial<SupportShipmentRow>;
  events: { id: string; name: string; event_date: string }[];
}) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="shipped_on">날짜</Label>
          <Input id="shipped_on" name="shipped_on" type="date" required defaultValue={defaultValues?.shipped_on ?? today} />
        </div>
        <div>
          <Label htmlFor="category">구분</Label>
          <Select id="category" name="category" defaultValue={defaultValues?.category ?? "partnership"}>
            {Object.entries(SUPPORT_CATEGORY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="recipient_name">받는 곳 (이름/단체명만 — 연락처·주소는 적지 않기)</Label>
        <Input id="recipient_name" name="recipient_name" required defaultValue={defaultValues?.recipient_name} />
      </div>

      <div>
        <Label htmlFor="items">품목·수량</Label>
        <Textarea id="items" name="items" rows={2} required defaultValue={defaultValues?.items} placeholder="예: 공 100개, 패들커버 3개" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="value_krw">금액 (원, 원가 또는 판매가 기준)</Label>
          <Input id="value_krw" name="value_krw" type="number" min={0} defaultValue={defaultValues?.value_krw ?? 0} />
        </div>
        <div>
          <Label htmlFor="status">상태</Label>
          <Select id="status" name="status" defaultValue={defaultValues?.status ?? "pending"}>
            <option value="pending">준비 중</option>
            <option value="shipped">출고 완료</option>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="event_id">연결 행사 (선택)</Label>
        <Select id="event_id" name="event_id" defaultValue={defaultValues?.event_id ?? ""}>
          <option value="">— 없음 —</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.event_date} · {e.name}
            </option>
          ))}
        </Select>
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

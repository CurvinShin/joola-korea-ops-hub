import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import type { EventRow } from "@/lib/types/database.types";

export function EventForm({
  action,
  defaultValues,
}: {
  action: (formData: FormData) => void;
  defaultValues?: Partial<EventRow>;
}) {
  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="name">이벤트명</Label>
          <Input id="name" name="name" required defaultValue={defaultValues?.name} />
        </div>
        <div>
          <Label htmlFor="event_date">날짜</Label>
          <Input id="event_date" name="event_date" type="date" required defaultValue={defaultValues?.event_date} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="location">장소</Label>
          <Input id="location" name="location" defaultValue={defaultValues?.location ?? ""} />
        </div>
        <div>
          <Label htmlFor="organizer">주최자</Label>
          <Input id="organizer" name="organizer" defaultValue={defaultValues?.organizer ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="budget">예산 (원)</Label>
          <Input id="budget" name="budget" type="number" defaultValue={defaultValues?.budget ?? 0} />
        </div>
        <div>
          <Label htmlFor="expected_participants">예상 참가 인원</Label>
          <Input
            id="expected_participants"
            name="expected_participants"
            type="number"
            defaultValue={defaultValues?.expected_participants ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="actual_participants">실제 참가 인원</Label>
          <Input
            id="actual_participants"
            name="actual_participants"
            type="number"
            defaultValue={defaultValues?.actual_participants ?? ""}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="onsite_sales">현장 매출 (원)</Label>
        <Input id="onsite_sales" name="onsite_sales" type="number" defaultValue={defaultValues?.onsite_sales ?? 0} />
      </div>

      <div>
        <Label htmlFor="sponsorship_details">스폰서십 / 제품 협찬 내역</Label>
        <Textarea id="sponsorship_details" name="sponsorship_details" rows={2} defaultValue={defaultValues?.sponsorship_details ?? ""} />
      </div>

      <div>
        <Label htmlFor="notes">메모</Label>
        <Textarea id="notes" name="notes" rows={2} defaultValue={defaultValues?.notes ?? ""} />
      </div>

      <div>
        <Label htmlFor="post_event_report">행사 후 리포트</Label>
        <Textarea id="post_event_report" name="post_event_report" rows={3} defaultValue={defaultValues?.post_event_report ?? ""} />
      </div>

      <Button type="submit" className="w-full">
        이벤트 저장
      </Button>
    </form>
  );
}

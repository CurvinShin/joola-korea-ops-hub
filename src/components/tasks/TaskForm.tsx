import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import type { Task } from "@/lib/types/database.types";
import { taskCategoryLabel } from "@/lib/utils/labels";

export function TaskForm({
  action,
  defaultValues,
  dealerOptions,
  eventOptions,
}: {
  action: (formData: FormData) => void;
  defaultValues?: Partial<Task>;
  dealerOptions: { id: string; name: string }[];
  eventOptions: { id: string; name: string }[];
}) {
  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="title">작업명</Label>
        <Input id="title" name="title" required defaultValue={defaultValues?.title} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="category">분류</Label>
          <Select id="category" name="category" defaultValue={defaultValues?.category ?? "general"}>
            {["general", "dealer", "inventory", "sales", "purchase_order", "event", "facility", "ambassador", "marketing"].map(
              (c) => (
                <option key={c} value={c}>
                  {taskCategoryLabel[c] ?? c}
                </option>
              )
            )}
          </Select>
        </div>
        <div>
          <Label htmlFor="priority">우선순위</Label>
          <Select id="priority" name="priority" defaultValue={defaultValues?.priority ?? "medium"}>
            <option value="low">낮음</option>
            <option value="medium">보통</option>
            <option value="high">높음</option>
            <option value="urgent">긴급</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="status">상태</Label>
          <Select id="status" name="status" defaultValue={defaultValues?.status ?? "open"}>
            <option value="open">오픈</option>
            <option value="in_progress">진행중</option>
            <option value="blocked">보류</option>
            <option value="done">완료</option>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="due_date">마감일</Label>
        <Input id="due_date" name="due_date" type="date" defaultValue={defaultValues?.due_date ?? ""} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="related_dealer_id">관련 딜러</Label>
          <Select id="related_dealer_id" name="related_dealer_id" defaultValue={defaultValues?.related_dealer_id ?? ""}>
            <option value="">없음</option>
            {dealerOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="related_event_id">관련 이벤트</Label>
          <Select id="related_event_id" name="related_event_id" defaultValue={defaultValues?.related_event_id ?? ""}>
            <option value="">없음</option>
            {eventOptions.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="notes">메모</Label>
        <Textarea id="notes" name="notes" rows={2} defaultValue={defaultValues?.notes ?? ""} />
      </div>

      <Button type="submit" className="w-full">
        작업 저장
      </Button>
    </form>
  );
}

import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import type { Task } from "@/lib/types/database.types";

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
        <Label htmlFor="title">Task</Label>
        <Input id="title" name="title" required defaultValue={defaultValues?.title} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="category">Category</Label>
          <Select id="category" name="category" defaultValue={defaultValues?.category ?? "general"}>
            {["general", "dealer", "inventory", "sales", "purchase_order", "event", "facility", "ambassador", "marketing"].map(
              (c) => (
                <option key={c} value={c}>
                  {c.replace("_", " ")}
                </option>
              )
            )}
          </Select>
        </div>
        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select id="priority" name="priority" defaultValue={defaultValues?.priority ?? "medium"}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" defaultValue={defaultValues?.status ?? "open"}>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="blocked">Blocked</option>
            <option value="done">Done</option>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="due_date">Due date</Label>
        <Input id="due_date" name="due_date" type="date" defaultValue={defaultValues?.due_date ?? ""} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="related_dealer_id">Related dealer</Label>
          <Select id="related_dealer_id" name="related_dealer_id" defaultValue={defaultValues?.related_dealer_id ?? ""}>
            <option value="">None</option>
            {dealerOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="related_event_id">Related event</Label>
          <Select id="related_event_id" name="related_event_id" defaultValue={defaultValues?.related_event_id ?? ""}>
            <option value="">None</option>
            {eventOptions.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} defaultValue={defaultValues?.notes ?? ""} />
      </div>

      <Button type="submit" className="w-full">
        Save task
      </Button>
    </form>
  );
}

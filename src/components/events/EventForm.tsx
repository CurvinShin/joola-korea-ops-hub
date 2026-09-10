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
          <Label htmlFor="name">Event name</Label>
          <Input id="name" name="name" required defaultValue={defaultValues?.name} />
        </div>
        <div>
          <Label htmlFor="event_date">Date</Label>
          <Input id="event_date" name="event_date" type="date" required defaultValue={defaultValues?.event_date} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="location">Location</Label>
          <Input id="location" name="location" defaultValue={defaultValues?.location ?? ""} />
        </div>
        <div>
          <Label htmlFor="organizer">Organizer</Label>
          <Input id="organizer" name="organizer" defaultValue={defaultValues?.organizer ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="budget">Budget (KRW)</Label>
          <Input id="budget" name="budget" type="number" defaultValue={defaultValues?.budget ?? 0} />
        </div>
        <div>
          <Label htmlFor="expected_participants">Expected participants</Label>
          <Input
            id="expected_participants"
            name="expected_participants"
            type="number"
            defaultValue={defaultValues?.expected_participants ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="actual_participants">Actual participants</Label>
          <Input
            id="actual_participants"
            name="actual_participants"
            type="number"
            defaultValue={defaultValues?.actual_participants ?? ""}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="onsite_sales">On-site sales (KRW)</Label>
        <Input id="onsite_sales" name="onsite_sales" type="number" defaultValue={defaultValues?.onsite_sales ?? 0} />
      </div>

      <div>
        <Label htmlFor="sponsorship_details">Sponsorship / product sponsorship details</Label>
        <Textarea id="sponsorship_details" name="sponsorship_details" rows={2} defaultValue={defaultValues?.sponsorship_details ?? ""} />
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} defaultValue={defaultValues?.notes ?? ""} />
      </div>

      <div>
        <Label htmlFor="post_event_report">Post-event report</Label>
        <Textarea id="post_event_report" name="post_event_report" rows={3} defaultValue={defaultValues?.post_event_report ?? ""} />
      </div>

      <Button type="submit" className="w-full">
        Save event
      </Button>
    </form>
  );
}

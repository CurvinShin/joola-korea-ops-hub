import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";

type EventResultDefaults = {
  actual_participants?: number | null;
  onsite_sales?: number | null;
  actual_cost?: number | null;
  post_event_report?: string | null;
  result_links?: string | null;
};

/** 행사가 끝난 뒤 결과만 간단히 적는 폼(행사 정보 전체 수정 폼과 별개). */
export function EventResultForm({
  action,
  defaultValues,
  budget,
}: {
  action: (formData: FormData) => void;
  defaultValues?: EventResultDefaults;
  budget?: number | null;
}) {
  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="actual_participants">실제 참가 인원</Label>
          <Input id="actual_participants" name="actual_participants" type="number" min={0} defaultValue={defaultValues?.actual_participants ?? ""} />
        </div>
        <div>
          <Label htmlFor="onsite_sales">현장 매출 (원)</Label>
          <Input id="onsite_sales" name="onsite_sales" type="number" min={0} defaultValue={defaultValues?.onsite_sales ?? 0} />
        </div>
        <div>
          <Label htmlFor="actual_cost">실제 지출 (원)</Label>
          <Input id="actual_cost" name="actual_cost" type="number" min={0} defaultValue={defaultValues?.actual_cost ?? ""} />
        </div>
      </div>
      {budget ? <p className="text-xs text-slate-400">예산: {new Intl.NumberFormat("ko-KR").format(budget)}원</p> : null}
      <div>
        <Label htmlFor="post_event_report">행사 결과 · 성과 · 느낀 점</Label>
        <Textarea
          id="post_event_report"
          name="post_event_report"
          rows={6}
          placeholder="잘된 점, 아쉬운 점, 다음에 바꿀 점, 현장 반응 등을 자유롭게 적어주세요."
          defaultValue={defaultValues?.post_event_report ?? ""}
        />
      </div>
      <div>
        <Label htmlFor="result_links">사진·자료 링크 (한 줄에 하나)</Label>
        <Textarea id="result_links" name="result_links" rows={3} placeholder="https://..." defaultValue={defaultValues?.result_links ?? ""} />
      </div>
      <Button type="submit" className="w-full">
        결과 저장
      </Button>
    </form>
  );
}

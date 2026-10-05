import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import type { SiteNotice } from "@/lib/types/database.types";

export function NoticeForm({
  action,
  defaultValues,
  dealers,
  defaultDealerIds,
}: {
  action: (formData: FormData) => void;
  defaultValues?: Partial<SiteNotice>;
  dealers: { id: string; name: string }[];
  defaultDealerIds?: string[];
}) {
  const selectedIds = new Set(defaultDealerIds ?? []);

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="title">제목</Label>
        <Input id="title" name="title" required defaultValue={defaultValues?.title} />
      </div>

      <div>
        <Label htmlFor="body">내용</Label>
        <Textarea id="body" name="body" rows={6} required defaultValue={defaultValues?.body} />
        <p className="mt-1 text-xs text-slate-400">
          줄바꿈은 그대로 표시되지만 **굵게** 같은 마크다운 기호는 글자 그대로 보입니다.
        </p>
      </div>

      <div>
        <Label>공개 대상</Label>
        <div className="flex gap-4 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="target_mode"
              value="all"
              defaultChecked={(defaultValues?.target_mode ?? "all") === "all"}
            />
            전체 딜러
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="target_mode"
              value="specific"
              defaultChecked={defaultValues?.target_mode === "specific"}
            />
            특정 딜러만
          </label>
        </div>
      </div>

      <div>
        <Label>대상 딜러 선택 (공개 대상이 &ldquo;특정 딜러만&rdquo;일 때만 사용됩니다)</Label>
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-3">
          {dealers.length === 0 && <p className="text-sm text-slate-400">등록된 딜러가 없습니다.</p>}
          {dealers.map((d) => (
            <label key={d.id} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="dealer_ids" value={d.id} defaultChecked={selectedIds.has(d.id)} />
              {d.name}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="publish_on">게시일</Label>
          <Input id="publish_on" name="publish_on" type="date" required defaultValue={defaultValues?.publish_on} />
        </div>
        <div>
          <Label htmlFor="expires_on">종료일 (비워두면 계속 노출)</Label>
          <Input id="expires_on" name="expires_on" type="date" defaultValue={defaultValues?.expires_on ?? ""} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="active" defaultChecked={defaultValues?.active ?? true} />
        활성화 (끄면 딜러 화면에 즉시 숨김)
      </label>

      <Button type="submit" className="w-full">
        공지 저장
      </Button>
    </form>
  );
}

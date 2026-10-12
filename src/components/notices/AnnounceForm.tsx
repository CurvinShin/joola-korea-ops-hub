"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { dealerClassificationLabel } from "@/lib/utils/labels";

type DealerOption = { id: string; name: string; classification: string; status: string };

/**
 * 프로모션 시작 공지 폼. 프로모션 정보로 제목/내용/기간이 미리 채워져 있고,
 * 드롭다운에서 "전체 딜러" 또는 "특정 딜러만"을 고른다. 특정 딜러를 고르면
 * 체크 목록이 나타나고, [전체 선택]/[분류별 선택] 버튼으로 한 번에 고를 수 있다.
 */
export function AnnounceForm({
  action,
  returnTo,
  dealers,
  defaultTitle,
  defaultBody,
  defaultPublishOn,
  defaultExpiresOn,
  alreadyAnnouncedCount,
}: {
  action: (formData: FormData) => void;
  returnTo: "/promotions" | "/notices";
  dealers: DealerOption[];
  defaultTitle: string;
  defaultBody: string;
  defaultPublishOn: string;
  defaultExpiresOn: string;
  alreadyAnnouncedCount: number;
}) {
  const [mode, setMode] = useState<"all" | "specific">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const classifications = [...new Set(dealers.map((d) => d.classification))];

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectWhere(pred: (d: DealerOption) => boolean) {
    setSelected(new Set(dealers.filter(pred).map((d) => d.id)));
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="return_to" value={returnTo} />

      {alreadyAnnouncedCount > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          이 프로모션은 이미 공지가 {alreadyAnnouncedCount}건 만들어져 있습니다. 추가 공지를 만들면 딜러 화면에
          배너가 하나 더 보입니다.
        </p>
      )}

      <div>
        <Label htmlFor="title">제목</Label>
        <Input id="title" name="title" required defaultValue={defaultTitle} />
      </div>

      <div>
        <Label htmlFor="body">내용</Label>
        <Textarea id="body" name="body" rows={7} required defaultValue={defaultBody} />
      </div>

      <div>
        <Label htmlFor="target_mode">알릴 딜러</Label>
        <Select
          id="target_mode"
          name="target_mode"
          value={mode}
          onChange={(e) => setMode(e.target.value as "all" | "specific")}
        >
          <option value="all">전체 딜러 ({dealers.length}곳)</option>
          <option value="specific">특정 딜러만 선택</option>
        </Select>
      </div>

      {mode === "specific" && (
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => selectWhere(() => true)}>
              전체 선택
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setSelected(new Set())}>
              선택 해제
            </Button>
            {classifications.map((c) => (
              <Button
                key={c}
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => selectWhere((d) => d.classification === c)}
              >
                {dealerClassificationLabel[c] ?? c}만
              </Button>
            ))}
            <span className="ml-auto text-xs text-slate-500">{selected.size}곳 선택됨</span>
          </div>
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-3">
            {dealers.map((d) => (
              <label key={d.id} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="dealer_ids"
                  value={d.id}
                  checked={selected.has(d.id)}
                  onChange={() => toggle(d.id)}
                />
                {d.name}
                <span className="text-xs text-slate-400">
                  {dealerClassificationLabel[d.classification] ?? d.classification}
                  {d.status !== "active" ? " · 비활성" : ""}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="publish_on">게시일 (이 날부터 배너 노출)</Label>
          <Input id="publish_on" name="publish_on" type="date" required defaultValue={defaultPublishOn} />
        </div>
        <div>
          <Label htmlFor="expires_on">종료일</Label>
          <Input id="expires_on" name="expires_on" type="date" defaultValue={defaultExpiresOn} />
        </div>
      </div>

      <input type="hidden" name="active" value="on" />

      <Button type="submit" className="w-full">
        딜러에게 공지하기
      </Button>
      <p className="text-xs text-slate-400">
        딜러 주문 화면 상단에 배너로 표시되고, 누가 &ldquo;확인&rdquo;을 눌렀는지는 공지사항 탭에서 볼 수 있습니다.
      </p>
    </form>
  );
}

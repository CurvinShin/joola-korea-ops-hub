"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { DEALER_SEGMENTS, findCategory, findSubCategory, getOnlineOffline } from "@/lib/utils/dealerSegments";
import type { Dealer } from "@/lib/types/database.types";

export function DealerForm({
  action,
  defaultValues,
}: {
  action: (formData: FormData) => void;
  defaultValues?: Partial<Dealer>;
}) {
  const [segCategory, setSegCategory] = useState(defaultValues?.segment_category ?? "");
  const [segSubcategory, setSegSubcategory] = useState(defaultValues?.segment_subcategory ?? "");
  const [segDetail, setSegDetail] = useState(defaultValues?.segment_detail ?? "");

  const categoryNode = findCategory(segCategory);
  const subCategories = categoryNode?.subCategories ?? [];
  const subCategoryNode = findSubCategory(segCategory, segSubcategory);
  const details = subCategoryNode?.details ?? [];
  const onlineOffline = getOnlineOffline(segCategory, segSubcategory, segDetail);

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="name">딜러명</Label>
        <Input id="name" name="name" required defaultValue={defaultValues?.name} />
      </div>

      {/* 기존 "구분"(플래그십/일반/온라인전용/총판) 필드는 세그먼트로 대체되어
          화면에는 더 이상 노출하지 않지만, DB 컬럼은 NOT NULL이라 기존 값을
          그대로 숨김 필드로 유지해서 제출한다. */}
      <input type="hidden" name="classification" value={defaultValues?.classification ?? "standard"} />

      <div>
        <Label>세그먼트 (JOOLA APAC 분류 체계)</Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Select
            value={segCategory}
            onChange={(e) => {
              setSegCategory(e.target.value);
              setSegSubcategory("");
              setSegDetail("");
            }}
          >
            <option value="">대분류 선택...</option>
            {DEALER_SEGMENTS.map((c) => (
              <option key={c.category} value={c.category}>
                {c.category}
              </option>
            ))}
          </Select>
          <Select
            value={segSubcategory}
            disabled={subCategories.length === 0}
            onChange={(e) => {
              setSegSubcategory(e.target.value);
              setSegDetail("");
            }}
          >
            <option value="">{subCategories.length === 0 ? "해당 없음" : "중분류 선택..."}</option>
            {subCategories.map((s) => (
              <option key={s.subCategory} value={s.subCategory}>
                {s.subCategory}
              </option>
            ))}
          </Select>
          <Select value={segDetail} disabled={details.length === 0} onChange={(e) => setSegDetail(e.target.value)}>
            <option value="">{details.length === 0 ? "해당 없음" : "세부유형 선택..."}</option>
            {details.map((d) => (
              <option key={d.detail} value={d.detail}>
                {d.detail}
              </option>
            ))}
          </Select>
        </div>
        {segCategory && (
          <p className="mt-1 text-xs text-slate-400">
            Online/Offline: {onlineOffline ?? "—"} (참고용, 선택 항목에 따라 자동으로 정해짐)
          </p>
        )}
        {/* 실제 폼 제출용 필드 — 위 3개 Select는 화면 표시/선택 UX만 담당 */}
        <input type="hidden" name="segment_category" value={segCategory} />
        <input type="hidden" name="segment_subcategory" value={segSubcategory} />
        <input type="hidden" name="segment_detail" value={segDetail} />
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

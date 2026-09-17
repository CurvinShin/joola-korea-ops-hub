import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import type { Facility } from "@/lib/types/database.types";
import { krRegionLabel } from "@/lib/utils/labels";

const REGION_OPTIONS: { value: string; label: string }[] = [
  { value: "seoul", label: krRegionLabel.seoul },
  { value: "incheon", label: krRegionLabel.incheon },
  { value: "gyeonggi", label: krRegionLabel.gyeonggi },
  { value: "gangwon", label: krRegionLabel.gangwon },
  { value: "chungbuk", label: krRegionLabel.chungbuk },
  { value: "chungnam", label: krRegionLabel.chungnam },
  { value: "daejeon", label: krRegionLabel.daejeon },
  { value: "sejong", label: krRegionLabel.sejong },
  { value: "jeonbuk", label: krRegionLabel.jeonbuk },
  { value: "jeonnam", label: krRegionLabel.jeonnam },
  { value: "gwangju", label: krRegionLabel.gwangju },
  { value: "gyeongbuk", label: krRegionLabel.gyeongbuk },
  { value: "daegu", label: krRegionLabel.daegu },
  { value: "gyeongnam", label: krRegionLabel.gyeongnam },
  { value: "busan", label: krRegionLabel.busan },
  { value: "ulsan", label: krRegionLabel.ulsan },
  { value: "jeju", label: krRegionLabel.jeju },
];

export function FacilityForm({
  action,
  defaultValues,
}: {
  action: (formData: FormData) => void;
  defaultValues?: Partial<Facility>;
}) {
  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="name">시설명</Label>
        <Input id="name" name="name" required defaultValue={defaultValues?.name} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="region">지역 (시/도)</Label>
          <Select id="region" name="region" defaultValue={defaultValues?.region ?? ""}>
            <option value="">선택 안함</option>
            {REGION_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="partnership_status">파트너십 상태</Label>
          <Select id="partnership_status" name="partnership_status" defaultValue={defaultValues?.partnership_status ?? "prospect"}>
            <option value="prospect">잠재</option>
            <option value="in_discussion">협의중</option>
            <option value="active">활성</option>
            <option value="ended">종료</option>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="address">주소</Label>
        <Input id="address" name="address" defaultValue={defaultValues?.address ?? ""} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="representative_name">대표자명</Label>
          <Input id="representative_name" name="representative_name" defaultValue={defaultValues?.representative_name ?? ""} />
        </div>
        <div>
          <Label htmlFor="instagram_handle">인스타그램 계정</Label>
          <Input id="instagram_handle" name="instagram_handle" placeholder="@handle" defaultValue={defaultValues?.instagram_handle ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="contact_name">담당자 이름</Label>
          <Input id="contact_name" name="contact_name" defaultValue={defaultValues?.contact_name ?? ""} />
        </div>
        <div>
          <Label htmlFor="contact_email">이메일주소</Label>
          <Input id="contact_email" name="contact_email" type="email" defaultValue={defaultValues?.contact_email ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="contact_phone">담당자 전화번호</Label>
          <Input id="contact_phone" name="contact_phone" defaultValue={defaultValues?.contact_phone ?? ""} />
        </div>
        <div>
          <Label htmlFor="courts_count">코트 수</Label>
          <Input id="courts_count" name="courts_count" type="number" min={0} defaultValue={defaultValues?.courts_count ?? ""} />
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-slate-200 p-3">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="branding_installed"
            defaultChecked={defaultValues?.branding_installed ?? false}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          브랜딩 설치 완료
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="demo_paddles_provided"
            defaultChecked={defaultValues?.demo_paddles_provided ?? false}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          데모 패들 제공
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="product_display"
            defaultChecked={defaultValues?.product_display ?? false}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          제품 진열
        </label>
      </div>

      <div>
        <Label htmlFor="sponsorship_details">스폰서십 세부사항</Label>
        <Textarea id="sponsorship_details" name="sponsorship_details" rows={2} defaultValue={defaultValues?.sponsorship_details ?? ""} />
      </div>

      <div>
        <Label htmlFor="notes">메모</Label>
        <Textarea id="notes" name="notes" rows={2} defaultValue={defaultValues?.notes ?? ""} />
      </div>

      <Button type="submit" className="w-full">
        시설 저장
      </Button>
    </form>
  );
}

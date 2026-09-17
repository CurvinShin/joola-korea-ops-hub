import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import type { Ambassador } from "@/lib/types/database.types";

export function AmbassadorForm({
  action,
  defaultValues,
}: {
  action: (formData: FormData) => void;
  defaultValues?: Partial<Ambassador>;
}) {
  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="name">이름</Label>
        <Input id="name" name="name" required defaultValue={defaultValues?.name} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="type">구분</Label>
          <Select id="type" name="type" defaultValue={defaultValues?.type ?? "ambassador"}>
            <option value="player">선수</option>
            <option value="ambassador">앰버서더</option>
            <option value="influencer">인플루언서</option>
            <option value="junior">주니어</option>
            <option value="creator">크리에이터</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="contract_status">계약 상태</Label>
          <Select id="contract_status" name="contract_status" defaultValue={defaultValues?.contract_status ?? "active"}>
            <option value="prospect">잠재</option>
            <option value="negotiating">협의중</option>
            <option value="active">활성</option>
            <option value="expired">만료</option>
            <option value="ended">종료</option>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="email">이메일주소</Label>
          <Input id="email" name="email" type="email" defaultValue={defaultValues?.email ?? ""} />
        </div>
        <div>
          <Label htmlFor="phone">전화번호</Label>
          <Input id="phone" name="phone" defaultValue={defaultValues?.phone ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="social_media_handle">인스타그램 아이디</Label>
          <Input id="social_media_handle" name="social_media_handle" placeholder="@handle" defaultValue={defaultValues?.social_media_handle ?? ""} />
        </div>
        <div>
          <Label htmlFor="main_paddle">주력 패들</Label>
          <Input id="main_paddle" name="main_paddle" defaultValue={defaultValues?.main_paddle ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="birth_date">생년월일</Label>
          <Input id="birth_date" name="birth_date" type="date" defaultValue={defaultValues?.birth_date ?? ""} />
        </div>
        <div>
          <Label htmlFor="gender">성별</Label>
          <Select id="gender" name="gender" defaultValue={defaultValues?.gender ?? ""}>
            <option value="">선택 안함</option>
            <option value="남성">남성</option>
            <option value="여성">여성</option>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="affiliation">소속 (클럽/팀/학교)</Label>
          <Input id="affiliation" name="affiliation" defaultValue={defaultValues?.affiliation ?? ""} />
        </div>
        <div>
          <Label htmlFor="shipping_address">배송지 주소</Label>
          <Input id="shipping_address" name="shipping_address" defaultValue={defaultValues?.shipping_address ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="dupr_rating">듀퍼 (DUPR)</Label>
          <Input id="dupr_rating" name="dupr_rating" type="number" step="0.01" min={0} max={8} defaultValue={defaultValues?.dupr_rating ?? ""} />
        </div>
        <div>
          <Label htmlFor="equipment_support">전달한 용품</Label>
          <Input id="equipment_support" name="equipment_support" defaultValue={defaultValues?.equipment_support ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="contract_start">계약(활동) 시작일</Label>
          <Input id="contract_start" name="contract_start" type="date" defaultValue={defaultValues?.contract_start ?? ""} />
        </div>
        <div>
          <Label htmlFor="contract_end">계약(활동) 종료일</Label>
          <Input id="contract_end" name="contract_end" type="date" defaultValue={defaultValues?.contract_end ?? ""} />
        </div>
      </div>

      <div>
        <Label htmlFor="compensation">보상 조건</Label>
        <Input id="compensation" name="compensation" placeholder="예: 금전 보상 없음, 용품 지원만" defaultValue={defaultValues?.compensation ?? ""} />
      </div>

      <div>
        <Label htmlFor="kpi">KPI</Label>
        <Textarea id="kpi" name="kpi" rows={2} defaultValue={defaultValues?.kpi ?? ""} />
      </div>

      <div>
        <Label htmlFor="content_obligations">콘텐츠 의무사항</Label>
        <Textarea id="content_obligations" name="content_obligations" rows={2} defaultValue={defaultValues?.content_obligations ?? ""} />
      </div>

      <div>
        <Label htmlFor="performance_notes">기타 메모</Label>
        <Textarea id="performance_notes" name="performance_notes" rows={2} defaultValue={defaultValues?.performance_notes ?? ""} />
      </div>

      <Button type="submit" className="w-full">
        앰버서더 저장
      </Button>
    </form>
  );
}

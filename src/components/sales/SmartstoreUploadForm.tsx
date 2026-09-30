"use client";

import { useFormState, useFormStatus } from "react-dom";
import { importSmartstoreExport, type SmartstoreImportResult } from "@/lib/actions/smartstore-import";
import { Button } from "@/components/ui/Button";

const initialState: SmartstoreImportResult | null = null;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "처리 중..." : "스마트스토어 반영"}
    </Button>
  );
}

// 스마트스토어 "주문조회" 엑셀(비밀번호로 보호된 xlsx)을 업로드하면 서버에서
// 복호화 → 파싱 → 제품군 분류까지 한 번에 처리한다. 파일에 있는 구매자
// 개인정보는 서버 액션이 애초에 읽지 않으므로 이 화면에도 노출되지 않는다.
export function SmartstoreUploadForm() {
  const [state, formAction] = useFormState(importSmartstoreExport, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">
          스마트스토어 &ldquo;주문조회&rdquo; 엑셀 파일 (.xlsx)
        </label>
        <input
          type="file"
          name="file"
          accept=".xlsx"
          required
          className="mt-1.5 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">파일 비밀번호 (있는 경우)</label>
        <input
          type="password"
          name="password"
          autoComplete="off"
          className="mt-1.5 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="비밀번호로 보호된 파일이면 입력"
        />
        <p className="mt-1.5 text-xs text-slate-400">
          네이버 스마트스토어에서 내려받은 파일을 이름 그대로 올리면 됩니다. 여러 번 겹치는 기간을
          올려도 같은 주문은 중복되지 않고 최신 상태로만 반영됩니다.
        </p>
      </div>

      <SubmitButton />

      {state && !state.ok && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{state.error}</div>
      )}

      {state && state.ok && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p className="font-medium">반영 완료 — {state.summary.filename}</p>
          <ul className="mt-2 list-disc space-y-0.5 pl-4">
            <li>전체 {state.summary.totalRowsInFile}행 중 {state.summary.imported}건 반영</li>
            {state.summary.dateRange && (
              <li>
                주문일 범위: {state.summary.dateRange.from} ~ {state.summary.dateRange.to}
              </li>
            )}
            <li>취소·반품 등 제외 대상 {state.summary.invalidStatusCount}건 (기록은 남기되 집계에서 제외)</li>
            {state.summary.skipped > 0 && <li>형식 문제로 건너뛴 행 {state.summary.skipped}건</li>}
            {state.summary.unclassifiedProductNames.length > 0 ? (
              <li className="text-amber-700">
                분류 규칙에 없는 신규 상품명 {state.summary.unclassifiedProductNames.length}건 — &ldquo;미분류&rdquo;로
                반영됨: {state.summary.unclassifiedProductNames.join(", ")}
              </li>
            ) : (
              <li>모든 품목이 제품군으로 분류됨</li>
            )}
          </ul>
        </div>
      )}
    </form>
  );
}

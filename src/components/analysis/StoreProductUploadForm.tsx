"use client";

import { useFormState, useFormStatus } from "react-dom";
import { importStoreProductList, type StoreUploadResult } from "@/lib/actions/listing-priority";
import { Button } from "@/components/ui/Button";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="sm"
      disabled={pending}
      onClick={(e) => {
        if (!confirm("올린 파일 기준으로 \"이미 등록된 제품군\"을 다시 계산할까요?\n(미리 넣어 둔 값과 이전 파일 결과는 교체되고, 직접 체크해서 표시한 것은 그대로 남습니다.)")) e.preventDefault();
      }}
    >
      {pending ? "처리 중..." : "파일로 등록된 제품 반영"}
    </Button>
  );
}

// 스마트스토어센터 "상품 조회" 파일에서 상품명·판매상태만 읽어, 이미 올라간 제품군을 자동으로 표시한다.
export function StoreProductUploadForm() {
  const [state, formAction] = useFormState<StoreUploadResult | null, FormData>(importStoreProductList, null);
  return (
    <form action={formAction} className="space-y-3">
      <input
        type="file"
        name="file"
        accept=".csv,.xlsx"
        required
        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
      />
      <p className="text-xs text-slate-500">
        스마트스토어센터의 상품 조회 화면에서 내려받은 상품 목록 파일(.csv 또는 .xlsx)을 올리면 됩니다. 상품명과 판매상태만 읽고,
        가격·재고 등 다른 열은 읽지 않습니다.
      </p>
      <SubmitButton />

      {state && !state.ok && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error}</div>
      )}
      {state && state.ok && (
        <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <p>
            <b>{state.summary.filename}</b>: 판매 중 상품 {state.summary.productCount}개에서 제품군 {state.summary.matched.length}개를 찾아 &ldquo;이미
            등록됨&rdquo;으로 표시했습니다.
            {state.summary.ignoredCount > 0 && ` (판매종료·삭제 ${state.summary.ignoredCount}개는 제외)`}
          </p>
          <p className="text-xs">찾은 제품군: {state.summary.matched.map((m) => `${m.label}(${m.count})`).join(", ")}</p>
          {state.summary.removed.length > 0 && (
            <p className="text-xs text-amber-800">
              파일에 없어서 등록됨에서 빠진 제품군: {state.summary.removed.join(", ")} (스마트스토어에 실제로 올라가 있다면 아래 후보 표에서 다시 체크해 표시해 주세요)
            </p>
          )}
          {state.summary.unmatched.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer">제품군을 자동으로 못 찾은 상품 {state.summary.unmatched.length}개 (후보 표에서 직접 체크해 처리)</summary>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {state.summary.unmatched.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </form>
  );
}

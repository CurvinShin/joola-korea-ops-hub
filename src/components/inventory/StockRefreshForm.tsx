"use client";

import { useFormState, useFormStatus } from "react-dom";
import { refreshInventoryFromFile, type RefreshResult } from "@/lib/actions/inventory-refresh";
import { Button } from "@/components/ui/Button";

const initialState: RefreshResult | null = null;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "처리 중..." : "재고 최신화 실행"}
    </Button>
  );
}

export function StockRefreshForm() {
  const [state, formAction] = useFormState(refreshInventoryFromFile, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">
          이지어드민 &ldquo;현재고조회&rdquo; 엑셀 파일 (.xls)
        </label>
        <input
          type="file"
          name="file"
          accept=".xls,.xlsx,.html,text/html"
          required
          className="mt-1.5 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
        />
        <p className="mt-1.5 text-xs text-slate-400">
          다운로드 받은 파일을 그대로 올리면 됩니다. 이름을 바꾸지 않으면 실사 기준일시도 자동으로
          기록됩니다.
        </p>
      </div>

      <SubmitButton />

      {state && !state.ok && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {state && state.ok && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p className="font-medium">최신화 완료 — {state.summary.filename}</p>
          <ul className="mt-2 list-disc space-y-0.5 pl-4">
            <li>전체 {state.summary.totalRows}행 처리</li>
            <li>재고 갱신 {state.summary.matchedUpdated}건</li>
            <li>미매칭 재고 수량 갱신 {state.summary.gapsUpdated}건</li>
            {state.summary.gapsNew > 0 ? (
              <li className="text-amber-700">
                신규 미매칭 품목 {state.summary.gapsNew}건 발견 — &ldquo;카탈로그 미매칭 재고&rdquo;
                게시판에서 확인해주세요.
              </li>
            ) : (
              <li>신규 미매칭 품목 없음</li>
            )}
          </ul>
        </div>
      )}
    </form>
  );
}

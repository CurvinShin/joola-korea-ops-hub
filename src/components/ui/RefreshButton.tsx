"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

// force-dynamic 페이지는 이미 요청마다 최신 데이터를 가져오지만, 링크를 열어둔
// 채 한참 있다가 다시 확인할 때(특히 상급자 보고용 공개 링크에서) 브라우저
// 새로고침 없이 데이터를 다시 가져올 수 있게 눈에 보이는 버튼을 둔다.
export function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={isPending}
      className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
    >
      {isPending ? "최신화 중..." : "↻ 최신화"}
    </button>
  );
}

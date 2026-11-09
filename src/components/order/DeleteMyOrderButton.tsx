"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteMyDealerOrder } from "@/lib/actions/dealer-portal";

// 딜러 본인의 입금 확인 전(draft) 주문을 완전히 삭제하는 버튼.
// "주문 내역" 페이지(서버 컴포넌트)의 주문 행에서 쓴다.
export function DeleteMyOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (!confirm("이 주문을 완전히 삭제할까요? 되돌릴 수 없습니다.")) return;
          setError(null);
          startTransition(async () => {
            const res = await deleteMyDealerOrder(orderId);
            if (!res.ok) {
              setError(res.message);
              return;
            }
            router.refresh();
          });
        }}
        className="font-medium text-red-600 hover:underline disabled:opacity-50"
      >
        {isPending ? "삭제 중..." : "삭제"}
      </button>
      {error && <span className="text-red-600">{error}</span>}
    </>
  );
}

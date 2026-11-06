import Link from "next/link";
import { ReceivingTool } from "@/components/inventory/ReceivingTool";

export const dynamic = "force-dynamic";

export default function ReceivingPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/inventory" className="text-sm text-brand-600 hover:underline">
          ← 재고로 돌아가기
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">상품등록 · 입고전표 만들기</h1>
        <p className="text-sm text-slate-500">
          수입 패킹리스트(PL &amp; CI)를 올리면 SKU로 Hub의 이지어드민 상품코드를 찾아 입고전표를 만들고, 상품코드가 아직 없는
          신규 제품은 상품등록 양식을 만들어 줍니다. 올린 파일은 저장하지 않고 이 화면에서만 사용합니다.
        </p>
      </div>
      <ReceivingTool />
    </div>
  );
}

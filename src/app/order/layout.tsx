import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";

// Deliberately its own minimal layout — no Sidebar (that nav is full of
// internal-only pages a dealer account can't and shouldn't see).
export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex min-h-16 flex-wrap items-center justify-between gap-y-2 border-b border-slate-200 bg-white px-6 py-2">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <a href="/order" className="text-sm font-semibold text-slate-900 hover:underline">
            JOOLA Korea 딜러 주문
          </a>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
            <a href="/order" className="hover:text-brand-700 hover:underline">
              주문하기
            </a>
            <a href="/order/history" className="hover:text-brand-700 hover:underline">
              내 주문 내역
            </a>
            <a href="/order/import-requests" className="hover:text-brand-700 hover:underline">
              수입 요청
            </a>
            <a href="/order/order-list" className="hover:text-brand-700 hover:underline">
              오더리스트
            </a>
            <a href="/order/updates" className="hover:text-brand-700 hover:underline">
              업데이트 소식
            </a>
          </nav>
        </div>
        <form action={signOut}>
          <Button type="submit" variant="secondary" size="sm">
            로그아웃
          </Button>
        </form>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
    </div>
  );
}

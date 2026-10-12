import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";

// Deliberately its own minimal layout — no Sidebar (that nav is full of
// internal-only pages a dealer account can't and shouldn't see).
export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
        <div className="flex items-center gap-6">
          <a href="/order" className="text-sm font-semibold text-slate-900 hover:underline">
            JOOLA Korea 딜러 주문
          </a>
          <nav className="flex items-center gap-4 text-sm text-slate-600">
            <a href="/order" className="hover:text-brand-700 hover:underline">
              주문하기
            </a>
            <a href="/order/history" className="hover:text-brand-700 hover:underline">
              내 주문 내역
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

import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";

export function Topbar({ email }: { email: string | null }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="text-sm text-slate-500">내부 전용 — 외부에 공유하지 마세요.</div>
      <div className="flex items-center gap-4">
        {email && <span className="text-sm text-slate-600">{email}</span>}
        <form action={signOut}>
          <Button type="submit" variant="secondary" size="sm">
            로그아웃
          </Button>
        </form>
      </div>
    </header>
  );
}

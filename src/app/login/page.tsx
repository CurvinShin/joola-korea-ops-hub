import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; next?: string };
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">JOOLA Korea 운영 허브</h1>
        <p className="mt-1 text-sm text-slate-500">JOOLA Korea 계정으로 로그인하세요.</p>

        {searchParams.error && (
          <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {searchParams.error}
          </div>
        )}

        <LoginForm nextPath={searchParams.next || ""} />

        <p className="mt-6 text-xs text-slate-400">
          계정은 JOOLA Korea 관리자가 Supabase 대시보드에서 직접 생성합니다 —
          별도의 회원가입 기능은 제공하지 않습니다.
        </p>
      </div>
    </div>
  );
}

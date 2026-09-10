import { signIn } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; next?: string };
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">JOOLA Korea Operations Hub</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in with your JOOLA Korea account.</p>

        {searchParams.error && (
          <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {searchParams.error}
          </div>
        )}

        <form action={signIn} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={searchParams.next || "/dashboard"} />
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-xs text-slate-400">
          Accounts are created by the JOOLA Korea administrator in the Supabase dashboard —
          there is no public sign-up.
        </p>
      </div>
    </div>
  );
}

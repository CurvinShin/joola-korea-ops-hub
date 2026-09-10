import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for use inside Server Components, Server Actions, and
 * Route Handlers. Reads/writes the auth session via Next.js cookies so the
 * signed-in user's identity flows through to Postgres RLS automatically.
 *
 * Not generic-typed against Database on purpose — see the note in
 * lib/supabase/client.ts and README "Keeping types in sync".
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component render — safe to ignore because
            // the middleware below refreshes the session on every request.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Same as above.
          }
        },
      },
    }
  );
}

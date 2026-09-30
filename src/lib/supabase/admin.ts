import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses Row Level Security entirely.
 *
 * SERVER-ONLY. Never import this from a Client Component or anything that
 * ends up in the browser bundle; `SUPABASE_SERVICE_ROLE_KEY` (no NEXT_PUBLIC_
 * prefix) is only available server-side, so a client-side import will fail
 * loudly rather than silently leaking the key — but don't rely on that,
 * just don't import it from "use client" files.
 *
 * Currently used only by the no-login /public-report/[token] page: that
 * route intentionally has no signed-in user, so the normal cookie-based
 * client (lib/supabase/server.ts) would see zero rows under RLS. Do not
 * reach for this client anywhere a regular authenticated client would do —
 * it defeats every RLS policy in the database.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_URL) is not set — required for the public report page."
    );
  }
  return createSupabaseClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for use inside Client Components ("use client").
 * Reads the public URL + anon key, which are safe to expose in the
 * browser bundle — access control is enforced server-side by Postgres
 * Row Level Security policies, not by hiding this key.
 *
 * Not generic-typed against Database on purpose: the hand-written types in
 * lib/types/database.types.ts don't fully match the shape supabase-js
 * expects for query inference (see README "Keeping types in sync"). Use
 * the exported row types (Dealer, Product, etc.) to type your own
 * variables/props instead, until you generate the real types.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles Supabase auth redirects (magic links, password recovery, invite
// links). Not used by the default email/password login flow, but kept so
// those Supabase-native flows work if you turn them on later without
// touching application code.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${next}`);
}

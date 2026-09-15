import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Runs on every request. Refreshes the Supabase session cookie, blocks
// access to everything except /login for anyone who isn't signed in, and
// keeps dealer-portal accounts confined to /order (they never see the
// internal ops pages — RLS also blocks the data, but this keeps the nav
// experience clean too).
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/auth");

  if (!user && !isAuthRoute) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && request.nextUrl.pathname === "/login") {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    return NextResponse.redirect(new URL(profile?.role === "dealer" ? "/order" : "/dashboard", request.url));
  }

  if (user && !isAuthRoute) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    const isDealer = profile?.role === "dealer";
    const isOrderRoute = request.nextUrl.pathname.startsWith("/order");

    if (isDealer && !isOrderRoute) {
      return NextResponse.redirect(new URL("/order", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets and Next.js internals so the
     * check above runs for every page and Server Action.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

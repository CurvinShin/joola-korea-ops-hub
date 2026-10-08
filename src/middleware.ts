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

  // 로그인 없이 열람 가능한 단일 보고서 페이지 — 접근 제어는 미들웨어가 아니라
  // 페이지 자체가 PUBLIC_REPORT_TOKEN과 URL의 token을 비교해서 한다(admin.ts
  // 참고). 여기서는 그 페이지가 /login으로 리다이렉트되지 않게만 해준다.
  const isPublicReportRoute =
    request.nextUrl.pathname.startsWith("/public-report/") ||
    // 옵시디안 자동 업데이트용 JSON 엔드포인트(/api/public-report/[token]/ops-summary).
    // 로그인 세션이 없는 스크립트가 호출하므로 같은 방식으로 열어두고, 접근 제어는
    // 라우트 안에서 PUBLIC_REPORT_TOKEN 비교로 한다.
    request.nextUrl.pathname.startsWith("/api/public-report/");

  if (!user && !isAuthRoute && !isPublicReportRoute) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && request.nextUrl.pathname === "/login") {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    return NextResponse.redirect(new URL(profile?.role === "dealer" ? "/order" : "/dashboard", request.url));
  }

  if (user && !isAuthRoute && !isPublicReportRoute) {
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

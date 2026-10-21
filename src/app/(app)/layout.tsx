import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { WeeklyAnalysisBanner } from "@/components/analysis/WeeklyAnalysisBanner";
import { NavCountsProvider } from "@/components/layout/NavCountsProvider";
import { createClient } from "@/lib/supabase/server";
import { EMPTY_NAV_COUNTS, fetchNavCounts } from "@/lib/nav-counts";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 사이드바 배지(딜러 주문 N, 파트너 신청 N)의 처음 값. 이후에는 브라우저가 알아서 새로 읽는다.
  const navCounts = user ? await fetchNavCounts(supabase) : EMPTY_NAV_COUNTS;

  return (
    <NavCountsProvider initial={navCounts}>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <Topbar email={user?.email ?? null} />
          {user && <WeeklyAnalysisBanner />}
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </NavCountsProvider>
  );
}

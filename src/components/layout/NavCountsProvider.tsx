"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { EMPTY_NAV_COUNTS, type NavCounts } from "@/lib/nav-counts";

// layout(서버 컴포넌트)은 페이지를 옮겨 다녀도 다시 그려지지 않아서, 서버에서 한 번 센
// 건수만 쓰면 새 주문·신청이 들어와도 새로고침 전까지 숫자가 그대로다. 그래서 처음
// 값만 서버에서 받고, 이후에는 (1) 1분마다 (2) 메뉴를 눌러 페이지를 옮길 때 (3) 다른
// 탭에 있다가 돌아왔을 때 /api/nav-counts에서 다시 읽어온다.
const REFRESH_MS = 60_000;

const NavCountsContext = createContext<NavCounts>(EMPTY_NAV_COUNTS);

export function NavCountsProvider({ initial, children }: { initial: NavCounts; children: React.ReactNode }) {
  const pathname = usePathname();
  const [counts, setCounts] = useState<NavCounts>(initial);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/nav-counts", { cache: "no-store" });
        // 로그아웃 등으로 로그인 페이지(HTML)로 돌려보내진 경우는 무시한다.
        if (!res.ok || !res.headers.get("content-type")?.includes("application/json")) return;
        const data = (await res.json()) as Partial<NavCounts>;
        if (cancelled) return;
        setCounts({
          dealerOrders: Number(data.dealerOrders) || 0,
          partnerApplications: Number(data.partnerApplications) || 0,
        });
      } catch {
        // 네트워크 오류는 조용히 넘어가고 다음 주기에 다시 시도한다.
      }
    }

    load();
    const timer = setInterval(load, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pathname]);

  return <NavCountsContext.Provider value={counts}>{children}</NavCountsContext.Provider>;
}

export function useNavCounts(): NavCounts {
  return useContext(NavCountsContext);
}

// 메뉴 이름 오른쪽에 붙는 빨간 숫자 배지. 0건이면 아무것도 그리지 않는다.
export function NavCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={`처리 대기 ${count}건`}
      className="min-w-[1.25rem] rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-[11px] font-semibold leading-none text-white"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

import type { createClient } from "@/lib/supabase/server";

// 사이드바 메뉴 옆에 붙는 "처리 대기 건수" 배지. 서버 컴포넌트(layout)와
// /api/nav-counts 라우트가 같은 기준으로 세도록 한 곳에서 관리한다.
//   - dealerOrders: 딜러가 사이트에서 넣었고 아직 입금 확인 전인(status = draft) 주문
//   - partnerApplications: 승인/거절 처리 전(status = pending)인 브랜드 파트너 신청
// "대기"의 기준을 바꾸고 싶으면 아래 두 조회의 조건만 고치면 된다.
export type NavCountKey = "dealerOrders" | "partnerApplications";
export type NavCounts = Record<NavCountKey, number>;

export const EMPTY_NAV_COUNTS: NavCounts = { dealerOrders: 0, partnerApplications: 0 };

export async function fetchNavCounts(supabase: ReturnType<typeof createClient>): Promise<NavCounts> {
  const [orders, applications] = await Promise.all([
    supabase.from("dealer_orders").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("partner_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  // 조회에 실패해도 화면 전체가 깨지지 않게 0으로 둔다(배지가 안 보일 뿐).
  return {
    dealerOrders: orders.error ? 0 : orders.count ?? 0,
    partnerApplications: applications.error ? 0 : applications.count ?? 0,
  };
}

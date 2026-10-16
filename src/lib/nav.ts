export type NavItem = { href: string; label: string; phase2?: boolean };
export type NavSection = { label: string; items: NavItem[] };

// 데스크톱 Sidebar와 모바일 MobileSidebar가 똑같은 메뉴 구조를 쓰도록 한 곳에서
// 관리한다 — 예전에는 Sidebar.tsx 안에만 있어서 모바일에는 아예 메뉴 자체가
// 없었다(사이드바가 md 이하에서 완전히 숨겨짐). "모바일은 관리자 페이지가
// 다른거야?" 문의의 실제 원인 중 하나 — 로그인 후 이전에 보려던 페이지(예:
// /inventory)로 바로 이동하면서, 메뉴가 하나도 안 보이니 완전히 다른/제한된
// 화면처럼 보였던 것.
export const NAV_SECTIONS: NavSection[] = [
  {
    label: "개요",
    items: [
      { href: "/dashboard", label: "대시보드" },
      { href: "/updates", label: "업데이트 기록" },
    ],
  },
  {
    label: "주문·재고",
    items: [
      { href: "/dealers", label: "딜러" },
      { href: "/dealer-orders", label: "딜러 주문" },
      { href: "/inventory", label: "재고" },
      { href: "/import-requests", label: "수입 요청" },
      { href: "/purchase-orders", label: "해외 발주" },
    ],
  },
  {
    label: "영업·정산",
    items: [
      { href: "/sales", label: "영업" },
      { href: "/sales/product-categories", label: "제품군 분석" },
      { href: "/sales/smartstore-settlement", label: "월말 정산(스마트스토어)" },
      { href: "/claims", label: "환불·클레임" },
    ],
  },
  {
    label: "딜러 소통",
    items: [
      { href: "/order-lists", label: "오더리스트" },
      { href: "/promotions", label: "프로모션" },
      { href: "/notices", label: "공지사항" },
      { href: "/marketing-assets", label: "마케팅 에셋" },
    ],
  },
  {
    label: "성장",
    items: [
      { href: "/events", label: "이벤트" },
      { href: "/support", label: "협찬·지원" },
      { href: "/facilities", label: "시설" },
      { href: "/partner-applications", label: "파트너 신청" },
      { href: "/ambassadors", label: "앰버서더" },
      { href: "/marketing", label: "마케팅", phase2: true },
    ],
  },
  {
    label: "업무",
    items: [{ href: "/tasks", label: "작업" }],
  },
];

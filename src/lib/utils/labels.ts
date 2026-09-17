// Korean display labels for enum values stored in the database.
// The underlying values (English) are never changed here — only what's rendered on screen.

export const dealerStatusLabel: Record<string, string> = {
  active: "활성",
  pending: "대기",
  inactive: "비활성",
  terminated: "계약 종료",
};

export const dealerClassificationLabel: Record<string, string> = {
  flagship: "플래그십",
  standard: "일반",
  online_only: "온라인 전용",
  distributor: "총판",
};

export const orderStatusLabel: Record<string, string> = {
  draft: "초안",
  confirmed: "확정",
  shipped: "출고",
  delivered: "배송완료",
  cancelled: "취소",
};

export const taskStatusLabel: Record<string, string> = {
  open: "오픈",
  in_progress: "진행중",
  blocked: "보류",
  done: "완료",
};

export const taskPriorityLabel: Record<string, string> = {
  low: "낮음",
  medium: "보통",
  high: "높음",
  urgent: "긴급",
};

export const taskCategoryLabel: Record<string, string> = {
  general: "일반",
  dealer: "딜러",
  inventory: "재고",
  sales: "영업",
  purchase_order: "발주",
  event: "이벤트",
  facility: "시설",
  ambassador: "앰버서더",
  marketing: "마케팅",
};

export const shippingStatusLabel: Record<string, string> = {
  not_shipped: "미출고",
  in_transit: "운송중",
  arrived_port: "항구 도착",
  cleared_customs: "통관 완료",
  delivered: "배송 완료",
};

export const customsStatusLabel: Record<string, string> = {
  not_started: "시작 전",
  in_progress: "진행중",
  cleared: "통관 완료",
  held: "보류",
};

export const appRoleLabel: Record<string, string> = {
  admin: "관리자",
  sales: "영업",
  marketing: "마케팅",
  ecommerce: "이커머스",
  viewer: "뷰어",
  dealer: "딜러",
};

export const dealerOrderStatusLabel: Record<string, string> = {
  draft: "입금 확인 대기",
  confirmed: "발주 확정",
  shipped: "출고",
  delivered: "배송완료",
  cancelled: "취소",
};

export const dealerOrderTypeLabel: Record<string, string> = {
  regular: "일반판매",
  demo: "데모구매",
};

export const partnershipStatusLabel: Record<string, string> = {
  prospect: "잠재",
  in_discussion: "협의중",
  active: "활성",
  ended: "종료",
};

// South Korea's 17 시/도, short colloquial form (e.g. "경기도" -> "경기").
export const krRegionLabel: Record<string, string> = {
  seoul: "서울",
  incheon: "인천",
  gyeonggi: "경기",
  gangwon: "강원",
  chungbuk: "충북",
  chungnam: "충남",
  daejeon: "대전",
  sejong: "세종",
  jeonbuk: "전북",
  jeonnam: "전남",
  gwangju: "광주",
  gyeongbuk: "경북",
  daegu: "대구",
  gyeongnam: "경남",
  busan: "부산",
  ulsan: "울산",
  jeju: "제주",
};

export const ambassadorTypeLabel: Record<string, string> = {
  player: "선수",
  ambassador: "앰버서더",
  influencer: "인플루언서",
  junior: "주니어",
  creator: "크리에이터",
};

export const contractStatusLabel: Record<string, string> = {
  prospect: "잠재",
  negotiating: "협의중",
  active: "활성",
  expired: "만료",
  ended: "종료",
};

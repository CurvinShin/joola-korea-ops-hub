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
  draft: "초안",
  confirmed: "주문 접수",
  shipped: "출고",
  delivered: "배송완료",
  cancelled: "취소",
};

export const dealerOrderTypeLabel: Record<string, string> = {
  regular: "일반판매",
  sample: "샘플",
};

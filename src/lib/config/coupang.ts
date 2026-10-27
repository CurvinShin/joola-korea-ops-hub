// 쿠팡 로켓그로스 입고(우리가 직접 발송)용 가상 "딜러".
// 0066 마이그레이션이 kr_code = '쿠팡로켓'인 딜러를 한 곳 만든다. 이 딜러의
// 주문은 판매가 아니라 쿠팡 센터 입고용이라 금액이 0원으로 저장되고(배송비도 0),
// 대시보드/월 요약/데이터 점검의 매출·0원 경고 집계에서는 빠진다.
export const COUPANG_ROCKET_KR_CODE = "쿠팡로켓";

export function isZeroPriceDealerCode(krCode: string | null | undefined): boolean {
  return krCode === COUPANG_ROCKET_KR_CODE;
}

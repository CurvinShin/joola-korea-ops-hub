-- '이번 달 매출'(/sales 페이지) 집계 기준을 견적서(dealer_quotes) 대신 실제
-- 딜러주문(dealer_orders)의 '출고' 처리 시점으로 바꾸기 위한 타임스탬프.
-- 관리자가 딜러주문 목록에서 상태를 '출고'로 바꾸는 순간이 곧 매출 인식
-- 시점이 된다 (setDealerOrderStatus 액션에서 이 컬럼을 채운다).
--
-- 이미 shipped/delivered 상태인 기존 주문들은 정확히 언제 '출고' 버튼을
-- 눌렀는지 기록이 없어서, 일단 order_date 00:00 KST로 백필한다 — 실제
-- 출고 시각과 다를 수 있지만(날짜만 맞음), 없는 것보다는 낫다. 이후로
-- 새로 출고 처리되는 주문은 정확한 시각이 남는다.
alter table dealer_orders add column if not exists shipped_at timestamptz;

update dealer_orders
set shipped_at = order_date::timestamptz
where status in ('shipped', 'delivered') and shipped_at is null;

-- =========================================================================
-- 장바구니형 딜러 주문 + 입금확인 시점 재고 차감 + 백오더 가시화.
--
-- 흐름: 딜러가 여러 상품을 담아 한 번에 주문 -> 상태 'draft'로 생성, 이
-- 시점엔 재고를 건드리지 않는다 -> 관리자가 입금 확인 후 "입금 확인"을
-- 누르면 그때 재고를 차감(마이너스 허용 = 백오더)하고 상태를 'confirmed'로
-- 바꾼다 -> 관리자가 주문을 거절/취소하면(입금 전이면 재고 변동 없음, 이미
-- 차감된 뒤라면 되돌려놓음) 상태를 'cancelled'로 바꾼다.
--
-- 배송비는 패들 10개당 1박스(5,000원)는 자동 계산해서 기록해두고, 그 외
-- 품목의 배송비는 관리자가 직접 입력(manual_shipping_fee)한다.
-- Safe to run as a normal SQL Editor execution (no new enum values here).
-- =========================================================================

alter table dealer_order_items add column if not exists is_demo boolean not null default false;

alter table dealer_orders add column if not exists stock_deducted boolean not null default false;
alter table dealer_orders add column if not exists auto_shipping_boxes integer not null default 0;
alter table dealer_orders add column if not exists auto_shipping_fee numeric(12,2) not null default 0;
alter table dealer_orders add column if not exists manual_shipping_fee numeric(12,2);
alter table dealer_orders add column if not exists payment_confirmed_at timestamptz;
alter table dealer_orders add column if not exists payment_confirmed_by uuid references profiles (id) on delete set null;

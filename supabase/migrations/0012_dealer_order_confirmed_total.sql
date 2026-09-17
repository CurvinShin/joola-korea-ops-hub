-- 입금 확인 시점에 관리자가 실제 견적서(배송비 포함) 금액에 맞춰 직접 입력하는
-- "확정 총액". 기존 total_amount는 주문 생성 시점의 상품 공급가액만 반영하고
-- 배송비는 별도 컬럼(auto/manual_shipping_fee)에 있어서, 지금까지는 화면에
-- 보이는 "합계"가 실제 입금액과 정확히 일치하지 않을 수 있었다.
--
-- 입금 확인 버튼을 누르는 순간 이 값을 total_amount에도 반영해서, 그 이후로는
-- 목록/상세 어디서 보든 실제로 입금받은 금액과 같은 숫자가 보이게 한다.
-- confirmed_total_amount 자체는 "이 주문이 수기로 확정된 금액을 갖고 있다"는
-- 표시로 남겨서 나중에 감사/추적 용도로 쓸 수 있게 한다.

alter table dealer_orders add column if not exists confirmed_total_amount numeric;

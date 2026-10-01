begin;

-- KR11(인피클 / 홍승기 대표) 주문 번호 연쇄 보정.
--
-- 2026-10-01: 사용자 확인 결과, 2026-09-22에 들어온 인피클 주문이 실제로는
-- KR11-2606이었어야 하는데 KR11-2607로 찍혀 있었다. 그 뒤로 들어온 주문도
-- 한 칸씩 밀려서 KR11-2608로 찍혀 있다. 즉 이 시점 이후 KR11의 번호가
-- 전체적으로 한 칸씩 앞으로 밀려 있는 상태 — 낮은 번호부터 순서대로
-- 당겨야 유니크 제약(0011의 dealer_orders_order_number_key)에 걸리지
-- 않는다. 혹시 중간에 걸리는 번호가 있으면(예: 2606이 이미 다른 행에
-- 존재) 트랜잭션 전체가 롤백되어 아무 것도 바뀌지 않으니 안전하다.
--
-- dealers.next_seq는 그대로(8) 둔다 — 보정 후 KR11의 가장 큰 번호가
-- 2607이 되므로 next_seq=8(다음 번호 2608)이 정확히 이어진다.
update dealer_orders o
set order_number = 'KR11-2606'
from dealers d
where o.dealer_id = d.id
  and d.kr_code = 'KR11'
  and o.order_number = 'KR11-2607';

update dealer_orders o
set order_number = 'KR11-2607'
from dealers d
where o.dealer_id = d.id
  and d.kr_code = 'KR11'
  and o.order_number = 'KR11-2608';

commit;

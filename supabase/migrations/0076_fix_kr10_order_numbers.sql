-- KR10 Hub 주문번호를 실제로 나간 견적서 번호에 맞춰 정정한다 (2026-11-02).
-- 견적서 번호와 Hub 주문 짝 (견적서 PDF 번호는 dealer_quotes 기준, 확인 완료):
--   견적서 2657 (10/22)       = Hub 2658 (10/22)  → KR10-2657
--   견적서 2658 (10/27, 10/28 출고) = Hub 2659 (10/27)  → KR10-2658
--       + Hub 2657 (10/20) 주문도 이 견적서에 함께 들어가 출고됨 → KR10-2658-1 (같은 견적서 건 표시)
--   견적서 2659 (10/28)       = Hub 2660 (10/28)  → KR10-2659
--   견적서 2660 (11/2)        = Hub 2661 (11/2)   → KR10-2660
-- 번호가 겹치지 않도록 순서대로 바꾸고, 주문일이 예상과 다르면 건너뛴다. 여러 번 실행해도 안전하다.
-- 다음 번호 카운터는 정정 후 가장 큰 번호(2660) + 1 = 61 로 맞춘다.

begin;

-- 1) 견적서 2658에 함께 들어간 10/20 주문을 먼저 비켜 둔다
update dealer_orders o set order_number = 'KR10-2658-1' from dealers d
where o.dealer_id = d.id and d.kr_code = 'KR10' and o.order_number = 'KR10-2657' and o.order_date = '2026-10-20'
  and not exists (select 1 from dealer_orders x where x.order_number = 'KR10-2658-1');

-- 2) 낮은 번호부터 한 칸씩 당긴다
update dealer_orders o set order_number = 'KR10-2657' from dealers d
where o.dealer_id = d.id and d.kr_code = 'KR10' and o.order_number = 'KR10-2658' and o.order_date = '2026-10-22'
  and not exists (select 1 from dealer_orders x where x.order_number = 'KR10-2657');
update dealer_orders o set order_number = 'KR10-2658' from dealers d
where o.dealer_id = d.id and d.kr_code = 'KR10' and o.order_number = 'KR10-2659' and o.order_date = '2026-10-27'
  and not exists (select 1 from dealer_orders x where x.order_number = 'KR10-2658');
update dealer_orders o set order_number = 'KR10-2659' from dealers d
where o.dealer_id = d.id and d.kr_code = 'KR10' and o.order_number = 'KR10-2660' and o.order_date = '2026-10-28'
  and not exists (select 1 from dealer_orders x where x.order_number = 'KR10-2659');
update dealer_orders o set order_number = 'KR10-2660' from dealers d
where o.dealer_id = d.id and d.kr_code = 'KR10' and o.order_number = 'KR10-2661' and o.order_date = '2026-11-02'
  and not exists (select 1 from dealer_orders x where x.order_number = 'KR10-2660');

update dealers set next_seq = 61, last_seq_year = '26' where kr_code = 'KR10';

commit;

-- 검산: 2655 · 2656 · 2657(10/22) · 2658(10/27) · 2658-1(10/20) · 2659(10/28) · 2660(11/2) 가 나오고 카운터가 61 이면 정상
select o.order_number, o.order_date, o.status
from dealer_orders o join dealers d on d.id = o.dealer_id
where d.kr_code = 'KR10' and o.order_number >= 'KR10-2655'
order by o.order_number;

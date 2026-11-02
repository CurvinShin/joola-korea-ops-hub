-- Hub 주문번호를 실제로 나간 견적서 번호에 맞춰 정정한다 (2026-11-02).
-- 견적서 PDF 번호(dealer_quotes)와 Hub 주문(dealer_orders)을 날짜로 하나씩 짝지어 확인했다.
--
--   KR11: Hub 2609(10/19)→2608, 2610(10/21)→2609, 2611(11/2)→2610   (Hub에는 2608이 없어 한 칸씩 당김)
--   KR13: Hub 2615(10/07)→2614, 2616(10/22)→2615                    (Hub에는 2614가 없어 한 칸씩 당김)
--   KR10: Hub에 견적서가 없는 10/20 주문(KR10-2657)이 따로 있어 이 파일에서는 건드리지 않는다 (별도 정정).
--
-- 번호가 겹치지 않도록 낮은 번호부터 차례로 바꾸고, 바꿀 번호를 쓰는 주문이 이미 있으면 건너뛴다.
-- 다음 번호 카운터는 정정 후 가장 큰 번호 + 1 로 맞춘다 (KR11=2611, KR13=2616).
-- KR10 카운터는 Hub에 KR10-2661 주문이 아직 있으므로, KR10 정정이 끝날 때까지 62로 둔다 (번호 충돌 방지).

begin;

-- KR11
update dealer_orders o set order_number = 'KR11-2608' from dealers d
where o.dealer_id = d.id and d.kr_code = 'KR11' and o.order_number = 'KR11-2609'
  and not exists (select 1 from dealer_orders x where x.order_number = 'KR11-2608');
update dealer_orders o set order_number = 'KR11-2609' from dealers d
where o.dealer_id = d.id and d.kr_code = 'KR11' and o.order_number = 'KR11-2610'
  and not exists (select 1 from dealer_orders x where x.order_number = 'KR11-2609');
update dealer_orders o set order_number = 'KR11-2610' from dealers d
where o.dealer_id = d.id and d.kr_code = 'KR11' and o.order_number = 'KR11-2611'
  and not exists (select 1 from dealer_orders x where x.order_number = 'KR11-2610');

-- KR13
update dealer_orders o set order_number = 'KR13-2614' from dealers d
where o.dealer_id = d.id and d.kr_code = 'KR13' and o.order_number = 'KR13-2615'
  and not exists (select 1 from dealer_orders x where x.order_number = 'KR13-2614');
update dealer_orders o set order_number = 'KR13-2615' from dealers d
where o.dealer_id = d.id and d.kr_code = 'KR13' and o.order_number = 'KR13-2616'
  and not exists (select 1 from dealer_orders x where x.order_number = 'KR13-2615');

update dealers set next_seq = 11, last_seq_year = '26' where kr_code = 'KR11';
update dealers set next_seq = 16, last_seq_year = '26' where kr_code = 'KR13';
update dealers set next_seq = 62, last_seq_year = '26' where kr_code = 'KR10';

commit;

-- 검산: KR11 은 2607·2608·2609·2610, KR13 은 2612·2613·2614·2615 가 나오고 카운터가 11 / 16 / 62 이면 정상
select d.kr_code, o.order_number, o.order_date, o.status
from dealer_orders o join dealers d on d.id = o.dealer_id
where (d.kr_code = 'KR11' and o.order_number >= 'KR11-2607')
   or (d.kr_code = 'KR13' and o.order_number >= 'KR13-2612')
order by d.kr_code, o.order_number;

select kr_code, next_seq, last_seq_year from dealers where kr_code in ('KR10','KR11','KR13') order by kr_code;

-- 블랙프라이데이 프로모션 날짜 정정 (2026-11-17)
-- 0082·0055 의 update 가 "starts_on = 2026-11-02" 조건으로 행을 찾았는데, 실제 DB 의 BF 프로모션은
-- 시작일이 2026-10-19 라서 아무 행도 바뀌지 않았다(종료일 11/13, 딜러 주문 마감일 NULL 그대로).
-- → 날짜 조건 없이 promo_group 만으로 두 줄(PRO V, PRO IV)의 종료일·딜러 주문 마감일을 11/18 로 맞춘다.
-- 되돌리기: ends_on = '2026-11-13', dealer_order_until = null

update product_promotions
set ends_on = '2026-11-18',
    dealer_order_until = '2026-11-18',
    updated_at = now()
where promo_group in ('bf2026_pro_v', 'bf2026_pro_iv');

select name, promo_group, active, starts_on, dealer_order_until, ends_on
from product_promotions
where promo_group in ('bf2026_pro_v', 'bf2026_pro_iv');

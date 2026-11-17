-- =========================================================================
-- 2026 블랙프라이데이(PRO V·PRO IV) 프로모션 구매 기간을 11/18(수)까지 연장
--
-- 원래: 기간 11/2~11/15 (0037). 종료일(ends_on)만 2026-11-18로 바꿉니다.
-- ※ 0055(딜러 주문 마감일 컬럼)는 아직 실행·배포 전이라 이 파일은 그 컬럼을 쓰지 않습니다.
--   (실행했을 때 "dealer_order_until does not exist" 오류가 난 이유)
-- 가격·수량 한도·대상 상품은 그대로입니다. 딜러당 수량 한도(10개)는 연장된 기간 전체
--   (11/2~11/18)를 합쳐서 셉니다.
-- 한국 날짜 기준이라 11/18 23:59(KST)까지 행사가 주문이 가능하고, 11/19 00:00부터 정상가입니다.
-- =========================================================================

update product_promotions
set ends_on = '2026-11-18',
    updated_at = now()
where promo_group in ('bf2026_pro_v', 'bf2026_pro_iv')
  and starts_on = '2026-11-02';

-- 확인: 두 줄 모두 active = true, ends_on = 2026-11-18 이면 정상입니다.
select name, active, starts_on, ends_on
from product_promotions
where promo_group in ('bf2026_pro_v', 'bf2026_pro_iv');

-- [되돌리기] 필요할 때만 아래 주석(--)을 풀어 실행하세요. 원래 종료일(11/15)로 돌립니다.
-- update product_promotions
-- set ends_on = '2026-11-15', updated_at = now()
-- where promo_group in ('bf2026_pro_v', 'bf2026_pro_iv') and starts_on = '2026-11-02';

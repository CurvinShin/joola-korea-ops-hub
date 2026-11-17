-- =========================================================================
-- 프로모션 "딜러 주문 마감일" — 프로모션 기간(starts_on ~ ends_on)은 그대로 두고,
-- 딜러가 주문 화면에서 행사가로 주문할 수 있는 마지막 날을 따로 둔다.
--
-- 예: 2026 블랙프라이데이는 11/2~11/15 진행이지만 딜러 주문은 11/13까지.
--   - dealer_order_until이 비어 있으면(null) 지금처럼 종료일(ends_on)까지 주문 가능.
--   - 딜러 조회 정책(RLS)이 마감일 다음 날부터 프로모션을 숨긴다 → 딜러 주문 화면과
--     딜러가 직접 넣는 주문의 서버 가격 계산(RLS가 그대로 적용됨) 둘 다 정상가로 돌아간다.
--   - 관리자(staff)는 기존처럼 종료일까지 행사가로 계산한다 — 마감 전에 들어온 딜러
--     주문을 담당자가 11/14~15에 고쳐도 행사가가 풀리지 않게.
--   - 딜러당 수량 한도는 기존처럼 프로모션 기간(starts_on ~ ends_on) 전체로 센다.
--
-- ★ 앱 배포(푸시)보다 먼저 실행하세요. 새 앱 코드는 dealer_order_until 컬럼을 읽습니다.
-- 되돌리기: 맨 아래 [되돌리기] 참고. 마감일만 없애려면 프로모션 관리 화면에서
--          "딜러 주문 마감일" 칸을 비우고 저장하면 됩니다.
-- =========================================================================

alter table product_promotions add column if not exists dealer_order_until date;

alter table product_promotions drop constraint if exists product_promotions_dealer_order_until_range;
alter table product_promotions add constraint product_promotions_dealer_order_until_range
  check (dealer_order_until is null or (dealer_order_until >= starts_on and dealer_order_until <= ends_on));

comment on column product_promotions.dealer_order_until is
  '딜러가 행사가로 주문할 수 있는 마지막 날(한국 날짜). null이면 ends_on까지.';

-- 딜러 조회 정책: "오늘(KST)"이 시작일 ~ 딜러 주문 마감일(없으면 종료일) 안일 때만 보인다.
-- (0038과 같은 KST 기준. 바뀐 곳은 ends_on → coalesce(dealer_order_until, ends_on)뿐)
drop policy if exists product_promotions_select_dealer on product_promotions;
create policy product_promotions_select_dealer on product_promotions
  for select using (
    current_dealer_id() is not null
    and active
    and (now() at time zone 'Asia/Seoul')::date between starts_on and coalesce(dealer_order_until, ends_on)
  );

drop policy if exists product_promotion_items_select_dealer on product_promotion_items;
create policy product_promotion_items_select_dealer on product_promotion_items
  for select using (
    current_dealer_id() is not null
    and exists (
      select 1 from product_promotions pp
      where pp.id = promotion_id
        and pp.active
        and (now() at time zone 'Asia/Seoul')::date between pp.starts_on and coalesce(pp.dealer_order_until, pp.ends_on)
    )
  );

-- 2026 블랙프라이데이(PRO V·PRO IV): 딜러 주문 마감 11/18
-- (원래 11/13 마감 · 종료 11/15 였으나 0082에서 종료일을 11/18로 연장했고, 딜러 주문 마감도 11/18로 한다 — 2026-11-17 확정)
update product_promotions
set dealer_order_until = '2026-11-18', updated_at = now()
where promo_group in ('bf2026_pro_v', 'bf2026_pro_iv')
  and starts_on = '2026-11-02' and ends_on = '2026-11-18';

-- 확인: 두 줄 모두 dealer_order_until = 2026-11-18 이고 ends_on = 2026-11-18 이면 정상입니다.
select name, starts_on, dealer_order_until, ends_on
from product_promotions
where promo_group in ('bf2026_pro_v', 'bf2026_pro_iv');

-- [되돌리기] 필요할 때만 아래 주석(--)을 풀어 실행하세요. 정책을 0038 상태로 돌리고 컬럼을 지웁니다.
-- drop policy if exists product_promotions_select_dealer on product_promotions;
-- create policy product_promotions_select_dealer on product_promotions
--   for select using (
--     current_dealer_id() is not null and active
--     and (now() at time zone 'Asia/Seoul')::date between starts_on and ends_on
--   );
-- drop policy if exists product_promotion_items_select_dealer on product_promotion_items;
-- create policy product_promotion_items_select_dealer on product_promotion_items
--   for select using (
--     current_dealer_id() is not null
--     and exists (
--       select 1 from product_promotions pp
--       where pp.id = promotion_id and pp.active
--         and (now() at time zone 'Asia/Seoul')::date between pp.starts_on and pp.ends_on
--     )
--   );
-- alter table product_promotions drop constraint if exists product_promotions_dealer_order_until_range;
-- alter table product_promotions drop column if exists dealer_order_until;

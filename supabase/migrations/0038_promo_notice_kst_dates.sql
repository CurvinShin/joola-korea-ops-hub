-- =========================================================================
-- 프로모션/공지 딜러 조회 정책의 "오늘"을 한국 시간(KST) 기준으로 맞춘다.
--
-- 0035/0036에서는 current_date를 썼는데, Supabase DB는 UTC라서 한국 시간
-- 00:00~09:00 사이에는 "어제"로 판정된다 — 예를 들어 11/2 00:00(KST)에 시작하는
-- 프로모션이 오전 9시가 돼서야 딜러에게 보이고, 서버 가격 계산(앱 코드는 KST
-- 기준)과도 어긋난다. 정책이 보는 날짜를 앱과 같은 KST로 통일한다.
-- =========================================================================

drop policy if exists product_promotions_select_dealer on product_promotions;
create policy product_promotions_select_dealer on product_promotions
  for select using (
    current_dealer_id() is not null
    and active
    and (now() at time zone 'Asia/Seoul')::date between starts_on and ends_on
  );

drop policy if exists product_promotion_items_select_dealer on product_promotion_items;
create policy product_promotion_items_select_dealer on product_promotion_items
  for select using (
    current_dealer_id() is not null
    and exists (
      select 1 from product_promotions pp
      where pp.id = promotion_id
        and pp.active
        and (now() at time zone 'Asia/Seoul')::date between pp.starts_on and pp.ends_on
    )
  );

drop policy if exists site_notices_select_dealer on site_notices;
create policy site_notices_select_dealer on site_notices
  for select using (
    current_dealer_id() is not null
    and active
    and (now() at time zone 'Asia/Seoul')::date >= publish_on
    and (expires_on is null or (now() at time zone 'Asia/Seoul')::date <= expires_on)
    and (
      target_mode = 'all'
      or exists (
        select 1 from notice_dealer_targets t
        where t.notice_id = site_notices.id and t.dealer_id = current_dealer_id()
      )
    )
  );

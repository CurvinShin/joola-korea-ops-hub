-- =========================================================================
-- 2026 블랙프라이데이 프로모션 (2026-11-02 월 ~ 2026-11-15 일, 2주간)
--   - PRO V 전 쉐입(Global 라인업만, DTC/워시드 인디고/랠리로켓 제외):
--     소비자가 283,900원 고정, 딜러 25% 할인, 딜러당 최대 10개
--   - PRO IV 전 쉐입(Global + Asia Colorway/DTC 포함, 미니 패들 제외):
--     소비자가 141,900원 고정, 딜러 25% 할인, 딜러당 최대 10개
-- =========================================================================

with pro_v as (
  insert into product_promotions (name, promo_group, promo_price, discount_rate_percent, max_qty_per_dealer, starts_on, ends_on)
  values ('2026 블랙프라이데이 — PRO V', 'bf2026_pro_v', 283900, 25, 10, '2026-11-02', '2026-11-15')
  returning id
),
pro_iv as (
  insert into product_promotions (name, promo_group, promo_price, discount_rate_percent, max_qty_per_dealer, starts_on, ends_on)
  values ('2026 블랙프라이데이 — PRO IV', 'bf2026_pro_iv', 141900, 25, 10, '2026-11-02', '2026-11-15')
  returning id
)
insert into product_promotion_items (promotion_id, product_id)
select (select id from pro_v), p.id
from products p
where p.sku in (
  '600589', '600592', -- Agassi Pro V Royal Blue 14/16mm (Global)
  '600595',           -- Graf Pro V Seaside Green 16mm (Global)
  '600580', '600583', -- Hyperion Pro V Bolt Blue 14/16mm (Global)
  '600574', '600577', -- Kosmos Pro V Surge Green 14/16mm (Global)
  '600556', '600559', -- Perseus Pro V Blaze Red 14/16mm (Global)
  '600562',           -- Perseus Pro V Breeze Blue 16mm (Global)
  '600565', '600568', -- Scorpeus Pro V JOOLA Yellow 14/16mm (Global)
  '600571'            -- Scorpeus Pro V Club Green 16mm (Global)
)
union all
select (select id from pro_iv), p.id
from products p
where p.sku in (
  '300834', '300837', -- SS25 Agassi IV 14/16mm (Global)
  '300840',           -- SS25 Graf IV 16mm (Global)
  '300828', '300831', '300825', -- SS25 Hyperion IV 14/16mm + Simone 16mm (Global)
  '300813', '300816', -- SS25 Magnus IV 14/16mm (Global)
  '300807', '300810', -- SS25 Perseus IV 14/16mm (Global)
  '300822', '300819', -- SS25 Scorpeus IV 14/16mm (Global)
  '600159', '600160', -- Hyperion Pro IV Asia Colorway 14/16mm (DTC)
  '600147',           -- Magnus Pro IV 14mm Asia Colorway (DTC)
  '600015', '600016', -- Perseus Pro IV Asia Colorway 14/16mm (DTC)
  '600153'            -- Scorpeus Pro IV 14mm Asia Colorway (DTC)
);

-- 확인용: 각 그룹에 기대한 개수(13개, 18개)만큼 상품이 매칭됐는지 체크.
-- 결과가 다르면 SKU가 바뀌었거나 상품이 없는 것 — 수동으로 확인할 것.
do $$
declare
  v_count int;
  iv_count int;
begin
  select count(*) into v_count from product_promotion_items ppi
    join product_promotions pp on pp.id = ppi.promotion_id
    where pp.promo_group = 'bf2026_pro_v';
  select count(*) into iv_count from product_promotion_items ppi
    join product_promotions pp on pp.id = ppi.promotion_id
    where pp.promo_group = 'bf2026_pro_iv';
  if v_count <> 13 then
    raise warning 'bf2026_pro_v expected 13 matched products, got %', v_count;
  end if;
  if iv_count <> 18 then
    raise warning 'bf2026_pro_iv expected 18 matched products, got %', iv_count;
  end if;
end $$;

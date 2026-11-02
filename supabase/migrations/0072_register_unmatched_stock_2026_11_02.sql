-- =========================================================================
-- 재고 최신화에서 "카탈로그 미매칭"으로 남은 품목 중 필요한 것만 제품으로 등록 (2026-11-02)
--
-- 이번에 등록하는 품목
--   - 604673 POWER FX Perseus 16mm #3 - Global - Freeze : 소비자가 299,000원
--   - R4LLy 신발 601xxx 29종 : 소비자가 259,000원
--       딜러가(부가세 10% 미포함, 앱이 소비자가 ÷ 1.1 × (1 − 할인율)로 계산):
--         35% 딜러 153,000원 / 30% 딜러 164,800원 (모두 부가세 미포함)
--   - 604670 Perseus POWER FX Mischief 16mm (DTC): 이미 등록돼 있으나 소비자가가 비어 있어
--       딜러 화면에서 0원으로 보일 수 있었다 → 299,000원으로 채움 (가격이 비어 있을 때만).
--
-- 이미 제품으로 등록돼 있는데 미매칭 목록에만 남은 6건(601885·601884·601029·600298·
-- 600989·600990)은 미매칭 목록에서만 지운다. (재고 칸이 비어 있으면 그 수량으로 채운다.)
--
-- 제외: 의류(300493·300450·Women's Club Short Sleeve Crew Neck), 가격을 정하지 못한
--   용품(18558·18557·22285·15387·600010·600481·600991·600992)은 이번에 등록하지 않고
--   미매칭 목록에 그대로 둔다. "(샘플)" 중복 행과 캡처하지 않은 행도 건드리지 않는다.
--
-- 제품 이름·상품코드(이지어드민)·재고 수량은 미매칭 목록(catalog_gaps)의 값을 그대로 쓴다.
-- 카테고리·유형·데모구매 가능 여부는 같은 계열 상품(604672, 600670)을 그대로 따른다.
-- =========================================================================

-- 1) 604670 소비자가 채우기
update products set unit_price = 299000 where sku = '604670' and unit_price is null;

do $$
declare
  v_new_skus text[] := array[
    '604673',
    '601457','601458','601459','601460','601461','601462','601463',
    '601471','601472','601473','601474','601475','601476','601477',
    '601509','601512','601513','601514','601515',
    '601521','601524','601525','601526','601527',
    '601533','601536','601537','601538','601539'
  ];
  v_existing_skus text[] := array['601885','601884','601029','600298','600989','600990'];
begin
  -- 미매칭 목록에서 대상 행을 고른다. 같은 상품코드 행이 여럿이면 수량이 큰 하나만,
  -- "(샘플)" 행은 제외한다.
  create temp table _picked (
    id uuid, sku text, source_sku text, name text, qty integer
  ) on commit drop;

  insert into _picked (id, sku, source_sku, name, qty)
  select distinct on (x.sku) x.id, x.sku, x.source_sku, x.name, x.qty
  from (
    select
      g.id,
      substring(regexp_replace(g.source_name, '^율라코리아', '') from '^[0-9]+') as sku,
      g.source_sku,
      btrim(g.source_name) as name,
      g.qty
    from catalog_gaps g
    where g.source_name not like '%(샘플)%'
  ) x
  where x.sku = any (v_new_skus) or x.sku = any (v_existing_skus)
  order by x.sku, x.qty desc;

  -- 2) 새 제품 등록 (이미 같은 SKU가 있으면 건너뜀)
  insert into products (sku, ezadmin_code, name, category, subcategory, product_type,
                        unit_price, discontinued, demo_purchase_allowed)
  select
    p.sku,
    p.source_sku,
    p.name,
    case when p.sku = '604673' then r1.category else coalesce(r2.category, '신발') end,
    case when p.sku = '604673' then r1.subcategory else r2.subcategory end,
    case when p.sku = '604673' then coalesce(r1.product_type, 'hardgoods')
         else coalesce(r2.product_type, 'hardgoods') end,
    case when p.sku = '604673' then 299000 else 259000 end,
    false,
    case when p.sku = '604673' then coalesce(r1.demo_purchase_allowed, true)
         else coalesce(r2.demo_purchase_allowed, true) end
  from _picked p
  left join (select category, subcategory, product_type, demo_purchase_allowed
             from products where sku = '604672' limit 1) r1 on true
  left join (select category, subcategory, product_type, demo_purchase_allowed
             from products where sku = '600670' limit 1) r2 on true
  where p.sku = any (v_new_skus)
  on conflict (sku) do nothing;

  -- 3) 재고 수량 채우기 (재고 칸이 아직 없는 제품만)
  insert into inventory (product_id, current_stock)
  select pr.id, p.qty
  from _picked p
  join products pr on pr.sku = p.sku
  where not exists (select 1 from inventory i where i.product_id = pr.id)
  on conflict (product_id) do nothing;

  -- 4) 처리한 행을 미매칭 목록에서 지운다 (제품이 실제로 존재하는 행만)
  delete from catalog_gaps
  where id in (
    select p.id from _picked p where exists (select 1 from products pr where pr.sku = p.sku)
  );
end $$;

-- 5) 검산 — 등록한 신규 품목이 30건(604673 + 신발 29종), 재고 칸이 없는 것은 0건이면 정상
select
  count(*) filter (where p.sku = '604673')                    as freeze,
  count(*) filter (where p.sku like '6014%' or p.sku like '6015%') as shoes,
  count(*) filter (where i.product_id is null)                as no_inventory_row
from products p
left join inventory i on i.product_id = p.id
where p.sku = '604673'
   or p.sku in ('601457','601458','601459','601460','601461','601462','601463',
                '601471','601472','601473','601474','601475','601476','601477',
                '601509','601512','601513','601514','601515',
                '601521','601524','601525','601526','601527',
                '601533','601536','601537','601538','601539');

select sku, name, unit_price from products where sku in ('604673', '604670') order by sku;

-- =========================================================================
-- 딜러 주문 화면에 "신제품" 표시를 하기 위해 dealer_catalog 뷰에
-- products.new_arrival_batch(신제품으로 등록된 날짜, 0019)를 노출한다.
--
-- 기존 컬럼과 순서는 그대로 두고 맨 끝에 한 컬럼만 추가한다(create or replace view는
-- 끝에 컬럼을 추가하는 것만 허용). 다른 컬럼/조건(단종 상품 제외)은 0018과 동일하다.
-- 원가(unit_cost)는 여전히 노출하지 않는다.
-- =========================================================================

create or replace view dealer_catalog as
  select
    p.id as product_id,
    p.sku,
    p.name,
    p.category,
    p.image_url,
    p.unit_price,
    greatest(coalesce(i.current_stock, 0) - coalesce(i.reserved_stock, 0), 0) as available_stock,
    p.product_type,
    p.fixed_dealer_price,
    p.subcategory,
    p.demo_purchase_allowed,
    p.new_arrival_batch
  from products p
  left join inventory i on i.product_id = p.id
  where p.discontinued = false;

grant select on dealer_catalog to authenticated;

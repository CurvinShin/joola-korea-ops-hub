-- =========================================================================
-- Kosmos Pro V Rally Rocket 16mm (DTC) SKU 바로잡기: 601057 → 601067
--
-- 이지어드민 재고·과거 견적서는 601067인데 앱 상품은 601057로 등록되어 있어
-- 재고 최신화 때 매칭이 안 되고 "재고 없음"으로 보였다.
--  1) 상품 SKU를 601067로 변경 (재고/주문 연결은 product_id라 그대로 유지)
--  2) 재고 최신화 때 "미매칭"으로 쌓인 같은 상품의 재고 수량을 inventory로 옮김
--  3) 미매칭 목록(catalog_gaps)의 중복 행 정리
-- 상품 이미지는 파일명(601057.webp) 그대로 쓰므로 image_url은 건드리지 않는다.
-- 되돌리려면: update products set sku='601057' where sku='601067';
-- =========================================================================

do $$
declare
  v_id uuid;
  v_gap_qty integer;
begin
  select id into v_id from products where sku = '601057';
  if v_id is null then
    raise notice '601057 상품이 없어 건너뜀 (이미 변경됐을 수 있음)';
    return;
  end if;
  if exists (select 1 from products where sku = '601067') then
    raise exception '601067 상품이 이미 있습니다. 중복 확인이 필요해 중단합니다.';
  end if;

  update products set sku = '601067' where id = v_id;

  -- 재고 최신화 때 미매칭 목록에 쌓인 같은 상품의 수량 (가장 최근 행)
  select qty into v_gap_qty
    from catalog_gaps
   where source_name like '601067 %'
   order by created_at desc
   limit 1;

  if v_gap_qty is not null then
    update inventory set current_stock = v_gap_qty, updated_at = now()
     where product_id = v_id;
    delete from catalog_gaps where source_name like '601067 %';
  end if;
end $$;

-- 확인용: 변경 결과 (1행, sku=601067, 재고 숫자 확인)
select p.sku, p.name, i.current_stock
  from products p left join inventory i on i.product_id = p.id
 where p.sku = '601067';

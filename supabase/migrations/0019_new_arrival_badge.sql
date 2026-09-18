-- =========================================================================
-- "신제품" 표시 기능 — 재고 페이지 맨 위에 최근 신제품을 자동으로 pin.
--
-- products.new_arrival_batch (date, nullable): 신제품으로 등록된 날짜.
-- 재고 페이지는 이 값이 "현재 등록된 값 중 가장 최근 날짜"와 같은 상품만
-- 맨 위 "신제품" 영역에 보여준다. 같은 날 등록된 상품끼리는 계속 함께
-- 표시되고, 이후 더 최근 날짜로 등록되는 다음 배치가 생기면 자동으로
-- 이전 배치가 내려간다 (수동으로 이전 표시를 꺼줄 필요 없음).
--
-- /inventory 제품 등록·수정 화면에서 날짜를 직접 넣거나 비울 수 있어,
-- 마이그레이션 없이도 관리자가 직접 켜고 끌 수 있다.
--
-- 2026-09-17 오더리스트로 등록된 9개 신제품(0018)에 최초 값을 채운다.
-- Safe to run as a normal SQL Editor execution (no new enum values here).
-- =========================================================================

alter table products add column if not exists new_arrival_batch date;

create or replace view inventory_status as
  select
    p.id as product_id,
    p.sku,
    p.name,
    p.category,
    p.discontinued,
    coalesce(i.current_stock, 0) as current_stock,
    coalesce(i.reserved_stock, 0) as reserved_stock,
    coalesce(i.current_stock, 0) - coalesce(i.reserved_stock, 0) as available_stock,
    coalesce(i.incoming_qty, 0) as incoming_qty,
    i.eta,
    coalesce(i.low_stock_threshold, 10) as low_stock_threshold,
    (coalesce(i.current_stock, 0) - coalesce(i.reserved_stock, 0)) <= coalesce(i.low_stock_threshold, 10) as is_low_stock,
    p.image_url,
    p.product_type,
    p.fixed_dealer_price,
    p.subcategory,
    p.demo_purchase_allowed,
    p.new_arrival_batch
  from products p
  left join inventory i on i.product_id = p.id;

update products set new_arrival_batch = '2026-09-17'
where sku in ('604672', '604680', '601884', '601885', '601955', '601956', '601029', '601057', '600298');

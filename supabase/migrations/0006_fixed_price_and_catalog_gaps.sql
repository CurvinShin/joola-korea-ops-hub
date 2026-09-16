-- =========================================================================
-- 1) Fixed dealer supply price override.
--    A few items (e.g. JOOLA Team socks) are sold at a flat price agreed
--    with dealers that doesn't follow the hardgoods/apparel formulas at
--    all. When set, this wins over the formula for a *regular* order;
--    demo purchases always keep the uniform 65%-off-MSRP formula.
-- 2) "카탈로그 미매칭 재고" (catalog gap) board — 실사 재고에는 있지만
--    가격표에 매칭이 안 돼 products 테이블에 올리지 못한 품목을 추적.
-- Safe to run as a normal SQL Editor execution (no new enum values here).
-- =========================================================================

alter table products add column if not exists fixed_dealer_price numeric;

create table if not exists catalog_gaps (
  id uuid primary key default gen_random_uuid(),
  source_sku text,
  source_name text not null,
  qty integer not null default 0,
  note text default '재고는 있으나 카탈로그 가격/유형 정보 없음',
  created_at timestamptz not null default now()
);

alter table catalog_gaps enable row level security;

create policy catalog_gaps_select_authenticated on catalog_gaps
  for select to authenticated using (true);
create policy catalog_gaps_write_authenticated on catalog_gaps
  for all to authenticated using (true) with check (true);

-- Re-create views appending fixed_dealer_price at the end (Postgres
-- requires CREATE OR REPLACE VIEW to keep existing column names/positions;
-- this matches the *live* column order established by 0005, not the
-- original 0003 file, which had already drifted once before).
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
    p.fixed_dealer_price
  from products p
  left join inventory i on i.product_id = p.id;

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
    p.fixed_dealer_price
  from products p
  left join inventory i on i.product_id = p.id
  where p.discontinued = false;

grant select on dealer_catalog to authenticated;

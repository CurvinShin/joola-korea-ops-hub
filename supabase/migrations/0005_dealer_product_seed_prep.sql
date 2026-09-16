-- =========================================================================
-- Adds columns needed to seed real dealer/product data from the four
-- reference files (dealers.json, catalog_prices.json, current_stock.json),
-- and renames the "sample" order concept to "demo" (dealers never actually
-- receive free samples in practice - a demo purchase is billed at 65% off
-- MSRP, same as a real order, just discounted differently).
-- Safe to run as a normal SQL Editor execution (no new enum values here).
-- =========================================================================

alter table dealers add column if not exists address text;
alter table dealers add column if not exists ship_recipient text;
alter table dealers add column if not exists payment_terms text;
alter table dealers add column if not exists kr_code text unique;
alter table dealers add column if not exists next_seq integer not null default 1;
alter table dealers add column if not exists last_seq_year text;

alter table products add column if not exists product_type text not null default 'hardgoods'
  check (product_type in ('hardgoods', 'apparel'));

-- sample -> demo
alter table dealer_orders drop constraint if exists dealer_orders_order_type_check;
update dealer_orders set order_type = 'demo' where order_type = 'sample';
alter table dealer_orders add constraint dealer_orders_order_type_check
  check (order_type in ('regular', 'demo'));

-- Re-create views appending product_type at the end (Postgres requires
-- CREATE OR REPLACE VIEW to keep existing column names/positions). Note:
-- inventory_status has image_url as its actual last column in production
-- (a prior fix moved it there), not in the position 0003's file shows.
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
    p.product_type
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
    p.product_type
  from products p
  left join inventory i on i.product_id = p.id
  where p.discontinued = false;

grant select on dealer_catalog to authenticated;

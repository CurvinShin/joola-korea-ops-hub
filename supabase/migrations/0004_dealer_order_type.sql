-- =========================================================================
-- Regular-sale vs. sample dealer orders, and an admin-side checkbox for
-- "has this been keyed into 경리나라(accounting) yet?" — the actual
-- 견적서/발주서 document itself is created in 경리나라 by the admin, not
-- inside this app, so we only need to track category + handoff status.
-- Safe to run as a normal SQL Editor execution (no new enum value here).
-- =========================================================================

alter table dealer_orders
  add column if not exists order_type text not null default 'regular'
    check (order_type in ('regular', 'sample'));

alter table dealer_orders
  add column if not exists synced_to_accounting boolean not null default false;

create index if not exists dealer_orders_order_type_idx on dealer_orders (order_type);

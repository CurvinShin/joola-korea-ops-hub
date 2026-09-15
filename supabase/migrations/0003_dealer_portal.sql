-- =========================================================================
-- Dealer self-service order portal.
--
-- Run this AFTER 0002_add_dealer_role.sql has been executed and committed
-- (separate SQL Editor run — see the note in that file).
--
-- Adds:
--   - profiles.dealer_id: links a dealer-portal login to its dealer record
--   - products.image_url: optional product photo, set manually by an admin
--   - is_staff() / current_dealer_id(): RLS helper functions
--   - dealer_catalog view: what a dealer account is allowed to browse
--     (list price + stock, no cost data)
--   - tightened RLS so a 'dealer' account can only read: its own dealer
--     record, the product catalog (via the view above), and its own
--     dealer_orders/dealer_order_items — never other dealers or any
--     internal-only table (tasks, events, purchase orders, sales, etc.)
-- =========================================================================

alter table profiles add column if not exists dealer_id uuid references dealers (id) on delete set null;
create index if not exists profiles_dealer_id_idx on profiles (dealer_id);

alter table products add column if not exists image_url text;

-- Re-create inventory_status so the admin inventory screen can show/edit
-- the new image_url column without a structural change to the view.
create or replace view inventory_status as
  select
    p.id as product_id,
    p.sku,
    p.name,
    p.category,
    p.image_url,
    p.discontinued,
    coalesce(i.current_stock, 0) as current_stock,
    coalesce(i.reserved_stock, 0) as reserved_stock,
    coalesce(i.current_stock, 0) - coalesce(i.reserved_stock, 0) as available_stock,
    coalesce(i.incoming_qty, 0) as incoming_qty,
    i.eta,
    coalesce(i.low_stock_threshold, 10) as low_stock_threshold,
    (coalesce(i.current_stock, 0) - coalesce(i.reserved_stock, 0)) <= coalesce(i.low_stock_threshold, 10) as is_low_stock
  from products p
  left join inventory i on i.product_id = p.id;

-- Is this an internal JOOLA staff account (i.e. NOT a dealer-portal login)?
create or replace function is_staff()
returns boolean as $$
  select current_role_name() <> 'dealer';
$$ language sql stable security definer set search_path = public;

-- dealer_id of the currently authenticated dealer-portal account (null for staff).
create or replace function current_dealer_id()
returns uuid as $$
  select dealer_id from public.profiles where id = auth.uid();
$$ language sql stable security definer set search_path = public;

-- Dealer-facing catalog: list price + available stock only. Never exposes
-- unit_cost (our cost) — dealers query this view, not the products/inventory
-- tables directly (those are now staff-only, see below).
create or replace view dealer_catalog as
  select
    p.id as product_id,
    p.sku,
    p.name,
    p.category,
    p.image_url,
    p.unit_price,
    greatest(coalesce(i.current_stock, 0) - coalesce(i.reserved_stock, 0), 0) as available_stock
  from products p
  left join inventory i on i.product_id = p.id
  where p.discontinued = false;

grant select on dealer_catalog to authenticated;

-- products / inventory: staff only from here on; dealers use dealer_catalog.
drop policy if exists products_select on products;
create policy products_select on products
  for select using (is_staff());

drop policy if exists inventory_select on inventory;
create policy inventory_select on inventory
  for select using (is_staff());

-- dealers: staff can read all dealers; a dealer-portal account may read
-- only its own linked dealer record (needed to show its name/discount rate).
drop policy if exists dealers_select on dealers;
create policy dealers_select on dealers
  for select using (is_staff() or id = current_dealer_id());

-- Every other internal-only table: staff only, dealer-portal excluded entirely.
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'dealer_product_demand', 'sales_transactions',
      'sales_targets', 'purchase_orders', 'purchase_order_items',
      'events', 'event_product_sponsorships', 'facilities',
      'ambassadors', 'marketing_campaigns', 'tasks'
    ])
  loop
    execute format('drop policy if exists %I on %I', t || '_select', t);
    execute format(
      'create policy %I on %I for select using (is_staff())',
      t || '_select', t
    );
  end loop;
end $$;

-- dealer_orders: staff keep full read access; a dealer account may see and
-- create only orders tied to its own dealer_id. Updates/deletes stay
-- admin-only (unchanged can_write() policies from 0001_init.sql).
drop policy if exists dealer_orders_select on dealer_orders;
create policy dealer_orders_select on dealer_orders
  for select using (is_staff() or dealer_id = current_dealer_id());

drop policy if exists dealer_orders_insert on dealer_orders;
create policy dealer_orders_insert on dealer_orders
  for insert with check (
    can_write() or (current_dealer_id() is not null and dealer_id = current_dealer_id())
  );

drop policy if exists dealer_order_items_select on dealer_order_items;
create policy dealer_order_items_select on dealer_order_items
  for select using (
    is_staff()
    or exists (
      select 1 from dealer_orders o
      where o.id = dealer_order_items.order_id
        and o.dealer_id = current_dealer_id()
    )
  );

drop policy if exists dealer_order_items_insert on dealer_order_items;
create policy dealer_order_items_insert on dealer_order_items
  for insert with check (
    can_write()
    or exists (
      select 1 from dealer_orders o
      where o.id = dealer_order_items.order_id
        and o.dealer_id = current_dealer_id()
    )
  );

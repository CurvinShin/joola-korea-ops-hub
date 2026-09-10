-- =========================================================================
-- JOOLA Korea Operations Hub — initial schema
-- Covers all 10 modules from the product spec. MVP screens only use a
-- subset of these tables (dealers, products/inventory, events, tasks,
-- profiles) — the rest exist now so Phase 2 features are additive, not a
-- redesign.
-- =========================================================================

-- ---------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ---------------------------------------------------------------------
-- Roles & profiles
-- One row per auth.users row. Created automatically by a trigger below.
-- Role-based access is modeled from day one even though, in the MVP,
-- every account is created as 'admin' by the app owner.
-- ---------------------------------------------------------------------
create type app_role as enum ('admin', 'sales', 'marketing', 'ecommerce', 'viewer');

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role app_role not null default 'viewer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user is created.
-- The very first user is promoted to admin manually (see README).
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data ->> 'full_name', 'viewer');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Helper used inside RLS policies. STABLE + security definer so it can read
-- `profiles` regardless of caller-level RLS.
create or replace function current_role_name()
returns app_role as $$
  select role from public.profiles where id = auth.uid();
$$ language sql stable security definer set search_path = public;

create or replace function is_admin()
returns boolean as $$
  select current_role_name() = 'admin';
$$ language sql stable security definer set search_path = public;

-- Every authenticated JOOLA staff account can read operational data;
-- only admins (and, later, the module owner role) can write. This keeps
-- the MVP simple (one admin = full access) while giving Phase 2 a real
-- place to add per-role write rules without touching table structure.
create or replace function can_write()
returns boolean as $$
  select current_role_name() in ('admin');
$$ language sql stable security definer set search_path = public;

-- ---------------------------------------------------------------------
-- Dealers
-- ---------------------------------------------------------------------
create type dealer_status as enum ('active', 'pending', 'inactive', 'terminated');
create type dealer_classification as enum ('flagship', 'standard', 'online_only', 'distributor');

create table dealers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  classification dealer_classification not null default 'standard',
  status dealer_status not null default 'pending',
  contact_name text,
  contact_email text,
  contact_phone text,
  region text,
  contract_start date,
  contract_end date,
  discount_rate numeric(5,2) default 0,          -- percent, e.g. 15.00
  moq_target numeric(12,2) default 0,             -- annual minimum order quantity/amount
  outstanding_issues text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index dealers_status_idx on dealers (status);
create index dealers_classification_idx on dealers (classification);

-- ---------------------------------------------------------------------
-- Products & Inventory
-- ---------------------------------------------------------------------
create table products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  category text,
  unit_cost numeric(12,2),
  unit_price numeric(12,2),
  discontinued boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table inventory (
  product_id uuid primary key references products (id) on delete cascade,
  current_stock integer not null default 0,
  reserved_stock integer not null default 0,
  -- available_stock is derived, not stored, so it can never drift out of sync
  incoming_qty integer not null default 0,
  eta date,
  low_stock_threshold integer not null default 10,
  updated_at timestamptz not null default now()
);

create view inventory_status as
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
    (coalesce(i.current_stock, 0) - coalesce(i.reserved_stock, 0)) <= coalesce(i.low_stock_threshold, 10) as is_low_stock
  from products p
  left join inventory i on i.product_id = p.id;

-- Per-dealer standing demand for a product (used to flag shortages against
-- what dealers actually want, not just a flat threshold).
create table dealer_product_demand (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references dealers (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  requested_qty integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (dealer_id, product_id)
);

-- ---------------------------------------------------------------------
-- Dealer orders (also feeds Sales module + YTD purchase amount)
-- ---------------------------------------------------------------------
create type order_status as enum ('draft', 'confirmed', 'shipped', 'delivered', 'cancelled');

create table dealer_orders (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references dealers (id) on delete restrict,
  order_date date not null default current_date,
  status order_status not null default 'draft',
  total_amount numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table dealer_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references dealer_orders (id) on delete cascade,
  product_id uuid not null references products (id) on delete restrict,
  quantity integer not null,
  unit_price numeric(12,2) not null
);

create index dealer_orders_dealer_idx on dealer_orders (dealer_id);

-- ---------------------------------------------------------------------
-- Sales (dealer + e-commerce + event, unified for reporting)
-- ---------------------------------------------------------------------
create type sales_channel as enum ('dealer', 'ecommerce', 'event');

create table sales_transactions (
  id uuid primary key default gen_random_uuid(),
  channel sales_channel not null,
  sale_date date not null default current_date,
  product_id uuid references products (id) on delete set null,
  dealer_id uuid references dealers (id) on delete set null,
  event_id uuid, -- FK added after events table below
  amount numeric(14,2) not null,
  quantity integer,
  source text, -- e.g. "Cafe24", "Naver Smartstore", free text for now
  created_at timestamptz not null default now()
);

create table sales_targets (
  id uuid primary key default gen_random_uuid(),
  period_month date not null, -- store as first-of-month
  channel sales_channel,      -- null = overall target
  target_amount numeric(14,2) not null,
  unique (period_month, channel)
);

-- ---------------------------------------------------------------------
-- Purchase orders / import
-- ---------------------------------------------------------------------
create type shipping_status as enum ('not_shipped', 'in_transit', 'arrived_port', 'cleared_customs', 'delivered');
create type customs_status as enum ('not_started', 'in_progress', 'cleared', 'held');

create table purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number text not null unique,
  supplier text not null,
  order_date date not null default current_date,
  eta date,
  shipping_status shipping_status not null default 'not_shipped',
  customs_status customs_status not null default 'not_started',
  received boolean not null default false,
  total_cost numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  po_id uuid not null references purchase_orders (id) on delete cascade,
  product_id uuid not null references products (id) on delete restrict,
  quantity integer not null,
  unit_cost numeric(12,2) not null
);

-- ---------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------
create table events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_date date not null,
  location text,
  organizer text,
  budget numeric(14,2) default 0,
  expected_participants integer,
  actual_participants integer,
  onsite_sales numeric(14,2) default 0,
  sponsorship_details text,
  notes text,
  post_event_report text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table sales_transactions
  add constraint sales_transactions_event_fk
  foreign key (event_id) references events (id) on delete set null;

create table event_product_sponsorships (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  quantity integer not null default 0,
  notes text
);

-- ---------------------------------------------------------------------
-- Facilities / brand partnerships
-- ---------------------------------------------------------------------
create type partnership_status as enum ('prospect', 'in_discussion', 'active', 'ended');

create table facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  courts_count integer,
  partnership_status partnership_status not null default 'prospect',
  branding_installed boolean not null default false,
  demo_paddles_provided boolean not null default false,
  product_display boolean not null default false,
  sponsorship_details text,
  contact_name text,
  contact_email text,
  contact_phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Players / Ambassadors / Influencers
-- ---------------------------------------------------------------------
create type ambassador_type as enum ('player', 'ambassador', 'influencer');
create type contract_status as enum ('prospect', 'negotiating', 'active', 'expired', 'ended');

create table ambassadors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type ambassador_type not null default 'ambassador',
  contract_status contract_status not null default 'prospect',
  contract_start date,
  contract_end date,
  compensation text,
  equipment_support text,
  kpi text,
  social_media_handle text,
  content_obligations text,
  performance_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Marketing / social media
-- ---------------------------------------------------------------------
create type content_status as enum ('idea', 'drafting', 'in_review', 'scheduled', 'published');
create type approval_status as enum ('pending', 'approved', 'rejected');

create table marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  campaign_name text not null,
  product_id uuid references products (id) on delete set null,
  platform text,
  content_status content_status not null default 'idea',
  publication_date date,
  asset_link text,
  caption text,
  approval_status approval_status not null default 'pending',
  performance_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------
create type task_priority as enum ('low', 'medium', 'high', 'urgent');
create type task_status as enum ('open', 'in_progress', 'blocked', 'done');
create type task_category as enum ('dealer', 'inventory', 'sales', 'purchase_order', 'event', 'facility', 'ambassador', 'marketing', 'general');

create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category task_category not null default 'general',
  priority task_priority not null default 'medium',
  status task_status not null default 'open',
  due_date date,
  related_dealer_id uuid references dealers (id) on delete set null,
  related_event_id uuid references events (id) on delete set null,
  related_product_id uuid references products (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_status_idx on tasks (status);
create index tasks_due_date_idx on tasks (due_date);

-- =========================================================================
-- Row Level Security
-- Every table: authenticated users can read; only 'admin' role can write.
-- This is intentionally uniform and simple for the MVP. Loosen per-table
-- later (e.g. 'sales' role can write marketing_campaigns) without changing
-- table shapes.
-- =========================================================================
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'dealers', 'products', 'inventory', 'dealer_product_demand',
      'dealer_orders', 'dealer_order_items', 'sales_transactions',
      'sales_targets', 'purchase_orders', 'purchase_order_items',
      'events', 'event_product_sponsorships', 'facilities',
      'ambassadors', 'marketing_campaigns', 'tasks'
    ])
  loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy %I on %I for select using (auth.role() = ''authenticated'')',
      t || '_select', t
    );
    execute format(
      'create policy %I on %I for insert with check (can_write())',
      t || '_insert', t
    );
    execute format(
      'create policy %I on %I for update using (can_write()) with check (can_write())',
      t || '_update', t
    );
    execute format(
      'create policy %I on %I for delete using (can_write())',
      t || '_delete', t
    );
  end loop;
end $$;

-- profiles: everyone can read their own + admins can read all; only admins
-- can change roles.
alter table profiles enable row level security;

create policy profiles_select_own on profiles
  for select using (auth.uid() = id or is_admin());

create policy profiles_update_own on profiles
  for update using (auth.uid() = id or is_admin())
  with check (auth.uid() = id or is_admin());

-- Only admins may change the `role` column on someone else's row; enforced
-- at the application layer for the MVP (single admin), tightened with a
-- trigger in Phase 2 once multiple roles exist.

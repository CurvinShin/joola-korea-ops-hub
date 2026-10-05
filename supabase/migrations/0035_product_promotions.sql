-- =========================================================================
-- 기간 한정 프로모션(예: 블랙프라이데이) — 딜러 등급별 할인율과 무관하게,
-- 정해진 기간 동안 특정 상품들에 고정 소비자가 + 고정 할인율을 적용하고,
-- 딜러당 구매 수량을 제한한다.
--
-- products.fixed_dealer_price(0018 마이그레이션 참고)와 달리 "기간이 끝나면
-- 자동으로 원래 가격으로 돌아간다" — 이벤트가 끝난 뒤 되돌리는 걸 깜빡할
-- 걱정이 없다. 여러 상품(예: PRO V 전 쉐입)이 같은 promo_group을 공유하면
-- max_qty_per_dealer가 그 그룹 전체 합산 수량에 적용된다(상품 하나하나가
-- 아니라).
--
-- 데모구매(is_demo=true)는 이 프로모션 대상에서 항상 제외된다 — 데모구매는
-- 기존 65%-off-MSRP 공식을 그대로 쓴다(lib/utils/pricing.ts 참고).
-- =========================================================================

create table product_promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- 같은 그룹을 공유하는 여러 프로모션(상품군)이 딜러당 구매 수량 제한을
  -- 합산해서 공유하도록 묶는 키. 예: 'bf2026_pro_v', 'bf2026_pro_iv'.
  promo_group text not null,
  -- 프로모션 기간 동안 쓰는 고정 소비자가(부가세 포함) — products.unit_price
  -- 를 건드리지 않고, 이 금액을 기준으로 할인율을 적용한다.
  promo_price numeric(12, 2) not null check (promo_price >= 0),
  -- 딜러 등급(discount_rate)과 무관하게 적용되는 고정 할인율(%).
  discount_rate_percent numeric(5, 2) not null check (discount_rate_percent >= 0 and discount_rate_percent <= 100),
  -- 딜러 한 곳이 이 기간 동안(같은 promo_group 전체 합산) 구매 가능한 최대
  -- 수량. null이면 제한 없음.
  max_qty_per_dealer integer check (max_qty_per_dealer is null or max_qty_per_dealer > 0),
  starts_on date not null,
  ends_on date not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create index product_promotions_group_idx on product_promotions (promo_group);
create index product_promotions_window_idx on product_promotions (starts_on, ends_on);

create table product_promotion_items (
  promotion_id uuid not null references product_promotions (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  primary key (promotion_id, product_id)
);

create index product_promotion_items_product_idx on product_promotion_items (product_id);

alter table product_promotions enable row level security;
alter table product_promotion_items enable row level security;

-- staff: 전체(과거/미래 포함) 조회 가능 — 관리 화면에서 지난/예정 프로모션도
-- 봐야 하므로.
create policy product_promotions_select_staff on product_promotions
  for select using (is_staff());
-- 딜러: 오늘 날짜 기준으로 활성화된 프로모션만 조회 가능 — 주문 화면의
-- 가격 재계산(RLS가 그대로 적용되는 서버 클라이언트)과, 향후 예정된
-- 프로모션을 딜러에게 미리 노출하지 않기 위함 둘 다를 위해서다.
create policy product_promotions_select_dealer on product_promotions
  for select using (
    current_dealer_id() is not null
    and active
    and current_date between starts_on and ends_on
  );

create policy product_promotions_insert on product_promotions
  for insert with check (can_write());
create policy product_promotions_update on product_promotions
  for update using (can_write()) with check (can_write());
create policy product_promotions_delete on product_promotions
  for delete using (can_write());

create policy product_promotion_items_select_staff on product_promotion_items
  for select using (is_staff());
create policy product_promotion_items_select_dealer on product_promotion_items
  for select using (
    current_dealer_id() is not null
    and exists (
      select 1 from product_promotions pp
      where pp.id = promotion_id and pp.active and current_date between pp.starts_on and pp.ends_on
    )
  );
create policy product_promotion_items_insert on product_promotion_items
  for insert with check (can_write());
create policy product_promotion_items_delete on product_promotion_items
  for delete using (can_write());

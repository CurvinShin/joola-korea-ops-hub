-- =========================================================================
-- 딜러 포털(/order) 상단에 띄우는 공지사항. 전체 딜러 대상이거나 특정
-- 딜러만 대상으로 지정할 수 있고, 딜러가 "확인" 버튼을 누른 기록을
-- 남긴다(약한 확인 — 안 눌러도 Hub 사용에는 지장 없음, 관리자 화면에서
-- 누가 확인했는지만 추적).
-- =========================================================================

create type notice_target_mode as enum ('all', 'specific');

create table site_notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  target_mode notice_target_mode not null default 'all',
  publish_on date not null default current_date,
  expires_on date, -- null이면 수동으로 비활성화하기 전까지 계속 노출
  active boolean not null default true,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_on is null or expires_on >= publish_on)
);

-- target_mode = 'specific'일 때만 의미 있는 대상 딜러 목록.
create table notice_dealer_targets (
  notice_id uuid not null references site_notices (id) on delete cascade,
  dealer_id uuid not null references dealers (id) on delete cascade,
  primary key (notice_id, dealer_id)
);

create table notice_acknowledgments (
  notice_id uuid not null references site_notices (id) on delete cascade,
  dealer_id uuid not null references dealers (id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  primary key (notice_id, dealer_id)
);

alter table site_notices enable row level security;
alter table notice_dealer_targets enable row level security;
alter table notice_acknowledgments enable row level security;

-- staff: 전부 조회(초안/만료 포함).
create policy site_notices_select_staff on site_notices
  for select using (is_staff());
-- 딜러: 공개되고(활성+게시일 지남+만료 전) + (전체 대상이거나 본인이
-- notice_dealer_targets에 들어있는) 공지만 조회 가능.
create policy site_notices_select_dealer on site_notices
  for select using (
    current_dealer_id() is not null
    and active
    and current_date >= publish_on
    and (expires_on is null or current_date <= expires_on)
    and (
      target_mode = 'all'
      or exists (
        select 1 from notice_dealer_targets t
        where t.notice_id = site_notices.id and t.dealer_id = current_dealer_id()
      )
    )
  );
create policy site_notices_insert on site_notices
  for insert with check (can_write());
create policy site_notices_update on site_notices
  for update using (can_write()) with check (can_write());
create policy site_notices_delete on site_notices
  for delete using (can_write());

create policy notice_dealer_targets_select_staff on notice_dealer_targets
  for select using (is_staff());
create policy notice_dealer_targets_select_dealer on notice_dealer_targets
  for select using (dealer_id = current_dealer_id());
create policy notice_dealer_targets_insert on notice_dealer_targets
  for insert with check (can_write());
create policy notice_dealer_targets_delete on notice_dealer_targets
  for delete using (can_write());

create policy notice_acknowledgments_select_staff on notice_acknowledgments
  for select using (is_staff());
create policy notice_acknowledgments_select_dealer on notice_acknowledgments
  for select using (dealer_id = current_dealer_id());
-- 딜러 본인이 "확인" 버튼을 누를 때 자기 dealer_id로만 기록할 수 있다.
create policy notice_acknowledgments_insert_dealer on notice_acknowledgments
  for insert with check (dealer_id = current_dealer_id());
create policy notice_acknowledgments_delete_staff on notice_acknowledgments
  for delete using (can_write());

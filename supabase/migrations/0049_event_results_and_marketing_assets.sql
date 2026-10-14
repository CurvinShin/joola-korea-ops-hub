-- =========================================================================
-- 0049: 이벤트 결과 정리 + 마케팅 에셋(다운로드 링크 모음)
--
-- 1) events: 행사가 끝난 뒤 결과를 적을 수 있게 실제 지출액(actual_cost)과
--    사진·자료 링크(result_links) 칸을 추가한다. (실제 참가 인원, 현장 매출,
--    행사 후 리포트 칸은 이미 있다.)
-- 2) marketing_assets: 제품 이미지, 브로셔, 로고, 영상 등 다운로드 링크를 모아 둔다.
--    audience로 공개 범위를 정한다(기본 dealers = 딜러에게도 보임, internal = 관리자만).
--    쓰기(추가/수정/삭제)는 can_write()(admin)만 가능하다.
-- =========================================================================
alter table events add column if not exists actual_cost numeric(14,2);
alter table events add column if not exists result_links text;

create table if not exists marketing_assets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default '기타',
  url text not null,
  description text,
  audience text not null default 'dealers' check (audience in ('internal', 'dealers')),
  sort_order integer not null default 0,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marketing_assets_category_idx on marketing_assets (category, sort_order, created_at desc);

alter table marketing_assets enable row level security;

drop policy if exists marketing_assets_select_staff on marketing_assets;
create policy marketing_assets_select_staff on marketing_assets
  for select using (is_staff());
drop policy if exists marketing_assets_select_dealer on marketing_assets;
create policy marketing_assets_select_dealer on marketing_assets
  for select using (audience = 'dealers' and current_dealer_id() is not null);
drop policy if exists marketing_assets_insert on marketing_assets;
create policy marketing_assets_insert on marketing_assets
  for insert with check (can_write());
drop policy if exists marketing_assets_update on marketing_assets;
create policy marketing_assets_update on marketing_assets
  for update using (can_write()) with check (can_write());
drop policy if exists marketing_assets_delete on marketing_assets;
create policy marketing_assets_delete on marketing_assets
  for delete using (can_write());

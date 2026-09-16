-- =========================================================================
-- 셀프서비스 재고 최신화 이력 테이블.
-- "현재고조회" 실사 엑셀을 업로드해서 반영할 때마다 한 줄씩 기록한다 —
-- 재고 페이지에 "마지막 최신화" 시각을 보여주기 위함
-- (joola_pricing_stock_logic.md §3의 실사 기준일시(updatedAt) 개념).
-- Safe to run as a normal SQL Editor execution.
-- =========================================================================

create table if not exists inventory_snapshots (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  snapshot_at timestamptz not null,
  uploaded_by text,
  total_rows integer not null default 0,
  matched_count integer not null default 0,
  gap_updated_count integer not null default 0,
  gap_new_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table inventory_snapshots enable row level security;

create policy inventory_snapshots_select_authenticated on inventory_snapshots
  for select to authenticated using (true);
create policy inventory_snapshots_insert_authenticated on inventory_snapshots
  for insert to authenticated with check (true);

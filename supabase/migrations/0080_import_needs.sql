-- =========================================================================
-- 0080: 상시 수입 필요 목록 (관리자가 수시로 적어두는 수입 필요 품목)
--
-- 딜러 수입 요청(import_requests)과 별개로, 지사에서 직접 필요한 품목
-- (SSK 대표 지참분, 샘플, 행사 물량 등)을 미리 적어둔다. 실제 수입 시기에
-- "수입 요청 > 수입요청서 만들기"에서 본사 재고 CSV와 함께 합산해 엑셀로 내려받는다.
-- status: open(수입 필요) → done(수입요청서에 반영·처리 완료)
-- =========================================================================
create table if not exists import_needs (
  id uuid primary key default gen_random_uuid(),
  sku text not null,
  product_name text not null default '',
  -- 제품군(PRO IV / PRO V / 볼 / 모자 ...). 비워두면 상품명·본사 CSV 분류로 자동 판단.
  category text,
  quantity integer not null check (quantity > 0),
  note text,
  status text not null default 'open' check (status in ('open', 'done')),
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists import_needs_status_idx on import_needs (status, created_at);

alter table import_needs enable row level security;

create policy import_needs_select_staff on import_needs
  for select using (is_staff());
create policy import_needs_insert_staff on import_needs
  for insert with check (can_write());
create policy import_needs_update_staff on import_needs
  for update using (can_write()) with check (can_write());
create policy import_needs_delete_staff on import_needs
  for delete using (can_write());

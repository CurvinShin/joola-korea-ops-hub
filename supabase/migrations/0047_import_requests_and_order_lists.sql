-- =========================================================================
-- 0047: 딜러 "수입 요청" + 딜러 등급별 "오더리스트 파일 다운로드"
--
-- 1) import_requests — 딜러가 재고 없는 상품에 대해 남기는 수입 희망 요청.
--    요청은 바로 수입되지 않고, 한 달 동안 모인 요청을 JOOLA Korea가 매달 10일경
--    1개월치 몰아서 한 번에 수입 요청한다. 관리자가 "수입 요청 확정"을 누르면
--    (a) 딜러별 백오더 주문(draft)이 자동 생성되고, (b) 상품별 요청 합계와 최근 6개월
--    판매추이가 든 수입 요청서(엑셀)를 내려받을 수 있다.
--    status: requested(접수) → submitted(수입 요청 완료) → received(입고 완료), cancelled(취소)
--
-- 2) order_list_files — 관리자가 올린 딜러 오더리스트(엑셀). 딜러 등급(할인율 30/35%)별
--    파일을 따로 올리고, 딜러는 자기 등급에 맞는 파일만(게시일 이후) 내려받는다.
--    파일 본체는 비공개 Storage 버킷 'order-lists'에 있고, 다운로드는 서버가 권한을
--    확인한 뒤 잠깐 유효한 링크를 만들어 준다.
-- =========================================================================

-- ---------------------------------------------------------------------
-- 1) 수입 요청
-- ---------------------------------------------------------------------
create table if not exists import_requests (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references dealers (id) on delete cascade,
  product_id uuid not null references products (id) on delete restrict,
  -- 딜러 화면에서 products 테이블을 직접 읽을 수 없어서(스태프 전용) 요청 당시 이름/코드를 같이 저장한다.
  sku text not null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  note text,
  status text not null default 'requested'
    check (status in ('requested', 'submitted', 'received', 'cancelled')),
  -- 수입 요청 확정 시 채워진다: 같은 확정(배치)에 묶인 요청은 같은 batch_id/submitted_at을 가진다.
  batch_id uuid,
  submitted_at timestamptz,
  -- 확정 때 자동 생성된 그 딜러의 백오더 주문(자동 생성에 실패했으면 null).
  order_id uuid references dealer_orders (id) on delete set null,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists import_requests_batch_idx on import_requests (batch_id);
create index if not exists import_requests_created_idx on import_requests (created_at desc);
create index if not exists import_requests_dealer_idx on import_requests (dealer_id);
create index if not exists import_requests_product_idx on import_requests (product_id);

alter table import_requests enable row level security;

create policy import_requests_select_staff on import_requests
  for select using (is_staff());
create policy import_requests_select_dealer on import_requests
  for select using (dealer_id = current_dealer_id());
-- 딜러는 자기 딜러 ID로만 요청을 넣을 수 있다.
create policy import_requests_insert_dealer on import_requests
  for insert with check (dealer_id = current_dealer_id() and status = 'requested');
create policy import_requests_insert_staff on import_requests
  for insert with check (can_write());
-- 딜러는 아직 '접수' 상태인 자기 요청을 '취소'로만 바꿀 수 있다.
create policy import_requests_update_dealer_cancel on import_requests
  for update
  using (dealer_id = current_dealer_id() and status = 'requested')
  with check (dealer_id = current_dealer_id() and status = 'cancelled');
create policy import_requests_update_staff on import_requests
  for update using (can_write()) with check (can_write());
create policy import_requests_delete_staff on import_requests
  for delete using (can_write());

-- ---------------------------------------------------------------------
-- 2) 오더리스트 파일
-- ---------------------------------------------------------------------
create table if not exists order_list_files (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  -- 딜러 할인율 등급(예: 30, 35). dealers.discount_rate를 반올림한 값과 같은 파일만 그 딜러에게 보인다.
  tier integer not null check (tier between 1 and 100),
  -- 이 날짜부터 딜러에게 보인다(미리 올려 두고 게시일에 맞춰 공개).
  visible_from date not null default current_date,
  -- 가격 시행일(안내용 표시).
  effective_on date,
  storage_path text not null unique,
  file_name text not null,
  file_size bigint,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists order_list_files_tier_idx on order_list_files (tier, visible_from desc);

-- 현재 로그인한 딜러의 할인율 등급(반올림). 딜러가 아니면 null.
create or replace function current_dealer_tier()
returns integer as $$
  select round(d.discount_rate)::int
  from public.dealers d
  where d.id = (select dealer_id from public.profiles where id = auth.uid());
$$ language sql stable security definer set search_path = public;

alter table order_list_files enable row level security;

create policy order_list_files_select_staff on order_list_files
  for select using (is_staff());
create policy order_list_files_select_dealer on order_list_files
  for select using (
    current_dealer_id() is not null
    and tier = current_dealer_tier()
    and current_date >= visible_from
  );
create policy order_list_files_insert on order_list_files
  for insert with check (can_write());
create policy order_list_files_update on order_list_files
  for update using (can_write()) with check (can_write());
create policy order_list_files_delete on order_list_files
  for delete using (can_write());

-- ---------------------------------------------------------------------
-- 3) 파일 저장소(비공개 버킷) — 관리자(admin)만 올리고, 다운로드는 서버가 처리한다.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('order-lists', 'order-lists', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

drop policy if exists order_lists_storage_insert on storage.objects;
create policy order_lists_storage_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'order-lists' and public.can_write());

drop policy if exists order_lists_storage_select on storage.objects;
create policy order_lists_storage_select on storage.objects
  for select to authenticated
  using (bucket_id = 'order-lists' and public.is_staff());

drop policy if exists order_lists_storage_delete on storage.objects;
create policy order_lists_storage_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'order-lists' and public.can_write());

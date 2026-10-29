-- 시설(브랜드 파트너사) 계약서 PDF 보관함.
-- 계약서에는 사업자등록번호·대표자 이름·서명 이미지가 들어 있으므로,
--   · 비공개 Storage 버킷 'facility-contracts' (PDF만, 파일당 20MB 이하)
--   · 목록 테이블 facility_contract_files
-- 둘 다 관리자(admin)만 올리고·보고·지울 수 있게 한다. 다운로드는 서버가 60초짜리 임시 링크를 만들어 준다.

create table if not exists facility_contract_files (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references facilities (id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  file_size bigint,
  uploaded_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists facility_contract_files_facility_idx
  on facility_contract_files (facility_id, created_at desc);

alter table facility_contract_files enable row level security;

drop policy if exists facility_contract_files_select on facility_contract_files;
create policy facility_contract_files_select on facility_contract_files
  for select using (can_write());
drop policy if exists facility_contract_files_insert on facility_contract_files;
create policy facility_contract_files_insert on facility_contract_files
  for insert with check (can_write());
drop policy if exists facility_contract_files_update on facility_contract_files;
create policy facility_contract_files_update on facility_contract_files
  for update using (can_write()) with check (can_write());
drop policy if exists facility_contract_files_delete on facility_contract_files;
create policy facility_contract_files_delete on facility_contract_files
  for delete using (can_write());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('facility-contracts', 'facility-contracts', false, 20971520, array['application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = 20971520,
      allowed_mime_types = array['application/pdf'];

drop policy if exists facility_contracts_storage_insert on storage.objects;
create policy facility_contracts_storage_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'facility-contracts' and public.can_write());

drop policy if exists facility_contracts_storage_select on storage.objects;
create policy facility_contracts_storage_select on storage.objects
  for select to authenticated
  using (bucket_id = 'facility-contracts' and public.can_write());

drop policy if exists facility_contracts_storage_delete on storage.objects;
create policy facility_contracts_storage_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'facility-contracts' and public.can_write());

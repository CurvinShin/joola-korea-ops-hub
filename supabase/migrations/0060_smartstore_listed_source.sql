-- 스마트스토어 "상품 목록" 파일을 올려 이미 등록된 제품군을 자동으로 걸러낼 수 있게 한다.
--
-- smartstore_listed_families.source: 이 표시가 어디서 왔는지.
--   'manual' = 화면에서 사람이 체크해서 표시(파일을 다시 올려도 유지)
--   'seed'   = 0059에서 미리 넣어 둔 값(파일을 올리면 파일 내용으로 교체)
--   'store'  = 상품 목록 파일에서 자동으로 찾은 값(파일을 올릴 때마다 교체)
-- 또, 파일 업로드가 같은 제품군을 덮어쓸 수 있도록 update 정책을 추가한다(0059에는 없었음).
-- 컬럼·정책만 추가하는 SQL이라 운영 DB에서 먼저 실행해도 안전하다.

alter table smartstore_listed_families
  add column if not exists source text not null default 'manual';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'smartstore_listed_families_source_check'
  ) then
    alter table smartstore_listed_families
      add constraint smartstore_listed_families_source_check check (source in ('manual', 'seed', 'store'));
  end if;
end $$;

-- 0059에서 미리 넣은 14개(marked_by가 비어 있는 행)를 'seed'로 표시한다.
update smartstore_listed_families set source = 'seed' where marked_by is null and source = 'manual';

drop policy if exists smartstore_listed_families_update on smartstore_listed_families;
create policy smartstore_listed_families_update on smartstore_listed_families
  for update using (can_write()) with check (can_write());

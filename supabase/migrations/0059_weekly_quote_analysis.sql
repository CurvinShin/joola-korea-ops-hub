-- 매주 월요일 오전 10시(한국 시간) 견적서 분석 결과 알림 + 스마트스토어 등록 제품 목록.
--
-- 1) quote_analysis_reports: 매주 허브 서버가 dealer_quote_items를 분석한 뒤 남기는 기록 한 줄.
--    화면 위쪽의 "견적서 분석 결과가 나왔습니다" 알림 배너는 acknowledged_at(확인한 시각)이 비어 있는
--    가장 최근 기록이 있을 때만 뜬다. 관리자가 "확인했어요"를 누르면 채워지고, "알림 다시 표시"로 되돌릴 수 있다.
--    행은 서버(service-role)만 만든다(insert 정책 없음).
-- 2) smartstore_listed_families: 이미 스마트스토어에 올라간 제품군. 분석 후보에서 빠진다.
--    제품군 키(family_key)는 src/lib/analysis/listing-priority.ts의 keyOf()와 같은 규칙이다.
--    2026-10-21 사용자가 "Hyperion Vision·POWER FX·Perseus/Hyperion Pro IV·Perseus/Agassi/Kosmos Pro V·
--    Heat/Double Vision·3S Dual·Primo Indoor Plus·패들 커버·Team Crew 양말·HC-40은 이미 올라가 있다"고
--    알려 준 대로 미리 채운다. 화면에서 추가·되돌리기를 할 수 있다.
-- 추가만 하는 SQL이라 운영 DB에서 먼저 실행해도 안전하다.

create table if not exists quote_analysis_reports (
  id uuid primary key default gen_random_uuid(),
  generated_at timestamptz not null default now(),
  data_through date,
  is_stale boolean not null default false,
  summary jsonb not null default '{}'::jsonb,
  acknowledged_at timestamptz,
  acknowledged_by uuid references auth.users(id) on delete set null
);

create index if not exists quote_analysis_reports_generated_idx on quote_analysis_reports (generated_at desc);

alter table quote_analysis_reports enable row level security;

create policy quote_analysis_reports_select on quote_analysis_reports
  for select using (is_staff());
create policy quote_analysis_reports_update on quote_analysis_reports
  for update using (can_write()) with check (can_write());
create policy quote_analysis_reports_delete on quote_analysis_reports
  for delete using (can_write());

create table if not exists smartstore_listed_families (
  family_key text primary key,
  label text not null,
  marked_by uuid references auth.users(id) on delete set null,
  marked_at timestamptz not null default now()
);

alter table smartstore_listed_families enable row level security;

create policy smartstore_listed_families_select on smartstore_listed_families
  for select using (is_staff());
create policy smartstore_listed_families_insert on smartstore_listed_families
  for insert with check (can_write());
create policy smartstore_listed_families_delete on smartstore_listed_families
  for delete using (can_write());

insert into smartstore_listed_families (family_key, label) values
  ('hyperionvision', 'Hyperion Vision'),
  ('powerfx', 'POWER FX'),
  ('perseusprov', 'Perseus Pro V'),
  ('perseusproiv', 'Perseus Pro IV'),
  ('hyperionproiv', 'Hyperion Pro IV'),
  ('agassiprov', 'Agassi Pro V'),
  ('kosmosprov', 'Kosmos Pro V'),
  ('heatvision', 'Heat Vision'),
  ('doublevision', 'Double Vision'),
  ('3sdual', '3S Dual'),
  ('primoindoorplus', 'Primo Indoor Plus'),
  ('neoprene패들커버', 'Neoprene 패들 커버'),
  ('hc40', 'HC-40'),
  ('teamcrewsocks', 'Team Crew Socks')
on conflict (family_key) do nothing;

-- =========================================================================
-- 0054: 브랜드 파트너(시설) 신청서 + 시설 티어
--
-- 1) facilities.tier — Pro Court / Edge Court / Champion Court.
--    계산 규칙은 src/lib/partner/tier.ts(옵시디안 가이드라인 5번 항목과 같음).
--
-- 2) partner_applications — 로그인 없이 초대 링크로 받는 신청서.
--    익명 사용자는 이 테이블을 직접 읽거나 쓸 수 없다(정책 없음). 접수·결과 조회는
--    서버가 service-role 클라이언트로 처리하고, 직원 화면은 관리자(can_write)만 본다.
--    개인정보·계좌가 들어 있어서 일반 스태프(is_staff)에게도 열지 않는다.
--    status: pending(검토 중) → approved(승인) | rejected(거절)
--    거절하면 개인정보·계좌·첨부를 지우고 pii_purged_at을 남긴다.
--
-- 3) 비공개 Storage 버킷 'partner-applications' — 신청자는 서버가 발급한 일회용
--    업로드 링크로만 올리고, 열람·삭제는 관리자만 한다.
-- =========================================================================

-- ---------------------------------------------------------------------
-- 1) 시설 티어
-- ---------------------------------------------------------------------
alter table facilities
  add column if not exists tier text
    check (tier in ('pro', 'edge', 'champion'));

-- ---------------------------------------------------------------------
-- 2) 신청서
-- ---------------------------------------------------------------------
create table if not exists partner_applications (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  -- 신청자 결과 확인 링크 토큰의 SHA-256 해시(원본 토큰은 저장하지 않는다).
  status_token_hash text not null unique,

  -- 시설 정보(거절 후에도 남는다)
  facility_name text not null,
  region kr_region not null,
  courts_count integer not null check (courts_count >= 0),
  venue_suitable boolean not null default false,
  sales_capability text not null check (sales_capability in ('wholesale', 'retail', 'none')),
  demo_package_intent boolean not null default false,
  -- 운영 능력·접근성·코치 인지도 체크 항목(키 이름은 tier.ts의 TierInput과 같다).
  answers jsonb not null default '{}'::jsonb,

  -- 개인정보(거절 시 null로 지운다)
  address text,
  business_number text,
  business_type text,
  representative_name text,
  representative_phone text,
  applicant_name text,
  applicant_phone text,
  email text,
  bank_name text,
  account_holder text,
  account_number_enc text,
  sns_id text,
  dupr_id text,
  attachments jsonb not null default '[]'::jsonb,

  -- 접수 시점 자동 계산 결과
  expected_score integer not null,
  expected_tier text check (expected_tier in ('pro', 'edge', 'champion')),
  potential_tier text check (potential_tier in ('pro', 'edge', 'champion')),
  review_reasons text[] not null default '{}',

  -- 담당자 결정
  final_tier text check (final_tier in ('pro', 'edge', 'champion')),
  decision_message text,
  decided_by uuid references profiles (id) on delete set null,
  decided_at timestamptz,
  facility_id uuid references facilities (id) on delete set null,

  consent_at timestamptz not null,
  -- 같은 곳에서의 반복 제출 제한용(원본 IP가 아닌 키 해시).
  submitter_ip_hash text,
  pii_purged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partner_applications_status_idx on partner_applications (status, created_at desc);
create index if not exists partner_applications_ip_idx on partner_applications (submitter_ip_hash, created_at desc);

alter table partner_applications enable row level security;

create policy partner_applications_select_admin on partner_applications
  for select using (can_write());
create policy partner_applications_update_admin on partner_applications
  for update using (can_write()) with check (can_write());
create policy partner_applications_delete_admin on partner_applications
  for delete using (can_write());
-- insert 정책 없음: 접수는 서버(service-role)만 한다.

-- ---------------------------------------------------------------------
-- 3) 첨부 파일 저장소(비공개 버킷)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'partner-applications', 'partner-applications', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do update
  set public = false,
      file_size_limit = 10485760,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

drop policy if exists partner_applications_storage_select on storage.objects;
create policy partner_applications_storage_select on storage.objects
  for select to authenticated
  using (bucket_id = 'partner-applications' and public.can_write());

drop policy if exists partner_applications_storage_delete on storage.objects;
create policy partner_applications_storage_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'partner-applications' and public.can_write());

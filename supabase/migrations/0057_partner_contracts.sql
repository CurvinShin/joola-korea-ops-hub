-- =========================================================================
-- 0057: 브랜드 파트너 계약서(전자서명)
--
-- 승인된 신청자가 네트 문의를 저장하면 서버가 계약서를 만들어 이 테이블에 저장한다.
-- 계약서 본문은 만들어질 때의 문구를 그대로(content) 저장하고, 본문 지문(content_hash)을
-- 서명에 함께 남겨서 나중에 내용이 바뀌지 않았는지 확인할 수 있게 한다.
--
-- status: pending_partner(신청자 서명 대기) → pending_joola(JOOLA 대표 서명 대기) → signed(체결)
--         void(무효)
--
-- 익명(신청자) 접근은 정책이 없다. 접수·서명은 서버가 service-role 클라이언트로 처리하고,
-- 직원 화면은 관리자(can_write)만 본다. 서명 이미지와 개인정보가 들어 있어서다.
-- =========================================================================
create table if not exists partner_contracts (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references partner_applications (id) on delete cascade,
  status text not null default 'pending_partner'
    check (status in ('pending_partner', 'pending_joola', 'signed', 'void')),

  template_version text not null,
  content jsonb not null,
  content_hash text not null,
  generated_at timestamptz not null default now(),

  -- 브랜드 파트너(신청자) 서명
  partner_signed_at timestamptz,
  partner_signer_name text,
  partner_signature_png text,
  partner_ip_hash text,
  partner_user_agent text,

  -- JOOLA 대표 서명 (별도 서명 링크 — 토큰은 해시만 저장)
  joola_sign_token_hash text unique,
  joola_signed_at timestamptz,
  joola_signer_name text,
  joola_signature_png text,
  joola_ip_hash text,
  joola_user_agent text,

  effective_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partner_contracts_status_idx on partner_contracts (status, created_at desc);

alter table partner_contracts enable row level security;

create policy partner_contracts_select_admin on partner_contracts
  for select using (can_write());
create policy partner_contracts_update_admin on partner_contracts
  for update using (can_write()) with check (can_write());
create policy partner_contracts_delete_admin on partner_contracts
  for delete using (can_write());
-- insert 정책 없음: 계약서 생성은 서버(service-role)만 한다.

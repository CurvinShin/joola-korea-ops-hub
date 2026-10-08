-- =========================================================================
-- 협찬·지원 출고 기록(support_shipments) + 환불·클레임 목록(refund_claims).
--
-- 배경: 브랜드 파트너십 물품 발송, 인플루언서 박스, 대회/행사 지원 상품·공 출고,
-- 선수 장비 지원, 딜러 환불/클레임 처리가 옵시디안 메모에만 있어서
-- "누구에게 무엇을 얼마어치 보냈는지"와 "환불 건이 며칠째 열려 있는지"를
-- 한눈에 볼 수 없었다. 허브에 간단한 장부 두 개를 둔다.
--
-- 개인정보: 받는 사람은 이름/단체명(업무상 호칭)만 적는다. 전화번호·상세
-- 주소·계좌번호용 컬럼은 일부러 만들지 않았다 — 필요하면 견적서/카톡 참고.
-- RLS: 직원만 조회(is_staff), 쓰기는 can_write() (= admin).
-- Safe to run as a normal SQL Editor execution (no new enum values).
-- =========================================================================

create table if not exists support_shipments (
  id uuid primary key default gen_random_uuid(),
  shipped_on date not null default current_date,
  category text not null default 'partnership'
    check (category in ('partnership', 'event_support', 'influencer', 'athlete', 'other')),
  recipient_name text not null,
  event_id uuid references events (id) on delete set null,
  items text not null,
  value_krw numeric(14,0) not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'shipped')),
  notes text,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_shipments_shipped_on_idx on support_shipments (shipped_on desc);
create index if not exists support_shipments_status_idx on support_shipments (status);

create table if not exists refund_claims (
  id uuid primary key default gen_random_uuid(),
  opened_on date not null default current_date,
  kind text not null default 'refund'
    check (kind in ('refund', 'exchange', 'claim')),
  channel text not null default 'dealer'
    check (channel in ('dealer', 'smartstore', 'direct', 'other')),
  counterparty text not null,
  dealer_id uuid references dealers (id) on delete set null,
  product_summary text,
  amount_krw numeric(14,0) not null default 0,
  status text not null default 'open'
    check (status in ('open', 'waiting', 'done')),
  next_action text,
  resolved_on date,
  notes text,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists refund_claims_status_idx on refund_claims (status);
create index if not exists refund_claims_opened_on_idx on refund_claims (opened_on desc);

do $$
declare
  t text;
begin
  for t in select unnest(array['support_shipments', 'refund_claims'])
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_select', t);
    execute format('drop policy if exists %I on %I', t || '_insert', t);
    execute format('drop policy if exists %I on %I', t || '_update', t);
    execute format('drop policy if exists %I on %I', t || '_delete', t);
    execute format('create policy %I on %I for select using (is_staff())', t || '_select', t);
    execute format('create policy %I on %I for insert with check (can_write())', t || '_insert', t);
    execute format('create policy %I on %I for update using (can_write()) with check (can_write())', t || '_update', t);
    execute format('create policy %I on %I for delete using (can_write())', t || '_delete', t);
  end loop;
end $$;

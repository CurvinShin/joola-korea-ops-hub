-- =========================================================================
-- 0050: 제이디로지스 발주서(엑셀) 발주 기록 + 날짜별 주문번호/차수 부여
--
-- "딜러 주문" 화면에서 주문을 골라 "발주서 엑셀 만들기"를 누르면:
--   - 주문번호는 그날(발주 당일) 날짜 + 순번(YYYYMMDD-01, -02 ...)으로 부여된다.
--   - 같은 날 두 번째 발주부터는 순번이 이어지고(예: 01~09 다음은 10부터),
--     파일명 끝에 -2차, -3차가 붙는다.
-- 번호가 겹치거나 건너뛰지 않도록 번호는 이 함수가 날짜별 잠금을 걸고 한 번에 배정한다.
-- 만든 엑셀의 내용(rows)도 기록해 두어 나중에 똑같은 파일을 다시 내려받을 수 있다.
-- =========================================================================
create table if not exists dispatch_batches (
  id uuid primary key default gen_random_uuid(),
  dispatch_date date not null,
  batch_no integer not null check (batch_no >= 1),
  seq_start integer not null check (seq_start >= 1),
  seq_end integer not null check (seq_end >= seq_start),
  file_name text not null,
  order_ids uuid[] not null default '{}',
  rows jsonb not null default '[]'::jsonb,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  -- 발주 취소 시각. 취소해도 기록과 번호는 남긴다(이미 업체에 보낸 파일의 번호가 다시 쓰이지 않도록).
  cancelled_at timestamptz,
  unique (dispatch_date, batch_no)
);

create index if not exists dispatch_batches_date_idx on dispatch_batches (dispatch_date desc, batch_no desc);

alter table dispatch_batches enable row level security;

drop policy if exists dispatch_batches_select on dispatch_batches;
create policy dispatch_batches_select on dispatch_batches
  for select using (is_staff());
drop policy if exists dispatch_batches_insert on dispatch_batches;
create policy dispatch_batches_insert on dispatch_batches
  for insert with check (can_write());
drop policy if exists dispatch_batches_update on dispatch_batches;
create policy dispatch_batches_update on dispatch_batches
  for update using (can_write()) with check (can_write());
drop policy if exists dispatch_batches_delete on dispatch_batches;
create policy dispatch_batches_delete on dispatch_batches
  for delete using (can_write());

-- 딜러 주문에 "어느 발주에 포함됐는지" 표시
alter table dealer_orders add column if not exists dispatch_batch_id uuid references dispatch_batches (id) on delete set null;
alter table dealer_orders add column if not exists dispatched_at timestamptz;

-- 그날의 다음 순번/차수를 배정하고 기록 한 줄을 만든다.
--   p_count: 이번 발주서에 들어갈 줄 수(= 번호가 필요한 줄 수)
--   p_file_base: 파일명 앞부분(확장자·차수 제외), 예: '20261014-제이디로지스_엑셀 수동발주_주문양식'
-- 같은 날짜에 동시에 두 번 눌려도 날짜별 잠금 덕분에 번호가 겹치지 않는다.
create or replace function allocate_dispatch_batch(p_date date, p_count integer, p_file_base text)
returns table (id uuid, batch_no integer, seq_start integer, seq_end integer, file_name text)
language plpgsql
as $$
declare
  v_batch_no integer;
  v_seq_start integer;
  v_name text;
begin
  if p_count is null or p_count < 1 then
    raise exception '발주할 줄이 없습니다.';
  end if;

  perform pg_advisory_xact_lock(hashtext('dispatch_batches:' || p_date::text));

  select coalesce(max(b.batch_no), 0) + 1, coalesce(max(b.seq_end), 0) + 1
    into v_batch_no, v_seq_start
  from dispatch_batches b
  where b.dispatch_date = p_date;

  v_name := p_file_base
    || case when v_batch_no > 1 then '-' || v_batch_no::text || '차' else '' end
    || '.xlsx';

  return query
  insert into dispatch_batches (dispatch_date, batch_no, seq_start, seq_end, file_name, created_by)
  values (p_date, v_batch_no, v_seq_start, v_seq_start + p_count - 1, v_name, auth.uid())
  returning dispatch_batches.id, dispatch_batches.batch_no, dispatch_batches.seq_start, dispatch_batches.seq_end, dispatch_batches.file_name;
end;
$$;

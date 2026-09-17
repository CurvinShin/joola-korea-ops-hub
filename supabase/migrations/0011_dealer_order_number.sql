-- 딜러 주문 번호 (예: KR05-2630 = KR05 딜러의 26년도 30번째 주문)
--
-- dealers 테이블에 이미 있던 kr_code / next_seq / last_seq_year 컬럼을 사용해
-- 주문 생성 시점에 원자적으로(atomic) 번호를 발급한다. 두 딜러가 동시에 주문을
-- 넣어도 같은 번호가 중복 발급되지 않도록 dealers 행에 `for update` 잠금을 건다.
--
-- 번호 형식: {kr_code}-{YY}{SEQ}
--   - YY: 주문일 기준 2자리 연도
--   - SEQ: 해당 연도 내 순번, 2자리로 0-패딩 (5번째 주문 → "05", 30번째 → "30", 100번째 → "100")
--   - last_seq_year가 올해와 다르면 next_seq를 1로 리셋

alter table dealer_orders add column if not exists order_number text;

create unique index if not exists dealer_orders_order_number_key
  on dealer_orders (order_number)
  where order_number is not null;

create or replace function assign_dealer_order_number(
  p_dealer_id uuid,
  p_order_date date default current_date
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kr_code text;
  v_next_seq integer;
  v_last_seq_year text;
  v_year text := to_char(p_order_date, 'YY');
  v_seq integer;
  v_order_number text;
begin
  -- 스태프(관리자 등)는 어떤 딜러든 발급 가능, 딜러 계정은 본인 딜러만 가능
  if not (is_staff() or current_dealer_id() = p_dealer_id) then
    raise exception '이 딜러의 주문 번호를 발급할 권한이 없습니다.';
  end if;

  select kr_code, next_seq, last_seq_year
    into v_kr_code, v_next_seq, v_last_seq_year
  from dealers
  where id = p_dealer_id
  for update;

  if not found then
    raise exception '딜러를 찾을 수 없습니다: %', p_dealer_id;
  end if;

  if v_kr_code is null then
    raise exception '딜러에 kr_code가 설정되어 있지 않습니다: %', p_dealer_id;
  end if;

  if v_last_seq_year is distinct from v_year then
    v_seq := 1;
  else
    v_seq := coalesce(v_next_seq, 1);
  end if;

  update dealers
  set next_seq = v_seq + 1,
      last_seq_year = v_year
  where id = p_dealer_id;

  v_order_number := v_kr_code || '-' || v_year || lpad(v_seq::text, 2, '0');
  return v_order_number;
end;
$$;

grant execute on function assign_dealer_order_number(uuid, date) to authenticated;

-- 확인
select proname, prosecdef from pg_proc where proname = 'assign_dealer_order_number';
select column_name from information_schema.columns where table_name = 'dealer_orders' and column_name = 'order_number';

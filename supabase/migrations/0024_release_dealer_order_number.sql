-- 주문을 삭제할 때, 그 주문에 발급됐던 견적/주문 번호가 그 딜러에게
-- "가장 최근에 발급된 번호"였다면(=그 뒤로 다른 번호가 아직 발급되지
-- 않았다면) next_seq를 한 칸 되돌려서 같은 번호를 다음 주문에 다시 쓸 수
-- 있게 한다. 실수로 만들었다가 지우는 주문 때문에 번호가 한 칸씩
-- 건너뛰는 걸 막기 위함이다.
--
-- 중간에 낀 번호(그 뒤로 이미 다른 번호가 발급된 경우)는 되돌리면 나중에
-- 발급되는 번호와 겹칠 수 있어서 건드리지 않는다 — 그 경우엔 번호가
-- 하나 비게 되는데, 이건 감수한다(기존 다른 번호와 충돌하는 것보다 낫다).
create or replace function release_dealer_order_number_if_last(
  p_dealer_id uuid,
  p_order_number text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kr_code text;
  v_next_seq integer;
  v_last_seq_year text;
  v_year text;
  v_seq integer;
begin
  if p_order_number is null then
    return;
  end if;

  select kr_code, next_seq, last_seq_year
    into v_kr_code, v_next_seq, v_last_seq_year
  from dealers
  where id = p_dealer_id
  for update;

  if not found or v_kr_code is null then
    return;
  end if;

  -- order_number 형식: {kr_code}-{YY}{SEQ} (SEQ는 2자리 이상)
  if p_order_number !~ ('^' || v_kr_code || '-[0-9]{4,}$') then
    return;
  end if;

  v_year := substring(p_order_number from length(v_kr_code) + 2 for 2);
  v_seq := substring(p_order_number from length(v_kr_code) + 4)::integer;

  if v_last_seq_year = v_year and v_next_seq = v_seq + 1 then
    update dealers set next_seq = v_seq where id = p_dealer_id;
  end if;
end;
$$;

grant execute on function release_dealer_order_number_if_last(uuid, text) to authenticated;

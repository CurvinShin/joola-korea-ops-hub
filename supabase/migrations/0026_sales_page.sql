-- =========================================================================
-- /영업(sales) 페이지: 딜러 매출(견적서 기준) + 스마트스토어 매출(월별 정산
-- 직접 입력)을 한 화면에서 보여주는 기능을 뒷받침하는 변경.
--
-- 1) sales_transactions / dealer_quotes의 select 정책이 원래(0001, 0014)
--    "auth.role() = 'authenticated'"로 되어 있어서, 딜러 포털 로그인
--    계정(role='dealer')도 이 테이블들을 그대로 조회할 수 있었다. 이제
--    막 딜러 포털 로그인 계정이 실사용되기 시작했고, 이 테이블들은 회사
--    전체/타 딜러 매출까지 담고 있는 민감한 내부 데이터라 is_staff()로
--    좁힌다 (products/inventory를 0003에서 좁힌 것과 같은 이유).
-- 2) sales_transactions에 월 1건만 들어가야 하는 채널(현재는 스마트스토어
--    정산만 해당하는 'ecommerce')에 대해, 같은 달을 두 번 입력해서 매출이
--    중복 합산되는 사고를 막는 부분 유니크 인덱스를 추가한다. 실제
--    upsert는 애플리케이션 코드에서 select 후 insert/update로 처리하고,
--    이 인덱스는 그에 대한 안전장치다.
-- =========================================================================

drop policy if exists sales_transactions_select on sales_transactions;
create policy sales_transactions_select on sales_transactions
  for select using (is_staff());

drop policy if exists dealer_quotes_select on dealer_quotes;
create policy dealer_quotes_select on dealer_quotes
  for select using (is_staff());

create unique index if not exists sales_transactions_ecommerce_month_uq
  on sales_transactions (sale_date)
  where channel = 'ecommerce';

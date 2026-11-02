-- 2026년 10월 29일~11월 2일 견적서 5건 추가 반영 + 딜러 구매액 합계·견적서 번호 최신화.
--   KR02-2610(10/29) · KR09-2628(10/30) · KR09-2629(11/2) · KR10-2660(11/2) · KR11-2610(11/2)
-- 합계금액은 부가세 포함 22,933,845원. quote_date는 견적서의 '견적일자'를 따랐다(0040/0062/0067과 동일).
-- 금액은 공급가액(부가세 별도)이고 배송비(Delivery Cost) 행은 품목에서 제외했다. 세액은 PDF처럼 행마다 내림.
-- 분류 메모: Hyperion Vision 16mm(600097·601955·601956)는 '비전', POWER FX(604672·604673)는 'PowerFX',
--   Pro V(600583·600574)는 '프로V', HC-40은 '공'.
-- 이미 DB에 들어가 있는 건은 order_no 기준으로 건너뛰므로 여러 번 실행해도 중복되지 않는다.

insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file)
select v.kr_code, v.order_no, v.quote_date::date, v.amount, v.payment_terms, v.source_file
from (values
  ('KR02', 'KR02-2610', '2026-10-29', 2686530, '선결제', 'KR02-2610 견적서(10월 29일 출고, 패들).pdf'),
  ('KR09', 'KR09-2628', '2026-10-30', 2188065, '선결제', 'KR09-2628 견적서(10월 30일 출고, HC-40).pdf'),
  ('KR09', 'KR09-2629', '2026-11-02', 11482900, '선결제', 'KR09-2629 견적서(11월 2일 출고, Hyperion Vision Series).pdf'),
  ('KR10', 'KR10-2660', '2026-11-02', 6357890, '선결제', 'KR10-2660 견적서 11월 2일 출고(POWER FX Day dream, Freeze 6일 출고).pdf'),
  ('KR11', 'KR11-2610', '2026-11-02', 218460, '선결제', 'KR11-2610 견적서(11월 2일 출고, KOSMOS 14mm).pdf')
) as v(kr_code, order_no, quote_date, amount, payment_terms, source_file)
where not exists (select 1 from dealer_quotes q where q.order_no = v.order_no);

insert into dealer_quote_items
  (kr_code, order_no, quote_date, product_name, category, subcategory, quantity, unit_price, amount, tax, source_file)
select v.kr_code, v.order_no, v.quote_date::date, v.product_name, v.category, v.subcategory, v.quantity, v.unit_price, v.amount, v.tax, v.source_file
from (values
  ('KR02', 'KR02-2610', '2026-10-29', '600583 JOOLA Hyperion Pro V Ben Johns Bolt Blue 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 8::numeric, 193600::numeric, 1548800::numeric, 154880::numeric, 'KR02-2610 견적서(10월 29일 출고, 패들).pdf'),
  ('KR02', 'KR02-2610', '2026-10-29', '604672 JOOLA Perseus POWER FX Daydream 16mm Pickleball Paddle (Global)', '패들', 'PowerFX'::text, 5::numeric, 176700::numeric, 883500::numeric, 88350::numeric, 'KR02-2610 견적서(10월 29일 출고, 패들).pdf'),

  ('KR09', 'KR09-2628', '2026-10-30', '600093 JOOLA HC-40 - 100 Pack', '공', NULL::text, 10::numeric, 182600::numeric, 1826000::numeric, 182600::numeric, 'KR09-2628 견적서(10월 30일 출고, HC-40).pdf'),
  ('KR09', 'KR09-2628', '2026-10-30', '600093 JOOLA HC-40 - 100 Pack(demo)', '공', NULL::text, 1::numeric, 108150::numeric, 108150::numeric, 10815::numeric, 'KR09-2628 견적서(10월 30일 출고, HC-40).pdf'),

  ('KR09', 'KR09-2629', '2026-11-02', '600097 JOOLA Hyperion Vision 16mm - Storm - Blue Pickleball Paddle (DTC)', '패들', '비전'::text, 50::numeric, 76200::numeric, 3810000::numeric, 381000::numeric, 'KR09-2629 견적서(11월 2일 출고, Hyperion Vision Series).pdf'),
  ('KR09', 'KR09-2629', '2026-11-02', '600097 JOOLA Hyperion Vision 16mm - Storm - Blue Pickleball Paddle (DTC)(demo)', '패들', '비전'::text, 5::numeric, 41000::numeric, 205000::numeric, 20500::numeric, 'KR09-2629 견적서(11월 2일 출고, Hyperion Vision Series).pdf'),
  ('KR09', 'KR09-2629', '2026-11-02', '601956 JOOLA Hyperion Vision Eclipse Orange 16mm Pickleball Paddle (DTC)', '패들', '비전'::text, 40::numeric, 76200::numeric, 3048000::numeric, 304800::numeric, 'KR09-2629 견적서(11월 2일 출고, Hyperion Vision Series).pdf'),
  ('KR09', 'KR09-2629', '2026-11-02', '601956 JOOLA Hyperion Vision Eclipse Orange 16mm Pickleball Paddle (DTC)(demo)', '패들', '비전'::text, 4::numeric, 41000::numeric, 164000::numeric, 16400::numeric, 'KR09-2629 견적서(11월 2일 출고, Hyperion Vision Series).pdf'),
  ('KR09', 'KR09-2629', '2026-11-02', '601955 JOOLA Hyperion Vision Crash Teal 16mm Pickleball Paddle (DTC)', '패들', '비전'::text, 40::numeric, 76200::numeric, 3048000::numeric, 304800::numeric, 'KR09-2629 견적서(11월 2일 출고, Hyperion Vision Series).pdf'),
  ('KR09', 'KR09-2629', '2026-11-02', '601955 JOOLA Hyperion Vision Crash Teal 16mm Pickleball Paddle (DTC)(demo)', '패들', '비전'::text, 4::numeric, 41000::numeric, 164000::numeric, 16400::numeric, 'KR09-2629 견적서(11월 2일 출고, Hyperion Vision Series).pdf'),

  ('KR10', 'KR10-2660', '2026-11-02', '604672 JOOLA Perseus POWER FX Daydream 16mm Pickleball Paddle (Global)', '패들', 'PowerFX'::text, 10::numeric, 176700::numeric, 1767000::numeric, 176700::numeric, 'KR10-2660 견적서 11월 2일 출고(POWER FX Day dream, Freeze 6일 출고).pdf'),
  ('KR10', 'KR10-2660', '2026-11-02', '604672 JOOLA Perseus POWER FX Daydream 16mm Pickleball Paddle (Global)(demo)', '패들', 'PowerFX'::text, 1::numeric, 95100::numeric, 95100::numeric, 9510::numeric, 'KR10-2660 견적서 11월 2일 출고(POWER FX Day dream, Freeze 6일 출고).pdf'),
  ('KR10', 'KR10-2660', '2026-11-02', '604673 Power FX Perseus 16mm #3 - Global - Freeze', '패들', 'PowerFX'::text, 20::numeric, 176700::numeric, 3534000::numeric, 353400::numeric, 'KR10-2660 견적서 11월 2일 출고(POWER FX Day dream, Freeze 6일 출고).pdf'),
  ('KR10', 'KR10-2660', '2026-11-02', '604673 Power FX Perseus 16mm #3 - Global - Freeze(demo)', '패들', 'PowerFX'::text, 2::numeric, 95100::numeric, 190200::numeric, 19020::numeric, 'KR10-2660 견적서 11월 2일 출고(POWER FX Day dream, Freeze 6일 출고).pdf'),
  ('KR10', 'KR10-2660', '2026-11-02', '600574 JOOLA Kosmos Pro V Tyson McGuffin Surge Green 14mm Pickleball Paddle (Global)', '패들', '프로V'::text, 1::numeric, 193600::numeric, 193600::numeric, 19360::numeric, 'KR10-2660 견적서 11월 2일 출고(POWER FX Day dream, Freeze 6일 출고).pdf'),

  ('KR11', 'KR11-2610', '2026-11-02', '600574 JOOLA Kosmos Pro V Tyson McGuffin Surge Green 14mm Pickleball Paddle (Global)', '패들', '프로V'::text, 1::numeric, 193600::numeric, 193600::numeric, 19360::numeric, 'KR11-2610 견적서(11월 2일 출고, KOSMOS 14mm).pdf')
) as v(kr_code, order_no, quote_date, product_name, category, subcategory, quantity, unit_price, amount, tax, source_file)
where not exists (select 1 from dealer_quote_items i where i.order_no = v.order_no);

-- =========================================================================
-- 딜러 페이지 "구매액 합계(견적서 기준)"와 다음 견적서 번호 최신화 (기준일 2026-11-02)
--   올해 구매액   = 2026년 견적일자인 dealer_quotes 합계금액(부가세·배송비 포함)
--   이번달 구매액 = 그중 2026년 11월 견적일자인 것
--   next_seq      = 올해 가장 큰 견적서 번호 + 1 (앱에서 이미 더 큰 번호를 발급했으면 그 값을 유지, 절대 뒤로 가지 않음)
-- 견적서가 한 건이라도 있는 딜러만 바꾸고, 바꾸기 전 값은 백업 테이블에 남긴다.
-- =========================================================================
create table if not exists dealers_quote_totals_backup_20261102 as
select kr_code, ytd_quote_amount, mtd_quote_amount, quote_amount_as_of, next_seq, last_seq_year
from dealers;

update dealers d
set ytd_quote_amount = t.ytd,
    mtd_quote_amount = t.mtd,
    quote_amount_as_of = '2026-11-02'
from (
  select kr_code,
         sum(amount) filter (where quote_date >= '2026-01-01' and quote_date < '2027-01-01') as ytd,
         coalesce(sum(amount) filter (where quote_date >= '2026-11-01' and quote_date < '2026-12-01'), 0) as mtd
  from dealer_quotes
  group by kr_code
) t
where t.kr_code = d.kr_code and t.ytd is not null;

update dealers d
set next_seq = case when d.last_seq_year = '26' then greatest(d.next_seq, m.max_seq + 1) else m.max_seq + 1 end,
    last_seq_year = '26'
from (
  select kr_code, max(substring(order_no from '^KR[0-9]+-26([0-9]+)$')::int) as max_seq
  from dealer_quotes
  where order_no ~ '^KR[0-9]+-26[0-9]+$'
  group by kr_code
) m
where m.kr_code = d.kr_code;

-- 검산 — 이전 값과 비교 (딜러별)
select d.kr_code,
       b.ytd_quote_amount as ytd_before, d.ytd_quote_amount as ytd_after,
       b.mtd_quote_amount as mtd_before, d.mtd_quote_amount as mtd_after,
       b.next_seq as seq_before, d.next_seq as seq_after
from dealers d
join dealers_quote_totals_backup_20261102 b on b.kr_code = d.kr_code
where d.kr_code is not null
order by d.kr_code;

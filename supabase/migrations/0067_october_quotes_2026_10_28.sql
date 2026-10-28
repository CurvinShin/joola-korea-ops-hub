-- 2026년 10월 27~28일 견적서 3건 추가 반영 (0062 이후 새로 나온 건).
--   KR10-2658(견적일자 10/27, 10/28 출고) · KR10-2659(10/28) · KR07-2605(10/28)
-- 합계금액은 부가세 포함 10,836,848원. quote_date는 견적서의 '견적일자'를 따랐다(0040/0062와 동일).
-- 금액은 공급가액(부가세 별도)이고 배송비(Delivery Cost) 행은 품목에서 제외했다. 세액은 PDF처럼 행마다 내림.
-- 분류 메모: CAS/CGS/CFS/C2 CFS 계열(18500번대, 17002/17003)은 모두 PRO급 1·2세대 모델이라 '프로 1·2세대'로 넣는다.
--   Vision CGS(18522)도 이름에만 Vision이 들어갈 뿐 CGS 모델이라 같은 곳. 3S는 '3S', 신발(R4LLy)은 '신발'.
--   이미 들어가 있던 같은 계열 행(KR05-2601의 '기타(C2 CFS)', KR10-2622의 Vision CGS '비전')도 아래 update로 같이 옮긴다.
-- 이미 DB에 들어가 있는 건은 order_no 기준으로 건너뛰므로 여러 번 실행해도 중복되지 않는다.

insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file)
select v.kr_code, v.order_no, v.quote_date::date, v.amount, v.payment_terms, v.source_file
from (values
  ('KR10', 'KR10-2658', '2026-10-27', 4812813, '선결제', 'KR10-2658 견적서 10월 28일 출고(1세대~3세대, 프리모, 신발).pdf'),
  ('KR10', 'KR10-2659', '2026-10-28', 3028515, '선결제', 'KR10-2659 견적서 10월 28일 출고(1세대~3세대).pdf'),
  ('KR07', 'KR07-2605', '2026-10-28', 2995520, '선결제', 'KR07-2605 견적서(블랙프라이데이 패들2).pdf')
) as v(kr_code, order_no, quote_date, amount, payment_terms, source_file)
where not exists (select 1 from dealer_quotes q where q.order_no = v.order_no);

insert into dealer_quote_items
  (kr_code, order_no, quote_date, product_name, category, subcategory, quantity, unit_price, amount, tax, source_file)
select v.kr_code, v.order_no, v.quote_date::date, v.product_name, v.category, v.subcategory, v.quantity, v.unit_price, v.amount, v.tax, v.source_file
from (values
  ('KR10', 'KR10-2658', '2026-10-27', '600001 JOOLA Primo Indoor Plus (3 Pack)', '공', NULL::text, 36::numeric, 11200::numeric, 403200::numeric, 40320::numeric, 'KR10-2658 견적서 10월 28일 출고(1세대~3세대, 프리모, 신발).pdf'),
  ('KR10', 'KR10-2658', '2026-10-27', '600001 JOOLA Primo Indoor Plus (3 Pack)(demo)', '공', NULL::text, 4::numeric, 6000::numeric, 24000::numeric, 2400::numeric, 'KR10-2658 견적서 10월 28일 출고(1세대~3세대, 프리모, 신발).pdf'),
  ('KR10', 'KR10-2658', '2026-10-27', '600721 Men''s FUNKSH1n_PB: R4LLy ( WHT/Gum) - 7.5', '신발', NULL::text, 1::numeric, 170800::numeric, 170800::numeric, 17080::numeric, 'KR10-2658 견적서 10월 28일 출고(1세대~3세대, 프리모, 신발).pdf'),
  ('KR10', 'KR10-2658', '2026-10-27', '18500 Ben Johns Hyperion CAS 16', '패들', '프로 1·2세대'::text, 23::numeric, 27273::numeric, 627279::numeric, 62727::numeric, 'KR10-2658 견적서 10월 28일 출고(1세대~3세대, 프리모, 신발).pdf'),
  ('KR10', 'KR10-2658', '2026-10-27', '18504 Ben Johns Hyperion CGS 16', '패들', '프로 1·2세대'::text, 7::numeric, 36364::numeric, 254548::numeric, 25454::numeric, 'KR10-2658 견적서 10월 28일 출고(1세대~3세대, 프리모, 신발).pdf'),
  ('KR10', 'KR10-2658', '2026-10-27', '18522 Vision CGS 16', '패들', '프로 1·2세대'::text, 7::numeric, 36364::numeric, 254548::numeric, 25454::numeric, 'KR10-2658 견적서 10월 28일 출고(1세대~3세대, 프리모, 신발).pdf'),
  ('KR10', 'KR10-2658', '2026-10-27', '18502 Ben Johns Hyperion CFS 16mm', '패들', '프로 1·2세대'::text, 15::numeric, 40909::numeric, 613635::numeric, 61363::numeric, 'KR10-2658 견적서 10월 28일 출고(1세대~3세대, 프리모, 신발).pdf'),
  ('KR10', 'KR10-2658', '2026-10-27', '18516 Ben Johns Perseus CFS 16mm', '패들', '프로 1·2세대'::text, 14::numeric, 40909::numeric, 572726::numeric, 57272::numeric, 'KR10-2658 견적서 10월 28일 출고(1세대~3세대, 프리모, 신발).pdf'),
  ('KR10', 'KR10-2658', '2026-10-27', '18517 Collin Johns Scorpeus CFS 16mm', '패들', '프로 1·2세대'::text, 4::numeric, 40909::numeric, 163636::numeric, 16363::numeric, 'KR10-2658 견적서 10월 28일 출고(1세대~3세대, 프리모, 신발).pdf'),
  ('KR10', 'KR10-2658', '2026-10-27', '17068 Joola Anna Bright Scorpeus 3S 14mm', '패들', '3S'::text, 8::numeric, 45455::numeric, 363640::numeric, 36364::numeric, 'KR10-2658 견적서 10월 28일 출고(1세대~3세대, 프리모, 신발).pdf'),
  ('KR10', 'KR10-2658', '2026-10-27', '17067 Collin Johns 16mm (3S)', '패들', '3S'::text, 7::numeric, 45455::numeric, 318185::numeric, 31818::numeric, 'KR10-2658 견적서 10월 28일 출고(1세대~3세대, 프리모, 신발).pdf'),
  ('KR10', 'KR10-2658', '2026-10-27', '17070 Ben Johns Hyperion 16mm (3S)', '패들', '3S'::text, 1::numeric, 45455::numeric, 45455::numeric, 4545::numeric, 'KR10-2658 견적서 10월 28일 출고(1세대~3세대, 프리모, 신발).pdf'),
  ('KR10', 'KR10-2658', '2026-10-27', '17002 Ben Johns Hyperion C2 CFS 16mm', '패들', '프로 1·2세대'::text, 7::numeric, 40909::numeric, 286363::numeric, 28636::numeric, 'KR10-2658 견적서 10월 28일 출고(1세대~3세대, 프리모, 신발).pdf'),
  ('KR10', 'KR10-2658', '2026-10-27', '17065 Tyson McGuffin Magnus 3S 16mm', '패들', '3S'::text, 5::numeric, 45455::numeric, 227275::numeric, 22727::numeric, 'KR10-2658 견적서 10월 28일 출고(1세대~3세대, 프리모, 신발).pdf'),
  ('KR10', 'KR10-2659', '2026-10-28', '18501 Ben Johns Hyperion CAS 13.5', '패들', '프로 1·2세대'::text, 4::numeric, 36364::numeric, 145456::numeric, 14545::numeric, 'KR10-2659 견적서 10월 28일 출고(1세대~3세대).pdf'),
  ('KR10', 'KR10-2659', '2026-10-28', '17003 Ben Johns Hyperion C2 CFS 14mm', '패들', '프로 1·2세대'::text, 15::numeric, 40909::numeric, 613635::numeric, 61363::numeric, 'KR10-2659 견적서 10월 28일 출고(1세대~3세대).pdf'),
  ('KR10', 'KR10-2659', '2026-10-28', '18515 Ben Johns Perseus CFS 14mm', '패들', '프로 1·2세대'::text, 9::numeric, 40909::numeric, 368181::numeric, 36818::numeric, 'KR10-2659 견적서 10월 28일 출고(1세대~3세대).pdf'),
  ('KR10', 'KR10-2659', '2026-10-28', '17066 Tyson McGuffin Magnus 3S 14mm', '패들', '3S'::text, 14::numeric, 45455::numeric, 636370::numeric, 63637::numeric, 'KR10-2659 견적서 10월 28일 출고(1세대~3세대).pdf'),
  ('KR10', 'KR10-2659', '2026-10-28', '17064 Ben Johns Perseus 14mm (3S)', '패들', '3S'::text, 12::numeric, 45455::numeric, 545460::numeric, 54546::numeric, 'KR10-2659 견적서 10월 28일 출고(1세대~3세대).pdf'),
  ('KR10', 'KR10-2659', '2026-10-28', '17071 Ben Johns Hyperion 14mm (3S)', '패들', '3S'::text, 9::numeric, 45455::numeric, 409095::numeric, 40909::numeric, 'KR10-2659 견적서 10월 28일 출고(1세대~3세대).pdf'),
  ('KR07', 'KR07-2605', '2026-10-28', '600016 Perseus Pro IV 16mm - Asia Colorway (DTC)', '패들', '프로IV'::text, 15::numeric, 96700::numeric, 1450500::numeric, 145050::numeric, 'KR07-2605 견적서(블랙프라이데이 패들2).pdf'),
  ('KR07', 'KR07-2605', '2026-10-28', '300837 SS25 Agassi IV 16mm (Global)', '패들', '프로IV'::text, 2::numeric, 96700::numeric, 193400::numeric, 19340::numeric, 'KR07-2605 견적서(블랙프라이데이 패들2).pdf'),
  ('KR07', 'KR07-2605', '2026-10-28', '300831 SS25 Hyperion IV 16mm (Global)', '패들', '프로IV'::text, 5::numeric, 96700::numeric, 483500::numeric, 48350::numeric, 'KR07-2605 견적서(블랙프라이데이 패들2).pdf'),
  ('KR07', 'KR07-2605', '2026-10-28', '600559 JOOLA Perseus Pro V Ben Johns Blaze Red 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 2::numeric, 193600::numeric, 387200::numeric, 38720::numeric, 'KR07-2605 견적서(블랙프라이데이 패들2).pdf'),
  ('KR07', 'KR07-2605', '2026-10-28', '600577 JOOLA Kosmos Pro V Federico Staksrud Surge Green 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 1::numeric, 193600::numeric, 193600::numeric, 19360::numeric, 'KR07-2605 견적서(블랙프라이데이 패들2).pdf')
) as v(kr_code, order_no, quote_date, product_name, category, subcategory, quantity, unit_price, amount, tax, source_file)
where not exists (select 1 from dealer_quote_items i where i.order_no = v.order_no);

-- 이전 견적에 들어가 있던 CAS/CGS/CFS/C2 CFS 계열(Vision CGS 포함)을 같은 분류로 맞춘다.
-- 이미 '프로 1·2세대'인 행은 건드리지 않으므로 여러 번 실행해도 안전하다.
update dealer_quote_items
set subcategory = '프로 1·2세대'
where category = '패들'
  and product_name ~* '\m(CAS|CGS|CFS)\M'
  and subcategory is distinct from '프로 1·2세대';

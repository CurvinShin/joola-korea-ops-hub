-- 2026년 10월 1~8일 견적서 7건 반영 (2026-10-08 기준 스냅샷).
-- dealer_quotes(견적서 합계 → /sales 이번 달 딜러 매출)와 dealer_quote_items(품목 → 제품군 분석)를
-- 함께 추가한다. 0029 이후 새로 나온 견적서 전부이며, 합계금액은 부가세 포함 13,186,965원.
--   KR01-2614(10/08) 539,880 · KR09-2626(10/08) 1,352,780 · KR10-2652(10/01) 3,019,280
--   KR10-2653(10/06) 4,114,660 · KR11-2607(10/01) 977,350 · KR13-2613(10/02) 2,263,525 · KR13-2614(10/07) 919,490
-- 품목 분류는 0028과 동일한 기준(Perseus/Scorpeus/Hyperion Heat·Double Vision은 '비전', 양말은 '의류',
-- 가방·패들커버·토트백은 '악세사리'). 배송비(Delivery Cost) 행은 제외했고, 금액은 공급가액(부가세 별도)이다.
-- 참고: KR10-2653의 604672 POWER FX 1개(95,100원)는 견적서에 "(demo)" 표시가 없지만 데모 수량이 없어서
--       본품을 데모 가격에 판매한 건이다(확인 완료). 같은 견적서의 600305 패들커버 0원은 무상 제공이다.
-- 여러 번 실행해도 중복 입력되지 않도록 order_no 기준으로 이미 있는 건은 건너뛴다.

insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file)
select v.kr_code, v.order_no, v.quote_date::date, v.amount, v.payment_terms, v.source_file
from (values
  ('KR01', 'KR01-2614', '2026-10-08', 539880, '선결제', 'KR01-2614 견적서(10월 8일 출고, PRO V, IV, 양말).pdf'),
  ('KR09', 'KR09-2626', '2026-10-08', 1352780, '선결제', 'KR09-2626 견적서(10월 8일 출고, R4lly 신발, 패들 커버 등).pdf'),
  ('KR10', 'KR10-2652', '2026-10-01', 3019280, '선결제', 'KR10-2652 견적서 10월 1일 출고(Washed Indigo, Tote bag).pdf'),
  ('KR10', 'KR10-2653', '2026-10-06', 4114660, '선결제', 'KR10-2653 견적서 10월 6일 출고(POWER FX, PRO V 등).pdf'),
  ('KR11', 'KR11-2607', '2026-10-01', 977350, '선결제', 'KR11-2607 견적서(10월 1일 출고, POWER FX).pdf'),
  ('KR13', 'KR13-2613', '2026-10-02', 2263525, '선결제', 'KR13-2613 견적서(10월 2일 출고, 비전패들, 프리모 인도어 플러스 등).pdf'),
  ('KR13', 'KR13-2614', '2026-10-07', 919490, '선결제', 'KR13-2614 견적서(10월 7일 출고, 3S Dual, PRO V).pdf')
) as v(kr_code, order_no, quote_date, amount, payment_terms, source_file)
where not exists (select 1 from dealer_quotes q where q.order_no = v.order_no and q.source_file = v.source_file);

insert into dealer_quote_items
  (kr_code, order_no, quote_date, product_name, category, subcategory, quantity, unit_price, amount, tax, source_file)
select v.kr_code, v.order_no, v.quote_date::date, v.product_name, v.category, v.subcategory, v.quantity, v.unit_price, v.amount, v.tax, v.source_file
from (values
  ('KR01', 'KR01-2614', '2026-10-08', '600568 JOOLA Scorpeus Pro V Anna Bright JOOLA Yellow 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 1::numeric, 300800::numeric, 300800::numeric, 30080::numeric, 'KR01-2614 견적서(10월 8일 출고, PRO V, IV, 양말).pdf'),
  ('KR01', 'KR01-2614', '2026-10-08', '300834 SS25 Agassi IV 14mm (Global)', '패들', '프로IV'::text, 1::numeric, 176600::numeric, 176600::numeric, 17660::numeric, 'KR01-2614 견적서(10월 8일 출고, PRO V, IV, 양말).pdf'),
  ('KR01', 'KR01-2614', '2026-10-08', '601333 JOOLA Team Ankle Socks (Black) - M', '의류', NULL::text, 3::numeric, 2800::numeric, 8400::numeric, 840::numeric, 'KR01-2614 견적서(10월 8일 출고, PRO V, IV, 양말).pdf'),
  ('KR09', 'KR09-2626', '2026-10-08', '600721 Men''s FUNKSH1n_PB: R4LLy (WHT/Gum) - 7.5', '신발', NULL::text, 1::numeric, 170800::numeric, 170800::numeric, 17080::numeric, 'KR09-2626 견적서(10월 8일 출고, R4lly 신발, 패들 커버 등).pdf'),
  ('KR09', 'KR09-2626', '2026-10-08', '600304 JOOLA Universal Neoprene Cover - Lucky Always', '악세사리', NULL::text, 20::numeric, 20000::numeric, 400000::numeric, 40000::numeric, 'KR09-2626 견적서(10월 8일 출고, R4lly 신발, 패들 커버 등).pdf'),
  ('KR09', 'KR09-2626', '2026-10-08', '600304 JOOLA Universal Neoprene Cover - Lucky Always(demo)', '악세사리', NULL::text, 2::numeric, 10800::numeric, 21600::numeric, 2160::numeric, 'KR09-2626 견적서(10월 8일 출고, R4lly 신발, 패들 커버 등).pdf'),
  ('KR09', 'KR09-2626', '2026-10-08', '600305 JOOLA Universal Neoprene Cover - Ready Always', '악세사리', NULL::text, 20::numeric, 20000::numeric, 400000::numeric, 40000::numeric, 'KR09-2626 견적서(10월 8일 출고, R4lly 신발, 패들 커버 등).pdf'),
  ('KR09', 'KR09-2626', '2026-10-08', '600305 JOOLA Universal Neoprene Cover - Ready Always(demo)', '악세사리', NULL::text, 2::numeric, 10800::numeric, 21600::numeric, 2160::numeric, 'KR09-2626 견적서(10월 8일 출고, R4lly 신발, 패들 커버 등).pdf'),
  ('KR09', 'KR09-2626', '2026-10-08', '17417 Neoprene Paddle Cover Agassi', '악세사리', NULL::text, 10::numeric, 20000::numeric, 200000::numeric, 20000::numeric, 'KR09-2626 견적서(10월 8일 출고, R4lly 신발, 패들 커버 등).pdf'),
  ('KR09', 'KR09-2626', '2026-10-08', '17417 Neoprene Paddle Cover Agassi(demo)', '악세사리', NULL::text, 1::numeric, 10800::numeric, 10800::numeric, 1080::numeric, 'KR09-2626 견적서(10월 8일 출고, R4lly 신발, 패들 커버 등).pdf'),
  ('KR10', 'KR10-2652', '2026-10-01', '601885 JOOLA Agassi Pro V Andre Agassi Washed Indigo 16mm Pickleball Paddle (DTC)', '패들', '프로V'::text, 8::numeric, 300800::numeric, 2406400::numeric, 240640::numeric, 'KR10-2652 견적서 10월 1일 출고(Washed Indigo, Tote bag).pdf'),
  ('KR10', 'KR10-2652', '2026-10-01', '600036 JOOLA Everyday Tote Bag (Black) - OSFM', '악세사리', NULL::text, 1::numeric, 82100::numeric, 82100::numeric, 8210::numeric, 'KR10-2652 견적서 10월 1일 출고(Washed Indigo, Tote bag).pdf'),
  ('KR10', 'KR10-2652', '2026-10-01', '600037 JOOLA Everyday Tote Bag (Latte) - OSFM', '악세사리', NULL::text, 2::numeric, 82100::numeric, 164200::numeric, 16420::numeric, 'KR10-2652 견적서 10월 1일 출고(Washed Indigo, Tote bag).pdf'),
  ('KR10', 'KR10-2652', '2026-10-01', '600038 JOOLA Everyday Tote Bag (White) - OSFM', '악세사리', NULL::text, 1::numeric, 82100::numeric, 82100::numeric, 8210::numeric, 'KR10-2652 견적서 10월 1일 출고(Washed Indigo, Tote bag).pdf'),
  ('KR10', 'KR10-2653', '2026-10-06', '600577 JOOLA Kosmos Pro V Federico Staksrud Surge Green 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 3::numeric, 300800::numeric, 902400::numeric, 90240::numeric, 'KR10-2653 견적서 10월 6일 출고(POWER FX, PRO V 등).pdf'),
  ('KR10', 'KR10-2653', '2026-10-06', '600153 Scorpeus Pro IV 14mm - Asia Colorway (DTC)', '패들', '프로IV'::text, 2::numeric, 200300::numeric, 400600::numeric, 40060::numeric, 'KR10-2653 견적서 10월 6일 출고(POWER FX, PRO V 등).pdf'),
  ('KR10', 'KR10-2653', '2026-10-06', '300828 Pickleball Paddle Hyperion IV 14mm (Global)', '패들', '프로IV'::text, 3::numeric, 188500::numeric, 565500::numeric, 56550::numeric, 'KR10-2653 견적서 10월 6일 출고(POWER FX, PRO V 등).pdf'),
  ('KR10', 'KR10-2653', '2026-10-06', '604672 JOOLA Perseus POWER FX Daydream 16mm Pickleball Paddle (Global)', '패들', 'PowerFX'::text, 10::numeric, 176700::numeric, 1767000::numeric, 176700::numeric, 'KR10-2653 견적서 10월 6일 출고(POWER FX, PRO V 등).pdf'),
  ('KR10', 'KR10-2653', '2026-10-06', '604672 JOOLA Perseus POWER FX Daydream 16mm Pickleball Paddle (Global)', '패들', 'PowerFX'::text, 1::numeric, 95100::numeric, 95100::numeric, 9510::numeric, 'KR10-2653 견적서 10월 6일 출고(POWER FX, PRO V 등).pdf'),
  ('KR10', 'KR10-2653', '2026-10-06', '600305 JOOLA Universal Neoprene Cover - Ready Always', '악세사리', NULL::text, 1::numeric, 0::numeric, 0::numeric, 0::numeric, 'KR10-2653 견적서 10월 6일 출고(POWER FX, PRO V 등).pdf'),
  ('KR11', 'KR11-2607', '2026-10-01', '604672 JOOLA Perseus POWER FX Daydream 16mm Pickleball Paddle (Global)', '패들', 'PowerFX'::text, 5::numeric, 176700::numeric, 883500::numeric, 88350::numeric, 'KR11-2607 견적서(10월 1일 출고, POWER FX).pdf'),
  ('KR13', 'KR13-2613', '2026-10-02', '600274 Perseus Heat Vision 16mm - Ignite Blaze Red (Global)', '패들', '비전'::text, 9::numeric, 99900::numeric, 899100::numeric, 89910::numeric, 'KR13-2613 견적서(10월 2일 출고, 비전패들, 프리모 인도어 플러스 등).pdf'),
  ('KR13', 'KR13-2613', '2026-10-02', '600274 Perseus Heat Vision 16mm - Gradient Blaze Red (Global)(demo)', '패들', '비전'::text, 1::numeric, 59150::numeric, 59150::numeric, 5915::numeric, 'KR13-2613 견적서(10월 2일 출고, 비전패들, 프리모 인도어 플러스 등).pdf'),
  ('KR13', 'KR13-2613', '2026-10-02', '600330 JOOLA Tour Elite Pro Pickleball Bag (Navy)', '악세사리', NULL::text, 4::numeric, 141200::numeric, 564800::numeric, 56480::numeric, 'KR13-2613 견적서(10월 2일 출고, 비전패들, 프리모 인도어 플러스 등).pdf'),
  ('KR13', 'KR13-2613', '2026-10-02', '600329 JOOLA Tour Elite Pro Pickleball Bag (Black/JOOLA Yellow)', '악세사리', NULL::text, 2::numeric, 141200::numeric, 282400::numeric, 28240::numeric, 'KR13-2613 견적서(10월 2일 출고, 비전패들, 프리모 인도어 플러스 등).pdf'),
  ('KR13', 'KR13-2613', '2026-10-02', '600001 JOOLA Primo Indoor Plus (3 Pack)', '공', NULL::text, 20::numeric, 11200::numeric, 224000::numeric, 22400::numeric, 'KR13-2613 견적서(10월 2일 출고, 비전패들, 프리모 인도어 플러스 등).pdf'),
  ('KR13', 'KR13-2613', '2026-10-02', '600001 JOOLA Primo Indoor Plus (3 Pack)(demo)', '공', NULL::text, 2::numeric, 6650::numeric, 13300::numeric, 1330::numeric, 'KR13-2613 견적서(10월 2일 출고, 비전패들, 프리모 인도어 플러스 등).pdf'),
  ('KR13', 'KR13-2614', '2026-10-07', '600571 JOOLA Scorpeus Pro V Collin Johns Club Green 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 1::numeric, 300800::numeric, 300800::numeric, 30080::numeric, 'KR13-2614 견적서(10월 7일 출고, 3S Dual, PRO V).pdf'),
  ('KR13', 'KR13-2614', '2026-10-07', '600121 Perseus 3S Dual 16mm (Global)', '패들', '3S'::text, 3::numeric, 176700::numeric, 530100::numeric, 53010::numeric, 'KR13-2614 견적서(10월 7일 출고, 3S Dual, PRO V).pdf')
) as v(kr_code, order_no, quote_date, product_name, category, subcategory, quantity, unit_price, amount, tax, source_file)
where not exists (select 1 from dealer_quote_items i where i.order_no = v.order_no);

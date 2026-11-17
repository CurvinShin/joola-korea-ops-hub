-- 2026년 11월 4~12일 견적일자 견적서 10건 추가 반영 (0074 이후 새로 나온 건) + 딜러 구매액 합계 최신화(기준일 2026-11-13).
--   KR13-2616(11/4) · KR10-2661(11/6) · KR07-2606·KR09-2630·KR10-2662·KR11-2611·KR13-2617(11/9) · KR09-2631·KR10-2663·KR11-2612(11/12)
-- 합계금액은 부가세 포함 46,794,880원. quote_date는 견적서의 '견적일자'를 따랐다(0040/0062/0067/0074와 동일).
-- 금액은 공급가액(부가세 별도)이고 배송비(Delivery Cost) 행은 품목에서 제외했다. 세액은 PDF처럼 행마다 내림.
-- 분류 메모: Double Vision·Heat Vision·Hyperion Vision은 '비전', Pro V(Rally Rocket 포함)는 '프로V', SS25 ~ IV·Pro IV는 '프로IV',
--   Mischief(POWER FX)는 'PowerFX'. 네트·볼캐디·엣지가드 테이프는 '악세사리', 양말은 '의류', Primo·HC-40·Heleus는 '공'.
-- ※ 0074(견적서 5건)를 먼저 실행한 뒤 이 파일을 실행한다. 이미 DB에 들어가 있는 건은 order_no 기준으로 건너뛰므로 여러 번 실행해도 중복되지 않는다.

insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file)
select v.kr_code, v.order_no, v.quote_date::date, v.amount, v.payment_terms, v.source_file
from (values
  ('KR07', 'KR07-2606', '2026-11-09', 963710, '선결제', 'KR07-2606 견적서(BF패들3).pdf'),
  ('KR09', 'KR09-2630', '2026-11-09', 7059580, '선결제', 'KR09-2630 견적서(11월 10일 출고, BF패들, 네트, 볼캐디 등).pdf'),
  ('KR09', 'KR09-2631', '2026-11-12', 12508650, '선결제', 'KR09-2631 견적서(11월 12일 출고, Vision series 등).pdf'),
  ('KR10', 'KR10-2661', '2026-11-06', 2375780, '선결제', 'KR10-2661 견적서 11월 6일 출고(Mischief, 양말, 신발, 브리또엣지가드 등).pdf'),
  ('KR10', 'KR10-2662', '2026-11-09', 7448870, '선결제', 'KR10-2662 견적서 11월 10일 출고(BF패들, 공 등)수정1.pdf'),
  ('KR10', 'KR10-2663', '2026-11-12', 411400, '선결제', 'KR10-2663 견적서 11월 12일 출고(랠리팝 패들, 엣지가드 테이프, 양말 등).pdf'),
  ('KR11', 'KR11-2611', '2026-11-09', 431420, '선결제', 'KR11-2611 견적서(11월 10일 출고, BF패들).pdf'),
  ('KR11', 'KR11-2612', '2026-11-12', 1070300, '선결제', 'KR11-2612 견적서(11월 12일 출고, PRO V KOSMOS).pdf'),
  ('KR13', 'KR13-2616', '2026-11-04', 1178980, '선결제', 'KR13-2616 견적서(11월 4일 출고, Hyperion Vision 등).pdf'),
  ('KR13', 'KR13-2617', '2026-11-09', 13346190, '선결제', 'KR13-2617 견적서(11월 10일 출고, BF패들, 네트, 인도어볼 백오더 등).pdf')
) as v(kr_code, order_no, quote_date, amount, payment_terms, source_file)
where not exists (select 1 from dealer_quotes q where q.order_no = v.order_no);

insert into dealer_quote_items
  (kr_code, order_no, quote_date, product_name, category, subcategory, quantity, unit_price, amount, tax, source_file)
select v.kr_code, v.order_no, v.quote_date::date, v.product_name, v.category, v.subcategory, v.quantity, v.unit_price, v.amount, v.tax, v.source_file
from (values
  ('KR07', 'KR07-2606', '2026-11-09', '300840 SS25 Graf IV 16mm (Global)', '패들', '프로IV'::text, 1::numeric, 96700::numeric, 96700::numeric, 9670::numeric, 'KR07-2606 견적서(BF패들3).pdf'),
  ('KR07', 'KR07-2606', '2026-11-09', '600577 JOOLA Kosmos Pro V Federico Staksrud Surge Green 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 4::numeric, 193600::numeric, 774400::numeric, 77440::numeric, 'KR07-2606 견적서(BF패들3).pdf'),
  ('KR09', 'KR09-2630', '2026-11-09', '18233 JOOLA Elemental Pickleball Net', '악세사리', NULL::text, 13::numeric, 153000::numeric, 1989000::numeric, 198900::numeric, 'KR09-2630 견적서(11월 10일 출고, BF패들, 네트, 볼캐디 등).pdf'),
  ('KR09', 'KR09-2630', '2026-11-09', '18233 JOOLA Elemental Pickleball Net(demo)', '악세사리', NULL::text, 2::numeric, 82400::numeric, 164800::numeric, 16480::numeric, 'KR09-2630 견적서(11월 10일 출고, BF패들, 네트, 볼캐디 등).pdf'),
  ('KR09', 'KR09-2630', '2026-11-09', '600559 JOOLA Perseus Pro V Ben Johns Blaze Red 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 5::numeric, 193600::numeric, 968000::numeric, 96800::numeric, 'KR09-2630 견적서(11월 10일 출고, BF패들, 네트, 볼캐디 등).pdf'),
  ('KR09', 'KR09-2630', '2026-11-09', '600562 JOOLA Perseus Pro V Simone Jardim Breeze Blue 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 1::numeric, 193600::numeric, 193600::numeric, 19360::numeric, 'KR09-2630 견적서(11월 10일 출고, BF패들, 네트, 볼캐디 등).pdf'),
  ('KR09', 'KR09-2630', '2026-11-09', '600565 JOOLA Scorpeus Pro V Anna Bright JOOLA Yellow 14mm Pickleball Paddle (Global)', '패들', '프로V'::text, 2::numeric, 193600::numeric, 387200::numeric, 38720::numeric, 'KR09-2630 견적서(11월 10일 출고, BF패들, 네트, 볼캐디 등).pdf'),
  ('KR09', 'KR09-2630', '2026-11-09', '600568 JOOLA Scorpeus Pro V Anna Bright JOOLA Yellow 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 2::numeric, 193600::numeric, 387200::numeric, 38720::numeric, 'KR09-2630 견적서(11월 10일 출고, BF패들, 네트, 볼캐디 등).pdf'),
  ('KR09', 'KR09-2630', '2026-11-09', '18369 Symmetry Pickleball Net', '악세사리', NULL::text, 5::numeric, 324400::numeric, 1622000::numeric, 162200::numeric, 'KR09-2630 견적서(11월 10일 출고, BF패들, 네트, 볼캐디 등).pdf'),
  ('KR09', 'KR09-2630', '2026-11-09', '18569 JOOLA Pickleball Ball Caddy', '악세사리', NULL::text, 5::numeric, 141200::numeric, 706000::numeric, 70600::numeric, 'KR09-2630 견적서(11월 10일 출고, BF패들, 네트, 볼캐디 등).pdf'),
  ('KR09', 'KR09-2631', '2026-11-12', '600097 JOOLA Hyperion Vision 16mm - Storm - Blue Pickleball Paddle (DTC)', '패들', '비전'::text, 30::numeric, 76200::numeric, 2286000::numeric, 228600::numeric, 'KR09-2631 견적서(11월 12일 출고, Vision series 등).pdf'),
  ('KR09', 'KR09-2631', '2026-11-12', '600097 JOOLA Hyperion Vision 16mm - Storm - Blue Pickleball Paddle (DTC)(demo)', '패들', '비전'::text, 3::numeric, 41000::numeric, 123000::numeric, 12300::numeric, 'KR09-2631 견적서(11월 12일 출고, Vision series 등).pdf'),
  ('KR09', 'KR09-2631', '2026-11-12', '600280 Perseus Double Vision 16mm - Blaze Red (Global)', '패들', '비전'::text, 7::numeric, 111700::numeric, 781900::numeric, 78190::numeric, 'KR09-2631 견적서(11월 12일 출고, Vision series 등).pdf'),
  ('KR09', 'KR09-2631', '2026-11-12', '600284 Hyperion Double Vision 16mm - Ignite Red (Global)', '패들', '비전'::text, 4::numeric, 111700::numeric, 446800::numeric, 44680::numeric, 'KR09-2631 견적서(11월 12일 출고, Vision series 등).pdf'),
  ('KR09', 'KR09-2631', '2026-11-12', '600398 Hyperion Double Vision 16mm - Bolt Blue (Global)', '패들', '비전'::text, 5::numeric, 111700::numeric, 558500::numeric, 55850::numeric, 'KR09-2631 견적서(11월 12일 출고, Vision series 등).pdf'),
  ('KR09', 'KR09-2631', '2026-11-12', '600400 Hyperion Double Vision 16mm - Charge Green (Global)', '패들', '비전'::text, 5::numeric, 111700::numeric, 558500::numeric, 55850::numeric, 'KR09-2631 견적서(11월 12일 출고, Vision series 등).pdf'),
  ('KR09', 'KR09-2631', '2026-11-12', '600390 Perseus Double Vision 16mm - Bolt Blue (Global)', '패들', '비전'::text, 10::numeric, 111700::numeric, 1117000::numeric, 111700::numeric, 'KR09-2631 견적서(11월 12일 출고, Vision series 등).pdf'),
  ('KR09', 'KR09-2631', '2026-11-12', '600390 Perseus Double Vision 16mm - Bolt Blue (Global)(demo)', '패들', '비전'::text, 1::numeric, 60100::numeric, 60100::numeric, 6010::numeric, 'KR09-2631 견적서(11월 12일 출고, Vision series 등).pdf'),
  ('KR09', 'KR09-2631', '2026-11-12', '600392 Perseus Double Vision 16mm - Surge Green (Global)', '패들', '비전'::text, 10::numeric, 111700::numeric, 1117000::numeric, 111700::numeric, 'KR09-2631 견적서(11월 12일 출고, Vision series 등).pdf'),
  ('KR09', 'KR09-2631', '2026-11-12', '600392 Perseus Double Vision 16mm - Charge Green (Global)(demo)', '패들', '비전'::text, 1::numeric, 60100::numeric, 60100::numeric, 6010::numeric, 'KR09-2631 견적서(11월 12일 출고, Vision series 등).pdf'),
  ('KR09', 'KR09-2631', '2026-11-12', '600378 Perseus Heat Vision 16mm - Charge Surge Green (Global)', '패들', '비전'::text, 4::numeric, 94000::numeric, 376000::numeric, 37600::numeric, 'KR09-2631 견적서(11월 12일 출고, Vision series 등).pdf'),
  ('KR09', 'KR09-2631', '2026-11-12', '600380 Perseus Heat Vision 16mm - Flash JOOLA Yellow (Global)', '패들', '비전'::text, 9::numeric, 94000::numeric, 846000::numeric, 84600::numeric, 'KR09-2631 견적서(11월 12일 출고, Vision series 등).pdf'),
  ('KR09', 'KR09-2631', '2026-11-12', '600274 Perseus Heat Vision 16mm - Ignite Blaze Red (Global)', '패들', '비전'::text, 9::numeric, 94000::numeric, 846000::numeric, 84600::numeric, 'KR09-2631 견적서(11월 12일 출고, Vision series 등).pdf'),
  ('KR09', 'KR09-2631', '2026-11-12', '600282 Scorpeus Double Vision 16mm - Ignite Red (Global)', '패들', '비전'::text, 2::numeric, 111700::numeric, 223400::numeric, 22340::numeric, 'KR09-2631 견적서(11월 12일 출고, Vision series 등).pdf'),
  ('KR09', 'KR09-2631', '2026-11-12', '600394 Scorpeus Double Vision 16mm - Bolt Blue (Global)', '패들', '비전'::text, 3::numeric, 111700::numeric, 335100::numeric, 33510::numeric, 'KR09-2631 견적서(11월 12일 출고, Vision series 등).pdf'),
  ('KR09', 'KR09-2631', '2026-11-12', '600396 Scorpeus Double Vision 16mm - Charge Green (Global)', '패들', '비전'::text, 2::numeric, 111700::numeric, 223400::numeric, 22340::numeric, 'KR09-2631 견적서(11월 12일 출고, Vision series 등).pdf'),
  ('KR09', 'KR09-2631', '2026-11-12', '600382 Scorpeus Heat Vision 16mm - Gradient Surge Green (Global)', '패들', '비전'::text, 9::numeric, 94000::numeric, 846000::numeric, 84600::numeric, 'KR09-2631 견적서(11월 12일 출고, Vision series 등).pdf'),
  ('KR09', 'KR09-2631', '2026-11-12', '600384 Scorpeus Heat Vision 16mm - Gradient Flash Yellow (Global)', '패들', '비전'::text, 4::numeric, 94000::numeric, 376000::numeric, 37600::numeric, 'KR09-2631 견적서(11월 12일 출고, Vision series 등).pdf'),
  ('KR09', 'KR09-2631', '2026-11-12', '600276 Scorpeus Heat Vision 16mm - Gradient Blaze Red (Global)', '패들', '비전'::text, 1::numeric, 94000::numeric, 94000::numeric, 9400::numeric, 'KR09-2631 견적서(11월 12일 출고, Vision series 등).pdf'),
  ('KR09', 'KR09-2631', '2026-11-12', '300822 SS25 Scorpeus IV 14mm (Global)', '패들', '프로IV'::text, 1::numeric, 96700::numeric, 96700::numeric, 9670::numeric, 'KR09-2631 견적서(11월 12일 출고, Vision series 등).pdf'),
  ('KR10', 'KR10-2661', '2026-11-06', '604670 Perseus POWER FX Mischief 16mm (DTC)', '패들', 'PowerFX'::text, 10::numeric, 176700::numeric, 1767000::numeric, 176700::numeric, 'KR10-2661 견적서 11월 6일 출고(Mischief, 양말, 신발, 브리또엣지가드 등).pdf'),
  ('KR10', 'KR10-2661', '2026-11-06', '601459 JOOLA Men''s Pickleball Shoes FUNKSH1n_PB: R4LLy (White/Black-Pickleball Green) - 9', '신발', NULL::text, 2::numeric, 153000::numeric, 306000::numeric, 30600::numeric, 'KR10-2661 견적서 11월 6일 출고(Mischief, 양말, 신발, 브리또엣지가드 등).pdf'),
  ('KR10', 'KR10-2661', '2026-11-06', '17304 JOOLA x BRITTO Pickleball Edge Guard Tape (W (18mm) x L (80cm)) - Black', '악세사리', NULL::text, 2::numeric, 11200::numeric, 22400::numeric, 2240::numeric, 'KR10-2661 견적서 11월 6일 출고(Mischief, 양말, 신발, 브리또엣지가드 등).pdf'),
  ('KR10', 'KR10-2661', '2026-11-06', '17311 JOOLA x BRITTO Pickleball Edge Guard Tape (Pink) - 18MM x 800MM', '악세사리', NULL::text, 2::numeric, 11200::numeric, 22400::numeric, 2240::numeric, 'KR10-2661 견적서 11월 6일 출고(Mischief, 양말, 신발, 브리또엣지가드 등).pdf'),
  ('KR10', 'KR10-2661', '2026-11-06', '17309 JOOLA x BRITTO Pickleball Edge Guard Tape (W (18mm) x L (80cm)) - Turquois', '악세사리', NULL::text, 2::numeric, 11800::numeric, 23600::numeric, 2360::numeric, 'KR10-2661 견적서 11월 6일 출고(Mischief, 양말, 신발, 브리또엣지가드 등).pdf'),
  ('KR10', 'KR10-2661', '2026-11-06', '601333 JOOLA Team Ankle Socks (Black) - M', '의류', NULL::text, 3::numeric, 2800::numeric, 8400::numeric, 840::numeric, 'KR10-2661 견적서 11월 6일 출고(Mischief, 양말, 신발, 브리또엣지가드 등).pdf'),
  ('KR10', 'KR10-2662', '2026-11-09', '600015 Perseus Pro IV 14mm - Asia Colorway (DTC)', '패들', '프로IV'::text, 1::numeric, 96700::numeric, 96700::numeric, 9670::numeric, 'KR10-2662 견적서 11월 10일 출고(BF패들, 공 등)수정1.pdf'),
  ('KR10', 'KR10-2662', '2026-11-09', '600016 Perseus Pro IV 16mm - Asia Colorway (DTC)', '패들', '프로IV'::text, 1::numeric, 96700::numeric, 96700::numeric, 9670::numeric, 'KR10-2662 견적서 11월 10일 출고(BF패들, 공 등)수정1.pdf'),
  ('KR10', 'KR10-2662', '2026-11-09', '600160 Hyperion Pro IV 16mm - Asia Colorway (DTC)', '패들', '프로IV'::text, 15::numeric, 96700::numeric, 1450500::numeric, 145050::numeric, 'KR10-2662 견적서 11월 10일 출고(BF패들, 공 등)수정1.pdf'),
  ('KR10', 'KR10-2662', '2026-11-09', '300831 SS25 Hyperion IV 16mm (Global)', '패들', '프로IV'::text, 1::numeric, 96700::numeric, 96700::numeric, 9670::numeric, 'KR10-2662 견적서 11월 10일 출고(BF패들, 공 등)수정1.pdf'),
  ('KR10', 'KR10-2662', '2026-11-09', '300819 SS25 Scorpeus IV 16mm (Global)', '패들', '프로IV'::text, 6::numeric, 96700::numeric, 580200::numeric, 58020::numeric, 'KR10-2662 견적서 11월 10일 출고(BF패들, 공 등)수정1.pdf'),
  ('KR10', 'KR10-2662', '2026-11-09', '600153 Scorpeus Pro IV 14mm - Asia Colorway (DTC)', '패들', '프로IV'::text, 3::numeric, 96700::numeric, 290100::numeric, 29010::numeric, 'KR10-2662 견적서 11월 10일 출고(BF패들, 공 등)수정1.pdf'),
  ('KR10', 'KR10-2662', '2026-11-09', '600559 JOOLA Perseus Pro V Ben Johns Blaze Red 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 5::numeric, 193600::numeric, 968000::numeric, 96800::numeric, 'KR10-2662 견적서 11월 10일 출고(BF패들, 공 등)수정1.pdf'),
  ('KR10', 'KR10-2662', '2026-11-09', '600562 JOOLA Perseus Pro V Simone Jardim Breeze Blue 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 2::numeric, 193600::numeric, 387200::numeric, 38720::numeric, 'KR10-2662 견적서 11월 10일 출고(BF패들, 공 등)수정1.pdf'),
  ('KR10', 'KR10-2662', '2026-11-09', '600556 JOOLA Perseus Pro V Ben Johns Blaze Red 14mm Pickleball Paddle (Global)', '패들', '프로V'::text, 1::numeric, 193600::numeric, 193600::numeric, 19360::numeric, 'KR10-2662 견적서 11월 10일 출고(BF패들, 공 등)수정1.pdf'),
  ('KR10', 'KR10-2662', '2026-11-09', '600583 JOOLA Hyperion Pro V Ben Johns Bolt Blue 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 1::numeric, 193600::numeric, 193600::numeric, 19360::numeric, 'KR10-2662 견적서 11월 10일 출고(BF패들, 공 등)수정1.pdf'),
  ('KR10', 'KR10-2662', '2026-11-09', '600574 JOOLA Kosmos Pro V Tyson McGuffin Surge Green 14mm Pickleball Paddle (Global)', '패들', '프로V'::text, 2::numeric, 193600::numeric, 387200::numeric, 38720::numeric, 'KR10-2662 견적서 11월 10일 출고(BF패들, 공 등)수정1.pdf'),
  ('KR10', 'KR10-2662', '2026-11-09', '600565 JOOLA Scorpeus Pro V Anna Bright JOOLA Yellow 14mm Pickleball Paddle (Global)', '패들', '프로V'::text, 1::numeric, 193600::numeric, 193600::numeric, 19360::numeric, 'KR10-2662 견적서 11월 10일 출고(BF패들, 공 등)수정1.pdf'),
  ('KR10', 'KR10-2662', '2026-11-09', '600592 JOOLA Agassi Pro V Andre Agassi Royal Blue 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 5::numeric, 193600::numeric, 968000::numeric, 96800::numeric, 'KR10-2662 견적서 11월 10일 출고(BF패들, 공 등)수정1.pdf'),
  ('KR10', 'KR10-2662', '2026-11-09', '18571 Primo 3 Star - 20 Pack(demo)', '공', NULL::text, 10::numeric, 25100::numeric, 251000::numeric, 25100::numeric, 'KR10-2662 견적서 11월 10일 출고(BF패들, 공 등)수정1.pdf'),
  ('KR10', 'KR10-2662', '2026-11-09', '18570 Primo 3 Star - 4 Pack(demo)', '공', NULL::text, 15::numeric, 6000::numeric, 90000::numeric, 9000::numeric, 'KR10-2662 견적서 11월 10일 출고(BF패들, 공 등)수정1.pdf'),
  ('KR10', 'KR10-2662', '2026-11-09', '18827 Heleus Pickleballs (12 pack)(demo)', '공', NULL::text, 15::numeric, 20000::numeric, 300000::numeric, 30000::numeric, 'KR10-2662 견적서 11월 10일 출고(BF패들, 공 등)수정1.pdf'),
  ('KR10', 'KR10-2662', '2026-11-09', '18828 Heleus Pickleballs (25 pack)(demo)', '공', NULL::text, 1::numeric, 41000::numeric, 41000::numeric, 4100::numeric, 'KR10-2662 견적서 11월 10일 출고(BF패들, 공 등)수정1.pdf'),
  ('KR10', 'KR10-2662', '2026-11-09', '18826 Heleus Pickleballs (4 pack)(demo)', '공', NULL::text, 28::numeric, 6700::numeric, 187600::numeric, 18760::numeric, 'KR10-2662 견적서 11월 10일 출고(BF패들, 공 등)수정1.pdf'),
  ('KR10', 'KR10-2663', '2026-11-12', '601307 JOOLA Pro V Pickleball Protective Edge Guard Tape - Blaze Red', '악세사리', NULL::text, 5::numeric, 12400::numeric, 62000::numeric, 6200::numeric, 'KR10-2663 견적서 11월 12일 출고(랠리팝 패들, 엣지가드 테이프, 양말 등).pdf'),
  ('KR10', 'KR10-2663', '2026-11-12', '601067 JOOLA Kosmos Pro V Rally Rocket 16mm Pickleball Paddle (DTC)', '패들', '프로V'::text, 1::numeric, 277100::numeric, 277100::numeric, 27710::numeric, 'KR10-2663 견적서 11월 12일 출고(랠리팝 패들, 엣지가드 테이프, 양말 등).pdf'),
  ('KR10', 'KR10-2663', '2026-11-12', '601337 JOOLA Team Ankle Socks (Crimson Red) - M', '의류', NULL::text, 10::numeric, 2800::numeric, 28000::numeric, 2800::numeric, 'KR10-2663 견적서 11월 12일 출고(랠리팝 패들, 엣지가드 테이프, 양말 등).pdf'),
  ('KR10', 'KR10-2663', '2026-11-12', '601337 JOOLA Team Ankle Socks (Crimson Red) - M(demo)', '의류', NULL::text, 1::numeric, 1900::numeric, 1900::numeric, 190::numeric, 'KR10-2663 견적서 11월 12일 출고(랠리팝 패들, 엣지가드 테이프, 양말 등).pdf'),
  ('KR11', 'KR11-2611', '2026-11-09', '600577 JOOLA Kosmos Pro V Federico Staksrud Surge Green 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 2::numeric, 193600::numeric, 387200::numeric, 38720::numeric, 'KR11-2611 견적서(11월 10일 출고, BF패들).pdf'),
  ('KR11', 'KR11-2612', '2026-11-12', '600577 JOOLA Kosmos Pro V Federico Staksrud Surge Green 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 5::numeric, 193600::numeric, 968000::numeric, 96800::numeric, 'KR11-2612 견적서(11월 12일 출고, PRO V KOSMOS).pdf'),
  ('KR13', 'KR13-2616', '2026-11-04', '601955 JOOLA Hyperion Vision Crash Teal 16mm Pickleball Paddle (DTC)', '패들', '비전'::text, 6::numeric, 76200::numeric, 457200::numeric, 45720::numeric, 'KR13-2616 견적서(11월 4일 출고, Hyperion Vision 등).pdf'),
  ('KR13', 'KR13-2616', '2026-11-04', '601956 JOOLA Hyperion Vision Eclipse Orange 16mm Pickleball Paddle (DTC)', '패들', '비전'::text, 8::numeric, 76200::numeric, 609600::numeric, 60960::numeric, 'KR13-2616 견적서(11월 4일 출고, Hyperion Vision 등).pdf'),
  ('KR13', 'KR13-2617', '2026-11-09', '300837 SS25 Agassi IV 16mm (Global)', '패들', '프로IV'::text, 2::numeric, 96700::numeric, 193400::numeric, 19340::numeric, 'KR13-2617 견적서(11월 10일 출고, BF패들, 네트, 인도어볼 백오더 등).pdf'),
  ('KR13', 'KR13-2617', '2026-11-09', '600559 JOOLA Perseus Pro V Ben Johns Blaze Red 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 3::numeric, 193600::numeric, 580800::numeric, 58080::numeric, 'KR13-2617 견적서(11월 10일 출고, BF패들, 네트, 인도어볼 백오더 등).pdf'),
  ('KR13', 'KR13-2617', '2026-11-09', '600568 JOOLA Scorpeus Pro V Anna Bright JOOLA Yellow 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 1::numeric, 193600::numeric, 193600::numeric, 19360::numeric, 'KR13-2617 견적서(11월 10일 출고, BF패들, 네트, 인도어볼 백오더 등).pdf'),
  ('KR13', 'KR13-2617', '2026-11-09', '600001 JOOLA Primo Indoor Plus (3 Pack)', '공', NULL::text, 200::numeric, 10600::numeric, 2120000::numeric, 212000::numeric, 'KR13-2617 견적서(11월 10일 출고, BF패들, 네트, 인도어볼 백오더 등).pdf'),
  ('KR13', 'KR13-2617', '2026-11-09', '600001 JOOLA Primo Indoor Plus (3 Pack)(demo)', '공', NULL::text, 20::numeric, 5700::numeric, 114000::numeric, 11400::numeric, 'KR13-2617 견적서(11월 10일 출고, BF패들, 네트, 인도어볼 백오더 등).pdf'),
  ('KR13', 'KR13-2617', '2026-11-09', '600302 JOOLA HC-40 (3PACK)', '공', NULL::text, 50::numeric, 9400::numeric, 470000::numeric, 47000::numeric, 'KR13-2617 견적서(11월 10일 출고, BF패들, 네트, 인도어볼 백오더 등).pdf'),
  ('KR13', 'KR13-2617', '2026-11-09', '600302 JOOLA HC-40 (3PACK)(demo)', '공', NULL::text, 5::numeric, 5100::numeric, 25500::numeric, 2550::numeric, 'KR13-2617 견적서(11월 10일 출고, BF패들, 네트, 인도어볼 백오더 등).pdf'),
  ('KR13', 'KR13-2617', '2026-11-09', '600592 JOOLA Agassi Pro V Andre Agassi Royal Blue 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 4::numeric, 193600::numeric, 774400::numeric, 77440::numeric, 'KR13-2617 견적서(11월 10일 출고, BF패들, 네트, 인도어볼 백오더 등).pdf'),
  ('KR13', 'KR13-2617', '2026-11-09', '600595 JOOLA Graf Pro V Steffi Graf Seaside Green 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 3::numeric, 193600::numeric, 580800::numeric, 58080::numeric, 'KR13-2617 견적서(11월 10일 출고, BF패들, 네트, 인도어볼 백오더 등).pdf'),
  ('KR13', 'KR13-2617', '2026-11-09', '600097 JOOLA Hyperion Vision 16mm - Storm - Blue Pickleball Paddle (DTC)', '패들', '비전'::text, 50::numeric, 76200::numeric, 3810000::numeric, 381000::numeric, 'KR13-2617 견적서(11월 10일 출고, BF패들, 네트, 인도어볼 백오더 등).pdf'),
  ('KR13', 'KR13-2617', '2026-11-09', '600097 JOOLA Hyperion Vision 16mm - Storm - Blue Pickleball Paddle (DTC)(demo)', '패들', '비전'::text, 5::numeric, 41000::numeric, 205000::numeric, 20500::numeric, 'KR13-2617 견적서(11월 10일 출고, BF패들, 네트, 인도어볼 백오더 등).pdf'),
  ('KR13', 'KR13-2617', '2026-11-09', '601955 JOOLA Hyperion Vision Crash Teal 16mm Pickleball Paddle (DTC)', '패들', '비전'::text, 10::numeric, 76200::numeric, 762000::numeric, 76200::numeric, 'KR13-2617 견적서(11월 10일 출고, BF패들, 네트, 인도어볼 백오더 등).pdf'),
  ('KR13', 'KR13-2617', '2026-11-09', '601955 JOOLA Hyperion Vision Crash Teal 16mm Pickleball Paddle (DTC)(demo)', '패들', '비전'::text, 1::numeric, 41000::numeric, 41000::numeric, 4100::numeric, 'KR13-2617 견적서(11월 10일 출고, BF패들, 네트, 인도어볼 백오더 등).pdf'),
  ('KR13', 'KR13-2617', '2026-11-09', '601956 JOOLA Hyperion Vision Eclipse Orange 16mm Pickleball Paddle (DTC)', '패들', '비전'::text, 10::numeric, 76200::numeric, 762000::numeric, 76200::numeric, 'KR13-2617 견적서(11월 10일 출고, BF패들, 네트, 인도어볼 백오더 등).pdf'),
  ('KR13', 'KR13-2617', '2026-11-09', '601956 JOOLA Hyperion Vision Eclipse Orange 16mm Pickleball Paddle (DTC)(demo)', '패들', '비전'::text, 1::numeric, 41000::numeric, 41000::numeric, 4100::numeric, 'KR13-2617 견적서(11월 10일 출고, BF패들, 네트, 인도어볼 백오더 등).pdf'),
  ('KR13', 'KR13-2617', '2026-11-09', '18233 JOOLA Elemental Pickleball Net', '악세사리', NULL::text, 9::numeric, 153000::numeric, 1377000::numeric, 137700::numeric, 'KR13-2617 견적서(11월 10일 출고, BF패들, 네트, 인도어볼 백오더 등).pdf'),
  ('KR13', 'KR13-2617', '2026-11-09', '18233 JOOLA Elemental Pickleball Net(demo)', '악세사리', NULL::text, 1::numeric, 82400::numeric, 82400::numeric, 8240::numeric, 'KR13-2617 견적서(11월 10일 출고, BF패들, 네트, 인도어볼 백오더 등).pdf')
) as v(kr_code, order_no, quote_date, product_name, category, subcategory, quantity, unit_price, amount, tax, source_file)
where not exists (select 1 from dealer_quote_items i where i.order_no = v.order_no);

-- =========================================================================
-- 딜러 페이지 "구매액 합계(견적서 기준)"와 다음 견적서 번호 최신화 (기준일 2026-11-13)
--   올해 구매액   = 2026년 견적일자인 dealer_quotes 합계금액(부가세·배송비 포함)
--   이번달 구매액 = 그중 2026년 11월 견적일자인 것
--   next_seq      = 올해 가장 큰 견적서 번호 + 1 (앱에서 이미 더 큰 번호를 발급했으면 그 값을 유지, 절대 뒤로 가지 않음)
-- 견적서가 한 건이라도 있는 딜러만 바꾸고, 바꾸기 전 값은 백업 테이블에 남긴다.
-- =========================================================================
create table if not exists dealers_quote_totals_backup_20261113 as
select kr_code, ytd_quote_amount, mtd_quote_amount, quote_amount_as_of, next_seq, last_seq_year
from dealers;

update dealers d
set ytd_quote_amount = t.ytd,
    mtd_quote_amount = t.mtd,
    quote_amount_as_of = '2026-11-13'
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

-- 검산 1 — 이번 달(11월) 딜러 매출 합계: 0074(11/2 3건 18,059,250) + 이 파일(10건 46,794,880) = 64,854,130 이면 정상
select to_char(date_trunc('month', quote_date), 'YYYY-MM') as month, count(*) as quotes, sum(amount) as total
from dealer_quotes
where quote_date >= '2026-10-01'
group by 1
order by 1;

-- 검산 2 — 이 파일 견적서 10건: 합계금액 − 품목 합계 = 배송비(부가세 포함)만 남아야 한다.
--   기대값: KR07-2606 5,500, KR09-2630 0, KR09-2631 0, KR10-2661 11,000, KR10-2662 0, KR10-2663 5,500, KR11-2611 5,500, KR11-2612 5,500, KR13-2616 5,500, KR13-2617 0
select q.order_no, q.amount as quote_total,
       coalesce(sum(i.amount + i.tax), 0) as items_total,
       q.amount - coalesce(sum(i.amount + i.tax), 0) as shipping_diff
from dealer_quotes q
left join dealer_quote_items i on i.order_no = q.order_no
where q.order_no in ('KR07-2606','KR09-2630','KR09-2631','KR10-2661','KR10-2662','KR10-2663','KR11-2611','KR11-2612','KR13-2616','KR13-2617')
group by q.order_no, q.amount
order by q.order_no;

-- 검산 3 — 딜러별 이전 값과 비교
select d.kr_code,
       b.ytd_quote_amount as ytd_before, d.ytd_quote_amount as ytd_after,
       b.mtd_quote_amount as mtd_before, d.mtd_quote_amount as mtd_after,
       b.next_seq as seq_before, d.next_seq as seq_after
from dealers d
join dealers_quote_totals_backup_20261113 b on b.kr_code = d.kr_code
where d.kr_code is not null
order by d.kr_code;

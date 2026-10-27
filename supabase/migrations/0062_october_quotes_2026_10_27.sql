-- 2026년 9월 30일~10월 27일 견적서 15건 반영 (2026-10-27 기준 스냅샷).
-- dealer_quotes(견적서 합계 → /sales 딜러 매출)와 dealer_quote_items(품목 → 제품군 분석)를 함께 추가한다.
-- 0040(10/08 스냅샷) 이후 새로 나온 견적서이며, 합계금액은 부가세 포함 40,904,593원.
--   KR10-2655(10/16) · KR11-2608(10/19) · KR10-2656(10/19) · KR01-2616(10/21) · KR07-2604(10/21)
--   KR11-2609(10/21) · KR10-2657(10/22) · KR13-2615(10/22) · KR09-2627(10/27)
--   KR05-2632(10/08) · KR10-2654(10/12) · KR01-2615(10/13) · KR16-2602(9/30, 0040에서 빠져 있던 건)
--   KR00-2612(10/26) · KR00-2613(10/27) ← 외부 고객에게 판매한 건이라 포함(KR00은 지금까지 제외했었음)
-- 품목 분류는 0028/0040과 동일한 기준. 배송비(Delivery Cost) 행은 제외했고, 금액은 공급가액(부가세 별도)이다.
-- quote_date는 견적서의 '견적일자'를 따랐다(0040과 동일).
-- 참고: KR11-2609 PDF 안의 제목은 'KR11-2510'으로 적혀 있으나 파일명·번호 순서(KR11-2608 다음)에 맞춰 KR11-2609로 넣었다.
-- 이미 DB에 들어가 있는 건은 order_no 기준으로 건너뛰므로 여러 번 실행해도 중복되지 않는다.
-- 이 파일에서 빠진 것: KR00의 매출 없는 행사·시설 견적(KR00-2604~2611).

insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file)
select v.kr_code, v.order_no, v.quote_date::date, v.amount, v.payment_terms, v.source_file
from (values
  ('KR01', 'KR01-2616', '2026-10-21', 1560460, '선결제', 'KR01-2616 견적서(10월 22일 출고, POWER FX 추가).pdf'),
  ('KR07', 'KR07-2604', '2026-10-21', 8341740, '선결제', 'KR07-2604 견적서(블랙프라이데이 패들).pdf'),
  ('KR09', 'KR09-2627', '2026-10-27', 1070300, '선결제', 'KR09-2627 견적서(10월 27일 출고, 블랙프라이데이 PRO V 16 HYP).pdf'),
  ('KR10', 'KR10-2655', '2026-10-16', 2551230, '선결제', 'KR10-2655 견적서 10월 16일 출고(POWER FX 등).pdf'),
  ('KR10', 'KR10-2656', '2026-10-19', 12362570, '선결제', 'KR10-2656 견적서 10월 19일 출고(블프데이패들 등).pdf'),
  ('KR10', 'KR10-2657', '2026-10-22', 896940, '선결제', 'KR10-2657 견적서 10월 22일 출고(Primo Inddor plus, 블프데이패들 등).pdf'),
  ('KR11', 'KR11-2608', '2026-10-19', 3345452, '선결제', 'KR11-2608 견적서(10월 20일 출고, 블랙프라이데이).pdf'),
  ('KR11', 'KR11-2609', '2026-10-21', 1496220, '선결제', 'KR11-2609 견적서(10월 22일 출고, 블랙프라이데이 패들).pdf'),
  ('KR13', 'KR13-2615', '2026-10-22', 2500410, '선결제', 'KR13-2615 견적서(10월 22일 출고, 블프데이,POWERFX 등).pdf'),
  ('KR00', 'KR00-2612', '2026-10-26', 500005, '선결제', 'KR00-2612 sales (용인, 피클볼파라다이스, 김상준).pdf'),
  ('KR00', 'KR00-2613', '2026-10-27', 133500, '선결제', 'KR00-2613 sales (광명, 316피클볼, 황재오).pdf'),
  ('KR01', 'KR01-2615', '2026-10-13', 1171720, '선결제', 'KR01-2615 견적서(10월 13일 출고, POWER FX).pdf'),
  ('KR05', 'KR05-2632', '2026-10-08', 667260, '선결제', 'KR05-2632 견적서(10월 8일 출고, PRO V).pdf'),
  ('KR10', 'KR10-2654', '2026-10-12', 782276, '선결제', 'KR10-2654 견적서 10월 12일 출고(JOOLA Tour Elite bag 등, 직배송 포함).pdf'),
  ('KR16', 'KR16-2602', '2026-09-30', 3524510, '선결제', 'KR16-2602 견적서(10월1일 출고, POWER FX).pdf')
) as v(kr_code, order_no, quote_date, amount, payment_terms, source_file)
where not exists (select 1 from dealer_quotes q where q.order_no = v.order_no);

insert into dealer_quote_items
  (kr_code, order_no, quote_date, product_name, category, subcategory, quantity, unit_price, amount, tax, source_file)
select v.kr_code, v.order_no, v.quote_date::date, v.product_name, v.category, v.subcategory, v.quantity, v.unit_price, v.amount, v.tax, v.source_file
from (values
  ('KR01', 'KR01-2616', '2026-10-21', '604672 JOOLA Perseus POWER FX Daydream 16mm Pickleball Paddle (Global)', '패들', 'PowerFX'::text, 8::numeric, 176700::numeric, 1413600::numeric, 141360::numeric, 'KR01-2616 견적서(10월 22일 출고, POWER FX 추가).pdf'),
  ('KR07', 'KR07-2604', '2026-10-21', '300831 SS25 Hyperion IV 16mm (Global)', '패들', '프로IV'::text, 16::numeric, 96700::numeric, 1547200::numeric, 154720::numeric, 'KR07-2604 견적서(블랙프라이데이 패들).pdf'),
  ('KR07', 'KR07-2604', '2026-10-21', '300819 SS25 Scorpeus IV 16mm (Global)', '패들', '프로IV'::text, 4::numeric, 96700::numeric, 386800::numeric, 38680::numeric, 'KR07-2604 견적서(블랙프라이데이 패들).pdf'),
  ('KR07', 'KR07-2604', '2026-10-21', '600568 JOOLA Scorpeus Pro V Anna Bright JOOLA Yellow 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 3::numeric, 193600::numeric, 580800::numeric, 58080::numeric, 'KR07-2604 견적서(블랙프라이데이 패들).pdf'),
  ('KR07', 'KR07-2604', '2026-10-21', '600559 JOOLA Perseus Pro V Ben Johns Blaze Red 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 20::numeric, 193600::numeric, 3872000::numeric, 387200::numeric, 'KR07-2604 견적서(블랙프라이데이 패들).pdf'),
  ('KR07', 'KR07-2604', '2026-10-21', '600577 JOOLA Kosmos Pro V Federico Staksrud Surge Green 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 4::numeric, 193600::numeric, 774400::numeric, 77440::numeric, 'KR07-2604 견적서(블랙프라이데이 패들).pdf'),
  ('KR07', 'KR07-2604', '2026-10-21', '600583 JOOLA Hyperion Pro V Ben Johns Bolt Blue 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 2::numeric, 193600::numeric, 387200::numeric, 38720::numeric, 'KR07-2604 견적서(블랙프라이데이 패들).pdf'),
  ('KR09', 'KR09-2627', '2026-10-27', '600583 JOOLA Hyperion Pro V Ben Johns Bolt Blue 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 5::numeric, 193600::numeric, 968000::numeric, 96800::numeric, 'KR09-2627 견적서(10월 27일 출고, 블랙프라이데이 PRO V 16 HYP).pdf'),
  ('KR10', 'KR10-2655', '2026-10-16', '600282 Scorpeus Double Vision 16mm - Ignite Red (Global)', '패들', '비전'::text, 2::numeric, 123500::numeric, 247000::numeric, 24700::numeric, 'KR10-2655 견적서 10월 16일 출고(POWER FX 등).pdf'),
  ('KR10', 'KR10-2655', '2026-10-16', '604672 JOOLA Perseus POWER FX Daydream 16mm Pickleball Paddle (Global)', '패들', 'PowerFX'::text, 10::numeric, 176700::numeric, 1767000::numeric, 176700::numeric, 'KR10-2655 견적서 10월 16일 출고(POWER FX 등).pdf'),
  ('KR10', 'KR10-2655', '2026-10-16', '604672 JOOLA Perseus POWER FX Daydream 16mm Pickleball Paddle (Global)', '패들', 'PowerFX'::text, 1::numeric, 95100::numeric, 95100::numeric, 9510::numeric, 'KR10-2655 견적서 10월 16일 출고(POWER FX 등).pdf'),
  ('KR10', 'KR10-2655', '2026-10-16', '300840 SS25 Graf IV 16mm (Global)', '패들', '프로IV'::text, 1::numeric, 153000::numeric, 153000::numeric, 15300::numeric, 'KR10-2655 견적서 10월 16일 출고(POWER FX 등).pdf'),
  ('KR10', 'KR10-2655', '2026-10-16', '17304 JOOLA x BRITTO Pickleball Edge Guard Tape (W (18mm) x L (80cm)) - Black', '악세사리', NULL::text, 2::numeric, 11800::numeric, 23600::numeric, 2360::numeric, 'KR10-2655 견적서 10월 16일 출고(POWER FX 등).pdf'),
  ('KR10', 'KR10-2655', '2026-10-16', '17309 JOOLA x BRITTO Pickleball Edge Guard Tape (W (18mm) x L (80cm)) - Turquois', '악세사리', NULL::text, 2::numeric, 11800::numeric, 23600::numeric, 2360::numeric, 'KR10-2655 견적서 10월 16일 출고(POWER FX 등).pdf'),
  ('KR10', 'KR10-2656', '2026-10-19', '600595 JOOLA Graf Pro V Steffi Graf Seaside Green 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 2::numeric, 193600::numeric, 387200::numeric, 38720::numeric, 'KR10-2656 견적서 10월 19일 출고(블프데이패들 등).pdf'),
  ('KR10', 'KR10-2656', '2026-10-19', '600571 JOOLA Scorpeus Pro V Collin Johns Club Green 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 2::numeric, 193600::numeric, 387200::numeric, 38720::numeric, 'KR10-2656 견적서 10월 19일 출고(블프데이패들 등).pdf'),
  ('KR10', 'KR10-2656', '2026-10-19', '600392 Perseus Double Vision 16mm - Surge Green (Global)', '패들', '비전'::text, 1::numeric, 123500::numeric, 123500::numeric, 12350::numeric, 'KR10-2656 견적서 10월 19일 출고(블프데이패들 등).pdf'),
  ('KR10', 'KR10-2656', '2026-10-19', '600583 JOOLA Hyperion Pro V Ben Johns Bolt Blue 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 6::numeric, 193600::numeric, 1161600::numeric, 116160::numeric, 'KR10-2656 견적서 10월 19일 출고(블프데이패들 등).pdf'),
  ('KR10', 'KR10-2656', '2026-10-19', '600592 JOOLA Agassi Pro V Andre Agassi Royal Blue 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 4::numeric, 193600::numeric, 774400::numeric, 77440::numeric, 'KR10-2656 견적서 10월 19일 출고(블프데이패들 등).pdf'),
  ('KR10', 'KR10-2656', '2026-10-19', '600577 JOOLA Kosmos Pro V Federico Staksrud Surge Green 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 10::numeric, 193600::numeric, 1936000::numeric, 193600::numeric, 'KR10-2656 견적서 10월 19일 출고(블프데이패들 등).pdf'),
  ('KR10', 'KR10-2656', '2026-10-19', '600574 JOOLA Kosmos Pro V Tyson McGuffin Surge Green 14mm Pickleball Paddle (Global)', '패들', '프로V'::text, 2::numeric, 193600::numeric, 387200::numeric, 38720::numeric, 'KR10-2656 견적서 10월 19일 출고(블프데이패들 등).pdf'),
  ('KR10', 'KR10-2656', '2026-10-19', '600559 JOOLA Perseus Pro V Ben Johns Blaze Red 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 10::numeric, 193600::numeric, 1936000::numeric, 193600::numeric, 'KR10-2656 견적서 10월 19일 출고(블프데이패들 등).pdf'),
  ('KR10', 'KR10-2656', '2026-10-19', '600562 JOOLA Perseus Pro V Simone Jardim Breeze Blue 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 4::numeric, 193600::numeric, 774400::numeric, 77440::numeric, 'KR10-2656 견적서 10월 19일 출고(블프데이패들 등).pdf'),
  ('KR10', 'KR10-2656', '2026-10-19', '600565 JOOLA Scorpeus Pro V Anna Bright JOOLA Yellow 14mm Pickleball Paddle (Global)', '패들', '프로V'::text, 5::numeric, 193600::numeric, 968000::numeric, 96800::numeric, 'KR10-2656 견적서 10월 19일 출고(블프데이패들 등).pdf'),
  ('KR10', 'KR10-2656', '2026-10-19', '600568 JOOLA Scorpeus Pro V Anna Bright JOOLA Yellow 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 5::numeric, 193600::numeric, 968000::numeric, 96800::numeric, 'KR10-2656 견적서 10월 19일 출고(블프데이패들 등).pdf'),
  ('KR10', 'KR10-2656', '2026-10-19', '300554 JA000085 Womens Pickleball Printed Skort, Serpentine - White, S', '의류', NULL::text, 1::numeric, 39600::numeric, 39600::numeric, 3960::numeric, 'KR10-2656 견적서 10월 19일 출고(블프데이패들 등).pdf'),
  ('KR10', 'KR10-2656', '2026-10-19', '600159 Hyperion Pro IV 14mm - Asia Colorway (DTC)', '패들', '프로IV'::text, 2::numeric, 153000::numeric, 306000::numeric, 30600::numeric, 'KR10-2656 견적서 10월 19일 출고(블프데이패들 등).pdf'),
  ('KR10', 'KR10-2656', '2026-10-19', '600015 Perseus Pro IV 14mm - Asia Colorway (DTC)', '패들', '프로IV'::text, 6::numeric, 176600::numeric, 1059600::numeric, 105960::numeric, 'KR10-2656 견적서 10월 19일 출고(블프데이패들 등).pdf'),
  ('KR10', 'KR10-2657', '2026-10-22', '600001 JOOLA Primo Indoor Plus (3 Pack)', '공', NULL::text, 20::numeric, 11200::numeric, 224000::numeric, 22400::numeric, 'KR10-2657 견적서 10월 22일 출고(Primo Inddor plus, 블프데이패들 등).pdf'),
  ('KR10', 'KR10-2657', '2026-10-22', '600001 JOOLA Primo Indoor Plus (3 Pack)(demo)', '공', NULL::text, 2::numeric, 6000::numeric, 12000::numeric, 1200::numeric, 'KR10-2657 견적서 10월 22일 출고(Primo Inddor plus, 블프데이패들 등).pdf'),
  ('KR10', 'KR10-2657', '2026-10-22', '600037 JOOLA Everyday Tote Bag (Latte) - OSFM', '악세사리', NULL::text, 2::numeric, 82100::numeric, 164200::numeric, 16420::numeric, 'KR10-2657 견적서 10월 22일 출고(Primo Inddor plus, 블프데이패들 등).pdf'),
  ('KR10', 'KR10-2657', '2026-10-22', '17311 JOOLA x BRITTO Pickleball Edge Guard Tape (Pink) - 18MM x 800MM', '악세사리', NULL::text, 1::numeric, 11800::numeric, 11800::numeric, 1180::numeric, 'KR10-2657 견적서 10월 22일 출고(Primo Inddor plus, 블프데이패들 등).pdf'),
  ('KR10', 'KR10-2657', '2026-10-22', '600384 Scorpeus Heat Vision 16mm - Gradient Flash Yellow (Global)', '패들', '비전'::text, 2::numeric, 99900::numeric, 199800::numeric, 19980::numeric, 'KR10-2657 견적서 10월 22일 출고(Primo Inddor plus, 블프데이패들 등).pdf'),
  ('KR10', 'KR10-2657', '2026-10-22', '600571 JOOLA Scorpeus Pro V Collin Johns Club Green 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 1::numeric, 193600::numeric, 193600::numeric, 19360::numeric, 'KR10-2657 견적서 10월 22일 출고(Primo Inddor plus, 블프데이패들 등).pdf'),
  ('KR11', 'KR11-2608', '2026-10-19', '600559 JOOLA Perseus Pro V Ben Johns Blaze Red 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 6::numeric, 193600::numeric, 1161600::numeric, 116160::numeric, 'KR11-2608 견적서(10월 20일 출고, 블랙프라이데이).pdf'),
  ('KR11', 'KR11-2608', '2026-10-19', '600577 JOOLA Kosmos Pro V Federico Staksrud Surge Green 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 4::numeric, 193600::numeric, 774400::numeric, 77440::numeric, 'KR11-2608 견적서(10월 20일 출고, 블랙프라이데이).pdf'),
  ('KR11', 'KR11-2608', '2026-10-19', '600556 JOOLA Perseus Pro V Ben Johns Blaze Red 14mm Pickleball Paddle (Global)', '패들', '프로V'::text, 4::numeric, 193600::numeric, 774400::numeric, 77440::numeric, 'KR11-2608 견적서(10월 20일 출고, 블랙프라이데이).pdf'),
  ('KR11', 'KR11-2608', '2026-10-19', '601330 JOOLA Team Ankle Socks (Azure Blue) - L', '의류', NULL::text, 10::numeric, 2800::numeric, 28000::numeric, 2800::numeric, 'KR11-2608 견적서(10월 20일 출고, 블랙프라이데이).pdf'),
  ('KR11', 'KR11-2608', '2026-10-19', '601333 JOOLA Team Ankle Socks (Black) - M', '의류', NULL::text, 10::numeric, 2800::numeric, 28000::numeric, 2800::numeric, 'KR11-2608 견적서(10월 20일 출고, 블랙프라이데이).pdf'),
  ('KR11', 'KR11-2608', '2026-10-19', '600879 JOOLA Drawstring Backpack (Black)', '악세사리', NULL::text, 2::numeric, 64400::numeric, 128800::numeric, 12880::numeric, 'KR11-2608 견적서(10월 20일 출고, 블랙프라이데이).pdf'),
  ('KR11', 'KR11-2608', '2026-10-19', '300063 JA000059 Mens Court LS, White, L', '의류', NULL::text, 1::numeric, 35600::numeric, 35600::numeric, 3560::numeric, 'KR11-2608 견적서(10월 20일 출고, 블랙프라이데이).pdf'),
  ('KR11', 'KR11-2608', '2026-10-19', '300051 JA000059 Mens Court LS, Black, L', '의류', NULL::text, 1::numeric, 35600::numeric, 35600::numeric, 3560::numeric, 'KR11-2608 견적서(10월 20일 출고, 블랙프라이데이).pdf'),
  ('KR11', 'KR11-2608', '2026-10-19', '300171 JA000063 Mens Woven Shorts 7, Tropic Tide, L', '의류', NULL::text, 1::numeric, 29960::numeric, 29960::numeric, 2996::numeric, 'KR11-2608 견적서(10월 20일 출고, 블랙프라이데이).pdf'),
  ('KR11', 'KR11-2608', '2026-10-19', '300183 JA000063 Mens Woven Shorts 7, White, L', '의류', NULL::text, 1::numeric, 29960::numeric, 29960::numeric, 2996::numeric, 'KR11-2608 견적서(10월 20일 출고, 블랙프라이데이).pdf'),
  ('KR11', 'KR11-2609', '2026-10-21', '600577 JOOLA Kosmos Pro V Federico Staksrud Surge Green 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 3::numeric, 193600::numeric, 580800::numeric, 58080::numeric, 'KR11-2609 견적서(10월 22일 출고, 블랙프라이데이 패들).pdf'),
  ('KR11', 'KR11-2609', '2026-10-21', '600556 JOOLA Perseus Pro V Ben Johns Blaze Red 14mm Pickleball Paddle (Global)', '패들', '프로V'::text, 2::numeric, 193600::numeric, 387200::numeric, 38720::numeric, 'KR11-2609 견적서(10월 22일 출고, 블랙프라이데이 패들).pdf'),
  ('KR11', 'KR11-2609', '2026-10-21', '600559 JOOLA Perseus Pro V Ben Johns Blaze Red 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 2::numeric, 193600::numeric, 387200::numeric, 38720::numeric, 'KR11-2609 견적서(10월 22일 출고, 블랙프라이데이 패들).pdf'),
  ('KR13', 'KR13-2615', '2026-10-22', '600595 JOOLA Graf Pro V Steffi Graf Seaside Green 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 2::numeric, 193600::numeric, 387200::numeric, 38720::numeric, 'KR13-2615 견적서(10월 22일 출고, 블프데이,POWERFX 등).pdf'),
  ('KR13', 'KR13-2615', '2026-10-22', '600580 JOOLA Hyperion Pro V Ben Johns Bolt Blue 14mm Pickleball Paddle (Global)', '패들', '프로V'::text, 2::numeric, 193600::numeric, 387200::numeric, 38720::numeric, 'KR13-2615 견적서(10월 22일 출고, 블프데이,POWERFX 등).pdf'),
  ('KR13', 'KR13-2615', '2026-10-22', '604672 JOOLA Perseus POWER FX Daydream 16mm Pickleball Paddle (Global)', '패들', 'PowerFX'::text, 3::numeric, 176700::numeric, 530100::numeric, 53010::numeric, 'KR13-2615 견적서(10월 22일 출고, 블프데이,POWERFX 등).pdf'),
  ('KR13', 'KR13-2615', '2026-10-22', '18523 Essentials Set - Includes Blue and Black Paddles, 2 Balls, and Bag', '패들', '기타(세트)'::text, 5::numeric, 129400::numeric, 647000::numeric, 64700::numeric, 'KR13-2615 견적서(10월 22일 출고, 블프데이,POWERFX 등).pdf'),
  ('KR13', 'KR13-2615', '2026-10-22', '600571 JOOLA Scorpeus Pro V Collin Johns Club Green 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 1::numeric, 193600::numeric, 193600::numeric, 19360::numeric, 'KR13-2615 견적서(10월 22일 출고, 블프데이,POWERFX 등).pdf'),
  ('KR13', 'KR13-2615', '2026-10-22', '600001 JOOLA Primo Indoor Plus (3 Pack)', '공', NULL::text, 10::numeric, 11200::numeric, 112000::numeric, 11200::numeric, 'KR13-2615 견적서(10월 22일 출고, 블프데이,POWERFX 등).pdf'),
  ('KR13', 'KR13-2615', '2026-10-22', '600001 JOOLA Primo Indoor Plus (3 Pack)(demo)', '공', NULL::text, 1::numeric, 6000::numeric, 6000::numeric, 600::numeric, 'KR13-2615 견적서(10월 22일 출고, 블프데이,POWERFX 등).pdf'),
  ('KR00', 'KR00-2612', '2026-10-26', '17071 Ben Johns Hyperion 14mm (3S)', '패들', '3S'::text, 5::numeric, 90910::numeric, 454550::numeric, 45455::numeric, 'KR00-2612 sales (용인, 피클볼파라다이스, 김상준).pdf'),
  ('KR00', 'KR00-2613', '2026-10-27', '600298 JOOLA Pro Barrier Flex_V2', '악세사리', NULL::text, 1::numeric, 116364::numeric, 116364::numeric, 11636::numeric, 'KR00-2613 sales (광명, 316피클볼, 황재오).pdf'),
  ('KR01', 'KR01-2615', '2026-10-13', '604672 JOOLA Perseus POWER FX Daydream 16mm Pickleball Paddle (Global)', '패들', 'PowerFX'::text, 6::numeric, 176700::numeric, 1060200::numeric, 106020::numeric, 'KR01-2615 견적서(10월 13일 출고, POWER FX).pdf'),
  ('KR05', 'KR05-2632', '2026-10-08', '600559 JOOLA Perseus Pro V Ben Johns Blaze Red 16mm Pickleball Paddle (Global)', '패들', '프로V'::text, 2::numeric, 300800::numeric, 601600::numeric, 60160::numeric, 'KR05-2632 견적서(10월 8일 출고, PRO V).pdf'),
  ('KR10', 'KR10-2654', '2026-10-12', '600331 JOOLA Tour Elite Pro Pickleball Bag (Tropic Tide)', '악세사리', NULL::text, 1::numeric, 141200::numeric, 141200::numeric, 14120::numeric, 'KR10-2654 견적서 10월 12일 출고(JOOLA Tour Elite bag 등, 직배송 포함).pdf'),
  ('KR10', 'KR10-2654', '2026-10-12', '600332 JOOLA Tour Elite Pro Pickleball Bag (White)', '악세사리', NULL::text, 1::numeric, 141200::numeric, 141200::numeric, 14120::numeric, 'KR10-2654 견적서 10월 12일 출고(JOOLA Tour Elite bag 등, 직배송 포함).pdf'),
  ('KR10', 'KR10-2654', '2026-10-12', '600950 JOOLA Small Wordmark Towel (Poppy Red/Sandstone) - OSFA', '악세사리', NULL::text, 1::numeric, 15300::numeric, 15300::numeric, 1530::numeric, 'KR10-2654 견적서 10월 12일 출고(JOOLA Tour Elite bag 등, 직배송 포함).pdf'),
  ('KR10', 'KR10-2654', '2026-10-12', '600949 JOOLA Small Wordmark Towel (Club Green/Tropic Tide) - OSFA', '악세사리', NULL::text, 1::numeric, 15300::numeric, 15300::numeric, 1530::numeric, 'KR10-2654 견적서 10월 12일 출고(JOOLA Tour Elite bag 등, 직배송 포함).pdf'),
  ('KR10', 'KR10-2654', '2026-10-12', '300214 JA000064 Mens Woven Shorts 5, White, M', '의류', NULL::text, 1::numeric, 29960::numeric, 29960::numeric, 2996::numeric, 'KR10-2654 견적서 10월 12일 출고(JOOLA Tour Elite bag 등, 직배송 포함).pdf'),
  ('KR10', 'KR10-2654', '2026-10-12', '600015 Perseus Pro IV 14mm - Asia Colorway (DTC)', '패들', '프로IV'::text, 2::numeric, 176600::numeric, 353200::numeric, 35320::numeric, 'KR10-2654 견적서 10월 12일 출고(JOOLA Tour Elite bag 등, 직배송 포함).pdf'),
  ('KR16', 'KR16-2602', '2026-09-30', '604672 JOOLA Perseus POWER FX Daydream 16mm Pickleball Paddle (Global)', '패들', 'PowerFX'::text, 17::numeric, 176700::numeric, 3003900::numeric, 300390::numeric, 'KR16-2602 견적서(10월1일 출고, POWER FX).pdf'),
  ('KR16', 'KR16-2602', '2026-09-30', '604680 JOOLA Perseus POWER FX Daydream 16mm Pickleball Paddle (Demo)', '패들', 'PowerFX'::text, 2::numeric, 95100::numeric, 190200::numeric, 19020::numeric, 'KR16-2602 견적서(10월1일 출고, POWER FX).pdf')
) as v(kr_code, order_no, quote_date, product_name, category, subcategory, quantity, unit_price, amount, tax, source_file)
where not exists (select 1 from dealer_quote_items i where i.order_no = v.order_no);

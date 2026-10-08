-- 이미지 매칭 2차 (사용자 육안 확인 완료분) — 나머지 19개 중 16개(사실상 15개 상품, 6개 SKU는 팩 수량만 다른 동일 공)
-- 확인 결과 반영:
--   - 18505 (Ben Johns Hyperion CFS 14), 600169 (Pro IV Mini Paddle Agassi Shape) → 이미지 아님, 이번 실행에서 제외
--   - 15501 → 15500과 같은 사진 사용 (동일 상품 라인)
--   - 600880 Drawstring Backpack White, 600879 Black → 색상별 정확한 사진으로 교체
--   - 600001 → 이름에 남아있던 오탈자 "60001"을 실제 SKU인 "600001"로 수정
--   - 600496 (RTW Backpack) → 어디서도 사진을 찾지 못해 이번에도 제외

-- 1) 이미지 업데이트
update products set image_url = v.img from (values
  ('17063', 'https://cdn11.bigcommerce.com/s-tl5mxjzfsl/products/6048/images/31591/JLA180_Ben-Johns-Perseus_16mm_3S_1_1000__19612.1746722812.386.513.jpg?c=1'),
  ('17071', 'https://cdn11.bigcommerce.com/s-tl5mxjzfsl/products/6055/images/31531/JLA187__Ben-Johns-Hyperion_14mm_3S1_1_1000__00650.1746722951.386.513.jpg?c=1'),
  ('18501', 'https://static.wixstatic.com/media/edf4cb_2940e27d4cd047a2be5ad505abc55354~mv2.webp/v1/fill/w_1200,h_1200,al_c,q_85,enc_avif,quality_auto/edf4cb_2940e27d4cd047a2be5ad505abc55354~mv2.webp'),
  ('18533', 'https://academy.scene7.com/is/image/academy/21149009?$pdp-gallery-ng$'),
  ('15500', 'https://joola.ca/cdn/shop/files/15500-Tyson-McGuffin-Tour-Bag-01.jpg?v=1741105815&width=1200'),
  ('15501', 'https://joola.ca/cdn/shop/files/15500-Tyson-McGuffin-Tour-Bag-01.jpg?v=1741105815&width=1200'),
  ('18826', 'https://cdn11.bigcommerce.com/s-tl5mxjzfsl/images/stencil/1000x1000/products/5170/26831/JLA166_Heleus_4pk_1000__87616.1701905655.jpg?c=1'),
  ('18827', 'https://cdn11.bigcommerce.com/s-tl5mxjzfsl/images/stencil/1000x1000/products/5170/26831/JLA166_Heleus_4pk_1000__87616.1701905655.jpg?c=1'),
  ('18828', 'https://cdn11.bigcommerce.com/s-tl5mxjzfsl/images/stencil/1000x1000/products/5170/26831/JLA166_Heleus_4pk_1000__87616.1701905655.jpg?c=1'),
  ('18829', 'https://cdn11.bigcommerce.com/s-tl5mxjzfsl/images/stencil/1000x1000/products/5170/26831/JLA166_Heleus_4pk_1000__87616.1701905655.jpg?c=1'),
  ('600001', 'https://joola.de/cdn/shop/files/600001_Primo-Indoor-Plus_Ball_02_web.jpg?v=1762942943&width=2048'),
  ('600499', 'https://www.splashuwimaging.com/cdn/shop/files/pickleball_bags_600499_joo_pro_backpack_black_joola_yellow_01.png?v=1776134894'),
  ('600879', 'https://www.strideandstroke.com/cdn/shop/files/pickleball_bags_600879_joo_drawstring_backpack_black_01.png?v=1775643028'),
  ('600880', 'https://www.strideandstroke.com/cdn/shop/files/pickleball_bags_600880_joo_drawstring_backpack_white_01.png?v=1775643026'),
  ('84995', 'https://shop.purepickleball.com/cdn/shop/files/joola-vision-suitcase_0_9d60c1a5-b296-4928-b918-f2055778f107.webp?v=1749249488&width=1400'),
  ('84996', 'https://shop.purepickleball.com/cdn/shop/files/joola-vision-suitcase_0_9d60c1a5-b296-4928-b918-f2055778f107.webp?v=1749249488&width=1400')
) as v(sku, img)
where products.sku = v.sku;

-- 2) 이름에 남아있던 오탈자 수정 ("60001 JOOLA Primo..." → "600001 JOOLA Primo...")
update products
set name = regexp_replace(name, '^60001\s', '600001 ')
where sku = '600001' and name like '60001 %';

-- 3) 최종 확인
select count(*) as total, count(*) filter (where image_url is not null) as with_image from products;
select sku, name from products where sku = '600001';

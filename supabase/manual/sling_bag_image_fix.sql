-- 600881/600882 Essentials Sling Bag — 1차 매칭 때 두 SKU에 동일한(잘못된) 사진이 들어갔던 것을
-- 사용자가 직접 찾아준 색상별 정확한 사진으로 덮어쓰기
-- 600881: Decathlon 판매 페이지 사진
-- 600882: joola.com.br(브라질) White/Branca 색상 사진

update products set image_url = v.img from (values
  ('600881', 'https://decathlonpro.vtexassets.com/arquivos/ids/177427805/17804980060877.jpg?v=639166557339370000'),
  ('600882', 'https://www.joola.com.br/cdn/shop/files/mochila-joola-drawstring-sling-bag-white-branca-web1.jpg?v=1779286627&width=1024')
) as v(sku, img)
where products.sku = v.sku;

-- 확인
select sku, name, image_url from products where sku in ('600881','600882');

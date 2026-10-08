-- 어셈블리 서브카테고리 확정 (네트 / 배리어 / 볼캐디)

-- 1) 네트류 4개
update products set subcategory = '네트'
where sku in ('18233','17100','18567','18369');

-- 2) 배리어 상품 교체: 18557(구) → 600298(신, 한국 유통 SKU)
--    이름/이미지를 새 상품 기준으로 바꾸고, 가격(unit_price)은 그대로 유지
update products
set sku = '600298',
    name = 'JOOLA Pro Barrier Flex_V2',
    subcategory = '배리어',
    image_url = 'https://cdn.shopify.com/s/files/1/0685/6943/2278/files/3_0004_2R1A6847-41.png?v=1788382028'
where sku = '18557';

-- 3) 볼 캐디는 액세서리로 잘못 분류되어 있었음 → 어셈블리로 이동
update products
set category = '어셈블리',
    subcategory = '볼캐디'
where sku = '18569';

-- 확인
select sku, name, category, subcategory, unit_price, image_url
from products
where category = '어셈블리'
order by subcategory, name;

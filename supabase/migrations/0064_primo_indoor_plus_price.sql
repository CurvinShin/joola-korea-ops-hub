-- 600001 JOOLA Primo Indoor Plus (3 Pack): 소비자가(unit_price)가 비어 있어 딜러 주문 화면에서
-- "가격정보 없음"으로 주문이 막히던 문제를 고친다. (2026-10-27 딜러 문의)
--
-- 19,000원은 카탈로그 시드(supabase/seed-sources/joola_catalog_prices.json)의 소비자가이며,
-- 기존 견적서 단가와 앱 공식이 맞는다: 19,000 ÷ 1.1 × (1 − 35%) = 11,227 → 11,200원(정상구매),
-- 19,000 ÷ 1.1 × (1 − 65%) = 6,045 → 6,000원(데모구매).
-- 11/1에는 0046이 이 상품의 소비자가를 15,900원으로 바꾼다.
-- 값이 비어 있을 때만 채우므로 여러 번 실행해도 안전하다.
update products
set unit_price = 19000
where sku = '600001' and unit_price is null;

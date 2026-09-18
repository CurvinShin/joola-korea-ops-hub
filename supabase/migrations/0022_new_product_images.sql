-- =========================================================================
-- 신제품 4종 실제 제품 사진 반영 (사용자가 직접 전달한 공식 이미지).
-- 이미지는 500px 이하로 리사이즈 + webp 압축(각 6~13KB)해서
-- public/products/<sku>.webp로 앱 자체에 정적 파일로 포함했다 —
-- 외부 CDN 링크가 아니라 Vercel이 직접 서빙하므로 안정적이고 빠르다.
--
-- 남은 5종(604672/604680 POWER FX Daydream, 601955/601956 Hyperion
-- Vision, 600298 Pro Barrier Flex_V2)은 아직 사진을 못 구해서 비워둠.
-- Safe to run as a normal SQL Editor execution (no new enum values here).
-- =========================================================================

update products set image_url = '/products/601884.webp' where sku = '601884'; -- Agassi Pro V Washed Indigo 14mm
update products set image_url = '/products/601885.webp' where sku = '601885'; -- Agassi Pro V Washed Indigo 16mm
update products set image_url = '/products/601057.webp' where sku = '601057'; -- Kosmos Pro V Rally Rocket
update products set image_url = '/products/601029.webp' where sku = '601029'; -- Perseus Pro V Rally Rocket

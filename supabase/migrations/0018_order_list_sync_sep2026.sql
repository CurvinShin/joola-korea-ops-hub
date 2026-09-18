-- =========================================================================
-- 2026-09-17 딜러 오더리스트(35% / 30% 디스카운트 파일) 반영.
-- 소스: "POWER FX AGASSI DENIM POPSICLE 추가 PRO IV 가격조정" 오더리스트 2종
--       (Sales Order Sheet (1) 하드굿즈 시트만 해당 — 의류 시트에는 신제품/
--       가격변동 항목이 없었음. 참고로 파일명의 DENIM·POPSICLE 키워드는
--       실제 시트 어디에도 텍스트로 등장하지 않아 이번 배치의 실제 신상품은
--       아닌 것으로 판단, 반영하지 않음).
--
-- 1) PRO IV 라인업 12종 — 딜러가가 오더리스트 파일(35%/30%)과 무관하게 항상
--    동일한 176,600원(=MAP 259,000원 기준 고정 25% 할인 공식값)으로 찍혀있어
--    fixed_dealer_price로 고정. 이 중 9종은 카탈로그에 남아있던 구 MAP
--    (319,000~369,000원)이 259,000원으로 실제 인하되어 unit_price도 갱신.
--    나머지 3종(600147/600159/600160)은 카탈로그 MAP이 이미 259,000원이라
--    fixed_dealer_price만 새로 채움.
-- 2) 팀 양말 12종 — fixed_dealer_price 컬럼(0006)이 추가만 되고 실제 값이
--    한번도 채워진 적이 없어, 지금까지는 하드굿즈 공식(≈4,100원)이 적용되고
--    있었음. joola_pricing_stock_logic.md에 기록된 실제 합의 단가(크루삭스
--    3,200원)와 이번 오더리스트가 정확히 일치 — 오더리스트 원본 기준으로
--    최초로 확정 단가를 채움.
-- 3) 신제품 9종 신규 등록 (POWER FX Daydream 본품+데모전용 SKU 포함 — 아래
--    "데모구매 허용" 항목 참고).
--
-- 4) [신규 기능] products.demo_purchase_allowed — 일부 패들은 JOOLA에서
--    "데모 전용" SKU를 별도로 내놓기 시작함 (이번 건: 604672 정품 / 604680
--    데모전용, 둘 다 MAP 299,000원). 앱은 원래 견적서에서 "데모구매" 체크박스
--    하나로 아무 패들에나 65% 할인(calcDemoPrice)을 적용하는 구조라, 이런
--    패들을 그대로 두면 (a) 딜러가 정품(604672)을 "데모구매" 체크로 주문해
--    65% 할인을 받아버리거나, (b) 이미 데모가로 나온 604680을 정상 주문한
--    뒤 "데모구매"를 또 체크해서 이중 할인을 받는 사고가 날 수 있음.
--    앞으로도 이런 "본품/데모 별도 SKU" 패들이 계속 나올 예정이라, 두
--    SKU 모두 데모구매 체크박스를 막도록 상품 단위 플래그를 추가함
--    (기본값 true = 기존 상품은 전부 그대로 데모구매 가능, 필요한 상품만
--    개별로 꺼짐). /inventory 상품 등록/수정 화면에서 앞으로 나올 유사
--    패들에 바로 적용 가능.
-- Safe to run as a normal SQL Editor execution (no new enum values here).
-- =========================================================================

alter table products add column if not exists demo_purchase_allowed boolean not null default true;

create or replace view inventory_status as
  select
    p.id as product_id,
    p.sku,
    p.name,
    p.category,
    p.discontinued,
    coalesce(i.current_stock, 0) as current_stock,
    coalesce(i.reserved_stock, 0) as reserved_stock,
    coalesce(i.current_stock, 0) - coalesce(i.reserved_stock, 0) as available_stock,
    coalesce(i.incoming_qty, 0) as incoming_qty,
    i.eta,
    coalesce(i.low_stock_threshold, 10) as low_stock_threshold,
    (coalesce(i.current_stock, 0) - coalesce(i.reserved_stock, 0)) <= coalesce(i.low_stock_threshold, 10) as is_low_stock,
    p.image_url,
    p.product_type,
    p.fixed_dealer_price,
    p.subcategory,
    p.demo_purchase_allowed
  from products p
  left join inventory i on i.product_id = p.id;

create or replace view dealer_catalog as
  select
    p.id as product_id,
    p.sku,
    p.name,
    p.category,
    p.image_url,
    p.unit_price,
    greatest(coalesce(i.current_stock, 0) - coalesce(i.reserved_stock, 0), 0) as available_stock,
    p.product_type,
    p.fixed_dealer_price,
    p.subcategory,
    p.demo_purchase_allowed
  from products p
  left join inventory i on i.product_id = p.id
  where p.discontinued = false;

grant select on dealer_catalog to authenticated;

-- 1) PRO IV 라인업 — MAP 인하분 반영 (구 카탈로그 대비 259,000원으로 인하)
update products set unit_price = 259000
where sku in ('600015', '600016', '600153', '300807', '300810', '300819', '300822', '300834', '300837');

-- PRO IV 라인업 12종 전체 — 딜러 등급과 무관한 고정 25% 할인가
update products set fixed_dealer_price = 176600
where sku in (
  '600015', '600016', '600147', '600153', '600159', '600160',
  '300807', '300810', '300819', '300822', '300834', '300837'
);

-- 2) 팀 양말 — 확정 단가 최초 반영
update products set fixed_dealer_price = 2800
where sku in ('601333', '601334', '601329', '601330', '601337', '601338'); -- Ankle Socks

update products set fixed_dealer_price = 3200
where sku in ('601321', '601322', '601317', '601318', '601325', '601326'); -- Crew Socks

-- 3) 신제품 9종 신규 등록
insert into products (sku, name, category, subcategory, unit_price, fixed_dealer_price, product_type, discontinued, demo_purchase_allowed)
values
  ('604672', 'JOOLA Perseus POWER FX Daydream 16mm Pickleball Paddle (Global)', '패들', 'Pro', 299000, null, 'hardgoods', false, false),
  ('604680', 'JOOLA Perseus POWER FX Daydream 16mm Pickleball Paddle (Demo)', '패들', 'Pro', 299000, 95100, 'hardgoods', false, false),
  ('601884', 'JOOLA Agassi Pro V Andre Agassi Washed Indigo 14mm Pickleball Paddle (DTC)', '패들', 'Pro', 509000, null, 'hardgoods', false, true),
  ('601885', 'JOOLA Agassi Pro V Andre Agassi Washed Indigo 16mm Pickleball Paddle (DTC)', '패들', 'Pro', 509000, null, 'hardgoods', false, true),
  ('601955', 'JOOLA Hyperion Vision Crash Teal 16mm Pickleball Paddle (DTC)', '패들', 'Edge', 139000, null, 'hardgoods', false, true),
  ('601956', 'JOOLA Hyperion Vision Eclipse Orange 16mm Pickleball Paddle (DTC)', '패들', 'Edge', 139000, null, 'hardgoods', false, true),
  ('601029', 'JOOLA Perseus Pro V Rally Rocket 16mm Pickleball Paddle (DTC)', '패들', 'Pro', 559000, null, 'hardgoods', false, true),
  ('601057', 'JOOLA Kosmos Pro V Rally Rocket 16mm Pickleball Paddle (DTC)', '패들', 'Pro', 559000, null, 'hardgoods', false, true),
  ('600298', 'JOOLA Pro Barrier Flex_V2', '액세서리', '기타', 199000, null, 'hardgoods', false, true)
on conflict (sku) do nothing;

-- 604672(정품)에 이미 있던 매칭이라 위 insert가 스킵될 경우를 대비해 명시적으로도 고정
update products set demo_purchase_allowed = false where sku in ('604672', '604680');

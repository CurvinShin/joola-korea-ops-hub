-- smartstore_sku_map을 (product_no, option_info) 복합키로 재설계.
--
-- 사용자가 확인한 바로는, 같은 네이버 상품번호라도 "[3 Colors]"처럼 색상
-- 옵션이 여러 개인 상품은 옵션(색상)마다 실제 SKU가 다르다 — 예를 들어
-- 상품번호 하나가 Bolt Blue/Blaze Red/Surge Green 세 가지 색상 SKU로
-- 나뉘고, 이 구분은 "주문조회"의 옵션정보 컬럼(예: "컬러: Blaze Red")으로만
-- 가능하다. product_no 단독 키로는 이 구분이 안 돼서 옵션정보를 키에
-- 포함하도록 바꾼다. 옵션이 없는 단일 상품은 option_info를 빈 문자열로 둔다.
--
-- 이 기능은 아직 실사용 전이라(0033이 이번 세션에서 막 만들어짐) 기존
-- 데이터를 보존할 필요 없이 테이블을 다시 만든다.
drop table if exists smartstore_sku_map cascade;

create table smartstore_sku_map (
  product_no text not null,
  option_info text not null default '',
  product_name text not null, -- 참고용 — 마지막으로 본 네이버 등록 상품명(한글)
  sku text not null,
  english_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (product_no, option_info)
);

alter table smartstore_sku_map enable row level security;

create policy smartstore_sku_map_select on smartstore_sku_map
  for select using (auth.role() = 'authenticated');
create policy smartstore_sku_map_insert on smartstore_sku_map
  for insert with check (can_write());
create policy smartstore_sku_map_update on smartstore_sku_map
  for update using (can_write()) with check (can_write());
create policy smartstore_sku_map_delete on smartstore_sku_map
  for delete using (can_write());

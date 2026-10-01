-- 스마트스토어(네이버) 상품번호(product_no) -> SKU/영문 제품명 매핑.
--
-- 매달 "월말 정산자료" 작업에서 가장 시간이 오래 걸리던 부분이 바로 이것
-- 이었다: 정산 데이터(SettleCaseByCase, 수량/상품번호 없음)에는 한글
-- 상품명만 있고, 이게 어떤 SKU/영문 제품명인지는 사람이 매번 기억하거나
-- 찾아서 손으로 입력하고 있었다. 이 테이블에 한 번만 채워두면(상품이
-- 15~20개 수준) 그 다음부터는 자동으로 채워진다 — 신규 상품이 나올 때만
-- 한 줄 추가하면 된다.
--
-- product_no(상품번호)를 키로 쓴다 — 같은 상품이라도 한글 상품명 표기가
-- 옵션/캠페인에 따라 미세하게 달라질 수 있지만, 상품번호는 네이버 상품
-- 등록 단위로 고정이라 더 안정적인 키다. smartstore_order_items.product_no
-- 와 조인해서 쓴다.
create table if not exists smartstore_sku_map (
  product_no text primary key,
  product_name text not null, -- 참고용 — 마지막으로 본 네이버 등록 상품명(한글)
  sku text not null,
  english_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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

-- 스마트스토어(네이버) "주문조회" 엑셀 내보내기(상품주문번호 단위)를 담는 테이블.
--
-- 이 내보내기 양식에는 딜러 견적서(dealer_quote_items)와 달리 판매 금액/단가가
-- 전혀 없다(스마트스토어 정산 금액은 이미 /sales 페이지에서 sales_transactions에
-- 담당자가 직접 입력하는 방식으로 따로 관리 중). 그래서 이 테이블은 "얼마에
-- 팔렸는지"가 아니라 "어떤 제품군이 얼마나(수량) 팔렸는지"만 분석하는 용도다.
--
-- 개인정보 처리 방지: 원본 엑셀에는 구매자명/구매자ID/수취인명 컬럼이 있지만
-- (고객 개인정보), 이 테이블에는 그 컬럼들을 아예 포함하지 않는다 — 업로드
-- 서버 액션에서부터 그 컬럼들은 읽지도 않고 버린다. 제품군 분석에 필요한
-- 상품/수량/주문상태 정보만 저장한다.
--
-- category/subcategory는 dealer_quote_items(0028)와 같은 체계를 쓴다(패들
-- 서브카테고리: 프로V/프로IV/비전/엣지/챔피언/3S/PowerFX/기타(엔트리)/
-- 기타(세트)/기타(C2 CFS)) — src/lib/reports/classifySmartstoreProduct.ts의
-- 품목명 키워드 규칙으로 자동 분류된다(딜러 견적서는 Claude가 PDF를 직접 보고
-- 수작업 분류했지만, 스마트스토어는 재업로드 시마다 자동 분류가 필요하므로
-- 규칙 기반 분류기를 코드로 만들어 재사용한다).
--
-- product_order_no(상품주문번호)가 자연 키다 — 같은 주문을 다른 날짜 범위의
-- 내보내기 파일로 다시 올려도(기간이 겹치는 재업로드) 중복 행이 생기지 않고
-- upsert로 상태(주문상태 등)만 최신화된다.
create table if not exists smartstore_order_items (
  id uuid primary key default gen_random_uuid(),
  product_order_no text not null unique,
  order_no text,
  order_date date not null,
  order_status text not null,
  is_valid_sale boolean not null default true,
  product_no text,
  product_name text not null,
  option_info text,
  sales_option_info text,
  quantity numeric not null,
  category text not null,
  subcategory text,
  source_file text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists smartstore_order_items_order_date_idx on smartstore_order_items (order_date);
create index if not exists smartstore_order_items_category_idx on smartstore_order_items (category);

alter table smartstore_order_items enable row level security;

create policy smartstore_order_items_select on smartstore_order_items
  for select using (auth.role() = 'authenticated');
create policy smartstore_order_items_insert on smartstore_order_items
  for insert with check (can_write());
create policy smartstore_order_items_update on smartstore_order_items
  for update using (can_write()) with check (can_write());
create policy smartstore_order_items_delete on smartstore_order_items
  for delete using (can_write());

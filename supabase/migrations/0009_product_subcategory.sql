-- 재고 세부 카테고리(subcategory) 추가
-- 패들: Champion(초급)/Edge(중급)/Pro(고급) — JOOLA 공식 3단계 라인업(recreational/performance/professional)에 맞춤
-- 의류: 남성/여성
-- 액세서리: 그립테이프/키체인/파들커버/그립/타월/공/네트/기타소품/기타
--
-- 참고: 이전 버전은 subcategory를 category 바로 뒤(중간)에 넣어서
-- "cannot change name of view column ..." 오류가 났습니다.
-- Postgres의 CREATE OR REPLACE VIEW는 기존 컬럼 순서를 그대로 두고
-- 새 컬럼을 "맨 뒤"에만 추가할 수 있어서, 이번 버전은 subcategory를
-- 각 view의 select 목록 맨 끝으로 옮겼습니다. (앱 코드는 위치가 아니라
-- 이름으로 컬럼을 참조하므로 동작에는 영향 없습니다.)

alter table products add column if not exists subcategory text;

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
    p.subcategory
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
    p.subcategory
  from products p
  left join inventory i on i.product_id = p.id
  where p.discontinued = false;

grant select on dealer_catalog to authenticated;

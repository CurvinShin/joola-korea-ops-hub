-- =========================================================================
-- 딜러 "내 주문 내역"에서 상품명이 안 보이던 문제 수정.
--
-- products 테이블은 0003 이후 직원 전용이라(원가 unit_cost가 들어 있어서),
-- 딜러 계정이 dealer_order_items → products(name, sku)로 조인하면 항상
-- null이 돌아와 상품명이 빈칸이 된다. dealer_catalog 뷰는 단종 상품을
-- 빼기 때문에 예전 주문의 단종 상품 이름도 못 찾는다.
--
-- 그래서 "내가(내 딜러가) 주문한 적 있는 상품"의 id/SKU/이름만 돌려주는
-- 뷰를 따로 둔다. 원가·재고·가격 같은 다른 컬럼은 노출하지 않는다.
-- 뷰는 소유자 권한으로 실행되므로 필터를 뷰 안에서 직접 건다 — 직원은
-- 전부, 딜러는 본인 딜러의 주문에 들어간 상품만.
-- =========================================================================

create or replace view dealer_ordered_products as
  select p.id as product_id, p.sku, p.name
  from products p
  where is_staff()
     or exists (
       select 1
       from dealer_order_items oi
       join dealer_orders o on o.id = oi.order_id
       where oi.product_id = p.id
         and o.dealer_id = current_dealer_id()
     );

grant select on dealer_ordered_products to authenticated;

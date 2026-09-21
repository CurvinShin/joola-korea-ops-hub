-- 딜러 본인이 아직 담당자가 손대지 않은(status='draft') 자기 주문을 직접
-- 수정할 수 있게 한다 (dealer-portal.ts의 updateDealerCartOrder에서 사용).
--
-- 지금까지 dealer_orders/dealer_order_items의 update/delete는 can_write()
-- (스태프)만 가능했다 — 그래서 딜러 계정이 자기 draft 주문을 고치려면 항상
-- 관리자를 거쳐야 했다. draft가 아니게 된 뒤(담당자가 확인/취소한 뒤)에는
-- 여전히 스태프만 수정 가능하다 — 이미 입금 확인/재고 반영이 진행됐을 수
-- 있어서다.
drop policy if exists dealer_orders_update on dealer_orders;
create policy dealer_orders_update on dealer_orders
  for update using (
    can_write() or (dealer_id = current_dealer_id() and status = 'draft')
  )
  with check (
    can_write() or (dealer_id = current_dealer_id() and status = 'draft')
  );

drop policy if exists dealer_order_items_update on dealer_order_items;
create policy dealer_order_items_update on dealer_order_items
  for update using (
    can_write()
    or exists (
      select 1 from dealer_orders o
      where o.id = dealer_order_items.order_id
        and o.dealer_id = current_dealer_id()
        and o.status = 'draft'
    )
  )
  with check (
    can_write()
    or exists (
      select 1 from dealer_orders o
      where o.id = dealer_order_items.order_id
        and o.dealer_id = current_dealer_id()
        and o.status = 'draft'
    )
  );

drop policy if exists dealer_order_items_delete on dealer_order_items;
create policy dealer_order_items_delete on dealer_order_items
  for delete using (
    can_write()
    or exists (
      select 1 from dealer_orders o
      where o.id = dealer_order_items.order_id
        and o.dealer_id = current_dealer_id()
        and o.status = 'draft'
    )
  );

-- 덧붙여 보완: dealer_order_items_insert는 원래 "본인 딜러의 주문이면" 조건만
-- 있고 status는 안 봤다 (0003_dealer_portal.sql). 지금까지는 앱이 항상 새
-- 주문에만 insert를 썼어서 문제가 없었지만, 이 참에 draft 주문에만 항목을
-- 추가할 수 있도록 같이 좁혀둔다.
drop policy if exists dealer_order_items_insert on dealer_order_items;
create policy dealer_order_items_insert on dealer_order_items
  for insert with check (
    can_write()
    or exists (
      select 1 from dealer_orders o
      where o.id = dealer_order_items.order_id
        and o.dealer_id = current_dealer_id()
        and o.status = 'draft'
    )
  );

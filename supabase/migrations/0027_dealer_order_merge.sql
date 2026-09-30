-- 딜러가 여러 번에 걸쳐 넣은 주문을 하나로 합칠 수 있게 한다 (본인 주문 +
-- 관리자 화면 양쪽에서 모두 가능하도록 요청받음). 합치기는 "입금 확인
-- 전(draft)" 주문끼리만 허용 — 이미 확정된 주문은 재고 차감/견적 발송이
-- 끝난 상태라 합치면 재고·회계 쪽이 꼬일 수 있어서 제외한다.
--
-- 합치기 로직(src/lib/utils/order-merge.ts)은 여러 draft 주문 중 하나를
-- 남기고(품목·금액을 합산 재계산) 나머지는 완전히 삭제한다. 지금까지
-- dealer_orders의 delete는 can_write()(스태프)만 가능했는데 — 딜러 본인이
-- 자기 draft 주문끼리 합칠 때도 "합쳐져서 없어지는 쪽"을 지울 수 있어야
-- 하므로, 그 경우에 한해 딜러 role에도 delete를 열어준다.
drop policy if exists dealer_orders_delete on dealer_orders;
create policy dealer_orders_delete on dealer_orders
  for delete using (
    can_write() or (dealer_id = current_dealer_id() and status = 'draft')
  );

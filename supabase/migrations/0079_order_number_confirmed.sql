-- =========================================================================
-- 딜러 주문 번호 "확정" 표시 (2026-11-06)
--
-- 주문이 들어오면 번호(예: KR10-2660)가 자동으로 "임시" 번호로 붙고, 경리나라에서 실제 견적서를
-- 만든 뒤 관리자가 번호를 맞춰서 "확정"한다. 이 컬럼이 그 확정 여부를 기억한다.
--
--  · order_number_confirmed = false  → 임시 번호 (출고 직전에 확인 경고가 뜬다)
--  · order_number_confirmed = true   → 실제 견적서 번호와 맞춰 확정한 번호
--
-- 이미 정리된 주문은 확정으로 표시한다: 출고·발주 처리됐거나, 취소됐거나, 같은 번호의 견적서가
-- dealer_quotes에 있는 주문. 그 외(아직 출고 전인 주문)는 임시로 남아 확인 대상이 된다.
--
-- ※ 앱 코드를 배포하기 "전에" 먼저 실행하세요 (코드가 이 컬럼을 읽습니다). 추가만 하는 SQL이라 안전합니다.
-- =========================================================================

alter table dealer_orders
  add column if not exists order_number_confirmed boolean not null default false;

comment on column dealer_orders.order_number_confirmed is
  '주문 번호를 실제 견적서 번호와 맞춰 확정했는지. false면 자동 발급된 임시 번호.';

update dealer_orders o
set order_number_confirmed = true
where o.order_number is not null
  and not o.order_number_confirmed
  and (
    o.shipped_at is not null
    or o.dispatch_batch_id is not null
    or o.status in ('shipped', 'delivered', 'cancelled')
    or exists (select 1 from dealer_quotes q where q.order_no = o.order_number)
  );

-- 검산 — 번호가 있는 주문 중 확정/임시 개수 (임시는 아직 출고 전인 주문만 남아야 정상)
select
  count(*) filter (where order_number is not null and order_number_confirmed)     as confirmed,
  count(*) filter (where order_number is not null and not order_number_confirmed) as provisional
from dealer_orders;

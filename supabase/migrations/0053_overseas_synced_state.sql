-- =========================================================================
-- 해외 발주 폴더 최신화: 폴더 기준 상태 기록
--
-- 폴더 최신화 버튼은 "폴더 기준 상태"(closed=종료, shipped=선적 기록 있음, none=아직 없음)가
-- 지난번 최신화 때와 달라졌을 때만 발주 상태를 바꾼다. 관리자가 직접 고친 상태는
-- 폴더 쪽에 변화가 없으면 그대로 유지된다. 이 컬럼이 그 "지난번 상태"를 기억한다.
-- =========================================================================

alter table purchase_orders add column if not exists synced_state text;

update purchase_orders p
   set synced_state = case
         when p.closed then 'closed'
         when exists (select 1 from overseas_po_shipments s where s.po_id = p.id) then 'shipped'
         else 'none'
       end
 where p.source_folder is not null
   and p.synced_state is null;

-- 확인용: 상태별 건수
select synced_state, count(*) from purchase_orders where source_folder is not null group by 1 order by 1;

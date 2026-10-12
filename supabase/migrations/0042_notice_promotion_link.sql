-- =========================================================================
-- 프로모션에서 만든 공지를 어떤 프로모션의 공지인지 추적한다.
--
-- 프로모션 탭의 [딜러에게 알리기] 버튼이 site_notices 행을 만들 때 이 컬럼에
-- 프로모션 id를 넣어, 프로모션 목록에서 "공지 완료(N곳 확인)"를 보여주고
-- 같은 프로모션을 실수로 두 번 공지하는 것을 막는 데 쓴다. 프로모션을
-- 지워도 공지는 남도록 on delete set null.
-- =========================================================================

alter table site_notices
  add column if not exists promotion_id uuid references product_promotions (id) on delete set null;

create index if not exists site_notices_promotion_idx on site_notices (promotion_id);

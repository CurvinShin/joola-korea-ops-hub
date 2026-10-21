-- =========================================================================
-- 0056: 브랜드 파트너 승인 후 진행(브랜딩 안내 확인 · 네트 구매 문의)
--
-- 승인된 신청자가 상태 확인 페이지에서
--   - 브랜딩 안내를 확인했다는 표시(branding_ack_at)
--   - 프로네트 / 시미트리 네트 추가 구매 수량
-- 을 남긴다. 수량은 개인정보가 아니므로 암호화하지 않는다.
-- 기존 컬럼·정책은 그대로이며, 추가만 하는 변경이라 운영 DB에 바로 실행해도 안전하다.
-- =========================================================================
alter table partner_applications
  add column if not exists branding_ack_at timestamptz,
  add column if not exists pronet_purchase_qty integer check (pronet_purchase_qty is null or pronet_purchase_qty >= 0),
  add column if not exists symmetry_purchase_qty integer check (symmetry_purchase_qty is null or symmetry_purchase_qty >= 0),
  add column if not exists net_inquiry_at timestamptz;

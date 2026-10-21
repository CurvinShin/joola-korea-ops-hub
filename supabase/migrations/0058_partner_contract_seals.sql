-- =========================================================================
-- 0058: 계약서 직인(도장) 이미지
--
-- 서명과 별도로 직인 이미지를 올릴 수 있다. 신청자는 선택, JOOLA는 직인을 올린다.
-- 0057에서 만든 partner_contracts에 칸만 추가하는 변경이라 기존 데이터에 영향이 없다.
-- =========================================================================
alter table partner_contracts
  add column if not exists partner_seal_png text,
  add column if not exists joola_seal_png text;

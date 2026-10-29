-- 시설(브랜드 파트너사)별 계약서 서명본 보관 기록.
-- 허브 전자서명(partner_contracts) 상태는 자동으로 읽고, 여기에는 사람이 확인해서 적는 값만 둔다.
--   contract_pdf_kept : 서명본 PDF를 갖고 있다(허브에서 내려받아 보관했거나, 외부 전자서명 PDF를 갖고 있음)
--   contract_signed_on: 서명일(참고용)
--   contract_file_note: 보관 위치 메모(폴더·파일명 정도만, 개인정보는 적지 않는다)
-- 컬럼만 추가하는 변경이라 기존 데이터에 영향이 없고, 여러 번 실행해도 안전하다.
alter table facilities
  add column if not exists contract_pdf_kept boolean not null default false,
  add column if not exists contract_signed_on date,
  add column if not exists contract_file_note text;

comment on column facilities.contract_pdf_kept is '계약서 서명본 PDF를 보관 중인지(직접 체크)';
comment on column facilities.contract_signed_on is '계약서 서명일(참고용)';
comment on column facilities.contract_file_note is '서명본 보관 위치 메모(폴더·파일명)';

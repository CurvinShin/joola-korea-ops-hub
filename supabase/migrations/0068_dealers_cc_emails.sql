-- 딜러별 "추가 이메일" 컬럼.
-- 견적서를 보낼 때 담당자 이메일(contact_email) 외에 함께 보내야 하는 주소들을 딜러마다 여러 개 적어 둔다.
-- 딜러 수정 화면에서 직접 입력하고, 관리자 딜러 주문 목록·상세에서 클릭 복사(전체 복사)로 쓴다.
-- 이메일 주소 자체는 이 파일(코드/GitHub)에 넣지 않는다. 컬럼만 추가하며 여러 번 실행해도 안전하다.
alter table dealers
  add column if not exists cc_emails text[] not null default '{}';

comment on column dealers.cc_emails is '견적서 발송 시 담당자 이메일과 함께 보낼 추가 이메일 주소 목록(딜러 수정 화면에서 입력)';

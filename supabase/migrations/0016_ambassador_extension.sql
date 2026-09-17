-- 앰버서더 페이지를 실제로 붙이면서 필요해진 필드들 + 첫 등록 4명.
--
-- ambassadors 테이블 자체는 0001_init.sql 때부터 있었지만(계약상태, 계약기간,
-- 보상, 장비지원, KPI, SNS 계정, 콘텐츠 의무사항, 평가메모 등 계약관리용
-- 필드 위주) 화면이 없어서 계속 비어 있었다. 여기에 연락처(이메일/전화)와
-- 픽클볼 앰버서더 관리에 필요한 주력 패들·DUPR 등급을 추가한다.

alter table ambassadors add column if not exists email text;
alter table ambassadors add column if not exists phone text;
alter table ambassadors add column if not exists main_paddle text;
alter table ambassadors add column if not exists dupr_rating numeric(3,2);

-- 첫 등록 4명. 금전 보상 없이 장비 지원 위주로 활동하는 앰버서더라서
-- compensation은 비워두고 나머지 정보(이메일/전화/인스타/전달용품/주력패들/
-- 듀퍼 등)는 화면에서 직접 채워 넣으면 된다.
insert into ambassadors (name, type, contract_status) values
  ('이재원', 'ambassador', 'active'),
  ('이수인', 'ambassador', 'active'),
  ('이수연', 'ambassador', 'active'),
  ('안소율', 'ambassador', 'active');

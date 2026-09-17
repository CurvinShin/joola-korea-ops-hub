-- 시설 페이지를 실제로 붙이면서 필요해진 필드들.
--
-- facilities 테이블 자체는 0001_init.sql 때부터 있었지만(코트 수,
-- 브랜딩 설치 여부, 데모 패들 제공 여부, 파트너십 상태 등 파트너십 관리용
-- 필드 위주) 화면이 없어서 계속 비어 있었다. 이번에 목록/등록폼/지도를
-- 붙이면서 기본 연락처 정보(주소, 대표자명, 인스타그램 계정)와 지도
-- 표시용 지역(시/도) 필드를 추가한다. 기존 필드는 그대로 유지하고, 폼에도
-- 계속 노출해서 나중에 채울 수 있게 한다.

create type kr_region as enum (
  'seoul', 'incheon', 'gyeonggi', 'gangwon', 'chungbuk', 'chungnam',
  'daejeon', 'sejong', 'jeonbuk', 'jeonnam', 'gwangju', 'gyeongbuk',
  'daegu', 'gyeongnam', 'busan', 'ulsan', 'jeju'
);

alter table facilities add column if not exists address text;
alter table facilities add column if not exists representative_name text;
alter table facilities add column if not exists instagram_handle text;
alter table facilities add column if not exists region kr_region;

create index if not exists facilities_region_idx on facilities (region);

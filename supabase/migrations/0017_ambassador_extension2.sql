-- 앰버서더 구분에 주니어/크리에이터 추가 + 실무에서 자주 쓰는 필드 보강.
--
-- 개인정보를 필요 이상으로 늘리지 않기 위해, 여기 추가하는 항목은 실제
-- 운영에 쓰이는 것으로 제한했다: 용품을 보낼 배송지 주소(주소가 없으면
-- 지금도 운영이 안 됨), 주니어 여부를 실제로 판단하는 데 쓰는 생년월일,
-- 소속(클럽/팀/학교), 성별. 이 테이블은 다른 테이블과 마찬가지로
-- RLS로 로그인한 내부 직원만 조회 가능하다(0001_init.sql의 공통 정책).
--
-- 참고: enum에 새 값을 추가하는 ALTER TYPE ... ADD VALUE는 Postgres에서
-- 같은 트랜잭션 안에서 바로 사용할 수 없으므로, 이 마이그레이션은 컬럼
-- 추가만 하고 새 구분 값을 실제로 쓰는 데이터 삽입은 하지 않는다.

alter type ambassador_type add value if not exists 'junior';
alter type ambassador_type add value if not exists 'creator';

alter table ambassadors add column if not exists birth_date date;
alter table ambassadors add column if not exists gender text;
alter table ambassadors add column if not exists affiliation text;
alter table ambassadors add column if not exists shipping_address text;

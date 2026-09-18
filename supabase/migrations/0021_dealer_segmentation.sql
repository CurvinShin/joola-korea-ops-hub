-- =========================================================================
-- 딜러 세그멘테이션 (JOOLA HQ APAC 분류 체계) — Category / Sub Category /
-- Sub Detail 3단계. 기존 dealers.classification(플래그십/일반/온라인전용/
-- 총판)은 컬럼과 데이터를 그대로 두되(다른 곳에서 참조하지 않게 됨), 딜러
-- 목록/상세 화면의 "구분" 표시는 이 세 컬럼 기준으로 바뀐다.
--
-- 값 목록/계층 구조는 코드 쪽 src/lib/utils/dealerSegments.ts 참고. 세
-- 컬럼 모두 처음엔 비어있으며(NULL), /dealers 상세 화면에서 딜러 하나씩
-- 직접 선택해서 채워나가는 방식.
-- Safe to run as a normal SQL Editor execution (no new enum values here).
-- =========================================================================

alter table dealers add column if not exists segment_category text;
alter table dealers add column if not exists segment_subcategory text;
alter table dealers add column if not exists segment_detail text;

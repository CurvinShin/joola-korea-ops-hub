-- =========================================================================
-- 0048: 업데이트 기록(app_updates)
--
-- 지금까지/앞으로 추가된 기능을 기록하는 목록. 항목마다 audience로 공개 범위를 정한다.
--   internal : 관리자(직원)만 본다
--   dealers  : 관리자 + 딜러 모두 본다(딜러 화면 "업데이트 소식")
-- 쓰기(추가/수정/삭제)는 can_write()(admin)만 가능하다.
-- 처음 만들 때 한 번만 과거 업데이트 41건을 채워 넣는다(테이블이 비어 있을 때만).
-- =========================================================================
create table if not exists app_updates (
  id uuid primary key default gen_random_uuid(),
  released_on date not null default current_date,
  kind text not null default 'new' check (kind in ('new', 'improved', 'fixed')),
  audience text not null default 'internal' check (audience in ('internal', 'dealers')),
  title text not null,
  body text not null default '',
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists app_updates_released_idx on app_updates (released_on desc, created_at desc);

alter table app_updates enable row level security;

drop policy if exists app_updates_select_staff on app_updates;
create policy app_updates_select_staff on app_updates
  for select using (is_staff());
drop policy if exists app_updates_select_dealer on app_updates;
create policy app_updates_select_dealer on app_updates
  for select using (audience = 'dealers' and current_dealer_id() is not null);
drop policy if exists app_updates_insert on app_updates;
create policy app_updates_insert on app_updates
  for insert with check (can_write());
drop policy if exists app_updates_update on app_updates;
create policy app_updates_update on app_updates
  for update using (can_write()) with check (can_write());
drop policy if exists app_updates_delete on app_updates;
create policy app_updates_delete on app_updates
  for delete using (can_write());

-- 과거 업데이트 채우기(비어 있을 때만 — 다시 실행해도 중복되지 않는다)
insert into app_updates (released_on, kind, audience, title, body)
select v.released_on, v.kind, v.audience, v.title, v.body
from (values
  ($b$2026-09-15$b$::date, $b$new$b$, $b$dealers$b$, $b$딜러 전용 주문 페이지 오픈$b$, $b$로그인 후 상품을 담아 바로 주문을 접수할 수 있는 딜러 전용 주문 페이지가 열렸습니다. 거래 등급에 맞는 공급가가 자동으로 표시됩니다.$b$),
  ($b$2026-09-16$b$::date, $b$new$b$, $b$dealers$b$, $b$상품 검색·카테고리 필터, 소비자가/공급가 표시$b$, $b$상품명이나 상품코드로 검색하고 카테고리별로 골라 볼 수 있습니다. 소비자가와 공급가를 따로 나눠 표시해 한눈에 비교할 수 있습니다.$b$),
  ($b$2026-09-16$b$::date, $b$new$b$, $b$dealers$b$, $b$장바구니 방식 주문$b$, $b$여러 상품을 장바구니에 담아 한 번에 주문할 수 있습니다. 재고는 입금이 확인되는 시점에 차감되며, 재고가 없는 상품도 백오더로 주문할 수 있습니다.$b$),
  ($b$2026-09-17$b$::date, $b$new$b$, $b$dealers$b$, $b$세부 분류·주문 상세 보기·주문번호$b$, $b$패들 등 세부 분류 버튼, 주문 상세 창, 주문번호가 추가되었고 상품명을 한 번에 복사하는 버튼도 생겼습니다.$b$),
  ($b$2026-09-18$b$::date, $b$new$b$, $b$dealers$b$, $b$신제품 표시$b$, $b$새로 들어온 상품에 신제품 표시가 붙습니다.$b$),
  ($b$2026-09-21$b$::date, $b$new$b$, $b$dealers$b$, $b$접수 상태 주문 직접 수정$b$, $b$담당자 확인 전(접수 상태)의 주문은 딜러가 직접 수량을 수정할 수 있습니다.$b$),
  ($b$2026-09-30$b$::date, $b$new$b$, $b$dealers$b$, $b$주문 합치기$b$, $b$여러 번 나눠 주문한 건을 하나의 주문으로 합칠 수 있습니다. 입금 확인 전 주문만 가능하며, 합친 뒤에는 되돌릴 수 없습니다. 배송비는 합쳐진 수량 기준으로 다시 계산됩니다.$b$),
  ($b$2026-10-05$b$::date, $b$new$b$, $b$dealers$b$, $b$프로모션 가격 표시·프로모션 모아보기, 공지사항$b$, $b$기간 한정 프로모션 상품만 모아 보고 행사 가격으로 주문할 수 있습니다. 주문 페이지에서 공지사항도 확인할 수 있습니다.$b$),
  ($b$2026-10-12$b$::date, $b$new$b$, $b$dealers$b$, $b$내 주문 내역$b$, $b$지금까지 주문하신 내역(상품·수량·금액·진행 상태)을 언제든 확인할 수 있는 "내 주문 내역" 메뉴가 생겼습니다.$b$),
  ($b$2026-10-12$b$::date, $b$fixed$b$, $b$dealers$b$, $b$주문 내역 상품명이 비어 보이던 문제 수정$b$, $b$내 주문 내역에서 일부 상품명이 비어 보이던 문제를 고쳤습니다.$b$),
  ($b$2026-10-12$b$::date, $b$new$b$, $b$dealers$b$, $b$다시 주문·프로모션 남은 수량·신제품 모아보기$b$, $b$지난 주문을 다시 담아 주문할 수 있고, 프로모션 상품은 내가 앞으로 구매할 수 있는 남은 수량이 표시됩니다. 신제품만 모아 보는 버튼도 추가되었습니다.$b$),
  ($b$2026-10-13$b$::date, $b$new$b$, $b$dealers$b$, $b$재고 있는 상품만 보기$b$, $b$주문 화면에서 카테고리를 고른 뒤 "재고 있는 상품만 보기"를 체크하면 지금 바로 주문 가능한 상품만 볼 수 있습니다. 카테고리 숫자도 재고 있는 상품 기준으로 바뀝니다.$b$),
  ($b$2026-10-13$b$::date, $b$new$b$, $b$dealers$b$, $b$수입 요청 메뉴$b$, $b$재고가 없는 상품은 "수입 요청"에서 필요한 수량을 남길 수 있습니다. 한 달 동안 모인 요청을 매달 10일경 한 번에 수입 요청하며, 확정되면 요청 수량으로 백오더 주문이 자동으로 만들어져 "내 주문 내역"에 접수 상태로 표시됩니다. 확정 전에는 직접 취소할 수 있습니다.$b$),
  ($b$2026-10-13$b$::date, $b$new$b$, $b$dealers$b$, $b$오더리스트 다운로드$b$, $b$"오더리스트" 메뉴에서 내 거래 등급에 맞는 최신 오더리스트(엑셀)를 내려받을 수 있습니다. 11월 1일부터 적용되는 새 오더리스트는 10월 28일부터 내려받을 수 있습니다.$b$),
  ($b$2026-09-15$b$::date, $b$improved$b$, $b$internal$b$, $b$화면 한국어화$b$, $b$메뉴·버튼·오류 메시지를 한국어로 바꾸고 SKU 표기와 로그인 오류 문구를 다듬었습니다.$b$),
  ($b$2026-09-15$b$::date, $b$new$b$, $b$internal$b$, $b$발주/수입 관리 모듈$b$, $b$발주(수입) 건을 등록하고 입고 예정을 관리하는 발주 메뉴를 추가했습니다.$b$),
  ($b$2026-09-16$b$::date, $b$new$b$, $b$internal$b$, $b$딜러 주문 검토 페이지·정규/데모 주문 구분·고정 공급가$b$, $b$관리자용 딜러 주문 검토 화면, 정규/데모 주문 구분, 상품별 고정 공급가(fixed_dealer_price) 우선 적용, 카탈로그 누락 상품 관리 보드를 추가했습니다.$b$),
  ($b$2026-09-16$b$::date, $b$new$b$, $b$internal$b$, $b$재고 새로고침(현재고조회 업로드)$b$, $b$현재고조회 xls 파일을 올리면 자동으로 상품과 매칭해 재고를 갱신합니다.$b$),
  ($b$2026-09-17$b$::date, $b$new$b$, $b$internal$b$, $b$딜러 구매액·견적서 합계·출고 목록 복사$b$, $b$딜러별 연누계/월누계 구매액, 견적서 합계와 결제조건 표, 출고 목록 한 번에 복사 기능을 추가했습니다.$b$),
  ($b$2026-09-17$b$::date, $b$new$b$, $b$internal$b$, $b$시설 페이지·앰버서더 페이지$b$, $b$시설 등록/목록/권역별 지도와 앰버서더 등록·목록(주니어/크리에이터 유형 포함)을 추가했습니다.$b$),
  ($b$2026-09-18$b$::date, $b$improved$b$, $b$internal$b$, $b$오더리스트 가격 동기화·딜러 분류·계약 종료일 일괄 설정$b$, $b$9/17 오더리스트 가격을 반영하고 데모 전용 SKU 보호, 딜러 분류, 계약 종료일 일괄 설정을 추가했습니다.$b$),
  ($b$2026-09-19$b$::date, $b$improved$b$, $b$internal$b$, $b$견적서 번호 자동/수동 부여·삭제 주문 번호 재사용$b$, $b$딜러별 견적서 번호 카운터를 맞추고 자동/수동 부여를 지원합니다. 주문을 삭제하면 번호를 되돌려 재사용하고, 딜러 화면에서는 배송비 상세를 숨겼습니다.$b$),
  ($b$2026-09-23$b$::date, $b$improved$b$, $b$internal$b$, $b$관리자 주문 품목 수정·배송비 5,500원$b$, $b$관리자가 주문 품목을 직접 수정할 수 있고, 배송비를 5,500원(VAT 포함)으로 올렸습니다.$b$),
  ($b$2026-09-29$b$::date, $b$new$b$, $b$internal$b$, $b$영업 페이지·KR Code·데모 구매 비율 점검$b$, $b$딜러와 스마트스토어 월별 매출 페이지(/sales), 딜러 KR Code 필드, 데모 구매 비율 규칙 위반 표시를 추가했습니다.$b$),
  ($b$2026-09-30$b$::date, $b$new$b$, $b$internal$b$, $b$제품군 분석·공개 리포트 링크·대시보드 매출 확장$b$, $b$제품군별 판매 분석(딜러/스마트스토어/전체), 로그인 없이 보는 공개 리포트 링크, 대시보드 이번 달 매출에 딜러 견적서 합산과 채널 분해, 모바일 메뉴를 추가했습니다.$b$),
  ($b$2026-09-30$b$::date, $b$improved$b$, $b$internal$b$, $b$주문 합치기(관리자)·확정 금액 수정·딜러 목록 정렬$b$, $b$관리자도 접수 주문을 합칠 수 있고, 입금 확인 후에도 확정 금액을 수정할 수 있습니다. 딜러 목록은 구매액 많은 순으로 정렬할 수 있고 주문일에 시각도 표시됩니다.$b$),
  ($b$2026-09-30$b$::date, $b$fixed$b$, $b$internal$b$, $b$입금 확인·확정 금액 저장 실패가 조용히 무시되던 문제 수정$b$, $b$저장이 실패해도 알림 없이 넘어가던 문제를 고쳤습니다. 9월 누락 견적서도 보정했습니다.$b$),
  ($b$2026-10-01$b$::date, $b$new$b$, $b$internal$b$, $b$월말 정산(스마트스토어) 자동화·SKU 매핑$b$, $b$스마트스토어 월말 정산 파일 생성을 자동화하고, SKU 매핑에 옵션(색상) 구분·후보 추천·미매핑 진행 현황·기존 매핑 수정 기능을 추가했습니다. 딜러 주문은 월별 섹션으로 묶어 보여줍니다.$b$),
  ($b$2026-10-05$b$::date, $b$new$b$, $b$internal$b$, $b$프로모션 가격 엔진·공지사항 시스템$b$, $b$기간 한정 프로모션(블랙프라이데이) 가격 계산과 공지사항 시스템을 추가했습니다. 프로모션 가격은 고정 소비자가 기준 25% 할인이며 데모 구매는 제외됩니다.$b$),
  ($b$2026-10-08$b$::date, $b$new$b$, $b$internal$b$, $b$재고 상태 탭·견적서 10월 반영·복구 백업 문서$b$, $b$재고 페이지에 백오더/재고 부족/입고 예정/단종/미매칭 상태 탭을 추가하고, 10월 견적서를 반영했으며, 복구 가이드와 월간 백업 체크리스트를 정리했습니다.$b$),
  ($b$2026-10-08$b$::date, $b$new$b$, $b$internal$b$, $b$협찬·지원 출고 기록, 환불·클레임 목록$b$, $b$협찬·지원 출고 기록(/support)과 환불·클레임 목록(/claims) 페이지를 추가했습니다.$b$),
  ($b$2026-10-08$b$::date, $b$new$b$, $b$internal$b$, $b$옵시디언 위키 연동용 ops-summary 엔드포인트$b$, $b$옵시디언 위키의 자동 업데이트 스크립트가 읽는 운영 요약 JSON 주소를 추가했습니다.$b$),
  ($b$2026-10-12$b$::date, $b$new$b$, $b$internal$b$, $b$공지·프로모션 '딜러에게 알리기'·미확인 딜러 목록$b$, $b$공지와 프로모션을 전체 또는 특정 딜러에게 전달하고, 공지를 아직 확인하지 않은 딜러를 목록으로 볼 수 있습니다. 시설 목록은 권역별로 묶고 권역·상태·검색 필터를 추가했습니다.$b$),
  ($b$2026-10-12$b$::date, $b$fixed$b$, $b$internal$b$, $b$604672 소비자가 누락으로 주문이 0원이던 문제 수정$b$, $b$가격이 등록되지 않은 상품은 주문되지 않도록 막고, 604672의 소비자가를 바로잡았습니다. 대시보드에는 '데이터 점검' 카드를 추가했습니다.$b$),
  ($b$2026-10-13$b$::date, $b$new$b$, $b$internal$b$, $b$수입 요청 확정·수입 요청서(엑셀)$b$, $b$관리자 "수입 요청"에서 접수된 요청을 상품별/딜러별로 보고, 매달 10일경 "수입 요청 확정"을 누르면 딜러별 백오더 주문이 자동 생성됩니다. 지사장님 승인용 수입 요청서(엑셀)에는 상품별 최근 6개월 판매추이 시트가 포함됩니다.$b$),
  ($b$2026-10-13$b$::date, $b$new$b$, $b$internal$b$, $b$오더리스트 업로드·공지 보기/수정$b$, $b$딜러 등급(30%/35%)별 오더리스트 파일을 게시일·시행일과 함께 올리면 해당 등급 딜러에게만 보입니다. 공지는 제목을 눌러 내용을 보고 수정할 수 있습니다.$b$),
  ($b$2026-10-13$b$::date, $b$fixed$b$, $b$internal$b$, $b$재고 페이지 오류 수정$b$, $b$재고 페이지가 열리지 않던 서버 오류를 고쳤습니다.$b$),
  ($b$2026-10-13$b$::date, $b$new$b$, $b$internal$b$, $b$11/1 가격 변경 마이그레이션 준비$b$, $b$30%/35% 신규 오더리스트 가격과 신규 SKU를 반영하는 0046 마이그레이션을 준비했습니다. 11월 1일에 직접 실행합니다.$b$),
  ($b$2026-10-14$b$::date, $b$new$b$, $b$internal$b$, $b$업데이트 기록 페이지$b$, $b$지금까지의 업데이트를 기록하는 이 페이지를 추가했습니다. 항목마다 내부용 / 딜러 공개를 선택할 수 있습니다.$b$),
  ($b$2026-10-14$b$::date, $b$improved$b$, $b$dealers$b$, $b$주문 화면: 재고 있는 상품만 보기를 체크박스로 개선$b$, $b$카테고리 버튼 줄 아래의 체크박스로 바뀌어, 어떤 카테고리에서든 재고 있는 상품만 모아 볼 수 있습니다.$b$),
  ($b$2026-10-14$b$::date, $b$new$b$, $b$dealers$b$, $b$업데이트 소식 페이지$b$, $b$새로 추가되거나 바뀐 기능을 이곳에서 모아 볼 수 있습니다.$b$)
) as v (released_on, kind, audience, title, body)
where not exists (select 1 from app_updates);

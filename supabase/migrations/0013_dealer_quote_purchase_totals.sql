-- 딜러별 "실제 구매액" — 이 앱을 통해 들어온 주문(dealer_orders)과는 별개로,
-- 딜러 폴더에 있는 2026년 견적서 PDF를 전부 읽어서 계산한 값이다. 이 앱이
-- 생기기 전부터 있었던(혹은 앱 밖에서 처리되는) 실제 거래 규모를 반영하기
-- 위한 것으로, "견적서가 있다 = 구매했다"는 전제로 합산했다.
--
-- kr_code로 딜러를 매칭했다(주문번호 KR05-2630 같은 파일명의 앞부분).
-- ytd_quote_amount: 2026년 전체 견적서 합계금액(부가세·배송비 포함, 파일의
--   "합계금액" 값을 그대로 사용).
-- mtd_quote_amount: 그중 견적일자가 2026년 9월인 것만 합산.
-- quote_amount_as_of: 이 값을 계산한 기준일(견적서 폴더 스냅샷 시점). 매번
--   자동으로 갱신되는 값이 아니라, 그때그때 폴더를 다시 읽어서 갱신해야 한다.

alter table dealers add column if not exists ytd_quote_amount numeric;
alter table dealers add column if not exists mtd_quote_amount numeric;
alter table dealers add column if not exists quote_amount_as_of date;

-- 2026-09-17 기준 스냅샷.
--
-- 제외/참고 사항:
--   - "00. 스포츠스쿼드 주식회사" 폴더(KR00)는 계좌 예금주명과 동일해서 외부
--     딜러가 아니라 회사 자체 계정으로 보고 집계에서 제외했다.
--   - "12. BEKEN SPROTS"는 2026년 견적서 폴더가 비어 있어 0건으로 처리했다
--     (아래 update 문에 없음 = 해당 없음, 0으로 둠).
--   - KR10-2618 번호가 파일 3개에 중복 사용됨: "6월 18일" 원본과 "6월 18일
--     - 수정 비전추가"본은 같은 주문의 수정 전/후로 보고 수정본만 반영했다.
--     "6월 22일 PRO V PADDLES"는 날짜가 달라 별개 주문으로 보고 그대로
--     포함했다. 다른 번호로 다시 매겨야 할 수도 있으니 확인 부탁드립니다.
update dealers set ytd_quote_amount = 37462150, mtd_quote_amount = 2435840, quote_amount_as_of = '2026-09-17' where kr_code = 'KR01';
update dealers set ytd_quote_amount = 20104620, mtd_quote_amount = 1559500, quote_amount_as_of = '2026-09-17' where kr_code = 'KR02';
update dealers set ytd_quote_amount = 960080, mtd_quote_amount = 0, quote_amount_as_of = '2026-09-17' where kr_code = 'KR03';
update dealers set ytd_quote_amount = 2999920, mtd_quote_amount = 0, quote_amount_as_of = '2026-09-17' where kr_code = 'KR04';
update dealers set ytd_quote_amount = 39426160, mtd_quote_amount = 2647660, quote_amount_as_of = '2026-09-17' where kr_code = 'KR05';
update dealers set ytd_quote_amount = 10777393, mtd_quote_amount = 0, quote_amount_as_of = '2026-09-17' where kr_code = 'KR06';
update dealers set ytd_quote_amount = 11363000, mtd_quote_amount = 0, quote_amount_as_of = '2026-09-17' where kr_code = 'KR07';
update dealers set ytd_quote_amount = 772200, mtd_quote_amount = 0, quote_amount_as_of = '2026-09-17' where kr_code = 'KR08';
update dealers set ytd_quote_amount = 170805195, mtd_quote_amount = 0, quote_amount_as_of = '2026-09-17' where kr_code = 'KR09';
update dealers set ytd_quote_amount = 87992585, mtd_quote_amount = 16246499, quote_amount_as_of = '2026-09-17' where kr_code = 'KR10';
update dealers set ytd_quote_amount = 17471426, mtd_quote_amount = 2396020, quote_amount_as_of = '2026-09-17' where kr_code = 'KR11';
update dealers set ytd_quote_amount = 34969790, mtd_quote_amount = 2423410, quote_amount_as_of = '2026-09-17' where kr_code = 'KR13';
update dealers set ytd_quote_amount = 33968000, mtd_quote_amount = 0, quote_amount_as_of = '2026-09-17' where kr_code = 'KR14';
update dealers set ytd_quote_amount = 3662945, mtd_quote_amount = 0, quote_amount_as_of = '2026-09-17' where kr_code = 'KR16';

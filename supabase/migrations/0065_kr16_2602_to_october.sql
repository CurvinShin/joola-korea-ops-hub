-- KR16-2602 (10월 1일 출고, POWER FX)는 견적일자가 2026-09-30이라 9월 매출로 잡혀 있었다.
-- 출고일(10/1) 기준인 10월 매출로 옮긴다. (0062에서 들어간 행의 날짜만 바꾼다)
-- 견적서 합계(dealer_quotes)와 품목(dealer_quote_items) 둘 다 바꿔야 /sales와 제품군 분석이 함께 맞는다.
-- 날짜가 이미 바뀐 뒤에 다시 실행해도 영향이 없다.
update dealer_quotes
set quote_date = '2026-10-01'
where order_no = 'KR16-2602' and quote_date = '2026-09-30';

update dealer_quote_items
set quote_date = '2026-10-01'
where order_no = 'KR16-2602' and quote_date = '2026-09-30';

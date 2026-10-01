-- KR11(홍승기 대표) 견적서 번호 카운터 1회성 보정.
--
-- 2026-10-01: "다음 번호" 미리보기가 KR11-2608로 나와서 확인해보니, 바로
-- 앞 번호인 KR11-2607은 실제로 발급된 견적서가 없었다(사용자가 경리나라/
-- 주문 목록에서 직접 확인). next_seq가 실제보다 한 칸 앞서가 있던 것으로
-- 보이며, 그대로 두면 07 자리가 영구히 빈 채로 남는다.
--
-- 0023_dealer_quote_seq_sync.sql의 syncQuoteNumberSeq 패턴(및 앱의
-- "동기화" 버튼)은 greatest()로 감싸져 있어 번호를 앞으로만 당길 수 있고
-- 뒤로는 못 돌린다 — 그래서 이번처럼 되돌리는 보정은 직접 update로 처리.
update dealers
set next_seq = 7, last_seq_year = '26'
where kr_code = 'KR11';

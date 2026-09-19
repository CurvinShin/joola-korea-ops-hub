-- 견적서 번호({kr_code}-{YY}{SEQ}, dealers.next_seq/last_seq_year 기반,
-- 0011의 assign_dealer_order_number()가 발급하는 것과 같은 체계) 카운터를
-- 2026-09-19 기준 실제 마지막 발급 견적서 번호에 맞춰 동기화한다.
--
-- 이 카운터는 원래 사이트에서 딜러가 직접 주문을 넣을 때만 올라가는데
-- (0011 참고), 경리나라 등 사이트 밖에서 별도로 발행하는 견적서는 반영이
-- 안 되고 있어서 next_seq가 실제보다 뒤처져 있었다. 그대로 두면 다음 자동
-- 발급 번호가 이미 쓰인 견적서 번호와 겹칠 수 있어서, 사용자가 확인해준
-- "26년 9월 19일 기준 마지막 견적서 번호" + 1로 next_seq를 올려둔다.
--
-- greatest()로 감싸서 혹시 사이트 주문으로 이미 이보다 앞서 있는 값이 있어도
-- 뒤로 되돌리지 않는다. 목록에 없는 딜러 코드(KR04, KR12, KR15 등)는 계약
-- 종료/미계약이라 이번 동기화 대상이 아니다.
update dealers set next_seq = greatest(next_seq, 13), last_seq_year = '26' where kr_code = 'KR01'; -- 마지막 KR01-2612
update dealers set next_seq = greatest(next_seq, 10), last_seq_year = '26' where kr_code = 'KR02'; -- 마지막 KR02-2609
update dealers set next_seq = greatest(next_seq, 2),  last_seq_year = '26' where kr_code = 'KR03'; -- 마지막 KR03-2601
update dealers set next_seq = greatest(next_seq, 31), last_seq_year = '26' where kr_code = 'KR05'; -- 마지막 KR05-2630
update dealers set next_seq = greatest(next_seq, 14), last_seq_year = '26' where kr_code = 'KR06'; -- 마지막 KR06-2613
update dealers set next_seq = greatest(next_seq, 4),  last_seq_year = '26' where kr_code = 'KR07'; -- 마지막 KR07-2603
update dealers set next_seq = greatest(next_seq, 2),  last_seq_year = '26' where kr_code = 'KR08'; -- 마지막 KR08-2601
update dealers set next_seq = greatest(next_seq, 24), last_seq_year = '26' where kr_code = 'KR09'; -- 마지막 KR09-2623
update dealers set next_seq = greatest(next_seq, 50), last_seq_year = '26' where kr_code = 'KR10'; -- 마지막 KR10-2649
update dealers set next_seq = greatest(next_seq, 7),  last_seq_year = '26' where kr_code = 'KR11'; -- 마지막 KR11-2606
update dealers set next_seq = greatest(next_seq, 11), last_seq_year = '26' where kr_code = 'KR13'; -- 마지막 KR13-2610
update dealers set next_seq = greatest(next_seq, 2),  last_seq_year = '26' where kr_code = 'KR14'; -- 마지막 KR14-2601
update dealers set next_seq = greatest(next_seq, 2),  last_seq_year = '26' where kr_code = 'KR16'; -- 마지막 KR16-2601

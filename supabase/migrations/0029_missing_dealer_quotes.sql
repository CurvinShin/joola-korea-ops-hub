-- 9월 17일 스냅샷(0014) 이후 새로 나온 견적서 9건을 dealer_quotes에 추가.
-- 전부 2026년 9월 견적이라 이번 달 매출(딜러 매출, /sales 페이지)에 그대로 반영된다.
-- 합계: 45,272,405원 (기존 DB의 9월 견적 27,708,929원과 합치면 9월 매출 72,981,334원)

insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR01', 'KR01-2613', '2026-09-29', 1833480, '선결제', 'KR01-2613 견적서(PRO V, POWER FX).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR05', 'KR05-2631', '2026-09-29', 1949200, '선결제', 'KR05-2631 견적서(9월 30일 출고,POWER FX).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR09', 'KR09-2624', '2026-09-29', 16347925, '선결제', 'KR09-2624 견적서(9월 29일 출고, POWER FX 포함 패들, 네트)양말 데모 가격 수정.pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR09', 'KR09-2625', '2026-09-30', 214500, '선결제', 'KR09-2625 견적서(9월 30일 출고, R4lly 신발, 양말 등)신발 사이즈 수정.pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2650', '2026-09-28', 3091330, '선결제', 'KR10-2650 견적서9월 29일 출고(패들, 패들커버, POWER FX 등).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2651', '2026-09-30', 8865340, '선결제', 'KR10-2651 견적서 9월 30일 출고(Vision Hyperion, Colorway, 네트 등).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR11', 'KR11-2606', '2026-09-21', 1362220, '선결제', 'KR11-2606 견적서(9월 21일 출고, 패들, 가방).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR13', 'KR13-2611', '2026-09-21', 3439480, '선결제', 'KR13-2611 견적서(9월 21일 출고, 비전패들, 애거시 워시드 인디고, 키체인).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR13', 'KR13-2612', '2026-09-30', 8168930, '선결제', 'KR13-2612 견적서(9월 30일 출고, 비전패들, 프리모 인도어 플러스 등).pdf');

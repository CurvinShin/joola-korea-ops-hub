-- 딜러별 견적서를 한 건씩 보여주기 위한 테이블. dealers.ytd_quote_amount /
-- mtd_quote_amount는 합계만 보여주는데, 결제조건(선결제 vs 분할결제 등)은
-- 견적서마다 다를 수 있어서 건별로 남겨둔다.
--
-- kr_code + order_no로 원본 견적서 파일을 추적할 수 있게 했다. 같은
-- order_no가 여러 건일 수 있음에 주의 — 예를 들어 KR10-2618은 서로 다른
-- 두 번의 실제 출고(6월 18일 양말/비전시리즈 건, 6월 22일 PRO V PADDLES
-- 건)에 같은 번호가 재사용된 경우라 order_no에 유니크 제약을 걸지 않았다.
--
-- amount는 견적서의 "합계금액"(부가세·배송비 포함) 그대로이고,
-- payment_terms는 견적서 "결제조건" 란의 원문 그대로다(예: "선결제",
-- 나스포(KR14)의 "선결제 50%, 완수금 50%(출고 후 익월 10일)" 등) — 별도
-- 분류 체계 없이 원문을 그대로 보여준다.

create table if not exists dealer_quotes (
  id uuid primary key default gen_random_uuid(),
  kr_code text not null,
  order_no text not null,
  quote_date date not null,
  amount numeric not null,
  payment_terms text,
  source_file text not null,
  created_at timestamptz not null default now()
);

create index if not exists dealer_quotes_kr_code_idx on dealer_quotes (kr_code);

alter table dealer_quotes enable row level security;

create policy dealer_quotes_select on dealer_quotes
  for select using (auth.role() = 'authenticated');
create policy dealer_quotes_insert on dealer_quotes
  for insert with check (can_write());
create policy dealer_quotes_update on dealer_quotes
  for update using (can_write()) with check (can_write());
create policy dealer_quotes_delete on dealer_quotes
  for delete using (can_write());

-- ---------------------------------------------------------------------
-- 0013 보정: KR09(신세계홀세일)에서도 KR10-2618과 같은 패턴의 중복 견적서가
-- 하나 더 발견됐다 — KR09-2622 건이 원본(2026-08-26, 5,718,075원)과
-- "-수정1"(2026-08-26, 5,847,875원, 파일명에 "가격수정" 명시) 두 개로
-- 존재해서, 0013에서는 두 금액을 모두 합산해 170,805,195원으로 잘못
-- 계산됐었다. 수정본만 반영하도록 5,718,075원을 빼서 165,087,120원으로
-- 정정한다. mtd_quote_amount는 두 파일 모두 8월(2026-08-26)이라 이번달
-- 집계에는 애초에 영향이 없었다.
-- ---------------------------------------------------------------------
update dealers set ytd_quote_amount = 165087120 where kr_code = 'KR09';

-- ---------------------------------------------------------------------
-- 견적서 163건 (KR00 제외, KR10-2618/KR09-2622 중복 원본 제외) — 2026-09-17
-- 폴더 스냅샷 기준.
-- ---------------------------------------------------------------------
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR01', 'KR01-2601', '2026-02-25', 21067090, '선결제', 'KR01-2601 견적서(프로V 프리오더건, 데모 포함).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR01', 'KR01-2602', '2026-03-05', 1709510, '선결제', 'KR01-2602 견적서(프로IV)(KR02로 잘못 보냈었음).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR01', 'KR01-2603', '2026-03-24', 1069310, '선결제', 'KR01-2603 견적서(3월 24일 출고, Tour elite bag, 연습용 네트).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR01', 'KR01-2604', '2026-04-20', 1850310, '선결제', 'KR01-2604 견적서(4월 21일 출고, Pro 패들, Tour elite bag, 네트).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR01', 'KR01-2605', '2026-05-20', 2242020, '선결제', 'KR01-2605 견적서(5월 21일 출고, Pro 패들, Tour elite bag).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR01', 'KR01-2606', '2026-05-22', 139700, '선결제', 'KR01-2606 견적서(5월 22일 출고, Compact Pickleball Practice Net).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR01', 'KR01-2607', '2026-06-29', 2697420, '선결제', 'KR01-2607 견적서(6월 29일 출고, Compact Pickleball Practice Net, PRO V, Elite tour bag etc).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR01', 'KR01-2608', '2026-07-10', 334730, '선결제', 'KR01-2608 견적서(7월 10일 출고, Bag, PRO IV).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR01', 'KR01-2609', '2026-07-13', 320100, '선결제', 'KR01-2609 견적서(7월 13일 출고, Net).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR01', 'KR01-2610', '2026-07-27', 2823150, '선결제', 'KR01-2610 견적서(7월 29일 출고, PRO V, Net, Accesories ETC, 패들 추가).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR01', 'KR01-2611', '2026-08-20', 772970, '선결제', 'KR01-2611 견적서(8월 20일 출고, Compact Net, Accesories)).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR01', 'KR01-2612', '2026-09-09', 2435840, '선결제', 'KR01-2612 견적서(PRO V, Vision 등).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR02', 'KR02-2601', '2026-01-05', 666490, '선결제', 'KR02-2601 견적서(1월 5일 출고, Perseus 3S dual 3ea).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR02', 'KR02-2602', '2026-01-28', 1630860, '선결제', 'KR02-2602 견적서(1월 28일 출고, Perseus 3S dual 2ea, Symmetry net 3ea).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR02', 'KR02-2603', '2026-02-05', 2569160, '선결제', 'KR02-2603 견적서(2월 5일 하나온 출고, 시미트리네트 직배송건).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR02', 'KR02-2604', '2026-03-05', 1706320, '선결제', 'KR02-2604 견적서(3월 3일 출고, 패들).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR02', 'KR02-2605', '2026-03-09', 1521960, '선결제', 'KR02-2605 견적서(3월 10일 출고, 패들).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR02', 'KR02-2606', '2026-03-11', 6264390, '선결제', 'KR02-2606 견적서(3월 11일 출고, 프로4, 프로5 패들).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR02', 'KR02-2607', '2026-05-20', 2053700, '선결제', 'KR02-2607 견적서(5월 20일 출고, 패들, 패들커버).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR02', 'KR02-2608', '2026-08-11', 2132240, '선결제', 'KR02-2608 견적서(8월 12일 출고, 패들).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR02', 'KR02-2609', '2026-09-15', 1559500, '선결제', 'KR02-2609 견적서(9월 16일 출고, 패들).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR03', 'KR03-2601', '2026-07-15', 960080, '선결제', 'KR03-2601(7월 15일 출고, 프로모션 패들, 신발).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR04', 'KR04-2601', '2026-01-23', 998140, '선결제', 'KR04-2601(프리오더, The year of the horse PERSEUS PRO IV 16mm).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR04', 'KR04-2602', '2026-04-01', 1329020, '선결제', 'KR04-2602(4월 1일 출고건, PRO V).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR04', 'KR04-2603', '2026-05-28', 336380, '선결제', 'KR04-2603 견적서(프로 V Perseus 16mm).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR04', 'KR04-2604', '2026-06-29', 336380, '선결제', 'KR04-2604 견적서(6월 30일 출고, 프로 V Perseus 16mm).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR05', 'KR05-2601', '2026-01-09', 1140260, '선결제', 'KR05-2601 견적서(1월 9일 출고건).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR05', 'KR05-2602', '2026-01-26', 2054690, '선결제', 'KR05-2602 견적서(1월 26일 출고건)(수정1).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR05', 'KR05-2603', '2026-01-28', 1659900, '선결제', 'KR05-2603 견적서(1월 29일 출고건, The Year Of The Horse).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR05', 'KR05-2604', '2026-02-10', 971300, '선결제', 'KR05-2604 견적서(2월 10일 하나온 출고건).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR05', 'KR05-2605', '2026-02-26', 4027265, '선결제', 'KR05-2605 견적서(PRO V 프리오더건, 비전 백팩 블루 포함 수정1).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR05', 'KR05-2606', '2026-03-13', 3737415, '선결제', 'KR05-2606 견적서(3월 13일 출고, PRO V, 3S Dual).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR05', 'KR05-2607', '2026-03-17', 835230, '선결제', 'KR05-2607 견적서(3월 17일 출고, PRO V, PRO IV, Paddle cover).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR05', 'KR05-2608', '2026-03-30', 998140, '선결제', 'KR05-2608 견적서(3월 30일 출고, PRO V paddle).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR05', 'KR05-2609', '2026-04-03', 4352315, '선결제', 'KR05-2609 견적서(4월 3일 출고, PRO IV Backordered item, PRO V).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR05', 'KR05-2610', '2026-04-20', 1549020, '선결제', 'KR05-2610 견적서(4월 21일 출고, PRO V, 패들커버).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR05', 'KR05-2611', '2026-05-06', 1549020, '선결제', 'KR05-2611 견적서(5월 4일 출고, PRO V, 패들커버).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR05', 'KR05-2612', '2026-05-11', 1329020, '선결제', 'KR05-2612 견적서(5월 11일 출고, PRO V).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR05', 'KR05-2613', '2026-05-15', 1373130, '선결제', 'KR05-2613 견적서(5월 15일 출고, 패들, 아대, 커버).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR05', 'KR05-2614', '2026-05-28', 936540, '선결제', 'KR05-2614 견적서(패들, 네트, HC-40).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR05', 'KR05-2615', '2026-06-22', 1055065, '선결제', 'KR05-2615 견적서(비전 하이페리온, 퓨어그립).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR05', 'KR05-2616', '2026-06-26', 808940, '선결제', 'KR05-2616 견적서(JOOLA WEEK, PRO IV).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR05', 'KR05-2617', '2026-06-29', 206360, '선결제', 'KR05-2617 견적서(JOOLA WEEK, PRO IV 2).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR05', 'KR05-2618', '2026-07-01', 1199000, '선결제', 'KR05-2618 견적서(6월 30일 출고, JOOLA WEEK, PRO IV 3, PRO V).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR05', 'KR05-2619', '2026-07-03', 2475000, '선결제', 'KR05-2619 견적서(7월 3일 출고, primo Indoor plus).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR05', 'KR05-2620', '2026-07-06', 708840, '선결제', 'KR05-2620 견적서(7월 6일 출고, asiacolorway, PRO IV, sling bag) 추가수정1.pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR05', 'KR05-2621', '2026-07-09', 258390, '선결제', 'KR05-2621 견적서(7월 9일 출고, asiacolorway).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR05', 'KR05-2622', '2026-07-10', 1343650, '선결제', 'KR05-2622 견적서(7월 10일 출고, asiacolorway, PRO IV, Bag etc).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR05', 'KR05-2623', '2026-07-22', 336380, '선결제', 'KR05-2623 견적서(7월 22일 출고, Simone Jardim).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR05', 'KR05-2624', '2026-08-03', 788370, '선결제', 'KR05-2624 견적서(8월 3일 출고, 패들, 패들커버, 가방).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR05', 'KR05-2625', '2026-08-11', 667260, '선결제', 'KR05-2625 견적서(8월 10일 출고, 패들).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR05', 'KR05-2626', '2026-08-24', 418000, '선결제', 'KR05-2626 견적서(8월 24일 출고, 패들).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR05', 'KR05-2627', '2026-09-04', 785620, '선결제', 'KR05-2627 견적서(9월 2, 4일 출고, 패들 직배송, 공).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR05', 'KR05-2628', '2026-09-10', 795280, '선결제', 'KR05-2628 견적서(9월 10일 출고, 패들, 양말).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR05', 'KR05-2629', '2026-09-15', 672760, '선결제', 'KR05-2629 견적서(9월 15일 출고, 패들).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR05', 'KR05-2630', '2026-09-17', 394000, '선결제', 'KR05-2630 견적서(9월 17일 출고, 패들).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR06', 'KR06-2601', '2026-01-02', 718080, '선결제', 'KR06-2601 견적서(1월 2일 출고건).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR06', 'KR06-2602', '2026-01-23', 336380, '선결제', 'KR06-2602 견적서(프리오더, The year of the horse 1ea).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR06', 'KR06-2603', '2026-03-05', 3742585, '선결제', 'KR06-2603 견적서(3월 3일 출고건, 코스모스 백오더).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR06', 'KR06-2604', '2026-03-18', 911306, '선결제', 'KR06-2604 견적서(3월 19일 출고건, 코스모스, 의류, 토트백 등).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR06', 'KR06-2605', '2026-03-24', 718080, '선결제', 'KR06-2605 견적서(3월 24일 출고건, 프로V 2ea).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR06', 'KR06-2606', '2026-03-26', 718080, '선결제', 'KR06-2606 견적서(3월 26일 출고건, 프로V 2ea).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR06', 'KR06-2607', '2026-04-03', 591470, '선결제', 'KR06-2607 견적서(4월 3일 출고건, 프로V, 가방 등).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR06', 'KR06-2608', '2026-06-05', 361790, '선결제', 'KR06-2608 견적서(6월 4일 출고건, 코스모스 16mm).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR06', 'KR06-2609', '2026-07-01', 382470, '선결제', 'KR06-2609 견적서(6월 30일 출고건, 토트백, 치마).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR06', 'KR06-2610', '2026-07-10', 587422, '선결제', 'KR06-2610 견적서(7월 10일 출고건, 의류, 패들, 가방).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR06', 'KR06-2611', '2026-07-13', 438020, '선결제', 'KR06-2611 견적서(7월 11일 출고건, 패들).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR06', 'KR06-2612', '2026-08-13', 317130, '선결제', 'KR06-2612 견적서(8월 13일 출고건, 패들, 의류, 양말).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR06', 'KR06-2613', '2026-08-18', 954580, '선결제', 'KR06-2613 견적서(8월 18일 출고건, 패들).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR07', 'KR07-2601', '2026-01-23', 3393225, '선결제', 'KR07-2601 견적서(1월 23일 출고건, 루나 패들 포함 견적서)-수정1.pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR07', 'KR07-2602', '2026-03-12', 4125385, '선결제', 'KR07-2602 견적서(3월 12일 출고, 프로V, 프로IV, 수정1).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR07', 'KR07-2603', '2026-05-28', 3844390, '선결제', 'KR07-2603 견적서(네트 종류별, HC-40).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR08', 'KR08-2601', '2026-02-11', 772200, '선결제', 'KR08-2601 견적서(2월 11일 출고건, 하나온 출고).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR09', 'KR09-2601', '2026-01-02', 1165065, '선결제', 'KR09-2601 견적서(1월 2일 출고건).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR09', 'KR09-2602', '2026-01-22', 16933675, '선결제', 'KR09-2602 견적서(1월 22일 퀵 출고건, PNR Volli open).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR09', 'KR09-2603', '2026-01-27', 7284860, '선결제', 'KR09-2603 견적서(1월 29일 출고건, The Year of the Horse, Colorway Perseus 16mm).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR09', 'KR09-2604', '2026-02-11', 3053600, '선결제', 'KR09-2604 견적서(2월 10일 하나온 출고건).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR09', 'KR09-2605', '2026-02-25', 50665780, '선결제', 'KR09-2605 견적서(PRO V 프리오더건, 배송비 없음, 자체 배송).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR09', 'KR09-2606', '2026-03-10', 5251235, '선결제', 'KR09-2606 견적서(PRO V 데모패들 구매, 배송비 없음, 비전패들, 애거시백팩 포함).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR09', 'KR09-2607', '2026-03-16', 6400240, '선결제', 'KR09-2607 견적서(3월 17일 출고건, Vision 시리즈).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR09', 'KR09-2608', '2026-03-23', 2272160, '선결제', 'KR09-2608 견적서(3월 23일 출고건, PRO V 14mm 페르세우스, 하이페리온, PRO IV Scorpeus).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR09', 'KR09-2609', '2026-04-03', 7409985, '선결제', 'KR09-2609 견적서(4월 3일 출고건, 600097 Vision Hyperion backorder).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR09', 'KR09-2610', '2026-04-10', 446160, '선결제', 'KR09-2610 견적서(4월 10일 출고건, 3S Dual).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR09', 'KR09-2611', '2026-04-20', 3356320, '선결제', 'KR09-2611 견적서(4월 21일 출고건, Vision Series, Pro IV Backorder).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR09', 'KR09-2612', '2026-05-08', 9872005, '선결제', 'KR09-2612 견적서(5월 11일 출고건, Vision Series, Pro IV, V, 데모포함).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR09', 'KR09-2613', '2026-06-01', 5468375, '선결제', 'KR09-2613 견적서(6월 1일 출고건, 비전 시리즈 다수, 300831 3개).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR09', 'KR09-2614', '2026-06-16', 9626650, '선결제', 'KR09-2614 견적서(6월 18일 출고 예정, 비전 하이페리온).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR09', 'KR09-2615', '2026-06-24', 5545760, '선결제', 'KR09-2615 견적서(6월 24일 출고, POPS는 28일 출고, 비전시리즈 및 PRO V, PRO IV COLOR).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR09', 'KR09-2616', '2026-07-01', 2894430, '선결제', 'KR09-2616 견적서(6월 30일 출고, 더블 비전 시리즈).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR09', 'KR09-2617', '2026-07-02', 120340, '선결제', 'KR09-2617 견적서(7월 2일 출고, 양말).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR09', 'KR09-2618', '2026-07-03', 5687000, '선결제', 'KR09-2618 견적서(7월 3일 출고, 프리모인도어) - 수정1.pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR09', 'KR09-2619', '2026-07-15', 6127825, '선결제', 'KR09-2619 견적서(7월 15일 출고, 비전시리즈).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR09', 'KR09-2620', '2026-07-23', 3198415, '선결제', 'KR09-2620 견적서(7월 24일 출고, 비전시리즈, 패들커버).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR09', 'KR09-2621', '2026-08-13', 1989460, '선결제', 'KR09-2621 견적서(8월 13일 출고, 비전시리즈, 양말)(수정1).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR09', 'KR09-2622', '2026-08-26', 5847875, '선결제', 'KR09-2622-수정1 견적서(8월 26일 출고, 비전시리즈, HC-40 가격수정).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR09', 'KR09-2623', '2026-08-28', 4469905, '선결제', 'KR09-2623 견적서(8월 28일 출고, 패들, HC-40(100P).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2601', '2026-01-23', 3314300, '선결제', 'KR10-2601 견적서(프리오더, The year of the horse, 1월 29일 출고).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2602', '2026-03-06', 3515765, '선결제', 'KR10-2602 견적서(PRO V, 데모 1개 포함).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2603', '2026-03-11', 1230460, '선결제', 'KR10-2603 견적서(엘레멘탈 네트, 애거시그라프 챔피언, 블루라이트닝).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2604', '2026-03-20', 560450, '선결제', 'KR10-2604 견적서(3월 20일 출고, 서동인 직배송).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2605', '2026-03-24', 336380, '선결제', 'KR10-2605 견적서(3월 24일 출고, 프로V 애거시 14mm).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2606', '2026-04-07', 946110, '선결제', 'KR10-2606 견적서(4월 7일 출고, 프로V, 프로IV).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2607', '2026-04-20', 820490, '선결제', 'KR10-2607 견적서(4월 21일 출고, paddle set, neoprene cover).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2608', '2026-05-06', 2600840, '선결제', 'KR10-2608 견적서(5월 6일 출고, 프로5, 네트, 공, 에센셜 세트, 낱개).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2609', '2026-05-11', 360800, '선결제', 'KR10-2609 견적서(5월 11일 출고, 김경연 대표).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2610', '2026-05-12', 21290181, '선결제', 'KR10-2610 견적서(5월 13일 출고, 섬머오픈 부스, 수정1).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2611', '2026-05-14', 251900, '선결제', 'KR10-2611 견적서(5월 14일 출고, 17068).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2612', '2026-05-28', 374748, '선결제', 'KR10-2612 견적서(5월 28일 직배송건 및 네트 판매, 불량반품건 및 재고부족건 금액 바.pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2613', '2026-06-01', 139700, '선결제', 'KR10-2613 견적서(6월 1일, 연습용 네트).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2614', '2026-06-05', 783508, '선결제', 'KR10-2614 견적서(6월 5일, 의류, 모자 등).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2615', '2026-06-12', 4916010, '선결제', 'KR10-2615 견적서(6월 12일 출고, 신발, 엣지가드 테이프).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2616', '2026-06-15', 559350, '선결제', 'KR10-2616 견적서(6월 15일 출고 및 백오더, 트레이너패들, 러기지텍) 수정1.pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2617', '2026-06-15', 1365650, '선결제', 'KR10-2617 견적서(6월 16일 출고, 백오더, 비전 하이페리온).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2618', '2026-06-18', 1419715, '선결제', 'KR10-2618 견적서(6월 18일 출고, 양말, 비전시리즈) - 수정 비전추가.pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2618', '2026-06-22', 3711730, '선결제', 'KR10-2618 견적서(6월 22일 출고, PRO V PADDLES).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2619', '2026-06-22', 1095490, '선결제', 'KR10-2619 견적서(6월 28일 출고, POPS Rally Paddle).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2620', '2026-06-24', 225830, '선결제', 'KR10-2620 견적서(6월 24일 출고, 3S Dual).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2621', '2026-06-29', 609224, '선결제', 'KR10-2621 견적서(6월 29일 출고, 볼캐디, 의류).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2622', '2026-07-01', 566390, '선결제', 'KR10-2622 견적서(Vision CGS 등).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2623', '2026-07-01', 841060, '선결제', 'KR10-2623 견적서(7월 1일 출고, 볼캐디, 신제품 모자 등).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2624', '2026-07-02', 859540, '선결제', 'KR10-2624 견적서(에센셜 세트).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2625', '2026-07-03', 651530, '선결제', 'KR10-2625 견적서(PRIMO INDOOR PLUS, Vision Hyperion).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2626', '2026-07-06', 522720, '선결제', 'KR10-2626 견적서(7월 6일 출고, 의류, 모자, 비전, 트레이너 패들 세트).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2627', '2026-07-09', 3074115, '선결제', 'KR10-2627 견적서(7월 9일 출고, 트레이너 패들 세트, 프로모션 제품).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2628', '2026-07-13', 981310, '선결제', 'KR10-2628 견적서(7월 13일 출고, Asiacolorway 패들, 가방).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2629', '2026-07-15', 650980, '선결제', 'KR10-2629 견적서(7월 15일 출고, Compact Net, Promotion PRO IV).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2630', '2026-07-22', 600600, '선결제', 'KR10-2630 견적서(7월 23일 출고, PRO IV, Net).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2631', '2026-07-28', 526240, '선결제', 'KR10-2631 견적서(7월 28일 출고, 러기지 택, 바이저, 엣지가드 테이프, 양말).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2632', '2026-08-03', 777150, '선결제', 'KR10-2632 견적서(8월 3일 출고, 패들).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2633', '2026-08-07', 343420, '선결제', 'KR10-2633 견적서(8월 7일 출고, 패들, 양말, 패들 갯수 수정1).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2634', '2026-08-11', 1001396, '선결제', 'KR10-2634 견적서(8월 10일, 11일 출고, 대회 직배송건 및 일반 주문건)(수정1).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2635', '2026-08-12', 1769592, '선결제', 'KR10-2635 견적서(8월 13일 출고, 패들, 가방, 의류, 수건, 공)수정1.pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2636', '2026-08-18', 1240690, '선결제', 'KR10-2636 견적서(8월 18일 출고, 패들).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2637', '2026-08-19', 511280, '선결제', 'KR10-2637 견적서(8월 19일 출고, 패들).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2638', '2026-08-20', 1793715, '선결제', 'KR10-2638 견적서(8월 20일 출고, 컬러웨이 패들).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2639', '2026-08-21', 1793715, '선결제', 'KR10-2639 견적서(8월 21일 출고, 컬러웨이 패들).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2640', '2026-08-24', 1142900, '선결제', 'KR10-2640 견적서(8월 24일 출고, 컬러웨이 패들, 비전패들, 공).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2641', '2026-08-26', 351296, '선결제', 'KR10-2641 견적서(8월 26일 출고, 모자, 의류).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2642', '2026-08-31', 1317816, '선결제', 'KR10-2642 견적서(9월 1일 출고, 패들, 악세사리).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2643', '2026-09-02', 873840, '선결제', 'KR10-2643 견적서(9월 2일 출고, 패들).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2644', '2026-09-04', 2080001, '선결제', 'KR10-2644 견적서(9월 4일 출고, 양말, 의류).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2645', '2026-09-07', 2512125, '선결제', 'KR10-2645 견적서(9월 7일 출고, 컬러에이 패들).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2646', '2026-09-09', 2059299, '선결제', 'KR10-2646 견적서(9월 10일 출고, 프리모 인도어 플러스).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2647', '2026-09-15', 269720, '선결제', 'KR10-2647 견적서(9월 15일 출고, 배리어 직배송).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2648', '2026-09-15', 5431250, '선결제', 'KR10-2648 견적서(9월 16일 출고, 애거시, 비전, 투어백).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR10', 'KR10-2649', '2026-09-17', 3020264, '선결제', 'KR10-2649 견적서9월 17일 출고(패들, 모자, 러기지택 등).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR11', 'KR11-2601', '2026-03-31', 11400785, '선결제', 'KR11-2601 견적서(3월 31일 출고, 인피클 초도주문건, 백오더 1종).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR11', 'KR11-2602', '2026-05-12', 1487711, '선결제', 'KR11-2602 견적서(5월 12일 출고, Drawstring 가방, Perseus 반품건).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR11', 'KR11-2603', '2026-06-18', 1035100, '선결제', 'KR11-2603 견적서(6월 19일 출고, 신제품 모자, 양말, 패들).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR11', 'KR11-2604', '2026-07-09', 1151810, '선결제', 'KR11-2604 견적서(7월 9일 출고, 프로모션, 패들커버, 비전).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR11', 'KR11-2605', '2026-09-11', 2396020, '선결제', 'KR11-2605 견적서(9월 14일 출고, 패들, 가방, 양말).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR13', 'KR13-2601', '2026-05-13', 11077440, '선결제', 'KR13-2601 견적서(피스스포츠코리아 초도주문, 가방 추가).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR13', 'KR13-2602', '2026-06-18', 2633998, '선결제', 'KR13-2602 견적서(패들, 가방, 택, 양말, 키링).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR13', 'KR13-2603', '2026-06-24', 4218500, '선결제', 'KR13-2603 견적서(JOOLA Astral Pickleball Paddle Dawn).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR13', 'KR13-2604', '2026-06-26', 2752970, '선결제', 'KR13-2604 견적서(POPSIKLE, PRO V, Vision Series).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR13', 'KR13-2605', '2026-07-03', 2484460, '선결제', 'KR13-2605 견적서(Vision Hyperion, Pro V Anna Bright 14mm).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR13', 'KR13-2606', '2026-07-09', 2618660, '선결제', 'KR13-2606 견적서(7월 9일 출고 Hyperion Vision, Ball).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR13', 'KR13-2607', '2026-07-10', 637670, '선결제', 'KR13-2607 견적서(7월 10일 출고 Hyperion Vision).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR13', 'KR13-2608', '2026-08-04', 4551800, '선결제', 'KR13-2608 견적서(8월 5일 출고 Hyperion Vision 백오더, Vision, 패들커버).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR13', 'KR13-2609', '2026-08-27', 1570882, '선결제', 'KR13-2609 견적서(8월 27일 출고, 3S Dual, HC-40).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR13', 'KR13-2610', '2026-09-07', 2423410, '선결제', 'KR13-2610 견적서(9월 7일 출고, 비전패들, 프리모인도어플러스).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR14', 'KR14-2601', '2026-08-17', 33968000, '선결제 50%, 완수금 50%(출고 후 익월 10일)', 'KR14-2601 견적서(Dash 패들 SKU당 400EA).pdf');
insert into dealer_quotes (kr_code, order_no, quote_date, amount, payment_terms, source_file) values ('KR16', 'KR16-2601', '2026-08-28', 3662945, '선결제', 'KR16-2601 견적서(8월28일 출고, 패들, 드로스트링 백팩).pdf');

-- 쿠팡 로켓그로스 입고(우리가 직접 발송)를 딜러 주문 화면에서 똑같이 처리할 수 있도록
-- "쿠팡로켓"을 딜러 한 곳으로 등록한다. KR 코드 대신 kr_code에 '쿠팡로켓'을 쓰므로
-- 주문번호는 '쿠팡로켓-{YY}{순번}' 형태(예: 쿠팡로켓-2601)로 발급된다.
--
-- 수취인·주소·연락처는 발주서 엑셀(제이디로지스)과 택배 양식 복사에 그대로 들어간다.
-- classification은 온라인 채널이라 online_only, 할인율은 0%(소비자가 ÷ 1.1)로 둔다.
-- (할인율을 100%로 두면 대시보드 '데이터 점검' 경고가 뜨므로 0으로 둔다.)
-- 이미 kr_code가 '쿠팡로켓'인 딜러가 있으면 아무것도 하지 않는다(여러 번 실행해도 안전).
insert into dealers (name, classification, status, kr_code, ship_recipient, address, contact_phone, discount_rate, notes)
select '쿠팡로켓', 'online_only', 'active', '쿠팡로켓', '인천4', '인천 검단구 갑문4로 25 쿠팡인천4센터', '070-4754-8741', 0,
       '쿠팡 로켓그로스 입고(인천4센터). 딜러가 아니라 쿠팡 입고 발송용으로 등록한 계정.'
where not exists (select 1 from dealers where kr_code = '쿠팡로켓');

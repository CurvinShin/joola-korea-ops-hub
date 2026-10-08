# 월간 CSV 백업 체크리스트

Supabase Free 플랜은 자동 백업이 없어서, 월 1회 CSV 내보내기가 화면에서만 입력한 데이터의 유일한 방어선입니다.
(매월 1일 오전 8:47 KST에 푸시 알림이 옵니다. 복구 절차는 `docs/RESTORE.md` 참고.)

## 방법

Supabase 대시보드 → Table Editor → 테이블 선택 → Export → Export table as CSV (약 10분)

## 1순위 — 화면에서만 입력해서 다른 곳에는 없는 데이터

- [ ] `dealer_orders`
- [ ] `dealer_order_items`
- [ ] `sales_transactions` (스마트스토어 월 정산 수동 입력분)
- [ ] `purchase_orders` (발주 기록)
- [ ] `inventory_snapshots` (재고 이력)
- [ ] `support_shipments` (협찬·지원 출고 기록)
- [ ] `refund_claims` (환불·클레임 목록)

## 2순위 — 화면에서 수정해 온 마스터 데이터

- [ ] `products` (가격·이미지·세부분류 수정분)
- [ ] `inventory`
- [ ] `dealers` (세그먼트·계약 정보 수정분)
- [ ] `profiles` (계정별 권한과 딜러 연결)
- [ ] `ambassadors`, `facilities`, `events`, `tasks`

## 3순위 — 있으면 좋은 것

- [ ] `site_notices`, `product_promotions`
- [ ] `catalog_gaps`
- [ ] `smartstore_order_items`, `smartstore_sku_map`

`dealer_quotes`, `dealer_quote_items`는 마이그레이션 SQL에 들어 있어 내보내지 않아도 됩니다.
테이블 이름이 화면과 다르면 비슷한 이름을 고르고, 없는 것은 건너뜁니다.

## 보관

- `허브백업/YYYY-MM` 폴더를 만들고 파일명 앞에 날짜를 붙입니다.
- 최근 3~6개월치만 유지합니다.
- CSV에는 딜러 연락처·주문 정보가 있으므로 회사에서 허용한 저장 위치에만 두고 외부 공유는 금지합니다.
- `profiles`에는 로그인 이메일이 있지만 비밀번호는 담기지 않습니다. 계정은 복구 때 다시 만들어야 합니다.

## 확인

내보낸 뒤 `dealer_orders`, `sales_transactions`를 열어 행이 비어 있지 않은지, 이번 달 입력분이 있는지만 확인합니다.

# JOOLA Korea Ops Hub — 복구 안내서 (RESTORE)

> 이 문서는 **Supabase 프로젝트(DB)가 사라졌거나 망가졌을 때** 시스템을 다시 세우기 위한 안내서입니다.
> 새 Claude 세션에게 이 파일을 읽게 한 뒤 "RESTORE.md 따라 복구해줘"라고 요청하면 됩니다.
> 작성일: 2026-10-08. 이후 마이그레이션이 추가되면 아래 §3의 범위와 §9를 함께 갱신하세요.

---

## 0. 먼저 알아둘 것

- **코드(앱)는 안전합니다.** GitHub(`CurvinShin/joola-korea-ops-hub`)과 Vercel에 있습니다. 사라질 수 있는 건 **데이터베이스(Supabase)** 뿐입니다.
- Supabase **Free 플랜은 자동 백업이 없습니다** (유료 Pro부터 일 단위 백업). 그래서 이 문서가 "백업 대신" 역할을 합니다.
- 복구 = ① 새 Supabase 프로젝트 만들기 → ② 마이그레이션 SQL 순서대로 실행 → ③ 시드 데이터(제품·딜러·재고) 채우기 → ④ 수동 SQL 실행 → ⑤ 계정 만들기 → ⑥ Vercel 환경변수 교체 → ⑦ 사용자가 다시 주는 데이터(견적서 등) 반영 → ⑧ 검증.
- **비밀값(키·비밀번호·토큰)과 딜러 개인정보(연락처·계정 이메일)는 이 저장소에 없습니다.** 필요할 때 사용자(Curvin)가 직접 줍니다. Claude는 계정 생성·비밀번호 입력을 직접 할 수 없으니 사용자가 Supabase 대시보드에서 해야 합니다.

## 1. 시스템 구성

| 구성요소 | 위치 | 비고 |
|---|---|---|
| 앱 코드 | GitHub `CurvinShin/joola-korea-ops-hub` (main) | Next.js 14 App Router + TypeScript + Tailwind |
| 호스팅 | Vercel (`joola-korea-ops-hub.vercel.app`) | GitHub push 시 자동 배포 |
| DB / 인증 | Supabase (Postgres + Auth + RLS) | **복구 대상** |
| 설계 기록 | `ARCHITECTURE.md`, `README.md` | 구조 변경 전 참고 |

환경변수 (Vercel Project Settings → Environment Variables, 로컬은 `.env.local`). **값은 여기에 적지 않습니다.**

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase Project Settings → API → Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — 같은 화면의 anon / public key
- `SUPABASE_SERVICE_ROLE_KEY` — 같은 화면의 service_role key (서버 전용, 절대 `NEXT_PUBLIC_` 금지)
- `PUBLIC_REPORT_TOKEN` — `/public-report/[token]` 접근용 비밀값. 새로 만들면 됨: `openssl rand -base64 24` (바꾸면 기존에 공유한 URL은 무효)

## 2. 복구 순서 요약

1. 새 Supabase 프로젝트 생성 (Free 가능, 리전은 기존과 동일하게 권장)
2. 마이그레이션 `0001 → 0005` 실행 (**0002는 단독 실행**, 아래 §4)
3. 시드: 제품(766) · 딜러 · 재고 채우기 (§5) — **반드시 0006 이전**
4. 마이그레이션 `0006 → 0040` 순서대로 실행
5. 수동 SQL 실행 (`supabase/manual/`, §6)
6. 계정 만들기 + 권한 연결 (§7)
7. Vercel 환경변수 교체 후 재배포, Supabase Auth URL 설정 (§8)
8. 사용자가 다시 주는 데이터 반영 (§9)
9. 검증 체크리스트 (§10)

## 3. 마이그레이션 범위

`supabase/migrations/0001_init.sql` ~ `0040_october_quotes_2026_10_08.sql` (파일명 순서가 곧 실행 순서).

주의가 필요한 파일:

- `0001_init.sql` — 전체 테이블·뷰·RLS·`handle_new_user` 트리거(신규 가입자를 `profiles`에 `viewer`로 생성) 생성
- `0002_add_dealer_role.sql` — `app_role` enum에 `dealer` 추가. **enum 추가는 커밋된 뒤에야 쓸 수 있어서, 0003 이후와 한 번에 실행하면 오류**. 반드시 이 파일만 단독으로 Run.
- `0005_dealer_product_seed_prep.sql` — 시드용 컬럼(딜러 `kr_code`, `next_seq` 등, 제품 `product_type`) 추가. 시드는 이 뒤, 0006 앞.
- `0014`, `0028`, `0029`, `0040` — **견적서 데이터**(`dealer_quotes`, `dealer_quote_items`)가 들어 있음. `where not exists`로 보호돼 재실행해도 중복되지 않음.
- `0018` — 오더리스트 반영(제품 추가/가격 조정), `0022` — 신제품 이미지, `0035~0038` — 프로모션·공지(블랙프라이데이 2026), `0039` — 의류 상품명 정리
- 많은 마이그레이션이 `update products ...`/`update dealers ...`를 하므로, **시드(제품·딜러)가 먼저 있어야** 의미가 있습니다.
- `supabase/seed.sql`은 샘플 몇 건짜리일 뿐 **실제 시드가 아닙니다.** 실행하지 마세요.

각 파일은 Supabase 대시보드 → SQL Editor → New query에 붙여넣고 Run. 한 파일씩, 오류 없이 끝났는지 확인하고 다음으로 넘어갑니다.

## 4. 앱 코드가 기대하는 스키마 확인 방법

복구 중 의문이 생기면 코드가 진실입니다: `src/lib/actions/*.ts`(쓰기), `src/app/(app)/**/page.tsx`(읽기). 컬럼·뷰 이름은 마이그레이션 SQL에서 `grep`하세요. 배포 전 `npm run build`가 통과하는지 확인합니다.

## 5. 시드 데이터 (제품 · 딜러 · 재고)

원래 시드는 Claude가 참조 파일에서 SQL을 생성해 실행한 것이고(2026-09-16, 커밋 `eaf4750`), 그 SQL 자체는 저장소에 없습니다. 재료는 아래와 같이 보관돼 있습니다.

**제품 (766개)** — `supabase/seed-sources/joola_catalog_prices.json`
- 필드: `sku`(브랜드 상품번호), `name`(맨 앞에 SKU 포함), `mapPrice`(소비자가, KRW), `category`, `type`(`hardgoods`/`apparel`)
- 가격 계산·SKU 추출·재고 갱신 규칙은 `supabase/seed-sources/joola_pricing_stock_logic.md`에 정리돼 있고, 코드로는 `src/lib/utils/pricing.ts`, `src/lib/utils/stock-refresh.ts`(`extractLeadingCode`)가 같은 로직입니다.
- 할 일: JSON → `products` insert (SKU/name/category/product_type/MAP 기반 `unit_price`) + 각 제품의 `inventory` 행 생성. 컬럼 목록은 `0001_init.sql`과 `0005`, 이후 `alter table products add column`을 grep해서 확인.
- 이 JSON은 2026-09 시점 기준이고, 그 이후 추가·변경분은 마이그레이션 `0018`, `0022`, `0039` 등과 §6 수동 SQL이 덮어씁니다. 그러므로 **시드 → 0006~0040 → 수동 SQL** 순서를 지켜야 최신 상태가 됩니다.

**딜러** — 저장소에 없음 (연락처 개인정보 포함). **사용자가 `joola_dealers.json`(또는 동등한 정보)을 다시 줍니다.** 필드: `kr`(KR01~KR16, KR15 결번), 상호, 담당자, 배송수령인, 전화, 주소, `discount`(0~1), 결제조건, `nextSeq`/`lastSeqYear`(견적서 번호 채번), `specialNote`. 이 정보를 받아 `dealers` insert. 이후 `0020`(계약종료일 2026-12-31)·`0021`(세그먼트 컬럼, 비어 있는 상태가 정상)이 이어집니다.
- 딜러 견적서 번호 카운터(`next_seq`)는 복구 후 **가장 최근 견적서 번호와 맞춰야** 합니다 (0023, 0032 참고). 사용자에게 딜러별 마지막 견적서 번호를 확인하세요.

**재고** — 이지어드민 "현재고조회" .xls(실제는 HTML) 최신본을 사용자가 주면, 앱의 `/inventory/refresh`에서 업로드하거나(관리자 로그인 후) 같은 로직으로 SQL을 만들어 반영합니다. 기준은 `가용재고` 열입니다. 허브에 없는 SKU는 `catalog_gaps`(카탈로그 미매칭)로 쌓이며, 재고 페이지 "미매칭" 탭에서 "제품으로 등록"하면 됩니다.

## 6. 수동 SQL (`supabase/manual/`)

마이그레이션 번호가 없지만 **제품 이미지·세부분류 데이터라 git 이력만으로는 재현할 수 없는** 파일들입니다. 시드와 0006~0040이 끝난 뒤 이 순서로 실행:

1. `joola_product_image_update.sql` — 제품 이미지 URL 일괄 채움 (15개 배치, 파일 안내대로 순서대로. NULL인 값만 채우므로 재실행 안전). 마지막의 검증 쿼리도 실행.
2. `product_image_gap_fill.sql` — 남은 이미지 보강 (4개 청크, 순서 무관)
3. `product_image_gap_fill_round2.sql` — 사용자 육안 확인분 보정
4. `sling_bag_image_fix.sql` — 슬링백 두 SKU 사진 덮어쓰기 (**반드시 위 3개 뒤**)
5. `assembly_subcategory_and_barrier_swap.sql` — 어셈블리 세부분류(네트/배리어/볼캐디), 배리어 상품 교체. 위와 독립.

## 7. 계정 만들기 (사용자가 직접)

Claude는 계정 생성·비밀번호 입력을 할 수 없습니다. 사용자가 해야 하는 일:

1. Supabase → Authentication → Users → **Add user → Create new user** (Auto Confirm 체크) — 이메일/비밀번호를 사용자가 입력.
2. 가입하면 `profiles`에 `viewer`로 자동 생성됩니다. 관리자로 올리려면 SQL Editor에서:

   ```sql
   update profiles set role = 'admin'
   where id = (select id from auth.users where email = '관리자이메일');
   ```

3. **관리자 계정**: 최소 `cshin@joola.com`, 그리고 `jjeong@joola.com`.
4. **딜러 포털 계정**: 딜러별 로그인 계정을 사용자가 위 방식으로 만들고 이메일 목록을 Claude에게 알려주면, Claude가 `profiles.role = 'dealer'`와 `profiles.dealer_id`(해당 `dealers.id`)를 연결하는 SQL을 만들어 줍니다. 딜러 이메일·비밀번호 규칙은 보안상 이 저장소에 두지 않습니다 (사용자 보관분 참고).
5. 권한 모델: `app_role` = admin / sales / marketing / ecommerce / viewer / dealer. 쓰기는 `can_write()` = **admin만**. 딜러는 자기 `dealer_id`의 주문·견적만 볼 수 있음.

## 8. 배포 연결

1. 새 Supabase의 URL / anon key / service_role key를 Vercel 환경변수에 교체 (Production, 필요하면 Preview도), `PUBLIC_REPORT_TOKEN`도 확인.
2. Vercel에서 Redeploy.
3. Supabase → Authentication → URL Configuration: Site URL을 `https://joola-korea-ops-hub.vercel.app`으로, Redirect URLs에 `https://joola-korea-ops-hub.vercel.app/**` 추가 (로그인 콜백 `src/app/auth/callback`용).
4. 로컬 개발: `cp .env.example .env.local` 후 값 입력, `npm install`, `npm run dev`.

## 9. 사용자가 다시 줘야 하는 데이터 / 복구 불가 항목

**마이그레이션만으로 복구되는 것**: 테이블 구조·RLS, 견적서 요약(`dealer_quotes`)과 품목(`dealer_quote_items`)의 마이그레이션에 담긴 분량, 프로모션·공지(0035~0038), 오더리스트 반영분, 일부 앰버서더(0016의 첫 4명).

**사용자가 다시 줘야 복구되는 것**
- 딜러 정보 (JSON/엑셀) — §5
- 이번 달 이후 견적서 PDF — 마이그레이션 0041+ 로 재생성 ("이번달 견적서 반영해줘")
- 최신 재고 엑셀(이지어드민 현재고조회)
- 스마트스토어 월 정산액 (`/sales`에 수동 입력해 온 값) — 원본 정산 엑셀/수치
- 스마트스토어 주문조회 엑셀 (0031 `smartstore_order_items`용, 구매자 개인정보 컬럼 제외하고 적재)

**백업이 없으면 복구 불가능한 것** (화면에서만 입력해 온 데이터)
- 딜러 포털 주문(`dealer_orders`, `dealer_order_items`)과 상태·출고 시각
- 화면에서 수정한 제품 가격/재고/이미지/세부분류 (§6 수동 SQL에 담긴 것 제외)
- 앰버서더·시설·이벤트·업무(tasks) 중 마이그레이션에 없는 입력분
- `inventory_snapshots` 이력, 발주(`purchase_orders`) 기록
- 딜러 세그먼트(0021 이후 화면에서 하나씩 지정한 값), 계약 개별 수정분

→ 그래서 **월 1회 CSV 내보내기**를 권장합니다 (체크리스트: `docs/BACKUP_CHECKLIST.md`): Supabase → Table Editor → 해당 테이블 → Export to CSV → iCloud 등에 보관.
대상: `dealer_orders`, `dealer_order_items`, `sales_transactions`, `site_notices`, `product_promotions`, `products`, `inventory`, `dealers`, `profiles`, `ambassadors`, `facilities`, `events`, `tasks`. (CSV에는 개인정보가 있을 수 있으니 회사 외부 공유 금지.)

## 10. 검증 체크리스트

- [ ] `select count(*) from products;` ≈ 766 이상 (이후 추가분 포함), `inventory` 행 수가 products와 맞음
- [ ] `select count(*) from dealers;` = 사용자가 준 딜러 수
- [ ] `select count(*), sum(amount) from dealer_quotes;` — 이전 값과 비교 (2026-10 기준 10월 견적 7건 합계 13,186,965원 포함)
- [ ] `dealer_quote_items`에 `category`/`subcategory` 값이 채워져 있음 (제품군 분석 화면 확인)
- [ ] `select count(*) from products where image_url is null;` — 소수(수동 SQL 이후 거의 0)
- [ ] 관리자로 로그인 가능, `/dashboard`, `/inventory`(상태 탭), `/sales`(월별 딜러 매출), `/dealer-orders` 정상 표시
- [ ] 딜러 계정으로 로그인 시 자기 주문만 보임
- [ ] `/public-report/<토큰>` 접근 가능
- [ ] `npm run build` 통과

## 11. 새 Claude 세션용 시작 프롬프트

```
joola-korea-ops-hub 프로젝트 폴더의 docs/RESTORE.md를 읽고, Supabase DB를 새로 만든 상태에서
복구를 진행해줘. 한국어로 답해줘.
- 비밀값(키·비밀번호)과 딜러 개인정보는 내가 직접 줄게. 저장소에 쓰지 마.
- 계정 생성은 내가 Supabase에서 할게. 너는 role/dealer_id 연결 SQL만 만들어줘.
- SQL은 한 파일씩 순서대로(0002는 단독) 알려주고, 내가 실행 결과를 알려주면 다음으로 가자.
- 커밋은 내가 "커밋해주세요"라고 할 때만 해.
```

## 12. 앞으로 지켜야 할 운영 원칙

- **DB를 바꾸는 모든 작업은 마이그레이션 파일로 남깁니다** (`supabase/migrations/00NN_*.sql`, git 커밋). Supabase SQL Editor에서 임시로 실행한 SQL도 파일로 저장해야 복구가 가능합니다.
- 번호 없는 일회성 SQL(이미지 보강 등)은 `supabase/manual/`에 두고, 이 문서 §6에 실행 순서를 추가합니다.
- 비밀번호·계정 이메일·딜러 연락처가 든 파일은 저장소에 넣지 않습니다 (`Claude outputs/`는 `.gitignore`).
- 매월 견적서 반영 후 마이그레이션 번호가 늘면 §3 범위(0040 → 새 번호)와 §10 숫자를 갱신합니다.
- 중요한 건 월 1회 CSV 내보내기 — 복구 불가능 항목(§9)의 유일한 방어선입니다. Supabase Pro로 올리면 자동 백업이 생기지만 현재는 Free 유지 중입니다.

-- =========================================================================
-- 3S Dual 5종 소비자가 299,000원으로 바로잡기 (2026-11-06)
--
-- 가격표(2026.11.06)와 Hub 모두 319,000원으로 되어 있었으나 299,000원이 맞다.
-- 딜러가는 앱이 소비자가에서 계산한다(부가세 10% 미포함, 100원 반올림):
--   35% 딜러 176,700원 / 30% 딜러 190,300원 / 데모 95,100원
-- 가격표 35%·30% 파일(2026.11.06)도 같은 값으로 고쳤다.
-- 되돌리려면: update products p set unit_price = b.unit_price
--             from price_backup_20261106_3s_dual b where b.sku = p.sku;
-- =========================================================================

create table if not exists price_backup_20261106_3s_dual as
  select sku, unit_price, now() as backed_up_at
  from products
  where sku in ('600119', '600121', '600123', '600127', '600135');
alter table price_backup_20261106_3s_dual enable row level security;

update products
set unit_price = 299000
where sku in ('600119', '600121', '600123', '600127', '600135');

-- 검산 — 5건이 모두 299000이고 고정가(fixed_dealer_price)는 비어 있어야 정상입니다.
select sku, name, unit_price, fixed_dealer_price
from products
where sku in ('600119', '600121', '600123', '600127', '600135')
order by sku;

-- 2026-11-17 블랙프라이데이 주문 2건을 실제 견적서 내용으로 정정한다.
--   KR13-2619 (피스스포츠코리아)  견적서 합계 2,352,900원 (부가세·배송비 포함)
--   KR10-2664 (피앤피노)          견적서 합계 3,962,090원 (부가세·배송비 포함)
--
-- 하는 일: 오늘(11/17) 들어온, 아직 입금 확인 전(draft, 재고 차감 전)인 두 딜러의 주문 품목을
--   견적서 품목·수량·단가(공급가액, BF 가격)로 통째로 교체하고, 주문 합계와 자동 배송비(2박스 11,000원)를 맞춘다.
-- 안전장치: 전체가 DO 블록 하나(=한 번에 성공하거나 전부 취소)로 실행된다.
--   · 두 딜러 모두 "오늘 입금 전 주문"이 정확히 1건이 아니면 중단한다.
--   · 품목 수(22줄)나 합계가 견적서와 다르면 전체를 취소한다.
--   · 바꾸기 전 품목·주문 헤더는 dealer_order_items_bak_20261117 / dealer_orders_bak_20261117 에 복사해 둔다.
-- 주문번호·확정총액·상태는 건드리지 않는다. 입금 확인 때 확정총액만 견적서 합계로 넣으면 된다.
-- (v1은 임시 테이블을 써서 Supabase SQL Editor에서 "_t_orders does not exist" 오류가 났다 → 임시 테이블 없이 다시 작성)

do $$
declare
  v13 uuid[];
  v10 uuid[];
  id13 uuid;
  id10 uuid;
  n_items int;
  t13 numeric;
  t10 numeric;
begin
  select array_agg(o.id) into v13
  from dealer_orders o join dealers d on d.id = o.dealer_id
  where d.kr_code = 'KR13' and o.order_date = date '2026-11-17' and o.status = 'draft' and not o.stock_deducted;

  select array_agg(o.id) into v10
  from dealer_orders o join dealers d on d.id = o.dealer_id
  where d.kr_code = 'KR10' and o.order_date = date '2026-11-17' and o.status = 'draft' and not o.stock_deducted;

  if coalesce(array_length(v13, 1), 0) <> 1 then
    raise exception 'KR13 의 오늘(11/17) 입금 전 주문이 %건입니다(1건이어야 함). 중단합니다.', coalesce(array_length(v13, 1), 0);
  end if;
  if coalesce(array_length(v10, 1), 0) <> 1 then
    raise exception 'KR10 의 오늘(11/17) 입금 전 주문이 %건입니다(1건이어야 함). 중단합니다.', coalesce(array_length(v10, 1), 0);
  end if;
  id13 := v13[1];
  id10 := v10[1];

  -- 백업 (바꾸기 전 모습). 이미 백업된 주문은 다시 덮지 않는다.
  create table if not exists dealer_order_items_bak_20261117 as
    select i.*, now() as backed_up_at from dealer_order_items i where false;
  create table if not exists dealer_orders_bak_20261117 as
    select o.*, now() as backed_up_at from dealer_orders o where false;
  alter table dealer_order_items_bak_20261117 enable row level security;
  alter table dealer_orders_bak_20261117 enable row level security;

  insert into dealer_order_items_bak_20261117
    select i.*, now() from dealer_order_items i
    where i.order_id in (id13, id10)
      and not exists (select 1 from dealer_order_items_bak_20261117 b where b.order_id = i.order_id);
  insert into dealer_orders_bak_20261117
    select o.*, now() from dealer_orders o
    where o.id in (id13, id10)
      and not exists (select 1 from dealer_orders_bak_20261117 b where b.id = o.id);

  -- 품목 교체 (단가는 견적서의 공급가액)
  delete from dealer_order_items where order_id in (id13, id10);

  insert into dealer_order_items (order_id, product_id, quantity, unit_price, is_demo)
  select case v.kr when 'KR13' then id13 else id10 end, p.id, v.qty, v.price, v.demo
  from (values
    ('KR13', '600589', 2, 193600, false),
    ('KR13', '600592', 2, 193600, false),
    ('KR13', '600595', 1, 193600, false),
    ('KR13', '600577', 1, 193600, false),
    ('KR13', '600568', 1, 193600, false),
    ('KR13', '600571', 1, 193600, false),
    ('KR13', '300834', 2,  96700, false),
    ('KR13', '300816', 2,  96700, false),
    ('KR13', '300813', 1,  96700, false),
    ('KR13', '300822', 1,  96700, false),
    ('KR10', '300822', 3,  96700, false),
    ('KR10', '600577', 3, 193600, false),
    ('KR10', '600592', 3, 193600, false),
    ('KR10', '600562', 1, 193600, false),
    ('KR10', '600568', 3, 193600, false),
    ('KR10', '600571', 3, 193600, false),
    ('KR10', '600574', 1, 193600, false),
    ('KR10', '600305', 10, 18900, false),
    ('KR10', '600305', 1,  10100, true),
    ('KR10', '600304', 10, 18900, false),
    ('KR10', '600304', 1,  10100, true),
    ('KR10', '600880', 3,  64400, false)
  ) as v(kr, sku, qty, price, demo)
  join products p on p.sku = v.sku;

  select count(*) into n_items from dealer_order_items where order_id in (id13, id10);
  if n_items <> 22 then
    raise exception '넣은 품목이 %줄입니다(22줄이어야 함). 상품 목록에 없는 SKU가 있는 것 같아 전체를 취소합니다.', n_items;
  end if;

  -- 주문 합계(공급가액) + 자동 배송비(패들 14개/17개 모두 2박스 x 5,500 = 11,000원, 견적서 배송비 행과 같음)
  update dealer_orders o
  set total_amount = (select sum(i.quantity * i.unit_price) from dealer_order_items i where i.order_id = o.id),
      auto_shipping_boxes = 2,
      auto_shipping_fee = 11000,
      order_type = 'regular'
  where o.id in (id13, id10);

  select total_amount into t13 from dealer_orders where id = id13;
  select total_amount into t10 from dealer_orders where id = id10;
  if t13 <> 2129000 or t10 <> 3591900 then
    raise exception '합계가 견적서와 다릅니다(KR13=%, KR10=%). 전체를 취소합니다.', t13, t10;
  end if;
end $$;

-- 검산 1) 주문별 합계 (KR13 2,352,900 / KR10 3,962,090 이어야 함)
select d.kr_code, d.name, o.order_number, o.status,
       o.total_amount as 공급가액,
       o.auto_shipping_fee as 배송비,
       round(o.total_amount * 1.1) + o.auto_shipping_fee as 부가세_배송비_포함_합계,
       (select count(*) from dealer_order_items i where i.order_id = o.id) as 품목수,
       (select sum(quantity) from dealer_order_items i where i.order_id = o.id) as 총수량
from dealer_orders o
join dealers d on d.id = o.dealer_id
where d.kr_code in ('KR13', 'KR10') and o.order_date = date '2026-11-17' and o.status = 'draft'
order by d.kr_code;

-- 검산 2) 품목 확인
select d.kr_code, p.sku, p.name, i.quantity, i.unit_price, i.is_demo
from dealer_order_items i
join dealer_orders o on o.id = i.order_id
join dealers d on d.id = o.dealer_id
join products p on p.id = i.product_id
where d.kr_code in ('KR13', 'KR10') and o.order_date = date '2026-11-17' and o.status = 'draft'
order by d.kr_code, p.sku, i.is_demo;

-- 되돌리기(필요할 때만): 백업 테이블에서 복원
--   delete from dealer_order_items where order_id in (select id from dealer_orders_bak_20261117);
--   insert into dealer_order_items (id, order_id, product_id, quantity, unit_price, is_demo)
--     select id, order_id, product_id, quantity, unit_price, is_demo from dealer_order_items_bak_20261117;
--   update dealer_orders o set total_amount = b.total_amount, auto_shipping_boxes = b.auto_shipping_boxes,
--     auto_shipping_fee = b.auto_shipping_fee from dealer_orders_bak_20261117 b where o.id = b.id;

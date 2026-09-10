-- Optional sample data for local testing only.
-- Run manually in the Supabase SQL editor if you want to see the dashboard
-- populated before you start entering real data. Safe to skip entirely.

insert into products (sku, name, category, unit_cost, unit_price) values
  ('JL-PADDLE-VISION', 'JOOLA Vision Paddle', 'Paddle', 65000, 129000),
  ('JL-BALL-OUTDOOR40', 'JOOLA Outdoor 40 Ball (6pk)', 'Balls', 8000, 18000),
  ('JL-BAG-TOUR', 'JOOLA Tour Bag', 'Accessories', 32000, 69000)
on conflict (sku) do nothing;

insert into inventory (product_id, current_stock, reserved_stock, incoming_qty, eta, low_stock_threshold)
select id, 40, 5, 100, current_date + interval '21 days', 15 from products where sku = 'JL-PADDLE-VISION'
union all
select id, 300, 20, 0, null, 50 from products where sku = 'JL-BALL-OUTDOOR40'
union all
select id, 8, 0, 0, null, 10 from products where sku = 'JL-BAG-TOUR'
on conflict (product_id) do nothing;

insert into dealers (name, classification, status, contact_name, contact_email, region, discount_rate, moq_target)
values
  ('Seoul Pickleball House', 'flagship', 'active', 'Ji-hoon Park', 'jihoon@spbh.kr', 'Seoul', 20, 50000000),
  ('Busan Racquet Co.', 'standard', 'active', 'Min-jun Lee', 'minjun@busanracquet.kr', 'Busan', 15, 20000000)
on conflict do nothing;

insert into events (name, event_date, location, organizer, budget, expected_participants)
values ('JOOLA Korea Open 2026', current_date + interval '45 days', 'Goyang, Gyeonggi-do', 'JOOLA Korea', 15000000, 200)
on conflict do nothing;

insert into tasks (title, category, priority, status, due_date)
values
  ('Confirm Q4 dealer discount renewals', 'dealer', 'high', 'open', current_date + interval '7 days'),
  ('Follow up on customs clearance for PO-1042', 'purchase_order', 'urgent', 'in_progress', current_date + interval '2 days')
on conflict do nothing;

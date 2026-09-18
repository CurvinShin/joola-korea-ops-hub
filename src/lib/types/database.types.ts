/**
 * Hand-written types for the tables/views the MVP UI actually queries.
 *
 * This file is a stand-in for the real thing. Once your Supabase project
 * exists, regenerate it from the live schema so it always matches reality:
 *
 *   npx supabase gen types typescript --project-id <your-project-ref> > src/lib/types/database.types.ts
 *
 * See README.md "Keeping types in sync" for details.
 */

export type AppRole = "admin" | "sales" | "marketing" | "ecommerce" | "viewer" | "dealer";
export type DealerStatus = "active" | "pending" | "inactive" | "terminated";
export type DealerClassification = "flagship" | "standard" | "online_only" | "distributor";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "open" | "in_progress" | "blocked" | "done";
export type TaskCategory =
  | "dealer"
  | "inventory"
  | "sales"
  | "purchase_order"
  | "event"
  | "facility"
  | "ambassador"
  | "marketing"
  | "general";
export type ShippingStatus = "not_shipped" | "in_transit" | "arrived_port" | "cleared_customs" | "delivered";
export type CustomsStatus = "not_started" | "in_progress" | "cleared" | "held";
export type PartnershipStatus = "prospect" | "in_discussion" | "active" | "ended";
// South Korea's 17 first-level administrative divisions (시/도), used to
// place each facility on the region map. English keys map to Korean short
// names in lib/utils/labels.ts (krRegionLabel).
export type KrRegion =
  | "seoul"
  | "incheon"
  | "gyeonggi"
  | "gangwon"
  | "chungbuk"
  | "chungnam"
  | "daejeon"
  | "sejong"
  | "jeonbuk"
  | "jeonnam"
  | "gwangju"
  | "gyeongbuk"
  | "daegu"
  | "gyeongnam"
  | "busan"
  | "ulsan"
  | "jeju";

export type AmbassadorType = "player" | "ambassador" | "influencer" | "junior" | "creator";
export type ContractStatus = "prospect" | "negotiating" | "active" | "expired" | "ended";

export interface Profile {
  id: string;
  full_name: string | null;
  role: AppRole;
  dealer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Dealer {
  id: string;
  name: string;
  classification: DealerClassification;
  status: DealerStatus;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  region: string | null;
  contract_start: string | null;
  contract_end: string | null;
  discount_rate: number;
  moq_target: number;
  outstanding_issues: string | null;
  notes: string | null;
  address: string | null;
  ship_recipient: string | null;
  payment_terms: string | null;
  kr_code: string | null;
  next_seq: number;
  last_seq_year: string | null;
  ytd_quote_amount: number | null;
  mtd_quote_amount: number | null;
  quote_amount_as_of: string | null;
  // JOOLA HQ APAC 딜러 세그멘테이션 (Category/Sub Category/Sub Detail).
  // 화면상 "구분" 표시는 이 세 필드 기준 — see lib/utils/dealerSegments.ts.
  segment_category: string | null;
  segment_subcategory: string | null;
  segment_detail: string | null;
  created_at: string;
  updated_at: string;
}

export type ProductType = "hardgoods" | "apparel";

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  image_url: string | null;
  unit_cost: number | null;
  unit_price: number | null;
  product_type: ProductType;
  // Flat dealer supply price that overrides the hardgoods/apparel formula
  // for regular orders (e.g. team socks sold at an agreed flat price).
  // Demo purchases ignore this and always use the 65%-off-MSRP formula.
  fixed_dealer_price: number | null;
  // Some paddles ship with a separate dedicated "demo" SKU from JOOLA
  // instead of relying on the app's own demo-purchase checkbox (e.g. a
  // regular retail SKU + a "(Demo)" SKU at the same MAP price). For those,
  // set this to false on BOTH SKUs so a dealer can't double up: check the
  // demo box on the retail SKU, or check it again on the SKU that's
  // already priced as a demo. Defaults to true for every other product.
  demo_purchase_allowed: boolean;
  discontinued: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryStatusRow {
  product_id: string;
  sku: string;
  name: string;
  category: string | null;
  subcategory: string | null;
  image_url: string | null;
  discontinued: boolean;
  current_stock: number;
  reserved_stock: number;
  available_stock: number;
  incoming_qty: number;
  eta: string | null;
  low_stock_threshold: number;
  is_low_stock: boolean;
  product_type: ProductType;
  fixed_dealer_price: number | null;
  demo_purchase_allowed: boolean;
  // Set to a date to pin this product in the "신제품" section at the top of
  // /inventory. Only products whose new_arrival_batch equals the MOST
  // RECENT such date across all products are shown — so the next batch of
  // new products automatically retires the previous one, no manual cleanup.
  new_arrival_batch: string | null;
}

// Row shape of the `dealer_catalog` view — what a dealer-portal login is
// allowed to see: list price + available stock, never our unit_cost.
export interface DealerCatalogRow {
  product_id: string;
  sku: string;
  name: string;
  category: string | null;
  subcategory: string | null;
  image_url: string | null;
  unit_price: number | null;
  available_stock: number;
  product_type: ProductType;
  fixed_dealer_price: number | null;
  demo_purchase_allowed: boolean;
}

export interface DealerOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  is_demo: boolean;
}

export interface EventRow {
  id: string;
  name: string;
  event_date: string;
  location: string | null;
  organizer: string | null;
  budget: number | null;
  expected_participants: number | null;
  actual_participants: number | null;
  onsite_sales: number | null;
  sponsorship_details: string | null;
  notes: string | null;
  post_event_report: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  related_dealer_id: string | null;
  related_event_id: string | null;
  related_product_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type DealerOrderType = "regular" | "demo";

export interface DealerOrder {
  id: string;
  dealer_id: string;
  order_date: string;
  status: "draft" | "confirmed" | "shipped" | "delivered" | "cancelled";
  order_type: DealerOrderType;
  synced_to_accounting: boolean;
  total_amount: number;
  stock_deducted: boolean;
  auto_shipping_boxes: number;
  auto_shipping_fee: number;
  manual_shipping_fee: number | null;
  confirmed_total_amount: number | null;
  order_number: string | null;
  payment_confirmed_at: string | null;
  payment_confirmed_by: string | null;
  notes: string | null;
  created_at: string;
}

// Row shape used by the admin "딜러 주문" review page — a dealer_orders row
// with its dealer name and line items embedded via Supabase's FK joins.
export interface DealerOrderAdminRow {
  id: string;
  order_date: string;
  status: "draft" | "confirmed" | "shipped" | "delivered" | "cancelled";
  order_type: DealerOrderType;
  synced_to_accounting: boolean;
  total_amount: number;
  auto_shipping_boxes: number;
  auto_shipping_fee: number;
  manual_shipping_fee: number | null;
  confirmed_total_amount: number | null;
  order_number: string | null;
  stock_deducted: boolean;
  dealers: {
    name: string;
    address: string | null;
    ship_recipient: string | null;
    payment_terms: string | null;
    contact_phone: string | null;
  } | null;
  dealer_order_items: {
    quantity: number;
    unit_price: number;
    is_demo: boolean;
    products: { name: string; sku: string } | null;
  }[];
}

// A stock item from the periodic 실사 (physical count) snapshot that could
// not be matched to a joola_catalog_prices.json entry (no brand SKU match,
// or no price/type on file) — so it was never turned into a `products` row.
// Surfaced on an admin-only "카탈로그 미매칭 재고" page so gaps can be filled
// in over time without losing track of what's still missing.
export interface CatalogGap {
  id: string;
  source_sku: string | null;
  source_name: string;
  qty: number;
  note: string | null;
  created_at: string;
}

export interface InventorySnapshot {
  id: string;
  filename: string;
  snapshot_at: string;
  uploaded_by: string | null;
  total_rows: number;
  matched_count: number;
  gap_updated_count: number;
  gap_new_count: number;
  created_at: string;
}

// Row shape of `dealer_quotes` — one row per 견적서 PDF (see migration 0014),
// used to show a per-quote breakdown (order no · date · amount · 결제조건)
// underneath the aggregate ytd/mtd_quote_amount numbers on `dealers.*`.
export interface DealerQuote {
  id: string;
  kr_code: string;
  order_no: string;
  quote_date: string;
  amount: number;
  payment_terms: string | null;
  source_file: string;
  created_at: string;
}

export interface Facility {
  id: string;
  name: string;
  location: string | null;
  address: string | null;
  region: KrRegion | null;
  representative_name: string | null;
  instagram_handle: string | null;
  courts_count: number | null;
  partnership_status: PartnershipStatus;
  branding_installed: boolean;
  demo_paddles_provided: boolean;
  product_display: boolean;
  sponsorship_details: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ambassador {
  id: string;
  name: string;
  type: AmbassadorType;
  contract_status: ContractStatus;
  contract_start: string | null;
  contract_end: string | null;
  compensation: string | null;
  equipment_support: string | null;
  kpi: string | null;
  social_media_handle: string | null;
  content_obligations: string | null;
  performance_notes: string | null;
  email: string | null;
  phone: string | null;
  main_paddle: string | null;
  dupr_rating: number | null;
  birth_date: string | null;
  gender: string | null;
  affiliation: string | null;
  shipping_address: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier: string;
  order_date: string;
  eta: string | null;
  shipping_status: ShippingStatus;
  customs_status: CustomsStatus;
  received: boolean;
  total_cost: number;
  notes: string | null;
  created_at: string;
}

// Note: there is deliberately no `Database` wrapper type here. supabase-js's
// query-builder generics need an exact shape (Row/Insert/Update/Relationships
// for every table) to infer `.from("table").select()` results — a hand-typed
// approximation resolves to `never` and produces confusing errors instead of
// useful ones. The Supabase clients in lib/supabase are untyped for now;
// use the row types above to type your own component props and variables,
// and swap in the real generated Database type (see README "Keeping types in
// sync") once your Supabase project exists.

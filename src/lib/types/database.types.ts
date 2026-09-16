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
  discontinued: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryStatusRow {
  product_id: string;
  sku: string;
  name: string;
  category: string | null;
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
}

// Row shape of the `dealer_catalog` view — what a dealer-portal login is
// allowed to see: list price + available stock, never our unit_cost.
export interface DealerCatalogRow {
  product_id: string;
  sku: string;
  name: string;
  category: string | null;
  image_url: string | null;
  unit_price: number | null;
  available_stock: number;
  product_type: ProductType;
}

export interface DealerOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
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
  dealers: { name: string } | null;
  dealer_order_items: { quantity: number; unit_price: number; products: { name: string; sku: string } | null }[];
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

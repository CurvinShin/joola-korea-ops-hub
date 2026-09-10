# Architecture — JOOLA Korea Operations Hub

This document is the analysis and design record for the app: why this stack, how the
data is modeled, what's in the MVP vs. Phase 2, and what to watch out for security-wise.
Read this before making structural changes.

## 1. Why this stack

**Next.js 14 (App Router) + TypeScript + Tailwind CSS + Supabase (Postgres).**

- **Supabase = managed Postgres + auth + auto-generated REST/JS API + row-level
  security.** For a solo-admin internal tool that needs to become multi-user and
  multi-integration later, a real relational database beats Airtable/Sheets-as-a-database
  because: relationships (a dealer has many orders; a product has one inventory row)
  are enforced by the database, not by spreadsheet formulas; Row Level Security (RLS)
  lets you add "Sales can edit, Marketing can only view" rules later without rewriting
  the app; and every future integration (Google Sheets sync, e-commerce webhook,
  inventory system) is just another process writing to the same tables — the dashboard
  doesn't need to know or care where a row came from.
- **Next.js App Router with Server Components + Server Actions** means most pages
  never ship a data-fetching API layer of their own: a page component queries Supabase
  directly on the server and renders HTML, and forms call a `"use server"` function
  directly instead of you hand-building `/api/dealers` POST/PUT/DELETE routes. Less
  code to maintain, and there's no separate API key or CORS story to worry about.
- **Tailwind CSS** keeps styling co-located with markup and avoids a separate CSS
  file per component — reasonable for someone maintaining this without a design system
  team.
- **Vercel** is the natural host for Next.js (built by the same team, zero-config
  deploys from GitHub, generous free tier for a single internal user).

**Alternative considered:** a Google Sheets-backed app (e.g. Sheets + Apps Script, or
Sheets as a "database" behind a thin API). Rejected because you explicitly want to move
*away* from a spreadsheet-shaped tool, Sheets has no real relational integrity or
row-level access control, and it becomes a bottleneck once more than one system needs
to write to it concurrently. Google Sheets instead becomes an **input/import source**
(Phase 2), not the system of record.

## 2. Information architecture

```
Login (email + password, Supabase Auth)
 └─ App shell (sidebar + topbar, auth-protected by middleware)
     ├─ Dashboard              [MVP]
     ├─ Dealers                [MVP]  → Dealer detail (order history, MOQ progress)
     ├─ Inventory              [MVP]
     ├─ Purchase Orders/Import [Phase 2]
     ├─ Sales                  [Phase 2]
     ├─ Events                 [MVP]
     ├─ Facilities             [Phase 2]
     ├─ Ambassadors            [Phase 2]
     ├─ Marketing              [Phase 2]
     └─ Tasks                  [MVP]
```

Every module (including Phase 2 ones) is reachable from the sidebar from day one —
Phase 2 items are visibly marked "soon" and link to a placeholder page — so the app's
final shape is visible immediately and adding a module later means building one page,
not restructuring navigation.

## 3. Database schema

Full DDL lives in `supabase/migrations/0001_init.sql`. Summary of tables (grouped by
module) and how they relate:

| Table | Purpose | Key relationships |
|---|---|---|
| `profiles` | One row per login, holds `role` (admin/sales/marketing/ecommerce/viewer) | `id` = `auth.users.id` |
| `dealers` | Dealer Management module | referenced by orders, demand, tasks |
| `products` | Master product/SKU list | referenced by inventory, orders, POs, sales, marketing |
| `inventory` | Stock levels per product (1:1 with `products`) | `product_id` → `products` |
| `inventory_status` | **View**, not a table — joins products+inventory and computes `available_stock` and `is_low_stock` so that math lives in one place | reads `products`, `inventory` |
| `dealer_product_demand` | What each dealer says they want, for demand-vs-stock comparisons | `dealer_id`, `product_id` |
| `dealer_orders` / `dealer_order_items` | Dealer order history, feeds YTD purchase amount | `dealer_id`, `product_id` |
| `sales_transactions` | Unified sales feed across dealer/e-commerce/event channels (for the Sales module's rollups) | optional `product_id`, `dealer_id`, `event_id` |
| `sales_targets` | Monthly target per channel (or overall) | — |
| `purchase_orders` / `purchase_order_items` | Import/PO tracking | `product_id` |
| `events` | Events module | referenced by tasks, sponsorships, sales |
| `event_product_sponsorships` | Which products were sponsored at which event | `event_id`, `product_id` |
| `facilities` | Facility/brand partnerships | — |
| `ambassadors` | Players/ambassadors/influencers | — |
| `marketing_campaigns` | Marketing/social content pipeline | optional `product_id` |
| `tasks` | Cross-module task list | optional `related_dealer_id`, `related_event_id`, `related_product_id` |

**Design choices worth calling out:**

- `available_stock` is **never stored** — it's `current_stock - reserved_stock`,
  computed in the `inventory_status` view. Storing a derived number invites it to
  drift out of sync with reality; a view can't.
- Every table uses a `uuid` primary key (`gen_random_uuid()`), not an auto-increment
  integer, so that rows created by future external integrations (an e-commerce
  webhook, an import script) never collide with rows created in the app.
- `sales_transactions.channel` (`dealer` / `ecommerce` / `event`) is one unified table
  rather than three separate ones, because the Sales module's "monthly sales overview"
  and "YTD performance" need to sum across all channels — one table means one `GROUP
  BY`, not three queries stitched together in application code.
- All 10 modules' tables exist in this one migration, even though the MVP UI only
  covers five of them. This is the single most important decision for avoiding a
  Phase 2 rewrite: the schema is designed against the full spec up front, so adding a
  Sales or Marketing screen later is "write a page that queries an existing table," not
  "redesign the data model."

## 4. Authentication & authorization

- **Supabase Auth**, email + password. No public sign-up route exists in this app —
  accounts are created by you (the admin) directly in the Supabase dashboard
  (Authentication → Users → Add user). This is intentional: the org requirement is
  "no public data exposure," and the simplest way to guarantee that for a one-person
  tool is to not build a self-serve sign-up flow at all.
- A Postgres trigger (`handle_new_user`) auto-creates a matching row in `profiles`
  whenever a new `auth.users` row appears, defaulted to the `viewer` role. **You must
  manually promote your own first account to `admin`** (one SQL statement — see
  README) after creating it, or you won't be able to write any data.
- `middleware.ts` runs on every request and redirects anyone without a valid session
  to `/login`. There is no page-by-page "am I logged in?" check to forget to add.
- Every table has Row Level Security enabled. The current policy is deliberately
  uniform and simple: **any authenticated user can read, only `role = 'admin'` can
  write.** This is not a limitation you'll hit soon — it's the correct MVP choice
  when there's exactly one user, and it's also the reason adding a second admin, or a
  `sales` role that can write to `dealers` but not `marketing_campaigns`, is a policy
  change (`ALTER POLICY` / new `CREATE POLICY`), not an application rewrite. The
  `can_write()` SQL function is the one place that logic lives — change it once, it
  applies everywhere.

## 5. Folder structure

```
joola-ops-hub/
├── supabase/
│   ├── migrations/0001_init.sql   # full schema + RLS, run once per environment
│   └── seed.sql                   # optional sample data for testing
├── src/
│   ├── middleware.ts              # auth gate, runs on every request
│   ├── app/
│   │   ├── layout.tsx, page.tsx   # root layout, redirects to /dashboard
│   │   ├── globals.css
│   │   ├── login/page.tsx
│   │   ├── auth/callback/route.ts # Supabase auth redirect handler
│   │   └── (app)/                 # route group = shared sidebar/topbar layout
│   │       ├── layout.tsx
│   │       ├── dashboard/page.tsx
│   │       ├── dealers/page.tsx, dealers/[id]/page.tsx
│   │       ├── inventory/page.tsx
│   │       ├── events/page.tsx
│   │       ├── tasks/page.tsx
│   │       └── sales|purchase-orders|facilities|ambassadors|marketing/page.tsx  (Phase 2 placeholders)
│   ├── components/
│   │   ├── ui/                    # Button, Card, Badge, Input, Table, Modal — generic, reusable everywhere
│   │   ├── layout/                # Sidebar, Topbar, ComingSoon
│   │   └── dashboard|dealers|inventory|events|tasks/  # module-specific components (forms, widgets)
│   └── lib/
│       ├── supabase/client.ts, server.ts   # the only two places Supabase clients are constructed
│       ├── actions/                        # Server Actions = all business logic / writes, one file per module
│       ├── types/database.types.ts         # hand-written row types (see README to regenerate properly)
│       └── utils/cn.ts
├── .env.example
├── package.json
├── README.md
└── ARCHITECTURE.md
```

**The rule this structure enforces:** UI components never call Supabase directly for
writes — they call a function from `lib/actions/*`. That's "business logic separate
from UI components": if a validation rule changes (e.g. discount rate must be ≤ 30%
for non-flagship dealers), there is exactly one file to edit, and it's not a `.tsx`
file.

## 6. MVP vs. Phase 2

**MVP (built now):** Authentication, Dashboard, Dealers (full CRUD + detail page with
order history and MOQ progress), Inventory (full CRUD, low-stock badges), Events (full
CRUD), Tasks (full CRUD with inline status change and filters).

**Phase 2 (schema exists, UI is a placeholder):** Sales (rollup reporting across
channels — needs real transaction data flowing in first), Purchase Orders/Import,
Facilities, Ambassadors, Marketing. Also Phase 2: CSV/Excel import, Google Sheets
sync, e-commerce/webhook integrations, and expanding the single-admin role model into
real per-role UI (e.g. hiding write buttons for `viewer` accounts — the *database*
already refuses their writes today, but the UI doesn't yet hide the buttons that would
fail).

**Why this split:** the five MVP modules are the ones you listed as top priority, and
they're also the ones that don't depend on another module's data existing yet
(Sales needs transaction volume; Marketing needs a content pipeline). Dealers,
Inventory, Events, and Tasks are useful standalone from day one.

## 7. Security risks & mitigations

| Risk | Mitigation |
|---|---|
| Service-role key leaking into the browser bundle | Only `NEXT_PUBLIC_*` vars ship to the client; the service-role key is never referenced in any file under `src/` and is only used for admin scripts run by you locally |
| Someone finds the URL and sees business data | Middleware blocks every route except `/login` for unauthenticated requests; Postgres RLS blocks every table read/write for unauthenticated requests even if middleware were somehow bypassed (defense in depth) |
| A future non-admin role writing data it shouldn't | Enforced in Postgres via RLS (`can_write()`), not just hidden in the UI — even a direct API call can't bypass it |
| Public search-engine indexing of an internal tool | `robots: { index: false, follow: false }` set in the root layout metadata |
| SQL injection / malformed input | All writes go through the Supabase JS client (parameterized queries) and `zod` schema validation in `lib/actions/*` before hitting the database |
| Accidental data loss from a bad `DELETE` | Out of scope for MVP — Supabase's daily backups (even on the free tier, short retention) are your safety net; if this becomes critical, enable Point-in-Time Recovery on a paid Supabase plan |
| Committing `.env.local` with real keys | `.gitignore` excludes all `.env*.local` files; `.env.example` has placeholders only |

## 8. Integrations that will need API credentials (Phase 2)

None of these are wired up yet — they're the reason the schema and action-layer
separation exist. When you get here, each needs its own credential, stored as an
environment variable, never in code:

- **Google Sheets sync** — a Google Cloud service account with Sheets API access
  (JSON key), or Google OAuth if syncing a personal sheet.
- **CSV/Excel import** — no external credential needed; it's a file upload parsed
  server-side, but the endpoint needs auth + row-count limits to avoid abuse.
- **E-commerce platform sales import** (e.g. Cafe24, Naver Smartstore) — each
  platform's own API key/secret; typically also needs a webhook signing secret to
  verify incoming order events are genuine.
- **Inventory system sync** — API key/token for whatever system you're on; if it only
  supports webhooks, you'll need a public endpoint (a Next.js Route Handler) with
  signature verification.
- **Generic REST/webhook automation** (e.g. via Zapier/Make) — a dedicated
  service-role-scoped API key you generate for that automation only, not your personal
  login, so it can be revoked independently.

Each of these is additive: it writes into the same tables the UI already reads from,
so the dashboard updates automatically without any UI changes on the day you turn one
on.

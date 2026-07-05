# SignGuy AI — Webstores Spec Sheet
> **Source:** Generated directly from production codebase (backend + frontend audit, June 2026)
> **Purpose:** Complete behavioral specification for the Webstores system as it actually exists.

---

## 1. Overview

The Webstores system allows a sign shop (tenant) to create and manage online storefronts on behalf of clients — organizations, creators, teams, and event organizers. Each webstore is a separate public-facing store with its own URL, product catalog, checkout, and owner.

**Core collections:**
- `webstores_v2` — store records
- `webstore_products` — product assignments per store
- `webstore_orders_v2` — customer checkout orders
- `webstore_stage_events` — immutable audit trail of stage changes
- `questionnaires` — setup questionnaires per store

---

## 2. Store Types (4 total)

| Type | Value | Description |
|---|---|---|
| **Business** | `business` | B2B or wholesale store for corporate clients |
| **Fundraiser** | `fundraiser` | Fundraising store with goal tracking and profit allocation |
| **Creator** | `creator` | Individual artist/designer store with Stripe Connect commission payouts |
| **Event** | `event` | Event-specific store with dates, deadlines, and embedded fundraiser capabilities |

> **Note:** Event stores have the richest feature set — they embed full fundraiser capabilities as a configurable sub-feature.

---

## 3. Store Status Lifecycle

```
pending → active → completed
                 → closed
```

| Status | Value | Meaning |
|---|---|---|
| Pending | `pending` | Store being set up — not yet public |
| Active | `active` | Store is live and taking orders |
| Completed | `completed` | Admin closed the store post-production (end of lifecycle) |
| Closed | `closed` | Owner-initiated close (e.g., fundraiser ended, event over) |
| Disabled | `disabled` | Temporarily deactivated by admin |

---

## 4. The 15-Stage Setup Lifecycle

Every store progresses through 15 ordered stages. Each stage is computed from live data (not manually set) except for the 5 timestamp stamps set by the admin.

| # | Stage Key | Label | How It's Determined |
|---|---|---|---|
| 1 | `setup_received` | Store setup received | Store record exists — always true |
| 2 | `questionnaire_submitted` | Questionnaire submitted | `response_count > 0` on questionnaire |
| 3 | `waiting_artwork` | Waiting on logo / artwork | `branding.logo_url` is set |
| 4 | `store_being_built` | Store being built | Has products OR storefront published |
| 5 | `products_being_added` | Products being added | Has at least one product assigned |
| 6 | `pricing_review` | Pricing being reviewed | Has products (admin reviews simultaneously) |
| 7 | `preview_ready` | Storefront preview ready | `preview_ready_at` stamp OR storefront published |
| 8 | `awaiting_owner_approval` | Awaiting owner approval | `owner_approved_at` stamp OR storefront published |
| 9 | `store_approved` | Store approved | `owner_approved_at` stamp OR storefront published |
| 10 | `store_live` | Store live | Status is active/live/approved AND not closed |
| 11 | `orders_coming_in` | Orders coming in | At least 1 order exists |
| 12 | `store_closed` | Store closed | Status is closed or completed |
| 13 | `production_started` | Production started | At least 1 completed order OR `production_started_at` stamp |
| 14 | `ready_for_pickup` | Ready for pickup / distribution | `ready_for_pickup_at` stamp |
| 15 | `completed` | Completed | Status is `completed` |

**Admin stamps** (5 milestones the admin manually sets via `PATCH /admin-progress`):
- `preview_ready_at`
- `owner_approved_at`
- `production_started_at`
- `ready_for_pickup_at`
- `completed_at`

Every stage change is logged to `webstore_stage_events` collection (immutable audit trail).

---

## 5. Owner Required Actions (6 items)

These are shown to the store owner in their portal as a checklist with CTA buttons:

| # | Key | Label | Done When |
|---|---|---|---|
| 1 | `complete_questionnaire` | Complete the setup questionnaire | Questionnaire response_count > 0 |
| 2 | `upload_artwork` | Upload logo / artwork | branding.logo_url is set |
| 3 | `review_preview` | Review the storefront preview | owner_approved_at stamp OR store live |
| 4 | `approve_store` | Approve store to go live | Store status is active/live |
| 5 | `confirm_fulfillment` | Confirm pickup / delivery details | pickup_delivery_date OR pickup_delivery_instructions set |
| 6 | `stripe_onboarding` | Complete Stripe Connect onboarding | charges_enabled + payouts_enabled both true |

---

## 6. Webstore Data Model

### Core fields (all store types)
```
id                        uuid
tenant_id                 uuid (shop that owns/manages this store)
name                      string
store_type                business | fundraiser | creator | event
owner_name                string
owner_email               string
owner_phone               string
description               string
status                    pending | active | completed | closed | disabled
is_public                 bool
store_slug                string (globally unique — cannot change after creation)
seo_title                 string (Open Graph)
seo_description           string
og_image                  string (URL)
created_at                ISO string
updated_at                ISO string
```

### Branding sub-document
```
branding.logo_url          string
branding.banner_url        string
branding.accent_color      string (hex)
branding.font              string
branding.header_text       string
```

### Financial counters (running totals, updated on order events)
```
total_sales               float (sum of all order subtotals)
total_orders              int
total_profit              float
payout_owed               float (total commission owed to owner — never decreases on payment)
payout_paid               float (sum of all recorded payouts)
```

### Stripe Connect fields (owner's connected account)
```
owner_stripe_account_id           string | None
owner_stripe_charges_enabled      bool
owner_stripe_payouts_enabled      bool
owner_stripe_details_submitted    bool
owner_user_id                     uuid | None (set if owner created portal account)
owner_portal_enabled              bool
```

### Setup milestone timestamps
```
questionnaire_submitted_at    ISO string | None
questionnaire_reviewed        bool | None
questionnaire_reviewed_at     ISO string | None
preview_ready_at              ISO string | None
owner_approved_at             ISO string | None
production_started_at         ISO string | None  (admin stamp)
ready_for_pickup_at           ISO string | None  (admin stamp)
completed_at                  ISO string | None  (admin stamp)
```

---

## 7. Store-Type Specific Fields

### Fundraiser store
```
fundraiser_goal             float (optional — no progress bar if 0/None)
fundraiser_start_date       ISO string
fundraiser_end_date         ISO string
fundraiser_profit_percent   float (% of net profit allocated to fundraiser)
```

### Creator store
```
creator_commission_type     "percentage" | "flat"
creator_commission_value    float (% or flat dollar amount per order)
```

### Event store
```
event_name                  string
event_type                  "one_time" | "annual" | "seasonal" | "recurring"
event_start_date            ISO string
event_end_date              ISO string
event_location              string
order_deadline              ISO string
pickup_delivery_date        ISO string
pickup_delivery_instructions string
auto_close_after_deadline   bool (store auto-closes when deadline passes)
allow_late_orders           bool (allow orders after deadline if not auto-closed)
```

### Event store — embedded fundraiser (enabled with `fundraiser_enabled: true`)
```
fundraiser_enabled                    bool
fundraiser_name                       string
fundraiser_description                string
fundraiser_goal_amount                float | None (optional — shows progress bar only if set)
show_progress_bar                     bool
allow_checkout_donations              bool
donation_amount_options               string  e.g. "$5, $10, $25"
allow_custom_donation                 bool
profit_allocation_enabled             bool
profit_allocation_type                "percentage" | "fixed_per_item" | "manual" | "na"
profit_allocation_percentage          float | None
fixed_amount_per_item                 float | None
fundraiser_cap_amount                 float | None (maximum fundraiser can raise)
include_donations_in_progress         bool (count donations toward goal total)
include_profit_allocation_in_progress bool (count profit allocation toward goal total)
show_total_raised_publicly            bool
show_supporter_names                  "yes_with_permission" | "yes_all" | "no"

# Running totals (server-computed, updated as orders arrive)
total_donations               float
total_profit_allocated        float
manual_adjustments            float
total_raised                  float  (donations + profit_allocation + manual_adjustments)
```

---

## 8. Locked Settings (tenant-controlled — not editable by store owners)

These are set by the shop admin and cannot be changed by the store owner. They represent the shop's cost structure and profit split.

```
locked_settings:
  base_item_cost              float   cost of goods to the shop
  production_cost             float   printing / production labor
  retail_price                float   price customer pays
  store_owner_profit          float   fixed profit for store owner
  profit_split                float   % of net profit to store owner
  setup_fee                   float
  shipping_fee                float
  handling_fee                float
  shipping_handling_enabled   bool    when true, bundle overrides individual fees
  shipping_handling_fee       float
  shipping_handling_label     string  e.g. "Shipping & Handling"
  shipping_handling_description string
```

---

## 9. Products

### Master catalog (shop-level)
- Products belong to the sign shop tenant (not the webstore)
- Categories: `apparel` | `signs` | `decals` | `promotional` | `events` | `other`
- Apparel tiers: `economy` | `standard` | `premium` (with price modifiers)
- Default sizes: Apparel (XS, S, M, L, XL, 2XL, 3XL) / Decals (Small 3", Medium 6", Large 12", XL 18", Custom)

### WebstoreProduct (store assignment)
- A product from the master catalog is **assigned** to a webstore
- Each assignment can have a `price_override` (optional)
- Each assignment can be `is_enabled: true/false` per store
- The same master product can be in multiple webstores with different prices

### Product model
```
id                    uuid
webstore_id           uuid
product_id            uuid (links to master catalog)
is_enabled            bool
price_override        float | None
```

---

## 10. Webstore Orders

### Order Status lifecycle
```
pending → processing → completed
                     → cancelled
                     → refunded
```

Moving to `completed` triggers payout accounting (payout_owed increments).
Moving to `cancelled` or `refunded` reverses the payout accounting (idempotent).

### Order model
```
id                          uuid
webstore_id                 uuid
customer_name               string
customer_email              string
customer_phone              string | None
items                       [WebstoreOrderItem]
subtotal                    float
total_cost                  float
total_profit                float
commission_amount           float   (owner's cut)
donation_amount             float   (checkout donation — event stores)
profit_allocation_amount    float   (profit allocation — event stores)
shipping_handling_amount    float
donor_consent               bool    (customer agreed to show their name publicly)
grand_total                 float   (subtotal + donations + shipping)
fundraiser_totals_applied   bool    (prevents double-counting on duplicate webhook events)
status                      pending | processing | completed | cancelled | refunded
job_id                      uuid | None (linked canonical order in main system)
idempotency_key             string | None (prevents duplicate orders on resubmit)
stripe_session_id           string | None
payment_amount              float | None
payment_platform_fee        float | None
payout_recorded_at          ISO string | None
created_at                  ISO string
```

### Order item model
```
product_id        uuid
product_name      string
variant_id        uuid | None
variant_name      string | None
quantity          int
unit_price        float
unit_cost         float
item_total        float
item_profit       float
```

---

## 11. Checkout Flow (Public — Unauthenticated)

```
GET /store/{webstore_id}        → public storefront
POST /stripe-connect/webstore/{webstore_id}/checkout  → create Stripe checkout session
GET /stripe-connect/payment-status/{session_id}       → poll for payment result
POST /webstores/v2/orders       → create order record (called by finalize after Stripe confirms)
```

**On successful checkout:**
1. Stripe session created with items + platform fee
2. Customer completes Stripe-hosted checkout
3. `finalize_webstore_stripe_checkout` called from webhook
4. `WebstoreOrder` created in `webstore_orders_v2`
5. Donation amounts captured from locked Stripe session (not client-supplied)
6. `_ensure_main_order_bridge` creates a canonical Order + LineItems + JobTickets in main system
7. Customer upserted into `customers` collection (matched by email)
8. `fundraiser_totals_applied` prevents double-counting on duplicate webhook events
9. Idempotency key prevents duplicate orders on browser resubmit

---

## 12. Stripe Connect Integration

| Endpoint | Purpose |
|---|---|
| `GET /stripe-connect/fee-preview` | Preview platform fee calculation before creating account |
| `GET /stripe-connect/status` | Get current Connect account status for tenant |
| `POST /stripe-connect/create-account` | Create a new Stripe Express Connected Account |
| `POST /stripe-connect/refresh-link` | Refresh expired onboarding link |
| `DELETE /stripe-connect/disconnect` | Disconnect Stripe account from tenant |
| `GET /stripe-connect/dashboard-link` | Get one-time Stripe Express dashboard login link |
| `POST /stripe-connect/webhook` | Receive Stripe events (payment, account updates) |

**Auto-transfer flow:**
- When order moves to `completed` → `_maybe_auto_transfer_owner_commission` fires
- Stripe Transfer created for `commission_amount` to `owner_stripe_account_id`
- Transfer recorded on order (`owner_transfer_id`, `owner_transfer_amount`, `owner_transfer_at`)

---

## 13. Owner Portal (Webstore Owner Access)

Store owners get a separate access flow — they are NOT shop staff users.

### Owner invite flow
```
POST /webstores/v2/{id}/invite/quick     → quick invite (magic link, no portal account)
POST /webstores/v2/{id}/invite/portal    → full portal signup invite
GET  /webstore-owners/onboard?token=...  → owner lands here from email link
POST /webstore-owners/onboard/start-stripe  → begin Stripe Connect from portal
POST /webstore-owners/portal-signup      → create portal user account
```

### Portal endpoints (authenticated as portal user)
```
GET  /webstore-owners/portal/me                      → owner profile + stores list
GET  /webstore-owners/portal/stores/{id}/progress    → 15-stage progress + finance block
GET  /webstore-owners/portal/stores/{id}/transfers   → payout transfer history
POST /webstore-owners/portal/stores/{id}/stripe-login-link → Stripe Express dashboard
```

### Financial transparency block (shown to owner — no internal cost data)
```
gross_sales                 float   total order subtotals
total_orders                int
donations_collected         float
profit_allocation           float
fundraiser_total_raised     float
payout_owed                 float
payout_paid                 float
net_pending_payout          float
formula                     string  plain-English explanation of how pending was calculated
```
**Privacy note:** Internal cost, margin, and supplier data are never shown to store owners.

---

## 14. Setup Questionnaire System

Each store has one questionnaire sent to the store owner via email.

### Questionnaire flow
```
POST /webstores/v2/{id}/send-event-questionnaire  → generate and email questionnaire link
GET  /questionnaires/public/{id}                  → owner fills out (unauthenticated)
GET  /webstores/v2/{id}/questionnaire-review      → admin reviews submitted answers
POST /webstores/v2/{id}/apply-questionnaire       → admin applies answers to store settings
```

### "Apply Safe Answers" logic
When the admin clicks Apply, the system maps 40+ questionnaire question/answer pairs to store fields. Example mappings:
- "Event Name" → `event_name`
- "Event Date" → `event_start_date`
- "Fundraiser Goal Amount ($)" → `fundraiser_goal_amount`
- "Should a fundraiser progress bar be shown?" → `show_progress_bar`
- "Show supporter names?" → `show_supporter_names`
- "Should customers be able to add a donation at checkout?" → `allow_checkout_donations`

**Locked settings are never overwritten by questionnaire answers.**

---

## 15. Store Analytics (per store)

Endpoint: `GET /webstores/v2/{id}/analytics`

```
summary:
  total_revenue         float
  total_orders          int
  pending_orders        int
  completed_orders      int
  total_profit          float
  shop_profit           float   (total_profit - owner_commission)
  avg_order_value       float

payout_info:
  total_owed            float
  total_paid            float
  pending_payout        float
  commission_rate       float

sales_by_day:           [{ date, label, amount }]  — last 14 days

top_products:           [{ product_id, name, quantity, revenue }]  — top 5 by revenue

fundraiser_metrics:     (null for non-fundraiser stores)
  goal                  float
  raised                float
  progress_percent      float (capped at 100%)
  days_remaining        int | None
  profit_percent        float
```

---

## 16. Public Storefront

Endpoint: `GET /store/{webstore_id}` (unauthenticated)

### What's returned to the public
```
id, name, description, store_type, status, store_slug
branding (logo, banner, accent color)
seo_title, seo_description, og_image
event_name, event_start_date, event_end_date, event_location
order_deadline, auto_close_after_deadline
fundraiser_goal_amount, show_progress_bar, total_raised, total_donations
allow_checkout_donations, donation_amount_options, allow_custom_donation
show_total_raised_publicly
shipping_handling (from locked_settings — fee + label only, not cost breakdown)
```

### What is NEVER returned publicly
- locked_settings (base_item_cost, production_cost, profit_split, etc.)
- tenant_id, internal IDs
- payout_owed, payout_paid
- owner Stripe account details
- questionnaire data
- Any cost or margin data

### Status screens (branded, not 404s)
- Store is `pending` → "Coming Soon" screen
- Store is `closed` → "Store Closed" screen with optional message
- Store is `completed` → "Store Completed" screen
- Store is `disabled` → "Temporarily Unavailable" screen

### Admin preview mode
`GET /store/{webstore_id}?preview=true` — authenticated staff can view the store in its current state before it goes live. Access logged to `webstore_stage_events`.

### Public supporters strip
`GET /store/{webstore_id}/supporters` — returns recent donors for stores with `show_supporter_names` enabled. Respects privacy settings:
- `yes_with_permission` → only shows names where `donor_consent: true`
- `yes_all` → shows all supporter names
- `no` → endpoint returns empty list

---

## 17. Admin-Facing Endpoints (shop staff)

```
POST   /webstores/v2                          → create webstore
GET    /webstores/v2                          → list all webstores for tenant
GET    /webstores/v2/{id}                     → get webstore detail
PUT    /webstores/v2/{id}                     → update webstore
DELETE /webstores/v2/{id}                     → delete webstore

GET    /webstores/v2/{id}/admin-progress      → same 15-stage progress payload (admin view)
PATCH  /webstores/v2/{id}/admin-progress      → set milestone stamps (preview_ready, owner_approved, etc.)
GET    /webstores/v2/{id}/analytics           → store analytics
GET    /webstores/v2/{id}/payouts             → payout history
POST   /webstores/v2/{id}/record-payout       → manually record an external payout

POST   /webstores/v2/{id}/logo               → upload store logo
POST   /webstores/v2/{id}/banner             → upload store banner

POST   /webstores/v2/{id}/products           → assign product to store
GET    /webstores/v2/{id}/products           → list products assigned to store
PUT    /webstores/v2/{id}/products/{pid}     → enable/disable product on store
DELETE /webstores/v2/{id}/products/{pid}     → remove product from store

GET    /webstores/v2/orders                  → all orders across all stores
GET    /webstores/v2/{id}/orders             → orders for one store
GET    /webstores/v2/orders/{order_id}       → single order detail
PUT    /webstores/v2/orders/{id}/status      → update order status

GET    /webstores/v2/{id}/event-setup-checklist → admin quick-status for event stores
GET    /webstores/v2/{id}/questionnaire-status  → questionnaire submit state
POST   /webstores/v2/{id}/send-event-questionnaire → email questionnaire to owner
GET    /webstores/v2/{id}/questionnaire-review    → review submitted answers
POST   /webstores/v2/{id}/apply-questionnaire     → apply answers to store settings

GET    /webstores/v2/{id}/owner-status        → Stripe + invite status for store owner
POST   /webstores/v2/{id}/invite/quick        → quick magic-link invite
POST   /webstores/v2/{id}/invite/portal       → full portal signup invite
```

---

## 18. Bridge to Canonical Orders

When a webstore order is placed, a **bridge function** (`_ensure_main_order_bridge`) creates records in the main order system:

```
WebstoreOrder
    ↓ bridge
Order (canonical)
  is_webstore_order: true
  webstore_order_id: uuid
  webstore_name: string
  order_type: "webstore"
    ↓ per item
  OrderItem (one per WebstoreOrderItem)
    ↓
  JobTicket (one per OrderItem)
    ↓
  ProductionTask (default tasks from stage config)

Customer record
  upserted by email — created if new, updated if existing
```

---

## 19. Store Snapshot (Print/Share)

`StoreSnapshotModal.js` — printable 1-page store summary containing:
- Store name, type, status
- QR code to the public storefront
- Key financial metrics
- Top products
- Progress / stage summary

---

## 20. Frontend Routes

| Path | Component | Access |
|---|---|---|
| `/webstores` | `Webstores.js` | Staff |
| `/store/:webstoreId` | `Storefront.js` | Public (unauthenticated) |
| `/portal` | `OwnerPortal.js` | Store owner (portal auth) |
| `/portal/signup` | `OwnerPortalSignup.js` | Store owner (invite token) |
| `/portal/dashboard` | `PortalDashboard.js` | Store owner |
| `/portal/webstores` | `PortalWebstores.js` | Store owner |
| `/questionnaire/:id` | `PublicQuestionnaire.js` | Public (unauthenticated) |
| `/webstore-owner/onboard` | `WebstoreOwnerOnboard.js` | Owner (magic link token) |

---

## 21. Known Behaviors & Edge Cases

- **Idempotency:** Orders submitted with the same `idempotency_key` within 1 hour return the existing order instead of creating a duplicate.
- **Fundraiser totals are idempotent:** `fundraiser_totals_applied` flag prevents double-counting on duplicate Stripe webhook events.
- **Payout accounting is idempotent:** Moving an order to `completed` only triggers payout increment if it hasn't been applied. Cancellation/refund reverses it.
- **Locked settings override:** Questionnaire answers CANNOT overwrite `locked_settings` fields — the apply function explicitly skips them.
- **Store slug is read-only:** Once set at creation, `store_slug` never changes (URLs must be stable).
- **Financial counters drift:** Cached totals on the webstore doc (`total_sales`, `total_orders`) can drift from reality on refunds/cancellations. The analytics endpoint and the owner portal re-aggregate live from `webstore_orders_v2` instead of trusting the cached fields.
- **Stage stamps vs computed stages:** Computed stages walk sequentially. Admin stamp timestamps are returned separately so the UI can show "stamped" state even when the sequential walker hasn't reached that stage yet (e.g., production stamped while questionnaire is still outstanding).
- **Commission type:** Creator stores support both `percentage` and `flat` commission types.
- **Profit allocation types:** `percentage`, `fixed_per_item`, `manual`, `na` — event store fundraisers support all four.

---

*Generated: 2026-06-10 | Audit of production codebase*
*backend/routes/webstores.py (3,776 lines) + stripe_connect.py (1,549) + webstore_owners.py (931) + portal.py (2,195)*


---

## 22. Rebuild Suggestions & Things to Watch Out For

> **Purpose:** Hard-won lessons from the current implementation. Apply these from Day 1 in the greenfield rebuild to avoid repeating the same traps.

---

### 22.1 Money — Store Everything as Integer Cents

**Current problem:** All financial fields (`total_sales`, `commission_amount`, `payout_owed`, etc.) are stored as `float`. Floating-point accumulation errors compound over hundreds of orders.

**Rebuild rule:**
- Store **all money as integer cents** in MongoDB (`amount_cents: int`).
- Only convert to display dollars at the serialization layer (divide by 100 before sending to the API consumer).
- Enforce this with a strict `Money` Pydantic type that refuses float inputs.
- Running totals (`payout_owed_cents`, `total_sales_cents`) increment/decrement atomically via MongoDB `$inc` — never do math in Python and write back.

```python
# RIGHT
await db.webstores_v2.update_one(
    {"id": webstore_id},
    {"$inc": {"payout_owed_cents": commission_cents}}
)

# WRONG (current behavior)
store["payout_owed"] += commission_amount  # float drift
await db.webstores_v2.replace_one({"id": webstore_id}, store)
```

---

### 22.2 Stripe Connect — Know the Account State Machine

Stripe Connect is the #1 source of silent failures. The current code checks `charges_enabled` and `payouts_enabled`, but there are more states to handle:

| Stripe field | Meaning | What to do |
|---|---|---|
| `charges_enabled: false` | Account cannot accept payments | Block store from going live |
| `payouts_enabled: false` | Account can accept but cannot receive payouts | Allow sales, warn owner, hold funds |
| `details_submitted: false` | Onboarding incomplete | Show "Complete Stripe Setup" CTA |
| `requirements.currently_due` | Stripe needs more info | Show warning, refresh link |
| `requirements.past_due` | Account will be restricted | Urgent banner to owner |
| `capabilities.transfers: inactive` | Platform transfers blocked | Cannot auto-transfer commission |

**Rebuild rule:**
- Refresh account status from Stripe on **every** admin-progress page load (not just cached DB values).
- Store `requirements_currently_due`, `requirements_past_due`, `capabilities` as structured fields — not just the three booleans.
- Show a "Stripe Account Health" widget in the owner portal that reflects real-time state.
- Never assume `charges_enabled = true` means everything is working. Check `capabilities.card_payments` explicitly.

---

### 22.3 The Store Slug is a One-Way Door

**Current behavior:** `store_slug` is set at creation and there is a code comment that it "never changes." But there is no DB-level enforcement — only an application-level guard in the `PUT /webstores/v2/{id}` route.

**Rebuild rule:**
- Mark `store_slug` as **immutable** in the Pydantic model (no setter after creation).
- Add a MongoDB unique index on `store_slug` (currently missing — relies on application code).
- Never expose a rename/slug-change endpoint. If the customer insists, require creating a new store.
- Redirect old slugs to new slugs via a `slug_redirects` collection if you ever do allow migrations.

---

### 22.4 The 15-Stage Pipeline is Computed, Not Stored — Protect That Invariant

**Current behavior:** Stage completion is derived live from data (e.g., "has products = stage 5 complete"). This is correct. But admin stamp timestamps (`preview_ready_at`, etc.) can be set in any order, causing the stage walker to skip steps.

**Rebuild rule:**
- Stage stamps must be **validated in sequence** before accepting them. Do not allow `production_started_at` to be set before `owner_approved_at`.
- The five admin stamps should be an **ordered state machine** with explicit transitions. Reject out-of-order stamps with a 422 error.
- Store the full computed stage snapshot in a `stage_snapshot_at` field (ISO timestamp of last computation) so you can debug stale UI without re-running the walker.

---

### 22.5 Idempotency Keys Must Have an Expiry

**Current behavior:** The `idempotency_key` field on orders prevents duplicate Stripe webhook events from creating duplicate orders. But there is no TTL on idempotency key uniqueness — a key collision from a year ago would still block a new order.

**Rebuild rule:**
- Enforce idempotency within a 1-hour window (already partially documented in edge cases).
- Create a TTL index on `idempotency_key` with a 2-hour window.
- Treat expired keys as non-existent (allow the order to proceed).

---

### 22.6 Financial Counters Will Drift — Plan for Reconciliation

**Current behavior:** `total_sales`, `total_orders`, `total_profit`, `payout_owed` are incremented/decremented on order events. On refunds and cancellations, the counters are reversed. But the reversal logic has an edge case: if an order transitions `cancelled → refunded` (or any re-transition), the counter can be decremented twice.

**Rebuild rule:**
- Use `payout_recorded_at` as the authoritative flag — not order status alone.
- Add a `reconcile_counters` job that re-aggregates from `webstore_orders_v2` nightly and corrects drift.
- Never trust `webstore.total_sales` for financial reporting. Always re-aggregate live. The cached counter is only for display.

---

### 22.7 Owner Portal Auth is a Separate System — Keep It Isolated

**Current behavior:** Owner portal users are a completely separate auth system from shop staff users. They share no session, no JWT, no role logic. This is correct and intentional.

**Rebuild rule:**
- Keep this separation strictly. Never merge portal users with staff users into a single `users` collection.
- Portal tokens must have a **short TTL** (24 hours) and must be rotatable (invalidate all sessions when the owner's email changes).
- Portal invite tokens (magic links) must be **single-use and expire in 48 hours**. Add a `used_at` timestamp; reject re-use.
- The portal has read-only access to financial data. Never add a route that lets the portal owner modify `locked_settings` — those belong to the shop admin only.

---

### 22.8 Questionnaire "Apply Safe Answers" Has Scope Drift Risk

**Current behavior:** The `apply-questionnaire` route maps 40+ questionnaire answers to store fields. The mapping is hard-coded in Python. As new store fields are added, there is no mechanism to ensure the mapping stays current.

**Rebuild rule:**
- Define the questionnaire-to-field mapping in a **declarative config file** (JSON/YAML), not in-line code.
- Wrap every field write in a per-field validation: "Is this field safe for owners to set?" Never touch `locked_settings` fields from questionnaire data.
- Add a dry-run mode: `POST /apply-questionnaire?dry_run=true` returns the diff without committing it. Let admins preview before applying.

---

### 22.9 The Bridge to Canonical Orders is Fragile

**Current behavior:** `_ensure_main_order_bridge` creates `Order`, `OrderItem`, `JobTicket`, and `ProductionTask` records from a webstore order. This function is called inside the Stripe webhook handler. If any part fails, the webstore order is still committed but the bridge records are missing.

**Rebuild rule:**
- Make the bridge **idempotent**: check for existing bridge records before creating new ones. The current `is_webstore_order: true + webstore_order_id` link partially does this, but doesn't protect against partial creation.
- Run the bridge in a **background task** after the webhook responds with 200. Never hold the Stripe webhook open for more than 2 seconds.
- Add a `bridge_status: pending | success | failed` field to the webstore order. A cron job retries `failed` bridges every 15 minutes.

---

### 22.10 Store Type Separation — Four Store Types Should Be Four Clear Code Paths

**Current behavior:** Store type differences are scattered across the codebase as `if store_type == "fundraiser"` branches. The event store has the most complexity (embedded fundraiser, deadlines, auto-close) and is the most fragile.

**Rebuild rule:**
- Use **composition over branching**: define a `StoreStrategy` base class with `fundraiser_strategy`, `event_strategy`, `creator_strategy`, `business_strategy` subclasses.
- Each strategy defines: checkout additions (donations?), payout behavior (commission?), lifecycle hooks (auto-close?), owner portal tabs.
- Load the strategy at request time based on `store_type`. Zero `if store_type == ...` in the core routes.

---

### 22.11 Multi-Tenant Data Isolation — Paranoid Checks Everywhere

**Current behavior:** Almost every query includes `{"tenant_id": current_user.tenant_id}`. Almost. There are edge cases (especially in helper functions) where the `tenant_id` filter is missing because the route already validated ownership.

**Rebuild rule:**
- Use a **tenant-scoped DB wrapper**: `TenantDB(db, tenant_id)` that automatically appends `{"tenant_id": tenant_id}` to every query. Never call `db.collection.find(...)` directly in route handlers.
- Write a test that confirms every collection query includes a `tenant_id` filter. This should be a CI gate.
- The only exceptions: `tenants` collection (looked up by ID alone), `webstore_stage_events` (append-only, no tenant filter needed for writes), and public storefront endpoints (explicitly unauthenticated).

---

### 22.12 Public Storefront Data Exposure — What Must Never Leak

Always verify the public storefront serializer excludes:
- `locked_settings` (cost, margin, profit split)
- `tenant_id` (reveals sign shop identity)
- `payout_owed`, `payout_paid`
- `owner_stripe_account_id`
- Any `*_at` admin timestamps beyond `order_deadline` and event dates

**Rebuild rule:** Use a dedicated `PublicStorefrontResponse` Pydantic model with **explicit field inclusion** (allowlist), not exclusion (denylist). If you use exclusion, new fields added to the model will automatically leak.

---

### 22.13 Auto-Transfer Failure Handling

**Current behavior:** When an order moves to `completed`, `_maybe_auto_transfer_owner_commission` fires and creates a Stripe Transfer. If the transfer fails (e.g., owner account restricted), the exception is swallowed and the payout is silently not sent.

**Rebuild rule:**
- Log every failed transfer attempt to a `failed_transfers` collection with `order_id`, `webstore_id`, `amount_cents`, `error_code`, `error_message`, `attempted_at`.
- Expose a `GET /admin/failed-transfers` endpoint so the shop admin can see and manually retry.
- Never silently swallow a Stripe error in a webhook handler.

---

*Rebuild notes generated: 2026-06-10*

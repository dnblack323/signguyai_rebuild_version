# SignGuy AI — Rebuild Specification
> **Purpose:** Greenfield rebuild brief. Everything the original app does, every final decision made, and what to know on Day 1 to avoid workarounds. Use this as the starting spec.
> **Version:** 2.0 — Updated with 15 conflict resolutions from Conflict Resolution Worksheet (2026-06-10)

---

## ⚠️ GOVERNANCE RULES (Read Before Writing Any Code)

These rules govern every decision during the rebuild. When in doubt, stop and re-read these.

### Rule 1 — Day 1 Spec is the Source of Truth
This document overrides all other planning docs, roadmaps, and staged release plans for architecture and approved behavior decisions. Exceptions are allowed only for: security, payment handling, tenant isolation, and deterministic math (payroll, inventory, money).

### Rule 2 — Protected Behavior Cannot Be Simplified
Any behavior, calculation, workflow step, field name, or UI label that already works in the current app and has been approved by the owner is **locked**. Architecture can change. Approved outcomes cannot — without explicit written approval. When in doubt, preserve the current behavior exactly and flag it for review.

### Rule 3 — Webstores Are a Core Loop, Not a Later Phase
Webstores are not deferred. They are one of the four core value loops. Build webstore structure alongside orders. A protected Webstore Behavior Spec must be approved before coding webstore-specific logic.

### Rule 4 — Money Is Always Integer Cents
Every monetary amount in the database and API is stored and transmitted as **integer cents** (e.g., `4999` = $49.99). Convert to dollars only at display time using the shared money helpers. The only exceptions are rates and percentages (tax_rate, markup_percent, labor_rate_per_hour, cost_per_sqft) which remain decimal.

### Rule 5 — Routes Are Thin. Services Are Thick.
A route handler does exactly three things: parse the request, call a service function, return the response. No business logic, no direct DB calls, no computations in route files. Services own DB access and all business logic.

---

## Canonical Status Enums
Define these once. Use them everywhere. No synonyms, no shortcuts.

```python
# Orders
ORDER_STATUS = "draft|confirmed|in_production|ready|delivered|cancelled|on_hold|void"

# Job Tickets
TICKET_STATUS = "not_started|in_progress|paused|completed|blocked|cancelled"

# Production Tasks
TASK_STATUS = "not_started|in_progress|paused|completed|blocked"
#              ^^^ Always "completed" — NEVER "complete" ^^^

# Invoices
INVOICE_STATUS = "draft|sent|viewed|partial|paid|overdue|void|written_off"

# Quotes
QUOTE_STATUS = "draft|sent|viewed|accepted|declined|expired|converted"

# Proofs
PROOF_STATUS = "draft|sent|approved|revision_requested|expired"

# Purchase Orders
PO_STATUS = "draft|sent|acknowledged|partial|received|cancelled"

# Webstores
WEBSTORE_STATUS = "pending|active|completed|closed|disabled"

# Timeclock
TIMECLOCK_STATUS = "active|completed|edited"
```
**During migration only:** Accept both `"complete"` and `"completed"` in API inputs, normalize to `"completed"` before saving.

---

## Protected Behaviors List
These behaviors are locked. They cannot be renamed, restructured, or removed without explicit owner approval.

| # | Behavior | Why It's Protected |
|---|---|---|
| 1 | Webstore checkout creates a canonical Order + LineItems + JobTickets automatically | Core automation that saves manual data entry |
| 2 | Order status is owned by domain services only — never raw-edited via API | Prevents data corruption |
| 3 | Proof approval uses unauthenticated signed-token URL (no customer login required) | Customer UX that's already communicated |
| 4 | Payment link uses signed token — invoice ID never exposed in URL | Security requirement |
| 5 | Payroll runs are immutable once finalized | Accounting integrity |
| 6 | Timeclock entries are append-only (corrections = new records, not edits) | Audit trail integrity |
| 7 | Inventory balance is always computed from ledger transactions — never mutated directly | Financial accuracy |
| 8 | Quote pricing is snapshot-frozen at creation — doesn't change if Foundation rates change | Contract integrity |
| 9 | Tenant data is fully isolated — every query scoped to tenant_id | Security |
| 10 | platform_creator role can only be assigned via PLATFORM_CREATOR_EMAIL env var at startup | Security |
| 11 | Webstore product catalog is separate from shop inventory items | Architecture boundary |
| 12 | B2B store requires order approval before production begins | Business workflow |
| 13 | Fundraiser totals (donations, profit allocation) are computed server-side, never trusted from frontend | Financial integrity |
| 14 | Store slug is globally unique across all tenants | URL integrity |
| 15 | Backup restore uses snapshot-and-rollback — partial failure restores original data | Data safety |

---

## Money Helpers (Build Day 1, Use Everywhere)

### Backend — `utils/money.py`
```python
def to_cents(dollars: float | int | str) -> int:
    """Convert dollar amount to integer cents. Always round half-up."""
    from decimal import Decimal, ROUND_HALF_UP
    return int(Decimal(str(dollars)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP) * 100)

def to_dollars(cents: int) -> float:
    """Convert integer cents to float dollars for display."""
    return cents / 100

def cents_display(cents: int, currency: str = "USD") -> str:
    """Format cents as currency string: 4999 → '$49.99'"""
    return f"${cents / 100:,.2f}"
```

### Frontend — `lib/money.js`
```javascript
export const toCents = (dollars) => Math.round(parseFloat(dollars) * 100);
export const toDollars = (cents) => (cents / 100).toFixed(2);
export const formatMoney = (cents) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
```

**Rule:** All API requests send cents as integers. All API responses return cents as integers. `formatMoney()` is the only place dollars appear in the UI.

---

## Table of Contents
1. [App Overview](#1-app-overview)
2. [Tech Stack Decision](#2-tech-stack-decision)
3. [Architecture — Day 1 Rules](#3-architecture--day-1-rules)
4. [Database Schema Principles](#4-database-schema-principles)
5. [Auth & Multi-Tenancy](#5-auth--multi-tenancy)
6. [Orders — The 4-Layer Hierarchy](#6-orders--the-4-layer-hierarchy)
7. [Job Tickets (Production Unit)](#7-job-tickets-production-unit)
8. [Customers (CRM)](#8-customers-crm)
9. [Quotes](#9-quotes)
10. [Invoices & Billing](#10-invoices--billing)
11. [Pricing Foundation + Calculator](#11-pricing-foundation--calculator)
12. [Webstores](#12-webstores)
13. [Inventory & Materials](#13-inventory--materials)
14. [Purchasing (POs & Vendors)](#14-purchasing-pos--vendors)
15. [Production Board](#15-production-board)
16. [Artwork Proofs](#16-artwork-proofs)
17. [Team, Timeclock & Payroll](#17-team-timeclock--payroll)
18. [AI Tools](#18-ai-tools)
19. [Communications & Meta Messenger](#19-communications--meta-messenger)
20. [Payments & Stripe](#20-payments--stripe)
21. [Reports & Analytics](#21-reports--analytics)
22. [Dashboard](#22-dashboard)
23. [Settings](#23-settings)
24. [Platform Admin](#24-platform-admin)
25. [UI/UX System](#25-uiux-system)
26. [API Design Rules](#26-api-design-rules)
27. [File & Asset Storage](#27-file--asset-storage)
28. [Notification & Digest System](#28-notification--digest-system)
29. [Feature Flags & Tier Gating](#29-feature-flags--tier-gating)
30. [Deployment & Environments](#30-deployment--environments)

---

## 1. App Overview

**SignGuy AI** is a multi-tenant SaaS operating system for sign shops. One account = one sign shop (tenant). A single platform owner (platform_creator) manages all tenants.

**Core value loops:**
- Take a customer job → produce it → invoice it → get paid
- Run a webstore → customers self-order → auto-enters production queue
- Price jobs accurately using configured material + labor costs
- Track materials from purchase order → stock → job consumption

**User types:**
| Role | Who | What they see |
|---|---|---|
| `platform_creator` | You (the SaaS owner) | Everything across all tenants |
| `platform_admin` | Your support staff | All tenants, no billing |
| `owner` | Sign shop owner | Full access to their tenant |
| `admin` | Shop manager | Full operational access, no billing settings |
| `staff` | Employees | Assigned work, timeclock, limited views |

---

## 2. Tech Stack Decision

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Tailwind CSS + Shadcn/UI | Component library already built, CSS variables for theming |
| Backend | FastAPI (Python) | Async, clean routing, Pydantic validation |
| Database | MongoDB (Motor async) | Flexible schemas per tenant, no migrations for new fields |
| Auth | JWT (HS256) | Stateless, works across preview + production |
| Payments | Stripe (direct) + Stripe Connect (webstores) | Two separate integrations |
| Email | SendGrid | Transactional templates |
| AI | Emergent LLM Key → OpenAI / Claude / Gemini | Single key, no per-model API key management |
| File Storage | Object storage (S3-compatible) | Artwork files, proof PDFs, generated documents |
| Process Manager | Supervisor | Frontend :3000, Backend :8001 |

---

## 3. Architecture — Day 1 Rules

### Backend structure
```
backend/
  models/          # Pydantic models only — no business logic
    __init__.py    # Re-exports everything
    auth.py        # User, UserRole, Permission, ROLE_PERMISSIONS
    base.py        # BaseDocument with id, tenant_id, created_at, updated_at
    inventory.py   # Inventory models
    ...
  routes/          # One file per feature domain
    auth.py
    orders.py
    job_tickets.py
    inventory.py
    webstores.py
    ...
  services/        # Business logic AND all DB calls — routes never touch DB directly
    inventory_service.py   # Ledger math, balance calculations
    stripe_service.py      # All Stripe calls
    email_service.py       # All SendGrid calls
    order_service.py       # Order status transitions, ticket creation
    ...
  utils/
    money.py       # to_cents(), to_dollars(), cents_display()
    ...
  core_runtime.py  # DB connection, auth helpers, has_permission()
  server.py        # App init, router registration only — no route logic
```

### Frontend structure
```
frontend/src/
  pages/           # One file per page/route
  components/
    ui/            # Shadcn primitives — never modify
    ribbon/        # PrimaryNav, ActionToolbar, DashboardRibbon, WebstoresRibbon
    dashboard/     # Dashboard widget components
    inventory/     # Inventory-specific components
    orders/        # Order-specific components
    ...
  context/
    AuthContext.js    # User, permissions, tenant
    PageContext.js    # Page title, breadcrumbs
  lib/
    api.js         # Axios instance with base URL + auth header
    authStorage.js # Token read/write
    money.js       # toCents(), toDollars(), formatMoney() — use everywhere
    utils.js       # cn(), formatDate()
```

### Absolute rules
- Every backend route prefixed `/api/`
- Frontend ONLY uses `process.env.REACT_APP_BACKEND_URL` — never hardcode
- Backend ONLY uses `os.environ['MONGO_URL']` and `os.environ['DB_NAME']` — no defaults
- Zero business logic in `server.py` — it is a registration file only
- **Routes do exactly three things: parse request → call service → return response. No DB calls, no computations, no business logic inside route handlers. All of that lives in `services/`.**

---

## 4. Database Schema Principles

### BaseDocument (every collection inherits this)
```python
class BaseDocument(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
```

### PyObjectId rule
- Never return raw MongoDB `_id` in API responses
- All docs stored with `id` (uuid string) alongside `_id`
- Always query by `id`, never `_id`
- Always project `{"_id": 0}` in find queries

### Timestamps
- Always `datetime.now(timezone.utc).isoformat()` — never `datetime.utcnow()`
- Store as ISO string in MongoDB, parse on frontend with `new Date()`

### Indexes — create on first migration
Every collection needs at minimum:
```
{ tenant_id: 1 }                          # base isolation index
{ tenant_id: 1, created_at: -1 }          # time-ordered listing
{ tenant_id: 1, <primary_lookup_field>: 1 } # domain-specific
```

### Counter documents (for human-readable IDs)
```python
# Orders: ORD-0001, Invoices: INV-0001, POs: PO-0001
# One counter doc per tenant per type
{ tenant_id, counter_type: "order", last_number: 42 }
# Use findOneAndUpdate with $inc — atomic, no race conditions
```

---

## 5. Auth & Multi-Tenancy

### Permission system
```python
class Permission(str, Enum):
    # Orders
    ORDERS_VIEW = "orders:view"
    ORDERS_CREATE = "orders:create"
    ORDERS_EDIT = "orders:edit"
    ORDERS_DELETE = "orders:delete"
    # ... 60+ permissions across all domains

class ROLE_PERMISSIONS:
    owner: list(Permission)   # ALL permissions
    admin: [all except billing/settings:delete]
    staff: [view-only + timeclock + assigned work]

def has_permission(user: UserInDB, permission: Permission) -> bool:
    # platform_creator, platform_admin, owner get everything
    if user.role.value in ('owner', 'platform_admin', 'platform_creator'):
        return True
    return permission in ROLE_PERMISSIONS.get(user.role, [])
```

### JWT payload
```json
{
  "user_id": "uuid",
  "tenant_id": "uuid",
  "role": "owner",
  "email": "user@example.com",
  "exp": 1234567890
}
```
Frontend reads role from token — no separate permissions API call needed.

### platform_creator setup
```python
# In server startup:
PLATFORM_CREATOR_EMAIL = os.environ.get('PLATFORM_CREATOR_EMAIL')
# On startup, find user with that email and set role = 'platform_creator'
# This is the only way to get this role — cannot be set via UI
```

### Tenant isolation
- Every DB query includes `{"tenant_id": current_user.tenant_id}`
- Every route dependency: `current_user: UserInDB = Depends(get_current_active_user)`
- Impersonation (platform admin only): override tenant_id via request header `X-Impersonate-Tenant`

---

## 6. Orders — The 4-Layer Hierarchy

```
Order
└── LineItem (1 or more)
    └── JobTicket (1 per line item)
        └── ProductionTask (1 or more per ticket)
```

### Order
```python
{
  order_number: "ORD-0042",      # tenant-scoped counter
  customer_id: uuid,
  status: "draft|confirmed|in_production|ready|delivered|cancelled|on_hold|void",
  order_type: "walk_in|phone|email|webstore|quote_converted",
  source: "internal|webstore",
  is_webstore_order: bool,
  webstore_order_id: uuid | None,
  webstore_name: str | None,
  due_date: iso_string,
  deposit_amount_cents: int,     # e.g. 5000 = $50.00
  subtotal_cents: int,
  tax_rate: float,               # e.g. 0.08 = 8% — decimal, not cents
  tax_amount_cents: int,
  total_cents: int,
  balance_due_cents: int,        # computed: total_cents - sum(payments)
  notes: str,
  special_instructions: str,
  status_updated_at: iso_string,  # set every time status changes
  status_updated_by_id: uuid,     # who/what changed it
}
```

### LineItem
```python
{
  order_id: uuid,
  product_type: "yard_sign|banner|vehicle_wrap|...",
  description: str,
  quantity: int,
  unit_price_cents: int,         # e.g. 2500 = $25.00
  line_total_cents: int,         # unit_price_cents × quantity
  width_inches: float | None,
  height_inches: float | None,
  material: str,
  turnaround: str,
  artwork_status: "not_received|received|approved|sent_for_approval",
  production_required: bool,     # False for fees, discounts, shipping — no JobTicket created
}
```

### JobTicket
```python
{
  order_id: uuid,
  line_item_id: uuid,
  ticket_number: "TKT-0042",
  ticket_name: str,          # "12x18 Yard Sign × 50 — Smith Campaign"
  production_stage: str,      # key from tenant's stage config
  ticket_priority: "low|normal|high|rush",
  assigned_to_id: uuid | None,
  due_date: iso_string,
  artwork_files: [FileRef],
  proof_status: "not_sent|sent|approved|revision_requested",
  special_instructions: str,
  production_notes: str,
  install_notes: str,
  packaging_notes: str,
  rework_notes: str,
}
```

### ProductionTask
```python
{
  ticket_id: uuid,
  task_name: str,             # "Print", "Cut", "Laminate", "Install"
  production_stage: str,
  status: "not_started|in_progress|paused|completed|blocked",
  #                                              ^^^ "completed" always — never "complete"
  assigned_to_id: uuid | None,
  estimated_minutes: int,
  actual_minutes: int,
  sort_order: int,
}
```

### Key rules
- **Order status is owned by `order_service` only** — no route handler sets it directly. Manual overrides (cancel, on_hold, void) require an audit reason and go through the service. Every status change writes `status_updated_at` + `status_updated_by_id`.
- **JobTicket is created only when `production_required: true`** on the LineItem — fees, discounts, rush charges, and shipping do NOT get tickets
- `ticket_number` uses the same counter system as order numbers
- Webstore orders set `is_webstore_order: true` and `webstore_order_id` at creation — never retrofitted

---

## 7. Job Tickets (Production Unit)

### Tabs (in order)
1. **Overview** — status, stage, priority, assignee, due date, linked order
2. **Artwork** — file uploads (design files, customer-provided art)
3. **Proofs** — proof PDFs sent to customer, approval status
4. **Materials** — material requirements linked to inventory items
5. **Notes** — special instructions, production notes, install notes, packaging notes
6. **Activity** — append-only event log

### Material Requirements
```python
{
  ticket_id: uuid,
  inventory_item_id: uuid,
  required_quantity: float,
  unit: str,
  required_width_inches: float | None,
  required_length_inches: float | None,
  status: "open|reserved|pulled|consumed|shortage",
  shortage_ids: [uuid],       # links to inventory_shortages if unfulfilled
}
```

### Production stage flow
- Stages are tenant-configurable strings: `["prepress", "printing", "finishing", "ready", "delivered"]`
- Stage key is stored on both the ticket AND each production task
- Changing ticket stage does NOT auto-change task stages — they're independent

---

## 8. Customers (CRM)

```python
{
  display_name: str,
  company_name: str,
  email: str,
  phone: str,
  billing_address: Address,
  shipping_address: Address,
  customer_type: "individual|business|nonprofit",
  tax_exempt: bool,
  tax_id: str,
  preferred_contact: "email|phone|text",
  stripe_customer_id: str | None,
  notes: str,
  tags: [str],
  is_active: bool,
}
```

**Know from day 1:**
- `stripe_customer_id` goes on the customer at creation if you're using Stripe — don't add it later
- Customers need a `lifetime_value` computed field (sum of paid invoices) — compute on read, don't store
- Tags enable filtering: "wholesale", "VIP", "net30" — store as a string array
- Customer portal (self-service proof approval, order status) is a separate unauthenticated flow — design routes accordingly

---

## 9. Quotes

```python
{
  quote_number: "QUO-0012",
  customer_id: uuid,
  status: "draft|sent|viewed|accepted|declined|expired|converted",
  expires_at: iso_string,
  line_items: [QuoteLineItem],  # same structure as OrderLineItem
  subtotal_cents: int,
  tax_rate: float,               # decimal, not cents
  total_cents: int,
  notes: str,
  converted_order_id: uuid | None,   # set when accepted + converted
  pricing_snapshot: {},              # frozen pricing config at time of quote
}
```

**Know from day 1:**
- Quote → Order conversion copies line items, creates tickets automatically
- `pricing_snapshot` captures the pricing foundation config at quote time — prices shouldn't change retroactively
- Quote acceptance can be via email link (unauthenticated customer action) — design the accept endpoint as public

---

## 10. Invoices & Billing

```python
{
  invoice_number: "INV-0088",
  order_id: uuid,
  customer_id: uuid,
  status: "draft|sent|viewed|partial|paid|overdue|void|written_off",
  due_date: iso_string,
  line_items: [InvoiceLineItem],
  subtotal_cents: int,
  tax_rate: float,               # decimal, not cents
  tax_amount_cents: int,
  total_cents: int,
  amount_paid_cents: int,        # sum of all payment_transactions for this invoice
  balance_due_cents: int,        # computed: total_cents - amount_paid_cents — NEVER stored as mutable field
  stripe_payment_intent_id: str | None,
  payment_link_token: str,       # for unauthenticated customer payment
  sent_at: iso_string | None,
  paid_at: iso_string | None,
}
```

**Know from day 1:**
- `balance_due` is always computed — never stored as a mutable field
- Payment link token must be a signed JWT or random UUID stored in the invoice — never expose invoice ID in the payment URL
- Partial payments: `payment_transactions` table holds each payment, invoice `amount_paid` = sum of those
- Overdue status is computed at read time from `due_date` — a scheduled job emails reminders but doesn't change status

---

## 11. Pricing Foundation + Calculator

### Foundation (admin config — one doc per tenant)
```python
pricing_defaults = {
  tenant_id: uuid,
  categories: {
    "yard_signs": {
      materials: [
        { key: "corrugated_4mm", name: "4mm Coroplast", cost_per_sqft: 0.45 },
        { key: "corrugated_10mm", name: "10mm Coroplast", cost_per_sqft: 0.85 },
      ],
      sizes: [
        { label: "18×24", width: 18, height: 24 },
        { label: "24×36", width: 24, height: 36 },
      ],
      labor_rate_per_hour: 65.00,
      setup_fee: 25.00,
      overhead_percent: 15,
      markup_percent: 40,
      waste_percent: 8,
      minimum_price: 12.00,
      quantity_breaks: [
        { min_qty: 1, multiplier: 1.0 },
        { min_qty: 10, multiplier: 0.9 },
        { min_qty: 50, multiplier: 0.75 },
      ],
    },
    "banners": { ... },
    "rigid_signs": { ... },
    "cut_vinyl": { ... },
    "vehicle_graphics": { ... },
    "digital_print": { ... },
  }
}
```

### Calculator formulas by category
```
yard_signs / rigid_signs / banners:
  sqft = (width × height) / 144
  material_cost = sqft × material.cost_per_sqft
  print_time_hrs = sqft / print_speed_sqft_per_hr
  labor_cost = print_time_hrs × labor_rate
  base_cost = material_cost + labor_cost + setup_fee
  with_overhead = base_cost × (1 + overhead_percent/100)
  unit_price = (with_overhead × (1 + markup_percent/100)) × quantity_break_multiplier
  final_price = max(unit_price, minimum_price) × quantity

cut_vinyl:
  priced per linear foot × width
  substrate is separate line item if applicable

vehicle_graphics:
  priced per panel (hood, roof, doors, full wrap)
  each panel has a sqft factor from the vehicle profile
```

**Know from day 1:**
- **Foundation lives in Settings → Pricing** — it is a configuration page, not a standalone module
- **Calculator is globally accessible** — it has its own page AND is embedded inside New Quote and New Order Item flows
- All formulas are pure functions — `calculatePrice(inputs, foundationConfig) → price_cents` — testable, no side effects
- Calculator works with and without a customer logged in (phone quote tool)
- Quantity breaks are per-category, not global
- Pricing rates (cost_per_sqft, labor_rate_per_hour, setup_fee, minimum_price) are **stored as floats/decimals** — they are rates, not money amounts. Final computed prices are converted to cents before storing.

---

## 12. Webstores

### Store types
```python
store_type: "b2b" | "fundraiser" | "creator"
```

### B2B Store
```python
{
  store_type: "b2b",
  approved_buyers: [{ email, name, spending_limit }],
  requires_approval: bool,        # PO-style order approval before production
  payment_terms: "net15|net30|prepaid",
  product_catalog: [WebstoreProduct],
  custom_domain: str | None,
  is_active: bool,
}
```

### Fundraiser Store
```python
{
  store_type: "fundraiser",
  goal_amount: float,
  deadline: iso_string,
  organizer_name: str,
  fundraiser_split_percent: float,    # % goes to fundraiser, rest to shop
  team_members: [{ name, email, personal_link_slug }],
  product_catalog: [WebstoreProduct],
}
```

### Creator Store
```python
{
  store_type: "creator",
  creator_name: str,
  stripe_connect_account_id: str,    # required — payout destination
  commission_percent: float,         # platform takes this %
  product_catalog: [WebstoreProduct],
}
```

### WebstoreProduct
```python
{
  name: str,
  description: str,
  product_type: "yard_sign|banner|tshirt|digital|...",
  pricing_config: {},        # snapshot of pricing for this product
  image_urls: [str],
  variants: [{ label, sku, price, stock_qty }],
  is_active: bool,
}
```

### Checkout flow — WebstoreProduct → Canonical Order
```
Public route: /store/{store_slug}
1. Customer browses → adds to cart (localStorage — no DB cart)
2. Checkout → customer enters contact info + payment
3. Stripe charge (or Stripe Connect for creator stores)
4. WebstoreOrder created (e-commerce record, owned by webstore domain)
5. Bridge function creates canonical shop records:
   a. Customer record (matched by email, created if new)
   b. Order (is_webstore_order: true, webstore_order_id linked)
   c. OrderItem per cart item (production_required: true for physical products)
      - Maps WebstoreProduct.pricing_config → unit_price_cents
      - Maps WebstoreProduct.product_type → OrderItem.product_type
   d. JobTicket per OrderItem where production_required: true
   e. ProductionTasks per JobTicket (default tasks from stage config)
6. Shop sees new order in Orders list with "Webstore" badge

IMPORTANT: WebstoreProduct is the e-commerce catalog.
OrderItem is the production record. They are different things.
The bridge maps one to the other at checkout — they are never merged or shared.
```

**Know from day 1:**
- Cart is localStorage only until checkout confirmed — no cart table in DB
- Public storefront routes are **completely unauthenticated** — separate Express/FastAPI router with no auth middleware
- `store_slug` is unique globally (not just per tenant) — check on creation
- Stripe Connect: shop must complete Connect onboarding before creator stores go live — build the onboarding flow first
- Webstore products ≠ shop products/materials — they are entirely separate catalogs

---

## 13. Inventory & Materials

### Data model
```
InventoryItem       (the catalog record — "Cast Vinyl 54-inch Roll")
└── InventoryLot    (a physical batch — "Roll #3, received 2025-06-01, 1500ft remaining")
    └── InventoryTransaction  (ledger entries — receipts, pulls, waste, adjustments)
```

### TrackingMethod
```python
"quantity"   # simple count (hardware, grommets)
"roll"       # width_inches + remaining_length_inches
"sheet"      # sheet_width_inches × sheet_height_inches × quantity
"remnant"    # off-cut piece with specific dimensions
"pack"       # quantity in pack_size units
```

### Balance calculation (always computed from ledger)
```python
on_hand    = sum(quantity_on_hand for lot in lots where is_active)
reserved   = sum(reserved_quantity for lot in lots)
available  = on_hand - reserved
inventory_value = sum(qty × unit_cost for lot in lots)
```
**Never mutate `quantity_on_hand` directly** — always insert a transaction, then update the lot.

### Material requirements → job ticket link
```python
{
  ticket_id: uuid,
  inventory_item_id: uuid,
  required_quantity: float,
  required_width_inches: float | None,
  required_length_inches: float | None,
  status: "open|reserved|pulled|consumed|shortage",
}
```

### Shortage handling
If `available < required_quantity`, create an `InventoryShortage` record and link it to the requirement. Shortages surface in the dashboard "Action Required" card and can be converted into a PO line item.

**Know from day 1:**
- **Build the inventory shell early** — models, permissions, routes (returning empty lists), and the `inventory_items` collection must exist before the dashboard digest runs or it will error. Full ledger functionality (lot tracking, reservations, shortages) comes after core is stable.
- `InventoryItem.pricing_material_key` links to a Pricing Foundation material key — this is how cost flows from purchasing to pricing automatically
- Roll tracking: when a roll is partially consumed, create a new "remnant" lot from what's left
- Cycle count adjusts the lot's `quantity_on_hand` and inserts a `cycle_count_adjustment` transaction
- All monetary values stored as **integer cents** (unit_cost_cents, inventory_value_cents)

---

## 14. Purchasing (POs & Vendors)

### Vendor
```python
{
  name: str,
  website: str,
  account_number: str,
  contact_name: str,
  email: str,
  phone: str,
  default_shipping_notes: str,
}
```

### PurchaseOrder
```python
{
  po_number: "PO-0012",
  vendor_id: uuid,
  status: "draft|sent|acknowledged|partial|received|cancelled",
  lines: [
    {
      inventory_item_id: uuid,
      supplier_sku: str,
      description: str,
      ordered_quantity: float,
      unit: str,
      unit_cost: float,
      received_quantity: float,     # updated on receipt
      shortage_ids: [uuid],         # shortages this line resolves
    }
  ],
  expected_delivery_date: iso_string,
  notes: str,
  sent_at: iso_string | None,
}
```

### PO receipt flow
```
Receive PO → for each line:
  1. Create an InventoryLot (new physical stock)
  2. Insert a "receipt" InventoryTransaction
  3. Update lot.quantity_on_hand
  4. Mark shortage as "resolved" if linked
  5. Update PO line received_quantity
  6. If all lines received → PO status = "received"
```

---

## 15. Production Board

### Kanban configuration
```python
# Stored in tenant settings — not hardcoded
production_stages = [
  { key: "intake", label: "Intake", color: "#6366f1", order: 1 },
  { key: "prepress", label: "Prepress", color: "#f59e0b", order: 2 },
  { key: "printing", label: "Printing", color: "#3b82f6", order: 3 },
  { key: "finishing", label: "Finishing", color: "#8b5cf6", order: 4 },
  { key: "ready", label: "Ready", color: "#10b981", order: 5 },
  { key: "delivered", label: "Delivered", color: "#6b7280", order: 6 },
]
```

### View modes
- **Task view**: each card = one production task
- **Rollup view**: each card = one job ticket, showing aggregated progress across all its tasks

### Card data (rollup mode)
```python
{
  ticket_id: uuid,
  ticket_name: str,
  ticket_number: str,
  ticket_priority: str,
  production_stage: str,
  __rollup_total_steps: int,
  __rollup_completed_steps: int,
  assigned_to_name: str,
  ticket_due_date: iso_string,
  materials_link: "/job-tickets/{id}?tab=materials",
}
```

**Know from day 1:**
- Stage config is in Settings → Production — build that settings page before the board
- Drag-and-drop updates `production_stage` on the task (not ticket) in task view, on the ticket in rollup view
- "Materials" button on each card deep-links to the Materials tab of the job ticket

---

## 16. Artwork Proofs

### Flow
```
1. Upload artwork files to job ticket
2. Generate proof PDF (combine artwork + order details)
3. Send proof to customer via email with approval link (signed token URL)
4. Customer approves or requests revision (unauthenticated endpoint)
5. Status updates, activity log entry created, shop notified
```

### Proof record
```python
{
  ticket_id: uuid,
  order_id: uuid,
  customer_id: uuid,
  version: int,               # increments on each revision
  status: "draft|sent|approved|revision_requested|expired",
  file_url: str,              # stored proof PDF/image
  approval_token: str,        # signed token for customer link
  token_expires_at: iso_string,
  sent_at: iso_string,
  responded_at: iso_string | None,
  customer_notes: str,        # revision request notes from customer
}
```

**Know from day 1:**
- Approval link is unauthenticated — `/proofs/approve/{token}` — no login required for customers
- Token must have expiry and be stored in DB (not purely JWT) so it can be invalidated
- Revision request creates a new proof version, increments `version`, old proof archived
- Dashboard "Action Required" card shows count of proofs awaiting approval

---

## 17. Team, Timeclock & Payroll

### Staff record
```python
{
  user_id: uuid,           # links to auth user
  employee_id: str,        # "EMP-001" — tenant-scoped
  hourly_rate: float,
  pay_type: "hourly|salary",
  department: str,
  hire_date: iso_string,
  is_active: bool,
}
```

### Timeclock entry (immutable log)
```python
{
  user_id: uuid,
  clock_in: iso_string,
  clock_out: iso_string | None,
  break_minutes: int,
  total_hours: float,          # computed: (clock_out - clock_in - breaks) / 3600
  status: "active|completed|edited",
  edited_by_id: uuid | None,   # if manager adjusted
  notes: str,
}
```

### Payroll
```python
PayPeriod:
{
  period_type: "weekly|biweekly|semi_monthly",
  start_date: iso_string,
  end_date: iso_string,
}

PayrollRun:
{
  pay_period: PayPeriod,
  status: "draft|finalized",
  finalized_at: iso_string | None,
  lines: [
    {
      user_id: uuid,
      employee_name: str,
      regular_hours: float,
      overtime_hours: float,
      hourly_rate: float,         # snapshot at time of run
      gross_pay: float,
    }
  ],
}
```

**Know from day 1:**
- Timeclock entries are **append-only** — never edit in place. Add an `edited` record if correction needed
- Payroll run is a **snapshot** — once finalized, rates/hours are frozen even if employee rate changes later
- Pay period config is in tenant settings — build it there on day 1
- Overtime rule: hours > 40 in a week = overtime at 1.5×. Keep this configurable per tenant

---

## 18. AI Tools

### Tool catalogue
| Tool | Input | Output |
|---|---|---|
| Document Composer | Prompt + context | Long-form document |
| Business Copywriter | Business type + goal | Marketing copy |
| Blog Creator | Topic + keywords | Blog post |
| Email Template | Type + recipient context | Email draft |
| Job Post Creator | Job title + requirements | Job listing |
| Social Media Creator | Platform + topic | Social post variants |

### Shared document model
```python
{
  name: str,
  content: str,                # the generated text
  file_url: str | None,        # if converted to PDF/DOCX
  file_type: str | None,
  tags: [str],                 # includes tool name: "document_composer", "ai-generated"
  linked_to_id: uuid | None,   # order, customer, or quote
  linked_to_type: str | None,  # "order" | "customer" | "quote"
  word_count: int,
  credits_used: int,
}
```

### Credit system
```python
# Each tenant has a credit balance
# Each AI call deducts credits (configured per model/tool)
# Balance stored in tenant record
# Transaction log in ai_credit_transactions collection
CreditTransaction:
{
  tenant_id: uuid,
  amount: float,          # negative = deduction, positive = purchase
  balance_after: float,
  tool: str,
  document_id: uuid | None,
  description: str,
}
```

**Know from day 1:**
- **Build the AI Hub shell early** — the app is called SignGuy *AI*, the AI identity should be visible from day 1. Build the hub page, tool list, and navigation early. Activate AI-mutating actions (generation, credit deduction) after core workflows are stable.
- Check credit balance BEFORE making the LLM call — fail fast with 402 if insufficient
- All tools share the same document output model — build it once
- `linked_to_id` + `linked_to_type` from day 1 so AI docs can be attached to any entity
- Use streaming responses for long generations — improves perceived performance significantly

---

## 19. Communications & Meta Messenger

### Email templates (define all upfront)
```python
EMAIL_TEMPLATES = {
  "proof_ready": "Your proof is ready for review",
  "invoice_sent": "Invoice #{number} from {shop_name}",
  "invoice_overdue": "Invoice #{number} is overdue",
  "payment_received": "Payment confirmation",
  "order_confirmed": "Your order has been confirmed",
  "order_ready": "Your order is ready for pickup",
  "quote_sent": "Quote #{number} from {shop_name}",
  "quote_accepted": "Quote #{number} accepted",
}
```

### Conversation (Meta Messenger)
```python
{
  platform: "messenger|instagram",
  external_conversation_id: str,    # Meta's thread ID
  customer_id: uuid | None,         # linked if matched by email/phone
  customer_name: str,
  shop_unread_count: int,            # increment on inbound, reset on shop reply
  last_message_at: iso_string,
  messages: [
    {
      direction: "inbound|outbound",
      content: str,
      sent_at: iso_string,
      sent_by_id: uuid | None,       # staff user if outbound
      meta_message_id: str,
    }
  ]
}
```

**Know from day 1:**
- **Build portal route boundaries and auth early** — `/portal/...` routes, portal JWT (separate from staff JWT), and the "You don't have access" screens should exist from the start. Activate portal features (proof approval, invoice payment, webstore owner view) as their dependencies land.
- `shop_unread_count` on every conversation — this drives the dashboard badge and digest count
- Meta webhook verification must be set up before any message can be received — do this first
- Communication logs go on BOTH customer record AND order record when linked

---

## 20. Payments & Stripe

### Two completely separate Stripe contexts

**Context 1: Direct shop payments (invoices)**
```python
# Setup: one Stripe account for the shop
# Customer pays invoice → Stripe PaymentIntent
# Webhook: payment_intent.succeeded → mark invoice paid

stripe_customer_id  # on Customer record
stripe_payment_intent_id  # on Invoice record
```

**Context 2: Webstore marketplace (Stripe Connect)**
```python
# Setup: platform Stripe account + Connected Account per shop owner
# Customer buys from webstore → charge goes to platform → distributed to shop minus fee
# Webhook: account.updated, payment_intent.succeeded (with account header)

stripe_connect_account_id  # on Tenant record (shop owner's connected account)
platform_fee_percent: 5    # platform takes this % of each webstore sale
```

**Know from day 1:**
- Webhook handler must check `stripe-account` header to distinguish which context the event belongs to
- Connect onboarding is a multi-step flow — build the "Connect your Stripe" page in Settings before building webstores
- Store `stripe_payment_intent_id` on invoices from day 1 — enables refund flows later
- Payment link (unauthenticated invoice payment) uses a short-lived signed token, not the invoice ID

---

## 21. Reports & Analytics

### Available metrics
```python
# Time-series (daily/weekly/monthly)
revenue: sum of paid invoices
new_orders: count
orders_completed: count
average_order_value: revenue / new_orders

# Snapshots
outstanding_ar: sum of unpaid invoice balances
pipeline_value: sum of confirmed order totals not yet invoiced
top_customers: by lifetime_value
top_products: by order frequency
conversion_rate: quotes_accepted / quotes_sent

# Production
average_production_time: ticket created → stage "delivered"
on_time_delivery_rate: percent of tickets finished before due_date
```

**Know from day 1:**
- Never compute analytics in real-time for large date ranges — use a nightly aggregation job that writes to an `analytics_snapshots` collection
- Date ranges must be timezone-aware (user's shop timezone, stored in tenant settings)
- Platform admin needs cross-tenant aggregations — these run separately against all tenants

---

## 22. Dashboard

### Layout: 3-column grid, max 2-col span
```
[Ribbon: 12 action buttons — Create|Customer|Workflow groups    ]
[KPI Strip: Revenue · Orders · Quotes · AR · Unread             ]
[Action Required (2col) ] [Production Snapshot (1col)           ]
[Billing Snapshot (1col)] [Shop Health (1col)  ] [Onboarding(1col)]
```

### 12 Ribbon actions
```
Create:    New Order | New Quote | New Customer | Pricing Calc
Customer:  Send Proof | Request Approval | Send Document | New Invoice
Workflow:  Send Email | New Task | Schedule Install | Open Calendar
```

### Action Required card (most important)
Consolidates in priority order:
1. Proofs awaiting approval
2. Orders awaiting customer approval
3. Overdue invoices
4. Low stock items
5. AI-generated suggestions (nudges)

### Digest API (`GET /api/digest`)
Returns all dashboard data in ONE call. Runs all queries in parallel (`asyncio.gather`).
```python
{
  # Revenue — all as integer cents
  revenue_today_cents: int,
  revenue_mtd_cents: int,
  yesterday_revenue_cents: int,

  # Counts
  active_orders: int,
  pending_quotes: int,
  outstanding_ar_cents: int,
  pending_approvals: int,      # proofs + order approvals
  overdue_invoices: int,
  unread_messages: int,
  low_stock_count: int,
  inventory_shortages: int,

  # Module state — NEVER return null counts for inactive modules
  # Return 0 counts + list the active modules explicitly
  # Frontend uses modules_active to decide what to show
  modules_active: ["inventory", "webstores", "ai_tools", "payroll", ...],
}
```
**Rule:** Always return `0` for inactive module counts. Include `modules_active` array so the frontend knows which module cards to render. Never return `null` for a count — frontend treats null and 0 differently and it causes bugs.

**Know from day 1:**
- One API call for all dashboard data — never make 6 separate calls on dashboard load
- All KPI cards use the same card component with a top-border accent color — no large colored backgrounds
- Ribbon is the same component pattern as the Webstores ribbon

---

## 23. Settings

### Settings sections
```
General          → shop name, address, timezone, logo, phone, email
Production       → configure kanban stages (key, label, color, order)
Pricing          → Pricing Foundation per category
Billing          → tax rates, payment terms, invoice prefix, due days
Notifications    → which email triggers are on/off
Integrations     → Stripe Connect, SendGrid API key, Meta app config
Team             → default roles, pay period config, overtime rules
Webstores        → global store settings, platform fee config
```

**Know from day 1:**
- Production stage config lives in settings, not hardcoded — build this before the kanban board
- Pricing Foundation is a Settings sub-page (`/settings/pricing`), not a standalone app section
- **Frontend always gets ONE merged settings object** from `GET /api/settings` — a single read, cached in AuthContext. Backend may store settings in domain-specific sub-documents or collections, but the merge function (`get_merged_settings(tenant_id)`) is one explicit function that combines them before returning. Never let routes call multiple `find_one`s for settings independently.
- The merge function is defined in `services/settings_service.py` and called by every settings route — build it day 1.

---

## 24. Platform Admin

### What it is
Root-level admin panel only accessible to `platform_creator` and `platform_admin` roles. Completely separate from the main app. Routes: `/platform-admin/...`

### Features
```
Tenants list    → all shops, status, plan, created date, ARR
Tenant detail   → users, settings, feature flags, usage metrics
Impersonate     → "Act as this tenant" (sets X-Impersonate-Tenant header)
Delete tenant   → cascades ALL associated data (irreversible)
Analytics       → cross-tenant revenue, signups, churn, feature usage
Onboarding      → per-tenant checklist of setup steps completed
```

### Impersonation
```python
# In get_current_active_user dependency:
impersonate_header = request.headers.get("X-Impersonate-Tenant")
if impersonate_header and user.role in ("platform_creator", "platform_admin"):
    # Override tenant_id for this request only
    user.tenant_id = impersonate_header
```

### Tenant deletion cascade order
```python
collections_to_delete = [
  "production_tasks", "job_tickets", "order_line_items", "orders",
  "invoice_line_items", "invoices", "payment_transactions", "quotes",
  "artwork_proofs", "documents", "customers", "conversations",
  "webstores", "webstore_orders", "webstore_products",
  "inventory_transactions", "inventory_lots", "inventory_items",
  "inventory_locations", "inventory_vendors", "purchase_orders",
  "inventory_shortages", "material_requirements",
  "timeclock_entries", "payroll_runs", "staff",
  "ai_credit_transactions", "tenant_settings",
  "users",    # last
]
```

---

## 25. UI/UX System

### Design tokens (CSS variables)
```css
:root {
  --surface: #ffffff;
  --surface-2: #f9fafb;
  --border-light: #e5e7eb;
  --text: #111827;
  --text-muted: #6b7280;
  --accent: #4f46e5;         /* primary brand color */
  --accent-hover: #4338ca;
}
```

### Component hierarchy
```
Shadcn/UI primitives (never modify)
  ↓
App-specific base components (Button variants, Input variants)
  ↓
Domain components (OrderCard, TicketRow, InventoryItem)
  ↓
Page layouts
```

### Ribbon pattern (reuse everywhere)
```jsx
// RibbonButton: min-w-[68px], h-14, icon h-5 w-5, label text-[11px]
// RibbonGroup: label text-[10px] uppercase tracking-wide text-gray-400
// RibbonDivider: 1px vertical line
// Ribbon container: h-14 bg-white border-b border-gray-100

// Used in: Dashboard, Webstores, (any future section)
// SAME dimensions, SAME button style — always
```

### Card pattern (no large colored backgrounds)
```jsx
// Cards: bg-white, border border-gray-100, rounded-xl, shadow-sm
// Accent: 3px top border only — color signals category, not background
// Text hierarchy: font-semibold for labels, text-muted for values
// Spacing: p-4 for cards, gap-3 for sections
```

### Typography
```
H1: text-4xl sm:text-5xl lg:text-6xl  (landing pages only)
H2: text-base md:text-lg              (section headings)
Body: text-sm
Small/Accent: text-xs
```

### Icons: lucide-react only (never emoji as icons)

### Toast: Sonner only — `import { toast } from 'sonner'`

---

## 26. API Design Rules

### Response shapes
```python
# List endpoints
{ "items": [...], "total": int, "page": int, "limit": int }

# Single item
{ ...item_fields }

# Create/Update
{ ...created_or_updated_item }

# Delete
{ "success": true, "id": "uuid" }

# Error
{ "detail": "Human readable error message" }
```

### Route naming
```
GET    /api/{resource}              → list
POST   /api/{resource}              → create
GET    /api/{resource}/{id}         → get one
PUT    /api/{resource}/{id}         → full update
PATCH  /api/{resource}/{id}         → partial update
DELETE /api/{resource}/{id}         → delete
POST   /api/{resource}/{id}/action  → trigger an action (e.g. /invoices/123/send)
```

### Pagination defaults
```python
limit: int = Query(default=50, le=200)
skip: int = Query(default=0, ge=0)
```

### Never
- Return MongoDB `_id` in any response
- Use `datetime.utcnow()` (use `datetime.now(timezone.utc)`)
- Put business logic in route handlers — use service functions
- Return raw dict from DB — always validate through a Pydantic model

---

## 27. File & Asset Storage

### File types per domain
```
Job tickets:     design files (.ai, .pdf, .eps, .png), customer artwork
Proofs:          proof PDFs, approval screenshots
AI documents:    generated .docx, .pdf exports
Invoices:        PDF exports
Webstores:       product images, store logos
Tenant:          shop logo
```

### Storage structure
```
/{tenant_id}/
  /artwork/{ticket_id}/{filename}
  /proofs/{proof_id}/{filename}
  /documents/{doc_id}/{filename}
  /invoices/{invoice_id}/{filename}
  /webstores/{store_id}/{filename}
  /profile/{filename}
```

### File upload pattern
- Chunked upload for files > 5MB (bypass proxy limits)
- Store only the URL in DB, not the file content
- Generate signed URLs for private files (time-limited access)
- Accept: jpg, png, gif, pdf, eps, ai, svg, docx — validate MIME type server-side

---

## 28. Notification & Digest System

### Digest endpoint (dashboard data aggregator)
- Single `GET /api/digest` call returns all dashboard counts
- Runs async queries in parallel (asyncio.gather)
- Result is NOT cached — fresh on every dashboard load (fast enough with indexes)

### Email trigger events
```python
TRIGGER_EVENTS = {
  "proof.sent":            send "proof_ready" email to customer
  "invoice.sent":          send "invoice_sent" email to customer
  "invoice.overdue":       send "invoice_overdue" email (scheduler, daily check)
  "order.confirmed":       send "order_confirmed" email to customer
  "order.ready":           send "order_ready" email to customer
  "quote.sent":            send "quote_sent" email to customer
  "payment.received":      send "payment_received" email to customer
}
```

### Email on/off config (tenant settings)
```python
email_notifications = {
  "proof_ready": True,
  "invoice_sent": True,
  "invoice_overdue": True,
  "order_ready": True,
}
```

---

## 29. Feature Flags & Tier Gating

### Tiers
```python
TIER_FEATURES = {
  "starter":    ["orders", "customers", "invoices", "basic_reports"],
  "pro":        ["starter", "webstores", "ai_tools", "inventory", "payroll"],
  "founders":   list(ALL_FEATURES),  # everything, no gating
}
```

### Frontend gating
```javascript
// In AuthContext — reads from JWT or tenant settings
const { hasTierFeature } = useAuth();
if (!hasTierFeature('webstores')) return <UpgradePrompt />;
```

### Backend gating
```python
def require_feature(user: UserInDB, feature: str):
    if feature not in user.tier_features:
        raise HTTPException(402, "This feature requires a plan upgrade")
```

**Know from day 1:**
- Tier features are a SEPARATE concept from role permissions — permissions = what you can do, tier = what features your plan unlocks
- Founders Edition = all features forever — store this as a flag on the tenant: `is_founder: true`
- `BYPASS_TIER_GATE=true` env var for local dev/preview environments

---

## 30. Deployment & Environments

### Environment variables (complete list)
```bash
# Backend (.env)
MONGO_URL=mongodb://...
DB_NAME=signguy_ai
JWT_SECRET_KEY=...
PLATFORM_CREATOR_EMAIL=your@email.com
SENDGRID_API_KEY=SG....
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...
OPENAI_API_KEY=...         # or Emergent LLM key
OBJECT_STORAGE_URL=...
OBJECT_STORAGE_KEY=...
OBJECT_STORAGE_SECRET=...
OBJECT_STORAGE_BUCKET=...

# Frontend (.env)
REACT_APP_BACKEND_URL=https://ai-cost-audit.preview.emergentagent.com
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_...
REACT_APP_META_APP_ID=...
```

### Two environments
- **Preview** (Emergent): development, hot reload, test data
- **Production** (`signguy-ai.com`): live, deployed via Emergent deploy button

### Services (supervisor-managed)
```
Backend:  0.0.0.0:8001  (FastAPI via uvicorn)
Frontend: 0.0.0.0:3000  (React via CRA)
MongoDB:  localhost:27017
```

### Route routing rule
- `/api/*` → backend :8001
- Everything else → frontend :3000

---

*Generated: 2026-06-10 | SignGuy AI Rebuild Reference*
*Version: 2.0 — 15 conflict resolutions applied from Conflict Resolution Worksheet*
*Use alongside FEATURE_RELEASE_MAP.md for staged release planning*

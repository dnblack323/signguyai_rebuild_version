# SignGuy AI — Webstore Module Master Rebuild Specification
## Protected Behavior Document

> Built from current-state audit, rebuild warnings, proposed behavior spec, simplified owner questionnaire, documentation checklist, and latest owner override rules.

| Document Field | Value |
|---|---|
| Primary purpose | Define exactly how Webstores must work before rebuild coding begins. |
| Protected status | Once approved, this document becomes protected behavior. Changes require explicit approval. |
| Final store types | B2B, Fundraiser, Event, Promotional, Employee, General. Legacy Creator maps into Promotional. |
| Major latest overrides | Store-specific catalogs, shared product templates, top nav/ribbon with 12 actions, Stripe-gated publish/checkout, owner terms approval, direct Stripe owner payout. |
| Money rule | All stored money uses integer cents. No float dollars in storage. |
| Order rule | Webstore checkout creates canonical orders, order items, and production visibility. |

> **APPROVAL WARNING:** Do not let a coding agent start building Webstores from memory, vibes, or whatever "quick implementation" nonsense it suggests. This document is the source of truth.

---

## 1. Executive Summary

The Webstore module is a core value loop for SignGuy AI. It touches customers, owner portals, store setup questionnaires, products, Stripe Connect, payments, payouts, communication templates, canonical orders, production workflow, reporting, dashboard counts, and audit logs. It must be rebuilt early only after this protected specification is approved.

- Webstores are not a late add-on hidden in the corner like a feature nobody wants to maintain.
- The module must reuse shared app systems: customers, orders, order items, product templates, files, email/SMS/MMS, Stripe, activity logs, notifications, dashboard digest, permissions, and settings.
- Each webstore has its own store-specific product catalog. There must not be one giant shared "webstore product catalog" where all stores dump their products together.
- The app may include a universal product/template library for common items and bundles, such as T-shirts, hoodies, decals, hats, spirit packs, employee uniform kits, and other reusable templates. Templates are copied into a store, then edited per store.
- Users should be able to create draft stores and explore the UI even when Webstores is not activated, but publishing and shopping cart/checkout must be blocked until the Webstore module is active and Stripe Connect requirements are satisfied.
- Store owners receive money directly through Stripe Connect. The platform should not hold owner funds unless explicitly redesigned later.

---

## 2. Final Owner Override Rules

| Rule | Final Decision | Implementation Impact |
|---|---|---|
| Navigation and ribbon | Webstores must use the same top navigation plus ribbon pattern as the rest of the app. The ribbon shows 12 action items with icons under the selected top tab. | Frontend layout must not invent a separate webstore navigation style. Keep ribbon compact and consistent. |
| Store-specific catalog | Each webstore owns its own product catalog. | Products are editable per store. A product copied from a template becomes a store product record. |
| Universal templates | Use a shared product/template catalog for common products and bundles used across Webstores and the main app. | Templates are not live webstore products. They are starting points for store products, estimates, quotes, orders, bundles, and repeat item setup. |
| Final store types | B2B, Fundraiser, Event, Promotional, Employee, General. | Legacy Creator behavior maps into Promotional, especially for race car drivers, creators, artists, athletes, performers, and public brands. |
| Donations | Fundraiser, Event, Promotional, Employee, General, and B2B can all support donations when enabled. Fundraisers get strongest donation defaults. | Donation support is a capability, not a hard-coded store type monopoly. |
| Setup flow | Collect basic info, send welcome email and questionnaire, receive answers, admin reviews, admin builds products/store, owner approves. | Questionnaire is universal core plus one short store-type section. |
| Standalone or add-on | Webstores must work as a standalone purchasable module or as an add-on to the main app. | Use feature flags and module entitlements. UI can remain visible in demo/draft mode. Publish/checkout are gated. |
| Activation gate | Users can create draft stores and play with UI, but cannot publish or sell unless Webstores is active and Stripe Connect is ready. | Disable Launch and Checkout with clear activation requirements. |
| Platform fee add-on | If Webstores is added to the main app, charge the existing payment/platform fee plus an additional 2% Webstore platform fee. | If app fee is 2%, Webstore add-on checkout becomes 4% platform fee total, before Stripe processing. |
| Platform fee standalone | Recommended standalone Webstore platform fee: 5% of eligible checkout amount. | Eligible amount should include product subtotal, donations, and store service fees, but exclude sales tax and refunded amounts. |
| Owner terms approval | Owner approval must also include acceptance of webstore terms, platform fees, payout terms, production/fulfillment rules, and dispute-related policies. | Approval record must store terms version, fee summary, approver name/email/IP/time, and store snapshot reference. |
| Template terms | Terms and emails should use templates with placeholders filled by tenant branding, store owner name, store name, fee values, dates, payout info, and contact info. | Use shared document/template engine. Never hard-code legal/business text into components. |
| Direct Stripe payout | Store owner should receive money directly from Stripe when owner payouts apply. | Use Stripe Connect destination/transfer logic. Avoid platform-held funds by default. |

---

## 3. Webstore Navigation and Ribbon Specification

The Webstore module should feel like it belongs inside SignGuy AI, not like a random ecommerce iframe taped to the dashboard. Use the same top navigation and compact Microsoft-style ribbon pattern already chosen for the rebuild.

### 3.1 Webstore Top Navigation Tabs

| Top Tab | Purpose | Notes |
|---|---|---|
| Home | Webstore module dashboard and action-required summary. | Shows active stores, approvals, questionnaires, launch blockers, recent orders, payouts, and setup reminders. |
| Stores | Store list and store detail management. | Filter by status, type, launch readiness, owner, and deadline. |
| Setup | Questionnaires, owner info, branding, launch checklist, approval flow. | Used before launch and for store changes. |
| Products | Store-specific products plus Add From Template. | Do not call this a global webstore catalog. Each store has its own products. |
| Templates | Shared product and bundle templates used across the app. | Universal templates for T-shirts, hoodies, decals, bundles, employee packs, etc. |
| Orders | Webstore-originated orders and production handoff. | Filters into main Orders too. |
| Payments | Stripe Connect, platform fees, owner payouts, failed transfers. | Owner money goes directly through Stripe when applicable. |
| Reports | Admin analytics and owner-visible summaries. | Reporting uses live aggregation for financial truth. |
| Owner Portal | Preview what the owner sees, send invite, review approvals. | Separate owner access. |
| Settings | Webstore module settings, templates, feature gates, fee rules. | Settings merge through one backend function. |

### 3.2 Default 12 Ribbon Action Items

The ribbon should show no more than 12 actions at a time. Icons sit above labels. These are the default Webstore Home ribbon actions; tabs may show contextual variants but must keep the compact 12-action rule.

| Group | Action | Icon Suggestion | Behavior |
|---|---|---|---|
| Create | New Store | Store + | Starts draft store creation. |
| Create | Duplicate Store | Copy | Copies an existing store into draft, excluding live orders/payments. |
| Setup | Send Questionnaire | Envelope | Emails universal questionnaire plus store-type section. |
| Setup | Review Answers | Clipboard | Opens questionnaire review, AI summary, missing info. |
| Products | Add Product | Shirt + | Adds store-specific product manually. |
| Products | Add From Template | Template | Copies a shared product/bundle template into the store. |
| AI | Generate Descriptions | Sparkle Pen | Creates editable product descriptions from product/store context. |
| Review | Preview Store | Eye | Opens staff preview mode. Logs preview access. |
| Review | Send Owner Review | Send | Sends owner approval link and terms approval. |
| Launch | Launch / Pause / Close | Rocket / Pause | Runs launch checks, then launches, pauses, or closes. |
| Orders | View Orders | Receipt | Shows webstore orders with filters and main order links. |
| Share | QR Code / Share | QR | Displays store QR, link, printable snapshot, and promo sharing tools. |

---

## 4. Section A — Domain Knowledge

### 4.1 Final Store Type Definitions

| Store Type | Definition | Behavior Differences |
|---|---|---|
| B2B | For businesses, organizations, schools, teams, clubs, departments, or repeat buyers needing a controlled ordering page for approved products. | May be public, private, password protected, invite-only, priced specially, require PO numbers, require manager approval, use department grouping, or stay open year-round. |
| Fundraiser | For teams, schools, families, nonprofits, clubs, causes, or organizations raising money through product sales and optional donations. | Strongest donation support, optional goal/progress bar, deadline, reporting, supporter grouping, fundraiser story, owner/fundraiser share. |
| Event | For a specific event with dates, location, order deadline, pickup rules, QR promotion, and limited-time merchandise. | Event name/location/date, order deadline, auto-close, late-order handling, pickup at event, optional donations and fundraiser capabilities. |
| Promotional | For a person, brand, race car driver, creator, artist, performer, athlete, team, influencer, or public-facing personality selling merch to promote themselves. | Public brand story, social links, sponsor logos, featured products, promo codes, optional donations, owner share reporting. Legacy Creator maps here. |
| Employee | For companies that want employees to order approved uniforms, workwear, safety apparel, and branded employee items. | May be private/password protected, company-paid or employee-paid, manager approval, department/job-role grouping, required vs optional uniform items. |
| General | Flexible default for stores that do not fit another type. | Basic setup, product catalog, checkout, owner approval, basic reporting, optional promo codes, optional donations, optional close date. |

### 4.2 Lifecycle Model: Statuses and Setup Stages

There are two related concepts: store status and setup stage. Store status is the business-facing state stored on the store. Setup stages are computed progress checkpoints used for admin and owner progress display. Do not smash these into one field, because that is how state machines turn into soup.

#### 4.2.1 Approved Webstore Status Enum

| Stored Status | Meaning | Primary Trigger |
|---|---|---|
| `draft` | Store exists but is not ready for owner review. | Admin creates initial store. |
| `questionnaire_sent` | Questionnaire was emailed to owner/contact. | Admin sends questionnaire. |
| `questionnaire_received` | Owner submitted questionnaire answers. | Owner submits questionnaire. |
| `setup_in_progress` | Admin is building/editing store. | Admin begins setup or applies answers. |
| `owner_review_pending` | Store was sent to owner for final review. | Admin sends owner review link. |
| `changes_requested` | Owner requested changes before approval. | Owner submits change request. |
| `stripe_onboarding_pending` | Store is otherwise ready but Stripe payout setup is incomplete. | Launch check detects Stripe incomplete. |
| `ready_to_launch` | Store is approved and ready to go live. | Owner approves and launch checks pass. |
| `live` | Store is accessible to buyers and accepting orders. | Admin launches. |
| `paused` | Store is temporarily unavailable; checkout disabled. | Admin pauses or system restriction. |
| `closed` | Store is done taking orders; data/reporting remain. | Admin/system closes. |
| `archived` | Store hidden from active views but retained. | Admin archives closed/completed store. |
| `cancelled` | Setup was cancelled before launch. | Admin cancels draft/setup store. |

#### 4.2.2 15-Stage Setup Lifecycle

| # | Stage Key | Meaning | Computed or Stamped | Trigger / Rule | Actor |
|---|---|---|---|---|---|
| 1 | `setup_received` | Store setup started. | Computed | Store record exists. | System |
| 2 | `questionnaire_sent` | Questionnaire sent to owner. | Computed/status | Questionnaire send event exists or status questionnaire_sent. | Admin/System |
| 3 | `questionnaire_submitted` | Questionnaire submitted. | Computed | Response exists and response_count > 0. | Owner |
| 4 | `waiting_artwork` | Waiting on logo/artwork or assets. | Computed | Required branding/artwork missing. | System |
| 5 | `store_being_built` | Admin is building store. | Computed/status | Status setup_in_progress or products/branding started. | Admin |
| 6 | `products_being_added` | Store products are being added. | Computed | At least one store product exists. | Admin |
| 7 | `pricing_review` | Product prices, costs, owner share, platform fee reviewed. | Computed | Products have pricing data and review flag pending/complete. | Admin |
| 8 | `preview_ready` | Preview is ready for owner. | Stamped | preview_ready_at set only after stages 1–7 valid. | Admin |
| 9 | `owner_review_sent` | Owner review was sent. | Stamped/event | owner_review_sent_at or owner review event. | Admin |
| 10 | `owner_approved` | Owner approved store and terms. | Stamped/record | Approval record created with terms acceptance. | Owner |
| 11 | `stripe_ready` | Stripe onboarding/Connect ready if needed. | Computed | Charges/card payments and transfers/payout state meets launch rule. | System/Owner |
| 12 | `store_live` | Store live and accepting checkout. | Status | Status live and module entitlement active. | Admin/System |
| 13 | `orders_coming_in` | At least one order placed. | Computed | Order count >= 1. | Buyer/System |
| 14 | `production_started` | Production has begun. | Stamped/computed | Production status changed or production_started_at stamp. | Admin/Production |
| 15 | `completed` | Store/order lifecycle completed. | Status/stamped | Store closed/archived or completed_at set after required flow. | Admin/System |

**Stage rules:**
- Admin stamps must be validated in sequence. Do not allow `production_started_at` before owner approval or launch readiness.
- Every status or stage stamp change must create an immutable event/audit log.
- Computed stages should be recalculated from live data. Store a `stage_snapshot_at` timestamp for debugging stale UI.

### 4.3 Owner vs Staff Access Split

| Party | Identity/Auth | Can Do | Cannot Do |
|---|---|---|---|
| Shop Admin | Main app staff auth with admin permissions. | Create/edit stores, manage products, send questionnaires, launch/pause/close, view all store analytics, configure fees/settings, manage Stripe status visibility. | Should not bypass protected launch checks without logged override. |
| Shop Staff | Main app staff auth with limited permissions. | View stores/orders, assist production, view pickup/shipping details, edit products only if permitted. | Cannot change locked settings, fees, owner payout rules, or launch without permission. |
| Store Owner | Separate owner portal auth or single-use magic link. | Complete questionnaire, upload files, review preview/products/prices, approve store, request changes, view simplified analytics, access QR code, complete Stripe onboarding. | Cannot see internal cost, margin, supplier data, tenant-wide data, other stores, or locked settings. |
| Public Buyer | Unauthenticated storefront/cart/checkout. | View live public stores, add products to cart, checkout, receive confirmation. | Cannot access draft/pending stores, owner data, admin data, costs, payout fields, tenant identity, or internal IDs. |

### 4.4 Locked Settings Definition

Locked settings are shop/admin-controlled values that determine costs, fees, pricing, owner share rules, payout rules, and store behavior. Store owners can review terms and owner-visible summaries, but they must never modify locked settings directly.

| Locked Setting | Owner Can See? | Owner Can Edit? | Why Locked |
|---|---|---|---|
| `production_cost_cents` / `base_item_cost_cents` | No | No | Exposes internal cost/margin and can break profit calculations. |
| `retail_price_cents` / `selling_price_cents` | Yes during approval | No, except requesting changes | Controls public pricing and reporting. Admin owns final pricing. |
| `owner_share_type/value/cents` | Yes summary | No, except request changes | Controls payout liability and fee terms. |
| `platform_fee_type/value/cents` | Yes in terms/fee summary | No | Business policy and billing rule. |
| `profit_split` / fundraiser allocation | Yes if applicable | No, except request changes | Affects payout accounting and fundraiser reporting. |
| `shipping/handling fee settings` | Yes public-facing label/amount | No | Must match checkout/payment setup. |
| `tax settings` | May see charged tax | No | Compliance and payment calculation. |
| `Stripe account routing fields` | Status only | No | Payment routing and account security. |

### 4.5 Public vs Private Data Boundary

| Public Storefront May Return | Public Storefront Must Never Return |
|---|---|
| store id/slug, name, description, type, public status message | tenant_id, internal tenant identity, raw owner account details |
| branding: logo, banner, accent color, public header text | locked_settings, internal costs, margins, profit split, supplier data |
| public product names, images, descriptions, variants, prices | production_cost_cents, owner internal notes, admin-only product notes |
| event dates/location/deadline when public | admin-only timestamps except deadline/event dates |
| fundraiser goal/progress/donation prompt when enabled | payout_owed, payout_paid, owner Stripe account ID |
| shipping/pickup display instructions and public fees | internal fees, any field not explicitly in PublicStorefrontResponse allowlist |

**Rule:** Use a dedicated `PublicStorefrontResponse` Pydantic model with explicit field inclusion (allowlist), not exclusion (denylist).

---

## 5. Section B — Data Models

### 5.1 Core Webstore Document Fields

```
id                          uuid (primary key)
tenant_id                   uuid (shop that manages this store — always required)
store_type                  enum: b2b | fundraiser | event | promotional | employee | general
status                      enum: see §4.2.1
store_slug                  string (globally unique, immutable after creation, DB unique index required)
name                        string
description                 string
is_public                   bool
password_protected          bool
access_password_hash        string | null
owner_name                  string
owner_email                 string
owner_phone                 string | null
seo_title                   string
seo_description             string
og_image_url                string | null
created_at                  datetime (UTC)
updated_at                  datetime (UTC)
```

### 5.2 Branding Sub-document

```
branding.logo_url            string | null
branding.banner_url          string | null
branding.accent_color        string (hex)
branding.font                string
branding.header_text         string
branding.public_tagline      string | null
```

### 5.3 Financial Counters (Integer Cents — Cached Running Totals)

```
total_sales_cents            int  (cached — use live aggregation for reporting)
total_orders                 int
total_profit_cents           int
payout_owed_cents            int  (increments on order completed, decrements on reversal)
payout_paid_cents            int  (sum of recorded payouts)
```

> **Warning:** Cached counters can drift. Use live aggregation from `webstore_orders` for any financial reporting. `$inc` atomically for mutations, never read-modify-write.

### 5.4 Stripe Connect Fields

```
owner_stripe_account_id          string | null
owner_stripe_charges_enabled     bool
owner_stripe_payouts_enabled     bool
owner_stripe_details_submitted   bool
owner_stripe_capabilities        object | null  (full capabilities block from Stripe)
owner_stripe_requirements        object | null  (currently_due, past_due, etc.)
owner_user_id                    uuid | null
owner_portal_enabled             bool
```

### 5.5 Setup Milestone Timestamps (Stamped — Sequential Only)

```
questionnaire_sent_at        datetime | null
questionnaire_received_at    datetime | null
questionnaire_reviewed_at    datetime | null
preview_ready_at             datetime | null  (admin stamp — only valid after stages 1-7)
owner_review_sent_at         datetime | null
owner_approved_at            datetime | null
stripe_ready_at              datetime | null
production_started_at        datetime | null
completed_at                 datetime | null
stage_snapshot_at            datetime | null  (last time computed stages were evaluated)
```

### 5.6 Store-Type Specific Sub-documents

#### Fundraiser Settings (`fundraiser_settings`)
```
goal_cents                   int | null
start_at                     datetime | null
end_at                       datetime | null
fundraiser_profit_percent    float
allow_checkout_donations     bool
donation_amount_options_cents [int]
allow_custom_donation        bool
show_progress_bar            bool
show_total_raised_publicly   bool
show_supporter_names         enum: yes_with_permission | yes_all | no
total_donations_cents        int  (running total)
total_profit_allocated_cents int
manual_adjustments_cents     int
total_raised_cents           int  (donations + profit_allocation + manual)
fundraiser_cap_cents         int | null
include_donations_in_progress      bool
include_profit_allocation_in_progress bool
```

#### Event Settings (`event_settings`)
```
event_name                   string
event_type                   enum: one_time | annual | seasonal | recurring
event_start_at               datetime | null
event_end_at                 datetime | null
event_location               string | null
order_deadline_at            datetime | null
pickup_delivery_at           datetime | null
pickup_delivery_instructions string | null
auto_close_after_deadline    bool
allow_late_orders            bool
```

#### Promotional Settings (`promotional_settings`)
```
brand_story                  string | null
social_links                 {platform: url}
sponsor_logos_file_ids       [uuid]
featured_product_ids         [uuid]
creator_commission_type      enum: percentage | flat | none
creator_commission_value_cents int | null
```

#### B2B Settings (`b2b_settings`)
```
require_po_number            bool
require_manager_approval     bool
manager_email                string | null
department_grouping_enabled  bool
departments                  [string]
volume_discounts_enabled     bool
year_round                   bool
```

#### Employee Settings (`employee_settings`)
```
company_name                 string | null
access_mode                  enum: password | invite | open
payment_method               enum: employee_paid | company_paid | mixed
require_manager_approval     bool
manager_email                string | null
department_grouping_enabled  bool
required_items_enabled       bool
```

### 5.7 Webstore Product (Per-Store Catalog Item)

```
id                           uuid
webstore_id                  uuid
template_product_id          uuid | null  (source template if copied)
name                         string
description                  string
images                       [file_id]
category                     string
variants                     [WebstoreProductVariant]
is_enabled                   bool
is_featured                  bool
sort_order                   int
production_notes             string | null  (admin only — never public)
created_at                   datetime
updated_at                   datetime
```

**WebstoreProductVariant:**
```
id                           uuid
name                         string  (e.g., "Small / Red")
sku                          string | null
production_cost_cents        int     (LOCKED — admin only)
selling_price_cents          int     (admin-set, owner sees during review)
owner_share_type             enum: percentage | flat_cents | none
owner_share_value            int     (percent × 100 or flat cents)
platform_fee_cents           int     (computed at checkout — not stored pre-checkout)
inventory_count              int | null
is_enabled                   bool
size                         string | null
color                        string | null
image_file_id                uuid | null
```

### 5.8 Webstore Order

```
id                           uuid
webstore_id                  uuid
canonical_order_id           uuid | null  (set after bridge succeeds)
bridge_status                enum: pending | success | failed
bridge_error                 string | null
bridge_retried_at            datetime | null
customer_name                string
customer_email               string
customer_phone               string | null
items                        [WebstoreOrderItem]
subtotal_cents               int
donation_amount_cents        int
shipping_handling_cents      int
platform_fee_cents           int
grand_total_cents            int
total_cost_cents             int
total_profit_cents           int
owner_commission_cents       int
fundraiser_totals_applied    bool  (prevents double-counting on duplicate webhook)
status                       enum: pending | processing | completed | cancelled | refunded
payout_recorded_at           datetime | null
donor_consent                bool
idempotency_key              string | null
stripe_session_id            string | null
stripe_payment_intent_id     string | null
owner_transfer_id            string | null
owner_transfer_amount_cents  int | null
owner_transfer_at            datetime | null
pricing_snapshot             object  (locked_settings + fee_summary at time of purchase)
created_at                   datetime
```

**WebstoreOrderItem:**
```
product_id                   uuid
product_name                 string
variant_id                   uuid | null
variant_name                 string | null
quantity                     int
unit_price_cents             int
unit_cost_cents              int
item_total_cents             int
item_profit_cents            int
owner_share_cents            int
```

---

## 6. Section C — Business Logic Rules

### 6.1 Payout Accounting Rules

- `payout_owed_cents` increments via `$inc` when an order moves to `completed` AND `payout_recorded_at` is null.
- `payout_recorded_at` is set when the increment happens — this is the idempotency guard.
- On `cancelled` or `refunded`: decrement only if `payout_recorded_at` is set; then clear `payout_recorded_at`.
- Moving `cancelled → refunded` must not double-decrement. Check `payout_recorded_at` before each operation.
- `payout_paid_cents` increments when a manual or automatic payout is recorded. It never decrements.
- `net_pending_payout = payout_owed_cents - payout_paid_cents`

### 6.2 Fundraiser Total Accumulation

- `total_raised_cents = total_donations_cents + total_profit_allocated_cents + manual_adjustments_cents`
- `fundraiser_totals_applied` flag on the order prevents double-counting on duplicate Stripe webhook events.
- Only increment fundraiser totals when `fundraiser_totals_applied = false`; set it to `true` immediately after.
- Include donations in progress bar only when `include_donations_in_progress = true`.
- Progress bar is capped at 100% regardless of over-funding.

### 6.3 Idempotency Key Behavior

- Scope: per-store + per-customer-session (not globally unique across all stores).
- Window: enforce uniqueness within 1-hour window; ignore keys older than 2 hours.
- Implementation: TTL index with 2-hour expiry on `idempotency_key` field.
- On duplicate submission within window: return existing order, do not create duplicate.
- On key expiry: treat as new order.

### 6.4 Order Status State Machine

```
pending → processing → completed
                     ↘ cancelled
                     ↘ refunded
cancelled → refunded  (allowed; payout reversal must be idempotent)
```

**On `completed`:**
- Increment `payout_owed_cents` (if `payout_recorded_at` null)
- Set `payout_recorded_at`
- Trigger auto-transfer if applicable
- Update fundraiser totals (if `fundraiser_totals_applied` false)
- Log to `webstore_stage_events`

**On `cancelled` or `refunded`:**
- Decrement `payout_owed_cents` only if `payout_recorded_at` is set
- Clear `payout_recorded_at`
- Reverse fundraiser totals if applicable
- Log to `webstore_stage_events`

### 6.5 Commission Calculation

- **Promotional stores:** `commission_amount_cents` = `owner_share_value` (flat) or `item_total_cents × owner_share_percent / 100` per variant.
- **Fundraiser stores:** `profit_allocation_cents` based on `profit_allocation_type`:
  - `percentage`: `total_profit × fundraiser_profit_percent / 100`
  - `fixed_per_item`: `item_count × fixed_amount_per_item_cents`
  - `manual`: admin-set value, not auto-calculated
  - `na`: no allocation

### 6.6 Auto-Close Behavior

- When `auto_close_after_deadline = true` and `order_deadline_at` has passed:
  - A background job checks stores hourly.
  - If `now() > order_deadline_at` and store status is `live`, move to `closed`.
  - Log the auto-close to `webstore_stage_events`.
  - Do not auto-close if `allow_late_orders = true` (these two settings are mutually exclusive).

### 6.7 Locked Settings Override Rule

- Questionnaire `apply-safe-answers` maps answers to store fields.
- The mapping must be a **declarative config file** (JSON/YAML), not hard-coded Python.
- Every field write must validate: "Is this field in the allowed-to-write list?"
- Fields in `locked_settings` are categorically blocked from questionnaire overwrites.
- Support `?dry_run=true` mode that returns the proposed diff without saving.

---

## 7. Section D — Stripe Connect Integration

### 7.1 Full Account State Machine

| Stripe Field | Meaning | Required Action |
|---|---|---|
| `charges_enabled: false` | Cannot accept payments | Block store from going live |
| `payouts_enabled: false` | Can accept but cannot receive payouts | Allow sales, warn owner, hold funds |
| `details_submitted: false` | Onboarding incomplete | Show "Complete Stripe Setup" CTA |
| `requirements.currently_due` | Stripe needs more info | Show warning, generate refresh link |
| `requirements.past_due` | Account will be restricted | Urgent banner to owner |
| `capabilities.transfers: inactive` | Platform transfers blocked | Cannot auto-transfer commission |
| `capabilities.card_payments: inactive` | Cannot charge cards | Block checkout entirely |

> **Rule:** Refresh account status from Stripe on every admin-progress page load and owner portal load. Never rely solely on cached DB values.

### 7.2 Auto-Transfer Flow

1. Order moves to `completed`.
2. `owner_commission_cents > 0` and `owner_stripe_account_id` is set.
3. Check `owner_stripe_charges_enabled` and `capabilities.transfers = active`.
4. Create Stripe Transfer: amount = `owner_commission_cents`, destination = `owner_stripe_account_id`.
5. Store `owner_transfer_id`, `owner_transfer_amount_cents`, `owner_transfer_at` on the order.
6. **On failure:** Write to `failed_transfers` collection — never swallow silently.

### 7.3 Platform Fee at Checkout

- Platform fee is calculated at session creation and passed to Stripe.
- Platform fee = `grand_total_cents × platform_fee_percent / 100`.
- Stored on the order as `platform_fee_cents`.
- Eligible amount = product subtotal + donations + service fees (excludes tax, excludes refunded amounts).

### 7.4 Webhook Event Handling

- Events handled: `checkout.session.completed`, `account.updated`, `transfer.created`, `charge.refunded`.
- Idempotency: check `fundraiser_totals_applied` and `payout_recorded_at` before applying effects.
- Webhook must respond with 200 within 2 seconds. All heavy processing moves to background tasks.

### 7.5 Onboarding and Dashboard Links

- Onboarding link: generated via `POST /api/stripe-connect/create-account` or `POST /api/stripe-connect/refresh-link`.
- Dashboard link: single-use Express dashboard login via `GET /api/stripe-connect/dashboard-link`.
- Failed transfers visible at `GET /api/admin/failed-transfers` with retry at `POST /api/admin/failed-transfers/:id/retry`.

---

## 8. Section E — Checkout Flow

### 8.1 Full Checkout Sequence

```
1. Buyer visits GET /store/:slug  →  public storefront loads (allowlist response only)
2. Buyer adds to cart  →  client-side cart state
3. Buyer submits order  →  POST /api/storefront/:slug/checkout
   - Validate store is live and module entitlement is active
   - Validate idempotency key (reject duplicate within 1-hour window)
   - Create Stripe Checkout Session with line items + platform fee + donation options
   - Return Stripe session URL
4. Buyer redirected to Stripe-hosted checkout
5. Stripe sends webhook: checkout.session.completed
   - Background task: create WebstoreOrder record
   - Donation amounts captured from locked Stripe session metadata (NOT from client)
   - Create Customer record (upsert by email)
   - Set fundraiser_totals_applied = false initially, apply totals, set to true
   - Trigger canonical order bridge (background task)
   - Trigger auto-transfer if applicable (background task)
6. Buyer redirected to GET /api/storefront/:slug/order-confirmation/:orderId
```

### 8.2 Donation Capture Rule

Donations are captured from the locked Stripe session metadata, **NOT** from client-supplied values at finalize time. This prevents tampering.

### 8.3 Public Store Status Screens

| Store Status | What Buyer Sees |
|---|---|
| `draft` / `setup_in_progress` | Blocked (404 or "Coming Soon") |
| `owner_review_pending` | "Coming Soon" |
| `live` | Full storefront |
| `paused` | "Temporarily Unavailable" |
| `closed` | "Store Closed" |
| `archived` / `cancelled` | 404 |

### 8.4 Admin Preview Mode

- `GET /store/:slug?preview=true` — authenticated staff can view in any status.
- Logs preview access to `webstore_stage_events`.
- Never shown to public buyers.

### 8.5 Supporter Strip

- `GET /store/:slug/supporters` — returns recent donors.
- Respects `show_supporter_names`:
  - `yes_with_permission` → only names where `donor_consent = true`
  - `yes_all` → all supporter names
  - `no` → empty list

---

## 9. Section F — Owner Portal

### 9.1 Auth — Completely Separate System

- Owner portal users are in a separate collection from shop staff users.
- Separate JWT, separate session logic, no role overlap.
- **Never merge portal users with staff users.**
- Portal tokens: 24-hour TTL, rotatable (invalidate all sessions on email change).
- Magic link invite tokens: single-use, 48-hour expiry, `used_at` timestamp required.

### 9.2 Invite Types

| Type | How | Token Behavior |
|---|---|---|
| Quick magic link | Admin sends → owner clicks → lands on portal | Single-use, 48-hour expiry |
| Full portal signup | Admin sends → owner creates account | Invite token consumed on account creation |

### 9.3 Owner Onboarding Flow

```
1. Admin sends invite (quick or portal)
2. Owner clicks email link → token validated
3. Owner completes questionnaire (unauthenticated, token-scoped)
4. Owner creates portal account (if full invite)
5. Owner reviews store preview
6. Owner reviews products, prices, terms, fee summary
7. Owner approves (creates approval record with full snapshot)
8. Owner completes Stripe onboarding if applicable
9. Admin launches store
```

### 9.4 Financial Transparency Block (Owner Portal)

The owner portal shows a simplified financial view. Internal cost and margin data are NEVER shown.

```
gross_sales_cents            int   (total order subtotals)
total_orders                 int
donations_collected_cents    int
profit_allocation_cents      int
fundraiser_total_raised_cents int
payout_owed_cents            int
payout_paid_cents            int
net_pending_payout_cents     int
formula                      string  (plain-English explanation: "You earn X% of net sales...")
```

### 9.5 Owner Portal Endpoints

```
GET  /api/owner-portal/me
GET  /api/owner-portal/webstores/:token
POST /api/owner-portal/webstores/:token/approve
POST /api/owner-portal/webstores/:token/request-changes
GET  /api/owner-portal/webstores/:token/analytics
GET  /api/owner-portal/webstores/:token/qr-code
POST /api/owner-portal/webstores/:token/stripe-login-link
GET  /api/owner-portal/webstores/:token/transfers
```

---

## 10. Section G — Questionnaire System

### 10.1 Questionnaire Structure

- **Universal core questions** (sent to all store types): owner contact info, store purpose, branding assets, key dates, special requirements.
- **Store-type section** (one additional short section per type): e.g., Fundraiser gets goal/deadline questions; Event gets event details; Employee gets company/access questions.

### 10.2 Apply-Safe-Answers Mapping

Questionnaire answers map to store fields where safe. The mapping is defined in a **declarative config file**, not hard-coded Python.

| Questionnaire Answer | Maps To | Safe to Write? |
|---|---|---|
| "Event Name" | `event_settings.event_name` | Yes |
| "Event Date" | `event_settings.event_start_at` | Yes |
| "Fundraiser Goal Amount" | `fundraiser_settings.goal_cents` | Yes |
| "Show progress bar?" | `fundraiser_settings.show_progress_bar` | Yes |
| "Show supporter names?" | `fundraiser_settings.show_supporter_names` | Yes |
| "Allow checkout donations?" | `fundraiser_settings.allow_checkout_donations` | Yes |
| "Logo upload" | `branding.logo_url` | Yes |
| Product prices | `locked_settings.*` | **NEVER** |
| Platform fee | `locked_settings.*` | **NEVER** |
| Owner share | `locked_settings.*` | **NEVER** |

**Rules:**
- Mapping must be declarative JSON/YAML config, not hard-coded Python scattered across routes.
- Add dry-run mode: `POST /apply-questionnaire?dry_run=true` returns the proposed diff without saving.
- Per-field validation must block locked settings from owner/questionnaire overwrite.

---

## 11. Section H — Bridge to Canonical Orders

### 11.1 Bridge Output

A webstore checkout must create a canonical order in the main order system.

| Created/Updated Record | Required Mapping |
|---|---|
| Customer | Upsert by `customer_email`. Store name/phone and source `WEBSTORE_checkout`. |
| Order | `is_webstore_order = true`, `order_type = webstore`, `webstore_order_id`, `webstore_name`, `store_id`, `customer_id`, `payment_id`, `total_cents`, `status`. |
| OrderItem | One per WebstoreOrderItem. Map product name, variant, quantity, `unit_price_cents`, `item_total_cents`, production notes. |
| Work Order / Production Summary | Generated from order and order items. Use language **Work Order**, not Job Ticket, in the new app UI. |
| ProductionTasks | Default tasks from stage config or product template production steps. |
| Payment Record | Linked to order/store/customer with Stripe IDs and cents fields. |

### 11.2 Bridge Idempotency and Failure Handling

- Bridge must check for existing `canonical_order_id` and partial records before creating duplicates.
- `webstore_orders.bridge_status` is `pending`, `success`, or `failed`.
- Bridge runs as a **background task** after webhook responds quickly (within 2 seconds).
- If bridge fails: store `bridge_error` and retry every 15 minutes through a background job.
- Admin must see failed bridge alerts — invisible order failures are expensive little disasters.

---

## 12. Section I — Analytics and Reporting

### 12.1 Analytics Endpoint Output

| Block | Fields |
|---|---|
| summary | `total_revenue_cents`, `total_orders`, `pending_orders`, `completed_orders`, `total_profit_cents`, `shop_profit_cents`, `avg_order_value_cents` |
| payout_info | `total_owed_cents`, `total_paid_cents`, `pending_payout_cents`, `owner_share_rate_or_formula`, `payout_status` |
| sales_by_day | Last 14 days: `date`, `label`, `amount_cents`, `order_count` |
| top_products | Top 5: `product_id`, `name`, `quantity`, `revenue_cents` |
| fundraiser_metrics | `goal_cents`, `raised_cents`, `progress_percent` (capped at 100%), `days_remaining`, `donation_total_cents`, `profit_allocation_cents`. Null when not applicable. |
| operations | `orders_by_status`, `pickup_count`, `shipping_count`, `production_status_breakdown` |

### 12.2 Payout History

- `GET /api/webstores/:id/payouts` returns transfer records, manual payout records, pending payout, failed transfers, retry status, and payout formula summary.
- `POST /api/webstores/:id/record-payout` records an external/manual payout with `amount_cents`, `method`, `notes`, `recorded_by`, `timestamp`. It must not erase owed history.

### 12.3 Dashboard Digest

```json
{
  "counts": { "webstores": 0, "webstore_orders": 0, "webstore_approvals": 0 },
  "modules_active": ["orders", "quotes", "customers", "webstores"]
}
```

- Counts return `0`, not `null`.
- `modules_active` controls whether cards display.

---

## 13. Section J — Known Edge Cases and Bugs to Fix in Rebuild

| Problem | Required Rebuild Fix |
|---|---|
| Float money drift | Store all money as integer cents. Use backend/frontend money helpers. |
| Counter double-decrement on cancelled → refunded | Use `payout_recorded_at` and reversal records, not status alone. |
| Stage stamps out of order | Validate stamps through ordered state machine. Reject invalid transitions. |
| Slug only protected in app code | Add DB unique index and immutable model behavior. |
| Stripe transfer failures swallowed | Write `failed_transfers` record and admin retry endpoint. |
| Bridge runs synchronously in webhook | Move bridge to async background task with `bridge_status`. |
| Idempotency keys never expire | TTL index, 2-hour expiry, 1-hour behavior window. |
| Scattered `if store_type ==` branching | Use store strategy pattern. |
| Public serializer denylist | Use explicit allowlist response models. |
| Questionnaire mapping hard-coded | Use declarative mapping config plus dry-run mode. |
| Store catalog confusion | No global webstore product catalog. Use store-specific products plus universal templates. |
| Feature access confusion | UI/draft mode allowed; publish and checkout blocked unless module entitlement and Stripe checks pass. |

---

## 14. Section K — Frontend Routes and Components

| Area | Routes / Components |
|---|---|
| Admin Webstores | `/webstores`, `/webstores/:id`, store detail, launch checklist, ribbon, store snapshot modal. |
| Products | Store Products panel, Add Product, Add From Template, AI Description Generator, product approval view. |
| Questionnaires | Questionnaire send panel, questionnaire review, AI summary, apply safe answers, follow-up email. |
| Orders | `/webstores/orders` plus filters in main Orders list for WEBSTORE origin/store/type/status. |
| Analytics | Store analytics, payout reports, fundraiser reports, owner-visible summary preview. |
| Payments | Stripe Account Health, onboarding status, dashboard link, failed transfers, fee settings. |
| Public | `/store/:slug` or `/s/:slug`, product grid/detail/cart/checkout/order confirmation, status screens. |
| Owner Portal | `/portal`, `/portal/signup`, `/portal/dashboard`, `/portal/webstores`, `/webstore-owner/onboard`. |
| Public Questionnaire | `/questionnaire/:id` or tokenized questionnaire link. |
| Store Snapshot Modal | Printable one-page summary: QR code, store status, key dates, products, finance summary, launch checklist. |

### 14.1 Required Admin UI Fields by Store Type

| Store Type | Required Fields | Optional Fields |
|---|---|---|
| B2B | Store name, owner, access mode, product list, pricing, pickup/shipping, approval contact. | PO field, manager approval, departments, year-round status, volume discounts. |
| Fundraiser | Beneficiary, deadline, products, owner/fundraiser share, pickup/shipping, approval, donation setting. | Goal/progress, supporter grouping, donor leaderboard, story. |
| Event | Event name/date/location, order deadline, products, pickup method, approval. | Auto-close, late orders, QR/flyer, donations/fundraiser add-on. |
| Promotional | Promoted name/brand, public description/story, products, social/sponsor info, approval. | Donations, featured product, promo codes, limited drops. |
| Employee | Company/owner, employee-only access, payment method, products, grouping, approval. | Required uniforms, personalization, manager approval. |
| General | Store name/purpose, owner, products, public/private, pickup/shipping, approval. | Donation, deadline, promo codes, branded layout. |

---

## 15. Section L — Rebuild Architecture Decisions

| Decision | Final Rule |
|---|---|
| Money type | Integer cents everywhere. Enforce with `Money(cents: int)` backend type and frontend money helpers. |
| Store strategy pattern | `BusinessStrategy`, `FundraiserStrategy`, `EventStrategy`, `PromotionalStrategy`, `EmployeeStrategy`, `GeneralStrategy`. Legacy `CreatorStrategy` maps into `PromotionalStrategy`. |
| TenantDB wrapper | Use scoped DB client that automatically appends `tenant_id` for tenant collections. CI test should catch unscoped queries. |
| Background tasks | Use queue/jobs for canonical bridge, Stripe transfer retries, auto-close cron, analytics reconciliation. |
| Portal users | Separate owner portal collection and auth. Never merge with staff users. |
| Allowlist serializers | `PublicStorefrontResponse` with explicit fields only. |
| Stripe status refresh | Refresh on page load for admin progress and owner portal; store structured status fields. |
| Pricing snapshot | Every checkout stores `pricing_snapshot` and fee summary from locked settings at time of purchase. |
| Settings merge | All domain settings merge through one backend function: `get_merged_tenant_settings(tenant_id)`. |
| Feature blocks | Webstore module entitlement controls publish and checkout. Draft creation, setup UI, templates, preview, and demo mode can remain visible. |

---

## 16. Module Entitlements, Feature Blocks, and Terms Approval

### 16.1 Feature Gate Matrix

| Feature | Inactive / Demo Mode | Active Add-On | Standalone Webstore Module |
|---|---|---|---|
| Create draft store | Allowed | Allowed | Allowed |
| Use shared templates | Allowed | Allowed | Allowed |
| Add/edit products | Allowed | Allowed | Allowed |
| Send questionnaire | Allowed or limited by plan | Allowed | Allowed |
| Owner review preview | Allowed as demo/private preview | Allowed | Allowed |
| Publish live store | **Blocked** | Allowed after launch checks | Allowed after launch checks |
| Shopping cart/checkout | **Blocked** | Allowed after Stripe/payment checks | Allowed after Stripe/payment checks |
| Stripe Connect onboarding | Prompt/setup allowed | Required for payouts | Required for payouts |
| Owner payouts | **Blocked** until active + Stripe ready | Direct through Stripe | Direct through Stripe |
| Advanced analytics | Preview/sample only | Allowed | Allowed |

### 16.2 Owner Terms Approval Requirement

When the store owner approves the store, they must also accept the terms and fee summary.

| Approval Snapshot Must Store | Examples |
|---|---|
| Approver identity | Name, email, owner portal user ID or token ID. |
| Acceptance details | `terms_accepted = true`, `terms_version`, `terms_accepted_at`, IP address, user agent. |
| Store snapshot | Store name, products, prices, product images/mockups, pickup/shipping rules, deadline, public description. |
| Fee summary | Platform fee percentage, Stripe processing note, owner share formula, payout routing, refunds/cancellations effect. |
| Tenant branding | Shop name, logo, contact email/phone, support message. |
| Owner responsibilities | Artwork approval, product approval, promotion, pickup/distribution responsibilities if applicable. |

### 16.3 Required Terms Template Placeholders

```
{{tenant_name}}
{{tenant_logo_url}}
{{tenant_support_email}}
{{tenant_support_phone}}
{{store_name}}
{{store_owner_name}}
{{store_owner_email}}
{{store_type}}
{{platform_fee_percent}}
{{stripe_processing_note}}
{{owner_share_formula}}
{{payout_method}}
{{store_deadline}}
{{pickup_instructions}}
{{refund_policy_summary}}
{{terms_version}}
{{approval_timestamp}}
```

---

## 17. Required API Route Contracts

| Route Group | Routes |
|---|---|
| Admin | `GET /api/webstores`; `POST /api/webstores`; `GET /api/webstores/:id`; `PATCH /api/webstores/:id`; `POST /api/webstores/:id/send-questionnaire`; `POST /api/webstores/:id/send-owner-review`; `POST /api/webstores/:id/launch`; `POST /api/webstores/:id/pause`; `POST /api/webstores/:id/close`; `GET /api/webstores/:id/analytics`; `GET /api/webstores/:id/qr-code` |
| Products | `GET /api/webstores/:id/products`; `POST /api/webstores/:id/products`; `GET /api/webstore-products/:productId`; `PATCH /api/webstore-products/:productId`; `DELETE /api/webstore-products/:productId`; `POST /api/webstore-products/:productId/generate-description` |
| Templates | `GET /api/product-templates`; `POST /api/product-templates`; `GET /api/product-templates/:id`; `PATCH /api/product-templates/:id`; `POST /api/webstores/:id/products/from-template` |
| Questionnaire | `GET /api/webstores/:id/questionnaire`; `POST /api/webstores/:id/questionnaire`; `GET /api/webstores/:id/questionnaire-response`; `POST /api/webstores/:id/questionnaire-summary`; `POST /api/webstores/:id/apply-questionnaire?dry_run=true` |
| Owner Portal | `GET /api/owner-portal/me`; `GET /api/owner-portal/webstores/:token`; `POST /api/owner-portal/webstores/:token/approve`; `POST /api/owner-portal/webstores/:token/request-changes`; `GET /api/owner-portal/webstores/:token/analytics`; `GET /api/owner-portal/webstores/:token/qr-code` |
| Public Storefront | `GET /api/storefront/:slug`; `POST /api/storefront/:slug/cart`; `POST /api/storefront/:slug/checkout`; `GET /api/storefront/:slug/order-confirmation/:orderId` |
| Stripe | `GET /api/stripe-connect/status`; `POST /api/stripe-connect/create-account`; `POST /api/stripe-connect/refresh-link`; `GET /api/stripe-connect/dashboard-link`; `POST /api/stripe-connect/webhook`; `GET /api/admin/failed-transfers`; `POST /api/admin/failed-transfers/:id/retry` |

---

## 18. Protected Webstore Behaviors

- Webstores are an early rebuild priority only after this spec is approved.
- Webstores reuse shared app systems and do not become an isolated side app.
- Webstore checkout creates a canonical order in the main Orders system.
- Webstore orders are recognizable as webstore-originated orders.
- Use **order**, **order item**, and **work order** language in the rebuild, not "job ticket" as the user-facing production summary name.
- Each webstore has its own product catalog.
- There is no single shared webstore product catalog containing all store products.
- A universal product/template library exists for common products, bundles, and repeat item setup across the app.
- Product costs, selling prices, and owner shares are stored per product or variant.
- Product costs are never only store-level.
- Owner approval is required before launch.
- Owner approval also requires terms and fee acceptance.
- Owner change requests are saved and logged.
- Questionnaire original answers are always stored.
- AI summaries never replace original user/customer-provided data.
- Questionnaire answers map to setup fields where possible and safely.
- Locked settings cannot be changed by owner/questionnaire answers.
- Stripe onboarding and account health are tracked when payouts are involved.
- Store owner money goes directly through Stripe where owner payouts apply.
- Payment records are created for payments and refunds.
- All money is stored in integer cents.
- Donations are tracked separately from product revenue.
- Store statuses use the canonical enum.
- Store launch, pause, close, and status changes create activity/audit logs.
- Order status changes create event logs.
- Public checkout never exposes admin-only or owner-only data.
- Owner portal only shows that owner's store data.
- Dashboard counts return 0, not null, and visibility uses `modules_active`.
- QR codes are generated for stores.
- Webstore communication uses shared email/SMS/MMS systems.
- Admin analytics and simplified owner analytics are required.
- Paused and closed stores disable checkout but preserve orders/reporting.
- Webstore orders flow into production without manual re-entry.
- Publishing and checkout are blocked unless Webstore entitlement is active and Stripe/payment requirements pass.
- Add-on Webstore platform fee adds 2% on top of existing app platform fee; standalone recommended fee is 5% unless pricing plan says otherwise.

---

## 19. Acceptance Criteria

- A store can be created by type: B2B, Fundraiser, Event, Promotional, Employee, General.
- Store status follows the approved lifecycle.
- Webstore module uses top navigation and compact 12-action ribbon style.
- Users can create draft stores and explore setup UI without activation, but cannot publish or sell without Webstore entitlement and Stripe/payment readiness.
- A questionnaire can be sent with shared core questions plus one store-type section.
- Questionnaire answers are stored in original form.
- Questionnaire answers can map to safe store fields.
- AI can summarize questionnaire answers without replacing them.
- Each webstore has its own product catalog.
- Shared product/bundle templates can be copied into store-specific products.
- Products can be added and edited per store.
- Product cost and price are stored per product or variant.
- Owner share can be configured per product or variant.
- AI product descriptions can be generated and edited before publishing.
- Store owner can review preview, products, pricing, terms, and fees.
- Approval creates an approval record with terms version and fee snapshot.
- Store owner can approve or request changes.
- Store can be launched only after required checks pass.
- Public buyers can view live stores.
- Public buyers can add products to cart and checkout only when checkout is enabled.
- Checkout creates canonical order, order items, payment records, and production visibility.
- Donations are separate from product revenue.
- Admin can see webstore analytics.
- Store owner can see simplified portal analytics.
- Store can be paused and closed, disabling checkout while preserving history.
- Activity logs are created for important actions.
- Money is stored in cents and displayed through helpers.
- Dashboard counts return 0, not null.
- Dashboard visibility uses `modules_active`.
- Public storefront uses allowlist serializer and does not leak protected fields.
- Bridge failures, failed Stripe transfers, and idempotency edge cases are handled and visible to admins.

---

## 20. Documentation Checklist Coverage Matrix

| Checklist Section | Covered In This Master Document |
|---|---|
| A — Domain Knowledge | Sections 4.1 through 4.5 |
| B — Data Models | Sections 5.1 through 5.8 |
| C — Business Logic Rules | Sections 6.1 through 6.7 |
| D — Stripe Connect Integration | Sections 7.1 through 7.5 |
| E — Checkout Flow | Sections 8.1 through 8.5 |
| F — Owner Portal | Sections 9.1 through 9.5 |
| G — Questionnaire System | Sections 10.1 through 10.2 |
| H — Bridge to Canonical Orders | Sections 11.1 through 11.2 |
| I — Analytics and Reporting | Sections 12.1 through 12.3 |
| J — Known Edge Cases and Bugs | Section 13 |
| K — Frontend Routes and Components | Sections 14.1 and 14.2 |
| L — Rebuild Architecture Decisions | Section 15 |

---

## 21. Final Approval Rule

No webstore rebuild work should begin until this master spec is approved. Once approved, this document becomes protected behavior. Any change to protected behaviors, store types, money rules, checkout behavior, payout behavior, owner terms approval, catalog/template rules, or navigation/ribbon rules must be **explicitly approved before implementation**.

---

*Source: SignGuy_AI_Webstore_Master_Rebuild_Spec.pdf — Saved to memory: 2026-06-10*

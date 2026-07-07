# SALES WORKFLOW: QUOTES, ORDERS & ORDER ITEMS — Rebuild Investigation Document

**Status:** Documentation/investigation only. No code written, no code modified, no UI created. This document supersedes and extends `NEW_ORDER_WORKFLOW_REBUILD_DOC.md` and `orders_spec.md` (both already in `/app/memory/`) with additional, newly-verified findings on deposits, notes, attachments, timelines, and customer communication specifically, and re-frames everything under the platform's Non-Negotiable Platform Rules and this task's exact required output format. Where a finding was already established in a prior document, it is restated here (not re-investigated from zero) and cross-referenced; new findings this pass are marked **[NEW]**.

**Investigation date:** 2026-02-15 (continuation session).
**Method:** Direct code reading — `backend/routes/orders.py` (full read across multiple ranges, 1109 lines), `backend/models/orders.py` (full field list), `backend/routes/quotes.py`, `backend/routes/invoices.py`, `backend/routes/jobs.py`, `backend/routes/job_tickets.py`, `backend/routes/order_drawings.py`, `backend/routes/approvals.py`, `backend/routes/portal.py`, `backend/routes/stripe_connect.py`, `backend/models/tiers.py`, `backend/models/jobs.py` — plus cross-reference against `FILE_UPLOADS_ATTACHMENTS_STORAGE_REBUILD_DOC.md` and `ACTIVITY_LOG_AUDIT_TRAIL_SYSTEM_HISTORY_REBUILD_DOC.md` for the Attachments and Timeline sub-systems respectively, per the platform rule that shared systems are not re-documented per-domain.

---

## Non-Negotiable Platform Rules (context carried into every recommendation below)

- SignGuy AI is one shared modular-monolith platform. One tenant = one sign company. Every tenant's records remain isolated.
- Shared records/services only — no duplicate customer, order, document, payment, user, AI-credit, or notification systems.
- Terminology: **Quote → Order → Invoice**; **Order → Order Item(s)**; **Work Order Summary → Production Tasks**.
- The original repository is a read-only reference for business logic — not the place the final architecture gets built (mirrors the Pricing rebuild's own Legacy Repo Usage Rule).
- No legacy-data migration is required (confirmed by user context: no real production customers exist yet).
- Newest approved documentation overrides older code or older documents.
- Every meaningful record/status/action change must create an activity or audit entry.
- Shared roles, permissions, notifications, file storage, settings, search, and AI-credit rules apply platform-wide, not per-module.
- Unknown decisions are flagged, not silently invented (see §11).

---

## 1. Executive Summary

**What this domain does:** The path from "a customer wants something" to "we got paid for it": Quote (estimate) → Order (the job) → Order Items (what's being made) → Production Tasks (how it's made) → Work Order Summary (shop-floor paperwork) → Invoice (the bill) → Payment — plus every notes, attachment, assignment, timeline, and customer-communication touchpoint that happens along the way.

**Why it exists:** Every other domain in this rebuild (Pricing, Inventory, Business Finance, AI Workspace, Customers) either feeds into or reads from this pipeline. It is the transactional spine of the platform.

**Main users:** Owner/Admin (full lifecycle, quoting, invoicing, financial visibility), Staff/Production (Order Items + Production Tasks, assignments, production notes — not necessarily financials), Customers via the Customer Portal (view quotes/invoices, pay invoices, approve proofs, and — only for Vehicle Wrap items today — approve a quote).

**Main business value:** Converts a sales conversation into a trackable, billable, producible unit of work with a paper trail, and (per the platform's audit rule) a defensible record of who did what and when.

**Critical finding stated up front:** The codebase contains a well-designed, modern 4-layer Order architecture (`Order → Order Item → Production Task`, plus generated Quote/Invoice/Work-Order documents) that already matches this platform's mandated terminology almost exactly. However, **the Quote and Invoice generation endpoints that are supposed to sit on top of an Order's Order Items are not called from anywhere in the frontend.** Instead, the live, actually-used Quote and Invoice UIs are two separate, older, standalone systems tied to a deprecated legacy "Job" model. In practice, **there is no connected, working Quote → Order → Invoice pipeline in the live application today** — Orders function as an isolated production-tracking tool, while Quoting and Invoicing happen in a parallel system that dead-ends into a page nobody can reach. This is the single most important finding for the rebuild to address first.

**Original features that must be preserved:**
- The 4-layer Order/Order-Item/Production-Task data model (sequential per-category workflow templates, automatic progress roll-up, well-attributed `order_activities` logging).
- Sequential, human-readable Order numbering (`ORD-0001`) — needs a concurrency fix, not a redesign (see §4).
- Order Item dynamic specs schema (per-category field sets across 9 categories).
- Customer Portal invoice payment (Stripe Checkout + webhook + polling reconciliation) — genuinely well-built, carry forward as-is.
- The already-designed (if unwired) Quote/Invoice/Work-Order generation pattern (`generate-quote`/`generate-invoice`/`generate-work_order`) — the *idea* is exactly right, it just needs finishing and connecting.

**Original features that are duplicates, outdated, incomplete, or should not be rebuilt as-is:**
- The entire legacy `Job`/`JobItem` system — superseded, frontend-redirected away, yet still the actual destination of the standalone Quote page's "Convert to Job" action.
- The standalone Quote system (`routes/quotes.py`) and standalone Invoice system (`routes/invoices.py`) as currently wired — the *concepts* (customer-facing estimate/bill documents) must be preserved, but their implementations are disconnected from the modern Order model.
- **[NEW]** The ~15 separate flat-string "notes" fields scattered across Order/Order Item (`internal_notes`, `customer_notes`, `pickup_delivery_notes`, `shared_production_notes`, `shared_design_notes`, `shared_install_notes`, `shared_color_brand_notes`, `artwork_notes`, `packaging_notes`, `delivery_notes`, `production_notes`, `install_notes`, `rework_notes`) — every one of these silently overwrites its previous value with no history, no author, no timestamp, and no activity-log entry, directly conflicting with the platform's own audit rule.
- **[NEW]** "Deposit required before work begins" exists only as a `PaymentStatus.DEPOSIT_PAID` enum value nothing ever sets automatically, plus an unchecked checkbox printed on the Work Order Summary PDF — there is no system enforcement anywhere blocking production start on an unpaid deposit.

---

## 2. Scope Boundaries

**What belongs inside this domain:**
- Quote creation, editing, sending, customer approval/decline.
- Order creation, Order status lifecycle, assignments.
- Order Items (specs, per-category dynamic fields, artwork/proof/QC state).
- Order/Order-Item notes (internal and customer-facing).
- Order attachments, drawings, and their customer-portal exposure.
- Order timeline/activity history.
- Customer communication that is specifically tied to an Order (quote-sent, invoice-sent, payment-received, proof-ready).
- Deposit requirement and enforcement before production starts.
- Invoice generation, payment recording, Stripe Checkout.
- Work Order Summary (shop-floor paperwork) generation.

**What does NOT belong inside this domain:**
- Production Tasks' internal execution engine and per-category workflow templates — owned by the Production domain; this domain only triggers task generation and reads back progress.
- Pricing calculation itself — owned by the Pricing domain (already documented separately); this domain only consumes a `PricingSnapshot`/`pricing_snapshot` result per Order Item.
- Customers themselves — owned by the Customers domain; this domain only references `customer_id`.
- Inventory/material consumption — owned by Inventory; Order Items reference materials but don't own inventory logic.
- File storage mechanics and general document library — owned by the shared File Storage system (already fully documented in `FILE_UPLOADS_ATTACHMENTS_STORAGE_REBUILD_DOC.md`); this domain only owns *which* files attach to an Order and *whether* they're customer-visible.
- Activity-log mechanics — owned by the shared Activity Log system (already fully documented in `ACTIVITY_LOG_AUDIT_TRAIL_SYSTEM_HISTORY_REBUILD_DOC.md`); this domain only owns *what events* it must log.
- Webstore-originated checkout/cart experience — owned by Webstores; webstore orders land in this domain's `Order` records via a `source=webstore` flag, but the storefront itself is out of scope here.
- Aggregate financial reporting/profitability analytics — owned by Business Finance; already flagged there that it currently reads the wrong (legacy) collection, a dependency on this domain's rebuild, not a duplicate of it.

**Which shared systems it depends on:**
- Users/Roles/Permissions — currently almost entirely unused by this domain (see §6, the most severe finding of this document).
- Customers (denormalized name/contact snapshot on every Order/Quote/Invoice).
- File Storage/Object Storage — Order attachments and drawings.
- Activity Log — `order_activities`, the best-attributed logging system found in the codebase.
- Notifications — only one call site in this whole domain today (invoice-portal-send).
- AI Credits/AI Assistant — structured `CREATE_ORDER`/`CREATE_INVOICE` actions write into this domain.
- Stripe — invoice payment.
- Pricing — consumes `pricing_snapshot` per Order Item; does not calculate it.

**Which future modules depend on it:**
- Business Finance/Reporting — needs real Order/Invoice data (not legacy Job data) to be trustworthy.
- AI Workspace — its structured actions write into this domain's tables.
- Customer Portal — Quotes/Invoices/Orders tabs all read this domain's data.
- Webstores — checkout ultimately produces an Order here.

---

## 3. Screen and Route Inventory

| Screen/Route | Purpose | Intended user | Main data shown | Main actions | Disposition | Related connections |
|---|---|---|---|---|---|---|
| `/orders` | List/search current Orders | Staff/Owner | Order number, customer, status, due date | Filter, search, open, create new | **Rebuild — fix data feed, keep UX** | `orders` |
| `/orders/new` | Create a new Order (intake) | Staff/Owner | Customer, source, dates, shared-context fields | Submit → `POST /orders` | **Keep** — clean intake form | `orders`, `customers` |
| `/orders/:id` (7 tabs: Order Items, Production, Financial, Drawings, Files, Notes, Activity) | Central Order workspace | Staff/Owner | Order Items, Production Tasks, activity, linked Quotes/Invoices/Work-Orders (read-only) | Add item, start production, change status dropdown, upload files, send file for approval | **Rebuild — the missing Quote/Invoice generation and Notes/Deposit UI must be added here.** Can *display* linked quotes/invoices but has no button anywhere calling `generate-quote`/`generate-invoice`/`generate-work_order` — confirmed unreachable dead code. The "Notes" tab surfaces the flat-string note fields with no history (see §4). | `job_tickets`, `production_tasks`, `order_files`, `order_activities` |
| `/orders/:id/add-item` | Add an Order Item to an existing order | Staff | Category-specific dynamic spec form | Submit → `POST /job-tickets` | **Keep** | `job_tickets` |
| `/orders/:orderId/items/:itemId/wrap-command-center` | Vehicle-Wrap-specific extended workspace for one Order Item | Staff | Wrap-specific design/pricing/proof tools | Wrap-specific proof/quote approval (the *only* working customer quote-approval path found in this domain) | **Keep the pattern, generalize it** — every other of the 9 categories has no equivalent | `job_tickets`, `portal.py` wrap endpoints |
| `/quotes` | Standalone Quote list/create/manage | Staff/Owner | Quotes from `db.quotes` union legacy `db.order_quotes` | Create, edit, "Convert to Job" (dead end), "Email quote" (shows a "coming soon" toast — not implemented), download PDF | **Rebuild entirely, retarget at Orders** — currently the primary live quoting UI, but its only forward action creates an unreachable legacy Job | `quotes`, `order_quotes`, **`jobs` (legacy, dead-end)** |
| `/jobs`, `/jobs/:id` | — | — | — | Both routes are redirect-only placeholders | **Remove** — already fully retired by the frontend | `jobs`, `job_items` |
| `/invoices` | Standalone Invoice list/create/manage | Staff/Owner | Invoices (manual entry or from legacy Job), Stripe reconciliation trigger | Create invoice (manual line items — no Order-Item import UI), send, record payment, download PDF | **Rebuild, retarget at Order Items** — currently requires re-typing line items that already exist as fully-specified Order Items | `invoices`, `jobs` (optional legacy link) |
| `/customer-portal/quotes` | Customer views their quotes | Customer | Quote line items, status, total | **Read-only — no Approve/Decline action exists in the component at all** | **Rebuild — add real approve/decline** | `portal.py` `/quotes` |
| `/customer-portal/invoices` | Customer views/pays invoices | Customer | Invoice total, balance, status | Pay Now → real Stripe Checkout redirect + webhook + polling verification | **Keep** — well-built | `portal.py`, `stripe_connect.py` |
| Order Detail → "Financial" tab | Show linked docs + totals | Staff/Owner | Quote/Invoice/Work-Order status badges, amounts, balances | View only | **[NEW] Rebuild to add a Deposit status/gate indicator** (see §5) | `orders.py::get_order_financials` |
| Order Detail → "Notes" tab | **[NEW]** Internal + customer notes | Staff/Owner (internal), Customer (customer-facing only) | Flat-string note fields, no history | Overwrite the field | **[NEW] Rebuild as a real threaded/timestamped notes system** (see §4) | `orders`, `job_tickets` |
| Order Detail → "Activity" tab | Chronological audit log | Staff/Owner | `order_activities` entries | View only | **Keep** — already well-attributed (cross-ref `ACTIVITY_LOG_AUDIT_TRAIL_SYSTEM_HISTORY_REBUILD_DOC.md`) | `order_activities` |
| Order Detail → "Files"/"Drawings" tabs | Attachments | Staff/Owner (upload/view); Customer (no access at all today) | `order_files`, `order_drawings` | Upload, download | **Rebuild — see FILE_UPLOADS doc for the P0 unauthenticated-retrieval bug on drawings and the missing customer-portal exposure on order_files** (cross-referenced, not re-investigated here) | `order_files`, `order_drawings` |
| PlatformAdmin/reporting on Orders | — | — | — | Does not exist — no Order-specific export/report anywhere | **Postpone or build new** | n/a |

---

## 4. Data and Record Model

**Primary records (current, modern system):**
- `Order` (Layer 1) — `orders` collection. Sequential `order_number` (`ORD-####`), `linked_quote_ids`/`linked_invoice_ids`, rich shared-context fields inherited by items, `overall_progress`, `payment_status`, `approval_status`.
- `JobTicket` (Layer 2, = Order Item) — `job_tickets` collection. Rich dynamic spec model (`extra = "allow"` per-category fields), artwork/proof/QC sub-state machine, `pricing_snapshot`, clone lineage.
- `ProductionTask` (owned by Production domain, referenced here) — `production_tasks` collection.
- `OrderActivity` — `order_activities` collection. Best-attributed activity log in the codebase (always `user_id` + `user_name`) — see cross-ref doc.

**Primary records (legacy, still live via the standalone Quote/Invoice UI — must not be ported):**
- `Job`, `JobItem`, `JobActivity`, `JobNote` — `jobs`/`job_items`/`job_activities`/`job_notes` collections. **[NEW]** Notably, `JobNote` (`models/jobs.py`) is a genuine multi-entry, timestamped, authored note thread (`{job_id, content, author, created_at}`) — this capability existed on the legacy model and was **not carried forward** to the modern `Order`/`JobTicket` model, which regressed to flat overwriting strings (see below). `JobActivity` also has the confirmed attribution bug (`"user_name": "System"` on every entry) documented in `ACTIVITY_LOG_AUDIT_TRAIL_SYSTEM_HISTORY_REBUILD_DOC.md` — irrelevant to the rebuild since this whole system is retired, but relevant as the origin of the Notes regression just noted.

**Primary records (standalone, semi-connected):**
- `Quote` (Pydantic model) — `db.quotes`. Same collection name as the raw dicts written by `orders.py`'s `generate-quote`, but a different shape.
- `Invoice` (Pydantic model) — `db.invoices`. Same collection-sharing situation.
- `order_quotes` — a third, older collection, still actively read as a fallback by both standalone routes AND the Order's `/financials` aggregator.

**Required identifiers/numbering:**
- **Order**: sequential `ORD-0001` numbering exists, but via a non-atomic read-then-increment pattern — two Orders created in the same instant could compute the same "next" number.
- **Quote/Invoice**: **no numbering scheme exists at all.** Both fall back to a raw UUID fragment (`quote_id[:8].upper()`), producing an unprofessional customer-facing "number" like `QUOTE #A1B2C3D4`.

**Statuses:**
- `OrderStatus` — 13-value funnel (`new_intake → awaiting_review → awaiting_quote → quote_sent → awaiting_approval → approved → in_production → ... → completed`), but the live status dropdown only exposes 6 of the 13 (`approved, in_production, on_hold, ready_for_pickup, completed, cancelled`) — the entire quote sub-phase is unreachable from the UI.
- `PaymentStatus` — `unpaid, deposit_paid, partially_paid, paid, refunded`. **[NEW] `deposit_paid` is never set by any code path found** — confirmed by full grep of `orders.py`/`invoices.py`/`stripe_connect.py`: the only other "deposit" reference in the entire backend is a pricing-settings field (`deposit_percentage: float = 50.0`, a suggested-deposit % for quoting) and a static checklist line ("Deposit paid") printed as an unchecked box on the Work Order Summary PDF. There is no endpoint, webhook, or status transition anywhere that flips `payment_status` to `deposit_paid`.
- `JobTicketStatus` (Order Item) — 13 values, properly cascaded automatically by the Production domain's workflow engine.

**Relationships:**
- `Order.linked_quote_ids`/`linked_invoice_ids` — populated only by the unused Order-generation endpoints; never populated by the standalone Quote/Invoice creation flows.
- `JobTicket.order_id` — always set, reliable.
- **[NEW]** No Order-level or Order-Item-level record links back to a "note" as its own entity — notes are inline fields on the parent record, not a related collection, unlike Files/Drawings/Activity which are all their own collections with a foreign key back to the Order.

**Data currently duplicated or inconsistently stored:**
1. Two shapes of "Quote" and two shapes of "Invoice" coexist in the same collections (Pydantic-model-created vs. raw-dict-created).
2. Three generations of "Order-adjacent document" storage exist simultaneously (`order_quotes` → `quotes`/`invoices`), still cross-read rather than migrated.
3. **[NEW]** ~15 separate note fields spread across two record types (`Order`, `JobTicket`) with overlapping intent (e.g., `production_notes` exists at both Order-shared level and Order-Item level; unclear which one wins if they disagree — not resolved anywhere in code).

**Recommended clean rebuild structure:**
- One `Order` record, one `OrderItem` record (rename from `JobTicket`, keep its shape — it's excellent), one shared reference to `ProductionTask` (owned elsewhere).
- Quote and Invoice become **generated views/snapshots of an Order's Order Items**, created only via one shared "generate document" service using the shared Pydantic models (not raw dicts) with real sequential numbering — a single shared atomic sequence-number generator, reused for Order/Quote/Invoice numbering, fixing the race condition too.
- **[NEW]** Replace the ~15 flat-string note fields with one `OrderNote` collection (mirroring the legacy `JobNote` shape that was already correct: `{order_id, order_item_id (optional), content, author_id, author_name, visibility: internal|customer, created_at}`), which also satisfies the platform's audit rule (every note becomes its own permanent, attributed activity/record instead of a silent overwrite) and is a genuinely simpler model than 15 separately-named fields.
- **[NEW]** Add a `deposit_required_cents`/`deposit_paid_at` pair (or reuse the Pricing domain's Money/cents convention once available) directly on `Order`, and an explicit gate in `start-production` that blocks (or warns, per Open Decision in §11) when a deposit is required but not yet recorded as paid.

---

## 5. Workflows

### Workflow A — Intended/Designed Flow (per the data model's own shape)
1. Staff creates an Order (intake).
2. Staff adds one or more Order Items with full specs.
3. **(Designed but unreachable)** `POST /orders/{id}/generate-quote` builds line items from items' `pricing_snapshot`, writes a Quote, flips Order status to `awaiting_quote`.
4. **(Missing entirely)** Customer reviews/approves the quote — no working approval action exists for standard Orders (only Wrap Command Center items have one).
5. **(Designed but unreachable)** On approval, Order flips to `approved`; production should start; `generate-invoice` produces the bill.
6. Completion criteria (designed): Invoice paid + Order status `completed`.
7. Failure/edge case handling (designed): none found for a declined quote — no `declined`/`rejected` branch exists on the Order side.

### Workflow B — Actual/Live Flow (what staff can really do today)
1. Staff creates an Order, adds Order Items, clicks "Start Production" — this works, tasks are generated from the category's workflow template.
2. Task completion cascades to Item status/progress, Item cascades to Order `overall_progress` — works well, automatically.
3. Status changes only via the manual dropdown (6 of 13 statuses exposed).
4. Billing (disconnected): staff separately open `/invoices`, manually re-type line items, send/record payment there — no automatic link back to the Order or its Items' actual specs/pricing.
5. Quoting (disconnected, dead-end when converted): staff open `/quotes`, manually build a quote, and if approved, click "Convert to Job" — creating a legacy Job with no live page to manage from ever again.
6. **[NEW] Deposits:** nothing in this live flow ever collects, records, or checks a deposit — "Start Production" (step 1 above) proceeds unconditionally regardless of `payment_status`.
7. **[NEW] Notes:** staff open the Notes tab, type into one of the flat fields, save — the previous text, if any, is gone with no record it ever existed.
8. Notifications: none trigger anywhere in this actual flow except the one Invoice → Customer Portal "send to portal" action.

### Workflow C — Customer Portal Payment (the one genuinely complete, working sub-flow)
1. Staff calls `send_invoice_to_portal` (requires `customer.portal_enabled`).
2. Customer opens `/customer-portal/invoices`, clicks "Pay Now" → Stripe Checkout → redirect.
3. Stripe webhook reconciles payment; frontend also polls payment-status up to 6 times as a client-side check.
4. Completion: Invoice `amount_paid`/`status` updated by the webhook (source of truth).
5. Edge cases handled well: cancelled checkout, webhook lag, URL param cleanup.

### Workflow D — Vehicle Wrap-specific Proof/Quote Approval (the only customer-approval mechanism that exists)
1. Customer opens the Wrap-specific portal flow tied to one Order Item.
2. `approve-proof`/`approve-quote` endpoints exist, scoped to **one category only** (`vehicle_wrap`) — no equivalent for the other 8 categories.

### Workflow E — **[NEW]** Attempted Deposit Collection (does not actually exist as a workflow — documented as a gap)
1. **Trigger (intended, inferred from the pricing-settings `deposit_percentage` field and the PDF checklist line):** a quote is approved and a deposit should be requested before production.
2. **User steps (actual):** none exist — no UI prompts for a deposit amount, no invoice is auto-generated for just the deposit portion, no separate "deposit invoice" concept exists anywhere.
3. **Automatic actions:** none.
4. **Failure/edge case handling:** none — because there is no success path to fail from. This is a pure gap, not a broken feature.

### Workflow F — **[NEW]** Order Notes (documented as currently implemented, to contrast with the rebuild recommendation)
1. Staff opens the Notes tab on an Order or Order Item.
2. Staff types into one of the ~15 named fields (`internal_notes`, `production_notes`, etc.) and saves via a generic `PUT`.
3. **Automatic actions:** none — no activity-log entry is created for a notes edit (confirmed: `internal_notes`/`customer_notes` writes are not among the 7 `log_activity()` call-sites in `routes/orders.py`).
4. **Completion criteria:** the field is saved; there is no concept of "done" for a note.
5. **Failure/edge case:** two staff members editing the same note field close together — last write wins, silently, with no conflict indicator and no record of the discarded text.

---

## 6. Permissions and Portal Access

**Internal roles that need access:** Owner, Admin, Sales/Front-desk Staff (quotes/orders), Production Staff (Order Items/Production Tasks — not necessarily financials), Bookkeeper (invoices/payments).

**What each role can actually do today — confirmed by full grep, not guessed:**
- `Permission.QUOTES_*`, `Permission.JOBS_*`, and `Permission.INVOICES_*` all exist in `models/auth.py` and are assigned to roles — but **zero of them are ever checked** in `routes/orders.py`, `routes/job_tickets.py`, `routes/quotes.py`, or `routes/invoices.py`. There is also **no `Permission.ORDERS_*` entry at all** — the enum was written for the legacy Job/Quote/Invoice system and never extended to the current Order/Order-Item model.
- **Net effect: any authenticated user of any role, in any tenant, can create, view, edit, or delete any Order, any Order Item, any Quote, or any Invoice.** This is the single most severe permission gap found across the multi-session investigation series, because unlike most other domains, this one directly controls real customer money and contractual documents.
- **[NEW]** Notes and Deposits inherit this same total gap — since there is no dedicated permission check on the Order-update endpoint at all, there is also no way today to restrict, say, "only Owner/Admin can see `internal_notes`" from a Staff/Production-only user, even though the field name itself implies that restriction was intended.

**External/portal access rules:**
- Customer Portal correctly scopes every read to the authenticated customer's own `customer_id` (invoice/quote fetch helpers filter by customer object).
- Wrap-specific approval endpoints presumably validate the item belongs to that customer's order — not verified line-by-line this session, flagged as a dependency to confirm before rebuild.
- **[NEW]** `customer_notes` is exposed to the portal read path in at least one place (`get_order_financials` returns `internal_notes` — confirmed at `orders.py` line ~468 — worth double-checking this isn't accidentally exposed to a customer-facing endpoint, since the field name signals it should never be).

**Financial/sensitive data restrictions:** None internally (see above). Externally, portal scoping appears intact but wasn't exhaustively re-verified this session.

**Permission conflicts or risks in the old system:**
- The AI Assistant's structured `CREATE_ORDER` action correctly requires `Permission.JOBS_EDIT` — meaning the AI Assistant is currently *more* permission-strict than a human using the actual Orders UI, since `POST /orders` has no permission check at all.

---

## 7. Integrations and Automation

**Shared internal systems used:** Object storage (attachments — see `FILE_UPLOADS_ATTACHMENTS_STORAGE_REBUILD_DOC.md`), Activity Log (`order_activities` — see `ACTIVITY_LOG_AUDIT_TRAIL_SYSTEM_HISTORY_REBUILD_DOC.md`), Customer notifications (invoice-portal-send only).

**External services used:** Stripe (invoice payment + webhook reconciliation), ReportLab (Quote/Invoice/Work-Order PDF generation, inline in the route files rather than a shared PDF service).

**Data sent and received:** Stripe Checkout session creation/retrieval. **[NEW confirmed]** No order-specific email or SMS templates exist — `email_templates.py` and `sms.py` contain zero `order_id`-scoped logic; the only generic templates found are a welcome email, a generic notification, and a document-shared email, none of which are Order-lifecycle-specific (no "quote sent," "quote approved," "deposit received," "order ready for pickup" email/SMS exists anywhere).

**Failure handling:** Stripe path has real retry/polling logic (Workflow C). No other failure handling observed — `generate-quote`/`generate-invoice` have no rollback if a downstream `db.orders.update_one` fails after the quote/invoice insert succeeds.

**Background automation:** None — no scheduled job chases a stale `awaiting_quote` Order, no reminder for an unpaid deposit or invoice tied specifically to this domain (a generic Nudges widget exists elsewhere in the app but only checks `invoices`/`quotes` generically, not Order-linked ones specifically).

**Emails, SMS, in-app notifications, tasks, documents, scheduled actions:** Only the one invoice-portal-send notification. No quote-sent email, no invoice-sent email, no payment-received confirmation, no deposit-received confirmation, no order-status-change notification to the customer at all.

---

## 8. AI and Credit Usage

**AI tools/features in this domain:**
- `ActionType.CREATE_ORDER` — AI Assistant can create a real `db.orders` record via natural language, correctly permissioned (`Permission.JOBS_EDIT`) and correctly targets the current Order model — the most architecturally "correct" quote/order-adjacent code path found in this domain.
- `ActionType.CREATE_INVOICE` — same structured-action system, permissioned via `Permission.INVOICES_EDIT`. Not verified this session whether it targets the modern `db.invoices` shape or the legacy `job_id`-linked shape — flagged as a dependency to confirm.
- `ActionType.ASSIGN_EMPLOYEE`, `UPDATE_JOB_STATUS` — touch this domain's assignment/status data.

**User inputs:** Natural-language chat request (e.g., "create an order for Jane Smith for 3 banners").
**Outputs:** A real Order/Invoice record; a confirmation card in the floating widget.
**Where output is saved:** `db.orders`/`db.invoices` directly.
**Credit cost:** Covered under the flat per-turn AI Business Assistant cost — no domain-specific line item.
**Required confirmations:** Yes — structured actions are confirmation-gated by default, a real safeguard before the AI creates a binding Order/Invoice.
**Edit/review requirements:** The confirmation pill shows parsed parameters before execution. Not verified whether every extracted field is surfaced clearly enough — flagged as a UX open item, not a confirmed bug.
**Audit events:** Written to `ai_action_audit` — correct, permissioned audit trail for structured actions specifically.
**Failure behavior:** Not verified line-by-line this session for the Order/Invoice action handlers specifically.

---

## 9. Reporting and Metrics

**Dashboard cards:** A Financial Attention widget shows unpaid/overdue/due-this-week/recent-payments from the real `invoices` collection — but does not distinguish Order-linked invoices (modern) from legacy-Job-linked invoices (old), since both shapes coexist in the same collection.

**Reports:** None Order-specific exist (no "Orders this month," "average time in production," "orders by source" report).

**Export needs:** No CSV/PDF export of the Order list itself exists (individual Order/Quote/Invoice/Work-Order PDFs do exist and work).

**Metrics this module creates or affects:** Revenue (via invoices), AR/aging (via invoices), production throughput (via Production domain — but not reflected in the currently-used Profit & Margin Analytics, which reads the legacy `jobs`/`job_items` collection, per Business Finance domain's own finding).

**Financial/privacy restrictions:** None enforced (see §6).

---

## 10. Rebuild Recommendations

**Recommended rebuild architecture:**
- Single source of truth: `Order → OrderItem (renamed from JobTicket) → ProductionTask` — the current modern model already does this well; finish and connect it, don't reinvent it.
- Quote and Invoice as **generated, versioned snapshots** of an Order's Order Items, created only via one shared "generate document" service (upgrading the *already-written* `generate-quote`/`generate-invoice` logic to use shared Pydantic models and real sequential numbering).
- Retire the legacy `Job`/`JobItem` system and the `order_quotes` catch-all collection entirely (no migration needed).
- **[NEW]** Replace the ~15 flat-string note fields with one `OrderNote` collection (per §4), reusing the legacy `JobNote`'s already-correct shape rather than inventing something new — this simultaneously fixes the audit-trail gap and the field-sprawl problem.
- **[NEW]** Add an explicit `Deposit` concept: a deposit amount/percentage (sourced from Pricing settings' existing `deposit_percentage` field), a deposit invoice or deposit line item, and a gate on `start-production` — see Open Decision in §11 for exactly how strict that gate should be.

**Recommended sub-system breakdown:**
1. Order Intake & Lifecycle (status funnel, activity log, assignments).
2. Order Items (specs, dynamic per-category schema, artwork/proof/QC state).
3. Notes (rebuilt as a real threaded, attributed system — not a domain this document invents from nothing, since the legacy `JobNote` shape already solved it correctly once).
4. Document Generation (Quote/Invoice/Work-Order Summary — generated from Order Items, not separately authored).
5. Customer Approval (generalize the Wrap-only approve-quote/approve-proof pattern to every category).
6. Deposits & Payment (Stripe Checkout — carry forward largely as-is; deposit gate is new).
7. Attachments (cross-reference `FILE_UPLOADS_ATTACHMENTS_STORAGE_REBUILD_DOC.md` — this domain only decides *what* attaches and *whether* it's customer-visible).
8. Timeline/Activity (cross-reference `ACTIVITY_LOG_AUDIT_TRAIL_SYSTEM_HISTORY_REBUILD_DOC.md` — this domain only decides *what events* to log, including the currently-missing notes-edit and deposit-received events).

**Features to combine:** Quote creation and Invoice creation should be one underlying "generate customer document from Order Items" code path with a `document_type` flag, not two separately-implemented systems.

**Features to simplify:** The Order status dropdown should expose (or automatically drive) the full `OrderStatus` funnel, not a hand-picked 6-of-13 subset that skips the entire quote sub-phase. The ~15 note fields collapse into one `OrderNote` model with a `field_context`/`visibility` tag rather than 15 separately-named columns.

**Features to postpone:** Order-specific reporting/export. Generalizing Wrap-only proof/quote approval to every category can be phased, though the *quote* approval half is arguably P0 since it's the literal missing link in "Quote → Order."

**Features not worth rebuilding as-is:** The legacy Job/JobItem/JobActivity model (except its `JobNote` *shape*, which is worth reusing); the `order_quotes` catch-all collection; the raw-dict (non-Pydantic) document generation currently in `orders.py`; the 15-field note sprawl.

**Risks, conflicts, and dependency concerns:**
- Highest-risk domain in the whole investigation series to get wrong — touches real money, and every other domain's reporting depends on its data being trustworthy.
- Tightly coupled with the Business Finance rebuild (Profit Analytics needs this domain's Order-Item-level cost fields, which already exist — `estimated_price`/`actual_cost`/`labor_estimate`/`material_estimate` — confirming this is a wiring problem, not a missing-data problem).
- Permission enforcement (§6) must be added domain-wide before any real (non-family) customer's financial data flows through this system.
- **[NEW]** The Notes rebuild and the Activity Log rebuild are coupled — if notes become their own timestamped collection, each note-add should itself generate an activity-log entry, closing two gaps (§4's field-sprawl and §7's missing notes-edit event) in one change.

**Required shared components/services:**
- One shared atomic sequence-number generator (Order/Quote/Invoice numbering).
- One shared `require_permission()` pattern applied to every route in this domain (currently zero coverage).
- One shared PDF-generation service (currently 3 separate inline ReportLab implementations).
- **[NEW]** One shared `OrderNote` service/collection, reused identically by Order-level and Order-Item-level notes rather than two separate implementations.

**Suggested implementation order inside this domain:**
1. Add permission enforcement to Orders/Order-Items/Quotes/Invoices routes (fastest, highest-risk-reduction fix).
2. Fix the Order-number race condition + add real Quote/Invoice numbering.
3. Wire `generate-quote`/`generate-invoice` into the Order Detail UI with real buttons (reconnects the pipeline).
4. Add a real customer-portal Quote approve/decline action (generalized, not Wrap-only).
5. **[NEW]** Replace the flat note fields with the `OrderNote` collection + activity-log integration.
6. **[NEW]** Add the deposit-required/deposit-paid gate.
7. Retire the legacy Job/standalone-Quote-conversion path and `order_quotes` collection.

---

## 11. Open Decisions

1. **Should the standalone `/quotes` and `/invoices` pages be retired in favor of generating Quotes/Invoices exclusively from an Order's Order Items, or is there a real business need for a quote/invoice not tied to any Order?**
   *Why it matters:* Determines whether "Order-first" is the only path or a secondary "quick invoice" escape hatch must be kept.
   *Recommended answer:* Order-first as the primary path, with a small, clearly-separate "quick invoice, no order" escape hatch for genuinely order-less charges.
   *Can proceed without it?* No — shapes the entire rebuild architecture for this domain.

2. **Should customer quote approval require an e-signature, or is a simple Approve/Decline button sufficient?**
   *Why it matters:* Sign shops often want a signed approval on file for liability/scope-change protection.
   *Recommended answer:* Reuse the existing e-signature capability (once its known unauthenticated-read bug is fixed, per `FILE_UPLOADS_ATTACHMENTS_STORAGE_REBUILD_DOC.md`) rather than building a second mechanism.
   *Can proceed without it?* Yes — can start with a button and layer signature capture in afterward.

3. **What should happen to an Order if its generated Quote is declined?**
   *Why it matters:* No `declined`/`rejected` handling exists in the Order status funnel today.
   *Recommended answer:* Add an explicit `quote_declined` status with a required reason field, visible in the activity log.
   *Can proceed without it?* Yes for MVP, but should resolve before general availability.

4. **[NEW] How strictly should the "deposit required before work begins" rule be enforced?**
   *Why it matters:* A hard block on `start-production` could frustrate a legitimate rush job where the owner verbally trusts the customer; no enforcement at all (today's state) means the rule doesn't really exist.
   *Recommended answer:* A soft gate by default — `start-production` shows a clear warning/confirmation if `deposit_required` is true and `payment_status` is not `deposit_paid`/`paid`, with an explicit Owner/Admin-only override, logged to the activity trail when used. A per-tenant setting could later make it a hard block.
   *Can proceed without it?* No — this decision shapes whether the deposit gate is even worth building versus just surfacing a visible warning badge.

5. **[NEW] Should Order/Order-Item notes distinguish more than two visibility tiers (internal vs. customer-facing), e.g., a Production-only note staff don't want Sales to see, or is two tiers sufficient?**
   *Why it matters:* The current 15-field sprawl exists partly *because* different departments wanted their own note field; collapsing to too few tiers could recreate the same pressure to add "just one more field" later.
   *Recommended answer:* Two tiers (internal/customer) plus an optional free-text `department_tag` on internal notes (not a new visibility tier, just a filter) — flexible without recreating field sprawl.
   *Can proceed without it?* Yes — two tiers is a safe default to start with; the tag can be added non-breaking later.

6. **[NEW] Should Quote/Invoice/Work-Order-Summary generation happen automatically on status transition, or only on an explicit staff button-click?**
   *Why it matters:* Automatic generation (e.g., quote auto-generated the moment all Order Items have a `pricing_snapshot`) is more "connected" but removes a staff review step before a customer-facing document is created.
   *Recommended answer:* Explicit button-click, with the button only enabled once every Order Item has a `pricing_snapshot` — keeps a human review step for a customer-facing financial document, matching how the rest of this domain already treats money-related actions cautiously (per Sprint 1 pricing's own override/approval philosophy, cross-referenced from the Pricing rebuild docs).
   *Can proceed without it?* Yes, can start explicit and revisit automation later.

---

## 12. Build Readiness Checklist

- **Ready now:** The core Order/Order-Item/Production-Task data model and its automatic progress cascade — genuinely solid, minimal rework needed.
- **Ready now:** Stripe invoice payment flow (Customer Portal side) — carry forward largely as-is.
- **Ready now:** The already-written (if unwired) `generate-quote`/`generate-invoice`/`generate-work_order` logic — needs upgrading to shared Pydantic models + real numbering, not a from-scratch design.
- **Blocked by decision:** Whether standalone (order-less) Quotes/Invoices remain supported (Open Decision #1).
- **Blocked by decision:** E-signature vs. simple-button quote approval (Open Decision #2).
- **Blocked by decision:** Deposit-gate strictness (Open Decision #4).
- **Blocked by decision:** Notes visibility-tier design (Open Decision #5).
- **Blocked by dependency:** Reconnecting Quote/Invoice generation to the Order UI depends on first resolving the raw-dict-vs-Pydantic-model shape inconsistency in `db.quotes`/`db.invoices`.
- **Blocked by dependency:** Trustworthy Profit & Margin Analytics (Business Finance domain) depends on this domain directing all cost/profit data through the current Order Item model, not the legacy Job model.
- **Blocked by dependency:** The Notes rebuild depends on the Activity Log domain's shared logging pattern being ready to receive a new "note added" event type.
- **Needs original-code review:** `ActionType.CREATE_INVOICE`'s exact write-target shape (modern vs. legacy) was not verified line-by-line this session.
- **Needs original-code review:** Wrap Command Center's customer-approval endpoints' authorization scoping was not verified line-by-line this session.
- **Needs design/spec clarification:** The full customer-facing Quote approval experience once generalized beyond Vehicle Wrap; the exact deposit-request UX (how/when a deposit amount is presented to a customer for payment).

**Overall status: Not build-ready as a connected pipeline.** The individual pieces (Order model, Order Items, Production Tasks, Stripe payment) are strong and mostly reusable, but the domain's namesake workflow — Quote → Order → Invoice — does not functionally exist as a connected system today, and three specific sub-features explicitly named in this domain's scope (deposits-before-work, real order notes, order-specific customer communication) do not exist as enforced/functional features at all, only as unused schema fields or manual paper checklists. This is the highest-priority domain to resolve once rebuild work begins, given every other domain's financial trustworthiness depends on it.

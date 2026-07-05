# New Order Workflow (Quote → Order → Invoice) — Rebuild Investigation Document

**Investigation date:** 2026-02-15 (session continuation)
**Mode:** Documentation only. No code, UI, or files were written or modified. This is flagged by the user as large/foundational/revenue-critical, so the full 12-section template was used and the investigation went deeper (line-level code tracing, not just route inventory) than prior domain docs in this series.

**User context carried into this investigation:** No real production customers exist yet (family/test accounts only) — no customer/order data needs to be preserved through the rebuild. This removes migration risk from every recommendation below.

---

## 1. Executive Summary

**What this domain does:** This is the money-making core of SignGuy AI — the path from "a customer wants something" to "we got paid for it": Quote (estimate) → Order (the job) → Order Items/Job Tickets (what's actually being made) → Production Tasks (how it gets made) → Invoice (the bill) → Payment.

**Why it exists:** Every other domain documented in this series (Inventory, Productivity, Business Finance, AI Workspace) either feeds into or reads from this pipeline. It is the transactional spine of the whole application.

**Main users:** Owner/Admin (full lifecycle), Staff/Production (Job Tickets + Production Tasks only), Customers via the Customer Portal (view quotes/invoices, pay invoices, approve Vehicle-Wrap-specific proofs/quotes).

**Main business value:** Converts a sales conversation into a trackable, billable, producible unit of work with a paper trail.

**Critical finding stated up front (elaborated throughout this document):** The current codebase contains a well-designed, modern 4-layer Order architecture (`Order → Job Ticket → Quote/Invoice → Production Task`, matching the platform's mandated `Quote → Order → Invoice` / `Order → Order Item(s)` terminology almost exactly), but **the Quote and Invoice layers of that architecture are not actually wired to any frontend UI** — the backend endpoints that generate a Quote or Invoice directly from an Order's Job Tickets (`POST /orders/{id}/generate-quote`, `/generate-invoice`, `/generate-work_order`) are called from **nowhere in the entire frontend** (confirmed by full-repo grep). Instead, the live, actually-used Quote and Invoice flows are two **separate, older, standalone systems** (`routes/quotes.py`, `routes/invoices.py`) that are tied to a **deprecated legacy "Job" model** (`db.jobs`/`db.job_items`, whose own frontend route now says `<LegacyJobsRedirect />`), not to the current Order/Job-Ticket model at all. In practice, **there is no connected, working Quote → Order → Invoice pipeline in the live application today** — Orders function as an isolated production-tracking tool with a manual status dropdown, while Quoting and Invoicing happen in a parallel universe that dead-ends into a page nobody can reach.

**Original features that must be preserved:**
- The 4-layer Order/Job-Ticket/Production-Task data model itself (very well designed — sequential per-category workflow templates, automatic progress roll-up Task→Ticket→Order, proper activity logging via `log_activity`).
- Sequential, human-readable Order numbering (`ORD-0001`).
- Job Ticket dynamic specs schema (per-category field sets — rigid signs vs. banners vs. vehicle wrap each get relevant fields).
- Customer Portal invoice payment (Stripe Checkout redirect + webhook + client-side polling reconciliation) — genuinely well-built.
- Order file/attachment storage with e-signature capture on files (`order_drawings.py`), even though the read-side of that has a known unauthenticated-access bug (already tracked, cross-referenced below).
- Automatic Task→Ticket→Order progress and status cascade (`services/workflow_engine.py`).

**Original features that are duplicates, outdated, incomplete, or should not be rebuilt as-is:**
- The entire legacy `Job`/`JobItem` system (`routes/jobs.py`, `db.jobs`, `db.job_items`) — superseded, frontend-redirected away, yet still the actual destination of the standalone Quotes page's "Convert to Job" action.
- The standalone Quote system (`routes/quotes.py`) as currently wired — the *concept* (a customer-facing estimate document) must be preserved, but its implementation converts into the dead legacy Job system and has no relationship to the modern Order model.
- The standalone Invoice-from-legacy-job path (`POST /invoices/from-job/{job_id}`) — same issue.
- The Order-side `generate-quote`/`generate-invoice`/`generate-work_order` endpoints as currently implemented — the *idea* is exactly right (generate the customer document straight from the Job Tickets that are already fully specified), but the implementation writes ad-hoc raw dicts (not the shared `Quote`/`Invoice` Pydantic models used elsewhere) directly into the same collections the standalone systems use, creating shape inconsistency within one collection.
- A second, parallel "production workflow template" system (`routes/production_timeline.py` + `models/production_timeline.py`'s `TimelineStage`/`TimelineTemplate`) that the codebase's own comments acknowledge is confusingly similar to (but must not be mixed with) the Order model's own `WorkflowStage`/`WorkflowTemplate` (Layer 4 automation, `services/workflow_engine.py`).

---

## 2. Scope Boundaries

**What belongs inside this domain:**
- Order intake, Order status lifecycle, Job Tickets (Order Items), Production Tasks, per-category workflow templates
- Quote generation, sending, and customer approval/decline
- Invoice generation, sending, payment recording, Stripe Checkout, PDF generation
- Order-level file attachments, mockups, proofs, work-order/production paperwork generation
- Order/Quote/Invoice activity logging

**What does NOT belong inside this domain:**
- Customers themselves (Customers domain — this domain only references `customer_id`)
- Pricing calculation logic/rate cards (Pricing/Settings domain — this domain only consumes `pricing_snapshot` output)
- Inventory/material consumption (Inventory domain — already documented separately; Job Tickets reference materials but don't own inventory logic)
- Payroll/time tracking for staff working on tasks (Employee/Productivity domain — `assigned_to`/`assigned_user_id` are references only)
- Aggregate financial reporting/profitability analytics (Business Finance domain, documented separately — already flagged there that Profit Analytics reads from the **legacy** `jobs`/`job_items`, which this document independently reconfirms is the deprecated system)
- Webstore-originated orders' checkout/cart experience (Webstores domain — though webstore orders do eventually land in `db.orders` per the `source`/`webstore_id` filter fields seen in `list_orders`, the *storefront* side is out of scope here)

**Which shared systems it depends on:**
- Users/Roles/Permissions (currently barely used — see §6)
- Customers (customer_id/name/contact snapshot on every Order/Quote/Invoice)
- File Storage / Object Storage (`services/object_storage.py`, order file attachments)
- Notifications (`CustomerNotification` on invoice portal-send — only piece of this domain that notifies anyone)
- AI Credits / AI Assistant (order/invoice creation via the `ActionType.CREATE_ORDER`/`CREATE_INVOICE` structured-action system, documented in the AI Workspace investigation)
- Stripe (invoice payment via `stripe_connect.py`)
- Activity Log (`order_activities` collection via `log_activity` — the best-attributed activity log found across this whole investigation series, always carries `user_id`/`user_name`)

**Which future modules depend on it:**
- Business Finance/Reporting (needs real Order/Invoice data, not legacy Job data, to be trustworthy — already flagged there)
- AI Workspace (its `create_order`/`create_invoice`/`categorize_expense` structured actions write into this domain's tables)
- Customer Portal (Quotes/Invoices/Orders tabs all read this domain's data)
- Webstores (webstore checkout ultimately produces an Order here)

---

## 3. Screen and Route Inventory

| Screen/Route | Purpose | Intended user | Main data shown | Main actions | Rebuild disposition | Related connections |
|---|---|---|---|---|---|---|
| `/orders` (`OrdersPage.js`) | List/search current Orders | Staff/Owner | Order number, customer, status, due date | Filter, search, open, create new | **Rebuild (fix data feed, keep UX)** | `orders` |
| `/orders/new` (`NewOrderForm.js`) | Create a new Order (intake) | Staff/Owner | Customer, source, dates, shared context fields | Submit → `POST /orders` | **Keep** — clean intake form, matches the well-designed `Order` model | `orders`, `customers` |
| `/orders/:id` (`OrderDetail.js`) | Central Order workspace — tabs for tickets, production, files, financial docs | Staff/Owner | Job Tickets, Production Tasks, activity, linked Quotes/Invoices/Work-Orders (read-only) | Add ticket, start production, change status dropdown, upload files, send file for approval | **Rebuild — this is where the missing Quote/Invoice generation buttons must be added.** Confirmed via full grep: this page can *display* linked quotes/invoices/work-orders (`GET /orders/{id}/financials`) but has **no button anywhere calling `generate-quote`/`generate-invoice`/`generate-work_order`/`start`ing an approval flow** — those 3 backend capabilities are unreachable dead code today. | `job_tickets`, `production_tasks`, `order_files`, `order_activities` |
| `/orders/:id/add-ticket` (`AddTicketToOrder.js`) | Add a Job Ticket (Order Item) to an existing order | Staff | Category-specific dynamic spec form | Submit → `POST /job-tickets` | **Keep** | `job_tickets` |
| `/orders/:orderId/items/:itemId/wrap-command-center` | Vehicle-Wrap-specific extended workspace for one Job Ticket | Staff | Wrap-specific design/pricing/proof tools | Wrap-specific proof/quote approval triggers (the *only* working customer-approval path found in this domain) | **Keep, but generalize the pattern** — the fact that proof/quote approval only exists for this one category is itself a finding (see §5/§10). | `job_tickets`, `portal.py` wrap endpoints |
| `/quotes` (`Quotes.js`) | Standalone Quote list/create/manage | Staff/Owner | Quotes from `db.quotes` UNION legacy `db.order_quotes` | Create, edit, "Convert to Job", "Email quote" (shows "coming soon" toast — not implemented), download PDF | **Rebuild entirely, retarget at Orders** — currently the primary live quoting UI, but its only forward action creates a dead-end legacy Job. | `quotes`, `order_quotes`, **`jobs`/`job_items` (legacy, dead-end)** |
| `/jobs`, `/jobs/:id` | — | — | — | Both routes are `<LegacyJobsRedirect />`/`<LegacyJobRedirect />` | **Remove** — already fully retired by the frontend; only the backend routes and the Quote-conversion target remain to be cleaned up. | `jobs`, `job_items` |
| `/invoices` (`Invoices.js`) | Standalone Invoice list/create/manage | Staff/Owner | Invoices (manual entry or from legacy Job), Stripe reconciliation trigger | Create invoice (manual line items — no Job-Ticket import UI), send, record payment, download PDF | **Rebuild, retarget at Order Job Tickets** — currently requires re-typing line items that already exist as fully-specified Job Tickets. | `invoices`, `jobs` (optional legacy link) |
| `/customer-portal/quotes` (`PortalQuotes` in `PortalPages.js`) | Customer views their quotes | Customer | Quote line items, status, total | **Read-only — no Approve/Decline action exists in the component at all** (confirmed) | **Rebuild — must add real approve/decline actions** | `portal.py` `/quotes` |
| `/customer-portal/invoices` (`PortalInvoices`) | Customer views/pays invoices | Customer | Invoice total, balance, status | **Pay Now → real Stripe Checkout redirect + webhook + polling verification** — well-built | **Keep** | `portal.py` `/invoices/{id}/pay`, `stripe_connect.py` |
| `PlatformAdmin`/reporting on Orders | — | — | — | **Does not exist** — no Order-specific export/report anywhere (already flagged in the Business Finance investigation) | **Postpone or build new** | n/a |

---

## 4. Data and Record Model

**Primary records (current, modern system — `models/orders.py`):**
- `Order` (Layer 1) — `orders` collection. Has `linked_quote_ids`/`linked_invoice_ids` arrays, `order_number` (sequential `ORD-####`), rich shared-context fields inherited by items, `overall_progress`.
- `JobTicket` (Layer 2, = "Order Item") — `job_tickets` collection. Extremely rich spec model (`JobTicketSpecs`, `extra = "allow"` for dynamic per-category fields), artwork/proof/QC sub-state machine, clone lineage tracking.
- `ProductionTask` (Layer 4) — `production_tasks` collection. Generated automatically from a `WorkflowTemplate` per category; carries `dependency_task_id`, `timestamp_history`.
- `WorkflowTemplate`/`WorkflowStage` — `workflow_templates` collection. Per-category, per-tenant (or system-default) ordered stage list.
- `OrderActivity` — `order_activities` collection. Best-attributed activity log in the codebase (always `user_id`+`user_name`).

**Primary records (legacy system, still live via the standalone Quotes/Invoices UI — `routes/jobs.py`):**
- `Job`, `JobItem`, `JobActivity` — `jobs`/`job_items`/`job_activities` collections. Already documented in the Activity Log investigation as having a **confirmed attribution bug** (every entry shows `"user_name": "System"`, even for authenticated owner actions) — cross-referenced, not re-counted.

**Primary records (standalone, semi-connected — `routes/quotes.py`, `routes/invoices.py`):**
- `Quote` (Pydantic model, standalone) — `db.quotes`. **Same collection name** as the raw dicts written by `orders.py`'s `generate-quote` endpoint, but a **different shape** (the standalone model has `quote_number`... actually confirmed neither path ever sets `quote_number` — see below).
- `Invoice` (Pydantic model, standalone) — `db.invoices`. Same collection-sharing situation as Quote.
- `order_quotes` — a third, even older collection that stores type-tagged (`quote`/`invoice`/`work_order`) documents, still actively read as a legacy fallback by both the standalone Quote/Invoice routes AND the Order's `/financials` aggregator, AND still actively written to by `generate_work_order`.

**Required identifiers/numbering:**
- **Order**: proper sequential numbering exists (`ORD-0001`, `ORD-0002`, ...) via `_next_order_number()`. **However, this is a read-then-increment pattern with no atomic guard** — two orders created in the same instant (e.g., two staff members, or a webstore checkout racing a manual entry) could compute the same "next" number before either write commits, producing a duplicate `order_number`. Confirmed by code read: `find().sort().limit(1)` then a separate `insert_one()`, no transaction/upsert-counter.
- **Quote**: **no numbering scheme exists at all.** Both the standalone-created quote and the Order-generated quote fall back to `quote_id[:8].upper()` (a raw UUID fragment) whenever `.get("quote_number")` is empty — which is always, since nothing ever sets it.
- **Invoice**: same gap — `invoice_number` is never set anywhere; PDF/portal displays fall back to the UUID fragment.
- This means customer-facing Quote/Invoice PDFs today show an ugly, non-sequential, unprofessional "number" (e.g., `QUOTE #A1B2C3D4`) while Orders get a clean `ORD-0007`.

**Statuses:**
- `OrderStatus` — 13 values, well-designed funnel (`new_intake` → `awaiting_review` → `awaiting_quote` → `quote_sent` → `awaiting_approval` → `approved` → `in_production` → ... → `completed`), but **nothing in the current live UI actually drives an Order through the quote-related states** (`awaiting_quote`/`quote_sent`/`awaiting_approval`) since the endpoint that sets `awaiting_quote` (`generate-quote`) is never called by the frontend. In practice, Orders observed in the live app likely only ever move between `new_intake` and whatever the manual status dropdown in `OrderDetail.js` lets staff pick directly (which — confirmed at `OrderDetail.js` line 509 — only offers `approved, in_production, on_hold, ready_for_pickup, completed, cancelled`, **skipping the entire quote sub-funnel in the dropdown too**).
- `JobTicketStatus` — 13 values, properly cascaded automatically by `workflow_engine.py`.
- `QuoteStatus`/`InvoiceStatus` (legacy models) — standard draft/sent/approved/paid states, not verified line-by-line this session but referenced consistently.

**Relationships:**
- `Order.linked_quote_ids`/`linked_invoice_ids` — populated only by the (unused) Order-generation endpoints; never populated by the standalone Quote/Invoice creation flows (which don't take an `order_id` at all in the standalone `Quote`/`Invoice` create models — confirmed no `order_id` field referenced in `quotes.py`'s create/`invoices.py`'s create_invoice base flow, only the from-job variant links a legacy `job_id`).
- `JobTicket.order_id` — always set, reliable link, this part of the model is solid.
- `ProductionTask.job_ticket_id`/`order_id` — solid, both set.

**Data currently duplicated or inconsistently stored:**
1. Two shapes of "Quote" and two shapes of "Invoice" documents coexist in the same `db.quotes`/`db.invoices` collections (Pydantic-model-created vs. raw-dict-created) — a query that assumes the Pydantic shape could KeyError or silently miss fields on the other shape.
2. Three generations of "Order-adjacent document" storage exist simultaneously: `order_quotes` (oldest, type-tagged catch-all) → `quotes`/`invoices` (current, split collections) → still cross-read/unioned together everywhere (`_find_quote_document`, `_fetch_portal_quotes_combined`, `/orders/{id}/financials`) rather than migrated.
3. Two independent "production workflow template" systems (`workflow_templates`/`WorkflowTemplate` vs. `production_timeline.py`'s `TimelineTemplate`) — acknowledged by an in-code comment as a known confusion risk, not yet resolved.

**Recommended clean rebuild structure:**
- One `Order` record. One `OrderItem` record (rename from `JobTicket` per the platform's mandated terminology — the model is otherwise excellent, keep its shape). One `ProductionTask` record. Retire `WorkflowTemplate` vs `TimelineTemplate` duplication into a single template system.
- Quote and Invoice should be **generated views/snapshots of an Order's Order Items**, not separately-created objects with their own independent lifecycle — i.e., promote the *already-half-built* `generate-quote`/`generate-invoice` pattern to be the ONLY way a Quote/Invoice is created, using the shared `Quote`/`Invoice` Pydantic models (not raw dicts) so there is exactly one shape per collection.
- Add real, atomic sequential numbering for both Quotes and Invoices (same pattern needed for Orders' race-condition fix — a single shared "next sequence number" service, reused by all three, is the right shared component).

---

## 5. Workflows

### Workflow A — Intended/Designed Flow (per the data model's own docstring: "Order → Job Tickets → Quotes/Invoices → Production Tasks")
1. **Trigger:** Staff creates an Order (intake).
2. **User steps:** Add one or more Job Tickets (Order Items) with full specs.
3. **Automatic actions:** None yet — tickets sit until "Start Production" or "Generate Quote" is triggered.
4. **(Designed but unreachable) Generate Quote:** `POST /orders/{id}/generate-quote` — builds line items from tickets' `pricing_snapshot`, writes a Quote, flips Order status to `awaiting_quote`.
5. **(Missing entirely) Customer reviews/approves quote** — no working approval action exists for standard orders (only Wrap Command Center tickets have one).
6. **(Designed but unreachable) On approval, Order should flip to `approved`, production should start, and eventually `POST /orders/{id}/generate-invoice`** produces the bill.
7. **Completion criteria (designed):** Invoice paid + Order status `completed`.
8. **Failure/edge case handling (designed):** None found for a declined quote (no `declined`/`rejected`-triggered workflow branch exists on the Order side).

### Workflow B — Actual/Live Flow (what staff can really do today)
1. **Trigger:** Staff creates an Order, adds Job Tickets, clicks "Start Production" (this DOES work — `production_flow_enabled` tickets get `ProductionTask`s generated from the category's `WorkflowTemplate`).
2. **Automatic actions:** Task completion cascades to Ticket status/progress, Ticket cascades to Order `overall_progress` — this part works well and automatically.
3. **Status changes:** Only via the manual dropdown in `OrderDetail.js` (6 of 13 possible statuses exposed).
4. **Billing (disconnected from the above):** Staff must separately open `/invoices`, manually re-type line items (or, in the legacy path, convert a legacy Job to an invoice), and send/record payment there — with no automatic link back to the Order or its Job Tickets' actual specs/pricing.
5. **Quoting (disconnected, dead-end when converted):** Staff open `/quotes`, manually build a quote (again, no tie to an Order's Job Tickets), and if the customer verbally/emailedly approves, click "Convert to Job" — which creates a **legacy Job** that has no live page to be managed from ever again.
6. **Completion criteria (actual):** Whatever staff manually decide, with no system-enforced connection between "did the customer pay" and "is the order marked completed."
7. **Notifications:** None trigger anywhere in this actual flow except the one Invoice → Customer Portal "send to portal" action, which does create a real `CustomerNotification`.

### Workflow C — Customer Portal Payment (the one genuinely complete, working sub-flow)
1. **Trigger:** Staff calls `send_invoice_to_portal` (requires `customer.portal_enabled`).
2. **Customer:** Opens `/customer-portal/invoices`, clicks "Pay Now" → `POST /portal/invoices/{id}/pay` → Stripe Checkout session → redirect.
3. **Automatic actions:** Stripe webhook reconciles payment; frontend also polls `/stripe-connect/payment-status/{session_id}` up to 6 times as a client-side belt-and-suspenders check.
4. **Completion:** Invoice `amount_paid`/`status` updated by the webhook (source of truth), not the client redirect.
5. **Edge cases handled well:** Cancelled checkout, webhook lag (explicit "waiting on webhook reconciliation" log), URL param cleanup.

### Workflow D — Vehicle Wrap-specific Proof/Quote Approval (the only customer-approval mechanism that actually exists)
1. Customer opens the Wrap-specific portal flow tied to a single Job Ticket.
2. `POST /portal/orders/{job_id}/wrap/{ticket_id}/approve-proof` and `.../approve-quote` exist and presumably flip that one ticket's `proof_approval_status`/similar.
3. This is scoped to ONE category (`vehicle_wrap`) only — there is no equivalent generalized "approve this Order's quote" endpoint for the other 8 `JobTicketCategory` values (rigid signs, banners, cut vinyl, digital print, apparel, services, promo/misc, custom).

---

## 6. Permissions and Portal Access

**Internal roles that need access:** Owner, Admin, Sales/Front-desk Staff (quotes/orders), Production Staff (job tickets/production tasks only, not financials), Bookkeeper (invoices/payments).

**What each role can actually do today — confirmed, not guessed:**
- `Permission.QUOTES_VIEW/CREATE/EDIT/DELETE/CONVERT`, `Permission.JOBS_VIEW/CREATE/EDIT/DELETE`, and `Permission.INVOICES_VIEW/CREATE/EDIT/DELETE` **all exist, are defined in `models/auth.py`, and are assigned to roles** — but **zero of them are ever checked** in `routes/orders.py`, `routes/job_tickets.py`, `routes/quotes.py`, or `routes/invoices.py` (confirmed by full grep: `has_permission` is imported in 2 of the 4 files and never called; no `Permission.` reference appears in any route body across all 4 files). **There is also no `Permission.ORDERS_*` entry at all** — the enum was apparently written for the legacy Job/Quote/Invoice system and never extended (or wired) to the current Order/Job-Ticket model.
- **Net effect: any authenticated user of any role, in any tenant, can create, view, edit, or delete any Order, any Job Ticket, any Quote, or any Invoice.** This is the single most severe permission gap found across this entire multi-session investigation series, because unlike Productivity (tasks/appointments) or AI Workspace (chat actions), this domain directly controls real customer money and contractual documents.

**External/portal access rules:**
- Customer Portal correctly scopes every read to the authenticated customer's own `customer_id` (not verified line-by-line for every portal endpoint this session, but the invoice/quote fetch helpers take a `customer` object and filter by it — consistent with the pattern seen elsewhere in the app).
- Wrap-specific approval endpoints presumably validate the ticket belongs to that customer's order — not verified this session, flagged as a dependency to confirm before rebuild.

**Financial/sensitive data restrictions:** None internally (see above — total gap). Externally, portal scoping appears intact but wasn't exhaustively re-verified this session.

**Permission conflicts or risks in the old system:**
- The AI Assistant's structured `CREATE_ORDER` action correctly requires `Permission.JOBS_EDIT` before letting the AI create an Order — meaning **the AI Assistant is currently MORE permission-strict than a human using the actual Orders UI**, since the human-facing `POST /orders` endpoint has no permission check at all. A Staff member blocked from creating a Job via the AI Assistant can still create the exact same Order by simply using the regular `/orders/new` form.

---

## 7. Integrations and Automation

**Shared internal systems used:** Object storage (order file attachments), Activity Log (`order_activities`, well-attributed), Customer notifications (invoice-portal-send only).

**External services used:** Stripe (invoice payment + webhook reconciliation via `stripe_connect.py`), ReportLab (Quote/Invoice/Work-Order PDF generation, all inline in the route files rather than a shared PDF service).

**Data sent and received:** Stripe Checkout session creation/retrieval; no other outbound integrations found in this domain (email sending for quotes is explicitly NOT implemented — the "Email quote" button shows a "coming soon" toast).

**Failure handling:** Stripe path has real retry/polling logic (Workflow C above). No other failure handling observed — e.g., `generate-quote`/`generate-invoice` have no rollback if a downstream `db.orders.update_one` fails after the quote/invoice insert succeeds (not verified as an actual bug, just an unguarded two-step write with no transaction).

**Background automation:** None — no scheduled job chases stale `awaiting_quote` orders, no reminder if a customer hasn't paid an invoice (that logic lives in the AI Assistant's Nudges widget, documented separately, and only checks `invoices`/`quotes` generically, not this domain's specific Order-linked ones).

**Emails, SMS, in-app notifications, tasks, documents, scheduled actions:** Only the one Invoice-portal-send notification found. No quote-sent email, no invoice-sent email, no payment-received email/SMS confirmation to the customer beyond whatever Stripe itself sends.

---

## 8. AI and Credit Usage

**AI tools/features in this domain:**
- `ActionType.CREATE_ORDER` (aliased from an older `create_job` name) — AI Assistant (floating widget only, per the AI Workspace investigation) can create a real `db.orders` record via natural language, correctly permissioned (`Permission.JOBS_EDIT`) and correctly targets the CURRENT Order model (not the legacy Job model) — genuinely the most architecturally "correct" quote/order-adjacent code path found in this whole domain.
- `ActionType.CREATE_INVOICE` — same structured-action system, permissioned via `Permission.INVOICES_EDIT`. Not verified this session whether it targets the modern `db.invoices` shape or the legacy `job_id`-linked shape — flagged as a dependency to confirm.
- `ActionType.ASSIGN_EMPLOYEE`, `LOG_TIME_ENTRY`, `CATEGORIZE_EXPENSE`, `UPDATE_JOB_STATUS`, `ADD_MATERIAL`, `UPDATE_MATERIAL_COST` — all touch this domain's adjacent data (already inventoried in the AI Workspace document).

**User inputs:** Natural-language chat request (e.g., "create an order for Jane Smith for 3 banners").

**Outputs:** A real Order/Invoice record; a confirmation card shown in the floating widget.

**Where output is saved:** `db.orders`/`db.invoices` directly (via `services/ai_assistant_actions.py`).

**Credit cost:** Covered under the flat `ai_business_assistant` per-turn cost documented in the AI Workspace investigation — no domain-specific credit line item.

**Required confirmations:** Yes — structured `ActionType` actions are confirmation-gated by default (`requires_confirmation: bool = True`), a real safeguard before the AI creates a binding Order/Invoice.

**Edit/review requirements:** The confirmation pill shows the parsed parameters before execution, giving the user a review step — not verified this session whether every field the AI extracted is actually shown (e.g., could the AI silently guess a wrong customer and the confirmation pill not surface that clearly enough) — flagged as an open decision for the rebuild's UX design, not a confirmed bug.

**Audit events:** Written to `ai_action_audit` (per the AI Workspace investigation's finding that this is only half the picture of AI activity, but for structured actions specifically, this IS the correct, permissioned audit trail).

**Failure behavior:** Not verified line-by-line this session for the Order/Invoice action handlers specifically.

---

## 9. Reporting and Metrics

**Dashboard cards:** `Dashboard.js`'s Financial Attention widget shows unpaid/overdue/due-this-week/recent-payments from the real `invoices` collection (documented in the Business Finance investigation) — but does not distinguish Order-linked invoices (modern) from legacy-Job-linked invoices (old), since both shapes coexist in the same collection.

**Reports:** None Order-specific exist (no "Orders this month," "average time in production," "orders by source" report) — the closest is `production-timeline/analytics`'s bottleneck detection, which is a different collection (`production_timelines`) from this domain's own `production_tasks`, per the code's own acknowledged duplication.

**Export needs:** No CSV/PDF export of the Order list itself exists (individual Order/Quote/Invoice PDFs do exist and work).

**Metrics this module creates or affects:** Revenue (via invoices), AR/aging (via invoices), production throughput (via production_tasks — but NOT reflected in the currently-used Profit & Margin Analytics, which reads only the legacy `jobs`/`job_items`, independently reconfirming the Business Finance investigation's top finding).

**Financial/privacy restrictions:** None enforced (see §6).

---

## 10. Rebuild Recommendations

**Recommended rebuild architecture:**
- Single source of truth: `Order` → `OrderItem` (renamed from Job Ticket) → `ProductionTask`, exactly as the current modern model already does it (this part doesn't need reinventing, just finishing and connecting).
- Quote and Invoice become **generated, versioned snapshots** of an Order's Order Items — created only via one shared "generate document" service (reusing the *already-written* logic in `orders.py`'s `generate-quote`/`generate-invoice`, upgraded to use the shared Pydantic models and real sequential numbering), never created standalone/disconnected from an Order again.
- Retire the legacy `Job`/`JobItem` system and the `order_quotes` catch-all collection entirely (no migration needed per the user's stated context — no real data to preserve).
- Retire the duplicate `production_timeline.py` template system in favor of the Order model's own `WorkflowTemplate`/`ProductionTask` — or vice versa, whichever the Business Finance/Productivity rebuild timing favors — but pick exactly one.

**Recommended sub-system breakdown:**
1. Order Intake & Lifecycle (status funnel, activity log)
2. Order Items (specs, dynamic per-category schema, artwork/proof/QC state)
3. Production Engine (workflow templates, task generation, progress cascade) — already the strongest piece, mostly carry forward
4. Document Generation (Quote/Invoice/Work-Order — generated from Order Items, not separately authored)
5. Customer Approval (generalize the Wrap-only approve-quote/approve-proof pattern to every category)
6. Payment (Stripe Checkout — already solid, carry forward largely as-is)

**Features to combine:** Quote creation and Invoice creation should be the same underlying "generate customer document from Order Items" code path with a `document_type` flag, not two separately-implemented systems (mirrors the same "combine" recommendation already made for Contact/Support forms in the Adoption/Help investigation).

**Features to simplify:** The Order status dropdown should expose (or better, automatically drive) the full `OrderStatus` funnel rather than a hand-picked 6-of-13 subset that skips the entire quote sub-phase.

**Features to postpone:** Order-specific reporting/export (no report exists today; reasonable to sequence after the core pipeline is reconnected). Generalizing Wrap-only proof approval to every category can also be phased — but the *quote* approval half of that (not just proofs) is arguably P0, since it's the literal missing link in "Quote → Order."

**Features not worth rebuilding as-is:** The legacy Job/JobItem model; the `order_quotes` catch-all collection; the raw-dict (non-Pydantic) document generation currently in `orders.py`.

**Risks, conflicts, and dependency concerns:**
- This is the highest-risk domain in the whole investigation series to get wrong, since it touches real money and every other domain's reporting depends on its data being trustworthy.
- The Business Finance rebuild (Profit Analytics) and this domain's rebuild are tightly coupled — fixing one without the other leaves a gap (Profit Analytics needs this domain's cost-snapshot fields at the Order Item level, which do exist on `JobTicket` — `estimated_price`/`actual_cost`/`labor_estimate`/`material_estimate` — confirming that dependency from the Business Finance doc's Open Decision #2 is answerable: **yes, the current `JobTicket` model already has the fields needed**, it's a wiring problem, not a missing-data problem).
- Permission enforcement (§6) must be added domain-wide before any real (non-family) customer's financial data flows through this system.

**Required shared components/services:**
- One shared atomic sequence-number generator (Order/Quote/Invoice numbering, fixing the race condition too).
- One shared `require_permission()` pattern applied to every route in this domain (currently zero coverage).
- One shared PDF-generation service (currently 3 separate inline ReportLab implementations across `quotes.py`/`invoices.py`/`orders.py`'s work-ticket PDF).

**Suggested implementation order inside this domain:**
1. Add permission enforcement to Orders/Job-Tickets/Quotes/Invoices routes (fastest, highest-risk-reduction fix).
2. Fix the Order-number race condition + add real Quote/Invoice numbering.
3. Wire `generate-quote`/`generate-invoice` into `OrderDetail.js` with real UI buttons (this alone reconnects the pipeline).
4. Add a real customer-portal Quote approve/decline action (generalized, not Wrap-only).
5. Retire the legacy Job/standalone-Quote-conversion path and `order_quotes` collection.
6. Reconcile the two production-workflow-template systems into one.

---

## 11. Open Decisions

1. **Should the standalone `/quotes` and `/invoices` pages be retired in favor of generating Quotes/Invoices exclusively from an Order's Job Tickets, or is there a real business need for a quote/invoice that isn't tied to any Order (e.g., a one-off service charge)?**
   *Why it matters:* Determines whether "Order-first" becomes the only path or a secondary "quick invoice" path must be kept.
   *Recommended answer:* Keep Order-first as the primary path (matches the mandated terminology), but allow a lightweight "quick invoice, no order" escape hatch for genuinely order-less charges (e.g., a service call) — a small, clearly-separate feature, not the default flow.
   *Can proceed without it?* No — this decision shapes the entire rebuild architecture for this domain.

2. **Should customer quote approval require an e-signature (reusing the existing signature-capture capability already built for Order files), or is a simple "Approve"/"Decline" button sufficient?**
   *Why it matters:* Sign shops often want a signed approval on file for liability/scope-change protection.
   *Recommended answer:* Reuse the existing e-signature capability (already built, just needs its known unauthenticated-read bug fixed per the File Uploads investigation) rather than building a second signature mechanism.
   *Can proceed without it?* Yes, can start with a simple button and layer signature capture in afterward.

3. **Should the two parallel production-workflow-template systems (Order model's own vs. `production_timeline.py`'s) be merged into the Order-model one, the timeline one, or a new third one?**
   *Why it matters:* Both are actively used by different features (production task generation vs. bottleneck analytics) — merging incorrectly could break either.
   *Recommended answer:* Merge into the Order model's `WorkflowTemplate`/`ProductionTask` (it's the one directly tied to real Job Tickets and already has working progress cascade); have analytics read from it instead of maintaining a second collection.
   *Can proceed without it?* Yes, this can be sequenced after the core Quote/Invoice reconnection work.

4. **What should happen to an Order if its generated Quote is declined by the customer?**
   *Why it matters:* No `declined`/`rejected` handling exists in the Order status funnel today.
   *Recommended answer:* Add an explicit `quote_declined` (or reuse `on_hold`) status with a required reason field, visible in the Order's activity log.
   *Can proceed without it?* Yes for MVP, but should be resolved before general availability — declined quotes are a normal, frequent business event.

---

## 12. Build Readiness Checklist

- **Ready now:** The core Order/Job-Ticket/Production-Task data model and its automatic progress cascade (`services/workflow_engine.py`) — genuinely solid, minimal rework needed.
- **Ready now:** Stripe invoice payment flow (Customer Portal side) — carry forward largely as-is.
- **Blocked by decision:** Whether standalone (order-less) Quotes/Invoices remain a supported feature (Open Decision #1) — blocks the exact shape of the rebuilt Quote/Invoice creation flow.
- **Blocked by decision:** E-signature vs. simple-button quote approval (Open Decision #2) — blocks the Customer Portal approval UI design.
- **Blocked by dependency:** Reconnecting Quote/Invoice generation to the Order UI depends on first resolving the raw-dict-vs-Pydantic-model shape inconsistency in `db.quotes`/`db.invoices`.
- **Blocked by dependency:** Trustworthy Profit & Margin Analytics (Business Finance domain) depends on this domain's rebuild directing all cost/profit data through the current Order Item model, not the legacy Job model.
- **Needs original-code review:** `ActionType.CREATE_INVOICE`'s exact write-target shape (modern vs. legacy) was not verified line-by-line this session.
- **Needs original-code review:** Wrap Command Center's customer-approval endpoints' authorization scoping (does it correctly verify the ticket belongs to the requesting customer?) was not verified line-by-line this session.
- **Needs design/spec clarification:** What the full, customer-facing Quote approval experience should look like once generalized beyond Vehicle Wrap (Open Decision #2, plus general UX for the "Approve"/"Decline" flow itself).

**Overall status: Not build-ready as a connected pipeline.** The individual pieces (Order model, Job Tickets, Production Tasks, Stripe payment) are strong and mostly reusable, but the domain's namesake workflow — Quote → Order → Invoice — does not functionally exist as a connected system in the current codebase. This is the highest-priority domain to resolve once "start rebuild" begins, given every other domain's financial trustworthiness depends on it.

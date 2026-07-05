# Business Finance, Reporting & Analytics — Rebuild Investigation Document

**Investigation date:** 2026-02-15 (session continuation)
**Mode:** Documentation only. No code was written or modified. All findings below are confirmed by direct code reading (not guessed).

---

## 1. Purpose and Scope

**What this domain does:** Gives shop owners/admins visibility into the financial health and operational performance of the business — money in (sales, invoices paid), money out (expenses), profitability per job/category/customer, tax collected, outstanding receivables, payroll cost, and cross-cutting operational metrics (production speed, inventory, webstore performance).

**Main users:**
- Owner / Admin — primary users of all financial dashboards, exports, and tax-relevant data.
- Staff — currently gets inconsistent access (see §5); some financial widgets have zero permission gate.
- Platform Admin — a *separate*, platform-level analytics system (site traffic/errors/sessions across all tenants) that is architecturally adjacent but answers a different question ("is the platform healthy") not "is this shop profitable." Documented here for completeness, but it is NOT part of a single tenant's Business Finance domain and should not be merged into it during rebuild.

**What belongs here:**
- Manual Daily Sales / Expense entry (cash-basis bookkeeping)
- Profit & Margin analytics (per job/category/customer, benchmark-based underpricing detection)
- Invoice aging / accounts-receivable view
- Financial dashboard urgency widgets (unpaid, overdue, due this week, recent payments)
- Payroll cost reporting (already exists, lives in Employee module but is a financial report)
- Sales tax reporting (currently absent — see §8)
- Cross-domain reports: Customer, Order, Production, Inventory, Webstore reports (currently either absent or scattered as CSV buttons in their own pages)
- Data export (CSV/XLSX/PDF)

**What belongs elsewhere:**
- Platform Admin analytics (`admin_analytics.py`, site traffic/session/error tracking) — Platform Admin domain, not tenant-facing.
- Individual Order/Invoice/Quote PDF generation (already documented as part of Quotes/Orders/Invoices workflows) — only the *aggregate reporting* on top of these belongs here.
- Inventory stock levels themselves (Inventory domain) — only the *reporting/export layer* on inventory data belongs here.
- AI-generated reports/insights — these are covered in the separate "AI Workspace & Business Assistant" investigation, though the underlying financial metrics they read come from this domain.

---

## 2. Existing Feature Inventory

| Feature | Purpose | Keep / Merge / Simplify / Postpone / Remove | Related records/modules |
|---|---|---|---|
| **Daily Sales Entry** (`Financials.js`, `POST /api/financials/sales`) | Manual cash-basis logging of money received (cash/credit/check/other) + tax collected that day | **Merge/Simplify** — currently a fully separate ledger from real Invoice/Order payments, creating double-counting risk (see §3). Rebuild should decide: is this a bookkeeping convenience layer, or should it be replaced by aggregating real Invoice `paid` transactions? | `sales_entries` (new collection, standalone) |
| **Expense Entry** (`Financials.js`, `POST /api/financials/expenses`) | Manual expense logging with 21 preset categories, optional receipt photo | **Simplify** — receipt photo upload is **dead/non-functional** (see §3, confirmed by code read: frontend sends a raw `File` object inside a JSON body, backend `create_expense_entry` only does `await request.json()` and never looks at a `receipt_file` key — no object-storage wiring exists for this at all). Either wire it to the app's existing object-storage service (used everywhere else) or remove the UI affordance. | `expense_entries` (standalone) |
| **Financial Summary** (`GET /api/financials/summary`) | Total sales/expenses/net over date range | **Fix + Simplify** — confirmed bug: backend returns `{total_sales, total_expenses, net_profit, sales_count, expense_count}` but frontend reads `summary.total_tax` and `summary.net_income` (neither key exists in the response) → the "Sales Tax" and "Net Income" summary cards on the Financials page are silently broken/blank today. | `sales_entries`, `expense_entries` |
| **Invoice Aging Report** (`GET /api/financials/invoice-aging`) | Buckets outstanding invoice balances into 0-30/31-60/61-90/90+ day groups | **Keep** — well-built, correct math, good bucket model. Not currently surfaced in any frontend page (backend-only, confirmed by grep — no frontend call site found). | `invoices` |
| **Profit & Margin Analytics dashboard** (`ProfitMarginAnalytics.js`, `routes/profit_analytics.py`) | Per-job/category/customer revenue, cost, profit, margin, "underpriced" flag vs. selling-price benchmarks, trend chart | **Keep the concept, rebuild the data source** — **critical finding**: this entire feature reads from the **legacy `jobs`/`job_items` collections**, not the current `orders`/`job_tickets`/Order-Items model the rest of the app has migrated to (confirmed: `load_dashboard_rows()` queries `db.jobs.find(...)` and `db.job_items.find(...)`). This directly conflicts with the platform rule "Use Quote → Order → Invoice and Order → Order Item(s)." Any new order created through the current Orders system will **never appear** in Profit & Margin Analytics unless it also happens to exist as a legacy job. This is a live, silent data-completeness bug today, not just a rebuild-target. |  `jobs`, `job_items`, `customers`, `pricing_configuration` |
| **Profit Analytics Export** (CSV/XLSX/PDF, `GET /api/profit-analytics/export`) | Downloads job/customer/category profit tables | **Keep pattern, reuse for other domains** — this is the most complete export implementation in the app (3 formats, well-formatted PDF via reportlab). Suggest this becomes the shared export utility pattern for the rebuild rather than each module reinventing its own. | Same as above |
| **Profit Analytics Preferences** (widget order, simple/advanced mode) | Per-tenant dashboard customization | **Postpone** — nice-to-have personalization, low priority vs. fixing the underlying data-source bug above. | `profit_analytics_preferences` |
| **Financial Attention widget** (`Dashboard.js`, `GET /api/dashboard/financial-attention`) | Home dashboard cards: unpaid / overdue / due-this-week / recent-payments, each with top-3 records | **Keep, fix permission gap** — reads real, current `invoices` collection (correct data source, unlike Profit Analytics above). But **has zero permission check** beyond being logged in (`Depends(get_current_active_user)` only) — any Staff account sees real invoice totals and named customer/amount records with no `FINANCIALS_VIEW` gate, while the dedicated Financials page correctly requires it. Inconsistent access control for materially the same data. | `invoices`, `customers` |
| **Payroll Report + CSV export** (`employees.py`, gated by `_require_payroll_view_access`) | Per-employee hours/pay/adjustments/balance for a pay period, downloadable CSV | **Keep** — correctly built and permission-gated (reference pattern, similar to Inventory module's RBAC quality). Lives in the Employee Portal module today; the *report* itself is squarely "Business Finance & Reporting" in nature and should be a first-class report under one Reports hub in rebuild, sourced from the same payroll service. | `employees`, `timeclock_shifts`, `payroll_transactions` |
| **Customer Export (CSV)** (`GET /api/customers/export`) | Downloads name/email/phone/company/status/notes/created_at | **Keep, relocate conceptually** — functionally fine, but it's a customer-record export, not a *financial* report (no revenue/LTV/spend data included at all despite the domain description mentioning "customer reports"). Real "Customer Report" (revenue by customer, LTV, order count) does NOT exist as a distinct report — the closest is the `customer_rows` table buried inside Profit & Margin Analytics (and inherits that feature's legacy-jobs data-source bug). | `customers` |
| **Production Timeline Analytics** (`GET /api/production-timeline/analytics`) | Average completion time, per-stage bottleneck detection, category breakdown over N days | **Keep, fix permission gap** — no permission check at all (`get_current_active_user` only), same pattern-inconsistency issue as Financial Attention widget. Good underlying math (bottleneck = stage avg >1.5x overall avg). | `production_timelines` |
| **Webstore Analytics** (`GET /api/webstores/v2/{id}/analytics`) | Per-store revenue, profit, shop-owner-profit-after-commission, order counts, top products, sales trend | **Keep, fix permission gap** — exposes real cost/profit/commission numbers to any authenticated tenant user (only checks tenant match, not `FINANCIALS_VIEW`). This is a genuine sensitive-data leak vector for shops where Staff shouldn't see margin data. | `webstores_v2`, `webstore_orders_v2` |
| **Platform Admin Analytics** (`admin_analytics.py`, `PlatformAdminAnalytics.js`) | Site-wide traffic, sessions, errors, suspicious activity, cross-tenant user counts | **Keep as-is, out of tenant-facing scope** — correctly gated by `require_platform_admin`. Architecturally separate system (own `analytics_events` collection), should stay separate in rebuild. | `analytics_events`, cross-tenant `tenants`/`users` |
| **"Reports" nav/route** (`/reports` → redirects to `/financials`; `/reports/profit-margin` → `ProfitMarginAnalytics`) | Intended to be a Reports hub | **Rebuild from scratch** — confirmed there is no actual Reports hub page; `/reports` is a bare `<Navigate to="/financials" replace />`. "Reports" today is just an alias, not a real feature. Order/Inventory/Production/Webstore reports have no home at all in navigation. | N/A |
| **"Export Reports" / "Custom Reports" tier features** (`tier_config.py`, `UpgradeModal.js` labels) | Advertised as Pro/Business-tier paywalled capabilities | **Decide, don't assume** — confirmed via full-repo grep: these two feature flags are defined in the tier config and have translated labels in the upgrade modal, but **zero call-sites anywhere in the frontend actually check/gate on them** (`requireFeature('analytics.export_reports')` or `.custom_reports` do not exist in the codebase). Meaning: today, every tenant on every tier already has full, ungated CSV/XLSX/PDF export access (Profit Analytics, Payroll, Customers) — the "paywall" is decorative. Rebuild must decide whether to (a) actually build tier gating for these exports, or (b) drop the advertised paywall claim. | `tier_config.py` |
| **Sales Tax Reporting** | Aggregate tax collected/owed for filing | **Build (does not exist today)** — real per-order/invoice `tax_rate`/`tax_amount` fields exist (`orders.py`, tenant `default_tax_rate`), but there is no report anywhere that sums tax collected across a period from real Invoice/Order data. The only "tax" field that exists in the *Financials* reporting layer is the manual, disconnected `sales_entries.tax_amount` typed in by hand on the Daily Sales dialog — it has no relationship to actual invoice tax computation and is never reconciled against it. | `invoices`, `orders`, `sales_entries` (disconnected) |

---

## 3. Data and Rules

### Main records
| Collection | Key fields | Notes |
|---|---|---|
| `sales_entries` | `id, tenant_id, date, amount, tax_amount, payment_method, description, category, created_by, created_at` | Manual, standalone. No link to `invoices`/`orders`. |
| `expense_entries` | `id, tenant_id, date, amount, category (21 presets), description, vendor, created_by, created_at` | Manual, standalone. `receipt_file` accepted by frontend form but **silently dropped** — not persisted anywhere. |
| `invoices` | `id, tenant_id, total, status, due_date, paid_date, tax_rate, tax_amount, customer_id/customer_name` | Real source of truth for AR (unpaid/overdue/paid). Used by Financial Attention widget + Invoice Aging report. |
| `jobs` / `job_items` (legacy) | `cost_snapshot.{material_cost, labor_cost, overhead_cost, selling_price, profit, profit_margin}`, `pricing_category`, `pricing_data` | **Only data source Profit & Margin Analytics reads from.** Current live orders (post-migration to Orders/Job Tickets) are NOT reflected here unless a parallel legacy job also exists. |
| `orders` / `job_tickets` (current) | `subtotal, tax_rate, tax_amount, grand_total` computed from `tenant.default_tax_rate` + tax-exempt flag | Real, current revenue/tax source — **not currently connected to any profitability or tax report.** |
| `production_timelines` | `stages[], total_duration_minutes, completed_at, category` | Feeds Production Timeline Analytics. |
| `webstore_orders_v2` | `subtotal, total_profit, commission_amount` | Feeds Webstore Analytics. |
| `profit_analytics_preferences` | `tenant_id, simple_mode, widget_order, enabled_widgets` | Per-tenant UI prefs only. |

### Required fields / statuses
- Invoice status values referenced across this domain: `sent`, `overdue`, `paid`, `partial`. (`draft` excluded from unpaid/overdue counts by existing dashboard-phase-1 fix.)
- `sales_entries.payment_method` is a closed enum in the frontend (cash/credit/check/other) but **not validated/enforced on the backend** — `body.get("payment_method", "cash")` accepts any string.
- `expense_entries.category` similarly has 21 frontend presets but zero backend enum validation.

### Relationships
- **None** exist today between `sales_entries`/`expense_entries` and `invoices`/`orders`. A shop that (a) creates an Order → Invoice → gets paid through the app AND (b) also manually logs a "Daily Sales Entry" for the same cash received will double-count that revenue in the Financial Summary card. This is the single most important architectural decision the rebuild must resolve (see §8, Open Decision #1).
- Profit & Margin Analytics' `customer_rows`/`job_rows` are built purely from `jobs`/`job_items`, disconnected from the current `orders`/`job_tickets` model.

### Important validation/business rules
- Tax computation (real, current): `tax_amount = round(subtotal * (tax_rate_applied / 100), 2)`, where `tax_rate_applied = 0.0 if is_tax_exempt else tenant.default_tax_rate`. This logic lives in `routes/orders.py` and is correct — but is invisible to this reporting domain today.
- "Underpriced" flag in Profit Analytics: `profit_margin < (benchmark_margin - 10)` — i.e., flagged only if margin is more than 10 percentage points below the tenant's configured selling-price benchmark for that category.
- Invoice aging buckets: 0-30 / 31-60 / 61-90 / 90+ days past `due_date`, computed from `today - due_date`.

### Shared systems required
- **Customers** (name resolution for reports) — reused correctly today.
- **Users/Permissions** — `Permission.FINANCIALS_VIEW` / `FINANCIALS_MANAGE` exist and are correctly used on the Financials page and Profit Analytics endpoints, but inconsistently applied elsewhere (Dashboard financial-attention, webstore analytics, production analytics all skip this check — see §5).
- **Object storage** — needed if Expense receipt photos are to actually work (currently not wired at all).
- **Documents/Notifications/Activity Logs/AI credits** — not currently touched by this domain at all; no report generation is logged to Activity Log, no report-ready notifications exist, no AI-generated report exists yet in this domain (that lives in the separate AI Workspace investigation, though the AI assistant does have a `query_shop_metric` tool that re-derives some of the same numbers independently — see cross-reference note in §6).

---

## 4. Main Workflows

### Workflow A — Daily Sales / Expense Bookkeeping
- **Starting point:** Owner/Staff (with `FINANCIALS_CREATE`) opens Financials page, clicks "Enter Daily Sales" or "Add Expense."
- **Main steps:** Fill form → submit → `POST /financials/sales` or `/financials/expenses` → row inserted → list + summary reloaded.
- **Automatic actions:** None (no ledger reconciliation, no linkage to invoices).
- **Notifications/tasks/documents created:** None.
- **Edge cases:** Amount ≤ 0 blocked client-side only (no server-side validation — a malicious/buggy client could POST a negative amount and corrupt totals). Receipt photo silently discarded.
- **Completion rule:** Entry saved; no approval/review step exists.

### Workflow B — Profit & Margin Review
- **Starting point:** Owner navigates to `/reports/profit-margin`.
- **Main steps:** Select date range/category → `GET /profit-analytics/dashboard` → legacy `jobs`/`job_items` aggregated into category/job/customer/trend tables → optional export.
- **Automatic actions:** Benchmark comparison against `pricing_configuration.selling_price_benchmarks` flags underpriced jobs.
- **Notifications/tasks/documents created:** None (no alert/nudge fires when underpriced jobs are found, despite the AI Assistant nudges system existing elsewhere in the app for other conditions like stale quotes/overdue invoices).
- **Edge cases:** Tenants with zero legacy `jobs` rows (i.e., shops that only ever used the current Orders system) will see a permanently empty dashboard regardless of real order volume — **confirmed data gap**.
- **Completion rule:** N/A — read-only dashboard.

### Workflow C — Financial Attention (Dashboard home widget)
- **Starting point:** Any logged-in user loads `/dashboard`.
- **Main steps:** `GET /dashboard/financial-attention` → real-time query of `invoices` by status/due_date → 4 buckets with top-3 records each.
- **Automatic actions:** None.
- **Edge cases:** Staff without `FINANCIALS_VIEW` still sees this widget (permission gap, §5).
- **Completion rule:** N/A — read-only.

### Workflow D — Payroll Report Generation
- **Starting point:** Owner/authorized role opens Payroll → selects pay period → "Export CSV" or views report inline.
- **Main steps:** `_require_payroll_view_access` gate → aggregate timeclock shifts + adjustments per employee → CSV stream or JSON.
- **Completion rule:** File download completes; no persistence of "report generated" event to Activity Log.

---

## 5. Permissions

### Internal access rules (as they exist today — inconsistent)
| Endpoint / Feature | Actual gate today |
|---|---|
| `Financials.js` page (sales/expenses) | `Permission.FINANCIALS_VIEW` (read) / `FINANCIALS_CREATE` (write) — correct |
| `/profit-analytics/*` (dashboard, export, preferences) | `ensure_reporting_access()` → owner/admin roles OR `FINANCIALS_VIEW` — correct |
| `/dashboard/financial-attention` | **None** beyond authentication — gap |
| `/production-timeline/analytics` | **None** beyond authentication — gap |
| `/webstores/v2/{id}/analytics` | Tenant match only, no financial permission — gap (exposes cost/profit/commission) |
| `/financials/invoice-aging` | Authentication only (no explicit `FINANCIALS_VIEW` check found in this specific endpoint — inconsistent with sibling `/financials/summary` route group's intent) |
| Payroll report/export | `_require_payroll_view_access` — correct, reference pattern |
| Customer export | Not verified against a specific export permission in this session — flagged for rebuild to confirm scope (should at minimum require `CUSTOMERS_VIEW` or equivalent) |

### External/portal access rules
- None of this domain is exposed to Customer Portal or Webstore Owner Portal today (correctly so — owner-portal financial summaries shown to webstore owners are handled by a separate, already-sanitized endpoint documented in the Webstores rebuild history, not this domain).

### Sensitive data restrictions
- Cost/margin/profit numbers should never reach Staff-level roles without explicit `FINANCIALS_VIEW` — today this is violated by the Dashboard widget, Production Timeline Analytics (less sensitive, but still inconsistent), and critically the Webstore Analytics endpoint (real margin data).
- No field-level redaction pattern exists in this domain (contrast: File Uploads domain's `customer_visible` flag, or Webstore Owner Portal's whitelist-sanitizer — both documented as good reference patterns in earlier rebuild docs). Rebuild should adopt the same "sanitizer function" pattern for any report response that might reach a lower-privileged role.

---

## 6. Integrations, Automation, and Reporting

- **Notifications:** None. No scheduled "weekly financial summary" email/digest exists for this domain (contrast: `digest_scheduler.py` covers overdue invoices/jobs for the Daily Digest email — that IS a real integration point but lives in the Communications domain, not built as part of this Finance/Reporting domain's own automation).
- **External services:** None directly (Stripe payment data flows into `invoices`/`orders`, which this domain reads, but Stripe integration itself is out of scope here).
- **AI features:** The AI Assistant's `query_shop_metric` tool (in `assistant_tools.py`, documented separately) independently re-implements several of the same numbers (revenue_today/week/month, open_invoices_total, overdue_invoices_count) directly against `invoices`/`orders` rather than calling this domain's own summary/report endpoints. This is a duplicate-logic risk: if the Finance domain's math changes during rebuild, the AI Assistant's parallel implementation will silently drift out of sync unless the rebuild centralizes metric calculation into one shared service both call into.
- **Reports, metrics, exports:** Covered in full in §2. Summary: 3 different export mechanisms exist (Profit Analytics: CSV/XLSX/PDF via pandas+reportlab; Payroll: CSV via Python's stdlib `csv` module; Customers: CSV via a third, separately-written implementation) — three independent, non-shared implementations of "make a CSV," a clear consolidation opportunity.

---

## 7. Recommended Rebuild Scope

**Recommended screens:**
1. **Reports Hub** (new, real) — single landing page listing all report categories (Financial, Sales Tax, Customer, Order, Production, Inventory, Employee/Payroll, Webstore), replacing the current fake `/reports → /financials` redirect.
2. **Financial Dashboard** — keep Profit & Margin Analytics concept but re-point it at `orders`/`job_tickets`/Order-Items (current model), not legacy `jobs`.
3. **Bookkeeping (Sales/Expense entry)** — keep, but resolve the double-counting question first (§8 Open Decision #1).
4. **Accounts Receivable** — promote the already-built Invoice Aging report into an actual visible page (currently backend-only/orphaned).
5. **Sales Tax Report** — new, computed from real `orders`/`invoices` tax fields, period-based, exportable.
6. **Per-domain report tabs** (Customer / Order / Production / Inventory / Webstore) — thin report views reusing each domain's existing data, surfaced under the Reports Hub instead of scattered export buttons.

**Recommended shared components:**
- One shared `ReportExportButton` component + one shared backend `export_service` (CSV/XLSX/PDF) used by every report, replacing the 3 duplicate implementations.
- One shared `FinancialPermissionGate` (or a single `require_permission(FINANCIALS_VIEW)` FastAPI dependency) applied consistently to every endpoint that reveals revenue/cost/profit — closing the Dashboard/Webstore/Production gaps found in §5.
- One shared metrics-calculation service (e.g., `services/shop_metrics.py`) that both this domain's endpoints AND the AI Assistant's `query_shop_metric` tool call into, eliminating the duplicate-logic drift risk noted in §6.

**Features to combine:**
- Sales-tax display should be combined with the Invoice Aging / AR report screen (both are "money owed/collected" views) rather than treated as fully separate.
- Payroll report should remain functionally in the Employee module (it needs timeclock context) but be *listed* under the Reports Hub as one of the report categories, not hidden inside Payroll only.

**Features to delay:**
- Custom Report Builder — do not build unless/until product decides the advertised tier feature (§2, "Custom Reports" tier flag) is a real commitment; currently 0% built despite being advertised.
- Report-scheduling/emailing (e.g., "email me this report every Monday") — no existing infrastructure beyond the unrelated Daily Digest; treat as a v2 feature.
- Receipt-photo OCR / auto-categorization for expenses — currently the upload itself doesn't even persist a file; fix persistence first, OCR later.

**Dependencies:**
- Requires the Orders/Job-Tickets/Order-Items data model to expose the same cost-breakdown fields (`material_cost`, `labor_cost`, `overhead_cost`, `profit_margin`) that legacy `jobs.job_items.cost_snapshot` currently provides — otherwise Profit & Margin Analytics cannot be ported over.
- Requires a decision on `sales_entries`/`expense_entries` vs. real Invoice-payment data before AR/tax/summary numbers can be trusted post-rebuild.

**Suggested internal build order:**
1. Fix/decide the sales-entries-vs-invoice-payments duplication question (blocks everything else in this domain).
2. Re-point Profit & Margin Analytics at the current Orders/Order-Items model.
3. Build the shared export service + shared permission gate; retrofit Dashboard/Webstore/Production analytics endpoints to use it.
4. Build the real Sales Tax report from Order/Invoice tax fields.
5. Build the Reports Hub page tying every report together.
6. Decide the fate of the "Export Reports"/"Custom Reports" tier paywall (build real gating or remove the marketing claim).

---

## 8. Open Decisions

1. **Should manual Daily Sales entries and real Invoice/Order payments be reconciled, merged, or kept intentionally separate (cash vs. accrual bookkeeping)?**
   *Recommended answer:* Keep both but make the relationship explicit — e.g., tag a `sales_entries` row with an optional `linked_invoice_id`/`linked_order_id` so a shop can log genuinely separate cash sales (e.g., walk-in retail) without double-counting invoiced revenue, and the Financial Summary should clearly separate "Invoiced Revenue" from "Manually Logged Sales."

2. **Should Profit & Margin Analytics be rebuilt against the current Orders/Order-Items model, and is the required cost-breakdown data (`material_cost`/`labor_cost`/`overhead_cost`/`profit_margin`) already captured per Order Item today, or does it need to be added?**
   *Recommended answer:* Yes, rebuild against current model; this needs a quick technical spike against `models/orders.py`/`job_tickets` to confirm cost-snapshot fields exist at the Order Item level (not confirmed in this session — flagged as a dependency, not assumed).

3. **Is the advertised "Export Reports"/"Custom Reports" tier paywall a real product commitment?**
   *Recommended answer:* Either implement real gating (currently 0% enforced — every tenant already gets full exports for free) or remove the marketing claim before launch to avoid a trust/legal gap.

4. **Should Sales Tax reporting be its own report or folded into Accounts Receivable/Invoice Aging?**
   *Recommended answer:* Separate report (different audience/purpose — tax filing vs. collections), but link them from the same Reports Hub section.

5. **Who should see cost/profit/margin data by default — is `FINANCIALS_VIEW` sufficient, or does the rebuild need a narrower "can see profit margins" permission distinct from "can see revenue/AR"?**
   *Recommended answer:* Reuse `FINANCIALS_VIEW` for now (avoid a new permission proliferation) but apply it consistently everywhere cost/profit is shown (Dashboard, Webstore Analytics, Production Analytics) — the inconsistency itself, not the permission name, is the real defect.

### Build-readiness status
**Not build-ready.** This domain has real, working pieces (Payroll report, Invoice Aging math, Profit Analytics export mechanics) but its core profitability dashboard reads from an abandoned data model, its bookkeeping layer has an unresolved double-counting risk, its permission enforcement is inconsistent across 3+ endpoints, and 2 of its named requirement areas (Sales Tax Reporting, Custom Reports) do not exist in any form today. Recommend resolving Open Decisions #1 and #2 before any rebuild implementation begins on this domain.

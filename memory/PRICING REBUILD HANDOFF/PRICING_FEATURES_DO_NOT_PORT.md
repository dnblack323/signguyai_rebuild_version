# PRICING FEATURES DO NOT PORT

**Status:** Documentation/investigation only. No code changed, no code removed from the legacy repository. This list identifies exactly what must NOT be copied, migrated, or re-implemented as-is in the rebuild. Every item cross-references `PRICING_LEGACY_ARCHITECTURE_MISTAKES_AND_PREVENTION.md`'s Mistake IDs where applicable.

---

## 1. Separate Wrap Lab calculator

- **File:** `routes/wrap/core.py`
- **Functions/classes:** `WrapPricingConfig` (L156-172), `_compute_pricing_snapshot()` (L665-746)
- **Pattern to avoid:** A category-specific pricing engine living outside the shared `PricingEngine`.
- **Why:** M-01, M-25. Produces a different price than the Foundation's `calculate_vehicle_graphics()` for the same job.
- **What replaces it:** Wrap Lab calls the shared `vehicle_wraps` calculator (Phase 4). The formula ITSELF (`(design+production+install hours) × labor_rate`, single markup %) may be kept only as a **reference sanity-check**, not ported as the live mechanism.

## 2. Wrap-specific materials array

- **File:** `routes/wrap/core.py`
- **Classes/constants:** `WrapMaterialUpdate` (L142-153), `WRAP_MATERIAL_TYPES` (L175-179)
- **Pattern to avoid:** A per-ticket, per-category materials list disconnected from the shared Materials Library.
- **Why:** M-03.
- **What replaces it:** The shared `pricing_materials` collection (Phase 2), filtered by `compatible_categories` to `vehicle_wraps`.

## 3. Webstore disconnected `retail_price`/`base_cost`-only logic

- **File:** `routes/webstores.py`
- **Classes:** `Product` (L173-194, specifically `base_cost`/`retail_price` fields), `ProductCreate`/`ProductUpdate` (L197-225)
- **Pattern to avoid:** A manually-typed flat cost/price pair with zero calculator linkage.
- **Why:** M-02.
- **What replaces it:** Every Webstore product maps to a category calculator (or Custom); the calculator produces the internal `PricingResult`; an optional public override sits on top per the price-priority rule (Phase 8).

## 4. Giant category pricing dispatcher

- **File:** `server.py`
- **Function:** `calculate_pricing()` (L4356) and the surrounding ~3,700-line block of 9 `calculate_*` functions (L696-4356)
- **Pattern to avoid:** One monolithic if/elif dispatcher with category logic inlined in a single file.
- **Why:** M-05, M-06.
- **What replaces it:** `PricingEngine.calculate(category, input, tenant_config)` with small, independently testable per-category/per-family modules.

## 5. Raw float currency values

- **Pattern to avoid:** Any `float` type representing a dollar amount, and any ad hoc `round(x, 2)` call as a substitute for a documented rounding rule.
- **Where it appears:** Every field in all 9 `calculate_*` functions in `server.py`; every field in `routes/wrap/core.py::_compute_pricing_snapshot()` (11 separate `round(..., 2)` calls, L691-729); `routes/webstores.py::Product.base_cost`/`retail_price`.
- **Why:** M-04.
- **What replaces it:** `services/money.py::Money` — integer cents, one documented half-up rounding rule (Sprint 1, already built).

## 6. Legacy hours-based labor fallback

- **File:** `server.py`
- **Function:** `calculate_vehicle_graphics()`, the `labor_rates.get("production", {}).get("hourly_rate", ...)` branch (around L2800-2820), used only when the minute-based system (`get_labor_minutes_and_rate()`) returns zero.
- **Pattern to avoid:** A silent dual labor-costing system with no visible indicator of which path is active for a given tenant/category.
- **Why:** M-08.
- **Note:** Retirement is pending explicit Owner re-affirmation (still an Open Business Decision per `BANNERS_PORT_WIRING_SPEC.md` §3) — flagged here as "do not port as a permanent dual system," not as an instruction to delete it from the legacy repo today.

## 7. Empty `ai_prefill_overrides`

- **Field:** `ai_prefill_overrides` in the pricing configuration schema (exact model location not re-confirmed this session; carried forward from prior investigation, PRC-007)
- **Pattern to avoid:** A schema field with no reader/writer anywhere in the codebase.
- **Why:** M-10.
- **What replaces it:** Nothing, unless Phase 10 designs a real AI-prefill feature from scratch using the Historical Import's proven suggest/accept pattern.

## 8. Non-functional `category_setup_status`

- **Field:** `category_setup_status` (exact model location not re-confirmed this session; carried forward from prior investigation, PRC-008)
- **Pattern to avoid:** A UI status badge with no enforced meaning.
- **Why:** M-09.
- **What replaces it:** Either a real enforcement rule or removal — Phase 2 decision.

## 9. Duplicate Banner Setup Wizard — CONFIRMED redundant with the Pricing Setup Quiz

- **File:** `frontend/src/components/pricing/BannerSetupWizard.js` (501 lines)
- **Pattern to avoid:** A second, independent UI writing to `category_defaults.banners` — the exact same destination the Pricing Setup Quiz's own Banners section already writes to.
- **Why:** M-22. **Confirmed** this session — both files read directly; `BannerSetupWizard.js`'s own top-of-file comment states `// Saves to settings.category_defaults.banners`.
- **What replaces it:** Phase 9's unified setup quiz. The Wizard's step-by-step guided UX (Pricing Method → Materials & Rates → Minimum Charge → Labor → Add-ons → Templates → Review) may be preserved as a *UX pattern* inside the unified flow — but not as a second entry point.

## 10. Shop Rate Quiz — NOT confirmed redundant (correction to a prior assumption)

- **File:** `frontend/src/components/pricing/ShopRateQuiz.js` (534 lines)
- **Status:** This session confirmed `ShopRateQuiz.js` is a genuinely distinct, more detailed shop-labor-rate-derivation methodology (home/small/growing shop presets, billable-hours efficiency %, payroll burden %, profit buffer, rounding rule) — **not** a subset or duplicate of the Pricing Setup Quiz's simpler labor questions. **It is explicitly NOT on this do-not-port list.** See `PRICING_MODULE_EXTRACTION_INVENTORY.md` for its "Bring Over Formula/Business Rules Only" disposition.

## 11. Reports based on deprecated legacy job records

- **Files:** `routes/profit_analytics.py` (L167, L175 — `db.jobs.find()`, `db.job_items.find()`); `routes/jobs.py::sync_job_items_from_embedded_line_items()` (L100-101, self-documented as "legacy embedded"); `routes/invoices.py` (L33, L176 — imports and falls back to the same legacy sync function)
- **Pattern to avoid:** Any reporting or invoicing code path reading `jobs`/`job_items` instead of the live Order Item collection (`job_tickets`) or, post-rebuild, `PricingSnapshot` records directly.
- **Why:** M-18, M-19.
- **What replaces it:** Profitability/margin reporting and invoicing both read `PricingSnapshot` records exclusively (Phase 6).

## 12. Any unused/legacy pricing routes

- **Pattern to avoid:** Copying an endpoint into the rebuild simply because it exists, without confirming it is still called by any live UI.
- **Action for the rebuild team:** Before porting any route not explicitly covered elsewhere in this handoff package, confirm at least one live frontend call site exists. Routes with none should be flagged `Retire / Do Not Port` in the Extraction Inventory rather than carried forward by default.

## 13. Any separate price snapshot shapes

- **Confirmed 4 distinct shapes today** (see `PRICING_SHARED_SYSTEMS_AND_DATA_OWNERSHIP_MAP.md`'s "Pricing Snapshot" row for full detail):
  1. `job_tickets.pricing_snapshot` — `{pricing_mode, calculated_price, manual_price, active_price, calculation_breakdown, saved_at}` (`routes/job_tickets.py` L1809-1816)
  2. Wrap Lab's `_compute_pricing_snapshot()` output — `{pricing_method, total_billable_sqft, total_labor_cost, material_total, base_cost, markup_percent, markup_amount, suggested_price, per_sqft_price, manual_quoted_price, quoted_price, estimated_profit, estimated_margin_percent, computed_at}` (`routes/wrap/core.py` L731-746)
  3. `jobs.line_items[].cost_snapshot` (legacy, `routes/jobs.py` L118)
  4. Whatever Webstores does at checkout (unconfirmed — Needs More Investigation)
- **Pattern to avoid:** Porting any of these shapes as-is, or inventing a 5th.
- **What replaces it:** Exactly one `PricingSnapshot` shape (Sprint 1, `models/pricing_core.py`), used by every surface.

## 14. Any duplicated manual override flow

- **File:** `routes/job_tickets.py::save_ticket_pricing()` (L1791-1826) — `pricing_mode: "manual"`, `manual_price`, no reason/approver/permission
- **Also:** `routes/wrap/core.py::WrapPricingConfig.manual_quoted_price` (L172) — same gap
- **Pattern to avoid:** A bare number swap with no `PricingOverride` provenance and no `PRICING_OVERRIDE` permission check.
- **Why:** M-14, M-15.
- **What replaces it:** Sprint 1's `PricingOverride` schema + `Permission.PRICING_OVERRIDE`, wired into every commit endpoint in Phase 6.

## 15. Any duplicated materials, labor, markup, or overhead configuration

- **Confirmed duplicates:**
  - Materials: Wrap Lab's per-ticket array (item 2 above) vs. the shared Materials Library.
  - Apparel tiers: `routes/webstores.py::APPAREL_TIER_DEFAULTS` (L95-99) — a simple economy/standard/premium price-modifier table living inside Webstores, disconnected from whatever `ApparelPricingTable` the Foundation's `calculate_apparel()` actually uses.
  - Labor: the legacy hours-based fallback vs. the minute-based system (item 6 above) is a duplication-in-methodology, not duplication-in-location, but has the same net effect.
- **Pattern to avoid:** A second copy of any of these four config types living inside a category-specific or surface-specific module.
- **Why:** M-03, M-06, M-07, M-08.
- **What replaces it:** One `CategoryPricingConfig` per tenant per category (Phase 2), one `pricing_materials` collection, one overhead-basis rule, one labor-costing methodology — consumed identically everywhere.

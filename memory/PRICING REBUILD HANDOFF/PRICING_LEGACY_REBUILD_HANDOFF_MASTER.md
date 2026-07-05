# PRICING LEGACY REBUILD HANDOFF MASTER

**Role:** Pricing, Calculator, Wrap Lab, and Webstore Rebuild Handoff Architect deliverable.

**Status:** Documentation, investigation, and extraction only. No calculators rebuilt, no Pricing Foundation refactored, no live pricing behavior modified, no migrations created, no screens changed, no pricing code moved. This document is the top-level entry point into the handoff package; the other 7 documents it references contain the full supporting detail.

**Companion documents:**
- `PRICING_MODULE_EXTRACTION_INVENTORY.md` — every pricing-related module/route/model, current purpose, problems, rebuild disposition
- `PRICING_TO_REBUILD_MIGRATION_MAP.md` — legacy data extraction plan
- `PRICING_LEGACY_ARCHITECTURE_MISTAKES_AND_PREVENTION.md` — 28 documented mistakes with evidence and prevention rules
- `PRICING_REBUILD_BUILD_ORDER.md` — the 10-phase build order (Phase 1 already complete)
- `PRICING_SHARED_SYSTEMS_AND_DATA_OWNERSHIP_MAP.md` — one owner per entity, live-vs-snapshot rule per entity
- `PRICING_FEATURES_DO_NOT_PORT.md` — exact files/patterns that must not be copied forward
- `PRICING_REBUILD_VERIFICATION_AND_PARITY_TEST_PLAN.md` — what must match legacy, what's intentionally different, required tests

**Prior-session foundation this package builds on (still valid, not superseded):**
- `PHASE_0_PRICING_DECISIONS_FORMULA_GOVERNANCE.md` — locked business-rule decisions
- `PRICING_ISSUES_INVENTORY_AND_REMEDIATION_PLAN.md` — 59-issue inventory, phased plan, §4E live-calc/snapshot architecture statement
- `BANNERS_PORT_WIRING_SPEC.md` — Phase 3's first-port wiring plan
- Sprint 1 (2026-02-15) — `Money`, `PricingResult`/`PricingSnapshot`/`PricingWarning`/`PricingOverride`/`PricingChangeLog` schemas, `PRICING_VIEW`/`PRICING_EDIT_FOUNDATION`/`PRICING_OVERRIDE` permissions — all already built and unit-tested (58 passing tests), zero live behavior changed

---

## 1. Executive summary

The legacy repository's pricing system is one shared calculation dispatcher (`server.py`, ~3,700 lines across 9 `calculate_*` functions) plus at least 3 independent parallel systems that were each built to solve a pricing problem on their own instead of consuming the shared dispatcher: Wrap Lab (`routes/wrap/core.py`, a fully separate engine, materials list, and snapshot shape — **confirmed** this session), Webstores (`routes/webstores.py`, manually-typed flat `base_cost`/`retail_price` with zero calculator linkage — **confirmed** this session), and a legacy `jobs`/`job_items` reporting path that profitability reporting still reads from instead of the modern `job_tickets` collection (**confirmed** this session, `routes/profit_analytics.py` L167-175). On top of this, at least 4 divergent "pricing snapshot" shapes exist across the codebase, all-float currency math is universal, and manual price overrides have zero provenance or permission gating anywhere (**confirmed**, `routes/job_tickets.py::save_ticket_pricing`).

None of this is fixed in place. This package extracts the business rules, data, and workflow concepts worth keeping, and hands off a build plan for one shared Pricing Foundation, one shared live-calculation engine, and category-specific formula configuration — consumed identically by every calculator, Wrap Lab, and Webstores, with a frozen `PricingSnapshot` created only at explicit commit.

---

## 2. Calculator family analysis

### 2a. Shared Area-Based Calculator Family

**Members:** Banners, Rigid Signs, Cut Vinyl, Digital Print, Vehicle Graphics/Vehicle Wraps.

**Shared logic every member of this family uses (confirmed present across `calculate_banners`/`calculate_rigid_signs`/`calculate_cut_vinyl`/`calculate_digital_print`/`calculate_vehicle_graphics` in `server.py`):**
- Dimensions → billable area
- Minimum billable area (floor on area before cost calculation)
- Waste % applied to area before material cost
- Material cost (area × cost-per-sqft, from the shared Materials Library)
- Production labor (minute-based, with a legacy hourly fallback still present per M-08)
- Markup (category-level %, applied to a cost basis)
- Minimum charge (floor on final price)
- Quantity discounts (Needs More Investigation for exact mechanism, Extraction Inventory item #2)
- Rush fees
- Manual override behavior (today: no provenance, gets replaced by `PricingOverride`)
- Live recalculation (the calculator's live-preview UX, generalized from the pattern already proven in `routes/job_tickets.py`'s `/calculate-pricing` endpoint)
- Warning generation (today: generic strings, gets replaced by typed `PricingWarning`)
- Snapshot generation (today: `job_tickets.pricing_snapshot`, gets replaced by standardized `PricingSnapshot`)

**Category-specific extensions:**
- **Banners:** hems, grommets, pole pockets, sewing, finishing
- **Rigid Signs:** substrates, thickness, shape, hardware, drilling
- **Cut Vinyl:** colors, weeding, transfer tape, masking
- **Digital Print:** ink coverage, laminate, contour cutting, mounting
- **Vehicle Graphics/Wraps:** vehicle type, coverage % (spot/partial/half/full/custom, **confirmed**, `server.py` L2706-2728), package benchmark floor, vehicle install-time tables, seam complexity, prep, removal, window perf (**confirmed**, L2773-2797), second installer

### 2b. Vehicle Graphics / Wrap Lab Rule

**Confirmed this session:** Wrap Lab's current pricing engine (`WrapPricingConfig`/`_compute_pricing_snapshot()`, `routes/wrap/core.py` L156-172, L665-746) is a completely independent, materially simpler formula than the Foundation's `calculate_vehicle_graphics()` (`server.py` L2683-3237) — no coverage %, no vehicle-type differentiation, no waste %, no materials-library lookup, no overhead, no benchmark floor, and it computes-and-persists its snapshot in a single step with no live/commit separation.

**Wrap Lab MAY add (explicitly in scope, per this task's own final rebuild rules — confirmed these are genuinely pricing-unrelated workflow features already present and correctly scoped):**
- Vehicle inspection, vehicle measurements
- Design workflow (`DesignBlock`, confirmed present, `routes/wrap/core.py` L182-200)
- Proof workflow
- Contract/signature workflow
- Installation workflow
- Customer packet (`routes/wrap/pdfs.py`, not read this session)
- Aftercare, issue tracking

**Wrap Lab MAY NOT create its own:**
- Formula engine — retire `_compute_pricing_snapshot()`
- Materials Library — retire the per-ticket `materials` array (`WrapMaterialUpdate`)
- Labor rates — retire `WrapPricingConfig.labor_rate`/hours fields as a config source; consume the shared minute-based system
- Markup rules — retire `WrapPricingConfig.markup_percent`
- Overhead rules — Wrap Lab has none today; it must gain the shared one, not invent its own
- Pricing methods — retire the `per_sqft`/`material_labor_markup`/`manual` method selector as an independent concept; the shared engine's method selection (if any) applies uniformly
- Pricing snapshots — retire the 4-field-divergent shape; use the standard `PricingSnapshot`
- Manual override rules — retire `manual_quoted_price`'s no-provenance override; use `PricingOverride`

### 2c. Apparel Calculator Family

Separate table-first module using: blank cost, brand/style, quantity tiers, placement, decoration method, size breakdown, plus-size rules, add-ons, formula fallback, live price updates, standardized snapshot output. Legacy source: `server.py::calculate_apparel()` (L3869-4356) — internal formula structure confirmed to exist, not yet read line-by-line (Needs More Investigation). A parallel, simpler `APPAREL_TIER_DEFAULTS` concept already exists inside Webstores (`routes/webstores.py` L95-99) — this is a confirmed duplicate-in-waiting that Phase 8 must reconcile into ONE shared Apparel table, not preserve as two.

### 2d. Services Calculator Family

Separate time/unit/trip-based module using: hourly rates, flat rates, per-unit rates, travel, mileage, service-call minimum, equipment, subcontracting, permit/pass-through fees, overtime/after-hours rules, standardized snapshot output. Legacy source: `server.py::calculate_services()` (L3237-3739) — confirmed to exist, internal formula not read line-by-line this session (Needs More Investigation).

### 2e. Promotional and Custom

- **Promotional:** vendor-cost/cost-plus pricing. Legacy source: `server.py::calculate_promotional()` (L696-867), confirmed to exist, formula not read line-by-line (Needs More Investigation).
- **Custom:** controlled manual-pricing fallback. Legacy source: `server.py::calculate_custom()` (L3739-3869), confirmed to exist. **Both must create standardized snapshots. Custom must not become an excuse for a second disconnected pricing system** — it still goes through the same `PricingResult`/`PricingSnapshot`/`PricingWarning`/permission gate as every calculated category; the only difference is the price itself is typed in rather than derived from a formula.

### 2f. Webstore Pricing — final relationship

```
Pricing Foundation
    |
    v
Shared Pricing Engine
    |
    v
Category Calculator Family  (Banners/Rigid Signs/Cut Vinyl/Digital Print/Vehicle Wraps/Apparel/Services/Promotional/Custom)
    |
    v
Live internal product calculation  (runs continuously as the store admin edits product setup, per the shared live-calc rule)
    |
    v
Optional Webstore public retail override  (per the price-priority chain, M-26 — never erases internal cost/margin/provenance/owner-share/platform-fee/snapshot)
    |
    v
Webstore order-line Pricing Snapshot at checkout
```

**Confirmed today: none of this relationship exists.** `Product.retail_price`/`base_cost` (`routes/webstores.py` L173-194) are manually-typed floats with zero connection to the Pricing Foundation, any calculator, or any category. `ProductCategory`'s enum (`apparel, signs, decals, promotional, events, other`) does not map 1:1 onto the 9 real calculator categories. Phase 8 builds this relationship from scratch.

---

## 3. Cross-references

- Full module-by-module inventory with dispositions: `PRICING_MODULE_EXTRACTION_INVENTORY.md`
- Data ownership (who owns what, live-vs-snapshot per entity): `PRICING_SHARED_SYSTEMS_AND_DATA_OWNERSHIP_MAP.md`
- All 28 architecture mistakes with evidence and prevention rules: `PRICING_LEGACY_ARCHITECTURE_MISTAKES_AND_PREVENTION.md`
- Exact do-not-port list: `PRICING_FEATURES_DO_NOT_PORT.md`
- 10-phase build order: `PRICING_REBUILD_BUILD_ORDER.md`
- Legacy data extraction table: `PRICING_TO_REBUILD_MIGRATION_MAP.md`
- Verification/parity plan: `PRICING_REBUILD_VERIFICATION_AND_PARITY_TEST_PLAN.md`

---

## 4. Top 20 pricing-related concepts, formulas, workflows, and data structures worth preserving

1. The area-based formula family's core shape (dimensions → billable area → waste → material cost → labor → overhead → markup → minimum charge → rush) — sound business logic, confirmed across 4 categories in `server.py`.
2. The Vehicle Graphics coverage-tier factor system (spot/partial/half/full/custom, with linear interpolation for custom %) — a genuinely well-designed piece of business logic (`server.py` L2706-2728).
3. The package-benchmark-floor concept for Vehicle Wraps (`suggested price = max(benchmark, cost-plus)`) — a real-world sanity guardrail worth preserving as a formula pattern.
4. Window perf scope-based sell-rate logic (rear/side/full weighted average, `server.py` L2788-2797) — specific, correct business detail.
5. The minute-based labor costing system (the modern half of the dual system in M-08) — this is the correct direction, not the legacy hourly fallback.
6. `calculate_overhead_cost()`'s existence as ALREADY a shared function (`server.py` L336) — proof the codebase already knows how to share logic; the rebuild extends this instinct, not invents it.
7. The two-step live-preview-then-explicit-commit workflow already proven in `routes/job_tickets.py` (`/calculate-pricing` then `/save-pricing`) — this is the exact pattern Sprint 1's live-calc/snapshot correction generalizes to every category and surface.
8. The Historical Invoice Import's AI-suggest/human-accept pattern (`routes/pricing_setup.py`) — architecturally sound, becomes the template for Phase 10's AI Pricing Guidance.
9. `services/inventory_service.py`'s reservation/allocation/lot-tracking logic — a positive counter-example, confirmed well-built, needs no rebuild.
10. The `LockedSettings` admin-locked-field pattern in Webstores (fields "MUST NOT be overwritten by questionnaire answers... or any other non-admin flow," `routes/webstores.py` L106-118) — a good protection pattern worth explicitly preserving.
11. `compute_event_profit_allocation()`'s percentage/fixed-per-item allocation math (`routes/webstores.py` L1034-1073) — confirmed sound, independent of the pricing-engine problem.
12. `PricingTemplate`'s CRUD structure (`routes/pricing.py` L294-360) — already sound, reusable presets worth keeping.
13. The Shop Rate Quiz's shop-rate-burden-derivation methodology (home/small/growing presets, billable-hours %, payroll burden %, profit buffer, rounding rule — `ShopRateQuiz.js`) — confirmed this session to be a genuinely distinct, valuable business-rule reference, NOT redundant with the general Quiz.
14. The Pricing Setup Quiz's benchmark-price-to-Foundation-defaults derivation formulas (11 sections, `PricingSetupQuiz.js`) — the underlying math converting "what do you charge for a 4x8 banner" into `sell_rate`/`min_sell` is a useful reference even as the UI gets unified.
15. `compatible_categories` tagging on materials (even though enforcement is currently inconsistent, PRC-050) — the right concept, needs enforcement not redesign.
16. The vehicle base-sqft-by-type lookup embedded in the Materials Library (`server.py` L2732-2736) — the right data shape, just needs promoting to a first-class table.
17. Phase 0's locked decisions themselves (`PHASE_0_PRICING_DECISIONS_FORMULA_GOVERNANCE.md`) — money/rounding rules, overhead basis, warning taxonomy, override taxonomy, permission table — all still valid, foundational to every phase in the Build Order.
18. Sprint 1's already-built and unit-tested primitives (`Money`, `PricingResult`, `PricingSnapshot`, `PricingWarning`, `PricingOverride`, `PricingChangeLog`, pricing permissions) — not "legacy," but explicitly the CURRENT correct foundation this whole handoff package builds toward.
19. The Custom category's role as a controlled, permission-gated manual-entry fallback (concept, not implementation) — every business needs an escape hatch; the rebuild rule is that it stays disciplined.
20. The fundamental idea, already partially present in the legacy system's better corners (Job Ticket live/commit, Historical Import suggest/accept), that a human explicitly confirms before something becomes permanent — this philosophy, more than any specific formula, is what the whole rebuild generalizes.

---

## 5. Top 20 pricing-related code patterns, routes, models, and systems that must NOT be ported

1. `routes/wrap/core.py::WrapPricingConfig`/`_compute_pricing_snapshot()` — the independent Wrap Lab pricing engine (M-01).
2. `routes/wrap/core.py::WrapMaterialUpdate`/`WRAP_MATERIAL_TYPES` — the per-ticket materials array (M-03).
3. `routes/webstores.py::Product.base_cost`/`retail_price` as calculator-disconnected manually-typed floats (M-02).
4. `routes/webstores.py::ProductCategory` as a stand-in for real pricing-category mapping — it is a display category, not a pricing category.
5. `server.py::calculate_pricing()`'s giant if/elif dispatcher structure (M-05) — the formula content inside each branch is a reference; the dispatcher shape itself is not.
6. Any raw `float` currency field, anywhere (M-04) — replaced universally by `Money`.
7. The legacy hours-based labor hourly-rate lookup branch inside `calculate_vehicle_graphics()` (and likely other categories) — pending final Owner retirement decision (M-08).
8. `ai_prefill_overrides` — dead placeholder field (M-10).
9. `category_setup_status` in its current non-functional form (M-09) — either gets real enforcement or is removed, never carried forward unchanged.
10. `frontend/src/components/pricing/BannerSetupWizard.js` as an independent entry point — confirmed duplicate write destination with the Pricing Setup Quiz (M-22).
11. `routes/profit_analytics.py`'s `db.jobs`/`db.job_items` read path for margin/profit reporting (M-18/M-19).
12. `routes/jobs.py::sync_job_items_from_embedded_line_items()` and its "legacy embedded" fallback usage inside `routes/invoices.py` (M-19).
13. `routes/job_tickets.py::save_ticket_pricing()`'s no-provenance, no-permission manual-override mechanism (M-14/M-15) — the ENDPOINT'S current implementation, not the "manual override" concept itself.
14. Any of the 4 confirmed divergent `PricingSnapshot`-equivalent shapes (`job_tickets.pricing_snapshot`, Wrap Lab's `_compute_pricing_snapshot()` output, `jobs.line_items[].cost_snapshot`, and whatever Webstores does at checkout) — none of the four shapes survives; exactly one new shape replaces all of them.
15. `routes/webstores.py::APPAREL_TIER_DEFAULTS` as a second, Webstore-only Apparel pricing table, separate from the Foundation's real Apparel calculator tables.
16. Any per-category copy of waste/overhead/minimum-charge/rush logic that duplicates what should be one shared helper (M-06).
17. Any inconsistent overhead-basis calculation that doesn't match the Phase 0 Group 2 canonical basis (M-07).
18. Wrap Lab's compute-and-persist-together pricing PUT endpoint pattern (`routes/wrap/core.py` L1254-1289) — no live/commit separation, unlike the general Job Ticket flow.
19. Any second AI-suggestion-acceptance mechanism that doesn't reuse the Historical Import's proven pattern (a future-facing "do not invent a second one" rule for Phase 10, per M-28's underlying lesson).
20. Any direct legacy-repository "fix" applied to calculator/Wrap Lab/Webstore pricing files outside the previously-approved, separately-tracked security patches in `RUNNING_ISSUE_TRACKER.md` — per the Legacy Repo Usage Rule below, this repository is a reference source, not the build target.

---

## 6. The exact first rebuild phase that should begin after this handoff package is complete

**Phase 2 — Pricing Data Architecture**, as already scoped in `PRICING_REBUILD_BUILD_ORDER.md` and previously confirmed with the Owner (this session's own prior turn: the "Revised Phase 2 Plan — Live Recalculation Support" documented in `PRICING_ISSUES_INVENTORY_AND_REMEDIATION_PLAN.md`). Phase 1 (shared primitives) is already complete and tested (Sprint 1, 2026-02-15). This handoff package does not change that sequencing — it adds the deeper, code-verified evidence base (Wrap Lab's confirmed divergent engine, Webstores' confirmed disconnected pricing, the confirmed legacy-reporting-path mismatch, the confirmed Banner Wizard/Quiz overlap, the confirmed absence of customer-specific pricing) that Phase 2 and every phase after it should build against. **This package does not itself authorize starting Phase 2 — that remains the Owner's explicit go-ahead to give separately.**

---

## 7. The Legacy Repo Usage Rule

> The legacy repository is a source of pricing formulas, business rules, workflows, examples, configuration data, and verification cases. It is not the place where the final Pricing Foundation, calculators, Wrap Lab pricing, or Webstore pricing architecture should be rebuilt.

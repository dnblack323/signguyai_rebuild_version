# PRICING LEGACY ARCHITECTURE MISTAKES AND PREVENTION

**Status:** Documentation/investigation only. No code changed.

**Legend:** `Confirmed` = read the actual code directly (this session or a prior session) and verified. `Assumption to Verify` = plausible, not yet read line-by-line. Every mistake includes evidence, damage caused, the rebuild's prevention rule, where that rule is enforced, and how it will be verified.

---

### M-01: Duplicate Pricing Foundation and Wrap Lab engines

| Field | Detail |
|---|---|
| Legacy Problem | Vehicle Graphics/Wraps has two completely independent pricing engines: the Pricing Foundation's `calculate_vehicle_graphics()` and Wrap Lab's `_compute_pricing_snapshot()`. |
| Evidence | **Confirmed.** `server.py::calculate_vehicle_graphics()` (L2683-3237): coverage-tier factors, waste-by-coverage, materials-library vehicle-sqft lookup, laminate, window perf, minute-based labor, package-benchmark floor. `routes/wrap/core.py::WrapPricingConfig`/`_compute_pricing_snapshot()` (L156-172, L665-746): flat `design_hours+production_hours+install_hours) × labor_rate`, one `markup_percent`, no coverage %, no vehicle type, no waste, no materials library, no overhead, no benchmark floor. |
| Damage Caused | A wrap job priced through the Foundation calculator and the identical job priced through Wrap Lab produce two different, unreconciled numbers with no shared audit trail. Owners cannot trust either number is "the" price for a vehicle wrap. Any future Foundation-side rate change (labor rate, markup) never reaches Wrap Lab jobs, and vice versa. |
| Rebuild Prevention Rule | **One canonical vehicle-wrap engine.** Wrap Lab calls `PricingEngine.calculate("vehicle_wraps", input, tenant_config)` — the exact same function and config every other surface uses. Wrap Lab may not define its own formula, materials list, labor rate, markup rule, or snapshot shape (final rebuild rules, this task). |
| Enforced In | Phase 4 (Vehicle Graphics and Wrap Lab Unification) |
| Verification Test | A golden-formula parity test: identical vehicle/coverage/material inputs fed through the Wrap Lab UI and the standalone calculator UI must produce the exact same `PricingResult` to the cent. |

### M-02: Webstore flat retail pricing disconnected from internal cost and margin

| Field | Detail |
|---|---|
| Legacy Problem | Webstore `Product.base_cost`/`retail_price` are manually-typed floats with no link to any calculator, material, labor rate, or markup rule. |
| Evidence | **Confirmed.** `routes/webstores.py::Product` (L173-194): `base_cost: Optional[float]`, `retail_price: Optional[float]`, no `pricing_category`, no `PricingResult` reference anywhere in the model. |
| Damage Caused | Owners can accidentally sell Webstore products below true production cost with no warning, because "cost" here is just whatever number they typed, not a real calculation. Margin/profitability reporting on Webstore sales is only as accurate as a manually-entered guess. |
| Rebuild Prevention Rule | Every Webstore product maps to a category calculator (or Custom); its internal price is computed live by the shared engine, exactly like any other category. A public retail override may exist on top, but never erases the internal calculated cost, margin, or a frozen `PricingSnapshot` at checkout (final rebuild rules, this task). |
| Enforced In | Phase 8 (Webstore Pricing Integration) |
| Verification Test | Every Webstore product must resolve to a non-null internal `PricingResult` before it can be published; a below-cost public override must trigger the same `below_cost` `PricingWarning` any other category would. |

### M-03: Duplicate materials libraries

| Field | Detail |
|---|---|
| Legacy Problem | Wrap Lab keeps its own per-ticket `materials` array instead of reading the shared Pricing Foundation materials library. |
| Evidence | **Confirmed.** `routes/wrap/core.py::WrapMaterialUpdate` (L142-153), `WRAP_MATERIAL_TYPES` (L175-179) — a separate materials structure with its own `material_name`/`brand`/`cost_per_sqft` fields, scoped per-ticket rather than per-tenant, disconnected from `models/pricing.py::MaterialConfig`. |
| Damage Caused | A tenant updating a vinyl cost in Pricing Foundation has no effect on Wrap Lab jobs; material cost data has to be re-entered per wrap ticket instead of selected from a managed library, inviting typos and stale prices. |
| Rebuild Prevention Rule | One `pricing_materials` collection per tenant, filtered by `compatible_categories`. Wrap Lab reads this collection filtered to `vehicle_wraps`-compatible materials — it does not maintain its own list. |
| Enforced In | Phase 2 (collection created), Phase 4 (Wrap Lab wired to consume it) |
| Verification Test | After Phase 4, `routes/wrap/core.py` must contain zero material-cost fields that are not read from `pricing_materials`. |

### M-04: Float-based currency calculations

| Field | Detail |
|---|---|
| Legacy Problem | All pricing math across every calculator and Wrap Lab uses raw Python `float`, with ad hoc `round(x, 2)` calls scattered throughout instead of one rounding rule. |
| Evidence | **Confirmed.** Every field in `server.py`'s 9 `calculate_*` functions and `routes/wrap/core.py::_compute_pricing_snapshot()` (e.g., L691, L694, L703, L705, L706, L709-711, L718, L722, L726, L728-729 — eleven separate `round(..., 2)` calls in one function alone) is a plain float. |
| Damage Caused | Floating-point binary representation error accumulates silently across multi-step formulas (material → labor → overhead → markup → rush); rounding happens at a different, inconsistent point in every function, so two formulas that should agree on a boundary case can disagree by a cent. |
| Rebuild Prevention Rule | All money is an integer number of cents (`services/money.py::Money`, Sprint 1, already built and unit-tested), with one documented half-up rounding rule applied once per named cost bucket — never scattered `round()` calls. |
| Enforced In | Phase 1 (Sprint 1, `Money` utility — **already complete**), Phase 3-5 (every calculator ported onto `Money`) |
| Verification Test | `test_money_utility.py` (58 passing tests, Sprint 1) plus, per category, a golden-formula test asserting exact-cent output for a fixed input set. |

### M-05: Giant pricing dispatcher/switch logic

| Field | Detail |
|---|---|
| Legacy Problem | One `calculate_pricing()` function in `server.py` if/elif-dispatches to 9 separate ~500-line functions, all living in a single ~4,800-line file. |
| Evidence | **Confirmed.** `server.py::calculate_pricing()` (L4356), category functions spanning L696-4356 — roughly 3,700 lines of pricing logic inside one monolithic file, alongside unrelated route handlers. |
| Damage Caused | Impossible to unit-test one category's formula in isolation without importing the entire server module; any shared-logic bug fix has to be manually copy-pasted into every affected function; the file's sheer size makes review and onboarding slow. |
| Rebuild Prevention Rule | One `PricingEngine.calculate(category, input, tenant_config) -> PricingResult` entry point, with category-specific formula code in small, independently testable modules — not one giant dispatcher file. |
| Enforced In | Phase 3-5 |
| Verification Test | Each category's formula module must be importable and unit-testable without importing the full FastAPI app. |

### M-06: Separate calculator functions with repeated shared logic

| Field | Detail |
|---|---|
| Legacy Problem | Waste application, overhead application, minimum-charge flooring, and rush-fee addition are each re-implemented inline inside every `calculate_*` function instead of being one shared helper. |
| Evidence | **Confirmed** for overhead (`calculate_overhead_cost()` at L336 is shared, but the *basis* passed to it differs per call site — see M-07); minimum-charge and rush-fee patterns confirmed present but not yet centralized (Extraction Inventory "Needs More Investigation" #2). |
| Damage Caused | A bug fix or business-rule change to "how rush fees work" has to be found and fixed in up to 9 places. |
| Rebuild Prevention Rule | Shared helpers on `Money` (`percentage()`, `apply_percentage_increase()`, etc., Sprint 1) plus category-family-level shared functions for waste/minimum-charge/rush, not per-category copies. |
| Enforced In | Phase 3 (area-based family), Phase 5 (remaining families) |
| Verification Test | Code review checklist: no two category modules may contain near-identical waste/overhead/rush logic blocks. |

### M-07: Inconsistent overhead rules

| Field | Detail |
|---|---|
| Legacy Problem | `calculate_overhead_cost()` is shared, but different `calculate_*` functions may pass different cost bases into it (already flagged by Phase 0 Group 2 before this session; re-confirmed structurally present in `calculate_vehicle_graphics`, where design/install pass-through costs are handled separately from the base labor+material overhead basis, L2799-2820). |
| Evidence | Confirmed function exists and is shared; per-category basis consistency needs a full line-by-line pass across all 9 functions (Extraction Inventory item). |
| Damage Caused | Two categories with the same material+labor cost can produce different suggested prices because one silently includes design/install costs in the overhead basis and another doesn't. |
| Rebuild Prevention Rule | One canonical overhead basis (`material_cost + production_labor_cost` only; design/install are pass-through, added after markup) — already locked in Phase 0 Group 2 and reflected in Sprint 1's `PricingResult.overhead_basis_cents` field. |
| Enforced In | Phase 0 (locked), Phase 3-5 (every category ported must match this basis) |
| Verification Test | Golden-formula test per category asserting `overhead_basis_cents == material_cost_cents + production_labor_cost_cents` exactly. |

### M-08: Legacy hours-based labor fallback

| Field | Detail |
|---|---|
| Legacy Problem | Two coexisting labor-costing systems: an older hourly-rate lookup and a newer minute-based system with an `include_labor` toggle, both still live in the same function. |
| Evidence | **Confirmed.** `server.py::calculate_vehicle_graphics()` L2799-2820: `labor_rates.get("production", {}).get("hourly_rate", ...)` (legacy) alongside `get_labor_minutes_and_rate(...)` (modern), with an explicit `if labor_minutes > 0:` branch choosing between them. |
| Damage Caused | Two tenants (or the same tenant on two different categories) can be silently using materially different labor-costing methodologies with no visible indicator of which one is active. |
| Rebuild Prevention Rule | Retire the hours-based fallback once the Owner explicitly re-affirms this decision (flagged as still open in `BANNERS_PORT_WIRING_SPEC.md` §3) — the minute-based system becomes the only labor-costing path. |
| Enforced In | Phase 3 (Owner decision required first) |
| Verification Test | After retirement, no `calculate_*` function may contain an hourly-rate-lookup branch. |

### M-09: Non-functional category setup status badges

| Field | Detail |
|---|---|
| Legacy Problem | A `category_setup_status` UI badge exists but its enforcement was already flagged (prior session, PRC-008) as either not functioning or not acted upon anywhere. |
| Evidence | Assumption to Verify carried forward from prior investigation — not re-read this session; flagged in `PRICING_ISSUES_INVENTORY_AND_REMEDIATION_PLAN.md` Phase 2 scope (PRC-008). |
| Damage Caused | Owners may believe a category is "fully configured" (green badge) when it is actually running on stale defaults, or vice versa — false confidence or false alarm either way. |
| Rebuild Prevention Rule | Either the badge gets real enforcement (blocking calculation, or a real warning) or it is removed entirely — no silent, non-functional UI signal. |
| Enforced In | Phase 2 |
| Verification Test | If kept: a test proving the badge's state changes calculator behavior. If removed: confirm no remaining UI reference. |

### M-10: Dead `ai_prefill_overrides` placeholder field

| Field | Detail |
|---|---|
| Legacy Problem | A field named `ai_prefill_overrides` exists in the pricing configuration schema with no code path that reads or writes it. |
| Evidence | Assumption to Verify carried forward from prior investigation (PRC-007); not re-read this session. |
| Damage Caused | Dead schema surface area — confuses anyone reading the model into thinking AI prefill is an active feature. |
| Rebuild Prevention Rule | Remove entirely; if AI prefill of pricing defaults is wanted, it is designed fresh in Phase 10 using the Historical Import's proven suggest/accept pattern. |
| Enforced In | Phase 2 |
| Verification Test | Field absent from the new `CategoryPricingConfig` schema. |

### M-11: Missing customer-specific pricing

| Field | Detail |
|---|---|
| Legacy Problem | No per-customer pricing adjustment mechanism exists at all. |
| Evidence | **Confirmed absent.** `models/customer.py::Customer` read directly this session — no discount, wholesale, contract, or tax-exempt field of any kind. |
| Damage Caused | Shops that offer repeat-customer or trade discounts today can only do so by manually typing a different price on every quote, with no consistency, no audit trail, and no reporting visibility into how much revenue is discounted. |
| Rebuild Prevention Rule | Phase 7 designs one `CustomerDiscountProfile` entity, consumed identically by Quotes, Orders, and Webstores. |
| Enforced In | Phase 7 |
| Verification Test | A customer with a discount profile produces a `PricingResult` reflecting that discount identically whether priced through an internal Quote or a Webstore checkout. |

### M-12: Missing wholesale/contract/volume pricing

| Field | Detail |
|---|---|
| Legacy Problem | No wholesale tier, contract-rate, or volume-pricing mechanism exists. |
| Evidence | **Confirmed absent** — same `Customer` model read as M-11; quantity-tier discount logic inside calculators (Extraction Inventory item #2) is a different concept (quantity breaks on ONE order) from a standing wholesale/contract rate across ALL future orders. |
| Damage Caused | Reseller/wholesale relationships have no first-class support; shops manage this entirely outside the system today (manual price overrides, side agreements). |
| Rebuild Prevention Rule | Phase 7 roadmap item — designed alongside the Customer Discount Profile, not bolted onto individual calculators. |
| Enforced In | Phase 7 |
| Verification Test | A contract-rate customer's price differs predictably and auditably from the standard calculated price, with the difference visible in reporting. |

### M-13: Missing margin and below-cost guardrails

| Field | Detail |
|---|---|
| Legacy Problem | Generic string warnings exist, but there was no dedicated, typed below-cost/margin-warning mechanism with severity before Sprint 1. |
| Evidence | **Confirmed** — prior sessions verified the generic `warnings: [string]` pattern; Sprint 1 (this job, 2026-02-15) built the first typed replacement (`PricingWarning`), not yet wired into any live calculator. |
| Damage Caused | An employee could sell an item below cost with no system-level flag distinguishing "this is fine" from "this loses money," relying entirely on human attentiveness. |
| Rebuild Prevention Rule | Every `PricingResult` carries typed `below_cost`/`margin_warning` entries with severity; below-cost commits require `PRICING_OVERRIDE` permission and an override reason (Phase 0 Group 3/4, Sprint 1 schema). |
| Enforced In | Phase 1 (schema — **done**), Phase 3-5 (wired into every category) |
| Verification Test | `test_golden_formula_framework.py`'s below-cost/margin-warning test cases (Sprint 1, passing) as the template every category's golden-formula suite must replicate. |

### M-14: Weak or absent manual override permissions

| Field | Detail |
|---|---|
| Legacy Problem | Any authenticated user can call the manual-price-save endpoint with no permission check specific to pricing overrides. |
| Evidence | **Confirmed.** `routes/job_tickets.py::save_ticket_pricing()` (L1791-1826) — no `require_permission` dependency visible gating `pricing_mode: "manual"`, `manual_price`. |
| Damage Caused | Any staff member, regardless of role, could set an arbitrary manual price with no system-level check, including selling below cost. |
| Rebuild Prevention Rule | `Permission.PRICING_OVERRIDE` (Sprint 1, `models/auth.py` — Owner/Admin self-approving, Staff must route through a pending-approval workflow). |
| Enforced In | Phase 1 (permission — **done**), Phase 6 (wired into the actual commit endpoints) |
| Verification Test | `test_pricing_permissions_sprint1.py` (Sprint 1, passing) verifies Staff lacks `PRICING_OVERRIDE`; a Phase 6 integration test must verify the live commit endpoint actually enforces it. |

### M-15: Missing override provenance

| Field | Detail |
|---|---|
| Legacy Problem | A manual override records only the number itself — no reason, no who, no approval state. |
| Evidence | **Confirmed.** `routes/job_tickets.py::save_ticket_pricing()` stored fields: `pricing_mode`, `calculated_price`, `manual_price`, `active_price`, `calculation_breakdown`, `saved_at` — no `reason`, `overridden_by_user_id`, or `approval_status`. Wrap Lab's `manual_quoted_price` (`WrapPricingConfig` L172) has the identical gap. |
| Damage Caused | No way to answer "why was this priced below the calculated suggestion?" months later, during a dispute or a margin-erosion investigation. |
| Rebuild Prevention Rule | `PricingOverride` (Sprint 1 schema): original price, final price, reason from a fixed taxonomy, `overridden_by_user_id`, `approval_status`, approver. |
| Enforced In | Phase 1 (schema — **done**), Phase 6 (wired into commit flow) |
| Verification Test | `test_golden_formula_framework.py::test_manual_override_below_cost` (Sprint 1, passing) as the template; Phase 6 integration test that a live override always produces a populated `PricingOverride` block. |

### M-16: Missing pricing configuration history

| Field | Detail |
|---|---|
| Legacy Problem | No record of who changed a material cost, labor rate, or markup, or what the value was before. |
| Evidence | **Confirmed absent** prior to Sprint 1 — no such mechanism found anywhere in `routes/pricing.py`'s settings-update endpoints. |
| Damage Caused | If a price suddenly looks wrong, there is no way to see what config value changed, when, or by whom. |
| Rebuild Prevention Rule | `PricingChangeLog` (Sprint 1 schema, `services/pricing_change_log.py::log_pricing_change()`) — write-through helper every future config-save route must call. |
| Enforced In | Phase 1 (schema — **done**), Phase 2 (wired into settings/material/category-config save routes) |
| Verification Test | `test_pricing_change_log.py` (Sprint 1, passing); Phase 2 integration test that saving a material cost produces exactly one new `PricingChangeLog` entry. |

### M-17: Missing pricing audit/change log (route-level enforcement)

| Field | Detail |
|---|---|
| Legacy Problem | Same root cause as M-16, called out separately because it also covers the *enforcement* gap — even once a log schema exists, nothing forces every write path to use it. |
| Evidence | Confirmed — same evidence as M-16; the schema is Sprint 1-only, no route calls it yet. |
| Damage Caused | Same as M-16, plus the risk that only *some* config-save routes get the audit call wired in, leaving silent gaps. |
| Rebuild Prevention Rule | Code-review rule: any new/modified route that writes to `PricingFoundationSettings`, `pricing_materials`, or `CategoryPricingConfig` MUST call `log_pricing_change()` in the same transaction/request. |
| Enforced In | Phase 2 |
| Verification Test | Grep-based CI check (or code review checklist) confirming every settings-write route imports and calls `log_pricing_change`. |

### M-18: Pricing snapshots not feeding profitability reports

| Field | Detail |
|---|---|
| Legacy Problem | Profitability/margin reporting reads a different collection than the one that actually carries live pricing snapshots. |
| Evidence | **Confirmed.** `routes/profit_analytics.py` L167 (`db.jobs.find(...)`), L175 (`db.job_items.find(...)`) — reads the legacy collections, not `db.job_tickets` (which is where `pricing_snapshot` actually lives, per `routes/job_tickets.py`). |
| Damage Caused | Margin/profit dashboards can be stale or simply wrong relative to what was actually priced and committed on live jobs. |
| Rebuild Prevention Rule | All profitability/margin reporting reads `PricingSnapshot` records exclusively. |
| Enforced In | Phase 6 |
| Verification Test | A test order priced and committed through the live flow must appear correctly in a profitability report within the same test run, with no separate "sync" step required. |

### M-19: Reports reading legacy/deprecated jobs or job-item records

| Field | Detail |
|---|---|
| Legacy Problem | At least three different "order item" representations coexist: `job_tickets` (current), `jobs`/`job_items` (explicitly labeled legacy in its own code), and embedded shapes inside `quotes`/`invoices`. |
| Evidence | **Confirmed.** `routes/jobs.py::sync_job_items_from_embedded_line_items()` (L100-101) docstring: *"Ensure legacy embedded line_items are also represented in the job_items collection."* `routes/invoices.py` L33 imports this exact function and uses it as a fallback (L176). `routes/profit_analytics.py` reads `jobs`/`job_items` directly (M-18). |
| Damage Caused | Same underlying data (an order's line items) has to be kept in sync across 3+ representations by hand-written sync functions, which is exactly the kind of place data silently drifts out of sync. |
| Rebuild Prevention Rule | One Order Item representation (`job_tickets`, or its rebuilt successor), consumed directly by Invoices and Reporting — no sync functions, no legacy fallback path. |
| Enforced In | Phase 6 |
| Verification Test | After Phase 6, `sync_job_items_from_embedded_line_items`-equivalent functions no longer exist in the codebase; Invoices and Reporting both read the same single collection. |

### M-20: Missing inventory/material-usage connection (to pricing)

| Field | Detail |
|---|---|
| Legacy Problem | Whether a material's actual on-hand inventory or vendor cost ever flows back into what the calculator charges is unconfirmed. |
| Evidence | Assumption to Verify — `services/inventory_service.py` itself is well-built (confirmed, reservation/allocation/lot tracking), but whether `pricing_materials.cost_per_sqft` is ever informed by a real inventory/vendor record versus being independently, manually maintained was not confirmed this session. |
| Damage Caused | If unconfirmed and actually absent: a shop could be charging based on a stale manually-entered material cost while its actual vendor cost has changed, silently eroding margin. |
| Rebuild Prevention Rule | Phase 2/6 explicitly investigates and, if missing, builds a defined (not necessarily automatic) link — e.g., a "review suggested material cost updates from recent PO receipts" flow, mirroring the Historical Import's suggest/accept pattern. |
| Enforced In | Phase 2 (investigate), Phase 6 (integration) |
| Verification Test | A PO receipt at a different cost than the current `pricing_materials` value produces a visible, actionable signal (not a silent no-op and not a silent auto-overwrite). |

### M-21: Missing purchasing/vendor-cost connection (to pricing)

| Field | Detail |
|---|---|
| Legacy Problem | Same category as M-20, specifically the vendor/PO side. |
| Evidence | Assumption to Verify — `models/inventory.py::VendorInput`/`PurchaseOrderInput` exist but their feedback loop into `pricing_materials` was not read this session. |
| Damage Caused | Same as M-20. |
| Rebuild Prevention Rule | Same as M-20. |
| Enforced In | Phase 2/6 |
| Verification Test | Same as M-20. |

### M-22: Duplicate onboarding/configuration flows — Banner Setup Wizard vs. Pricing Setup Quiz overlap

| Field | Detail |
|---|---|
| Legacy Problem | Two entirely separate UIs both write to the exact same configuration destination for Banners. |
| Evidence | **Confirmed this session** — read both files directly. `frontend/src/components/pricing/BannerSetupWizard.js` top-of-file comment: `// Saves to settings.category_defaults.banners`. `frontend/src/components/pricing/PricingSetupQuiz.js` (L45-52, L165, L241-244, L337-338, L486-492) has its own Banners section deriving `sell_rate`/`min_sell`/labor defaults, feeding the same `category_defaults.banners` path. |
| Damage Caused | An owner could run the general Quiz, get one set of Banner defaults, then separately run the Banner Wizard and overwrite them with a different methodology's output — with no indication either flow knows the other exists. Confusing, and risks silently discarding carefully-derived numbers. |
| Rebuild Prevention Rule | Phase 9 builds ONE unified setup quiz. The Banner Wizard's step-by-step guided UX pattern may be preserved as a *pattern* inside the unified flow, but not as a second, independent entry point writing the same destination. |
| Enforced In | Phase 9 |
| Verification Test | After Phase 9, there is exactly one UI entry point that can write `category_defaults.banners`-equivalent config. |

### M-23: Unclear cost/margin visibility rules

| Field | Detail |
|---|---|
| Legacy Problem | Whether Staff-role users can see internal cost/margin figures (as opposed to only the final price) versus Owner/Admin was flagged in prior investigation as inconsistently enforced (PRC-037). |
| Evidence | Assumption to Verify — carried forward from prior session; not re-read this session. |
| Damage Caused | Staff might see internal cost/margin data they shouldn't (competitive-sensitivity/trust issue), or conversely be unable to see data they need to do their job. |
| Rebuild Prevention Rule | A dedicated cost-visibility permission, separate from `PRICING_VIEW` (which grants seeing the *price*, not necessarily the internal cost breakdown) — final decision and exact permission name is a Phase 6 design item, informed by Phase 0's existing direction. |
| Enforced In | Phase 6 |
| Verification Test | A Staff-role test account's API response for a `PricingResult` must have cost/margin fields present or absent exactly per the locked rule, tested explicitly. |

### M-24: Missing standardized warning codes and severity

| Field | Detail |
|---|---|
| Legacy Problem | Every calculator returns free-text warning strings with no machine-readable type or severity. |
| Evidence | **Confirmed** pattern (see M-13); Sprint 1 replaces it with `PricingWarning.type`/`severity`. |
| Damage Caused | UI cannot distinguish "just FYI" from "block this from being sold" without brittle string-matching on English text. |
| Rebuild Prevention Rule | Typed `PricingWarning` (already built, Sprint 1). |
| Enforced In | Phase 1 (done), Phase 3-5 (wired in) |
| Verification Test | Same as M-13. |

### M-25: Wrap formula differences between Foundation and Wrap Lab

| Field | Detail |
|---|---|
| Legacy Problem | Distinct from M-01 (which is about the existence of two engines) — this specifically documents that the two engines' formulas produce materially different numbers for comparable inputs (no waste %, no coverage-tier concept, no overhead concept, no benchmark floor on the Wrap Lab side, versus a much more sophisticated Foundation formula). |
| Evidence | **Confirmed** via direct side-by-side reading this session (`server.py` L2683-2820 vs. `routes/wrap/core.py` L156-172, L665-746). |
| Damage Caused | Same damage as M-01, called out separately because the fix (Phase 4) explicitly requires a formula-comparison step BEFORE unification, not just a plumbing change — the numbers genuinely disagree today, not just the code paths. |
| Rebuild Prevention Rule | Phase 4's first build item is explicitly "Foundation versus Wrap Lab formula comparison" (already in the Build Order) before any unification code is written. |
| Enforced In | Phase 4 |
| Verification Test | A documented side-by-side comparison table (same inputs, both formulas, both outputs) produced and reviewed before Phase 4's unification code begins. |

### M-26: Missing Webstore price priority rules

| Field | Detail |
|---|---|
| Legacy Problem | When multiple price-affecting things could apply to a Webstore product (base retail price, variant `additional_cost`, fundraiser profit allocation, any future customer/discount rule), there is no documented precedence order. |
| Evidence | Assumption to Verify carried forward from prior investigation (PRC-033); not re-read this session, but the underlying model fields (`Product.retail_price`, `ProductVariant.additional_cost`, fundraiser allocation) are confirmed to coexist with no visible precedence logic read this session. |
| Damage Caused | Ambiguous which value "wins" when a public override exists alongside a calculated internal price and a variant modifier. |
| Rebuild Prevention Rule | Phase 8 documents an explicit precedence chain: internal calculated price → optional public override → variant modifiers → any future discount — evaluated in one place, not scattered. |
| Enforced In | Phase 8 |
| Verification Test | A test matrix covering every combination of override/variant/discount presence, asserting the documented precedence order holds. |

### M-27: Building UI before locking pricing business rules

| Field | Detail |
|---|---|
| Legacy Problem | Historically, calculator screens and wizards were built before the underlying business rules (rounding, overhead basis, warning taxonomy, override workflow) were formally decided and written down anywhere. |
| Evidence | Confirmed by the very existence of inconsistencies documented across M-04, M-07, M-08 — these could only arise if formula decisions were made ad hoc per screen rather than centrally decided first. |
| Damage Caused | Every new category or screen re-derives its own answer to "how do we round," "what's the overhead basis," etc., compounding inconsistency over time. |
| Rebuild Prevention Rule | Phase 0 (already completed, `PHASE_0_PRICING_DECISIONS_FORMULA_GOVERNANCE.md`) locks every formula/business-rule decision BEFORE any calculator UI is rebuilt — this is the entire reason Phase 0 was done first in this project. |
| Enforced In | Phase 0 (done), enforced procedurally for every subsequent phase |
| Verification Test | Any new category port must cite a Phase 0 decision ID for every formula choice it makes; a formula choice with no corresponding Phase 0 decision is a process violation to flag before merging. |

### M-28: Fixing the legacy repo instead of extracting knowledge for the rebuild

| Field | Detail |
|---|---|
| Legacy Problem | The temptation, when finding a bug like M-14's missing permission check, is to patch it directly in the legacy `routes/job_tickets.py` — which produces a slightly-less-broken legacy system instead of progress toward the rebuild, and risks masking exactly the evidence (like M-01's formula divergence) the rebuild needs to see clearly. |
| Evidence | Not a code-level finding — a process risk this task itself was explicitly commissioned to prevent (per this task's own instructions: "Do not recommend rebuilding or 'fixing' the legacy pricing system in place"). |
| Damage Caused | Time spent hardening code that is being replaced; legacy patches can also change the very evidence (formula outputs, snapshot shapes) future golden-formula parity tests need to compare against. |
| Rebuild Prevention Rule | **The Legacy Repo Usage Rule** (stated in full in `PRICING_LEGACY_REBUILD_HANDOFF_MASTER.md`): the legacy repository is a source of formulas, business rules, workflows, examples, configuration data, and verification cases — not the place the final architecture gets built. |
| Enforced In | Every phase, as a standing project rule |
| Verification Test | Process check, not a code test: no pull request/commit in the rebuild should be a same-shape bug fix applied directly to legacy calculator/Wrap Lab/Webstore pricing files, outside of the previously-approved, explicitly-scoped security patches already tracked separately in `RUNNING_ISSUE_TRACKER.md`. |

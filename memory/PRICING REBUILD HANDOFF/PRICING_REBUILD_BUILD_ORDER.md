# PRICING REBUILD BUILD ORDER

**Status:** Documentation only. No implementation performed beyond what Sprint 1 (Phase 1) already completed and was previously reported. This order matches `PRICING_ISSUES_INVENTORY_AND_REMEDIATION_PLAN.md`'s phased plan; this document restates it in the exact 10-phase format required for this handoff package, cross-referenced against the fresh evidence gathered in this investigation pass.

---

## Phase 1 — Shared Pricing Primitives ✅ COMPLETE (Sprint 1, 2026-02-15)

| Field | Detail |
|---|---|
| Why this order | Every later phase needs a common money type, result/snapshot/warning shape, permission model, and test harness before any real formula code is written — building these alongside the first real category would mean rebuilding them again once inconsistencies surfaced. |
| Dependencies | None — this is the starting point. |
| Exact modules included | `services/money.py` (`Money`), `models/pricing_core.py` (`PricingResult`, `PricingSnapshot`, `PricingWarning`, `PricingOverride`, `PricingChangeLog`), `models/auth.py` additions (`PRICING_VIEW`/`PRICING_EDIT_FOUNDATION`/`PRICING_OVERRIDE`), `services/pricing_change_log.py`, `backend/tests/helpers/golden_formula.py`, `BANNERS_PORT_WIRING_SPEC.md` |
| What must not be built yet | Any live calculator change, any screen change, any config migration, any Wrap Lab/Webstore code |
| Required legacy data to extract | None — pure new infrastructure |
| Required tests | Unit tests only: Money math, permission role-mapping (with explicit no-regression assertions against pre-existing roles), change-log write helper, golden-formula harness self-test against a trivial fixture formula |
| Exit criteria | **Met.** 58/58 new tests passing; zero regression verified by running the full pre-existing `test_rbac.py`/`test_pricing*.py` suites before and after (identical results) |

---

## Phase 2 — Pricing Data Architecture

| Field | Detail |
|---|---|
| Why this order | Every calculator ported in Phases 3-5 reads its config from here — building the calculator logic before its data shape is settled means rebuilding the calculator's config-reading code twice. |
| Dependencies | Phase 1 (`PricingChangeLog` must exist so material/config edits can log to it) |
| Exact modules included | `pricing_materials` collection (replacing the embedded array); `CategoryPricingConfig` per-tenant-per-category documents (replacing the nested dict-of-dicts, confirmed inconsistent shape per category); `PricingTemplate` (verify fit, likely unchanged); vehicle tables and coverage-package benchmarks as first-class reference data; Apparel price tables; a **config-bundle read function** assembling `PricingFoundationSettings` + `CategoryPricingConfig` + filtered `pricing_materials` in one call (see the Owner-mandated live-recalculation requirement, Remediation Plan §4E and its Phase 2 subsection) |
| What must not be built yet | Any calculator formula rewrite, any screen change, Wrap Lab/Webstore wiring |
| Required legacy data to extract | `pricing_configuration` (whole document), `category_defaults.*` (all 9 categories), embedded materials array (including `category="vehicle_type"` entries), `PricingTemplate` documents — see `PRICING_TO_REBUILD_MIGRATION_MAP.md` rows 1-8 for exact transformation detail |
| Required tests | Migration test (old embedded data → new collections, zero data loss, diffed against a real tenant's exported config); CRUD integration tests for materials/config; a **live-recalculation timing test** proving a config-bundle fetch happens once per session and zero additional database queries occur on subsequent input changes |
| Exit criteria | Every existing tenant's materials/category-config migrated with byte-for-byte equivalent values (restructured, not altered); old embedded fields no longer exist; the same `CategoryPricingConfig` bundle is provably reused by every surface that will eventually price that category |

---

## Phase 3 — Shared Live Calculator Experience and Area-Based Family

| Field | Detail |
|---|---|
| Why this order | Banners is the simplest, most well-isolated category (per the investigation's own recommendation) — proving the shared live-calculation shell and area-based engine here, before touching Vehicle Graphics/Wrap Lab's much messier duplicate-engine problem, means Phase 4 unifies against an already-proven pattern instead of inventing it under pressure. |
| Dependencies | Phase 2 (config bundle must exist and be fast) |
| Exact modules included | Shared live calculator shell (debounced recompute on every input change, per `BANNERS_PORT_WIRING_SPEC.md` §2h); Banners port (first); Rigid Signs, Cut Vinyl, Digital Print ports (immediately after, same engine); shared cost-breakdown drawer UI; shared warnings/overrides UI; shared `PricingSnapshot` creation on explicit commit |
| What must not be built yet | Vehicle Graphics/Wrap Lab (Phase 4 — deliberately deferred so its formula-comparison work happens with a proven pattern already in hand), Apparel/Services/Promotional/Custom (Phase 5), any Quote/Order/Reporting integration beyond what's needed to prove the snapshot-commit step works (full integration is Phase 6) |
| Required legacy data to extract | Banners/Rigid Signs/Cut Vinyl/Digital Print formula logic from `server.py` (`calculate_banners` L2126-2683, `calculate_rigid_signs` L1698-2126, `calculate_cut_vinyl` L867-1214, `calculate_digital_print` L1214-1698) as business-rule reference, per `PRICING_MODULE_EXTRACTION_INVENTORY.md` §B |
| Required tests | A parity test proving the new engine matches the OLD dispatcher's live output for a representative input set per category (explicit acceptance criterion); golden-formula suites per category (exact-cents, warnings, rounding, minimum-charge, override, snapshot); a live-recalculation UI test proving every listed input (size, material, quantity, finishing, etc.) triggers a live price update with no page reload |
| Exit criteria | All 4 area-based categories produce byte-identical output to their legacy counterparts for the same inputs; live recalculation works in the calculator, a Quote Item editor, and an Order Item editor; a `PricingSnapshot` is created only on explicit commit and never on every keystroke |

---

## Phase 4 — Vehicle Graphics and Wrap Lab Unification

| Field | Detail |
|---|---|
| Why this order | This is the single most dangerous duplicate system in the codebase (M-01/M-25, two engines with **confirmed, materially different formulas** for the same category) — it comes right after Phase 3 specifically so the unification has a proven area-based engine pattern to extend, rather than being the first thing built. |
| Dependencies | Phase 3 (proven live-calculation shell + area-based engine pattern to extend with coverage/benchmark logic) |
| Exact modules included | **Foundation versus Wrap Lab formula comparison** (a documented side-by-side table, first build item, before any unification code); one canonical `vehicle_wraps` engine (extending the area-based engine with coverage %, benchmark floor, seam/difficulty multipliers, second installer); shared vehicle tables and shared materials (Wrap Lab reads the same `pricing_materials` collection); shared `PricingSnapshot`; Wrap Lab UI wired to call the shared calculator instead of `_compute_pricing_snapshot()`; retirement of `WrapPricingConfig`/`_compute_pricing_snapshot()`/the wrap-specific `materials` array |
| What must not be built yet | Apparel/Services/Promotional/Custom (Phase 5), full Quote/Order/Reporting integration (Phase 6) |
| Required legacy data to extract | Foundation's `calculate_vehicle_graphics()` (`server.py` L2683-3237) as the primary formula source; Wrap Lab's committed historical snapshots (see Migration Map's Wrap-specific rows) preserved as read-only history; Wrap Lab's *live* config structure (`WrapPricingConfig`) is explicitly **not** carried forward past this phase |
| Required tests | The formula-comparison table itself (documentation, reviewed before code); a parity test between old Wrap Lab output and new unified-engine output for representative inputs (expected to legitimately DIFFER in some cases, since the formulas were never actually equivalent — differences must be explained, not silently accepted); golden-formula suite for `vehicle_wraps` covering coverage tiers, benchmark floor, second installer, window perf |
| Exit criteria | Wrap Lab's pricing UI calls the shared engine exclusively; no `WrapPricingConfig`/`_compute_pricing_snapshot()`/wrap-specific materials code remains; a wrap job priced through Wrap Lab and the standalone calculator (same inputs) produce identical output |

---

## Phase 5 — Apparel, Services, Promotional, and Custom

| Field | Detail |
|---|---|
| Why this order | These four categories don't share the area-based engine (Apparel is table-first, Services is time/unit/trip-based, Promotional is cost-plus, Custom is manual) — building them after the area-based family and Vehicle/Wrap unification means the shared primitives (Money, PricingResult, warnings, overrides, permissions, snapshot) are already proven across two structurally different formula styles before being applied to four more. |
| Dependencies | Phase 1 (primitives), Phase 2 (config architecture) — does NOT strictly depend on Phase 3/4's area-based engine internals, but comes after them in this plan because Banners/Vehicle-Wraps are the higher-risk, higher-evidence items to prove the pattern on first |
| Exact modules included | Apparel table-first module (blank cost, brand/style, quantity tiers, placement, decoration method, size breakdown, plus-size rules, add-ons, formula fallback); Services time/unit/trip module (hourly, flat, per-unit, travel, mileage, service-call minimum, equipment, subcontracting, permit fees, overtime); Promotional cost-plus module; Custom controlled manual module (still producing a real `PricingResult`/`PricingSnapshot`, going through the same permission gate — not an escape hatch) |
| What must not be built yet | Quote/Order/Reporting integration (Phase 6), Customer pricing (Phase 7), Webstore integration (Phase 8) |
| Required legacy data to extract | `calculate_apparel()` (`server.py` L3869-4356), `calculate_services()` (L3237-3739), `calculate_promotional()` (L696-867), `calculate_custom()` (L3739-3869) — all flagged "Needs More Investigation" for exact internal formula detail in `PRICING_MODULE_EXTRACTION_INVENTORY.md` §B; these must be read in full before this phase's build starts, not deferred further |
| Required tests | Golden-formula suite per category matching the pattern proven in Phase 3; a specific test that Custom still produces warnings/overrides/permission enforcement identically to every other category (guards against M-27/M-28-style "just fix it directly" shortcuts) |
| Exit criteria | All remaining 4 categories produce a standardized `PricingResult`/`PricingSnapshot`; no category-specific snapshot shape exists anywhere in the codebase |

---

## Phase 6 — Quotes, Orders, Work Orders, Inventory, Purchasing, and Reporting Integration

| Field | Detail |
|---|---|
| Why this order | Only after every category produces a standardized, trustworthy `PricingResult`/`PricingSnapshot` does it make sense to rewire the systems that CONSUME pricing output — doing this earlier would mean rewiring Quotes/Orders/Reporting once per category as each one ships, instead of once total. |
| Dependencies | Phases 3-5 (all categories on the shared engine) |
| Exact modules included | Quote Item pricing (wired to `PricingSnapshot`, replacing the current independent `QuoteLineItem` shape); Order Item pricing (`job_tickets` gets the standardized snapshot, replacing its current `{pricing_mode, calculated_price, manual_price, active_price, calculation_breakdown}` shape and the missing-permission `save_ticket_pricing` endpoint); Work Order Summary estimates; material requirements (inventory) linkage; vendor-cost feedback loop (resolving the Needs More Investigation item on whether PO receipts inform material cost); profitability/margin reporting rewired to read `PricingSnapshot` exclusively (retiring the confirmed `jobs`/`job_items` legacy read path in `routes/profit_analytics.py`); invoice/deposit interaction (retiring `sync_job_items_from_embedded_line_items`'s legacy fallback) |
| What must not be built yet | Customer-specific pricing (Phase 7 — this phase wires the INFRASTRUCTURE these will plug into, not the discount logic itself), Webstore integration (Phase 8) |
| Required legacy data to extract | The 3+ divergent Order Item / line-item representations (`job_tickets`, `jobs`/`job_items`, `quotes.line_items`, `invoices.line_items`) — consolidation plan per `PRICING_TO_REBUILD_MIGRATION_MAP.md`; `routes/profit_analytics.py`'s current query shape as the "before" baseline for the reporting rewrite |
| Required tests | End-to-end test: a price calculated live, committed to a Quote Item, converted to an Order Item, invoiced, and appearing correctly in a profitability report — all from ONE `PricingSnapshot`, no sync step; a permission test that `PRICING_OVERRIDE` is actually enforced on the live commit endpoint (not just the schema, per M-14) |
| Exit criteria | No `sync_job_items_from_embedded_line_items`-equivalent function remains; `routes/profit_analytics.py` reads `PricingSnapshot`-derived data exclusively; every Order Item/Quote Item/Invoice line item traces back to exactly one `PricingSnapshot` |

---

## Phase 7 — Customer Pricing

| Field | Detail |
|---|---|
| Why this order | Customer-specific pricing (discounts, wholesale, contract rates) needs to plug into an already-standardized Quote/Order pricing flow (Phase 6) — building it earlier would mean building it against the fragmented pre-Phase-6 system and then rebuilding again. |
| Dependencies | Phase 6 (standardized Quote/Order pricing flow to plug into) |
| Exact modules included | `CustomerDiscountProfile` (new — confirmed nothing exists today to migrate); wholesale/reseller plan; contract and volume pricing roadmap; discount approval behavior (mirroring the `PRICING_OVERRIDE` approval pattern); reporting impact (discount amounts visible in profitability reports) |
| What must not be built yet | Webstore integration (Phase 8) — though this phase's design must anticipate Webstores as a future consumer of the same discount profile, per the Data Ownership Map's cross-cutting rule |
| Required legacy data to extract | **None — confirmed nothing exists.** This phase designs from scratch. |
| Required tests | A discount-profile customer produces a predictably different `PricingResult` than a standard customer for the same input, with the discount amount visible and auditable in reporting |
| Exit criteria | `CustomerDiscountProfile` is consumable by both internal Quotes/Orders and (in design, not yet wired) the future Webstore checkout path |

---

## Phase 8 — Webstore Pricing Integration

| Field | Detail |
|---|---|
| Why this order | Webstores is the platform's most disconnected pricing surface (M-02, confirmed flat `retail_price`/`base_cost` with zero calculator linkage) — fixing it requires every other phase's infrastructure (shared engine, standardized snapshot, customer pricing) to already exist, or Webstores would just become a 5th place reinventing the same wheel. |
| Dependencies | Phases 2-7 (full shared engine, snapshot standard, and customer-pricing infrastructure) |
| Exact modules included | Product-category mapping (`pricing_category` field distinct from the current display-only `ProductCategory` enum, which confirmed does not map 1:1 onto the 9 calculator categories); product setup pricing (live calculator embedded in Webstore product creation/edit); public override rules (precedence chain: internal calculated price → optional public override → variant modifiers → discount, per M-26); fundraiser/event price rules (reusing the confirmed-sound `compute_event_profit_allocation()` math, now fed by real profit numbers); owner share/platform fee (preserving the confirmed-sound `LockedSettings` admin-lock pattern); Webstore order `PricingSnapshot` at checkout; store profitability reporting rewired onto real `PricingSnapshot` data |
| What must not be built yet | AI Pricing Guidance (Phase 10) |
| Required legacy data to extract | `Product`/`ProductVariant` documents (re-categorized, not auto-re-priced — Owner-reviewed per Migration Map); `APPAREL_TIER_DEFAULTS` (reconciled into the ONE shared Apparel table, not kept as a second copy); `LockedSettings`/profit-allocation data (as-is) |
| Required tests | Every published product resolves to a non-null internal `PricingResult`; a below-cost public override triggers the same `below_cost` warning any other category would; the price-priority chain test matrix (M-26); a checkout produces a `PricingSnapshot` per line item |
| Exit criteria | Zero Webstore products have a calculator-disconnected flat price; no separate Webstore pricing engine exists anywhere in the codebase |

---

## Phase 9 — Pricing Onboarding and Historical Import

| Field | Detail |
|---|---|
| Why this order | Onboarding UX is how NEW tenants populate all the config built in every prior phase — it comes near the end because it needs the final `CategoryPricingConfig`/Materials Library/labor-rate shapes to be stable before designing the guided flow that fills them in; building it earlier would mean redesigning the quiz every time an earlier phase's schema changed. |
| Dependencies | Phase 2 (final config schema), ideally Phases 3-5 complete (so the quiz's category sections write into fully-supported categories) |
| Exact modules included | Unified setup quiz (merging the Pricing Setup Quiz and Banner Setup Wizard's confirmed-duplicate write path into ONE flow — Banner Wizard's step-by-step UX pattern may be preserved as a pattern, Shop Rate Quiz's distinct shop-rate-burden methodology is preserved as a step, not discarded); Banner Wizard decision (retire as a separate entry point, per M-22); Shop Rate Quiz decision (keep, integrated as one step, per this session's confirmed non-redundancy finding); save/resume (confirming whether any exists today — Needs More Investigation); quiz answer history (new, if confirmed absent per Migration Map); Historical Import audits (as-is, already sound); Historical Import benchmark rules (as-is) |
| What must not be built yet | AI Pricing Guidance (Phase 10) |
| Required legacy data to extract | `PricingSetupQuiz.js` (1,375 lines) and `BannerSetupWizard.js` (501 lines)'s derivation formulas (business-rule reference, per Extraction Inventory); `ShopRateQuiz.js` (534 lines)'s shop-rate-burden methodology (business-rule reference, confirmed distinct and worth preserving) |
| Required tests | A new tenant completing the unified quiz produces a fully-populated `CategoryPricingConfig` for every category they configure; confirm save/resume behavior explicitly, whatever the decision |
| Exit criteria | Exactly one UI entry point writes Foundation/category defaults; `BannerSetupWizard.js` as a standalone entry point is retired |

---

## Phase 10 — Future AI Pricing Guidance

| Field | Detail |
|---|---|
| Why this order | AI suggestions are only trustworthy once there is a stable, standardized `PricingResult`/`PricingSnapshot`/`PricingChangeLog` history for the AI to read and compare against — building this first would mean the AI is trained/prompted against a moving, inconsistent target. |
| Dependencies | Phases 1-9 (a full history of standardized snapshots and change logs to learn from) |
| Exact modules included | AI recommendations, AI material suggestions, AI labor suggestions, AI market comparison, AI unusual-price explanations, AI approval rules (reusing the Historical Import's proven suggest/accept pattern, per M-28's prevention rule against inventing a second AI-acceptance mechanism), AI credit tracking (token usage/cost logging, already flagged as a separate P1 future task in the platform's own backlog) |
| What must not be built yet | Nothing after this — it is the final phase |
| Required legacy data to extract | The Historical Import module's exact suggest/accept UI/API pattern (`routes/pricing_setup.py`) as the mandatory template |
| Required tests | AI suggestions never auto-apply without a human accept step (mirroring Historical Import); a below-cost AI suggestion still triggers the standard `PricingWarning` |
| Exit criteria | AI Pricing Guidance produces suggestions a human must explicitly accept, using the exact same acceptance mechanism Historical Import already proved out — no second, parallel AI-acceptance flow |

---

## Cross-phase note on live recalculation (applies to Phases 3-8)

Per the Owner's explicit correction (`PRICING_ISSUES_INVENTORY_AND_REMEDIATION_PLAN.md` §4E), every phase from 3 through 8 must implement continuous live price recalculation as a hard requirement — never an optional enhancement, never weakened, delayed, or replaced by the snapshot system. A `PricingSnapshot` is created only at explicit commit in every one of these phases; this is restated here so no future phase plan drifts from it.

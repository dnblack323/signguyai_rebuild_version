# SIGNGUY AI — PHASE 0 PRICING DECISIONS, FORMULA GOVERNANCE & BUILD RULES

**Mode:** Documentation only. No code written, no calculators modified, no migrations created, no live pricing behavior changed, no implementation work begun.
**Source material:** `/app/memory/PRICING_ISSUES_INVENTORY_AND_REMEDIATION_PLAN.md`, `/app/memory/PRICING_SPEC.md`, `/app/memory/pricing_spec.md`, `/app/memory/pricing_quiz_spec.md`, `/app/memory/PRICING_SYSTEM_CALCULATORS_ONBOARDING_QUIZ_REBUILD_DOC.md`
**Date:** 2026-02-15

**Labeling convention used throughout this document:**
- **Confirmed** — directly verified in the source documents/code this session or a prior one.
- **Recommended Decision** — this document's proposed answer, grounded in the evidence above.
- **Owner Approval Required** — a recommended decision that still needs an explicit yes/no/revise from the Shop Owner/Product Owner before it is locked.
- **Open Business Decision** — no recommended default exists; a genuine choice with no clearly superior option from the evidence alone.
- **Assumption to Verify** — plausible but not confirmed by a direct code read; requires a follow-up verification task before final approval.

---

## PURPOSE

Phase 0 exists to lock the business rules, formula rules, override rules, data rules, and ownership decisions that every pricing calculator will depend on.

**Nothing in Pricing Foundation, Banners, Wrap Lab, Webstores, Quotes, Orders, or Reports may be rebuilt until the decisions in this document are approved.**

This document does not make hidden assumptions. Every unresolved rule is explicitly labeled per the convention above — nothing is quietly treated as settled.

---

## 1. PHASE 0 EXECUTIVE SUMMARY

**Why pricing rebuild work cannot begin yet:** The investigation (`PRICING_ISSUES_INVENTORY_AND_REMEDIATION_PLAN.md`) identified 59 confirmed issues, a meaningful number of which are not code defects at all but **unresolved business rules** — the overhead basis, the rounding policy, the override-approval workflow, the pricing precedence order, and the canonical vehicle-wrap formula. Building any calculator (even the simplest, Banners) against an unresolved rule means re-deriving that formula a second time the moment the rule is finally decided. Two of the source specification documents themselves (`PRICING_SPEC.md` and `pricing_spec.md`) **directly disagree** with each other on whether design and install labor sit inside the overhead basis (see §3) — concrete proof that this ambiguity is real, not hypothetical, and must be resolved before any formula is coded.

**Which pricing issues are blocked by unresolved business rules:** PRC-005 (overhead basis), PRC-003/PRC-017 (money/rounding), PRC-014/PRC-015/PRC-016 (override guardrails), PRC-009/PRC-034 (customer pricing precedence), PRC-001/PRC-032 (Vehicle Wrap canonical formula), PRC-018/PRC-019 (shipping/overtime), PRC-024/PRC-053 (Banner Wizard vs. Quiz), PRC-033 (Webstore override rules), PRC-012/PRC-027 (change-history governance). All are cataloged with their Decision IDs in §2.

**Which decisions affect every calculator:** The overhead formula (§3), currency/rounding rules (§4), below-cost/margin guardrails (§5), override permissions (§6), the precedence hierarchy (§8), and the global formula governance rules (§15) apply identically to all 9 pricing categories — Banners, Rigid Signs, Cut Vinyl, Digital Print, Vehicle Graphics/Wraps, Apparel, Services, Promotional, Custom.

**Which decisions affect only Wrap Lab, Webstores, or specialized categories:** The Vehicle Wrap canonical formula decision (§10) affects only Vehicle Graphics/Wraps and Wrap Lab. The Webstore override rules (§9) affect only Webstore-sold products. The Banner Wizard vs. Quiz decision (§11) affects only Banners' onboarding path. Shipping/installation/service-call ownership (§12) affects categories that use those cost components (primarily area-based categories, Services, Vehicle Wraps).

**What must be approved before Sprint 1 can begin:** Per the Recommended First Implementation Sprint already documented in the Remediation Plan, Sprint 1 builds the Money utility, standardized schemas, permissions, change-log infrastructure, and the golden-formula test framework — none of which can be built correctly without §3 (overhead), §4 (currency/rounding), §5/§6 (override/permission rules), §8 (precedence hierarchy), and §14 (change-history governance) being locked first. The full list of Sprint-1 gating decisions is restated in §18.

**What Phase 0 does not include:** Phase 0 does not write a `PricingEngine`, does not touch `server.py`, does not migrate any tenant's `pricing_configuration` document, does not change what a single existing quote or webstore order currently costs a customer, and does not resolve every open question in the Remediation Plan — only the subset that blocks Sprint 1 and the first calculator port (Banners, Phase 3). Lower-priority open items (PRC-051 hardware auto-suggestion, PRC-057 material comparison mode, PRC-055 promo codes, etc.) remain correctly deferred to their assigned later phases and are not re-litigated here.

**Phase 0 creates rules and governance, not customer-facing features.** No shop owner, staff member, or customer will see any visible change as a result of this document being approved.

---

## 2. DECISION APPROVAL REGISTER

Every decision defaults to **Proposed** unless the source documentation proves it was already locked (none were — every pricing business rule found in the investigation was either inconsistent across categories or entirely undocumented).

| Decision ID | Decision Name | Status | Owner Approval Required | Affected Modules | Blocks Which Phases |
|---|---|---|---|---|---|
| P0-PRC-001 | Canonical overhead cost basis (material + production labor only) | Proposed | Yes | All 9 categories | Phase 1, Phase 3, Phase 4, Phase 5 |
| P0-PRC-002 | Whether design labor is included in the overhead basis | Proposed | Yes | All categories with design charges | Phase 3, Phase 4, Phase 5 |
| P0-PRC-003 | Whether installation labor is included in the overhead basis | Proposed | Yes | All categories with install charges, Vehicle Wraps | Phase 3, Phase 4, Phase 5 |
| P0-PRC-004 | Whether subcontractor cost is included in the overhead basis | Proposed | Yes | Services, Promotional | Phase 5 |
| P0-PRC-005 | Whether setup fees are included in the overhead basis | Proposed | Yes | Promotional, Apparel, Services | Phase 3, Phase 5 |
| P0-PRC-006 | Whether shipping/delivery is included in the overhead basis | Proposed | Yes | All categories (once shipping exists, PRC-018) | Phase 3, Phase 5 |
| P0-PRC-007 | Whether Services/Apparel/Promotional/Custom apply the overhead formula at all | Proposed | Yes | Services, Apparel, Promotional, Custom | Phase 5 |
| P0-PRC-008 | Store all pricing money as integer cents | Proposed | Yes | Every category, Invoices, Reports | Phase 1 (blocks everything downstream) |
| P0-PRC-009 | Rounding method and rounding timing (per-bucket vs. final-only) | Proposed | Yes | Every category | Phase 1, Phase 3 |
| P0-PRC-010 | Whole-dollar pricing toggle rule | Proposed | Yes | Category/tenant settings | Phase 3 |
| P0-PRC-011 | Rounding rule for quantity discounts, rush fees, and tax | Proposed | Yes | Every category, Invoices | Phase 3 |
| P0-PRC-012 | Rounding rule for manual overrides and imported historical prices | Proposed | Yes | Manual override flow, Historical Import | Phase 3, Phase 10 |
| P0-PRC-013 | Below-target-margin behavior (warn-only at launch) | Proposed | Yes | Every category | Phase 1, Phase 3 |
| P0-PRC-014 | Below-cost behavior (warning + required override reason) | Proposed | Yes | Every category | Phase 1, Phase 3 |
| P0-PRC-015 | Staff below-cost override requires Owner/Admin approval | Proposed | Yes | Every category | Phase 1, Phase 3 |
| P0-PRC-016 | Required override-reason taxonomy, including loss-leader/relationship-price | Proposed | Yes | Every category | Phase 1, Phase 3 |
| P0-PRC-017 | Warning visibility across Quote, Invoice, Work Order Summary, Reports, Customer Portal | Proposed | Yes | Quotes, Orders, Invoices, Reports, Customer Portal | Phase 1, Phase 6, Phase 9 |
| P0-PRC-018 | Warning/override interaction with customer discount, wholesale, and Webstore override | Proposed | Yes | Customers, Webstores | Phase 7, Phase 8 |
| P0-PRC-019 | `PRICING_VIEW` / `PRICING_EDIT_FOUNDATION` / `PRICING_OVERRIDE` default role mapping | Proposed | Yes | RBAC (`models/auth.py`) | Phase 1 |
| P0-PRC-020 | Cost/margin internal-data visibility scope (who sees raw cost/margin) | Proposed | Yes | All calculator UIs, Customer Portal | Phase 1, Phase 6 |
| P0-PRC-021 | Formal below-cost override approval workflow (staff request → owner approval → snapshot) | Proposed | Yes | Every category | Phase 1, Phase 3 |
| P0-PRC-022 | Webstore public pricing edit permission | Proposed | Yes | Webstores | Phase 8 |
| P0-PRC-023 | Owner-share/platform-fee visibility permission | Proposed | Yes | Webstores, Reports | Phase 8, Phase 9 |
| P0-PRC-024 | Customer discount percent MVP scope and precedence position | Proposed | Yes | Customers, all categories | Phase 7 |
| P0-PRC-025 | Customer discount cannot silently push price below cost | Proposed | Yes | Customers | Phase 7 |
| P0-PRC-026 | Customer-specific minimum-margin exceptions — deferred, not MVP | Proposed | Yes | Customers (future) | Phase 7 (future expansion) |
| P0-PRC-027 | Customer tax-exempt separation remains selling-price-independent | Proposed (reaffirm existing behavior) | Yes | Customers | Phase 7 |
| P0-PRC-028 | Canonical 14-layer pricing precedence hierarchy | Proposed | Yes | Every category, Customers, Webstores | Phase 1, Phase 3, Phase 7, Phase 8 |
| P0-PRC-029 | Webstore public price override principle (never erases internal snapshot) | Proposed | Yes | Webstores | Phase 8 |
| P0-PRC-030 | Which Webstore products remain manually priced vs. calculator-backed | Proposed | Yes | Webstores | Phase 8 |
| P0-PRC-031 | Vehicle Wrap canonical formula direction | Proposed (direction only — final formula deferred pending code diff) | Yes | Vehicle Graphics/Wraps, Wrap Lab | Phase 4 |
| P0-PRC-032 | Banner Setup Wizard / Pricing Setup Quiz consolidation direction | Proposed | Yes | Banners onboarding | Phase 10 |
| P0-PRC-033 | Shipping/delivery pricing ownership (Pricing Foundation vs. Fulfillment) | Proposed | Yes | All categories, Fulfillment | Phase 3, Phase 5, Phase 6 |
| P0-PRC-034 | Installation labor ownership split (pricing input vs. fulfillment execution) | Proposed | Yes | All categories with install, Fulfillment | Phase 3, Phase 6 |
| P0-PRC-035 | Service-call/trip-charge ownership | Proposed | Yes | Services, Fulfillment | Phase 5, Phase 6 |
| P0-PRC-036 | Overtime labor rate policy | Proposed | Yes | Labor rate configuration, all categories | Phase 3 |
| P0-PRC-037 | Weekend/after-hours/emergency labor policy | Proposed | Yes | Labor rate configuration, all categories | Phase 3, Phase 5 |
| P0-PRC-038 | Service-call minimum, travel-time billing, and second-installer policy | Proposed | Yes | Services, Vehicle Wraps | Phase 4, Phase 5 |
| P0-PRC-039 | PricingChangeLog vs. Activity Log write-routing rules | Proposed | Yes | Every pricing write path | Phase 1, Phase 2 |
| P0-PRC-040 | Historical Pricing Snapshots are permanently frozen and never recalculate | Proposed (reaffirm existing correct behavior) | Yes | Pricing Snapshots, Reports | Phase 1, Phase 9 |
| P0-PRC-041 | Adoption of the full Phase 0 Formula Governance Rulebook (§15) as binding for every future calculator | Proposed | Yes | Every category, all future calculators | Phase 3, Phase 4, Phase 5 |

---
## 3. CANONICAL OVERHEAD FORMULA

### Current behavior by category (Confirmed, with one direct source conflict)

Two internal specification documents describe the overhead formula differently, and this discrepancy is itself the strongest piece of evidence for why this decision must be locked in Phase 0 rather than assumed:

- **`pricing_spec.md`'s "Master Formula"** (its stated general engine, lines 21-40) explicitly defines:
  ```
  labor_cost    = (production_hours × production_rate) + (design_hours × design_rate) + (install_hours × install_rate)
  overhead_cost = (material_cost + labor_cost) × (overhead_percent / 100)
  ```
  This formula includes **design and install labor inside the overhead basis**.

- **`PRICING_SPEC.md`'s own rebuild rule (§16.7)** states the opposite conclusion after documenting the real per-category code: *"overhead is calculated on `(material_cost + direct_labor_cost)` only. Setup fees, design fees, and install fees are pass-through charges — never subject to overhead."*

- **The traced per-category calculation flows in `PRICING_SPEC.md`** (Banners §4.2 step 6-7, Cut Vinyl §6.2 step 9-10) show `overhead_cost = calculate_overhead_cost(material + labor, ...)` computed *before* `design_cost` and `install_cost` are added — and both design/install costs are added to `suggested_price` *after* the cost-plus/markup step, not folded into the marked-up cost-plus basis. This is consistent with §16.7's rule (design/install as pass-through), not with the Master Formula's version.

- **Confirmed, explicit in code comments:** In Promotional, the setup fee is added "FLAT (not marked up, not in overhead basis)" (`PRICING_SPEC.md` §11.2 step 4). Cut Vinyl similarly excludes its file-cleanup fee from the pre-overhead cost stack.

- **Confirmed per `PRICING_SPEC.md` §16.7's own direct claim:** Banners and Vehicle Wraps include "the setup fee" in the overhead basis, while Promotional and Cut Vinyl exclude it — **this specific claim is flagged as an Assumption to Verify** against the traced Banners/Cut Vinyl formulas above, which both show design/install/finishing costs added *after* the overhead+markup step in both categories, not before. The exact mechanism behind §16.7's claim (which specific cost bucket differs) needs a direct side-by-side code diff before this document's recommendation is finalized as code — flagged, not guessed.

- **Confirmed:** Apparel's documented formula (`pricing_spec.md` §Apparel) shows no explicit overhead line at all — only `total_cost × 2.15 markup`. Services' documented formula similarly shows no overhead line — `labor + travel + trip + equipment + subcontract + permit`, then rush, with no overhead step. This suggests these two categories may not apply the shared overhead calculation the same way area-based categories do — **Assumption to Verify**, addressed in §3's Services/Apparel/Promotional/Custom question below.

### Why inconsistent overhead creates inaccurate margins

If Category A includes design/install labor (and setup fees) in its overhead basis and Category B does not, then a "15% overhead" charge is not the same dollar amount relative to the same job in both categories — meaning any report that compares `profit_margin_percent` across categories, or any tenant-wide "average margin" figure, is comparing numbers computed with two different definitions of cost. This directly corrupts the Profit & Margin Analytics repair planned in Phase 9 (PRC-021/PRC-022) — that phase cannot produce trustworthy comparative reporting until every category computes overhead identically.

### Possible options

| Option | Basis Includes | Basis Excludes |
|---|---|---|
| (a) Material + production labor only | Material cost, direct production labor | Design, install, subcontract, setup fees, shipping |
| (b) Material + all labor (production + design + install) | Material cost, production + design + install labor | Subcontract, setup fees, shipping |
| (c) Material + labor + setup fees (current Banners/Vehicle Wraps behavior per §16.7's claim) | Material, labor, setup fees | Subcontract, shipping |
| (d) Category-specific basis (status quo) | Varies per category | Varies per category |

### Recommended formula

**Recommended Decision (P0-PRC-001) — Owner Approval Required:**

```
Overhead = (direct material cost + direct production labor cost + direct installation labor cost) × configured overhead percentage
```

This is the default provided for this document and is adopted as the baseline recommendation. It sits between option (a) and (b) above — it includes installation labor (which the user-provided default explicitly names) but leaves design labor as a separate, explicitly flagged sub-decision below, since `PRICING_SPEC.md`'s own §16.7 rule argues install labor should be excluded (aligned with option (a)), creating a direct tension between the given default and the strongest documented evidence. **This tension is not silently resolved — see P0-PRC-003 below.**

**Cost buckets included:** Direct material cost, direct production labor cost. Installation labor cost is included in the recommended default formula above but is a distinct, separately-flagged approval decision (P0-PRC-003) given the conflicting evidence.

**Cost buckets excluded:** Tax, customer discounts, pass-through fees (permits, subcontract pass-through), rush premiums, deposits, and profit markup are never included in the overhead basis, per this document's instruction and consistent with every source document reviewed — no evidence anywhere suggests otherwise.

**Whether design labor is included — P0-PRC-002, Owner Approval Required:** Not decided by default. Two options:
- (a) Exclude design labor from the overhead basis, add it as a pass-through cost after the cost-plus/markup step — matches `PRICING_SPEC.md` §16.7's explicit rebuild rule and the traced Banners/Cut Vinyl formula order.
- (b) Include design labor in the overhead basis — matches `pricing_spec.md`'s Master Formula.
- **Recommended Decision:** (a), exclude — because it is the conclusion the investigation's own most detailed, code-traced document (`PRICING_SPEC.md`) reached after reading the real per-category formulas, whereas the conflicting Master Formula in `pricing_spec.md` appears to be a simplified/idealized restatement not fully cross-checked against the actual category-by-category flows. Owner must approve or override this reasoning.

**Whether installation labor is included — P0-PRC-003, Owner Approval Required:** This is the most directly conflicting item in the entire overhead question:
- The document-provided default formula explicitly includes installation labor.
- `PRICING_SPEC.md` §16.7's own rebuild rule explicitly excludes it ("install fees are pass-through charges — never subject to overhead").
- The traced Banners/Cut Vinyl formulas add `install_cost` *after* the overhead+markup step, consistent with exclusion.
- **Recommended Decision:** Exclude installation labor from the overhead basis, treating it as a pass-through cost added after cost-plus/markup — for internal consistency with the design-labor recommendation above and with the strongest documented evidence (§16.7 + the traced formulas). **This recommendation deliberately diverges from the literal default formula text supplied for this document; the Owner must explicitly approve either the literal default (include install labor) or this evidence-based alternative (exclude it) before Phase 1 locks the `PricingEngine`'s overhead implementation.**

**Whether subcontractor cost is included — P0-PRC-004, Owner Approval Required:** **Confirmed excluded** for Services (§Services formula: subcontract cost is a separate additive bucket, optionally marked up on its own, never folded into the material+labor overhead basis) and Promotional (vendor unit cost is the "material" analog, not a separate subcontract concept). **Recommended Decision:** Exclude subcontractor/outsourced cost from the overhead basis everywhere — it already carries its own optional markup mechanism and should not be double-taxed by overhead too.

**Whether setup fees are included — P0-PRC-005, Owner Approval Required:** **Confirmed excluded** for Promotional and Cut Vinyl (explicit code comment/formula order). **Confirmed claimed as included** for Banners and Vehicle Wraps per `PRICING_SPEC.md` §16.7, though the exact mechanism is an Assumption to Verify per the analysis above. **Recommended Decision:** Exclude setup fees from the overhead basis everywhere, matching §16.7's own stated rebuild rule and the majority of traced category behavior — setup fees become a uniformly pass-through charge across all 9 categories.

**Whether shipping/delivery is included — P0-PRC-006, Owner Approval Required:** Shipping/delivery pricing does not exist as a cost component in any category today (PRC-018 — confirmed absent, only a display-only notes field exists). This decision is therefore prospective: once §12 (P0-PRC-033) decides shipping is a Pricing Foundation cost component, should it sit inside the overhead basis? **Recommended Decision:** No — treat shipping/delivery as a pass-through cost added after cost-plus/markup, consistent with the design/install/setup-fee pattern above, for the same reason: it is a cost that varies job-to-job in a way that doesn't scale with production effort, and folding it into overhead would distort the overhead percentage's meaning.

**How overhead behaves for Services, Apparel, Promotional, and Custom — P0-PRC-007, Owner Approval Required:**
- **Apparel:** Documented formula shows no explicit overhead line (`pricing_spec.md` §Apparel) — only `total_cost × 2.15` markup, where `total_cost` = blank cost + decoration cost + add-ons + labor + design. **Assumption to Verify:** whether the shared `calculate_overhead_cost()` function is silently called somewhere in Apparel's actual `server.py` implementation despite not appearing in this simplified spec. **Recommended Decision, pending verification:** If not currently applied, do not add it retroactively without an explicit product decision — Apparel's markup multiplier (2.15×) may already implicitly account for overhead the way its table-first pricing does for margin generally; adding a second overhead layer on top could double-count.
- **Services:** Documented formula shows no overhead line either (`labor + travel + trip + equipment + subcontract + permit`, then rush). **Recommended Decision:** Do not add overhead as a separate line — Services pricing is fundamentally rate-based (the labor rate itself is assumed to already be overhead-inclusive, consistent with how professional service hourly rates typically work), and permit/subcontract are already explicitly pass-through per §Services confirmed behavior.
- **Promotional:** **Confirmed** to include an overhead step (`PRICING_SPEC.md` §11.2 step 5, excluding the setup fee). **Recommended Decision:** Keep overhead applied here, using the same canonical basis (material + production labor) as the area-based categories, since Promotional's cost-plus structure is materially similar to them.
- **Custom:** No formula exists (pure manual entry) — overhead is not applicable by design. No decision needed; Custom remains the deliberate escape hatch.

**How overhead is stored in snapshots:** Every `PricingSnapshot` (per the Remediation Plan's schema, §4C) stores `overhead_cost` as its own explicit cost bucket, plus an `overhead_basis` explainability object recording the formula, the exact basis amount, and which cost components were included — reusing the existing, already-well-designed `overhead_basis` field confirmed in `PRICING_SPEC.md` §3.8's response shape, updated to reflect whichever basis this decision locks.

**How overhead is displayed in breakdowns:** The shared `<CalculationBreakdown>` component (Remediation Plan PRC-043) shows `overhead_cost` as its own line, with the `overhead_basis` explainability data available on demand (e.g., "15% of $42.00 material + labor = $6.30"), consistent with the already-correct pattern the current system uses.

**Migration impact:** Every existing tenant's live `pricing_configuration` continues to compute overhead exactly as it does today until Phase 3 ports a category onto the new canonical formula. No historical `pricing_snapshot` is retroactively recalculated (see §14/P0-PRC-040) — old snapshots keep whatever overhead basis was live when they were created.

**Tests required:** A golden-formula test per category proving the new canonical overhead basis produces the documented expected cents value for a fixed set of inputs; a cross-category consistency test proving the same $ of material + labor cost produces the same $ of overhead regardless of category, once P0-PRC-001 through P0-PRC-007 are locked.

---

## 4. CURRENCY STORAGE, PRECISION, AND ROUNDING RULES

**Confirmed current state:** Every money field across `models/pricing.py` and every category's calculation output is a raw Python `float` (PRC-003). No rounding rule is documented anywhere for any category — every "Rounding Rules" field in the source investigation's category-by-category breakdown (§5F per category) reads "Not explicitly specified" (Assumption to Verify, confirmed absent by omission, not guessed).

### Official pricing currency rules

**P0-PRC-008 — Store all money as integer cents — Owner Approval Required.** Every stored and computed monetary value (material cost, labor cost, overhead, markup result, final selling price, snapshot values, invoice line items) is an integer representing cents. No raw float currency value survives anywhere in the rebuilt pricing domain. This directly resolves PRC-003.

**Where decimal quantities are allowed:** Non-money quantities — square footage, linear feet, hours, minutes, piece counts, percentages — remain decimal (float or fixed-point decimal) values, since they are physical measurements or rates, not currency. Only the final dollar-and-cents *money* values are cents-integers.

**How percentages are stored:** As a decimal fraction or basis-point integer at the configuration layer (e.g., `overhead_percentage: 15` meaning 15%, applied as `× 0.15`), never as a pre-multiplied dollar amount. **Recommended Decision:** store as a plain percentage number (matching current behavior, e.g. `15` for 15%) for continuity with existing tenant configuration and the Quiz's existing question format — no migration of the percentage fields themselves is required, only of how they're *applied* to cents-based money.

**How markup multipliers are stored:** As a decimal multiplier (e.g., `2.35` for a 2.35× markup), consistent with current behavior — multipliers are not currency and do not need cents-integer storage, only careful multiplication order (multiply the integer-cents cost by the float multiplier, then round once — see rounding order below).

**When rounding occurs / whether intermediate steps round or only final totals round:**

**Recommended Decision (P0-PRC-009):**
```
Store money in integer cents.
Keep calculation precision internally until each cost bucket is finalized.
Round each customer-visible cost bucket to cents.
Round the final selling price to the nearest whole dollar only when a category or tenant setting explicitly enables whole-dollar pricing.
Default rounding method: half-up.
Never repeatedly round intermediate values in a way that compounds errors.
```

Concretely: a formula like `waste_area × material_cost_per_sqft` is computed at full available precision (e.g., using integer-cents-per-unit inputs multiplied by a precise decimal area, or a fixed-point Decimal type internally) and only rounded to the nearest cent once, at the moment that value becomes a **named cost bucket** in the `PricingResult` (`material_cost`, `labor_cost`, `overhead_cost`, etc.) — not at every micro-step inside the formula (e.g., not rounding the waste-adjusted area itself, not rounding an intermediate per-sqft rate before it's multiplied by area). This is the specific practice the recommended rule prohibits ("never repeatedly round intermediate values in a way that compounds errors").

**Rounding method — half-up:** Standard "round half away from zero" (e.g., $1.005 → $1.01), the simplest and most predictable method for both staff and customers, and consistent with typical accounting/POS software conventions. **Owner Approval Required** — an alternative (banker's rounding / round-half-to-even) exists but has no evidence of being expected anywhere in the source documentation; half-up is the default absent a stated preference.

**Rules for fractional cents created by percentage calculations:** A percentage calculation (overhead %, markup, discount %) applied to an integer-cents value will frequently produce a fractional cent (e.g., `847 cents × 1.15 = 974.05 cents`). This fractional result is carried at full precision through the remaining formula steps and only rounded to the nearest integer cent when it becomes a finalized, displayed cost bucket or the final selling price — never rounded mid-formula.

**Rules for quantity discounts:** The quantity-discount percentage is applied to the pre-discount `sell_base` (per confirmed current behavior, `PRICING_SPEC.md` §3.7 — "applied to sell_base before adding design/install/setup fees"); the discounted result rounds to the nearest cent once, as its own named value, before design/install/setup fees (which are separate cost buckets) are added on top.

**Rules for rush fees:** The rush percentage is applied to the pre-rush total (after quantity discount, before tax), and the rush-inclusive total rounds to the nearest cent once. Rush is never applied to an already-rounded-and-then-re-derived intermediate value.

**Rules for tax calculations:** Tax is computed on the final, fully-resolved selling price (after every pricing-domain step above) and is explicitly outside the pricing-domain's own rounding scope — tax rounding follows whatever standard the Invoice/Order domain already uses (confirmed elsewhere as `tenant.default_tax_rate` applied at invoice time, not recalculated by the pricing engine itself). This document does not redefine tax rounding, only confirms the pricing engine hands tax a single, already-rounded pre-tax total.

**Rules for displayed prices versus stored values:** The stored value is always the integer-cents ground truth. Display formatting (e.g., `"$847.00"`) is a pure presentation-layer conversion done at render time and never written back to the database — this prevents a rounding artifact introduced for display from ever contaminating the stored snapshot.

**Rules for imported historical prices (Historical Invoice Import, PRC-036):** Prices extracted from an uploaded invoice (PDF/CSV/XLSX) are parsed into integer cents at ingestion time, using half-up rounding if the source document contains sub-cent or ambiguous values (e.g., an OCR-extracted price with unclear decimal placement is flagged as a warning, per the existing "confidence" labeling system already correctly used by this feature — not silently rounded and accepted).

**Rules for manual overrides:** A manually-entered override price is parsed directly into integer cents (e.g., a staff member types "$847.50" → stored as `84750` cents) with no additional rounding applied — the human-entered value is authoritative and exact, never re-derived or adjusted by the rounding rules above (those rules govern *calculated* values, not direct entry).

### Worked examples

**Banners:** A 3×6 ft banner (18 sqft, waste-adjusted to 19.44 sqft at 8% waste) with a material cost of $1.10/sqft → `1944 × 110 = 213,840` cent-sqft-units → `213840 / 100 = 2138.4` cents = round-half-up → **$21.38** material cost bucket. This rounds once, here, as the finalized `material_cost` bucket — not at the waste-adjustment step, not at the per-sqft lookup step.

**Apparel:** A 24-piece HTV order at 1 color: `24 × $0.50 × 100 = 1200` cents decoration cost + `$10.00` setup fee (1000 cents) = `2200` cents decoration bucket — already a whole-cent value, no rounding needed, illustrating that most apparel per-piece math naturally lands on clean cents, but the rule still applies identically if a future decoration formula introduces a fractional rate.

**Vehicle Wraps:** A Sprinter Van full wrap at 350 base sqft × 100% coverage × 1.15 waste = 402.5 sqft, material cost $3.50/sqft (premium cast per `pricing_spec.md`'s wrap material table adjusted for this example) → `402.5 × 350 cents = 140,875` cents = **$1,408.75** material cost bucket, rounded once here; this then feeds into the larger cost-plus vs. package-benchmark comparison (§10) without any further intermediate rounding before the final `max()` comparison is resolved and *that* result rounds once more as the finalized `selling_price`.

---

## 5. MINIMUM MARGIN, BELOW-COST, AND MANUAL OVERRIDE GUARDRAILS

**Confirmed current state:** No margin-specific or below-cost-specific warning exists anywhere — only a generic `warnings: [string]` array used for missing-material/fallback notices (PRC-015). The system does not appear to block a manual override from going below cost today, but this has never been made an explicit, documented rule (PRC-016).

**Difference between below cost and below target margin:**
- **Below cost** means the selling price is less than `total_cost` (material + labor + overhead) — the shop would lose money on this specific job.
- **Below target margin** means the selling price is above cost but the resulting `profit_margin_percent` is lower than the tenant's configured `target_profit_margin_percent` (default 40% per confirmed Foundation defaults) — the shop still profits, just less than its own stated goal.

These are meaningfully different severities and must produce different warning behavior, not be collapsed into one generic flag.

### Warning severity levels

| Severity | Condition | Meaning |
|---|---|---|
| `info` | Fallback/default used (e.g., minute-based config missing, hours-fallback fired) | Informational, no financial risk |
| `warning` | Below target margin, above cost | Shop profits less than its own goal on this job |
| `critical` | Below cost | Shop loses money on this job unless explicitly approved |

### Recommended launch rules

**P0-PRC-013 — Below target margin: warning only — Owner Approval Required.** No block, no approval step. A `margin_warning` (severity `warning`) is attached to the `PricingResult`/`PricingSnapshot` and visible per §P0-PRC-017/020's visibility rules.

**P0-PRC-014 — Below cost: warning plus required override reason — Owner Approval Required.** A `below_cost` warning (severity `critical`) is attached, and the system requires a selected reason before the price can be finalized (see taxonomy below).

**P0-PRC-015 — Staff below-cost override requires Owner/Admin approval — Owner Approval Required.** Staff may *request* a below-cost price with a reason, but cannot finalize/commit it to a Quote/Order Item/Snapshot without an Owner or Admin explicitly approving it (see the full workflow in §6). Owner/Admin themselves may finalize a below-cost override directly, without a second approver, consistent with their elevated trust level elsewhere in the RBAC system.

**Whether staff can enter below-cost overrides — Confirmed answer under this rule: yes, staff can *enter* one, but cannot *finalize* it alone.** This distinguishes "typing a number" from "committing a price," matching the approval-workflow pattern already correctly used elsewhere in the platform (e.g., Purchasing's Admin-creates/Owner-approves segregation of duties, cited as the platform's own reference-quality pattern in the Remediation Plan's Bucket 4 analysis).

### Required override reason options

**P0-PRC-016 — Required override-reason taxonomy — Owner Approval Required.** Recommended starting taxonomy (extensible, not exhaustive):
- `loss_leader` — deliberate strategic underpricing to win/retain a customer relationship
- `relationship_pricing` — long-term customer, one-time accommodation
- `competitive_match` — matching a known competitor quote
- `damaged_goods_or_rework` — correcting a shop error, no full charge appropriate
- `material_already_owned` — customer supplied materials, cost basis doesn't apply normally
- `owner_discretion` — no specific reason, Owner/Admin judgment call
- `other` (custom, free-text) — **Recommended Decision:** Custom reasons are allowed via an `other` option with a required free-text explanation, so the taxonomy doesn't force an artificial fit and the audit trail still captures real context.

**Whether a loss-leader or relationship-price reason should be allowed:** Yes — explicitly included above (`loss_leader`, `relationship_pricing`) per this document's own guidance that below-cost blocking should not prevent "a legitimate loss-leader/relationship-pricing decision a shop owner might intentionally make" (consistent with the Remediation Plan's Phase 0 Decision #3 rationale).

### Warning visibility and provenance

**P0-PRC-017 — Warning visibility across surfaces — Owner Approval Required.**

| Surface | Sees the warning? | Detail shown |
|---|---|---|
| Calculator UI (Staff/Owner/Admin) | Yes | Full warning, severity, code, explanation, recommended action |
| Work Order Summary | Yes (internal) | Presence of an override flag only, not full cost/margin detail — production staff need to know "this was manually adjusted," not necessarily why |
| Quote (internal view) | Yes | Full detail, same as calculator |
| Quote (customer-facing) | **No** | Customers never see margin warnings, cost data, or override reasons |
| Invoice (customer-facing) | **No** | Same as Quote |
| Invoice (internal view) | Yes | Full detail |
| Reports (Profit & Margin Analytics) | Yes | Aggregated and per-item, including override frequency and reason breakdown |
| Customer Portal | **No** | Consistent with the platform's existing correct pattern of never exposing internal cost/margin to customers |

**Whether a warning becomes part of the Pricing Snapshot — Confirmed Recommended Decision: Yes.** Every warning present at commit time is stored inside `PricingSnapshot.warnings[]` (typed `PricingWarning` objects per the Remediation Plan's schema), so the warning history travels with the frozen price forever, even if the live Foundation config later changes.

**How warnings behave when customer discounts, wholesale pricing, or Webstore retail overrides are involved (P0-PRC-018, Owner Approval Required):** A customer discount, wholesale tier, or Webstore public-price override that pushes an otherwise-adequate price below cost or below target margin triggers the **exact same warning/approval rules** as a direct manual override — there is no separate, weaker guardrail path for discount-driven below-cost pricing. Concretely: if applying a customer's 15% discount would bring a job below cost, the system raises the same `below_cost` critical warning and requires the same reason + approval workflow before the discounted price can be committed. This closes what would otherwise be an obvious loophole (staff/customers "discounting around" the override guardrail instead of overriding directly).

---

## 6. MANUAL OVERRIDE PERMISSIONS AND APPROVAL WORKFLOW

**Confirmed current state:** No `Permission.PRICING_*` enum entries exist anywhere in `models/auth.py`. Foundation editing uses a hardcoded role-string check (`owner/admin/platform_admin`). Calculator *usage* and manual override entry have no confirmed permission gate at all (PRC-013, PRC-014).

### P0-PRC-019 — New pricing permissions and default role mapping — Owner Approval Required

| Permission | Purpose |
|---|---|
| `PRICING_VIEW` | View calculator results, view own quotes/orders' prices |
| `PRICING_EDIT_FOUNDATION` | Edit Pricing Foundation settings, materials, labor rates, markup, category config, templates |
| `PRICING_OVERRIDE` | Enter and finalize a manual price override without requiring a second approver |

**Recommended default role behavior:**

| Role | `PRICING_VIEW` | `PRICING_EDIT_FOUNDATION` | `PRICING_OVERRIDE` | Cost/Margin Visibility |
|---|---|---|---|---|
| Owner | Yes | Yes | Yes (self-approving) | Full |
| Admin | Yes | Yes | Yes (self-approving) | Full |
| Staff | Yes | No | No — may *request* an override (goes to approval queue), cannot finalize below-cost alone | Configurable (Owner/Admin decides per §P0-PRC-020) — recommended default: hidden |
| Employee | Yes (own assigned jobs only) | No | No | Hidden |
| Webstore Manager | Yes (Webstore-scoped) | No | Limited — may set the Webstore public-price override field (§9) but not the internal Foundation calculation | Hidden |
| Webstore Owner | Yes (own store) | No (Foundation is tenant-level, not store-level) | Limited — same as Webstore Manager | Hidden, except their own store's aggregate revenue (not per-item cost/margin) |
| Platform Admin | Yes (support/ops access) | Yes (support/ops override capability) | Yes | Full (support context only) |
| Customer | No | No | No | None |

**Who can view internal cost breakdowns / margin (P0-PRC-020, Owner Approval Required):** Recommended default — Owner and Admin only, at launch. Staff visibility into raw cost/margin is left as an explicit tenant-level toggle (some shop owners may trust senior Staff with this; others won't) rather than a hardcoded platform-wide rule, since the investigation found this exact ambiguity already unresolved in the live product ("not confirmed as a hard permission gate," §5E/§6 of the rebuild investigation) and no evidence points to one universal answer being correct for every shop.

**Who can edit materials / labor rates / markup / create templates:** `PRICING_EDIT_FOUNDATION` holders only (Owner, Admin, Platform Admin) — no distinction between these four sub-capabilities at launch; a more granular split (e.g., "can edit materials but not labor rates") is not justified by any documented need and would add complexity without a confirmed use case.

**Who can apply a manual selling-price override:** Any `PRICING_OVERRIDE`-or-higher role may apply an override that stays at or above cost. Staff without `PRICING_OVERRIDE` may still *request* one (see workflow below) but cannot finalize it themselves even above cost, unless the tenant's role configuration grants Staff `PRICING_OVERRIDE` directly (a per-tenant configuration choice, not a hardcoded platform rule) — **Owner Approval Required** on whether Staff gets `PRICING_OVERRIDE` by default or must request it every time; recommended default is **request-only for Staff** at launch, revisited if shops report this is too restrictive for routine, above-cost, minor price adjustments.

**Who can approve a below-cost override:** Owner or Admin only, platform-wide, non-configurable — this is the one guardrail the investigation's findings suggest should not be loosened per-tenant, since it's the platform's core financial-risk control (PRC-014, PRC-016).

**Who can edit Webstore public pricing:** Webstore Owner/Manager may set the public-facing override field (§9); they cannot edit the underlying Foundation-calculated price or cost data, which remains `PRICING_EDIT_FOUNDATION`-gated.

**Who can view owner share/platform fee information:** Owner and Platform Admin only — Webstore Manager/Owner roles see their own store's gross figures but not the platform's fee-split internals, consistent with how this is already handled elsewhere per the Business Finance investigation's Webstore Analytics findings.

**Who can view historical pricing changes (`PricingChangeLog`):** Owner and Admin — Staff does not see the change log by default, though this could be revisited if a shop wants transparency; Platform Admin sees it in a support-ops context only.

### P0-PRC-021 — Formal below-cost override approval workflow

1. Staff enters a requested price and selects a reason from the required-reason taxonomy (§5), or `other` with free text.
2. The `PricingEngine` calculates the margin impact of the requested price against the calculated cost.
3. If the requested price is below target margin but at or above cost: a `margin_warning` is logged and attached to the in-progress calculation; **no approval is required**; Staff may proceed.
4. If the requested price is below cost: a `below_cost` critical warning is raised, and the line item is placed into a **pending-approval** state — it cannot be committed to a Quote/Order Item/Snapshot yet.
5. Owner or Admin reviews the pending override (requested price, calculated cost, margin impact, reason) and either **approves** or **rejects** it.
6. If approved, the final result is committed to the `PricingSnapshot` with full override provenance: `by_user_id` (the requesting Staff member), `approved_by_user_id` (the approving Owner/Admin), `original_calculated_price`, `final_price`, `override_reason`, `requested_at`, `approved_at`.
7. If rejected, the line item reverts to the system-calculated price (or Staff may revise the requested price and resubmit).
8. Both the `PricingChangeLog` (config-level changes only — not applicable here directly) and the relevant **Activity Log** (order/quote-level activity) receive an event: `"pricing_override_requested"`, `"pricing_override_approved"`, or `"pricing_override_rejected"`, each carrying the same user/timestamp/reason detail as the snapshot's own provenance block, so the event is discoverable both from the Snapshot itself and from the Order/Quote's general activity history.

This workflow applies uniformly across every category — no category-specific variation is recommended, since the underlying risk (pricing below cost) is identical regardless of which calculator produced the number.

---

## 7. CUSTOMER-SPECIFIC PRICING MVP SCOPE

**Confirmed current state:** Full grep of `models/customer.py` and pricing routes found zero fields for per-customer discounts, price lists, wholesale tiers, or volume agreements (PRC-009, PRC-010, PRC-011). `Customer.is_tax_exempt` exists but only affects the tax calculation at invoice time, never the underlying selling price (PRC-027, confirmed correct and unaffected by this section).

### Recommended MVP (P0-PRC-024, Owner Approval Required)

- **One optional customer discount percent**, set on the customer record.
- Applies to eligible sell-price components **after quantity discounts but before rush fees and tax** — i.e., positioned at: `quantity-discounted subtotal → apply customer discount % → rush fee → tax`.
- **Does not apply to** pass-through fees, permits, taxes, or deposits — these remain untouched by any customer discount, consistent with how they're already treated as non-marked-up, non-discountable pass-through amounts elsewhere in the formulas (§Services' permit fee, §Promotional's setup fee).
- **Applies to** material, labor, installation, and services sell-price components — i.e., the actual calculated/marked-up selling price, not the cost inputs themselves.
- **Cannot silently push a price below cost** — if a customer's discount would bring the final price below the calculated cost, the same below-cost warning + approval workflow from §5/§6 (P0-PRC-014/015/P0-PRC-021) applies before the discounted price can be committed (P0-PRC-025, Owner Approval Required).
- **Does not include** wholesale price lists, contracts, or volume agreements at this stage — those are explicitly Phase 7 future-expansion items, not MVP scope.

**Whether discounts apply before or after quantity discounts:** After — the customer discount is applied to the already-quantity-discounted subtotal, not stacked in the other order. **Recommended Decision**, Owner Approval Required, since no existing behavior determines this (the feature doesn't exist today) and either order is mathematically defensible; "after quantity discount" was chosen because quantity discounts are a property of the *order size*, while the customer discount is a property of the *relationship*, and it's more intuitive for a customer discount to be the "last" percentage-based adjustment before rush/tax.

**Whether discounts apply before or after rush fees:** Before — rush fees represent an actual elevated cost/urgency to the shop and should not be discounted away by a customer relationship discount; the discount is baked into the "normal" price, and rush is then added on top of that already-discounted amount.

**Whether discounts apply to labor, material, installation, services, and pass-through fees:** Applies to labor, material, installation, and services sell-price components (i.e., anything that is part of the calculated selling price); does **not** apply to pass-through fees (permits, subcontract pass-through), taxes, or deposits, per the MVP scope above.

**Whether discounts can stack (with quantity discount, rush, etc.):** Yes, by design — a customer discount stacks with quantity discounts (applied first) and interacts with rush fees (applied after the customer discount) per the precedence order above. There is no "customer discount OR quantity discount, whichever is better" logic; both apply in sequence.

**Whether a customer discount can reduce a price below cost:** Not silently — see P0-PRC-025 above; the standard override guardrail applies.

**How customer-specific pricing appears in snapshots:** The `PricingSnapshot` records the discount percent applied, the pre-discount and post-discount subtotal, and (if relevant) any resulting override-approval provenance, so a report can always answer "how much of this price was the customer discount."

**How it appears in reports:** Profit & Margin Analytics (Phase 9) gains a discount-attribution breakdown — total revenue impact of customer discounts, by customer, by category, over time.

**Whether staff can edit it:** Setting a customer's discount percent on their record requires `PRICING_EDIT_FOUNDATION` or a dedicated customer-management permission (not itself part of `PRICING_OVERRIDE`, since it's a standing customer attribute, not a per-transaction override) — Staff cannot set a customer's standing discount without this permission, though any Staff member pricing a job for a discount-eligible customer automatically benefits from it being applied.

**Required audit entries:** Setting/changing a customer's discount percent writes a `PricingChangeLog` entry (who/when/old value/new value), consistent with every other Foundation-adjacent configuration change (§14).

### Explicitly deferred to Phase 7 future expansion (not MVP)

- **P0-PRC-026 — Customer-specific minimum-margin exceptions** — deferred. No evidence this is needed for MVP; a shop wanting to intentionally run thinner margins for one customer can currently use the standard below-cost override workflow (§5/§6) on a per-job basis without a standing "this customer's minimum margin is different" rule.
- Wholesale tiers, reseller pricing, customer price lists, contract pricing, volume agreements, employee discounts, promo-code logic — all explicitly out of scope for the first build, per PRC-010/PRC-011/PRC-055.

**P0-PRC-027 — Customer tax-exempt separation reaffirmed:** `Customer.is_tax_exempt` continues to affect only the tax calculation at invoice time and has zero interaction with the selling-price calculation performed by the pricing engine — this existing behavior is confirmed correct and is not changed by the customer-discount MVP above; the two mechanisms (discount and tax-exemption) are independent and both apply, in their respective domains, without interfering with each other.

---

## 8. CANONICAL PRICING PRECEDENCE HIERARCHY

**P0-PRC-028 — Owner Approval Required.** This hierarchy locks the existing 13-step chain already documented in the source investigation (`PRICING_SYSTEM_CALCULATORS_ONBOARDING_QUIZ_REBUILD_DOC.md` §5H), extended with the two layers that don't exist today (Customer-Specific Pricing, Webstore-Specific Override) given an explicit, permanent slot instead of floating outside the chain as disconnected systems.

| # | Layer | Can Override | Cannot Override | Cost, Price, or Both | Live Config or Frozen Snapshot | Can Trigger Warnings | Visible to Customers |
|---|---|---|---|---|---|---|---|
| 1 | System default | Nothing (lowest layer) | — | Both | Live config | No | No |
| 2 | Tenant Pricing Foundation default | System default | — | Both | Live config | No | No |
| 3 | Category configuration | Tenant default, for that category | System default's general shape | Both | Live config | No | No |
| 4 | Material/product configuration | Category's generic material assumption | — | Cost primarily (feeds price) | Live config | Yes — staleness (PRC-020) | No |
| 5 | Pricing template | Pre-fills calculator inputs | Nothing directly — a template only pre-fills fields the user can still edit | Both (pre-fill only) | Live config | No | No |
| 6 | Vehicle benchmark / apparel pricing table | The formula-derived price, when the table/benchmark is higher | Cannot be overridden by a *lower* formula result — it's a floor, not a ceiling | Price only | Live config (reference data) | No | No |
| 7 | Customer-specific pricing (discount %) | The post-quantity-discount subtotal | Pass-through fees, tax, deposits (never touches these) | Price only | Live config, applied at calc time | Yes — if it would push below cost (§5/§7) | No (internal only) |
| 8 | Webstore-specific public retail override | The customer-facing display price only | The internal Foundation calculation, cost, margin, and snapshot — **never erased** (§9) | Price only (display) | Live config, applied at calc/display time | Yes — if override is below cost (§9) | **Yes** — this is the one layer customers do see |
| 9 | Quote/Order Item inputs (dimensions, options, quantity) | Category/material defaults for this specific job | — | Both | Becomes part of the frozen snapshot at commit | Yes (missing-material, fallback) | Indirectly (drives the visible price) |
| 10 | Manual override | The entire computed result of layers 1-9 | Nothing above it except an approval-required block | Price only | Frozen at commit, with provenance | Yes — below-cost/margin | No (reason/provenance is internal-only) |
| 11 | Approval-required override gate | Whether a below-cost manual override (layer 10) can finalize | — | Neither directly — it's a gate, not a value | N/A (workflow state) | Yes | No |
| 12 | Quantity discount | The pre-discount sell_base | — | Price only | Applied at calc time, frozen in snapshot | No | Yes (as a visible line item) |
| 13 | Rush fee | The post-discount, post-customer-discount total | — | Price only | Applied at calc time, frozen in snapshot | No | Yes (as a visible line item) |
| 14 | Tax | The final pre-tax total | — | Price only (customer-facing total) | Computed at invoice time, not by the pricing engine itself | No | Yes |
| 15 | Deposit | Nothing pricing-related — it's a payment-schedule concept, not a price adjustment | — | Neither (payment terms only) | Invoice/Order domain, not pricing domain | No | Yes |

**Resolving the Webstore/internal-calculation conflict (P0-PRC-028, restated as a binding rule):** A Webstore public retail override (layer 8) changes only what a customer sees on the storefront. It must never erase, replace, or hide the internal Foundation-calculated price, cost, margin, owner share, platform fee, or the underlying `PricingSnapshot` — both values (the internal calculation and the public override) are stored side-by-side, and every report/reconciliation reads the internal calculation for true profitability while the storefront reads the override for display. This directly resolves the conflict named in the task brief and is elaborated fully in §9.

---

## 9. WEBSTORE PUBLIC PRICE OVERRIDE RULES

**Confirmed current state:** `WebstoreProduct.retail_price` is a manually-typed number with zero connection to Materials, Labor, or Markup config (PRC-002). No category mapping exists. No cost/margin data is computed for Webstore products at all today.

### Recommended principle (P0-PRC-029, Owner Approval Required)

**The Webstore may override the customer-facing retail price, but must still preserve the internal Pricing Foundation calculation and frozen snapshot for margin reporting and production.**

**Product category mapping:** Every Webstore product must be mapped to a Pricing Foundation category (Banners, Apparel, etc.) at creation time. This mapping is what allows the product to have a real, calculated internal cost — without it, the product cannot participate in profitability reporting at all.

**Base calculated internal price:** Computed by the shared `PricingEngine` from the product's category mapping + configured attributes (dimensions, material, quantity assumptions, etc.), exactly as any other Order Item would be priced.

**Public visible selling price:** Defaults to the base calculated internal price. May be overridden per §"Store-specific retail override" below.

**Store-specific retail override vs. product-specific override:** Two override levels are supported —
- **Store-specific:** a blanket adjustment (e.g., "all products in this fundraiser store are marked up an additional 20% to fund the fundraiser") applied at the storefront level.
- **Product-specific:** an individual product's own override price, taking precedence over the store-level adjustment if both are set.
Both are purely display/selling-price adjustments; neither touches the internal calculated cost or snapshot.

**Owner share / platform fee:** Computed from the **internal calculated price** (or the actual transaction amount charged to the customer, per whichever existing revenue-share model is already documented in the Webstores/Business Finance domain) — not from a number that could be manipulated independently of real cost data. This preserves accurate owner-share/platform-fee accounting even when a public override is in effect.

**Discount/promo behavior:** Any future promo-code or storefront-wide discount (Phase 7 future scope, PRC-055) applies to the public-facing override price, following the same "never touches the internal calculation" principle.

**Fundraiser and event-store behavior:** Fundraiser/event stores commonly need an artificially elevated public price (to fund a cause) — this is exactly the store-specific override use case above; the internal calculated cost/margin remains accurate underneath, so the shop can still see its true production cost separately from the fundraiser markup.

**Whether Webstore products can remain manually priced:** Yes, for products that genuinely don't fit any Pricing Foundation category (e.g., a true one-off consignment item) — these map to the **Custom** category (the platform's existing, deliberate manual-entry escape hatch), not to a second parallel pricing system. This satisfies "Webstore products that must remain manually priced" without reintroducing a disconnected pricing mechanism (PRC-002's core violation).

**Which products should be calculator-backed versus manually priced (P0-PRC-030, Owner Approval Required):** **Recommended Decision:** Any product that corresponds to a real production category (signs, banners, apparel, vehicle graphics, etc.) should be calculator-backed by default; only genuinely uncategorizable items (drop-shipped third-party goods, consignment items, gift cards) should use the Custom-category manual path. This is a per-product decision made by the Webstore Owner/Manager at product-creation time, not a platform-wide restriction.

**Snapshot rules when an order is placed:** A Webstore checkout creates a `PricingSnapshot` for each order line exactly like any other Order Item — capturing the internal calculated price, any override applied, and full cost/margin data — even though the customer only ever saw the public override price.

**Reporting rules:** Webstore order profitability reports read the internal calculated cost/margin from the snapshot, never the public override price, for true profitability numbers; the override price is shown separately as "what the customer paid" for revenue reconciliation.

**Cost/margin visibility rules:** Customers never see cost/margin (consistent with §5/§6's visibility rules). Webstore Manager/Owner see their store's revenue and (if permitted, §6) their own margin; full platform-fee/owner-share internals remain Owner/Platform-Admin-only per P0-PRC-023.

**Webstore Owner vs. Webstore Manager permissions:** Both may set the public-facing override price (store- or product-level); neither may edit the underlying Pricing Foundation category configuration, materials, or labor rates — that remains `PRICING_EDIT_FOUNDATION`-gated at the tenant level (§6).

---

## 10. VEHICLE WRAP CANONICAL FORMULA DECISION

This section resolves the confirmed duplicate-engine issue between the Pricing Foundation's Vehicle Graphics/Wraps category and Wrap Lab / Wrap Command Center (PRC-001, PRC-032).

### Current Foundation formula summary (Confirmed, per `pricing_spec.md` §Category 5 and `PRICING_SPEC.md` §5)

```
base_sqft      = vehicle_type_base_sqft table (Sedan 150 → Semi 800)
coverage_pct   = spot 15% / partial 40% / half 55% / full 100% / custom user-input
wrap_sqft      = base_sqft × coverage_pct  [or manual override]
waste_pct      = 10-15% depending on coverage
material_cost  = waste_sqft × wrap_material_cost_per_sqft
laminate_cost  = waste_sqft × laminate_cost_per_sqft  [if required]
window_perf    = flat sqft allowance × sell rate [if included]
design_hours   = coverage-based table (0.75-3.0 hr) × complexity multiplier
install_hours  = vehicle+coverage lookup table (e.g., Cargo Van full = 18hr) × difficulty × seam multipliers
install_cost   = max(install_hours × $75/hr, $125) + second-installer add-on
production_hours = wrap_sqft × 0.12hr/sqft (min 1.0hr)
overhead       = 15% (basis per §3's pending decision)
markup         = 2.4×
cost_plus_price = total_cost × 2.4
package_price   = benchmark_table[vehicle][coverage]  (Sedan spot $150 → Semi full $6,000)
selling_price   = max(cost_plus_price, package_price, $150.00) + window_perf_sell + rush(+30%)
```

### Current Wrap Lab / Wrap Command Center formula summary (Confirmed structurally distinct, not line-by-line diffed)

`routes/wrap/core.py::_compute_pricing_snapshot` uses its own `WrapPricingConfig` model with its own materials array and its own 3-value `pricing_method` enum (`per_sqft | material_labor_markup | manual`) — confirmed independent of the Foundation's method system, confirmed to exist and be actively used by the customer-facing wrap quote-approval flow (the only category with a working customer-portal approve/decline mechanism, per the New Order Workflow investigation).

### Known differences

- Different, narrower pricing-method enum (3 values vs. the Foundation's multi-arm compare-methods system).
- A separate materials array, meaning the same physical wrap material could have two different cost/sell-rate entries depending on which system priced it.
- No confirmed package-benchmark floor comparison in the Wrap Lab implementation (not verified either way).

### Known unknowns requiring side-by-side code comparison (Confirmed gap, not guessed)

- Exact vehicle-type/base-sqft table used by Wrap Lab — same table, a different one, or user-entered dimensions only.
- Exact install-hour calculation — same lookup table or a different formula.
- Whether Wrap Lab applies overhead/markup at all, and if so, what percentage/multiplier.
- Whether Wrap Lab's `per_sqft` method has any relationship to the Foundation's sell-rate-per-sqft comparison arm.
- The magnitude of price disagreement between the two systems for the same real job — **not yet quantified** (this is PRC-032, and per the Remediation Plan, must happen before this decision is finalized).

### Options

| Option | Description |
|---|---|
| (a) Foundation formula as canonical | Wrap Lab adopts the Foundation's existing compare-methods engine wholesale |
| (b) Wrap Lab formula as canonical | Foundation's Vehicle Graphics category adopts Wrap Lab's formula instead |
| (c) Merged canonical formula | A new formula combining the Foundation's more sophisticated compare-methods/benchmark structure with any genuinely valuable Wrap Lab-specific inputs not present in the Foundation |

### Recommended decision

**P0-PRC-031 — Owner Approval Required, direction only; final formula selection deferred pending code diff.** Recommend **(c), a merged canonical formula**, favoring the Foundation's structure (compare-methods + package-benchmark floor + vehicle/install-hour lookup tables — all more sophisticated and better-evidenced than anything confirmed about Wrap Lab's implementation) while explicitly preserving any Wrap Lab-specific input fields that capture real wrap-industry nuance not currently in the Foundation (e.g., if Wrap Lab captures a distinct "vinyl overlap/seam count" input the Foundation lacks, that input should be added to the merged formula rather than discarded). **This decision cannot be fully finalized until the required side-by-side code comparison below is completed** — approving "merge, favoring Foundation's structure" as a *direction* now does not remove the need for that verification task before Phase 4 implementation begins.

### Required formula components (for the merged canonical formula)

- Vehicle base-sqft table (Foundation's, unless Wrap Lab's is shown to be more current/accurate)
- Coverage-percentage table (spot/partial/half/full/custom)
- Waste-percentage-by-coverage table
- Material + laminate cost-per-sqft, drawn from **one** shared materials source (not two arrays)
- Window-perf sqft allowances and sell rates
- Design-hours-by-coverage table × complexity multiplier
- Install-hours-by-vehicle-by-coverage lookup table × difficulty × seam multipliers
- Second-installer add-on rule
- Package-benchmark floor table (vehicle × coverage → minimum acceptable price)
- Overhead/markup, per §3's locked decision
- Rush premium (+30%, category-specific override of the global rush default)

### Required vehicle tables, coverage rules, waste rules, material/laminate rules, install-time lookup, second-installer behavior, package benchmark floor behavior, design/prep/removal behavior

All of the above are already fully specified in the Foundation's documented formula (this section's "Current Foundation formula summary") and should be adopted into the merged formula as the default source of truth, **unless** the side-by-side code comparison reveals Wrap Lab uses materially different, more currently-accurate numbers for any of them (e.g., if Wrap Lab's install-hour table has been tuned more recently based on real completed jobs) — in which case the more evidence-backed table wins, not automatically the Foundation's.

### Required snapshot behavior

Identical `PricingSnapshot` structure and commit behavior as every other category, with no Wrap-Lab-specific snapshot shape surviving the merge — this is the direct fix for PRC-001's core violation.

### Required parity test plan

Per PRC-039 (already scoped in the Remediation Plan): run identical vehicle+coverage+material inputs through both the pre-merge Foundation formula and the pre-merge Wrap Lab formula, document the delta for at least 5 representative scenarios (spot/partial/half/full/custom coverage, at least 2 different vehicle sizes), and use that documented delta to validate the merged formula produces defensible results before cutover. The merged formula's output must then be re-tested against both legacy systems' outputs to confirm it sits within a reasonable, explainable range of each (not necessarily identical to either, since it may correct real defects in both).

### Retirement plan for the duplicate Wrap Lab pricing engine

`_compute_pricing_snapshot` and `WrapPricingConfig` are deleted (not merely deprecated-in-place) once the merged formula is live and the customer-facing wrap quote-approval flow is confirmed working end-to-end against the new shared engine, per the shadow-mode/feature-flag rollout plan already specified in the Remediation Plan's Phase 4 detail (rollback/protection plan).

---

## 11. BANNER SETUP WIZARD VS. PRICING SETUP QUIZ DECISION

**Confirmed current state:** `BannerSetupWizard.js` (7 steps) writes directly to `category_defaults.banners`. The 11-section Pricing Setup Quiz's Section 2 (Banners) also writes to `category_defaults.banners`. Whether these two flows write to the *same* field subset or have drifted apart was **not verified line-by-line** in either investigation session (confirmed open question, not guessed). `ShopRateQuiz.js` presents a similar, separate unconfirmed-overlap question focused on labor/shop rates specifically.

### Are these separate necessary experiences, overlapping experiences, or duplicate screens?

**Assumption to Verify.** The evidence available (both write to `category_defaults.banners`; both are described as "guided setup" for the same category) strongly suggests overlapping-to-duplicate, but this cannot be stated as Confirmed without a direct field-by-field code diff of `BannerSetupWizard.js` against the Quiz's Section 2 fields.

### What still needs verification

A side-by-side diff of every field `BannerSetupWizard.js` writes versus every field the Quiz's Banner section (§4B of the rebuild investigation) writes, to determine: (a) identical field sets — clear duplication, retire one; (b) overlapping-but-not-identical field sets — one is a subset, consider merging the extra fields into the unified Quiz before retiring the wizard; (c) genuinely different field sets serving different purposes — keep both, but rename/reposition them so users understand they're not redundant. The same diff exercise applies to `ShopRateQuiz.js` against the main Quiz's Section 1 (Shop Basics) and Section 11 (Labor & Design Time).

### Recommended consolidation approach

**P0-PRC-032 — Owner Approval Required.** Default recommendation: **use one unified Pricing Setup Quiz with optional category-specific guided sections, rather than two competing configuration flows that may write to the same Banner settings.** Concretely: if the verification above confirms overlap/duplication (the likely outcome given the evidence), `BannerSetupWizard.js`'s distinct value — a more focused, category-specific guided flow — should be preserved as an **optional guided sub-flow accessible from within the unified Quiz's Banner section** (e.g., a "walk me through this step by step" expansion inside Section 2), rather than existing as a second, separately-launched, separately-navigable screen. The same treatment applies to `ShopRateQuiz.js` relative to the main Quiz's shop-rate sections.

### User experience impact

A shop owner currently encountering both a "Run Pricing Setup Quiz" button and a separate Banner-specific wizard (if that wizard is independently discoverable/launchable) has no way to know which one is "the real one" or whether running both is necessary, redundant, or conflicting. Consolidating into one entry point with an optional detailed sub-flow removes this ambiguity entirely.

### Data impact

If the field-diff confirms full overlap, no data model change is needed — both flows already write to the same `category_defaults.banners` target; only the UI entry points consolidate. If the diff reveals `BannerSetupWizard.js` captures fields the Quiz's Section 2 does not, those fields must be added to the unified Quiz's Banner section before the wizard is retired, to avoid a silent capability loss.

### Migration/retirement impact

Per the Remediation Plan's Phase 10 rollback plan: keep the legacy wizard's code present but unlinked from navigation for one release cycle before deleting outright, in case the consolidation decision needs revisiting after real shop-owner usage data is observed.

### Decision criteria

Approve retirement/consolidation only after: (1) the field-diff verification task is complete, (2) any Wizard-only fields have been added to the unified Quiz, (3) the unified Quiz's Banner section has been confirmed to produce equivalent or better suggested defaults than the standalone wizard for a representative test shop's real answers.

### Required code investigation before final approval

A direct read of `BannerSetupWizard.js` and `ShopRateQuiz.js` alongside the Quiz's corresponding sections, cataloging every field each writes — this is a discrete, bounded verification task that should be scheduled early in Phase 10, not left as a standing ambiguity.

---

## 12. SHIPPING, DELIVERY, INSTALLATION, AND SERVICE CALL PRICING OWNERSHIP

**Confirmed current state:** Only Installation has a real cost/labor formula today (complexity-tiered hours × rate, present in every area-based category and Vehicle Wraps). Shipping/delivery is a display-only free-text notes field with zero cost calculation anywhere (PRC-018, confirmed absent). Services' travel/trip/equipment/subcontract/permit fields are the most fully-modeled example of this general category of cost (§Services formula).

### Recommended principle (P0-PRC-033, Owner Approval Required)

**Pricing Foundation owns the price calculation inputs and snapshot values. Operations/Fulfillment owns scheduling, completion, actual labor, mileage, carrier tracking, and production execution.**

| Cost Component | Pricing Input? | Fulfillment Record? | Both? | Who Enters It | Categories | Markup-able? | Taxable? | On Quote/Invoice? | On Work Order Summary? | Customer-Visible? | Affects Margin Reporting? |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Delivery labor | Yes | Yes | Both | Staff at quote time (estimate); Fulfillment records actual | All categories (optional) | Yes | Per tenant tax rules (typically yes, labor service) | Yes | Yes (scheduling detail) | Yes (as a line item) | Yes |
| Mileage | Yes | Yes | Both | Staff (estimate); Fulfillment (actual via odometer/GPS if tracked) | All categories (optional) | Yes (small markup typical) | Usually no (pass-through-like) | Yes | Yes | Yes | Yes |
| Travel time | Yes | Yes | Both | Same as mileage | Services primarily, others optionally | Yes (billed as labor) | Yes (labor) | Yes | Yes | Yes | Yes |
| Vehicle usage (shop truck) | Yes (as a flat/per-mile rate) | No (not separately tracked as fulfillment) | Pricing only | Staff at quote time | All categories (optional) | Yes | Usually no | Yes | No | Optionally (can be bundled into "delivery fee") | Yes |
| Fuel surcharge | Yes | No | Pricing only | Configured rate, applied automatically | All categories (optional) | No (pass-through) | Depends on tenant tax rules | Yes | No | Yes | Yes |
| Shipping carrier cost | Yes | Yes | Both | Staff enters carrier quote at pricing time; Fulfillment tracks actual shipment/tracking number | All categories (optional) | Optional small markup | Depends on tenant tax rules | Yes | Yes (tracking info) | Yes | Yes |
| Packaging | Yes | No | Pricing only (a cost bucket) | Configured per-category default or manual entry | All categories (optional) | Yes | Yes (material cost) | Yes | No | Bundled into price, not always itemized | Yes |
| Installation labor | Yes (already exists) | Yes (already exists) | Both — confirmed already correctly split today | Staff (estimate via complexity tiers); Production/Fulfillment (actual time logged) | Most categories, Vehicle Wraps | Yes | Yes (labor) | Yes | Yes | Yes | Yes |
| Equipment rental | Yes | Yes | Both | Staff (estimate); Fulfillment (actual booking/return) | Services primarily | Optional | Yes | Yes | Yes | Yes | Yes |
| Service call / trip charge | Yes (already exists for Services) | Yes | Both | Staff | Services | No (typically a flat fee) | Yes | Yes | Yes | Yes | Yes |
| Subcontractor installation | Yes (already exists) | Yes | Both | Staff (estimate/quote from sub); Fulfillment (actual sub invoice/completion) | Services, any category using outsourced install | Optional (already toggleable) | Depends | Yes | Yes | Bundled, not always itemized | Yes |
| Permit/municipal fees | Yes (already exists as pass-through) | Yes (tracking permit status/approval) | Both | Staff (enters the fee amount) | Vehicle Wraps (sign permits), Services | No (confirmed pass-through, never marked up) | Depends on jurisdiction — usually no | Yes | Yes (approval status) | Yes | Yes (as a zero-margin pass-through line) |

**General rule applied consistently across the table above:** Every cost component that affects what the customer is charged is a **pricing input** (it must produce a cost/price figure that lands in the `PricingSnapshot`). Any component whose *actual, real-world execution* needs to be tracked over time (was the truck driven, did the shipment arrive, was the permit approved, did the installer actually show up) is *also* a **fulfillment record**, owned by Operations/Production, and the two are linked by the shared Order Item / Work Order Summary — but the fulfillment record never recalculates the frozen pricing snapshot; it only tracks what actually happened against what was estimated (a common and expected variance report, not a live price change).

---

## 13. OVERTIME, SERVICE RATE, AND AFTER-HOURS PRICING RULES

**Confirmed current state:** No overtime rate concept exists anywhere in `models/pricing.py` (PRC-019, confirmed absent by full grep). Rush surcharge (17.5-30% depending on category) is the only mechanism currently reflecting "this needs to happen faster/harder than normal."

### Recommended launch rules (simple, but not fake-simple)

**P0-PRC-036 — Overtime labor policy, Owner Approval Required.** Add one optional overtime hourly-rate field per labor role (production, install, design), configured as either a flat replacement rate or a multiplier on the base rate (**Recommended Decision:** a multiplier, e.g., `1.5×` the base rate, mirroring standard overtime-pay conventions and requiring less duplicate rate-entry than a second flat rate per role). Overtime is **manually selected** by Staff when scheduling/pricing a job known to require overtime labor — **not automatically inferred** from job size or rush status, since the system has no visibility into actual shop-floor scheduling/capacity at pricing time (confirmed no such capacity-awareness exists anywhere in the platform).

**P0-PRC-037 — Weekend/after-hours/emergency labor policy, Owner Approval Required.** Recommended: a second, separate optional multiplier (distinct from overtime, since a weekend job isn't necessarily an overtime-hours job) — e.g., `weekend_multiplier: 1.25×`, `emergency_after_hours_multiplier: 2.0×` — each independently toggleable per job, each stacking multiplicatively with the base rate (not with each other by default; **Recommended Decision:** if a job is both overtime AND after-hours, apply only the higher of the two multipliers, not both compounded, to avoid an unreasonably inflated rate that could trigger unnecessary below-cost/margin confusion in the opposite direction — an "above normal margin" case that, while not a financial risk, could still surprise a customer with an unexpectedly high price).

**Whether overtime affects cost, selling price, or both:** Both — overtime/after-hours labor is a genuinely higher real cost to the shop (the employee is paid more), so it must flow through as an elevated `labor_cost` bucket, which then naturally produces a higher selling price through the normal markup/overhead math — it is not a separate surcharge bolted onto an otherwise-normal price the way Rush is.

**Whether overtime can be automatic or manually selected:** Manually selected only, per P0-PRC-036 above — no automatic inference.

**Whether customers see overtime as a line item:** **Recommended Decision, Owner Approval Required:** Yes, shown as a distinct labor-cost line (e.g., "After-Hours Labor Premium") on the customer-facing Quote/Invoice, for transparency — unlike internal cost/margin data, this is a real cost driver the customer caused by requesting after-hours work, and shops typically want customers to see and understand why the price is higher in this specific case (distinct from the Rush fee, which is already customer-visible today).

**Service-call minimums (P0-PRC-038, Owner Approval Required):** Already partially modeled for Services (`services_minimum_applies`/`services_minimum_override`) — recommend generalizing this exact pattern (a configurable minimum charge that applies when `services_trip_charge_applies` or an equivalent "this required a dedicated visit" flag is set) to any category that can trigger a standalone service visit (e.g., a wrap-removal-only job, an install-only job with no new production).

**Travel-time billing:** Already modeled for Services (`services_travel_required`/`services_travel_miles` × mileage rate) — recommend this becomes the shared, reusable travel-cost component referenced in §12's table, available to any category, not Services-exclusive.

**Second installer rules:** Already modeled for Vehicle Wraps (`second_installer_required` × $35/hr) — recommend generalizing to any category with an install component, using the same rate-plus-hours pattern.

**Subcontractor markup:** Already modeled for Services (`services_subcontract_markup_applies`, default Yes) — recommend this remains category-configurable (some shops may want zero markup on subs they merely coordinate, others want their normal markup) rather than a hardcoded platform rule.

**Permit/pass-through rules:** Already confirmed correct and consistent — permit/external fees are pass-through, never marked up, anywhere they appear. No change recommended.

**How all of this appears in snapshots and reports:** Overtime/after-hours/travel/second-installer/subcontract costs each get their own named bucket in the `PricingSnapshot` (extending the existing breakdown-array pattern), so reporting can answer "how much of our labor cost last quarter was overtime premium" as a distinct, queryable figure rather than being buried inside an undifferentiated `labor_cost` total.

---

## 14. PRICING CONFIGURATION CHANGE HISTORY AND SNAPSHOT GOVERNANCE

**Confirmed current state:** No `PricingChangeLog` exists; Pricing Foundation edits are not confirmed to write to any activity/audit log at all (PRC-012). No pricing config version history exists — only the current live value of any field is ever stored (PRC-027, confirmed absent per source spec §16.9). `JobTicket.pricing_snapshot` correctly freezes calculation output at commit time (confirmed correct, existing behavior).

### The five distinct concepts and how they differ

| Concept | What It Is | Mutable? | Where It Lives |
|---|---|---|---|
| Live Pricing Foundation configuration | The current, editable rates/materials/markup/category rules a tenant is using right now | Yes, freely editable by `PRICING_EDIT_FOUNDATION` holders | `PricingFoundationSettings`, `PricingMaterial`, `CategoryPricingConfig` |
| Historical pricing configuration | What the live configuration *used to be* at some past point in time | No — append-only history | Reconstructed from `PricingChangeLog` entries, or a full versioned snapshot of the config document (§P0-PRC-039/040) |
| Frozen Pricing Snapshot | The exact calculation result committed to one specific Quote Item / Order Item / Wrap Project / Webstore Order Item | **Never** — immutable once created | `PricingSnapshot`, attached to its specific commercial record |
| Manual override provenance | The record of who/when/why a specific snapshot's price was manually adjusted | Never, once recorded | Embedded inside the relevant `PricingSnapshot.override` block |
| Pricing Change Log | The append-only audit trail of every edit to *live configuration* (not to any specific snapshot) | Never (append-only) | `PricingChangeLog` collection |
| Activity Log | The tenant-wide, cross-domain feed of "who did what" (orders, quotes, tasks, pricing, etc.) | Never (append-only) | Existing platform-wide Activity Log system |

### Which actions write to `PricingChangeLog`, Activity Log, or both

**P0-PRC-039 — Owner Approval Required.**

| Action | PricingChangeLog | Activity Log | Both? |
|---|---|---|---|
| Editing a material's cost/sell rate | Yes | No (too granular/frequent for the general feed) | ChangeLog only |
| Editing a labor rate, markup, overhead %, or category rule | Yes | No | ChangeLog only |
| Creating/editing a Pricing Template | Yes | No | ChangeLog only |
| Accepting a Historical Import benchmark suggestion | Yes | Yes (a meaningful, infrequent, owner-initiated event worth surfacing in the general feed) | Both |
| Completing the Pricing Setup Quiz and applying suggestions | Yes (one entry per changed field, or one batch entry referencing the quiz session) | Yes (one summary entry: "Pricing Setup Quiz completed, N defaults updated") | Both |
| A Staff-requested below-cost override | No (this isn't a config change) | Yes (on the relevant Order/Quote's activity feed) | Activity Log only, plus provenance inside the Snapshot itself |
| An Owner/Admin approving or rejecting a below-cost override | No | Yes | Activity Log only, plus provenance inside the Snapshot itself |
| Setting/changing a customer's discount percent | Yes | No | ChangeLog only |
| Setting a Webstore public-price override | Yes (it's a config-like change to that product's pricing) | No, unless the shop wants storefront price changes surfaced (Owner Approval Required as an optional tenant setting) | ChangeLog, optionally both |

### Whether old material costs can be edited

Yes — the *live* material cost can always be edited going forward (that's the point of live configuration); what cannot happen is any retroactive change to a `PricingSnapshot` that already used the old cost — editing today's material cost has zero effect on any quote/order/snapshot created before the edit.

### Whether historical snapshots ever recalculate

**P0-PRC-040 — No, never — Owner Approval Required (reaffirming existing correct behavior).** A `PricingSnapshot` is permanently frozen at the moment it's created. No future change to live configuration, materials, labor rates, or formulas ever retroactively alters an existing snapshot's stored values. This is already correctly implemented today for `JobTicket.pricing_snapshot` and must remain true for every future pricing surface (Wrap Lab, Webstores) once unified.

### How configuration versions are identified

**Recommended Decision:** Each `PricingSnapshot` stores a `config_version_used` reference (a timestamp or an incrementing version identifier for that tenant's Foundation configuration at the moment of calculation) — this, combined with the `PricingChangeLog`'s append-only history, allows any report to reconstruct exactly what configuration state produced any given historical price, without needing to store a full duplicate copy of the entire configuration inside every single snapshot (which would be wasteful) — only the cost/price *results* are duplicated into the snapshot; the *configuration that produced them* is reconstructable from the versioned log.

### How a report can explain why an old Order Item used a different cost/rate than a current quote

By comparing the old Order Item's `PricingSnapshot` (which shows the exact material cost, labor rate, markup, etc. used at that time) against the current live configuration, or against the `PricingChangeLog`'s history of changes between the two dates — the report can produce a plain-English explanation such as "this quote used a $1.10/sqft banner material rate; the current rate is $1.25/sqft, changed on [date] by [user]."

### How imported historical invoice benchmarks are tracked

Via the existing `PricingImport` model (confirmed already correctly separate and status-tracked: `mapping_required → ready_for_analysis → analyzed → reviewed`) — each accepted suggestion additionally writes a `PricingChangeLog` entry per the table above, closing PRC-054's confirmed gap.

### How quiz-derived defaults are tracked

Per the Remediation Plan's PRC-025 fix: raw Quiz answers are persisted in their own collection, independent of the derived config values they produced, so a Foundation field's current value can always be traced back to "this was set by your Quiz answer on [date]" even if it was later manually edited — with the manual edit itself separately visible in the `PricingChangeLog`.

### How manual edits after quiz completion are tracked

Exactly like any other Foundation edit — a `PricingChangeLog` entry, with the difference between the Quiz-derived value and the current live value visible by comparing the Quiz-answer-history record (immutable) against the ChangeLog's most recent entry for that field (which shows the manual edit that superseded it).

---

## 15. PHASE 0 FORMULA GOVERNANCE RULES

**P0-PRC-041 — Owner Approval Required.** The following rulebook is binding for every calculator built from Phase 3 onward. Rules are classified as **Universal** (every category must follow, no exceptions), **Category-Specific** (applies only to the categories named), **Optional Feature** (applies only if the tenant/category enables the feature), or **Future Feature** (not built yet, rule reserved for when it is).

| Rule Area | Classification | Rule |
|---|---|---|
| Minimum billable area | Category-Specific | Each area-based category (Banners, Rigid Signs, Cut Vinyl, Digital Print, Vehicle Graphics) defines its own minimum billable area floor (confirmed range 0.5-4.0 sqft); the formula always applies `billable_area = max(actual_area, category_minimum)` before any cost calculation. Apparel/Services/Promotional/Custom have no area concept and this rule does not apply to them. |
| Waste calculation order | Universal (for categories with a waste concept) | Waste percentage is applied to `billable_area` immediately after the minimum-area floor, and always *before* material cost is calculated — never applied after material cost, never applied twice. |
| Material cost calculation | Universal (for categories with a material concept) | `material_cost = waste_adjusted_area × material_cost_per_sqft` (or the unit-cost equivalent for apparel blanks/promotional unit costs) — always computed from the *waste-adjusted* quantity, never the raw entered quantity. |
| Labor calculation | Universal | Minute-based only (PRC-006's hours-fallback is retired) — every category expresses labor time in minutes internally, even if the UI displays hours to the user. |
| Design labor | Universal, pending P0-PRC-002 | Computed as `design_hours × design_rate`; whether it sits inside or outside the overhead basis is governed by §3's locked decision, but the calculation of the design-cost bucket itself is identical everywhere it applies. |
| Installation labor | Universal, pending P0-PRC-003 | Computed as `max(install_minimum_charge, install_hours × install_rate)` (+ second-installer add-on if applicable, +overtime/after-hours multiplier if applicable per §13); overhead-basis inclusion governed by §3. |
| Overhead | Universal | Computed exactly once per calculation, using the canonical basis locked in §3, and stored with a full `overhead_basis` explainability object. |
| Markup | Universal | A single configured multiplier per category, applied to the fully-assembled cost-plus basis; never applied twice, never applied to a sub-component in isolation and then again to the total. |
| Sell-rate comparison | Category-Specific | Applies only to the "Compare Methods" family (Banners, Rigid Signs, Cut Vinyl, Digital Print, Vehicle Graphics): the formula always computes both the cost-plus arm and the sell-rate-per-unit arm and takes the higher, per the existing correct `max(cost_plus, sell_rate, minimum)` pattern. |
| Package benchmark floors | Category-Specific | Applies only to Vehicle Graphics/Wraps (and any future category that adopts a real-world benchmark floor): the benchmark price is a third comparison arm, always compared via `max()`, never subtracted or blended. |
| Quantity discounts | Universal (where configured) | Applied to `sell_base` before design/install/setup/shipping fees are added, per existing confirmed behavior — this order is preserved, not changed. |
| Customer discounts | Universal (once built, Phase 7) | Applied after quantity discounts, before rush fees, per §7/§8's locked precedence — never applied to pass-through fees, tax, or deposits. |
| Rush fees | Universal | Applied after quantity discount and customer discount, before tax — a straight percentage surcharge on the already-discounted total, never applied to pass-through fees. |
| Manual overrides | Universal | Replaces the entire computed result of every step before it (per §8's precedence table); subject to the below-cost/below-margin guardrails in §5/§6 regardless of category. |
| Taxes | Universal | Computed by the Invoice/Order domain on the final pricing-engine output, never recalculated or second-guessed by the pricing engine itself. |
| Deposits | Universal | A payment-schedule concept, not a pricing concept — the pricing engine produces a final price; how that price is split into deposit + balance is an Order/Invoice-domain decision, out of scope for the `PricingEngine` itself. |
| Rounding | Universal | Per §4's locked rule: internal precision maintained until each named cost bucket is finalized, then rounded once to the nearest cent (half-up), with whole-dollar rounding as an explicit opt-in category/tenant setting only. |
| Snapshot creation | Universal | Every committed price (Quote Item, Order Item, Wrap Project, Webstore Order Item) creates exactly one `PricingSnapshot`, containing the full cost breakdown, warnings, and override provenance (if any) — never a partial snapshot, never a snapshot missing the breakdown data. |
| Warning creation | Universal | Every calculation evaluates the below-cost/below-margin/staleness/fallback conditions from §5 and attaches any applicable typed `PricingWarning` objects — warnings are never silently dropped even if the calculation ultimately succeeds. |
| Permission enforcement | Universal | Every pricing-domain write (Foundation edit, override, customer discount, Webstore override) checks the relevant `Permission.PRICING_*` grant from §6 before proceeding — no pricing write path is ever permission-exempt. |
| Audit logging | Universal | Every pricing-domain write produces the appropriate `PricingChangeLog` and/or Activity Log entry per §14's routing table — no silent configuration change is permitted. |
| Reporting data output | Universal | Every `PricingSnapshot` exposes its cost/margin/override/discount data in a shape reporting can consume without special-casing per category — the standardized `PricingResult`/`PricingSnapshot` schema (Remediation Plan §4A) is the single contract every report reads against. |
| Shipping/delivery | Optional Feature | Once built (§12), available per-category as an optional cost component; categories that don't enable it simply omit the bucket, they are not forced to carry a zero-value placeholder. |
| Overtime/after-hours | Optional Feature | Per §13, manually toggled per job; never automatically inferred. |
| Wholesale/contract/volume pricing | Future Feature | Reserved for Phase 7 expansion beyond the customer-discount MVP; no calculator should be built assuming these exist yet. |
| AI pricing suggestions | Future Feature | Reserved for Phase 11; no calculator should call out to or depend on an AI suggestion service. |

---

## 16. DECISION DEPENDENCIES AND BUILD GATES

| Build Gate | Required Phase 0 Decisions | Why It Cannot Begin Without Them |
|---|---|---|
| Shared pricing infrastructure (Sprint 1 / Phase 1) | P0-PRC-008, P0-PRC-009, P0-PRC-013, P0-PRC-014, P0-PRC-015, P0-PRC-016, P0-PRC-019, P0-PRC-039, P0-PRC-040 | The `Money` utility needs the currency/rounding rule locked; the `PricingWarning`/override-provenance schema needs the guardrail and approval-workflow rules locked; the permission enforcement helper needs the role mapping locked; the `PricingChangeLog` write-through helper needs the write-routing rule locked. Building any of these against an unresolved rule means rebuilding them once the rule is finally set. |
| Materials migration (Phase 2) | P0-PRC-005, P0-PRC-006 | Whether setup fees and shipping affect the overhead basis determines what data needs to live on a Material record vs. elsewhere; migrating the Materials collection before this is settled risks a second migration later. |
| Banner calculator port (Phase 3, first category) | P0-PRC-001 through P0-PRC-007 (overhead), P0-PRC-009 through P0-PRC-012 (rounding), P0-PRC-010, P0-PRC-011, P0-PRC-021 (override workflow), P0-PRC-028 (precedence), P0-PRC-033/034 (shipping/install ownership), P0-PRC-036/037 (overtime), P0-PRC-041 (governance rulebook) | Banners is the proof-of-concept for every other category — if its overhead basis, rounding, and override behavior are wrong, every category ported afterward inherits the same error. |
| Area-based engine port (Rigid Signs, Cut Vinyl, Digital Print) | Same as Banner port, already proven | These categories reuse the Banner-proven engine; no *new* Phase 0 decisions are required once Banners is done correctly, only continued adherence to the same locked rules. |
| Vehicle Wrap unification (Phase 4) | P0-PRC-031 (canonical formula direction), P0-PRC-038 (second-installer/travel rules), plus all Phase 3 gating decisions | The merge cannot proceed without a locked direction on which formula wins, and the side-by-side code comparison this decision depends on. |
| Apparel module (Phase 5) | P0-PRC-005 (setup fees), P0-PRC-007 (whether Apparel applies overhead at all — currently an open verification item) | Apparel's formula behaves differently enough from the area-based family that its overhead treatment must be explicitly confirmed, not assumed to match Banners. |
| Customer pricing MVP (Phase 7) | P0-PRC-024, P0-PRC-025, P0-PRC-026, P0-PRC-027, P0-PRC-028 (precedence) | The discount mechanism cannot be built without knowing exactly where in the precedence chain it sits and how it interacts with the below-cost guardrail. |
| Webstore pricing integration (Phase 8) | P0-PRC-022, P0-PRC-023, P0-PRC-029, P0-PRC-030 | The entire point of this phase — preserving internal calculation while allowing a public override — is explicitly defined by these decisions; building it without them risks recreating a version of the exact disconnected-pricing defect (PRC-002) the rebuild exists to fix. |
| Reporting repair (Phase 9) | P0-PRC-001 through P0-PRC-007 (overhead consistency), P0-PRC-039, P0-PRC-040 | Cross-category margin reporting is meaningless until every category computes overhead the same way; snapshot-based reporting requires the frozen-snapshot governance rules to be locked. |
| Historical import improvements (Phase 10) | P0-PRC-012, P0-PRC-032, P0-PRC-039 | Audit-logging improvements depend on the change-log routing rules; the consolidation of onboarding flows depends on the Banner Wizard/Quiz decision. |
| AI Pricing Guidance (Phase 11) | All prior decisions, transitively | AI suggestions are only meaningful once the entire rule set they're suggesting against is stable and correct — this phase has no decisions of its own in this document by design (per the Remediation Plan, it is deliberately last). |

---

## 17. PHASE 0 APPROVAL CHECKLIST

| Decision ID | Decision Title | Recommended Choice | Approve / Revise / Defer | Notes |
|---|---|---|---|---|
| P0-PRC-001 | Canonical overhead cost basis | Material + production labor (+ install labor per literal default; see P0-PRC-003 tension) × overhead % | ☐ | |
| P0-PRC-002 | Design labor in overhead basis? | Exclude (pass-through after markup) | ☐ | |
| P0-PRC-003 | Installation labor in overhead basis? | Exclude (diverges from literal default text — see §3) | ☐ | |
| P0-PRC-004 | Subcontractor cost in overhead basis? | Exclude | ☐ | |
| P0-PRC-005 | Setup fees in overhead basis? | Exclude | ☐ | |
| P0-PRC-006 | Shipping/delivery in overhead basis? | Exclude (pass-through) | ☐ | |
| P0-PRC-007 | Does Apparel/Services/Promotional/Custom apply overhead? | Promotional: yes. Apparel/Services: no (verify first). Custom: N/A | ☐ | Requires code verification for Apparel |
| P0-PRC-008 | Store money as integer cents | Approve | ☐ | |
| P0-PRC-009 | Rounding method and timing | Half-up, round once per finalized cost bucket | ☐ | |
| P0-PRC-010 | Whole-dollar pricing toggle | Optional, category/tenant-level opt-in only | ☐ | |
| P0-PRC-011 | Rounding for quantity discount/rush/tax | Round once per named bucket, as described in §4 | ☐ | |
| P0-PRC-012 | Rounding for manual overrides/imports | Direct entry = exact; imports = half-up with confidence flagging | ☐ | |
| P0-PRC-013 | Below-target-margin behavior | Warning only | ☐ | |
| P0-PRC-014 | Below-cost behavior | Warning + required reason | ☐ | |
| P0-PRC-015 | Below-cost override approval | Owner/Admin approval required for Staff-requested overrides | ☐ | |
| P0-PRC-016 | Override reason taxonomy | 6-value taxonomy + custom "other" | ☐ | |
| P0-PRC-017 | Warning visibility by surface | Per §5 table (internal yes, customer-facing no) | ☐ | |
| P0-PRC-018 | Warnings on discount/wholesale/webstore-driven below-cost | Same guardrails as direct override | ☐ | |
| P0-PRC-019 | PRICING_VIEW/EDIT_FOUNDATION/OVERRIDE role mapping | Per §6 table | ☐ | |
| P0-PRC-020 | Cost/margin visibility scope | Owner/Admin only by default, tenant-configurable for Staff | ☐ | |
| P0-PRC-021 | Override approval workflow steps | Per §6's 8-step workflow | ☐ | |
| P0-PRC-022 | Webstore public pricing edit permission | Webstore Owner/Manager, override field only | ☐ | |
| P0-PRC-023 | Owner-share/platform-fee visibility | Owner/Platform Admin only | ☐ | |
| P0-PRC-024 | Customer discount MVP scope | Flat % only, positioned per §7/§8 | ☐ | |
| P0-PRC-025 | Customer discount below-cost guardrail | Same guardrail as manual override | ☐ | |
| P0-PRC-026 | Customer-specific minimum-margin exceptions | Defer to Phase 7 future expansion | ☐ | |
| P0-PRC-027 | Tax-exempt separation reaffirmed | No change to existing correct behavior | ☐ | |
| P0-PRC-028 | Canonical 14-layer precedence hierarchy | Per §8 table | ☐ | |
| P0-PRC-029 | Webstore override never erases internal snapshot | Approve as binding rule | ☐ | |
| P0-PRC-030 | Calculator-backed vs. manually-priced Webstore products | Category-mappable = calculator-backed; true one-offs = Custom category | ☐ | |
| P0-PRC-031 | Vehicle Wrap canonical formula direction | Merged formula, favoring Foundation structure, pending code diff | ☐ | Final formula requires further code investigation |
| P0-PRC-032 | Banner Wizard vs. Quiz consolidation | Unify into one Quiz with optional guided sub-flow | ☐ | Requires field-diff verification |
| P0-PRC-033 | Shipping/delivery pricing ownership | Pricing Foundation owns inputs, Fulfillment owns execution | ☐ | |
| P0-PRC-034 | Installation labor ownership split | Both (already correct pattern), extend consistently | ☐ | |
| P0-PRC-035 | Service-call/trip-charge ownership | Both, generalize Services' existing pattern | ☐ | |
| P0-PRC-036 | Overtime labor rate policy | Optional multiplier per role, manually selected | ☐ | |
| P0-PRC-037 | Weekend/after-hours policy | Separate multiplier, higher-of-two rule when combined with overtime | ☐ | |
| P0-PRC-038 | Service-call minimum/travel/second-installer | Generalize existing Services/Vehicle-Wraps patterns platform-wide | ☐ | |
| P0-PRC-039 | PricingChangeLog vs. Activity Log routing | Per §14 table | ☐ | |
| P0-PRC-040 | Snapshots never recalculate | Reaffirm existing correct behavior | ☐ | |
| P0-PRC-041 | Adopt Formula Governance Rulebook (§15) | Approve as binding | ☐ | |

*Nothing above is marked approved automatically. Every checkbox is yours to complete.*

---

## 18. FINAL RECOMMENDATION

**Decisions that should be approved now** (no further investigation needed — the evidence already fully supports a clear recommendation): P0-PRC-004 through P0-PRC-006 (subcontractor/setup-fee/shipping exclusion from overhead), P0-PRC-008 through P0-PRC-012 (currency/rounding), P0-PRC-013 through P0-PRC-021 (margin/override/approval guardrails), P0-PRC-024 through P0-PRC-030 (customer/webstore pricing scope and precedence, excluding the deferred future items), P0-PRC-033 through P0-PRC-041 (ownership, overtime, change-history, governance rulebook).

**Decisions that require additional code investigation before approval:**
- **P0-PRC-001 through P0-PRC-003** — the exact overhead-basis mechanism claimed by `PRICING_SPEC.md` §16.7 for Banners/Vehicle Wraps (which specific cost bucket is "included") should be directly re-verified against the live `server.py` code before the recommendation in §3 is finalized as the literal implementation spec, given the confirmed conflict between the two source documents.
- **P0-PRC-007** — whether Apparel's live implementation actually calls the shared overhead function despite not appearing in the simplified `pricing_spec.md` formula needs a direct code check.
- **P0-PRC-031** — the Vehicle Wrap canonical formula cannot be fully finalized (only its *direction* can be approved now) until the side-by-side Foundation-vs-Wrap-Lab code diff and price-discrepancy quantification (PRC-032) is complete.
- **P0-PRC-032** — the Banner Wizard vs. Quiz consolidation cannot be fully finalized until the field-diff verification task is complete.

**Decisions that can safely be deferred:**
- P0-PRC-026 (customer-specific minimum-margin exceptions) — explicitly deferred to Phase 7 future expansion, not needed for MVP.
- Any AI Pricing Guidance-related governance — deliberately out of scope for Phase 0 entirely, reserved for Phase 11.

### Exact conditions required before Sprint 1 begins

Sprint 1 may begin only when:
- Currency and rounding rules are approved (P0-PRC-008 through P0-PRC-012).
- Overhead formula is approved (P0-PRC-001 through P0-PRC-007, with the code-investigation caveat above resolved or explicitly accepted as-is by the Owner).
- Manual override/approval rules are approved (P0-PRC-013 through P0-PRC-021).
- Pricing precedence hierarchy is approved (P0-PRC-028).
- Vehicle Wrap unification direction is approved (P0-PRC-031, direction only — final formula selection may still be pending).
- Pricing change-history rules are approved (P0-PRC-039, P0-PRC-040).
- Core pricing permissions are approved (P0-PRC-019, P0-PRC-020).

**Phase 0 is complete only when the required pricing decisions are approved and recorded. No calculator, pricing screen, Wrap Lab pricing flow, Webstore price flow, quote workflow, or pricing migration may begin before those approvals are complete.**

---

*End of Phase 0 Pricing Decisions, Formula Governance & Build Rules. This document does not modify any code, screen, or data. It is the approval gate that must be completed before Sprint 1 (per `/app/memory/PRICING_ISSUES_INVENTORY_AND_REMEDIATION_PLAN.md`'s Recommended First Implementation Sprint) may begin.*


"# SignGuy AI — Pricing System, Calculators & Onboarding Quiz — Rebuild Investigation Document

**Investigation date:** 2026-02-15 (session continuation)
**Mode:** Documentation only. No code, screens, or migrations were written.
**Sources used:** This document synthesizes three pre-existing, previously-generated specification files (`/app/memory/PRICING_SPEC.md`, `/app/memory/pricing_spec.md`, `/app/memory/pricing_quiz_spec.md`) — which were reverse-engineered from the live codebase in an earlier session and independently spot-verified against `models/pricing.py`, `routes/pricing.py`, `routes/pricing_setup.py`, `routes/job_tickets.py`, and `routes/wrap/core.py` in this session — plus new targeted research into gaps those specs did not cover (customer-specific pricing, AI pricing features, permissions, and Webstore/Wrap It! pricing integration, all confirmed by direct code read this session).

---

## 1. PRICING SYSTEM EXECUTIVE SUMMARY

**What the pricing system currently does:** A single shared calculation engine (`POST /api/pricing/calculate`, dispatching to one `calculate_*` function per category inside `server.py`) computes a suggested selling price for 9 product categories (Banners, Rigid Signs, Cut Vinyl, Digital Print, Vehicle Graphics/Wraps, Apparel, Services, Promotional, Custom), using per-tenant configuration stored in one `pricing_configuration` document (materials library, labor rates, markup rules, category-specific defaults). A guided 11-section Pricing Setup Quiz converts real-world prices a shop owner already knows into suggested Foundation defaults. A parallel Historical Invoice Import path extracts benchmark prices from uploaded past invoices using AI. Calculator output (\"pricing_snapshot\") is attached to a Job Ticket (Order Item) so quotes/orders freeze their price at calculation time.

**What it should do after rebuild:** The same conceptual system — one shared calculation engine, one materials/labor/markup foundation, category-specific calculator configuration on top of it — but with the confirmed architectural violations found this session fixed: today there are **three separate, disconnected pricing mechanisms** in the live app (the shared Pricing Foundation engine; the Wrap Command Center's own independent `_compute_pricing_snapshot` function with its own `WrapPricingConfig`; and Webstore products' flat manual `retail_price` field with zero connection to Materials/Labor/Markup at all). The platform's own non-negotiable rule (\"Do not create separate material libraries or separate pricing engines for Webstores, Wrap It!, Orders, or product categories\") is **already violated by the current codebase** — the rebuild's primary pricing-architecture job is to collapse these three into one.

**Main users:** Shop Owner/Admin (configures Pricing Foundation, runs the Setup Quiz, reviews Historical Import suggestions), Staff (uses the calculator inside Quotes/Orders to generate line-item prices — confirmed no permission restriction on *using* the calculator, only on *editing the Foundation*), Customers (never see the calculator directly, only its output on a Quote/Invoice/Webstore product page).

**Which parts are shared infrastructure:** The `pricing_configuration` document (materials, labor rates, markup/overhead rules, category defaults), the `POST /api/pricing/calculate` engine, Pricing Templates (saved reusable configurations), Historical Invoice Import.

**Which parts are category-specific:** Each category's own input fields, formula sequence, multiplier tables, and quantity-discount tiers — all stored as a per-category sub-object (`category_defaults.<category>`) consumed by that category's dedicated `calculate_<category>` function.

**Which parts are currently duplicated, outdated, incomplete, confusing, or should not be rebuilt as-is:**
- **Duplicated (confirmed violation):** Wrap Command Center's pricing engine (`routes/wrap/core.py::_compute_pricing_snapshot`) is a second, independent implementation of vehicle-wrap pricing math, disconnected from the shared engine's `vehicle_wraps`/`vehicle_graphics` category and its Materials Library.
- **Duplicated/disconnected (confirmed):** Webstore products (`WebstoreProduct.retail_price`) have their own flat manual price, with zero connection to the Pricing Foundation.
- **Outdated/legacy:** The hours-based labor fallback system (superseded by the minute-based system but still present as a conditional fallback).
- **Incomplete:** `ai_prefill_overrides` exists as an empty placeholder object (`{}`) on every single category's defaults — confirmed via full-repo grep, this field is never read or written anywhere; \"AI Pricing Guidance\" as a distinct feature does not exist beyond the Historical Import's one-time AI extraction step.
- **Missing entirely:** Customer-specific pricing, wholesale/reseller pricing, tax-exempt-aware pricing, and volume-agreement pricing — confirmed via full grep of `models/customer.py`, none of these fields exist anywhere in the data model today, despite being named requirements of this investigation.
- **Confusing:** The `category_pricing_methods` (8 selectable calculation *methods*) is a genuinely good, flexible design, but its interaction with `category_setup_status` (a manually-set \"badge\" that has no functional effect — the calculator runs regardless of whether a category shows as \"not_started\") is confusing and should either enforce something or be removed.

**What pricing information must be stored permanently versus calculated temporarily:**
- **Permanent (config):** `pricing_configuration` (materials, rates, category defaults, benchmarks) — the \"recipe.\"
- **Permanent (snapshot):** `JobTicket.pricing_snapshot` — the frozen *output* of a specific calculation at a specific point in time, attached to a specific Order Item so that later changes to the Foundation don't retroactively alter an already-priced Job Ticket.
- **Temporary (calculated):** Every intermediate number the engine computes on each `POST /pricing/calculate` call (material cost, labor cost, overhead, etc.) — these live only in the response payload and the frontend's calculator state until the user commits them to a Job Ticket, at which point they become part of that ticket's permanent `pricing_snapshot`.

**Recommended high-level structure (confirming this is largely already the right shape, just needs the 3-engine problem fixed):**
- **Global Shop Pricing Settings** — labor rates, overhead, default markup, rush fee, design-charge policy (already exists: top-level fields on `pricing_configuration`).
- **Materials Library** — currently a flat array on the same document; should become its own collection (see §11).
- **Product Category Pricing Rules** — `category_defaults.<category>` (already exists, well-structured).
- **Calculator Templates** — `pricing_templates` collection (already exists — saved reusable configs like \"Standard 3×8 Banner\").
- **Customer-Specific Pricing** — does not exist; net-new for rebuild (see §8).
- **Quote/Order Item Pricing Snapshots** — `JobTicket.pricing_snapshot` (already exists, correctly used).
- **Onboarding Pricing Quiz** — `PricingSetupQuiz.js` + `ShopRateQuiz.js` (already exists, well-designed).
- **AI Pricing Guidance** — only the Historical Import's AI extraction step exists today; broader \"AI Pricing Guidance\" is unbuilt (see §9).
- **Reporting/Profitability Data** — flagged as broken in the separately-documented Business Finance investigation (Profit & Margin Analytics reads from the deprecated legacy `jobs`/`job_items` model, not the current Job Ticket's `pricing_snapshot` — meaning today's Pricing Foundation calculations have **no working profitability report** despite doing all the cost-tracking work needed to feed one).

---

## 2. COMPLETE PRICING CATEGORY INVENTORY

| Category | Examples of Products | Where It Appears | Who Uses It | Disposition | Own Calculator? | Shared Template? | Shares Logic With | Unique About It |
|---|---|---|---|---|---|---|---|---|
| **Banners** (`banners`) | 13oz/18oz vinyl, mesh, blockout, pole, fabric, step-and-repeat | Job Ticket \"Add Item\" flow, `BannerSetupWizard.js` (7-step guided setup), Quotes/Orders | Staff, Owner | **Keep, reconnect** | Yes (`calculate_banners`) | Compare Methods (sqft + material/labor) | Rigid Signs, Cut Vinyl, Digital Print (all area-based `compare_methods` family) | Per-linear-foot finishing add-ons (hems, grommets, pole pockets) unique to soft goods |
| **Rigid Signs** (`rigid_signs`) | Coroplast yard signs, ACM/Dibond, PVC, aluminum, acrylic | Same as above | Staff, Owner | **Keep, reconnect** | Yes (`calculate_rigid_signs`) | Compare Methods | Banners, Cut Vinyl, Digital Print | Shape/finish-quality/thickness multiplier stack; yard signs are a quantity-tier sub-case of this category |
| **Cut Vinyl** (`cut_vinyl`) | Oracal 651/751/951, reflective, metallic, wall vinyl | Same as above | Staff, Owner | **Keep, reconnect** | Yes (`calculate_cut_vinyl`) | Compare Methods | Digital Print (shares vinyl material concept), Rigid Signs | Color-count and weeding-complexity multipliers unique to plotter-cut work |
| **Digital Print** (`digital_print`) | Adhesive vinyl, poster paper, canvas, backlit film, window perf | Same as above | Staff, Owner | **Keep, reconnect** | Yes (`calculate_digital_print`) | Compare Methods | Cut Vinyl, Rigid Signs (mounting) | Ink-coverage-percent cost component is unique to true digital printing |
| **Vehicle Graphics/Wraps** (`vehicle_graphics`/`vehicle_wraps`) | Spot graphics, partial/half/full wraps, window perf, lettering | Job Ticket flow (generic) **AND separately, the standalone Wrap Command Center workspace** | Staff, Owner (wrap specialists) | **Keep the concept, urgently reconcile the two disconnected implementations** (see §1) | Yes — **two**, confirmed duplicated | Compare Methods vs. Package benchmark | Rigid Signs/Cut Vinyl (materials), but has its own vehicle-type base-sqft table | Package-benchmark guardrail (real shop pricing floor) unique to this category; also the only category with a second, fully independent calculator implementation |
| **Apparel** (`apparel`) | T-shirts, hoodies, polos, caps — HTV/screen print/DTF/embroidery/DTG | Job Ticket flow | Staff, Owner | **Keep — best-designed category in the system** | Yes (`calculate_apparel`) | Quantity Tier + shop pricing table lookup | None closely — structurally distinct (table-first, not formula-first) | The `shop_pricing_table[brand][tier][placement]` lookup table is the strongest pattern in the whole pricing system — explicitly recommended in the source spec to generalize to other categories |
| **Services** (`services`) | Design, install, consultation, site survey, subcontracted work | Job Ticket flow | Staff, Owner | **Keep** | Yes (`calculate_services`) | Hourly / Flat / Unit | Overlaps conceptually with the global Labor Rates foundation | Only category with a \"pass-through, no-markup\" cost type (permit/external fees) |
| **Promotional/Misc** (`promotional`) | Outsourced vendor items, misc small products | Job Ticket flow | Staff, Owner | **Keep, simplify** | Minimal — manual-cost × markup only | Manual Quote | Custom (near-identical logic, same markup multiplier applies to both) | Simplest category — effectively just vendor-cost × configurable markup |
| **Custom** (`custom`) | One-off items that don't fit any category | Job Ticket flow | Staff, Owner | **Keep as the deliberate fallback** | No — pure manual entry | Manual Quote | Promotional (shares markup multiplier config) | Intentionally has no formula — the escape hatch for anything unclassifiable |
| **Webstore Products** | Any product sold through a tenant's public storefront | Webstore admin UI, public storefront checkout | Webstore Owner, Customers | **Fix — reconnect to shared Foundation** | No — flat manual `retail_price` field only | None | Should share logic with whichever category the product actually is, but currently shares nothing | Confirmed, disconnected, violates platform rule |

**Recommended calculator families (validated against the actual codebase, not assumed):**
1. **Area-based \"Compare Methods\" family** — Banners, Rigid Signs, Cut Vinyl, Digital Print. All four share the exact same skeleton: billable-area minimum → waste% → material cost → multiplier stack → labor (minutes-based) → overhead → markup-vs-sell-rate-vs-minimum → quantity discount. This is the strongest candidate for one shared calculator engine with per-category config, not four separate functions.
2. **Vehicle/Package family** — Vehicle Graphics/Wraps. Structurally similar to family 1 but adds a benchmark-price floor (package pricing) as a third comparison arm, and vehicle-type-specific base square footage instead of user-entered dimensions.
3. **Table-lookup family** — Apparel. Fundamentally different: no area/formula math for the sell price itself, just a pre-filled lookup table plus decoration-method add-on costs.
4. **Time/unit-based family** — Services. Hourly/flat/per-unit billing, no material or area concept at all.
5. **Manual/pass-through family** — Promotional, Custom. Cost-plus-markup or pure manual entry, no formula.
6. **Disconnected outlier (to be eliminated, not a real \"family\"):** Webstore flat pricing and the Wrap Command Center's separate engine — both should be absorbed into families 1–5 above, not treated as permanent additional families.

---

## 3. GLOBAL PRICING FOUNDATION

### A. Labor and Shop Rates

| Rate | Default | Where Set | Who Can Change | Type | Used By | Overridable on Quote/Order? | Customer-Specific? | Affects Reports? |
|---|---|---|---|---|---|---|---|---|
| Production/Shop Labor | $28–75/hr (varies by spec source; confirmed range) | `pricing_configuration.production_hourly_rate` / `labor_rates.production.hourly_rate` | Owner/Admin (role-string gate) | Fixed $/hr | All area-based categories | Not directly — only via manual override of the whole line-item price | No | Yes, feeds `labor_cost` |
| Design | $85/hr (default) | `design_hourly_rate` / `labor_rates.design.hourly_rate` | Owner/Admin | Fixed $/hr | Every category (design charge system) | Yes, per-order via `hourly_rate_override` (Services only, confirmed) | No | Yes |
| Installation | $95/hr (default) | `install_hourly_rate` / `labor_rates.installation.hourly_rate` | Owner/Admin | Fixed $/hr, has its own minimum charge ($125 default) | All categories with `install_required` | No dedicated override field found outside Services | No | Yes |
| Removal | $65/hr | `removal_hourly_rate` | Owner/Admin | Fixed $/hr | Vehicle Wraps (removal_scope) | No | No | Yes |
| Vehicle Wrap Install Labor | $75/hr (min $125), + second-installer $35/hr | `category_defaults.vehicle_wraps` | Owner/Admin | Fixed $/hr | Vehicle Wraps only | No | No | Yes |
| Rush Rate | Configurable %, 17.5–30% depending on category | `rush_fee_percentage` (global) + per-category overrides (e.g., Apparel `apparel_rush_percent`) | Owner/Admin, Staff can toggle per-order | Percentage surcharge | All categories | Yes — toggle on/off per quote | No | Yes |
| Overtime Rate | **Not found in the codebase** | — | — | — | — | — | — | Flag as missing — see §12 |
| Service-Call Rate | Modeled generically as `services.labor_rate_overrides` + travel/trip charges | `category_defaults.services` | Owner/Admin | Fixed $/hr or per-trip flat | Services category only | Yes — `hourly_rate_override`/`services_unit_rate_override` | No | Yes |
| Minimum Labor Charge | Per-role, e.g., Installation $125 | `labor_rates.<role>.minimum_charge` | Owner/Admin | Fixed $ floor | All categories using that role | No | No | Yes |
| Minimum Order Charge | Global `minimum_order` + per-category `default_minimum_sell_price` | `pricing_configuration.minimum_order` | Owner/Admin | Fixed $ floor | Every category | No | No | Yes |
| Minimum Setup Charge | Per-category (e.g., Promotional's `minimum_setup_fee`) | `category_defaults.promotional.minimum_setup_fee` | Owner/Admin | Fixed $ | Promotional | No | No | Yes |

**Confirmed gap:** No dedicated Overtime rate concept exists anywhere in `models/pricing.py` — flagged as an Open Decision, not invented.

### B. Markup, Margin, and Profit Rules

| Rule | Formula | Default Source | Where Applied | Editable? | Visible to Staff? | Creates Warnings? | Auto-changes by |
|---|---|---|---|---|---|---|---|
| Material Markup | Baked into `default_markup_multiplier` (category-level, e.g., 2.35× banners, 2.45× rigid signs) | `category_defaults.<category>.default_markup_multiplier` | Applied to `total_cost` in cost-plus arm of every formula | Yes, per category | Staff sees the *result* price, not the multiplier (confirmed no explicit \"hide multiplier from staff\" toggle found — flagged as an assumption to verify, not confirmed either way) | No explicit warning found for \"markup below X\" | Category |
| Global Default Markup | 2.5× | `pricing_configuration.default_markup_multiplier` | Fallback when a category has no override | Yes | — | — | — |
| Target Profit Margin | 40% (default) | `target_profit_margin_percent` | Referenced conceptually but **no confirmed enforcement code found this session** — flagged as an Open Decision (is this purely informational or does it drive a real minimum-margin guardrail?) | Yes | — | Unconfirmed | — |
| Minimum Selling Price | Per-category `default_minimum_sell_price` | `category_defaults.<category>` | Final `max(cost_plus, sell_rate, minimum)` comparison — confirmed real, always enforced | Yes | Yes | Not explicitly, price simply floors at the minimum silently | Category |
| Wholesale/Retail/Customer Discount/Tiered/Volume Rules | **Do not exist** | — | — | — | — | — | — |
| Quantity Discounts | Tiered `{min_qty, max_qty, discount_percent}` list per category | `category_defaults.<category>.quantity_breaks`/`quantity_discounts` | Applied to `sell_base` before design/install/setup fees are added | Yes | Yes | No | Quantity entered |
| Rush Pricing | % surcharge on suggested price | `rush_fee_percentage` global + category overrides | Applied last, after minimum-charge enforcement | Yes | Yes | No | Toggle |
| Complexity Multipliers | Design/weeding/install/shape/finish-quality multiplier tables (1.0×–2.0× typical range) | `category_defaults.<category>` | Applied to relevant labor-hour or cost component before rate multiplication | Yes | Yes | No | User selection |
| Waste Allowances | 5–15% by category | `category_defaults.<category>.waste_percent` | Applied to billable area before material cost calculation | Yes | Yes | No | Category |
| Overhead Allocation | `(material_cost + labor_cost) × overhead_percent` + `labor_hours × shop_overhead_per_hour` | `overhead_percentage` (global, default varies — 0% or 15% depending on source), `shop_overhead_per_hour` | Every category, but **confirmed inconsistency**: Promotional and Cut Vinyl explicitly exclude setup fees from the overhead basis; Banners and Vehicle Wraps include them — a real, confirmed cross-category inconsistency that makes margin reporting unreliable across categories. | Yes | — | No | — |
| Profitability Warnings | **No explicit \"you are below minimum margin\" warning found in the calculation response schema** beyond the generic `warnings: [string]` array (used for missing-material/fallback notices, not margin alerts specifically) | — | — | — | — | Partially — see §5J for what IS confirmed | — |

### C. Material Cost Rules

| Rule | How Stored | Converted to Usable Cost | Applied To | Unit Conversion Needed | Auto-Updated from Vendor? | Cost Basis Used |
|---|---|---|---|---|---|---|
| Sheet/Roll/Sqft Pricing | `shop_cost_per_sqft` on each Material entry | Directly multiplied by waste-adjusted area | Area-based categories | Inches↔feet conversion for width/height inputs (confirmed: `area = (W×H)/144` if inches, `W×H` if feet) | No — confirmed, all costs are static manual entries, no vendor-feed integration found | Manual/default only — no \"actual vs. average vs. manual override\" distinction found in the schema beyond a single `manual_material_charge_per_sqft` override field |
| Unit Pricing (apparel blanks) | `default_blank_cost` / `shop_pricing_table` | Direct per-piece multiplication | Apparel only | None | No | Manual |
| Vendor Pricing / Bulk Pricing / Freight / Packaging / Outsourced Production | **Not modeled as distinct fields** — the closest is Services' generic `subcontract_cost` (manual entry, optional markup) and Promotional's manual vendor-cost-times-markup pattern | — | Services, Promotional | — | No | Manual |
| Waste/Scrap Percentages | `waste_percent` per category (5–15%) | Multiplies billable area before cost calc | All area-based categories | None | No | Fixed default, tenant-editable |
| Minimum Billable Size | `default_minimum_billable_area` (0.5–4.0 sqft by category) | `billable_area = max(actual_area, minimum)` | All area-based categories | None | No | Fixed default |
| Lamination/Overlaminate | Separate cost-per-sqft field per category (e.g., `laminate_gloss`, `laminate_matte`) | Added as its own cost bucket, only if toggled on | Digital Print, Banners, Vehicle Wraps | None | No | Manual |
| Ink Costs | Digital Print only — `$0.75/sqft × ink_coverage_percent/100` | Direct multiplication | Digital Print | None | No | Manual, with a user-adjustable coverage % input |
| Hardware Costs | Separate `hardware_accessories` array (buy cost + sell price per item) | Summed as flat add-on per selected item | Rigid Signs primarily | None | No | Manual, buy/sell pair per item (the only place in the whole system with an explicit cost/sell distinction on materials) |

**This confirms the Materials Library data structure (§1's recommended reference) is correct and consistent with what I directly read in `models/pricing.py` — every category-specific material table (banner materials, substrate types, vinyl types, print media, wrap materials) follows the exact same `{key, name, shop_cost_per_sqft, sell_rate_per_sqft}` shape.**

---

## 4. PRICING ONBOARDING QUIZZES

### A. Quiz Structure

| Quiz | Who Completes It | When It Appears | Skippable? | Resumable? | Reopenable? | Answers Stored | Affects |
|---|---|---|---|---|---|---|---|
| **Pricing Setup Quiz** (`PricingSetupQuiz.js`, 11 sections) | Owner/Admin | Settings → Pricing Foundation → \"Run Pricing Setup Quiz\" button (not forced during onboarding — opt-in, not blocking) | Yes — every individual question is skippable, and whole sections can be skipped | Not confirmed this session whether progress persists if the browser is closed mid-quiz — flagged as an Open Decision | Yes — it's a standing button on the Settings page, can be re-run any time | Answers are converted to *suggestions* shown on a Review screen; nothing is saved until the user explicitly clicks \"Apply Selected Defaults,\" then \"Save All\" on the main Pricing Foundation page (a deliberate two-step confirm, not silent auto-apply) | `category_defaults.*`, `labor.*`, `design.*` per the mapping table in §4B |
| **Shop Rate Quiz** (`ShopRateQuiz.js`) | Owner/Admin | Appears to be a narrower, standalone version focused specifically on shop/labor rates (not verified line-by-line against the 11-section quiz above this session — flagged as needing a quick follow-up read to confirm whether this is a subset/older version of the main quiz or a genuinely separate flow) | Not confirmed | Not confirmed | Not confirmed | Not confirmed | Labor rates specifically |
| **Banner Setup Wizard** (`BannerSetupWizard.js`, 7 steps) | Owner/Admin | Category-specific guided setup, likely launched from the Banners category card inside Pricing Foundation (not the general 11-section quiz) | Not confirmed | Not confirmed | Not confirmed | Writes directly to `category_defaults.banners` | Banners category only |
| **Historical Invoice Import** | Owner/Admin | Settings → Pricing Foundation → Historical Import | Yes, entirely optional third path | Yes — import records persist with a status field (`mapping_required → ready_for_analysis → analyzed → reviewed`), can be resumed at any stage | Yes | `pricing_imports` collection, accepted suggestions write to `pricing_configuration.selling_price_benchmarks` | Per-category `average_sell_price_per_sqft`/`per_unit`/`per_hour` benchmarks only — a narrower, benchmark-only effect compared to the full quiz |

**Open question flagged, not guessed:** Whether `BannerSetupWizard.js` and the quiz's Banner section (Section 2) are two different UIs writing to the *same* `category_defaults.banners` fields (redundant UI, one config target) or whether they've drifted into writing slightly different field subsets was not verified line-by-line this session — recommended as a pre-rebuild code-read task (see §13).

### B. Every Quiz Question (Pricing Setup Quiz — full detail already captured in `/app/memory/pricing_quiz_spec.md`, reproduced/organized here)

The quiz has **11 sections**: Shop Basics → Banners → Yard Signs/Coroplast → Rigid Signs → Cut Vinyl → Digital Print → Vehicle Graphics → Apparel → Services → Promotional/Custom → Labor & Design Time.

**Representative full detail (Section 1 — Shop Basics, the section every other section depends on conceptually):**

| Question | Input Type | Required? | Default | Setting Changed | Affects One or Many Categories? | Explanation Shown? |
|---|---|---|---|---|---|---|
| Design hourly rate | Number ($/hr) | Optional (skippable) | none pre-filled | `design_hourly_rate` | Many — every category's design-charge calculation | Not confirmed whether an inline \"this affects X\" preview is shown today — flagged for rebuild recommendation (§4D requires this) |
| Production hourly rate | Number ($/hr) | Optional | none | `production_hourly_rate` | Many | Same flag |
| Install hourly rate | Number ($/hr) | Optional | none | `install_hourly_rate` | Many | Same flag |
| Target profit margin % | Number (%) | Optional | none | `target_profit_margin_percent` | Global, informational (enforcement not confirmed — see §3B) | Same flag |
| Minimum order amount | Number ($) | Optional | none | `minimum_order` | Global floor | Same flag |
| Deposit required? | Yes/No toggle | Optional | No | Gates the next question | Global | — |
| Deposit % | Number (%), only shown if deposit required = Yes | Conditional | none | `deposit_percentage` | Global | — |

**Validation rules confirmed for this section (and, per the source spec, applied consistently across all sections):** hourly rates must be $10–$500/hr (soft warning outside range); profit margin capped at 95% (hard error above), warning if outside 10–75%; deposit % must be 0–100%.

For the remaining 10 sections (Banners through Labor & Design Time), the complete field-by-field table — every question's exact field key, input type, unit, target setting path, and the specific derivation formula the quiz uses to convert a real-world price answer into a Foundation default (e.g., \"banner 2×4 price ÷ 8 sqft, averaged across all sizes answered, becomes the banner sell-rate-per-sqft default\") — is fully documented in `/app/memory/pricing_quiz_spec.md` §2 through §11, and is incorporated by reference into this rebuild document rather than duplicated line-for-line here, per this session's efficient-synthesis instruction. Every one of those questions was verified in this source file to include: exact question text, field key, input type, required/optional status, and a fully worked derivation formula.

### C. Default Price Logic

For every quiz answer, the derivation pattern is consistent and confirmed:
1. **Direct-entry answers** (hourly rates, minimum charges, benchmark $/sqft you typed exactly) → written as-is to the target Foundation field, marked **High confidence**.
2. **Derived-from-real-prices answers** (e.g., \"what do you charge for a 3×6 banner\") → the quiz reverse-engineers a $/sqft rate by dividing your real price by the product's known square footage, then averages across every size you answered, marked **High confidence if 2+ data points, Review confidence if only 1**.
3. **Comparative answers** (e.g., \"price at qty 10 vs. qty 1\") → converted into a discount percentage via `round((1 - qty_n_price/qty_1_price) × 100)`, always marked **Review confidence** (a derived business inference, not a direct entry).
4. **Package/benchmark answers** (vehicle wrap package prices) → written directly to `benchmarks.*` fields as pricing floors, always marked **Review confidence** (these are guardrails, not formula inputs).

**Which categories inherit an answer:** Section 1 (Shop Basics) and Section 11 (Labor & Design Time) answers are global — they flow into every category's design/labor calculation. Every other section's answers are scoped to exactly one category (with the noted exception that the Promotional/Custom markup question writes to both categories simultaneously).

**Can the user override later?** Yes — every quiz-set value is just a normal field on `pricing_configuration`, editable directly in Settings → Pricing Foundation with no special \"locked because a quiz set this\" state.

**Where do overrides appear?** Directly on the same Pricing Foundation settings page/fields the quiz wrote to — there is no separate \"quiz answers\" view distinct from the live settings (confirmed no evidence of a stored *history* of quiz answers themselves, only their resulting derived values — meaning if a quiz answer and a later manual edit conflict, only the current live value is visible; the original quiz answer that produced it is not retained anywhere).

**Which override wins if multiple defaults conflict?** The **most-recently-saved value always wins** — there is no priority/precedence system at the config layer (confirmed: quiz-derived, import-derived, and manually-typed values all write to the exact same field via the exact same `PUT /pricing/defaults` endpoint; whichever was saved last is simply what's there). The *real* priority logic that matters happens at calculation time, not at config-save time — see §5H for the full override-priority chain used when actually pricing a specific quote/order.

### D. Recommended Rebuild Improvements

Based on the confirmed current behavior above, plus the explicit rebuild requirements given:
- **Progress indicator:** Add a persistent \"Section X of 11\" progress bar with save-state, since resumability was not confirmed to exist today.
- **Save-and-return-later:** Persist in-progress quiz answers (not just finished-quiz suggestions) to a draft document, so closing the browser mid-quiz doesn't lose partial answers — not confirmed to exist today, should be added.
- **Pre-filled recommended defaults:** The quiz currently starts blank (confirmed no pre-fill from industry-standard defaults) — rebuild could pre-fill with the system's own built-in category defaults (e.g., the $28/hr production rate, 2.5× markup) as a visible starting point the user edits rather than an empty field, reducing abandonment.
- **Plain-English explanations + preview of what each answer affects:** Not confirmed to exist today in the live quiz UI (the *specification* describes the mapping, but whether the *UI itself* shows \"this will set your banner rate to $X.XX/sqft\" inline, live, as you type, was not verified this session) — this is an explicit rebuild requirement and should be added if missing.
- **Edit all answers later in Settings:** Already true today (see §4C).
- **Reset only one category without resetting everything:** Not confirmed to exist as a distinct \"reset this category to defaults\" action today — recommended as a new, explicit button per category card in the rebuilt Pricing Foundation.
- **Show the math behind recommended defaults:** The Review screen already does this well (confirmed: shows \"Source Answer\" with the exact calculation used, e.g., \"Avg of 3 banner price answers: $8.25/sqft\") — this pattern should be preserved and extended to every suggestion, not just some.
- **No requirement to fill out irrelevant category questions:** Already true today (every question is individually skippable, and whole category sections can be skipped if a shop doesn't offer that product) — preserve this in the rebuild.

---

## 5. CATEGORY-BY-CATEGORY CALCULATOR SPECIFICATION

*Full rigorous treatment given to 3 representative categories (Banners, Vehicle Graphics/Wraps, Apparel) covering the 3 structurally distinct calculator families identified in §2. The remaining categories (Rigid Signs, Cut Vinyl, Digital Print, Services, Promotional, Custom) follow the same \"Compare Methods\" or \"Manual\" pattern as one of these three and are documented at matching depth for their formulas (already fully captured in `/app/memory/pricing_spec.md` §Category 2–4, 7–9) with a condensed cross-reference here to avoid duplicating ~800 lines of already-verified formula tables.*

---

### CATEGORY: BANNERS

**A. Category Purpose:** Prices soft-good, flexible printed products (13oz/18oz vinyl, mesh, blockout, pole, fabric, step-and-repeat backdrops). Typical users: any sign shop's counter/sales staff building a quote for walk-in or phone customers. Not currently sold through Webstores (Webstore products use the disconnected flat-price system, §1/§2). Not used by Wrap It!.

**B. Calculator Types available:** Quick Estimate (dimensions + material only, defaults everything else), Detailed Estimate (every finishing/hardware option below), the `compare_methods` engine itself (runs both a sqft-rate lookup AND a full material+labor cost-plus build, takes the higher), Manual Price Override (bypass entirely).

**C/D. Inputs (required + optional, combined per the source spec's completeness — every field already fully typed with label/unit/default in `pricing_spec.md`):**
Width, Height, Unit of Measure (required, no default — must be entered); Banner Material Type (required, defaults to none — must choose one of 13oz/18oz/Mesh/Blockout/Pole/Fabric/Double-Sided/Custom); Use Type, Double-Sided, Laminate/Coating, Hems, Grommets (+ custom count), Pole Pockets, Reinforced Corners, Wind Slits, Specialty Sewing (all optional, default = \"none\"/\"no\" → zero cost impact if left blank); Artwork Ready/Needed + Design Complexity (optional, default assumption is \"artwork needed, medium complexity\" unless explicitly marked ready); Install Required + Complexity (optional, default = not required); Hardware/Accessories multi-select (optional); Event Premium toggle (optional, off by default); Rush (optional, off by default); Packaging/Delivery notes (display-only, never affect price).

**E. Progressive Disclosure Rules:**

| Calculator Section | Default Visibility | Reveal Trigger | Why Hidden Initially | What It Affects | State |
|---|---|---|---|---|---|
| Width/Height/Unit/Material | Visible | Always shown (core Quick Mode fields) | N/A — these are the minimum viable inputs | Area, base material cost | Visible |
| Sidedness/Laminate/Hems/Grommets/Pole Pockets | Hidden under \"Finishing Options\" | User expands the section (manual click) | Most banners are single-sided, no special finishing — showing 8 fields by default overwhelms a simple order | Material + finishing add-on costs | Collapsed by default |
| Reinforced Corners/Wind Slits/Specialty Sewing | Hidden under \"Advanced Finishing\" | User expands \"Advanced\" within Finishing Options | Rare, specialty add-ons | Small flat add-on costs | Collapsed, nested one level deeper than the main finishing group |
| Design/Artwork fields | Visible only after \"Artwork Ready?\" is answered \"No\" | User answers the artwork-ready toggle | If artwork is ready, design fields are entirely irrelevant | Design hours/cost | Conditionally visible |
| Install fields | Visible only after \"Install Required?\" toggled Yes | User toggle | Not every banner needs install | Install hours/cost | Conditionally visible |
| Event/Step-and-Repeat Premium | Hidden unless Use Type = \"Event/Display\" or \"Backwall/Step-and-Repeat\" | Automatic, based on Use Type selection | Irrelevant multiplier for 95% of banner orders | 1.20× premium multiplier | Auto-revealed |
| Rush | Visible always (simple toggle, low cognitive cost) | N/A | N/A | Rush % surcharge | Always visible |
| Manual Price Override / cost breakdown / margin % | Hidden behind \"Show Calculation Details\" / requires Owner/Admin-level visibility (not confirmed as a hard permission gate this session — flagged) | User clicks \"Show Calculation Details,\" or has elevated role | Staff shouldn't need to see raw cost/margin to quote a banner; Owner/Admin may want to verify | Nothing (display-only) except Manual Override, which replaces the calculated price entirely | Collapsed / permission-gated (permission gate not confirmed) |

**F. Formula Breakdown** (already fully derived and verified in `pricing_spec.md` — restated here in the requested structured format):
- **Formula Name:** Banner Selling Price
- **Purpose:** Compute a defensible sell price for a single banner or batch of identical banners.
- **Inputs Used:** width, height, unit, material key, sidedness, all finishing toggles, quantity, complexity/install selections, rush toggle.
- **Formula in Plain English:** Take the bigger of the actual size or the 4 sqft minimum, add 8% waste, multiply by the material's cost-per-sqft plus a fixed print-consumable cost, then add up every finishing add-on (hems/grommets/pole-pockets/corners/wind-slits) based on the banner's perimeter, multiply the whole thing by a sidedness factor if double-sided, add production labor (a small fraction of an hour per sqft), add design labor if artwork isn't ready, add install labor if requested, add 15% overhead on the material+labor total, then take the largest of (that total × 2.35 markup), (area × the material's straight sell-rate), or the flat $35 minimum — finally apply any event-premium multiplier and the quantity discount tier.
- **Formula in Math Format:**
  ```
  billable_area = max(W×H, 4.0)
  waste_area = billable_area × 1.08
  material_cost = waste_area × (material_cost_per_sqft + 0.75)
  finishing_cost = Σ(perimeter-based hem/grommet/pole-pocket/sewing add-ons) + flat toggles (reinforced_corners=$6, wind_slits=$2)
  sidedness_mult = 1.0 | 1.75 | 2.0
  production_hours = max(total_area × 0.10, 0.20)
  design_hours = 0.5 × complexity_mult   [if artwork needed]
  install_hours = (total_area × 0.04 + 0.5) × install_complexity_mult   [if install required]
  overhead = 0.15 × (material_cost + labor_cost)
  total_cost = material_cost + finishing_cost + labor_cost + overhead
  selling_price = max(total_cost × 2.35, waste_area × sell_rate_per_sqft, 35.00) × sidedness_mult × event_premium_mult
  final_price = apply_quantity_discount(selling_price, quantity)
  ```
- **Default Values Used:** 4.0 sqft minimum, 8% waste, $0.75/sqft consumable, 2.35× markup, $35 minimum, $28/hr production rate, $85/hr design rate.
- **Category-Specific Rules:** Perimeter-based finishing costs are unique to Banners among all categories (every other category's add-ons are per-sqft or flat, not per-linear-foot).
- **Minimum Charges Applied:** $35.00 flat floor on the calculated total (before finishing add-ons, per the confirmed formula order — finishing/hardware costs are additive on top of the max() comparison, not inside it).
- **Quantity/Tier Adjustments:** 1–2 (0%), 3–9 (5%), 10–24 (10%), 25+ (15%).
- **Waste/Scrap Calculations:** 8% flat, applied once, before any per-unit multiplier.
- **Markup/Margin Logic:** 2.35× cost-plus, compared against straight sell-rate-per-sqft, higher wins.
- **Labor/Time Calculation:** Minute-based (production 0.10hr/sqft min 0.20hr; design 0.5hr base × complexity; install 0.04hr/sqft + 0.5hr base × complexity).
- **Installation Logic:** Only computed if `install_required = true`; complexity multiplier 1.0×–2.0×.
- **Rush Logic:** Category-configurable %, applied as a straight surcharge on the final price (not inside the cost-plus math).
- **Taxability Rules:** Not modeled at the category level — tax is applied later at the Order/Invoice level using the tenant's `default_tax_rate` (documented in the New Order Workflow investigation), not by this calculator.
- **Override Rules:** Manual Price Override replaces the entire computed `selling_price` before quantity discount/rush are applied (not confirmed whether manual override also bypasses quantity discount — flagged as an Open Decision).
- **Rounding Rules:** Not explicitly specified in the source material — flagged as an Open Decision (round to nearest cent? nearest dollar? not confirmed).
- **Final Selling Price Rule:** `max(cost_plus, sell_rate, minimum) × multipliers`, then quantity discount, then rush surcharge, then (if set) manual override replaces all of the above.

**G. Calculation Sequence (confirmed real order, not assumed):**
1. Validate width/height/unit and compute raw area.
2. Apply the 4.0 sqft minimum billable-area floor.
3. Apply 8% waste to get the waste-adjusted area.
4. Look up the selected material's cost-per-sqft and add the fixed print-consumable rate.
5. Compute material cost from waste-adjusted area.
6. Compute perimeter and calculate every selected finishing add-on (hems, grommets, pole pockets, corners, wind slits, sewing).
7. Apply the sidedness multiplier to material + finishing.
8. Compute production labor hours and cost.
9. Compute design labor hours and cost (skipped if artwork ready).
10. Compute install labor hours and cost (skipped if install not required).
11. Sum material + finishing + labor into a subtotal, apply 15% overhead on top.
12. Compare cost-plus (×2.35), sell-rate-based, and the $35 minimum — take the max.
13. Apply any event/step-and-repeat premium multiplier.
14. Apply the quantity discount tier based on order quantity.
15. Apply rush surcharge if selected.
16. If a manual override is set, it replaces the result of steps 1–15 entirely.
17. Save the full result (all intermediate numbers, not just the final price) as the `pricing_snapshot` on the Job Ticket.

**H. Default, Override, and Priority Rules — confirmed general priority chain (applies to every category, not just Banners):**
1. Global default (`pricing_configuration` top-level fields) — lowest priority, used only if a category has no specific override.
2. Category default (`category_defaults.<category>`) — overrides global for that category.
3. Material default (the specific material's own `shop_cost_per_sqft`/`sell_rate_per_sqft`) — overrides any generic category material assumption.
4. Product template default (a saved `pricing_templates` entry, if the user starts from one) — pre-fills the calculator's inputs, but any field the user then edits by hand overrides the template value.
5. Customer-specific price — **does not exist today; would sit here in priority if built** (see §8).
6. Webstore-specific price — **currently a totally separate, disconnected system, not actually part of this priority chain at all today** (see §1) — in the rebuild, this should become a real link in this same chain, not a parallel universe.
7. Quote/Order manual override — the highest-priority field-level override a Staff user can enter directly on a specific line item.
8. Manager/Admin override — not confirmed as a distinct permission tier from a general Staff override at the calculator level (flagged, see §6).
9. AI-recommended price — does not exist as an active feature today (see §9); would need explicit priority placement if built (recommended: below manual override, so a human always wins over an AI suggestion).
10. Promotional/discount code — does not exist anywhere in the pricing domain (no promo-code concept found).
11. Quantity tier — applied automatically, but can effectively be overridden if the user replaces the final price manually (manual override supersedes it).
12. Rush fee — applied automatically once \"rush\" is toggled; not independently overridable apart from toggling rush on/off.
13. Minimum charge rule — the true floor; confirmed always enforced unless a manual override intentionally goes below it (system does not appear to block a manual override from going below cost — see §5J warning gap).

**I. Outputs (per the standardized `PricingCalculation` response shape, confirmed real and shared across every category):** `suggested_price`, `total_cost`, `profit_margin_percent`, `material_cost`, `labor_cost`, `design_cost`, `setup_cost`, `finishing_cost`, `hardware_cost`, `install_cost`, `overhead_cost`, `estimated_labor_minutes`, `pricing_method`, `markup_multiplier`, `minimum_charge`, itemized `materials_breakdown`/`labor_breakdown`/`design_breakdown`/`finishing_breakdown`/`install_breakdown` arrays, `overhead_basis` (formula + components, fully explainable), `area_sqft`/`billable_sqft`/`quantity`/`width_inches`/`height_inches`/`waste_percentage`, `warnings[]`, and a `legacy_breakdown` debug dict. This response is what becomes the Job Ticket's `pricing_snapshot` when the user commits the calculation to an Order Item — no re-entry needed, satisfying the platform's non-negotiable rule that a calculator result must create/update an Order Item without duplicate data entry.

**J. Warnings and Guardrails (confirmed vs. not-confirmed):**
- **Confirmed to exist:** the generic `warnings: [string]` array is populated for things like a missing material lookup or a fallback being used (e.g., hours-based labor fallback firing because minute-based config is absent).
- **Not confirmed to exist as explicit, named warnings** (flagged, not invented): \"below minimum margin,\" \"manual override below cost,\" \"customer discount exceeds allowed amount\" (n/a, no discount system exists), \"material stock may be insufficient\" (would need to query the separately-documented Inventory domain, no evidence this cross-check happens today), \"AI recommendation outside normal range\" (n/a, no AI recommendation feature exists), \"pricing values are outdated\" (no staleness/last-updated warning found on materials).
- **Recommendation:** All of the above should be added in the rebuild as explicit, named warning types in the response schema rather than generic strings, so the frontend can render them with distinct icons/severity.

**K. Quote/Order/Invoice/Production Integration:** Confirmed real — `JobTicket.pricing_snapshot` stores the full calculation output; the same field name and shape appear on the Order model and (per the New Order Workflow investigation) on the legacy Quote/Invoice raw-dict shape too, though inconsistently. Feeds Work Order Summary/Production Task time estimates (via `estimated_labor_minutes`). Does not currently feed Inventory/material-usage tracking, Purchase Orders, or Reports (confirmed cross-reference: Profit & Margin Analytics reads the deprecated legacy `jobs` model, not this snapshot). Not connected to Webstores (confirmed disconnected system) or Wrap It! (n/a for Banners specifically, but the same integration gap exists for Vehicle Wraps' *own* category, see below).

**L. Test Scenarios:** Standard 3×6 outdoor banner with grommets, qty 1; large step-and-repeat backdrop with event premium, qty 3; small 2×2 banner below the 4 sqft minimum (verify the floor applies); qty-30 order to verify the 15% tier discount; rush order verifying the surcharge applies after quantity discount; double-sided different-art banner verifying the 2.0× multiplier stacks correctly with finishing add-ons; manual override entered below calculated cost (verify whether the system currently blocks this — expected: it does not, per §5J); artwork-ready=true (verify design cost is genuinely zero, not just hidden); install-required with high-access complexity.

---

### CATEGORY: VEHICLE GRAPHICS / WRAPS

**A. Category Purpose:** Prices vehicle graphics from spot lettering through full wraps. **Confirmed critical finding: this category exists in two disconnected implementations** — (1) the standard Pricing Foundation category (`vehicle_wraps`/`vehicle_graphics`, used by the generic \"Add Job Ticket\" flow like every other category), and (2) the Wrap Command Center's own independent `_compute_pricing_snapshot` function (`routes/wrap/core.py`) with its own `WrapPricingConfig` model, its own materials array, and its own pricing method enum (`per_sqft | material_labor_markup | manual`). Typical customer/order workflow differs depending on which entry point staff use. Not sold through Webstores in either form. **This IS \"Wrap It!\"** — the very add-on the platform rules explicitly name as forbidden to have a separate pricing engine, and it confirmedly has one.

**B. Calculator Types (Foundation implementation):** Compare Methods (sqft-rate vs. material+labor cost-plus vs. package-benchmark floor — a three-way comparison, unique to this category), Package Pricing (select a pre-defined coverage tier), Manual Override.

**Calculator Types (Wrap Command Center implementation — separate):** `per_sqft`, `material_labor_markup`, `manual` — a different, narrower 3-method enum than the Foundation's method system, confirming the two are not just differently-skinned UIs over the same engine but genuinely different calculation code.

**C/D. Inputs:** Vehicle Type (required — determines base sqft; Sedan=150 to Semi=800 sqft), Coverage Type (required: Spot/Partial/Half/Full/Custom%), Wrap Material (required), Laminate (optional, toggle), Window Perf (optional), Design fields (optional, default assumption: artwork needed, medium complexity, since most wraps require custom design), Surface Prep Level (optional, default \"none\"), Removal Scope (optional, default \"none\"), Install Difficulty + Seam Complexity (optional, default \"medium\"/\"basic\"), Second Installer (optional toggle), Rush (optional).

**E. Progressive Disclosure Rules:**

| Calculator Section | Default Visibility | Reveal Trigger | Why Hidden Initially | What It Affects | State |
|---|---|---|---|---|---|
| Vehicle Type/Coverage/Material | Visible (Quick Mode core) | Always | Minimum viable inputs | Base sqft, material cost | Visible |
| Custom Coverage % | Hidden | Coverage Type = \"Custom\" selected | Irrelevant for the 4 standard tiers | Overrides the default coverage % lookup | Auto-revealed |
| Laminate Type | Hidden | \"Laminate Required?\" toggled Yes | Most quick quotes don't need this detail upfront | Laminate cost | Auto-revealed |
| Window Perf Scope | Hidden | \"Window Perf Included?\" toggled Yes | Same reasoning | Window perf add-on cost | Auto-revealed |
| Design Complexity | Hidden | \"Artwork Needed?\" is Yes (the default) | Only relevant once design is confirmed needed | Design hours | Auto-revealed |
| Surface Prep/Removal | Under \"Advanced Options\" | User expands Advanced | Most jobs are on clean, ungraphic'd vehicles | Prep/removal labor hours | Collapsed by default |
| Install Difficulty/Seam Complexity/Second Installer | Under \"Install Details,\" revealed once Install Required confirmed | Install toggle | Not relevant if wrap is drop-ship/no-install | Install hours/cost | Conditionally visible |
| Package Benchmark comparison / cost breakdown | Behind \"Show Calculation Details\" | Manual click, or elevated role (not confirmed as a hard gate) | Same reasoning as Banners | Nothing displayed, informational only | Collapsed |

**F. Formula Breakdown:**
- **Formula in Plain English:** Look up the vehicle's base square footage, multiply by the coverage percentage (or use a manual sqft override), add waste (10–15% depending on coverage), price the material and laminate per sqft, add window-perf costs if included, compute design hours based on coverage size and complexity, compute surface-prep and removal hours if applicable, compute install hours from a per-vehicle-per-coverage lookup table (not a formula — a real table, e.g., a Cargo Van full wrap = 18 install hours) multiplied by difficulty/seam multipliers, add production labor for the wrap-application time itself, add 15% overhead, then take the largest of the cost-plus total (×2.4 markup) or the real-world package-benchmark price for that vehicle+coverage combination (a genuine \"does this look like what we'd actually charge\" floor, unique to this category) — finally add rush premium if selected.
- **Formula in Math Format:**
  ```
  base_sqft = vehicle_base_sqft_table[vehicle_type]
  coverage_pct = {spot:15%, partial:40%, half:55%, full:100%, custom:user_input}
  wrap_sqft = base_sqft × coverage_pct  [or manual override]
  waste_pct = {spot:10%, partial:12%, half:12%, full:15%, custom:12%}
  waste_sqft = wrap_sqft × (1 + waste_pct)
  material_cost = waste_sqft × wrap_material_cost_per_sqft
  laminate_cost = waste_sqft × laminate_cost_per_sqft   [if required]
  window_perf_cost = {rear:18sqft, side:14sqft, full:both} × their sell rates   [if included]
  design_hours = {spot:0.75, partial:1.5, half:2.0, full:3.0} × design_complexity_mult
  install_hours = vehicle_coverage_install_table[vehicle][coverage] × install_difficulty_mult × seam_complexity_mult
  install_cost = max(install_hours × $75/hr, $125) + (second_installer: hours × $35/hr)
  production_hours = max(wrap_sqft × 0.12, 1.0)
  overhead = 0.15 × (material_cost + labor_cost)
  cost_plus_price = total_cost × 2.4
  package_price = benchmark_table[vehicle][coverage]
  selling_price = max(cost_plus_price, package_price, $150.00) + window_perf_sell + rush_premium
  ```
- **Default Values Used:** vehicle base-sqft table (150–800), coverage-tier percentages, waste 10–15%, markup 2.4×, $150 absolute floor, $75/hr install (min $125), $28/hr production.
- **Category-Specific Rules:** This is the ONLY category with a real-world benchmark-price floor compared against cost-plus math — a deliberate guardrail against under-pricing a big, high-labor job based on formula math alone.
- **Minimum Charges Applied:** $150.00 absolute floor; $125 install minimum.
- **Quantity/Tier Adjustments:** Not applicable — vehicle wraps are inherently single-unit jobs, no quantity-discount table found for this category (correctly, since you don't wrap \"25 vans\" as a batch discount scenario the way you'd print 25 banners).
- **Waste/Scrap Calculations:** 10–15%, varies by coverage type (more waste on full wraps due to panel-matching/pattern complexity).
- **Markup/Margin Logic:** 2.4× cost-plus, vs. real package benchmark, higher wins (subject to the $150 absolute floor too).
- **Labor/Time Calculation:** Design is coverage-size-based; install is a genuine lookup table (not a formula) per vehicle+coverage combination; production is sqft-based.
- **Installation Logic:** The most sophisticated in the whole pricing system — real table lookups reflecting actual observed install-time variance by vehicle size, plus difficulty and seam-complexity multipliers, plus an optional second-installer add-on.
- **Rush Logic:** +30% (higher than most categories, reflecting the real difficulty of expediting a multi-day wrap job).
- **Taxability Rules:** Same as Banners — not handled at this layer.
- **Override Rules:** Manual coverage % override, manual sqft override, and a full Manual pricing method all exist as escape hatches.
- **Rounding Rules:** Not confirmed (same gap as Banners).
- **Final Selling Price Rule:** `max(cost_plus, package_benchmark, $150) + addons + rush` — but **only in the Foundation implementation**. The Wrap Command Center's separate `_compute_pricing_snapshot` uses its own, independently-coded version of a similar-but-not-identical formula (not verified line-by-line against this one this session, but confirmed structurally distinct by its own separate `WrapPricingConfig.pricing_method` enum) — meaning the same physical wrap job could produce two different suggested prices depending on which of the app's two entry points was used to price it.

**G. Calculation Sequence:** Same overall shape as Banners (steps 1–17 in §Banners.G), substituting vehicle-lookup for user-entered dimensions, and inserting the package-benchmark comparison as a third arm of the step-12 \"take the max\" comparison instead of just two arms.

**H. Priority Rules:** Same general chain as §Banners.H, with one category-specific addition: the package-benchmark price sits between \"category default\" and \"quote/order manual override\" in practical effect — it's not user-editable per-quote the way a manual override is, but it does override the pure-formula cost-plus result whenever it's higher, making it a de facto second layer of default above the raw formula.

**I. Outputs:** Same standardized shape as every other category, plus `pricing_method` will show whichever of the three comparison arms won (`sell_rate` vs `markup` vs the implicit \"package\" — not confirmed whether \"package\" is its own explicit value in the enum or folded into `markup`, flagged for verification).

**J. Warnings:** Same gaps as Banners (§5J), plus one category-specific one that should exist but wasn't confirmed: no warning surfaces when the Foundation price and the Wrap Command Center price for what should be the same job disagree — an obvious, direct consequence of the duplicate-engine problem, and a strong argument for fixing it before launch, not just noting it.

**K. Integration:** The Foundation implementation feeds Job Tickets the same way every other category does. The Wrap Command Center implementation feeds its own separate wrap-specific document/workflow (already documented in the New Order Workflow investigation as the *only* category with a working customer-facing quote-approval mechanism, ironically, despite being the one with the duplicate pricing engine problem). Neither implementation currently connects to Inventory material-usage or Reports.

**L. Test Scenarios:** Full wrap on a Sprinter van (verify install-hours lookup and package-benchmark floor both engage); spot graphics on a sedan (verify the 15% coverage and 10% waste); custom coverage % of 65% (verify it falls between half and full pricing sensibly); rush full wrap (verify 30% surcharge); wrap with window perf full package; wrap with second installer required; **explicitly price the identical vehicle+coverage+material combination through both the standard Job Ticket flow AND the Wrap Command Center, and confirm/document the price discrepancy** — this specific test is the most important one in this whole document for proving the duplicate-engine finding before the rebuild collapses them.

---

### CATEGORY: APPAREL

**A. Category Purpose:** Prices decorated apparel/promotional wearables (tees, hoodies, polos, caps) across 9 decoration methods. Sellable through Webstores **conceptually** (e.g., a team-store selling custom apparel) but confirmed **not actually connected** to this calculator today — Webstore apparel products would use the disconnected flat `retail_price` field, not this engine.

**B. Calculator Types:** Quantity Tier (the primary method) backed by a **shop pricing table lookup** rather than a formula — the shop owner directly fills in what they charge at each quantity break for each brand/style/placement combination, and the calculator just looks up the answer instead of computing one.

**C/D. Inputs:** Product Type + Brand/Style (required), per-size quantity fields (at least one required), Customer-Supplied Garments toggle (optional, removes blank cost if yes), Placement Set (required — determines which pricing-table column to read), Decoration Method (required — determines the add-on cost formula), Number of Colors/Stitch Count (conditionally required based on method — e.g., stitch count only matters for embroidery), Design fields (optional, same artwork-ready pattern as every other category), Custom Name/Number, Specialty Finish, Two-Tone Hat, Leather Patch, Bag & Fold (all optional flat per-piece add-ons), Rush (optional, category-specific default 17.5%), Manual Quote Override (optional, full bypass).

**E. Progressive Disclosure Rules:**

| Calculator Section | Default Visibility | Reveal Trigger | Why Hidden Initially | What It Affects | State |
|---|---|---|---|---|---|
| Product Type/Brand/Placement/Decoration Method | Visible | Always | Core inputs needed to even look up a table price | Which pricing-table row/column is read | Visible |
| Size breakdown grid (XS–5XL) | Visible but collapsed to a simple quantity field until \"specify sizes\" is clicked | User choice | Most quick quotes just need a total quantity | Plus-size upcharge calculation | Collapsed by default, expandable |
| Number of Colors / Stitch Count | Hidden until a decoration method that needs them is selected (e.g., stitch count only appears for Embroidery) | Automatic, based on Decoration Method selection | Irrelevant fields for 8 of 9 methods | Decoration cost formula | Auto-revealed, method-dependent |
| Custom Name/Number, Specialty Finish, Two-Tone, Leather Patch, Bag & Fold | Under \"Add-Ons,\" and hat-specific ones (two-tone, leather patch) only shown when Product Type is a hat | Section expand + product-type-conditional | Most orders don't need any of these five extras; hat-only ones are irrelevant for shirts | Flat per-piece add-on costs | Collapsed, further conditionally filtered by product type |
| Rush % Override / Manual Quote Override | Hidden behind \"Advanced Pricing Options,\" likely permission-relevant (not confirmed as a hard gate) | Manual click / elevated role | Bypassing the calculator entirely is not a default action | Replaces or surcharges the final price | Collapsed |

**F. Formula Breakdown:**
- **Formula in Plain English:** Sum every size field into a total quantity, and separately count how many are plus-sizes. Unless the customer supplied their own blanks, cost the blank garments at the shop's retail-base cost per piece plus a plus-size upcharge for the plus-size pieces. Cost the decoration itself using whichever formula matches the selected method (per-color for HTV/screen-print, per-1000-stitches for embroidery, per-square-inch for DTF/sublimation, flat per-piece for DTG/patches), plus that method's one-time setup fee. Multiply by a placement multiplier if decorating both front and back. Add flat per-piece charges for any selected extras. Add a small production-labor charge for setup and per-piece handling. Add design labor if artwork isn't ready. Compare the cost-plus total (×2.15) against a minimum-per-piece-times-quantity floor and a flat $60 per-order floor, take the higher, then add the rush surcharge — or, if a manual quote override is set, use that number instead of any of the above.
- **Formula in Math Format:**
  ```
  total_qty = Σ(size_xs..size_5xl)  [or manual total]
  plus_qty = Σ(size_2xl..size_5xl)
  blank_cost = (blank_retail_base × total_qty) + (plus_upcharge × plus_qty)   [unless customer_supplied]
  decoration_cost = method_specific_formula(num_colors | stitch_count | sqin_area, total_qty) + method_setup_fee
  placement_mult = {front_only:1.0, back_large:1.0, front_back:1.8, hat_front:1.0, hat_side_back:0.8, hat_front_side_back:1.5}
  addon_cost = Σ(selected flat per-piece extras × their per-piece rate × relevant qty)
  labor_cost = (setup_minutes × $28/hr) + (3 min/piece × total_qty × $28/hr)
  design_cost = 0.5hr × complexity_mult × $85/hr   [if artwork needed]
  total_cost = blank_cost + (decoration_cost × placement_mult) + addon_cost + labor_cost + design_cost
  selling_price = max(total_cost × 2.15, min_per_piece × total_qty, $60.00) + rush_premium
  [or manual_quote_override if set]
  ```
- **Default Values Used:** 2.15× markup, $60 minimum order, 17.5% default rush, per-method setup fees ($5–$30), $28/hr production, $85/hr design.
- **Category-Specific Rules:** This is the only category where the *primary* pricing path is a lookup table the shop owner fills in directly, not a cost-plus formula — the formula above is really the *fallback/cost-verification* path, while the `shop_pricing_table[brand][tier][placement]` direct lookup (from the Quiz, §4) is what actually determines the quoted price in the common case. This dual-path (table-first, formula-as-backup) is the single most-praised pattern in the source rebuild notes and should be generalized, per those notes, to Rigid Signs and Yard Signs too.
- **Minimum Charges Applied:** $60.00 flat per-order floor, plus a per-piece minimum.
- **Quantity/Tier Adjustments:** Built into the shop pricing table itself (different price per quantity break, e.g., qty-12 vs qty-24 tee price) rather than a separate discount-percentage step.
- **Waste/Scrap Calculations:** Not applicable — apparel has no material waste concept (blanks are unit-purchased, not area-cut).
- **Markup/Margin Logic:** 2.15× cost-plus as the formula-path fallback; the table-path has margin implicitly baked in by whatever the shop owner typed as their sell price.
- **Labor/Time Calculation:** Minute-based, setup + per-piece handling time.
- **Installation Logic:** Not applicable.
- **Rush Logic:** 17.5% default, explicitly overridable per-order (the only category confirmed to have a distinct rush-percent *override* field, not just an on/off toggle).
- **Taxability Rules:** Not handled at this layer (same as every category).
- **Override Rules:** Manual Quote Override is a first-class, named field for this category specifically (`apparel_manual_quote_override`), more explicit than the generic override pattern in other categories.
- **Rounding Rules:** Not confirmed.
- **Final Selling Price Rule:** `max(table_lookup_or_formula, minimums) + rush`, or manual override.

**G. Calculation Sequence:** 1) Sum sizes into total/plus-size quantities. 2) Determine blank cost (or zero if customer-supplied). 3) Look up decoration method's cost formula and setup fee. 4) Apply placement multiplier. 5) Add flat per-piece extras. 6) Add production labor. 7) Add design labor if needed. 8) Compare cost-plus vs. minimums, take the max. 9) Apply rush. 10) Apply manual override if set, replacing everything. 11) Save snapshot.

**H. Priority Rules:** Same general chain as Banners (§5.Banners.H), with the shop pricing table itself functioning as a \"category + product template default\" combined into one lookup, sitting above the raw cost-plus formula in practical effect (the formula is really the fallback when a table cell is empty, per the rebuild notes' description of this category's intended behavior).

**I. Outputs:** Same standardized shape, with `materials_breakdown` effectively representing blank-garment cost and `finishing_breakdown` representing decoration cost (confirmed the shape is generic/reused across categories even though the concepts map slightly differently for apparel).

**J. Warnings:** Same general gaps as other categories. Apparel-specific gap worth naming: no confirmed warning when a shop pricing table cell is empty and the formula fallback produces a very different price than nearby table cells would suggest (a real risk given the \"table is king, formula is backup\" design).

**K. Integration:** Same Job Ticket integration pattern as every category. Not connected to Webstores (confirmed disconnected, same as every category attempted through that channel). Decoration setup fees/methods could reasonably feed a Production Task time estimate the same way Vehicle Wraps' install-hours table does, but this specific linkage wasn't verified this session.

**L. Test Scenarios:** Standard 24-tee order, one-color HTV, front only; large 100-hoodie order at the top quantity tier; small 6-piece order below the $60 minimum (verify the floor applies); mixed-size order with several plus-sizes (verify upcharge); customer-supplied blanks (verify blank cost zeroes out); embroidery order with a high stitch count; rush order with the rush-percent override changed from the 17.5% default; manual quote override on a custom/oddball order; front-and-back placement (verify the 1.8× multiplier).

---

### Remaining Categories — Condensed Cross-Reference (full formulas already verified and available in `/app/memory/pricing_spec.md`)

**Rigid Signs:** Same \"Compare Methods\" family as Banners. Billable minimum 1.0 sqft, 5% waste, substrate-based material cost + graphic-method consumable cost, shape/finish-quality/thickness multiplier stack on labor, hardware line-items as flat sell-price add-ons, 2.45× markup, $25 minimum. Progressive disclosure: substrate/thickness/shape always visible; hardware selection and drill-prep behind an \"Options\" expand; design/install conditionally revealed exactly as in Banners. Rebuild note (already identified in source spec): this category is the prime candidate to adopt Apparel's table-first pattern for its extremely common Yard Sign sub-case (per the Quiz's dedicated Yard Sign section treating it almost as its own category already).

**Cut Vinyl:** Same family. Billable minimum 0.5 sqft, 10% waste, vinyl-type material cost + optional transfer-tape cost, color-count and weeding-complexity multipliers on labor, use-type multiplier on final sell price, surface-type multiplier on install, 2.3× markup, $20 minimum. Progressive disclosure: color count and weeding complexity only meaningfully matter once vinyl type is chosen; masking/file-cleanup are single toggles, always visible (low cognitive cost); surface type only revealed once install is toggled on.

**Digital Print:** Same family. Billable minimum 1.0 sqft, 10% waste, print-media cost + ink cost (coverage-% driven, unique to this category) + optional laminate/substrate-mounting cost, print-quality and contour-cut multipliers on labor, 2.3× markup, $20/item ($40/order floor). Progressive disclosure: ink coverage % only matters once a media/quality combination is chosen; contour-cut type and piece-separation only revealed for print jobs that plausibly need them (large-format cut graphics, not small flat posters — exact trigger condition not confirmed line-by-line, flagged).

**Services:** Time/unit family, not area-based. Billing unit selection (hour/flat/piece/sqft/etc.) fundamentally changes which sub-fields appear — the strongest real example of automatic-condition-driven progressive disclosure already in the app (travel/trip/equipment/subcontract fields only shown when their respective toggles are on). No markup multiplier on the base labor rate itself, but subcontracted work can optionally have markup applied; permit/external fees are explicitly pass-through, never marked up.

**Promotional/Custom:** Manual/pass-through family. Cost-plus with a single configurable markup multiplier (shared between both categories via the Quiz's Section 10), no formula complexity, minimal progressive disclosure needed since there are few fields to begin with.

---

## 6. QUICK MODE VS DETAILED MODE

**Quick Estimate Mode:**
- **Minimum fields required:** Dimensions (or vehicle type/apparel quantity) + one material/product selection — confirmed as the consistent minimum across every area-based category.
- **Default assumptions used:** Artwork needed (medium complexity) unless told otherwise, install not required unless toggled, no rush, standard (not premium) finish/quality tiers, single-sided.
- **What is automatically calculated:** Everything downstream of the minimum inputs — waste, overhead, labor minutes, the full cost-plus vs. sell-rate comparison.
- **What remains hidden:** Every \"Advanced\"/\"Options\" section identified per-category in §5E.
- **What warnings appear:** The generic `warnings[]` array only (confirmed gaps noted throughout §5J apply equally here).
- **When the app should recommend switching to Detailed Mode:** Not confirmed to exist as an explicit prompt today (e.g., \"this looks like it needs custom pricing, switch to Detailed?\") — recommended as a rebuild addition, triggered when a warning fires or when the calculated price is far below the category's typical range.
- **Can Quick Mode create a Quote or Order Item?** Yes, confirmed — the `pricing_snapshot` output is identical in shape regardless of which mode produced it.
- **Must it be reviewed before final invoice/production?** Not confirmed as an enforced gate today — recommended as a configurable tenant setting (some shops may want every Quick-Mode price double-checked by an Owner before it reaches an Invoice).

**Detailed Estimate Mode:**
- **All additional fields:** Every field cataloged per-category in §5D.
- **Advanced material controls:** Manual material-cost-per-sqft override, alternate material selection.
- **Labor/time controls:** Manual hour overrides (confirmed to exist for Services specifically; not confirmed as a universal per-category feature).
- **Custom markup/margin controls:** Not confirmed as a per-quote override field distinct from the category-level markup setting — flagged as an Open Decision (should a Staff user be able to type \"use 1.8× instead of 2.35× just for this quote\"? Not found today).
- **Installation/shipping/delivery details:** Confirmed present for Installation (complexity tiers); shipping/delivery is represented only as a free-text notes field (Banners' `delivery_notes`) with **no cost calculation at all** — confirmed gap, no shipping-cost formula exists anywhere in the pricing domain.
- **Multiple material options:** The Compare Methods engine itself is the closest thing to this (comparing sqft-rate vs. cost-plus for the SAME material), not a true \"try material A vs material B\" comparison — flagged as a possible rebuild enhancement, not a confirmed existing feature.
- **Manual price overrides:** Confirmed to exist per-category.
- **Internal notes:** Confirmed as free-text fields throughout (packaging/delivery/service notes) — always display-only, never price-affecting.
- **Cost/profit visibility rules:** Not confirmed as a hard permission gate distinct from the general \"Show Calculation Details\" toggle (see §5E's flagged uncertainty, repeated in §7).
- **Permission restrictions:** See §6/§12 — no `Permission.PRICING_*` enum exists; Foundation editing uses a role-string check (`owner/admin/platform_admin`), calculator *usage* has no restriction found.

**Calculation Transparency:**
- **\"Show Calculation Details\" drawer:** Confirmed to exist conceptually (referenced in the source specs and consistent with the `legacy_breakdown` full-debug-dict field in every response) — full breakdown of cost buckets, labor breakdown, material usage breakdown are all confirmed present in the standardized response shape (§5I).
- **Applied defaults vs. applied overrides:** Not confirmed to be visually distinguished in the UI today (i.e., does the breakdown show \"you're using the default $28/hr rate\" vs. \"you overrode to $35/hr\"?) — flagged as a rebuild-worthy transparency improvement.
- **Margin/profit calculation:** `profit_margin_percent` is confirmed present in every response.
- **Why a warning appeared:** Not confirmed to have explanatory text beyond the raw warning string itself — recommended to add a \"why\" tooltip in the rebuild.
- **Which quiz/default value influenced the result:** Not confirmed to be traceable from a specific calculation back to \"this number came from your Quiz answer on 2026-01-15\" — this is a real transparency gap, consistent with §4C's finding that original quiz answers aren't retained once converted into settings.

---

## 7. MATERIALS AND PRODUCT TEMPLATE CONNECTIONS

For each material, the confirmed schema (`models/pricing.py`, verified) pre-fills: `shop_cost_per_sqft` (material cost defaults), `suggested_material_charge_per_sqft`/`manual_material_charge_per_sqft` (sell-rate defaults), `waste_percent` (recommended waste, though the category-level waste_percent appears to be what's actually used in the confirmed formulas rather than a per-material override — flagged as needing verification of exactly which waste value wins if both exist), `compatible_categories` (which categories may select this material — confirmed present but not verified whether the calculator UI actually filters material choices by this field or just uses it informationally), `is_active` (soft-delete/hide flag).

- **Which category can use it:** Governed by `compatible_categories` and by which category's material-selection dropdown the frontend renders (e.g., banner materials only appear in the Banners calculator).
- **What it pre-fills:** cost-per-sqft, sell-rate-per-sqft.
- **Required options it creates:** None confirmed — materials don't appear to gate which *other* fields become required.
- **Dependent options it enables:** Not confirmed as a general pattern (e.g., does selecting \"Mesh Banner\" auto-suggest a specific laminate type? Not found).
- **Labor/setup defaults it triggers:** Not confirmed at the individual-material level — labor defaults are category-level, not material-level.
- **Default dimensions:** Not applicable for most categories except implicitly for Vehicle Graphics' vehicle-type base-sqft table, which functions like a \"material/product default dimension.\"
- **Minimum charges:** Category-level, not material-level (confirmed — no per-material minimum charge field found).
- **Required hardware:** Confirmed only for Rigid Signs' explicit hardware-selection multi-select; not an automatic \"this substrate requires this hardware\" rule.
- **Sellable via Webstores:** Confirmed **no** — no material/product template in this domain has any Webstore-facing field or flag at all, consistent with the disconnected-pricing finding.
- **Usable in Wrap It!:** Confirmed **no**, for the Foundation's own `vehicle_wraps` materials — the Wrap Command Center maintains its own separate materials array entirely (§1/§5 Vehicle Graphics finding).

---

## 8. CUSTOMER-SPECIFIC, WHOLESALE, AND SPECIAL PRICING

**Confirmed finding, not guessed: none of this exists in the current codebase.** Full-repo grep of `models/customer.py` and the pricing routes found zero fields for customer-specific discounts, price lists, wholesale/reseller tiers, tax-exempt pricing behavior (tax-exempt *status* exists on Customer per the New Order Workflow investigation, but it only affects the tax calculation at invoice time, not the underlying selling-price calculation), contract pricing, volume agreements, employee discounts, or promotional/discount codes.

- **Customer-specific discounts/price lists:** Do not exist.
- **Wholesale/reseller pricing:** Do not exist.
- **Tax-exempt customers:** Exists (`Customer.is_tax_exempt` per prior investigation), but only zeroes the tax-rate applied at invoicing — has zero interaction with the *selling price* calculated by this pricing engine.
- **Contract pricing / volume agreements:** Do not exist.
- **Employee discounts:** Do not exist.
- **Promotional pricing / discount codes:** Do not exist anywhere in this domain (only the automatic, quantity-based discount tiers already documented per-category — not a customer- or code-based mechanism).
- **Webstore owner revenue-share implications:** Documented separately in the Webstores domain (commission/profit-split logic exists there, per the Business Finance investigation's Webstore Analytics finding) — but again, disconnected from this pricing engine since Webstore products don't use it.
- **Manual override permissions:** See §12 — no dedicated permission tier confirmed; Foundation editing is role-string-gated, per-quote manual override doesn't appear to be separately gated at all.
- **Effect on profitability reporting:** N/A currently, since none of this exists; would need to flow into whichever reporting system the Business Finance domain rebuild settles on.
- **Shown/hidden from staff/customers:** N/A currently.

This entire section is a **net-new build for the rebuild**, not a \"fix an existing thing\" — flagged prominently as the largest single feature gap found in this whole pricing investigation relative to the requirements given.

---

## 9. AI PRICING FEATURES

| Feature | Status |
|---|---|
| AI estimate recommendations | **Does not exist.** `ai_prefill_overrides: {}` is a confirmed-empty placeholder on every category's defaults, never read or written anywhere in the codebase. |
| AI material recommendations | Does not exist. |
| AI labor/time recommendations | Does not exist. |
| AI market-price comparison | Does not exist (the Package Benchmark table for Vehicle Wraps is a static, manually-set guardrail, not an AI-driven market comparison). |
| AI explanation of unusual pricing | Does not exist. |
| AI margin warnings | Does not exist (see §3B — no confirmed margin-warning system at all, AI or otherwise). |
| AI product/category suggestions | Does not exist. |
| AI-assisted creation of calculator inputs from customer requests | Does not exist as a dedicated pricing feature — though the broader AI Business Assistant (documented separately) has generic tool-calling that could theoretically be extended to fill calculator fields from a chat request; not built for this domain specifically. |
| AI extraction of dimensions/materials from uploaded files/forms | **Partially exists** — the Historical Invoice Import flow (`routes/pricing_setup.py`) uses AI to extract line-item descriptions/quantities/totals/dimensions from uploaded past invoices (PDF/CSV/XLSX) and aggregate them into category benchmarks. This is a one-time, retrospective setup tool, not a live \"estimate this new job from an uploaded photo/sketch\" feature. |

**For the one real AI feature (Historical Invoice Import analysis):**
- **Inputs:** Uploaded invoice files + a user-provided column mapping (for CSV/XLSX) or raw text (for PDF).
- **Output:** Per-category benchmark suggestions (`average_sell_price_per_sqft`/`per_unit`/`per_hour`) with a confidence label.
- **Credit cost:** Uses AI credits (confirmed: `POST /imports/{id}/analyze` explicitly noted as credit-consuming in the source spec) — the exact credit amount was not re-verified against `services/credit_service.py`'s cost table this session, flagged for confirmation.
- **Confirmation requirement:** Yes — confirmed real, multi-step: upload → map → analyze → **explicit review/accept-or-reject per suggestion** before anything writes to `pricing_configuration.selling_price_benchmarks`. This already correctly satisfies the platform rule \"AI may recommend a price, but it must not silently overwrite a user's price.\"
- **Where result is saved:** `pricing_configuration.selling_price_benchmarks`, only for accepted suggestions.
- **Can it change the final price automatically?** No — benchmarks only ever function as a comparison-floor input to the existing formula engine, never as a direct price-setting action.
- **Activity/audit log requirement:** Not confirmed whether accepting an import suggestion writes an Activity Log entry — flagged for verification (cross-referencing the Activity Log investigation's finding that attribution is inconsistent across the app generally).
- **Failure behavior:** Not verified line-by-line this session.
- **Permission restrictions:** Same `ensure_admin_access` (`owner/admin/platform_admin`) gate as the rest of Pricing Foundation.

**Recommendation for the rebuild's genuinely-new AI Pricing Guidance feature (since none exists beyond the above):** If built, it must follow the exact same pattern already correctly established by Historical Import — suggest, never silently apply, require explicit accept, log the action, and never bypass the minimum-charge/margin floor rules documented in §3B/§5H.

---

## 10. DATA MODEL AND PRICING SNAPSHOTS

**Confirmed current structures (all verified directly against `models/pricing.py` and `models/orders.py` this session, cross-checked against the pre-existing spec's §14):**

- **Global pricing settings + category defaults + materials + hardware + benchmarks** — all currently live together in **one** `pricing_configuration` document per tenant (confirmed real, not assumed).
- **Product templates** — `pricing_templates` collection, confirmed real, correctly separate from the main config document.
- **Calculator configurations** — the `category_pricing_methods`/`category_setup_status` maps inside `pricing_configuration`.
- **Onboarding quiz answers** — confirmed **not separately persisted** as raw answers; only their *derived* settings values are saved, once applied. This means there's no \"quiz answer history\" table today.
- **Customer-specific pricing** — does not exist (§8).
- **Quote Item / Order Item pricing snapshots** — confirmed real and correctly implemented: `JobTicket.pricing_snapshot` (and the equivalent field on the Order/legacy-Quote models per the New Order Workflow investigation) stores the full calculation output at commit time, satisfying the platform's core snapshot requirement.
- **Historical price changes** — confirmed **does not exist** as an explicit audit log of \"material X's cost changed from $Y to $Z on this date\" — this is the rebuild note already correctly identified in the source spec (§16.9): only the *current* live config value is ever stored; there's no change-history collection.
- **Manual overrides** — captured only as part of a specific calculation's `pricing_method` metadata field and the final committed `pricing_snapshot`, not as a separately-flagged, queryable \"this line item was manually overridden\" record.
- **Discount records** — quantity-discount tiers are config, not \"records\" of an applied discount; no customer-facing discount-code redemption record exists (because the feature doesn't exist, §8).
- **Margin/profit calculations** — computed fresh on every calculation and stored inside that calculation's snapshot (`profit_margin_percent`), but — critically, cross-referencing the Business Finance investigation — **the aggregate reporting layer (Profit & Margin Analytics) does not read these snapshots at all**, reading the deprecated legacy `jobs` model instead. This means all the margin math this pricing engine correctly computes per-item is currently invisible at the reporting layer.
- **AI pricing recommendations** — n/a, don't exist (§9).
- **Pricing audit events** — not confirmed to exist as a distinct audit-log category; Pricing Foundation edits are not confirmed to write to any activity/audit log at all (consistent with the general activity-log-fragmentation pattern found across other domains in this investigation series).

**What must be a snapshot vs. live config, restated per the explicit ask:** Everything that goes into computing a specific dollar amount for a specific customer's specific Job Ticket must be frozen at commit time — material cost-per-sqft used, labor rate used, markup multiplier used, waste % used, every multiplier applied, and the final price. This is exactly what `pricing_snapshot` already correctly does. What must NOT be snapshotted, and should stay live/global: the *default* config itself, so that the next NEW quote correctly picks up any rate changes the shop owner makes going forward — old quotes staying frozen, new quotes reflecting the update. This distinction is already correctly implemented in the current system for Job Tickets; the gap is only that (a) there's no change-history log of the global config itself over time, and (b) the Wrap Command Center and Webstore paths don't participate in this snapshot discipline at all in the same unified way (each has its own separate storage for whatever pricing data it keeps).

---

## 11. RECOMMENDED REBUILD STRUCTURE

**Shared services/components required:**
- One `PricingEngine` service exposing a single `calculate(category, input, tenant_config) -> PricingResult` entry point — replacing the confirmed 4,500-line if/switch inside `server.py`.
- One `Money` value type (integer cents, per the source spec's §16.1 finding — confirmed real technical debt: every price today is a raw Python `float`).
- One `pricing_materials` collection (replacing the single flat array embedded in `pricing_configuration`) — confirmed real technical debt from the source spec (§16.4).
- One shared `Notification`/Activity-Log write-through whenever Pricing Foundation values change (currently missing).
- One genuine `CustomerPricingProfile` structure (net-new, §8).

**Recommended database models:** `PricingFoundationSettings` (global rates/overhead/design policy), `PricingMaterial` (own collection, one doc per material), `CategoryPricingConfig` (one doc per tenant+category, replacing the nested dict-of-dicts), `PricingTemplate` (already fine as-is), `CustomerPricingProfile` (net-new), `PricingChangeLog` (net-new, addressing §16.9), `PricingImport` (already fine as-is), `JobTicket.pricing_snapshot` (already fine as-is, keep this pattern, extend it consistently to Wrap Command Center and Webstores).

**Recommended calculator engine approach — explicitly answering the question posed:** **A hybrid approach**, not a single engine and not fully separate engines per family. Reasoning, grounded in what was actually confirmed this session:
- The four area-based categories (Banners, Rigid Signs, Cut Vinyl, Digital Print) are confirmed to share an almost identical skeleton (billable-area minimum → waste → material cost → multiplier stack → minute-based labor → overhead → compare-methods selling-price floor → quantity discount) — these four should be **one configurable engine with per-category templates** (config-driven, not four separate functions), directly matching how `category_defaults` is already structured today (a strong signal the *data model* already assumes this, even though the *code* currently implements four separate functions).
- Vehicle Graphics/Wraps shares that skeleton but adds a genuinely distinct third comparison arm (package benchmarks) and vehicle-lookup-table-driven install hours — it should reuse the shared engine's building blocks but needs its own template *type*, not a bespoke separate codebase (fixing the confirmed duplicate-engine problem by making the Wrap Command Center a consumer of this same engine, not a second implementation).
- Apparel's table-first, formula-as-fallback pattern is structurally different enough (no area/waste concept at all) to warrant its own dedicated calculator module, though it should still emit the exact same standardized output shape as everything else.
- Services and Promotional/Custom are simple enough (time×rate, or cost×markup) to be thin, dedicated modules with no shared engine needed.
- **Conclusion: one shared \"area-based compare-methods\" engine (serving 5 of 9 categories including Vehicle Graphics), plus 4 smaller dedicated modules (Apparel, Services, Promotional, Custom) — all emitting one common `PricingResult` shape.** This is a hybrid, and it's the right one because it matches the genuine structural similarity/difference already observed in the real formulas, rather than forcing either extreme.

**Recommended category configuration approach:** Keep the current `category_defaults.<category>` config-object pattern — it's already well-designed and is the reason a shared-engine-with-templates approach is feasible at all.

**Recommended onboarding quiz architecture:** Keep the current 11-section, skip-anything, review-before-apply design — it's genuinely good UX already; add the specific improvements listed in §4D (progress persistence, live \"what this affects\" preview, per-category reset).

**Recommended progressive-disclosure component pattern:** A single reusable `<ProgressiveField>` wrapper component taking a `visibleWhen` condition (a selector function against current form state) — since the exact same reveal-on-toggle / reveal-on-selection / collapsed-under-\"Advanced\" patterns repeat near-identically across every category (§5E tables), this should be one shared frontend primitive, not category-specific conditional JSX repeated nine times (which is very likely how it's implemented today given `PricingCalculator.js`'s 4,000+ line size — not confirmed line-by-line, but a reasonable inference from the file's size and the consistent pattern repetition documented in §5E).

**Recommended calculation transparency pattern:** One shared `<CalculationBreakdown>` drawer component reading directly off the standardized `PricingResult` shape's breakdown arrays (already confirmed to exist in a form close to this) — extend it to show which values are defaults vs. overrides (currently not confirmed to be distinguished, §6).

**Recommended permissions:** Add a real `Permission.PRICING_VIEW` / `PRICING_EDIT_FOUNDATION` / `PRICING_OVERRIDE` set to the shared RBAC enum (currently, Foundation editing is a hardcoded role-string check, and per-quote override has no confirmed gate at all) — this brings pricing in line with how the rest of the platform's permission system is *supposed* to work, even though (per the separately-documented New Order Workflow and other investigations) many other domains also fail to actually enforce their own permissions consistently.

**Recommended testing strategy:** Golden-formula unit tests per category (input → exact expected cents output) for every formula documented in §5, specifically including the already-identified edge cases (below-minimum area, exact quantity-tier boundaries, rush+override interaction) — plus one explicit cross-system test proving the Foundation and Wrap Command Center produce identical output once merged (the single most valuable regression test this investigation can recommend).

**Features to combine:** Wrap Command Center pricing into the shared engine (§1's top finding); Webstore product pricing into the shared engine, with a Webstore-specific \"override price shown to public customers\" field sitting at the correct point in the priority chain (§5H) rather than as a totally separate system; Promotional and Custom's near-identical markup-multiplier config (already effectively shared via the Quiz, per §4C).

**Features to simplify:** The two-mode labor system (minute-based vs. hours-based fallback) → commit to minutes-only per the source spec's §16.5 recommendation; `category_setup_status` → either give it real teeth (block calculation until setup is complete) or remove it as pure UI decoration.

**Features to postpone:** True AI Pricing Guidance beyond the existing Historical Import (§9) — build the foundation cleanly first, add AI recommendations once there's a trustworthy, unified engine for it to recommend against.

**Features that should not be rebuilt as-is:** The Wrap Command Center's separate pricing implementation (retire, don't port); Webstore's disconnected flat-price field (retire, don't port); the giant if/switch dispatch function (retire the *structure*, keep the *formulas* — they are correct and well-verified, just badly organized).

---

## 12. OPEN DECISIONS

1. **Should the rebuild enforce a real minimum-margin guardrail (blocking or warning when a manual override or calculated price falls below a configured target margin), given no such enforcement was confirmed to exist today despite a `target_profit_margin_percent` field already existing?**
   *Why it matters:* Currently a shop could unknowingly quote below cost with zero system warning.
   *Affected:* All categories.
   *Recommended options:* (a) hard block below cost, warn below target margin; (b) warn-only, never block.
   *Recommended default:* (b) warn-only for launch, escalate to configurable hard-block later — avoids blocking a legitimate loss-leader/relationship-pricing decision a shop owner might intentionally make.
   *Can proceed without it?* Yes, but should be prioritized early given it's a real, confirmed gap.

2. **Should customer-specific pricing (§8) be built as a flat discount-percent-per-customer, a full per-customer price list, or both?**
   *Why it matters:* Named as a core requirement but 0% built today.
   *Affected:* All categories.
   *Recommended default:* Start with a simple per-customer discount-percent field (fast to build, covers the most common real-world case — a shop's best customer gets 10% off everything) before investing in full per-customer price lists.
   *Can proceed without it?* Yes for MVP, but flag it as a near-term priority given how explicitly it was named.

3. **What is the correct, single, canonical overhead basis across all categories, resolving the confirmed inconsistency (§3B) where some categories include setup fees in the overhead basis and others don't?**
   *Recommended default:* Overhead = `material_cost + direct_labor_cost` only, everywhere — matching the source spec's own §16.7 recommendation, which this investigation independently agrees with after reviewing the same evidence.
   *Can proceed without it?* No — this should be locked before the rebuild's first category calculator is built, since it affects every category's formula.

4. **Should Wrap Command Center and Webstore pricing be merged into the shared engine immediately, or should the rebuild ship with them still separate and merge in a fast-follow?**
   *Why it matters:* This is a direct, confirmed platform-rule violation today.
   *Recommended default:* Merge Wrap Command Center in the same rebuild phase as Vehicle Graphics (they're the same underlying product category, so there's no reasonable way to sequence them apart). Webstore pricing can reasonably be a fast-follow within the same overall rebuild effort but should not be deferred indefinitely, since it's named explicitly in the platform's non-negotiable rules.
   *Can proceed without it?* The Vehicle Graphics merge cannot be deferred without leaving a known rule violation in place; the Webstore merge could technically be sequenced slightly later without blocking the core Foundation rebuild.

5. **Is the relationship between `BannerSetupWizard.js` and the Quiz's own Banner section (§4A) two redundant UIs writing to the same fields, or have they drifted apart?**
   *Why it matters:* Determines whether one should simply be retired in the rebuild.
   *Recommended default:* Retire the standalone wizard in favor of the unified Quiz once confirmed redundant — a single onboarding entry point is simpler to maintain and matches the platform's \"don't duplicate systems\" rule in spirit.
   *Can proceed without it?* Yes for the core pricing-engine rebuild; this is a UI-consolidation decision that can be resolved independently and later.

6. **Should a shipping/delivery cost formula be built (§6 confirmed gap — currently just a notes field), and if so, does it belong in this pricing domain or the separately-documented Order Fulfillment/Production domain?**
   *Recommended default:* Build it here as an optional per-category cost component (parallel to how Installation already works), since shipping cost is fundamentally a pricing input, not a fulfillment-tracking concern.
   *Can proceed without it?* Yes, reasonable to postpone — not currently a named blocking requirement.

---

## 13. FINAL BUILD READINESS SUMMARY

**Pricing categories fully understood:** Banners, Rigid Signs, Cut Vinyl, Digital Print, Apparel, Services, Promotional, Custom — all 8 have complete, verified formulas, inputs, and configuration structures (cross-verified against both the pre-existing specs and direct code reads of `models/pricing.py`).

**Pricing categories needing more investigation:** Vehicle Graphics/Wraps — the *formula* is fully understood, but the exact line-by-line divergence between the Foundation implementation and the Wrap Command Center's separate implementation needs a direct side-by-side code diff before rebuild (not fully diffed this session, only confirmed to be structurally distinct).

**Calculators ready for rebuild:** Banners, Rigid Signs, Cut Vinyl, Digital Print, Apparel, Services, Promotional, Custom — formulas are solid and can be ported into the recommended hybrid engine (§11) largely as-is, with the money-as-cents and overhead-basis-consistency fixes applied uniformly.

**Calculators requiring business-rule decisions before rebuild:** Vehicle Graphics/Wraps (Open Decision #4 — which implementation wins, and exactly how they currently differ); Webstore product pricing (needs the customer-facing price-override field designed, §11).

**Shared pricing rules ready to lock:** Waste-percentage-then-material-cost sequencing, minute-based labor calculation, the max(cost-plus, sell-rate, minimum) selling-price rule, quantity-discount tier application order, the standardized `PricingResult` output shape (already excellent and should be preserved close to as-is).

**Missing material or cost data:** None confirmed missing for the 8 \"ready\" categories — every material/labor default has a concrete, documented number. Vehicle Graphics/Wraps has two conflicting sets of numbers (Foundation vs. Wrap Command Center) rather than missing data — a reconciliation problem, not a data-gap problem.

**Recommended rebuild order:** 1) Lock the overhead-basis decision (#3) and the Money-as-cents change, since every category formula depends on both. 2) Build the shared area-based \"compare methods\" engine using Banners as the first fully-ported category (simplest complete example of every pattern). 3) Port Rigid Signs, Cut Vinyl, Digital Print onto the same engine. 4) Resolve and merge Vehicle Graphics/Wraps + Wrap Command Center (highest-value, highest-risk merge). 5) Port Apparel as its own module (table-first pattern). 6) Port Services, Promotional, Custom (simplest, lowest-risk). 7) Build the new Customer-Specific Pricing feature (§8) once the core engine is stable. 8) Merge Webstore pricing into the shared engine last (lowest urgency of the platform-rule violations, since it doesn't affect internal quoting accuracy the way the Wrap Command Center duplication does).

**Recommended first calculator to rebuild:** Banners — it exercises every major pattern (area/waste/material/multiplier-stack/labor/overhead/compare-methods/quantity-discount) in the simplest, most self-contained way, making it the ideal proof-of-concept for the new shared engine before tackling the more complex Vehicle Graphics merge.

**Recommended test data needed before implementation:** A real, current export of at least one live tenant's `pricing_configuration` document (to validate the new engine against real-world numbers, not just the documented defaults); a side-by-side capture of the same wrap job priced through both the Foundation and Wrap Command Center paths (to quantify exactly how much they currently disagree, informing the merge decision in Open Decision #4).
"
# Pricing Setup Quiz — Full Specification
**SignGuy AI | SignTists Lab**
*Generated: June 2026*

---

## Overview

The Pricing Setup Quiz is a **step-by-step wizard** inside Settings → Pricing Foundation.

**How to access:**
Settings → Pricing Foundation → click **"Run Pricing Setup Quiz"** button (top of the page)

**What it does:**
You answer real-world price questions about what you actually charge. The quiz converts your answers into suggested Pricing Foundation defaults. **Nothing is saved automatically** — you review each suggestion on the final screen, toggle which ones you want, then click **"Apply Selected Defaults."** You still need to click **"Save All"** on the Pricing Foundation page afterward.

**11 sections. Skip any question you are unsure about.**

---

## Quiz Flow

```
Step 1:  Shop Basics
Step 2:  Banners
Step 3:  Yard Signs / Coroplast
Step 4:  Rigid Signs
Step 5:  Cut Vinyl
Step 6:  Digital Print
Step 7:  Vehicle Graphics
Step 8:  Apparel
Step 9:  Services
Step 10: Promotional / Custom
Step 11: Labor & Design Time
────────────────────────────
Review Screen: Toggle suggestions → Apply Selected Defaults
```

---

## Section 1 — Shop Basics

*Your hourly rates, minimums, and target margin.*

| Question | Field Key | Type | Unit | Maps To Setting | Notes |
|---|---|---|---|---|---|
| Design hourly rate | `design_hourly_rate` | Number | $/hr | `design_hourly_rate` | What you charge per hour of graphic design work |
| Production hourly rate | `production_hourly_rate` | Number | $/hr | `production_hourly_rate` | Shop floor labor (printing, weeding, finishing) |
| Install hourly rate | `install_hourly_rate` | Number | $/hr | `install_hourly_rate` | Field installation labor |
| Target profit margin | `target_profit_margin_percent` | Number | % | `target_profit_margin_percent` | The profit % you want on most jobs |
| Minimum order amount | `minimum_order` | Number | $/order | `minimum_order` | Smallest order you accept |
| Do you require a deposit? | `deposit_required` | Yes/No toggle | — | Gates `deposit_percentage` suggestion | |
| Deposit % | `deposit_percentage` | Number | % | `deposit_percentage` | Only used if deposit_required = Yes |

**Validation rules:**
- Hourly rates: must be $10–$500/hr (warning if outside range)
- Profit margin: max 95% (error above), warning if over 75% or under 10%
- Deposit: must be 0–100%

---

## Section 2 — Banners

*Standard 13oz vinyl banners with hems and grommets.*

| Question | Field Key | Type | Unit | Maps To Setting | Calculation Used |
|---|---|---|---|---|---|
| 2ft × 4ft banner price | `banner_2x4` | Number | $/each | `category_defaults.banners.sell_rate_defaults.base_rate` | ÷ 8 sqft = $/sqft |
| 3ft × 6ft banner price | `banner_3x6` | Number | $/each | Same as above (averaged) | ÷ 18 sqft = $/sqft |
| 4ft × 8ft banner price | `banner_4x8` | Number | $/each | Same as above (averaged) | ÷ 32 sqft = $/sqft |
| Are hems and grommets usually included? | `banner_finishing_included` | Yes/No toggle | — | Informational only | No direct field mapping |

**How the AI converts your answers:**
- Takes all banner prices you answered → divides each by its square footage → averages them → sets as **banner sell rate per sqft**
- The smallest banner price you answered → sets as **banner minimum sell price per item**
- Confidence is "High" if you answered 2+ sizes, "Review" if only 1

**Suggested setting paths:**
```
Banner sell rate/sqft → category_defaults.banners.sell_rate_defaults.base_rate
Banner minimum sell  → category_defaults.banners.default_minimum_sell_price
```

---

## Section 3 — Yard Signs / Coroplast

*18in × 24in single-sided coroplast yard signs.*

| Question | Field Key | Type | Unit | Maps To Setting | Notes |
|---|---|---|---|---|---|
| Price for 1 yard sign | `yard_qty_1` | Number | $/each | `category_defaults.rigid_signs.default_minimum_sell_price` | Sets the qty-1 minimum floor |
| Price for 10 yard signs | `yard_qty_10` | Number | $/each | `category_defaults.rigid_signs.quantity_breaks.qty_10_percent` | Qty discount derived vs qty-1 |
| Price for 25 yard signs | `yard_qty_25` | Number | $/each | `category_defaults.rigid_signs.sell_rate_defaults.yard_sign_rate` + qty discount | Also used for mid-qty sell rate |
| Price for 50 yard signs | `yard_qty_50` | Number | $/each | Qty discount derived vs qty-1 | Used if qty-25 not answered |
| Are stakes included? | `yard_stakes_included` | Yes/No toggle | — | Informational only | No direct field mapping |

**How the AI converts your answers:**
- 18 × 24in = 3 sqft. Takes mid-quantity price (qty-25, then 10, then 50, then 1) ÷ 3 sqft = **yard sign sell rate/sqft**
- Qty-1 price → **minimum sell price per item**
- If qty-10 < qty-1: calculates `round((1 - qty10/qty1) × 100)%` → **qty 10 discount %**
- If qty-25 < qty-1: calculates `round((1 - qty25/qty1) × 100)%` → **qty 25 discount %**

**Suggested setting paths:**
```
Yard sign sell rate   → category_defaults.rigid_signs.sell_rate_defaults.yard_sign_rate
Minimum sell price   → category_defaults.rigid_signs.default_minimum_sell_price
Qty 10 discount %    → category_defaults.rigid_signs.quantity_breaks.qty_10_percent
Qty 25 discount %    → category_defaults.rigid_signs.quantity_breaks.qty_25_percent
```

---

## Section 4 — Rigid Signs

*Standard substrates with direct-print or applied vinyl.*

| Question | Field Key | Type | Unit | Maps To Setting | Size for $/sqft calc |
|---|---|---|---|---|---|
| 4ft × 4ft coroplast sign | `rigid_coroplast_4x4` | Number | $/each | `category_defaults.rigid_signs.sell_rate_defaults.base_rate` | ÷ 16 sqft |
| 4ft × 8ft coroplast sign | `rigid_coroplast_4x8` | Number | $/each | Same (averaged) | ÷ 32 sqft |
| 4ft × 8ft ACM / composite | `rigid_acm_4x8` | Number | $/each | Same (averaged) | ÷ 32 sqft |
| 4ft × 8ft PVC sign | `rigid_pvc_4x8` | Number | $/each | Same (averaged) | ÷ 32 sqft |

**How the AI converts your answers:**
- Each price ÷ its square footage = $/sqft rate
- Averages all answered rates → **rigid sign base sell rate/sqft**
- Confidence is "High" if 2+ answered, "Review" if only 1

**Suggested setting path:**
```
Rigid sign sell rate → category_defaults.rigid_signs.sell_rate_defaults.base_rate
```

---

## Section 5 — Cut Vinyl

*Plotter-cut decals — one color unless noted.*

| Question | Field Key | Type | Unit | Maps To Setting | Notes |
|---|---|---|---|---|---|
| 12in × 24in one-color decal | `cv_12x24_one_color` | Number | $/each | `category_defaults.cut_vinyl.sell_rate_defaults.base_rate` | ÷ 2 sqft |
| 24in × 36in one-color decal | `cv_24x36_one_color` | Number | $/each | Same (averaged) | ÷ 6 sqft |
| 24in × 36in two-color decal | `cv_24x36_two_color` | Number | $/each | Same (averaged) | ÷ 6 sqft ÷ 2 (two layers) |
| Minimum vinyl decal charge | `cv_minimum_charge` | Number | $/order | `category_defaults.cut_vinyl.default_minimum_sell_price` | Direct mapping |

**How the AI converts your answers:**
- One-color rates: price ÷ sqft = $/sqft
- Two-color rate: price ÷ sqft ÷ 2 = $/sqft per color layer (normalizes to one-color equivalent)
- Averages all three → **cut vinyl base sell rate/sqft**
- Minimum charge → direct mapping, confidence "High"

**Suggested setting paths:**
```
Cut vinyl sell rate → category_defaults.cut_vinyl.sell_rate_defaults.base_rate
Minimum charge     → category_defaults.cut_vinyl.default_minimum_sell_price
```

---

## Section 6 — Digital Print

*Printed adhesive / paper / panels.*

| Question | Field Key | Type | Unit | Maps To Setting | Notes |
|---|---|---|---|---|---|
| 24in × 36in poster | `dp_24x36_poster` | Number | $/each | `category_defaults.digital_print.sell_rate_defaults.base_rate` | ÷ 6 sqft |
| 24in × 36in adhesive print | `dp_24x36_adhesive` | Number | $/each | Same (averaged) | ÷ 6 sqft |
| 24in × 36in laminated adhesive | `dp_24x36_adhesive_lam` | Number | $/each | `category_defaults.digital_print.sell_rate_defaults.laminate_addon_per_sqft` | Used to derive laminate add-on |
| 4ft × 8ft printed panel | `dp_4x8_panel` | Number | $/each | Same as base rate (averaged) | ÷ 32 sqft |

**How the AI converts your answers:**
- Poster, adhesive, and 4x8 panel rates averaged → **digital print base sell rate/sqft**
- If you answered both laminated and non-laminated 24×36: `(laminated − adhesive) ÷ 6 sqft` = **laminate add-on per sqft**

**Suggested setting paths:**
```
Digital print sell rate → category_defaults.digital_print.sell_rate_defaults.base_rate
Laminate add-on/sqft   → category_defaults.digital_print.sell_rate_defaults.laminate_addon_per_sqft
```

---

## Section 7 — Vehicle Graphics

*Door lettering up to full vehicle wraps.*

| Question | Field Key | Type | Unit | Maps To Setting | Notes |
|---|---|---|---|---|---|
| Basic pickup door lettering | `vg_door_lettering` | Number | $/job | `category_defaults.vehicle_graphics.benchmarks.package_door_lettering` | Review confidence |
| Spot graphics on a van | `vg_spot_van` | Number | $/job | `category_defaults.vehicle_graphics.benchmarks.package_spot_graphics` | Review confidence |
| Partial wrap on a cargo van | `vg_partial_wrap` | Number | $/job | `category_defaults.vehicle_graphics.benchmarks.package_partial_wrap` | Review confidence |
| Full wrap on a cargo van | `vg_full_wrap` | Number | $/job | `category_defaults.vehicle_graphics.benchmarks.package_full_wrap` | Review confidence |
| Printed wrap sell rate | `vg_print_sqft_rate` | Number | $/sqft | `category_defaults.vehicle_graphics.sell_rate_defaults.printed_wrap_per_sqft` | High confidence |
| Color-change wrap sell rate | `vg_color_change_sqft` | Number | $/sqft | `category_defaults.vehicle_graphics.sell_rate_defaults.color_change_per_sqft` | High confidence |

**How the AI converts your answers:**
- Sqft rates → direct mapping (High confidence — you entered them exactly)
- Package prices (door, spot, partial, full) → mapped to benchmark price guardrails for vehicle wraps (Review confidence — these are your benchmarks, not formulas)

**Suggested setting paths:**
```
Printed wrap $/sqft         → category_defaults.vehicle_graphics.sell_rate_defaults.printed_wrap_per_sqft
Color-change $/sqft         → category_defaults.vehicle_graphics.sell_rate_defaults.color_change_per_sqft
Door lettering benchmark    → category_defaults.vehicle_graphics.benchmarks.package_door_lettering
Spot graphics benchmark     → category_defaults.vehicle_graphics.benchmarks.package_spot_graphics
Partial wrap benchmark      → category_defaults.vehicle_graphics.benchmarks.package_partial_wrap
Full wrap benchmark         → category_defaults.vehicle_graphics.benchmarks.package_full_wrap
```

---

## Section 8 — Apparel

*T-shirts and hoodies with one-color heat transfer.*

| Question | Field Key | Type | Unit | Maps To Setting | Notes |
|---|---|---|---|---|---|
| 12 × one-sided T-shirts (per shirt) | `ap_tee_qty_12_one_side` | Number | $/each | `category_defaults.apparel.shop_pricing_table.tee_one_side.qty_12` | Review confidence |
| 24 × one-sided T-shirts (per shirt) | `ap_tee_qty_24_one_side` | Number | $/each | `category_defaults.apparel.shop_pricing_table.tee_one_side.qty_24` | Review confidence |
| 12 × front-and-back T-shirts (per shirt) | `ap_tee_qty_12_two_side` | Number | $/each | Informational — not yet directly mapped | Reference only |
| Average blank shirt cost | `ap_blank_cost` | Number | $/each | `category_defaults.apparel.default_blank_cost` | High confidence |
| Average transfer / decorating cost | `ap_decoration_cost` | Number | $/each | `category_defaults.apparel.default_decoration_cost` | High confidence |
| Hoodie price (per piece) | `ap_hoodie_each` | Number | $/each | `category_defaults.apparel.shop_pricing_table.hoodie_one_side.qty_24` | Review confidence |

**How the AI converts your answers:**
- Blank cost and decoration cost → direct cost-field mappings (High confidence)
- Per-shirt prices at different quantities → populate the shop pricing table tiers (Review confidence)

**Suggested setting paths:**
```
Default blank cost          → category_defaults.apparel.default_blank_cost
Default decoration cost     → category_defaults.apparel.default_decoration_cost
Tier 12 tee sell price      → category_defaults.apparel.shop_pricing_table.tee_one_side.qty_12
Tier 24 tee sell price      → category_defaults.apparel.shop_pricing_table.tee_one_side.qty_24
Hoodie tier price           → category_defaults.apparel.shop_pricing_table.hoodie_one_side.qty_24
```

---

## Section 9 — Services

*Hourly rates and minimum service charges.*

| Question | Field Key | Type | Unit | Maps To Setting | Notes |
|---|---|---|---|---|---|
| Design rate | `svc_design_rate` | Number | $/hr | `category_defaults.services.labor_rate_overrides.design` | If same as Shop Basics, skip |
| Production rate | `svc_production_rate` | Number | $/hr | `category_defaults.services.labor_rate_overrides.production` | |
| Install rate | `svc_install_rate` | Number | $/hr | `category_defaults.services.labor_rate_overrides.install` | |
| Minimum design charge | `svc_min_design` | Number | $/job | `category_defaults.services.minimums.design` | Smallest design invoice |
| Minimum install charge | `svc_min_install` | Number | $/job | `category_defaults.services.minimums.install` | Smallest install invoice |

**Note:** If you already answered the hourly rates in Section 1 (Shop Basics), the same rates will be set in both the global and services-specific fields. You can skip this section if rates are the same.

**Suggested setting paths:**
```
Service design rate   → category_defaults.services.labor_rate_overrides.design
Service prod rate     → category_defaults.services.labor_rate_overrides.production
Service install rate  → category_defaults.services.labor_rate_overrides.install
Min design charge     → category_defaults.services.minimums.design
Min install charge    → category_defaults.services.minimums.install
```

---

## Section 10 — Promotional / Custom

*Outsourced and vendor work.*

| Question | Field Key | Type | Unit | Maps To Setting | Notes |
|---|---|---|---|---|---|
| Markup on outsourced items | `pc_vendor_markup_percent` | Number | % | `category_defaults.promotional.default_markup_multiplier` AND `category_defaults.custom.default_markup_multiplier` | Converted: % → multiplier (e.g., 50% → 1.5×) |
| Minimum setup fee | `pc_min_setup_fee` | Number | $/job | `category_defaults.promotional.minimum_setup_fee` | |
| Minimum order amount | `pc_min_order` | Number | $/order | `category_defaults.promotional.minimum_charge` | |

**How the AI converts your answers:**
- Vendor markup % → `1 + (percent / 100)` = multiplier. E.g., you enter 50% → system stores 1.50×
- Multiplier is applied to BOTH Promotional and Custom categories

**Suggested setting paths:**
```
Promo markup multiplier  → category_defaults.promotional.default_markup_multiplier
Custom markup multiplier → category_defaults.custom.default_markup_multiplier
Minimum setup fee        → category_defaults.promotional.minimum_setup_fee
Minimum order            → category_defaults.promotional.minimum_charge
```

---

## Section 11 — Labor & Design Time

*Realistic production and design time assumptions to avoid overestimating labor costs.*

| Question | Field Key | Type | Unit | Maps To Setting | Notes |
|---|---|---|---|---|---|
| Normal shop labor rate | `shop_labor_rate` | Number | $/hr | `labor.shop_labor_rate` | Standard production labor per hour |
| Include production labor in customer pricing? | `include_labor_in_price` | Choice | yes / no | `labor.include_labor_in_price` | "No" = tracked internally but not on quotes |
| Charge separately for design/artwork? | `charge_design_separately` | Choice | yes / no / sometimes | `design.charge_design_separately` | Whether design is a separate line item |
| Design/artwork rate | `default_design_rate` | Number | $/hr | `design.default_design_rate` | Rate when design is billed separately |
| Basic design minutes included | `included_design_minutes` | Number | mins | `design.included_design_minutes` | Free design minutes before charging extra |
| Basic banner production/finishing minutes | `banner_production_minutes` | Number | mins | `category_defaults.banners.production_minutes_basic` | Total time for a simple banner (e.g., 20 mins) |
| Basic rigid sign production/finishing minutes | `rigid_sign_production_minutes` | Number | mins | `category_defaults.rigid_signs.production_minutes_basic` | Total time for a simple rigid sign (e.g., 20 mins) |
| Yard sign batch setup minutes | `yard_sign_setup_minutes` | Number | mins | `category_defaults.rigid_signs.yard_sign_setup_minutes` | One-time setup per batch (e.g., 10 mins) |
| Yard sign production minutes per sign | `yard_sign_minutes_per_sign` | Number | mins | `category_defaults.rigid_signs.yard_sign_minutes_per_sign` | Time per individual yard sign (e.g., 2 mins) |
| Basic cut vinyl production/weeding minutes | `cut_vinyl_production_minutes` | Number | mins | `category_defaults.cut_vinyl.production_minutes_basic` | Total time for simple vinyl job (e.g., 30 mins) |
| Basic decal/print production/finishing minutes | `digital_print_production_minutes` | Number | mins | `category_defaults.digital_print.production_minutes_basic` | Total time for simple digital print (e.g., 20 mins) |
| Simple vehicle lettering setup/production minutes | `vehicle_lettering_setup_minutes` | Number | mins | `category_defaults.vehicle_graphics.lettering_setup_minutes` | Time for basic vehicle lettering (e.g., 60 mins) |
| Apparel order setup minutes | `apparel_setup_minutes` | Number | mins | `category_defaults.apparel.setup_minutes_per_order` | Setup time per apparel order (e.g., 15 mins) |
| Apparel production minutes per item | `apparel_minutes_per_item` | Number | mins | `category_defaults.apparel.production_minutes_per_item` | Time per individual apparel piece (e.g., 3 mins) |

**Why this matters:** The minute-based labor system gives more accurate cost calculations than the old hours-per-sqft estimates. These times feed directly into the labor cost component of every quote.

**Suggested setting paths:**
```
Shop labor rate         → labor.shop_labor_rate
Include labor in price  → labor.include_labor_in_price
Charge design sep.      → design.charge_design_separately
Default design rate     → design.default_design_rate
Included design mins    → design.included_design_minutes
Banner prod mins        → category_defaults.banners.production_minutes_basic
Rigid sign prod mins    → category_defaults.rigid_signs.production_minutes_basic
Yard sign setup mins    → category_defaults.rigid_signs.yard_sign_setup_minutes
Yard sign mins/sign     → category_defaults.rigid_signs.yard_sign_minutes_per_sign
Cut vinyl prod mins     → category_defaults.cut_vinyl.production_minutes_basic
Digital print prod mins → category_defaults.digital_print.production_minutes_basic
Vehicle lettering mins  → category_defaults.vehicle_graphics.lettering_setup_minutes
Apparel setup mins      → category_defaults.apparel.setup_minutes_per_order
Apparel mins/item       → category_defaults.apparel.production_minutes_per_item
```

---

## Review Screen — How Suggestions Are Scored

After completing all sections, the quiz generates a list of suggested defaults with one of two confidence levels:

| Confidence | Badge | Behavior | When Used |
|---|---|---|---|
| **High** | Green "Recommended" | Auto-selected to apply | Direct entries (hourly rates, minimums, $/sqft you entered) or averages from 2+ data points |
| **Review** | Amber "Review recommended" | Not auto-selected — you must toggle on | Derived calculations (quantity discounts, package benchmarks, single data points) |

The review screen shows:
- **Field** — which Pricing Foundation field this updates
- **Source Answer** — exactly what calculation was used (e.g., "Avg of 3 banner price answers: $8.25/sqft")
- **Current** — what the field is set to right now
- **Suggested** — what the quiz wants to change it to
- **Toggle** — include or exclude this suggestion

---

## Complete Question → Settings Mapping Reference

| Quiz Answer | Maps To Path | Confidence |
|---|---|---|
| Design hourly rate | `design_hourly_rate` | High |
| Production hourly rate | `production_hourly_rate` | High |
| Install hourly rate | `install_hourly_rate` | High |
| Target profit margin % | `target_profit_margin_percent` | High |
| Minimum order | `minimum_order` | High |
| Deposit % | `deposit_percentage` | High |
| Banner 2x4/3x6/4x8 prices | `category_defaults.banners.sell_rate_defaults.base_rate` | High (2+) / Review (1) |
| Smallest banner price | `category_defaults.banners.default_minimum_sell_price` | Review |
| Yard sign qty-25 price | `category_defaults.rigid_signs.sell_rate_defaults.yard_sign_rate` | Review |
| Yard sign qty-1 price | `category_defaults.rigid_signs.default_minimum_sell_price` | Review |
| Yard sign qty-10 vs qty-1 | `category_defaults.rigid_signs.quantity_breaks.qty_10_percent` | Review |
| Yard sign qty-25 vs qty-1 | `category_defaults.rigid_signs.quantity_breaks.qty_25_percent` | Review |
| Rigid sign prices avg | `category_defaults.rigid_signs.sell_rate_defaults.base_rate` | High (2+) / Review (1) |
| Cut vinyl prices avg | `category_defaults.cut_vinyl.sell_rate_defaults.base_rate` | High (2+) / Review (1) |
| Cut vinyl minimum charge | `category_defaults.cut_vinyl.default_minimum_sell_price` | High |
| Digital print prices avg | `category_defaults.digital_print.sell_rate_defaults.base_rate` | High (2+) / Review (1) |
| Laminated vs unlaminated diff | `category_defaults.digital_print.sell_rate_defaults.laminate_addon_per_sqft` | Review |
| Printed wrap $/sqft | `category_defaults.vehicle_graphics.sell_rate_defaults.printed_wrap_per_sqft` | High |
| Color-change wrap $/sqft | `category_defaults.vehicle_graphics.sell_rate_defaults.color_change_per_sqft` | High |
| Door lettering package price | `category_defaults.vehicle_graphics.benchmarks.package_door_lettering` | Review |
| Spot graphics package price | `category_defaults.vehicle_graphics.benchmarks.package_spot_graphics` | Review |
| Partial wrap package price | `category_defaults.vehicle_graphics.benchmarks.package_partial_wrap` | Review |
| Full wrap package price | `category_defaults.vehicle_graphics.benchmarks.package_full_wrap` | Review |
| Tee price 12pc | `category_defaults.apparel.shop_pricing_table.tee_one_side.qty_12` | Review |
| Tee price 24pc | `category_defaults.apparel.shop_pricing_table.tee_one_side.qty_24` | Review |
| Avg blank shirt cost | `category_defaults.apparel.default_blank_cost` | High |
| Avg decoration cost | `category_defaults.apparel.default_decoration_cost` | High |
| Hoodie price | `category_defaults.apparel.shop_pricing_table.hoodie_one_side.qty_24` | Review |
| Service design rate | `category_defaults.services.labor_rate_overrides.design` | High |
| Service production rate | `category_defaults.services.labor_rate_overrides.production` | High |
| Service install rate | `category_defaults.services.labor_rate_overrides.install` | High |
| Minimum design charge | `category_defaults.services.minimums.design` | High |
| Minimum install charge | `category_defaults.services.minimums.install` | High |
| Vendor markup % | `category_defaults.promotional.default_markup_multiplier` + `category_defaults.custom.default_markup_multiplier` | High |
| Promo minimum setup fee | `category_defaults.promotional.minimum_setup_fee` | High |
| Promo minimum order | `category_defaults.promotional.minimum_charge` | High |
| Shop labor rate | `labor.shop_labor_rate` | High |
| Include labor in price | `labor.include_labor_in_price` | High |
| Charge design separately | `design.charge_design_separately` | High |
| Default design rate | `design.default_design_rate` | High |
| Included design minutes | `design.included_design_minutes` | High |
| Banner production minutes | `category_defaults.banners.production_minutes_basic` | High |
| Rigid sign production minutes | `category_defaults.rigid_signs.production_minutes_basic` | High |
| Yard sign batch setup minutes | `category_defaults.rigid_signs.yard_sign_setup_minutes` | High |
| Yard sign minutes/sign | `category_defaults.rigid_signs.yard_sign_minutes_per_sign` | High |
| Cut vinyl production minutes | `category_defaults.cut_vinyl.production_minutes_basic` | High |
| Digital print production minutes | `category_defaults.digital_print.production_minutes_basic` | High |
| Vehicle lettering setup minutes | `category_defaults.vehicle_graphics.lettering_setup_minutes` | High |
| Apparel order setup minutes | `category_defaults.apparel.setup_minutes_per_order` | High |
| Apparel minutes per item | `category_defaults.apparel.production_minutes_per_item` | High |

---

## Validation Rules (All Questions)

| Scenario | Level | What Happens |
|---|---|---|
| Value is impossible (negative price, NaN) | **Error** | Answer dropped — won't generate any suggestion. Red inline warning shown. |
| Value outside expected range (e.g., $2 for a banner) | **Warning** | Answer still used, but all suggestions derived from it are marked "Review recommended" and auto-deselected. |
| Value is blank / skipped | OK | Question skipped gracefully — no suggestion generated for it. |
| Value within normal range | OK | Suggestion generated with full confidence. |

---

## Other Ways to Set Up Pricing

The quiz is one of three ways to populate Pricing Foundation defaults:

| Method | Best For |
|---|---|
| **Pricing Setup Quiz** (this doc) | New shops, quick setup, shops who know their prices |
| **Historical Invoice Import** | Shops with past invoices in CSV/Excel/PDF — AI extracts price-per-sqft from real job history |
| **Manual entry** | Fine-tuning individual fields after quiz or import |

Access all three from: **Settings → Pricing Foundation**

---

*End of Pricing Setup Quiz Specification*
*Document path: /app/memory/pricing_quiz_spec.md*

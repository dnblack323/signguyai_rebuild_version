# SignGuy AI — Pricing Spec
> **Source:** Reverse-engineered from production backend (`server.py`) and frontend (`PricingCalculator.js`, `CategoryPricingMethodSetup.js`, `BannerSetupWizard.js`)
> **Purpose:** Complete behavioral spec for every pricing category — inputs, calculation flow, outputs, and rebuild notes.
> **Date:** 2026-06-10

---

## Table of Contents
1. [System Architecture Overview](#1-system-architecture-overview)
2. [The 8 Pricing Methods](#2-the-8-pricing-methods)
3. [Global Shared Concepts](#3-global-shared-concepts)
4. [Category: Banners](#4-category-banners)
5. [Category: Rigid Signs](#5-category-rigid-signs)
6. [Category: Cut Vinyl](#6-category-cut-vinyl)
7. [Category: Digital Print / Printed Vinyl](#7-category-digital-print--printed-vinyl)
8. [Category: Vehicle Graphics / Wraps](#8-category-vehicle-graphics--wraps)
9. [Category: Apparel](#9-category-apparel)
10. [Category: Services](#10-category-services)
11. [Category: Promotional Items](#11-category-promotional-items)
12. [Category: Custom / Other](#12-category-custom--other)
13. [Cross-Category Features](#13-cross-category-features)
14. [Data Storage Schema](#14-data-storage-schema)
15. [API Endpoints](#15-api-endpoints)
16. [Rebuild Notes & Warnings](#16-rebuild-notes--warnings)

---

## 1. System Architecture Overview

### Where pricing lives
| Layer | Location | Purpose |
|---|---|---|
| Calculation engine | `server.py` (lines 696–4356) | One `calculate_*` async function per category |
| Route entry point | `routes/pricing.py` | `POST /api/pricing/calculate` dispatches to engine |
| Tenant configuration | `pricing_configuration` collection | All per-tenant defaults, materials, rates |
| Historical import | `routes/pricing_setup.py` | CSV/PDF invoice import → benchmark extraction |
| Templates | `pricing_templates` collection | Saved configurations per category |
| Frontend calculator | `PricingCalculator.js` | Main UI (4,045 lines) |
| Category setup | `CategoryPricingMethodSetup.js` | Per-category method + status selection |
| Banner wizard | `BannerSetupWizard.js` | Guided 7-step banner configuration |

### Canonical category IDs
These are the exact string values used as `category` in API calls and in MongoDB:

| Category ID | Display Name | Pricing Engine Function |
|---|---|---|
| `banners` | Banners | `calculate_banners` |
| `rigid_signs` | Rigid Signs | `calculate_rigid_signs` |
| `cut_vinyl` | Cut Vinyl | `calculate_cut_vinyl` |
| `digital_print` | Digital Print / Printed Vinyl | `calculate_digital_print` |
| `vehicle_graphics` | Vehicle Graphics / Wraps | `calculate_vehicle_graphics` |
| `apparel` | Apparel | `calculate_apparel` |
| `services` | Services | `calculate_services` |
| `promotional` | Promotional Items | `calculate_promotional` |
| `custom` | Custom / Other | `calculate_custom` |

> **Note:** The route layer normalizes legacy aliases before dispatching:
> - `promo_misc` → `promotional`
> - `vehicle_wrap`, `vehicle_wraps` → `vehicle_graphics`

---

## 2. The 8 Pricing Methods

These are configurable per category by the shop admin. The method determines how the calculator's "quick entry" UI looks and which calculation path runs.

| Method Key | Label | Best For | How It Works |
|---|---|---|---|
| `flat_price` | Flat Price | Simple items, fixed-priced products | Admin enters a fixed sell price. No calculation. |
| `price_per_sqft` | Price Per Square Foot | Banner materials, wide-format print | `width × height → area_sqft × rate_per_sqft` |
| `quantity_tier` | Quantity Tier | Yard signs, apparel, bulk orders | Price-per-unit varies by quantity range (e.g., 1–24 = $X, 25–99 = $Y) |
| `detailed_material_labor` | Detailed Material + Labor | Vehicle wraps, rigid signs | Full cost-build: material + labor + overhead → cost-plus markup |
| `compare_methods` | Compare Methods | Any where you want the best of both | Runs both `price_per_sqft` AND `detailed_material_labor`, shows both, recommends the higher (or configured) option |
| `manual_quote` | Manual Quote | Outsourced, custom projects | Admin enters price manually. Calculation suppressed. |
| `hourly` | Hourly | Design, installation, services | `hours × hourly_rate`. Minimum billable hours applies. |
| `package` | Package Pricing | Vehicle lettering packages, event bundles | Pre-defined packages with fixed prices. User selects package. |

### Suggested Method Per Category (from frontend config)
| Category | Suggested Method |
|---|---|
| Banners | `compare_methods` |
| Yard Signs | `quantity_tier` |
| Rigid Signs | `compare_methods` |
| Printed Vinyl / Digital Print | `compare_methods` |
| Cut Vinyl | `compare_methods` |
| Vehicle Lettering | `package` |
| Vehicle Wraps | `compare_methods` |
| Apparel | `quantity_tier` |
| Design | `hourly` |
| Installation | `hourly` |
| Custom / Promotional | `manual_quote` |

---

## 3. Global Shared Concepts

These concepts apply across all categories.

### 3.1 Billable Area Minimum
Every area-based category has a `default_minimum_billable_area`. Even if the physical piece is smaller, the shop is charged for at least this area.

| Category | Default Minimum |
|---|---|
| Cut Vinyl | 0.5 sqft |
| Rigid Signs | 1.0 sqft |
| Digital Print | 1.0 sqft |
| Banners | 4.0 sqft |

### 3.2 Waste Percentage
Material is ordered with waste. The waste-adjusted area is what material costs are calculated on.
```
waste_adjusted_area = total_billable_area × (1 + waste_percent / 100)
```

| Category | Typical Waste |
|---|---|
| Banners | 8% |
| Rigid Signs | configurable |
| Cut Vinyl | configurable |
| Vehicle Wraps | 12–15% by coverage type |
| Digital Print | configurable |

### 3.3 Labor System — Minutes vs. Hours
The pricing engine supports two labor systems:
- **Minute-based (new):** `labor_minutes` per order/piece × `shop_labor_rate_per_hour`. Optionally has an `include_labor` toggle (if `false`, labor is tracked internally but not added to the sell price).
- **Hours-based (legacy fallback):** `production_labor_hours_per_sqft × area + min_hours`. Used if minute-based config is absent.

### 3.4 Design Charge System
Design charge is controlled by `get_design_charge_config(defaults)` which returns:
- `charge_separately`: `"yes"` | `"no"` | `"over_included_minutes"`
- `default_design_rate`: hourly rate for billable design
- `included_minutes`: free design minutes per job (only when `charge_separately = "over_included_minutes"`)

The behavior:
- `artwork_ready = true` → no design charge (customer provided ready file)
- `artwork_needed = false` → no design charge
- `charge_separately = "no"` → design tracked internally, not billed
- `charge_separately = "yes"` → full design hours × design rate billed
- `charge_separately = "over_included_minutes"` → only billable minutes beyond included_minutes

### 3.5 Rush Order Multiplier
Applied as a percentage surcharge to the suggested price when `rush_order: true`.
```python
suggested_price = apply_rush_order_multiplier(suggested_price, data.rush_order)
```
Configured in defaults as `rush_fee_percentage`.

### 3.6 Overhead Cost
```
overhead_cost = (basis_amount × overhead_percentage / 100) + (labor_hours × shop_overhead_per_hour)
```
- `basis_amount` = material_cost + labor_cost (setup fees deliberately excluded from basis)
- Configurable: `overhead_percentage` (%) and `shop_overhead_per_hour` ($/hr)

### 3.7 Quantity Discounts
Configured as a list of tier objects per category:
```json
[
  { "min_qty": 25, "max_qty": 99, "discount_percent": 5 },
  { "min_qty": 100, "max_qty": null, "discount_percent": 10 }
]
```
Applied to `sell_base` before adding design/install/setup fees.

### 3.8 Standardized Response Shape (`PricingCalculation`)
Every calculation returns the same structure:

```
suggested_price          float   Final suggested sell price
total_cost               float   Sum of all cost buckets
profit_margin_percent    float   (suggested_price - total_cost) / suggested_price × 100

# Cost buckets
material_cost            float
labor_cost               float
design_cost              float
setup_cost               float
finishing_cost           float
hardware_cost            float
install_cost             float
outsourcing_cost         float
overhead_cost            float

# Metadata
estimated_labor_minutes  float
pricing_method           string  "sell_rate" | "markup" | "hourly" | "manual"
markup_multiplier        float | null
target_margin_percent    float | null
minimum_charge           float

# Breakdown arrays (itemized line-level detail)
materials_breakdown      [{name, quantity, unit, unit_cost, total_cost}]
labor_breakdown          [...]
design_breakdown         [...]
setup_breakdown          [...]
finishing_breakdown      [...]
hardware_breakdown       [...]
install_breakdown        [...]

# Overhead explainability
overhead_basis           {formula, basis_amount, basis_components, labor_hours, overhead_percentage, ...}

# Dimensions
area_sqft                float | null
billable_sqft            float | null
quantity                 float
width_inches             float | null
height_inches            float | null
waste_percentage         float | null

warnings                 [string]   Human-readable warnings (missing materials, fallbacks used)
legacy_breakdown         {}         Full original calculation debug dict (backward-compat)
```

---

## 4. Category: Banners

**Use cases:** 13oz vinyl banners, 18oz vinyl banners, mesh banners, fabric banners, step-and-repeat backdrops, pole banners.

### 4.1 Inputs

| Input Field | Type | Default | Notes |
|---|---|---|---|
| `width_inches` | float | — | Width in inches OR feet depending on `unit_of_measure` |
| `height_inches` | float | — | Height / length in same unit |
| `unit_of_measure` | string | `"feet"` | `"inches"` or `"feet"` |
| `quantity` | float | 1 | Number of banners |
| `banner_material_key` | string | `"banner_13oz"` | Material library key |
| `banner_double_sided` | string | `"no"` | `"no"` / `"same"` / `"different"` |
| `banner_hems` | string | `"standard"` | `"none"` / `"standard"` / `"reinforced"` |
| `banner_grommets` | string | `"corners"` | `"none"` / `"corners"` / `"every_2ft"` / `"every_3ft"` / `"custom"` |
| `banner_grommet_count` | int | — | Only for `"custom"` grommet mode |
| `banner_pole_pockets` | string | `"none"` | `"none"` / `"top"` / `"top_and_bottom"` / `"side_pockets"` |
| `banner_reinforced_corners` | bool | false | Extra corner reinforcement |
| `banner_wind_slits` | bool | false | Wind relief cuts |
| `banner_specialty_sewing` | bool | false | Specialty sewn finish |
| `banner_laminate` | bool | false | Laminate/coating applied |
| `banner_laminate_type_key` | string | `"banner_laminate_coating"` | Material library key |
| `banner_hardware_keys` | [string] | [] | Hardware accessories from `hardware_accessories` config |
| `banner_use_type` | string | `"outdoor"` | `"indoor"` / `"outdoor"` / `"backwall_step_repeat"` / `"event_display"` |
| `banner_event_premium` | bool | null | Force event premium (auto-detected from `banner_use_type`) |
| `artwork_ready` | bool | false | If true, no design charge |
| `artwork_needed` | bool | null | null = assume needed |
| `design_complexity` | string | `"simple"` | `"simple"` / `"medium"` / `"complex"` / `"extreme"` |
| `install_required` | bool | false | Add installation labor |
| `install_complexity` | string | `"easy"` | `"easy"` / `"medium"` / `"difficult"` |
| `rush_order` | bool | false | Apply rush surcharge |

### 4.2 Calculation Flow

```
1. Resolve dimensions → area_per_piece → billable_area (min 4 sqft)
2. Apply waste (default 8%) → waste_adjusted_area

3. MATERIAL COST
   banner_material_cost  = waste_adjusted_area × material_cost_per_sqft × sided_mult
   print_consumable_cost = waste_adjusted_area × consumable_cost_per_sqft × sided_mult
   laminate_cost         = waste_adjusted_area × laminate_cost_per_sqft × sided_mult  [if laminate]
   grommet_material_cost = total_grommets × grommet_cost_each
   hardware_cost         = sum(hardware item purchase_costs) × quantity

4. FINISHING SELL COMPONENTS (added to sell price, not cost basis)
   hem_cost              = perimeter_feet × hem_rate_per_linear_foot × quantity
   grommet_sell          = max(total_grommets × grommet_sell_each, grommet_min_charge × qty)
   pole_pocket_cost      = pole_linear_feet × pole_pocket_rate × quantity
   reinforced_corners    = flat_charge × quantity  [if enabled]
   wind_slit_cost        = flat_charge × quantity  [if enabled]
   specialty_sewing_cost = perimeter_feet × specialty_sewing_rate × quantity  [if enabled]

5. LABOR COST
   production_cost = labor_minutes/60 × shop_labor_rate  [OR fallback: hrs_per_sqft × area × qty × rate]
   design_cost     = design_hours × design_rate  [see §3.4]
   install_cost    = max(install_minimum, install_hours × install_rate)  [if install_required]
   finishing_labor = grommet_labor_hours × finishing_rate
   hardware_labor  = hardware_labor_minutes × production_rate

6. OVERHEAD
   overhead_cost = calculate_overhead_cost(material + labor, total_hours, defaults, cfg)

7. SELL PRICE
   sell_base         = material_sell_rate × total_billable_area × sided_mult
   sell_base         = max(sell_base, min_sell_per_item × quantity)
   suggested_price   = sell_base + finishing_sell + design_cost + install_cost + hardware_sell
   suggested_price  *= (1 - discount_percent/100)  [quantity discount]
   suggested_price  *= event_premium_multiplier  [if event/backwall use type]
   suggested_price  *= rush_multiplier  [if rush_order]
```

### 4.3 Sidedness Multipliers
| Mode | Key | Typical Multiplier |
|---|---|---|
| Single-sided | `single` | 1.0 |
| Double same art | `double_same` | ~1.6 |
| Double different art | `double_diff` | ~1.9 |

### 4.4 Grommet Logic
- **corners**: default 4 grommets per banner
- **every_2ft**: `max(4, round(perimeter_feet / 2))`
- **every_3ft**: `max(4, round(perimeter_feet / 3))`
- **custom**: use `banner_grommet_count`
- Minimum charge enforced per item: `grommet_sell_subtotal = max(total × grommet_sell_each, min_charge × qty)`

### 4.5 Configurable Defaults (stored in `category_defaults.banners`)
```
pricing_method                  string   compare_methods (default)
default_material                string   13oz_banner
default_unit_of_measure         string   feet
default_minimum_billable_area   float    4.0
waste_percentage                float    8.0
standard_hem_rate_per_linear_foot  float 0.75
reinforced_hem_rate_per_linear_foot float 1.25
grommet_cost_each               float    0.20
grommet_sell_each               float    0.75
grommet_minimum_charge          float    4.0
grommet_default_corner_count    int      4
pole_pocket_rate_per_linear_foot float   3.50
reinforced_corners_charge       float    6.0
wind_slit_charge                float    2.0
specialty_sewing_rate_per_linear_foot float 2.0
default_minimum_sell_price      float    35.0
production_labor_hours_per_sqft float    0.10
min_production_labor_hours_per_item float 0.20
install_base_hours              float    0.5
install_hours_per_sqft          float    0.04
event_premium_multiplier        float    ~1.15
material_retail_rates           [...]    see BannerSetupWizard
addon_defaults                  [...]    hems, grommets, brackets, pole_pockets, design, setup_fee, install
product_templates               [...]    small_pole_banner, large_pole_banner
```

### 4.6 Materials Required in Library
| Material Key | Category | Purpose |
|---|---|---|
| `13oz_banner` | `banner_material` | 13 oz vinyl |
| `18oz_banner` | `banner_material` | 18 oz vinyl |
| `mesh_banner` | `banner_material` | Mesh material |
| `fabric_banner` | `banner_material` | Fabric / pole banner |
| `banner_print_consumable` | `banner_material` | Ink/consumable cost |
| `banner_laminate_coating` | `laminate` | Optional laminate |

**Each material needs:**
- `shop_cost_per_sqft` (cost to shop)
- `suggested_material_charge_per_sqft` (sell rate used in `compare_methods`)
- `waste_percent`, `is_active`, `compatible_categories`

---

## 5. Category: Rigid Signs

**Use cases:** Coroplast yard signs, ACM/aluminum composite panel signs, PVC board signs, aluminum plate signs.

### 5.1 Inputs

| Input Field | Type | Default | Notes |
|---|---|---|---|
| `width_inches` | float | 24 | |
| `height_inches` | float | 24 | |
| `unit_of_measure` | string | `"inches"` | |
| `quantity` | float | 1 | |
| `substrate_type_key` | string | `"coroplast_4mm"` | Material library key (overrides `substrate_type` enum) |
| `substrate_type` | enum | — | Legacy: `coroplast`, `aluminum`, `pvc`, etc. |
| `thickness` | string | — | `"4mm"`, `"10mm"`, `"0.040"`, `"0.063"`, `"0.080"` |
| `graphic_method` | string | `"direct_print"` | `"direct_print"` / `"mounted_print"` / `"cut_vinyl_applied"` |
| `sidedness` | string | `"single"` | `"single"` / `"double"` |
| `double_sided_art` | string | `"same"` | `"same"` / `"different"` |
| `shape_type` | string | `"rectangle"` | `"rectangle"` / `"circle"` / `"custom_shape"` |
| `finish_quality` | string | `"standard"` | `"standard"` / `"premium"` |
| `protective_finish` | bool | false | Add protective finish/laminate |
| `protective_finish_type` | string | `"rigid_finish_standard"` | Material library key |
| `hardware_included` | bool | false | Add mounting hardware |
| `hardware_type` | string | — | Hardware key from `hardware_accessories` config |
| `drill_prep_required` | bool | false | Pre-drill holes charge |
| `artwork_ready` | bool | false | |
| `artwork_needed` | bool | null | |
| `design_complexity` | string | `"simple"` | |
| `install_required` | bool | false | |
| `install_complexity` | string | `"easy"` | |
| `rush_order` | bool | false | |

### 5.2 Calculation Flow

```
1. Resolve dimensions → area_per_piece → billable_area (min 1.0 sqft)
2. Apply waste → waste_adjusted_area

3. MATERIAL COST
   substrate_cost    = waste_adjusted_area × substrate_cost_per_sqft
   graphic_face_cost = waste_adjusted_area × graphic_cost_per_sqft × sided_mult
     [direct_print:      uses direct_print_consumable_key material]
     [mounted_print:     uses mounted_print_graphic_key material + mounting_hours]
     [cut_vinyl_applied: uses oracal_651 (or custom vinyl key) material]
   finish_cost       = waste_adjusted_area × finish_cost_per_sqft × sided_mult  [if protective_finish]
   hardware_cost     = get_hardware_cost(defaults, hardware_key) × quantity  [if hardware_included]

4. MULTIPLIERS applied to production hours and sell rate:
   sided_mult:     single=1.0, double_same=?, double_diff=?  (from config)
   shape_mult:     rectangle=1.0, circle=1.1–1.3  (from config)
   thickness_mult: thin_basic=1.0, medium=1.1, thick_heavy=1.2  (from config)
   finish_quality_mult: standard=1.0, premium=1.1–1.2  (from config)

5. LABOR
   production_hours  = base_hrs_per_sqft × billable_area × quantity × thickness_mult × shape_mult × sided_mult
   mounting_cost     = mounting_hours × production_rate  [if mounted_print graphic method]
   design_cost       = see §3.4
   install_cost      = install_hrs × install_rate  [if install_required]
   hardware_labor    = hardware_handling_labor_cost × quantity  [if hardware_included]
   drill_prep_fee    = drill_prep_fee × quantity  [if drill_prep_required]

6. OVERHEAD
   overhead_cost = calculate_overhead_cost(material + labor, all_hours, defaults, cfg)

7. SELL PRICE
   sell_base = substrate_sell_rate × total_billable_area × sided_mult × thickness_mult × shape_mult × finish_quality_mult
   sell_base = max(sell_base, min_sell)
   sell_base *= (1 - discount_percent/100)
   suggested_price = sell_base + design_cost + install_cost + drill_prep_fee + hardware_sell
   suggested_price *= rush_multiplier
```

### 5.3 Substrate Keys → Thickness Tiers
| Substrate Key | Thickness Tier |
|---|---|
| `coroplast_4mm` | thin_basic |
| `coroplast_10mm` | thick_heavy |
| `aluminum_040` | thin_basic |
| `aluminum_063` | medium |
| `aluminum_080` | thick_heavy |
| `pvc_3mm` | thin_basic |
| `pvc_6mm` | medium |

### 5.4 Configurable Defaults
```
default_substrate_key               string   coroplast_4mm
default_graphic_method              string   direct_print
default_sidedness                   string   single
default_shape_type                  string   rectangle
default_minimum_billable_area       float    1.0
default_minimum_sell_price          float    25.0
production_labor_hours_per_sqft     float    0.15
min_production_labor_hours_per_item float    0.2
install_hours_per_sqft              float    0.08
drill_prep_fee                      float    3.0
hardware_handling_labor_cost        float    5.0
sidedness_multipliers               {}       single/double_same/double_diff
shape_multipliers                   {}       rectangle/circle/custom_shape
thickness_multipliers               {}       thin_basic/medium/thick_heavy
finish_quality_multipliers          {}       standard/premium
```

---

## 6. Category: Cut Vinyl

**Use cases:** Plotter-cut decals, window lettering, vehicle door lettering (simple), wall lettering, reflective stickers.

### 6.1 Inputs

| Input Field | Type | Default | Notes |
|---|---|---|---|
| `width_inches` | float | 12 | |
| `height_inches` | float | 12 | |
| `unit_of_measure` | string | `"inches"` | |
| `quantity` | float | 1 | |
| `vinyl_type_key` | string | `"oracal_651"` | Material library key (overrides `vinyl_type` enum) |
| `vinyl_type` | enum | — | Legacy vinyl type |
| `num_colors` | int | 1 | Number of vinyl colors (4+ triggers manual review flag) |
| `weeding_complexity` | string | `"simple"` | `"simple"` / `"moderate"` / `"complex"` / `"very_complex"` |
| `masking_required` | bool | null | null = use category default |
| `use_type` | string | `"indoor"` | `"indoor"` / `"outdoor"` / `"vehicle"` |
| `artwork_ready` | bool | false | |
| `artwork_needed` | bool | null | |
| `design_complexity` | string | `"simple"` | |
| `file_cleanup_needed` | bool | false | File cleanup fee |
| `install_required` | bool | false | |
| `install_complexity` | string | `"easy"` | |
| `surface_type` | string | `"flat_smooth"` | Installation surface type |
| `rush_order` | bool | false | |

### 6.2 Calculation Flow

```
1. Resolve dimensions → area_per_piece → billable_area (min 0.5 sqft)
2. Apply waste → waste_adjusted_area

3. MATERIAL COST
   vinyl_cost          = waste_adjusted_area × vinyl_cost_per_sqft
   transfer_tape_cost  = waste_adjusted_area × transfer_tape_cost_per_sqft  [if masking_required]
   material_cost       = vinyl_cost + transfer_tape_cost

4. MULTIPLIERS applied to production hours:
   color_mult:     1 color=1.0, 2=1.5, 3=2.0, 4+=2.5 (+ manual_review flag)
   weeding_mult:   simple=1.0, moderate=1.3, complex=1.7, very_complex=2.5
   use_type_mult:  indoor=1.0, outdoor=1.1, vehicle=1.2

5. PRODUCTION LABOR
   production_hours = base_hrs_per_sqft × billable_area × quantity × color_mult × weeding_mult
   production_cost  = production_hours × production_rate

6. DESIGN CHARGE (see §3.4)

7. INSTALLATION CHARGE (if install_required)
   install_hours = total_billable_area × install_hours_per_sqft × install_complexity_mult × surface_mult
   install_cost  = max(minimum_install_charge, install_hours × install_rate)

8. FILE CLEANUP FEE (flat, added after sell calculation)

9. OVERHEAD
   overhead_cost = calculate_overhead_cost(material + labor, hours, defaults, cfg)

10. SELL PRICE
    sell_base     = vinyl_sell_rate × total_billable_area × color_mult × weeding_mult × use_type_mult
    sell_base     = max(sell_base, min_sell_per_item)  [if sell_method = max_of_rate_or_minimum]
    sell_base    *= (1 - discount_percent/100)
    suggested_price = sell_base + design_cost + install_cost + file_cleanup_fee
    suggested_price *= rush_multiplier
```

### 6.3 Color Multiplier Notes
- 4+ colors sets a `manual_review: true` flag in the response — a warning to the admin to review manually before quoting.
- Color multipliers are configurable per category: `color_multipliers: {"1": 1.0, "2": 1.5, "3": 2.0, "4_plus": 2.5}`

### 6.4 Vinyl Types in Library
| Key | Material Name | Notes |
|---|---|---|
| `oracal_651` | Oracal 651 | Standard indoor/outdoor permanent |
| `oracal_751` | Oracal 751 | Intermediate-cal, longer outdoor life |
| `oracal_951` | Oracal 951 | Premium cast vinyl |
| `avery_hp750` | Avery HP750 | High-performance cast |
| `reflective_vinyl` | Reflective Vinyl | Higher cost, outdoor signage |
| `metallic_vinyl` | Metallic Vinyl | Specialty |
| `fluorescent_vinyl` | Fluorescent Vinyl | Specialty |
| `etched_frost_vinyl` | Etched / Frost Vinyl | Window application |
| `wall_vinyl` | Wall Vinyl | Repositionable |
| `specialty_custom_vinyl` | Specialty / Custom | Catch-all |

---

## 7. Category: Digital Print / Printed Vinyl

**Use cases:** Wide-format adhesive vinyl prints, posters, canvas prints, backlit film, perforated window film, mounted prints (with substrate).

### 7.1 Inputs

| Input Field | Type | Default | Notes |
|---|---|---|---|
| `width_inches` | float | 24 | |
| `height_inches` | float | 24 | |
| `unit_of_measure` | string | `"inches"` | |
| `quantity` | float | 1 | |
| `print_media_key` | string | `"printable_adhesive_vinyl"` | Material library key |
| `print_material` | enum | — | Legacy: `vinyl_adhesive`, `poster_paper`, `canvas`, `backlit`, `perforated` |
| `ink_coverage_percent` | float | 35 | % of area with full ink coverage |
| `laminate` | bool | false | Add laminate/overlaminate |
| `laminate_material_key` | string | `"laminate_gloss"` | Material library key |
| `mounted_to_substrate` | bool | false | Mount print to rigid substrate |
| `substrate_material_key` | string | — | Material library key |
| `substrate_type` | enum | — | Legacy: `coroplast_4mm`, `aluminum_040`, etc. |
| `print_quality_mode` | string | `"standard"` | `"draft"` / `"standard"` / `"photo_quality"` |
| `contour_cut_type` | string | `"none"` | `"none"` / `"standard_contour"` / `"complex_contour"` |
| `trim_finish_type` | string | `"standard"` | `"standard"` / `"premium"` |
| `piece_separation_required` | bool | false | For gang-printed jobs |
| `separated_piece_count` | int | — | Number of pieces to separate |
| `include_setup_fee` | bool | false | Add setup fee to price |
| `artwork_ready` | bool | false | |
| `artwork_needed` | bool | null | |
| `design_complexity` | string | `"simple"` | |
| `file_cleanup_needed` | bool | false | |
| `install_required` | bool | false | |
| `install_complexity` | string | `"easy"` | |
| `rush_order` | bool | false | |

### 7.2 Calculation Flow

```
1. Resolve dimensions → area_per_piece → billable_area (min 1.0 sqft)
2. Apply waste → waste_adjusted_area

3. MATERIAL COST
   media_cost       = waste_adjusted_area × media_cost_per_sqft
   ink_cost         = waste_adjusted_area × ink_cost_per_sqft × (ink_coverage_percent / 100)
   laminate_cost    = waste_adjusted_area × laminate_cost_per_sqft  [if laminate]
   substrate_cost   = waste_adjusted_area × substrate_cost_per_sqft  [if mounted]
   material_cost    = media + ink + laminate + substrate

4. QUALITY & CONTOUR MULTIPLIERS
   quality_mult  = draft=0.9, standard=1.0, photo_quality=1.25
   contour_mult  = none=1.0, standard_contour=1.1, complex_contour=1.4

5. PRODUCTION LABOR
   production_hours = base_hrs_per_sqft × area × quality_mult × contour_mult × complexity_mult
   mounting_hours   = waste_adjusted_area × mounting_labor_hrs_per_sqft  [if mounted]
   separation_hours = separated_piece_count × piece_separation_hours_per_piece  [if piece_separation]

6. DESIGN CHARGE, INSTALL CHARGE (same as §3.4)
7. FILE CLEANUP FEE (flat add-on)
8. TRIM PREMIUM ADDON (flat per-item add-on if trim_finish = "premium")
9. SETUP FEE (optional flat add-on)

10. OVERHEAD
    overhead_cost = calculate_overhead_cost(material + labor, hours, defaults, cfg)

11. SELL PRICE
    sell_base     = media_sell_rate × total_billable_area × quality_mult × contour_mult
    sell_base    += laminate_sell_addon  [laminate sell rate × area]
    sell_base     = max(sell_base, min_sell)
    sell_base    *= (1 - discount_percent/100)
    suggested_price = sell_base + design_cost + install_cost + file_cleanup_fee + trim_addon + setup_fee
    suggested_price *= rush_multiplier
```

### 7.3 Print Media Keys
| Key | Material Name |
|---|---|
| `printable_adhesive_vinyl` | Printable Adhesive Vinyl |
| `poster_paper` | Poster Paper |
| `canvas` | Canvas |
| `backlit_film` | Backlit Film |
| `perforated_window_film` | Perforated Window Film |

---

## 8. Category: Vehicle Graphics / Wraps

**Use cases:** Full vehicle wraps, partial wraps, color change wraps, door lettering, spot graphics, window perforations.

### 8.1 Inputs

| Input Field | Type | Default | Notes |
|---|---|---|---|
| `vehicle_type` | string | `"van_cargo"` | Resolved against vehicle base sqft table |
| `coverage_type` | string | `"spot"` | `"spot"` / `"partial"` / `"half"` / `"full"` / `"custom"` |
| `custom_coverage_percent` | float | — | Only when `coverage_type = "custom"` (0–100) |
| `estimated_vehicle_sqft` | float | — | Override auto-estimated area (from base_sqft × coverage_factor) |
| `quantity` | float | 1 | Number of vehicles |
| `wrap_material_key` | string | `"wrap_standard_calendared"` | Material library key |
| `wrap_laminate_required` | bool | null | null = use config default (true for printed graphics) |
| `wrap_laminate_type_key` | string | `"wrap_laminate_gloss"` | Material library key |
| `window_perf_included` | bool | null | null = use config default |
| `window_perf_scope` | string | `"rear"` | `"rear"` / `"side"` / `"full"` |
| `surface_prep_required` | bool | false | Cleaning/prep time before wrap |
| `surface_prep_hours` | float | — | Hours for surface prep |
| `removal_required` | bool | false | Old wrap removal |
| `removal_hours` | float | — | Hours for removal |
| `second_installer` | bool | false | Second installer needed |
| `second_installer_hours` | float | — | Hours for second installer |
| `install_complexity` | string | — | Applied as difficulty multiplier |
| `seam_complexity` | string | `"standard"` | `"standard"` / `"complex"` |
| `artwork_ready` | bool | false | |
| `artwork_needed` | bool | true | null = assume needed |
| `design_complexity` | string | `"medium"` | |
| `rush_order` | bool | false | |

### 8.2 Coverage Factors
| Coverage Type | Factor | Notes |
|---|---|---|
| `spot` | 10% | Door lettering, small graphics |
| `partial` | 25% | One panel / partial sides |
| `half` | 45% | Half-wrap |
| `full` | 100% | Full vehicle coverage |
| `custom` | user-defined% | Interpolated; maps to nearest key for waste % |

### 8.3 Vehicle Base Area Table (in Materials Library, category = `vehicle_type`)
| Vehicle Key | Base Sqft |
|---|---|
| `van_cargo` | 160 |
| `van_transit` | 195 |
| `pickup_truck` | 120 |
| `sedan` | 95 |
| `suv_large` | 145 |
| `semi_trailer` | 480 |
| `box_truck` | 260 |
| *(etc.)* | |

### 8.4 Calculation Flow

```
1. COVERAGE RESOLUTION
   coverage_factor = {spot: 0.10, partial: 0.25, half: 0.45, full: 1.0}
   estimated_area  = vehicle_base_sqft × coverage_factor  [or data.estimated_vehicle_sqft]
   total_area      = estimated_area × quantity

2. WASTE (by coverage key)
   waste_by_coverage: {spot: 20%, partial: 15%, half: 12%, full: 12%}
   waste_adjusted_area = total_area × (1 + waste_percent/100)

3. MATERIAL COST
   vinyl_cost     = waste_adjusted_area × vinyl_cost_per_sqft
   laminate_cost  = waste_adjusted_area × laminate_cost_per_sqft  [if laminate]
   perf_cost      = perf_area × perf_cost_per_sqft × (1 + waste%)  [if window_perf]
   material_cost  = vinyl + laminate + perf

4. PRODUCTION / PREP LABOR
   production_hours = max(estimated_area × base_hrs_per_sqft, min_prod_hrs) × quantity

5. DESIGN LABOR (see §3.4)
   design_time_by_coverage: {spot: 0.5h, partial: 1.5h, half: 2.0h, full: 3.0h}
   design_hours × design_complexity_mult

6. SURFACE PREP LABOR (if surface_prep_required)
   prep_cost = surface_prep_hours × production_rate

7. REMOVAL LABOR (if removal_required)
   removal_cost = removal_hours × removal_rate

8. INSTALL LABOR
   install_base_hours = estimated_area × install_hours_per_sqft
   install_hours     × install_complexity_mult × seam_complexity_mult
   install_cost      = max(install_minimum, install_hours × install_rate)

9. SECOND INSTALLER (if second_installer)
   second_cost = second_installer_hours × helper_rate

10. OVERHEAD
    overhead_cost = calculate_overhead_cost(material + all_labor, all_hours, defaults, cfg)

11. SELL PRICE
    Package benchmarks: benchmarks[vehicle_type][coverage_key] × complexity_scale
    Cost-plus: (material + labor + overhead) × markup
    suggested_price = max(package_benchmark, cost_plus_sell)
    + perf_sell (window perf sell at area × sell_rate_per_sqft)
    + hardware / add-ons
    ≥ min_sell_per_vehicle × quantity
    × rush_multiplier
```

### 8.5 Wrap Materials in Library
| Key | Category | Description |
|---|---|---|
| `wrap_standard_calendared` | `wrap_vinyl` | Entry-level wrap film (Avery MPI 1005) |
| `wrap_premium_cast` | `wrap_vinyl` | Premium cast wrap film (3M 1080) |
| `wrap_color_change` | `wrap_vinyl` | Solid color change film |
| `wrap_laminate_gloss` | `wrap_laminate` | Gloss overlaminate |
| `wrap_laminate_matte` | `wrap_laminate` | Matte overlaminate |
| `wrap_laminate_satin` | `wrap_laminate` | Satin finish |
| `wrap_window_perf` | `window_perf` | Perforated window film |

---

## 9. Category: Apparel

**Use cases:** T-shirts, hoodies, polo shirts, hats (fitted / snapback / trucker), decorated with HTV, screen print, embroidery, DTF, sublimation.

### 9.1 Inputs

| Input Field | Type | Default | Notes |
|---|---|---|---|
| `quantity` | float | 1 | Total piece count (sum of all sizes) |
| `apparel_product_type` | string | `"short_sleeve_tee"` | Key from `available_product_types` config |
| `apparel_brand_style_key` | string | — | Key from `available_brand_styles[product_type]` config |
| `apparel_placement_set` | string | `"front"` | `"front"` / `"front_back"` / `"front_back_sleeve"` / etc. |
| `apparel_decoration_method` | string | `"htv"` | `"htv"` / `"screen_print"` / `"embroidery"` / `"dtf"` / `"sublimation"` |
| `apparel_num_colors` | int | 1 | Number of print colors (for screen print / HTV) |
| `apparel_stitch_count` | int | 6000 | Stitch count (for embroidery) |
| `apparel_plus_size_count` | int | 0 | Number of plus-size pieces in order |
| `apparel_custom_name_number` | bool | false | Add names/numbers |
| `apparel_custom_name_number_count` | int | 0 | How many names/numbers |
| `apparel_specialty_finish` | bool | false | Puff, foil, or specialty finish |
| `apparel_two_tone_hat_finish` | bool | false | Hats only — two-tone finish |
| `apparel_leather_patch` | bool | false | Hats only — leather patch |
| `apparel_bag_and_fold` | bool | false | Individual bag and fold finishing |
| `apparel_rush_percent` | float | 17.5 | Rush surcharge % (overrides category default) |
| `apparel_manual_quote_override` | float | — | Admin manual price override |
| `blank_cost_override` | float | — | Override blank garment cost per piece |
| `artwork_ready` | bool | false | |
| `artwork_needed` | bool | null | |
| `design_complexity` | string | `"simple"` | |
| `rush_order` | bool | false | |

### 9.2 Calculation Flow

```
1. QUANTITY TIER RESOLUTION
   tiers: [{min_qty: 1, max_qty: 5, key: "1_5"}, {min_qty: 6, max_qty: 11, key: "6_11"}, ...]
   tier_key = first tier where min_qty ≤ qty ≤ max_qty

2. BLANK COST
   blank_material = find_material(defaults, brand_style_key)
   blank_cost_per_piece = material.cost_per_unit  [or blank_cost_override]
   total_blank_cost = blank_cost_per_piece × qty

3. SUGGESTED SELL (two paths)

   PATH A — SHOP TABLE (uses_shop_table = true)
     per_piece_sell = shop_pricing_table[brand_key][tier_key][placement_key]
     decoration_sell = per_piece_sell × qty
     [shop table price already includes blank markup]

   PATH B — COST-PLUS FALLBACK (non-table methods or missing table rows)
     setup_fee_flat = method_cfg.default_setup_fee
     material_per_piece = depends on method:
       htv/screen_print: material_cost_per_color_per_piece × num_colors
       dtf: material_cost_per_piece
       embroidery: cost_per_1k_stitches × (stitch_count / 1000)
       sublimation: material_cost_per_sqin × ~80 sqin
     labor_per_piece = apparel_labor_minutes_per_piece / 60 × prod_rate
     setup_amortized = setup_fee_flat / qty
     cost_per_piece = blank + material + labor + setup_amortized
     per_piece_sell = max(cost_per_piece × markup, min_sell_per_piece)

4. BASE SELL
   retail_base = material.retail_base_no_print  [floor price even without decoration]
   per_piece_sell = max(per_piece_sell, retail_base)
   decoration_sell = per_piece_sell × qty

5. ADD-ONS (all additive to decoration_sell)
   plus_size_cost = plus_size_count × plus_size_rate_per_x  [garments only]
   custom_nn_cost = custom_name_number_count × (hat_rate or garment_rate)
   specialty_cost = specialty_finish_rate × qty  [if specialty_finish]
   two_tone_cost  = two_tone_hat_finish_rate × qty  [hats only]
   patch_cost     = leather_patch_hat_rate × qty  [hats only]
   bag_fold_cost  = bag_and_fold_each × qty

6. DESIGN / SETUP FEE
   setup_fee = design_complexity_setup_fees[complexity]  [if artwork_needed and !artwork_ready]
   method_setup = method_cfg.default_setup_fee  [if shop table and not setup_included_in_table]

7. RUSH
   suggested_price *= (1 + rush_percent/100)  [if rush_order]

8. MINIMUM
   suggested_price = max(suggested_price, min_sell_per_piece × qty)

9. MANUAL OVERRIDE
   if apparel_manual_quote_override > 0: suggested_price = override
```

### 9.3 Decoration Methods
| Key | Description | Material Cost Driver |
|---|---|---|
| `htv` | Heat Transfer Vinyl | `material_cost_per_color_per_piece` |
| `screen_print` | Screen Print | `material_cost_per_color_per_piece` |
| `dtf` | Direct-to-Film | `material_cost_per_piece` |
| `embroidery` | Embroidery | `cost_per_1k_stitches` |
| `sublimation` | Dye Sublimation | `material_cost_per_sqin` |

### 9.4 Apparel Config Structure
```
available_product_types:    [{key, label, is_hat, allowed_placement_set}]
available_brand_styles:     {product_type_key: [{key, label, cost_per_unit, retail_base_no_print}]}
available_decoration_methods: [string]
default_decoration_method:  string
methods_using_shop_table:   [string]
method_config:              {method_key: {uses_shop_table, default_setup_fee, setup_included_in_table, ...}}
quantity_tiers:             [{min_qty, max_qty, key}]
shop_pricing_table:         {brand_key: {tier_key: {placement_key: price}}}
plus_size_upcharge_per_x:   float
custom_name_number_garment: float
custom_name_number_hat:     float
specialty_finish_garment:   float
specialty_vinyl_hat:        float
two_tone_hat_finish:        float
leather_patch_hat:          float
bag_and_fold_each:          float
default_setup_fee:          float
design_complexity_setup_fees: {simple, medium, complex}
default_rush_percent:       float   17.5
default_markup_multiplier:  float   2.15
default_minimum_sell_price: float   10.0
apparel_labor_minutes_per_piece: float
apparel_handling_labor_minutes_per_piece: float
```

---

## 10. Category: Services

**Use cases:** Design hours, installation, removal, site survey, consultation, travel, equipment rental.

### 10.1 Service Types (configured in `available_service_types`)
| Key | Label | Billing Unit | Notes |
|---|---|---|---|
| `design` | Design / Artwork | `hour` | |
| `installation` | Installation | `hour` | requires_travel |
| `removal` | Removal / Demolition | `hour` | |
| `site_survey` | Site Survey | `hour` | requires_travel |
| `consultation` | Consultation | `hour` | |
| `travel` | Travel / Mileage | `mile` | billing_unit = "mile" |
| `other_labor` | Other Labor | `hour` | |
| `general_labor` | General Labor | `hour` | fallback |

### 10.2 Billing Units
| Unit | How Quantity Maps | Cost Calculation |
|---|---|---|
| `hour` | quantity = hours | `hours × num_workers × labor_cost_rate × complexity_mult` |
| `flat` | quantity = jobs | flat_fee (ignores hours, uses estimated_hours for cost tracking only) |
| `piece` | quantity = pieces | `qty × unit_rate × complexity_mult` |
| `sqft` | quantity = sqft | `qty × unit_rate × complexity_mult` |
| `linear_foot` | quantity = linear feet | `qty × unit_rate × complexity_mult` |
| `mile` | quantity = miles | `miles × travel_cost_per_mile` |
| `trip` | quantity = trips | `trips × trip_cost_rate + (hours × workers × labor_rate)` |
| `day` | quantity = days | `days × day_hours × workers × labor_cost_rate × complexity_mult` |

### 10.3 Inputs

| Input Field | Type | Default | Notes |
|---|---|---|---|
| `quantity` | float | 1 | Depends on billing unit: hours, miles, pieces, etc. |
| `service_type` | string | `"general_labor"` | Key from `available_service_types` |
| `services_billing_unit` | string | — | Overrides service type default |
| `services_labor_role` | string | — | Overrides service type default |
| `hourly_rate_override` | float | — | Override sell rate per hour |
| `services_flat_fee` | float | — | Override flat fee |
| `services_unit_rate_override` | float | — | Override rate per unit |
| `estimated_hours` | float | 0 | Required for hour/flat/piece billing |
| `num_workers` | int | 1 | Rounds to nearest whole integer |
| `services_complexity` | string | `"medium"` | `"simple"` / `"medium"` / `"complex"` / `"extreme"` |
| `services_minimum_applies` | bool | true | Apply minimum billable hours |
| `services_travel_required` | bool | — | Auto from service type `requires_travel` |
| `services_travel_miles` | float | 0 | One-way miles |
| `services_trip_charge_applies` | bool | false | Add trip charge |
| `services_trip_count` | int | 1 | Number of trips |
| `services_equipment_required` | bool | false | Add equipment rental |
| `services_equipment_type` | string | `"custom"` | Key from `equipment_library` |
| `services_equipment_days` | float | 0 | Equipment rental days |
| `services_equipment_hours` | float | 0 | Equipment rental hours |
| `services_subcontracted` | bool | — | Auto from service type |
| `services_subcontract_cost` | float | — | Subcontractor cost |
| `services_subcontract_markup_applies` | bool | true | |
| `services_permit_external_fee` | float | 0 | Permit or external pass-through |
| `rush_order` | bool | false | |

### 10.4 Complexity Multipliers (applied to labor cost AND sell)
```
complexity_multipliers:
  simple:  0.85
  medium:  1.25  (default)
  complex: 1.50
  extreme: 2.00
```

### 10.5 Additional Cost Components
- **Travel:** `travel_miles × travel_cost_per_mile ($0.65/mi)` → `travel_sell: travel_miles × travel_sell_rate ($1.25/mi)`
- **Trip charge:** `trips × trip_cost_rate` (not applied when billing_unit is already `mile` or `trip` — avoids double-billing)
- **Equipment:** Per-day + per-hour rates from `equipment_library` config
- **Subcontract:** `subcontract_cost × (1 + subcontract_markup_percent/100)` (default 20% markup)
- **Permit/pass-through:** Added to both cost and sell at 1:1 (no markup by default)

### 10.6 Sell Method
```
services_sell_method: "cost_plus" | "pass_through_plus_markup" | "max_of_both"

cost_plus:               (total_cost + overhead) × markup_multiplier
pass_through_plus_markup: labor_sell_baseline + travel_sell + equipment_sell + subcontract_sell + permit_sell
max_of_both:             max(cost_plus, pass_through_plus_markup)
```
Each service type can define a `default_suggested_sell_per_hour` that is used as the labor sell rate baseline.

---

## 11. Category: Promotional Items

**Use cases:** Custom magnets, branded merchandise, keychains, pens, branded apparel outsourced to a vendor, promotional kits.

### 11.1 Inputs

| Input Field | Type | Default | Notes |
|---|---|---|---|
| `quantity` | float | 1 | |
| `unit_cost` | float | 0 | Vendor cost per unit |
| `promo_product_type` | enum | — | Product type label for breakdown display |
| `markup_percent` | float | null | null = use default markup |
| `double_sided_art` | string | null | `null`/`"same"`/`"different"` — affects material cost multiplier |
| `include_setup_fee` | bool | false | Add setup fee to price |
| `setup_fee` | float | — | Override setup fee amount |
| `rush_order` | bool | false | |

### 11.2 Calculation Flow

```
1. base_cost = unit_cost  [or defaults.misc_material cost]
   double_sided multiplier:
     "different": × 1.5 (different art both sides)
     "same":      × 1.2 (same art both sides)
     null/other:  × 1.0

2. material_cost = base_cost × quantity × double_sided_multiplier

3. labor_cost = (default_labor_hours_per_unit × quantity) × production_rate

4. setup_fee = data.setup_fee OR defaults.promo_setup_fee  [only if include_setup_fee]
   setup_fee is added FLAT (not marked up, not in overhead basis)

5. overhead_cost = calculate_overhead_cost(material + labor, hours, defaults, cfg)

6. markup_multiplier = data.markup_percent ? (1 + pct/100) : category defaults

7. suggested_price = (material + labor + overhead) × markup_multiplier + setup_fee
   × quantity_discount  [if applicable]
   × rush_multiplier  [if rush_order]
```

### 11.3 Configurable Defaults
```
default_labor_hours_per_unit   float   0.25
default_markup_multiplier      float   2.5
promo_setup_fee                float   15.0
```

---

## 12. Category: Custom / Other

**Use cases:** Anything not covered by other categories. Full manual entry.

### 12.1 Inputs
- `unit_cost` (vendor/material cost per unit)
- `quantity`
- `markup_percent` (or uses global default)
- `include_setup_fee` / `setup_fee`
- `rush_order`

### 12.2 Behavior
Identical to Promotional Items (shares the same structure). Uses `category_defaults.custom` config instead of `category_defaults.promotional`. Suggested for outsourced items where you just need a cost + markup.

---

## 13. Cross-Category Features

### 13.1 Pricing Templates
- Saved per-tenant, per-category configurations
- Stored in `pricing_templates` collection
- Fields: `id`, `tenant_id`, `name`, `description`, `category`, `pricing_data` (full `JobItemPricingData`), `quantity`, `is_favorite`
- Used to pre-fill the calculator for common repeat jobs (e.g., "Standard 3×8 Banner")
- CRUD: `GET/POST/PUT/DELETE /api/pricing/templates`
- Toggle favorite: `PUT /api/pricing/templates/{id}/favorite`

### 13.2 Historical Invoice Import (Benchmark Setup)
System to upload past invoices (PDF, CSV, XLSX) and extract pricing benchmarks.

**Flow:**
1. `POST /api/pricing-setup/imports` (upload files)
2. `PUT /api/pricing-setup/imports/{id}/mapping` (map CSV columns)
3. `POST /api/pricing-setup/imports/{id}/analyze` (AI extraction + aggregate)
4. `POST /api/pricing-setup/imports/{id}/review` (accept/reject suggestions)
   → Accepted suggestions write to `pricing_configuration.selling_price_benchmarks`

**Benchmark fields extracted per category:**
| Category | Benchmark Field |
|---|---|
| vehicle_wraps, banners, rigid_signs, cut_vinyl | `average_sell_price_per_sqft` |
| apparel, custom | `average_sell_price_per_unit` |
| services | `average_sell_price_per_hour` |

### 13.3 Materials Library
All per-tenant materials stored as an array on the `pricing_configuration` document.

**Material schema:**
```
id                              string  mat-{key}
key                             string  canonical key (e.g., "oracal_651")
name                            string  display name
category                        string  vinyl_type | banner_material | substrate | wrap_vinyl | etc.
purchase_type                   string  roll | sheet | piece | sqft
shop_cost_per_sqft              float   what shop pays per sqft
waste_percent                   float   recommended waste %
markup_percent                  float   suggested markup %
suggested_material_charge_per_sqft  float  sell rate used in "compare_methods"
manual_material_charge_per_sqft float  manual override sell rate
cost_per_unit                   float  used for piece-based materials (vinyl rolls, blanks)
retail_base_no_print            float  (apparel only) floor price without decoration
is_active                       bool
compatible_categories           [string]
notes                           string
```

**Starter banner materials** are auto-injected when banner settings are first saved (13oz, 18oz, mesh, fabric).

---

## 14. Data Storage Schema

### Collection: `pricing_configuration` (one per tenant)
```json
{
  "tenant_id": "uuid",
  "updated_at": "ISO string",

  // Global rates
  "hourly_rate": 75,
  "production_hourly_rate": 75,
  "design_hourly_rate": 85,
  "install_hourly_rate": 95,
  "removal_hourly_rate": 65,
  "overhead_percentage": 0,
  "shop_overhead_per_hour": 0,
  "default_markup_multiplier": 2.5,
  "target_profit_margin_percent": 40.0,
  "rush_fee_percentage": 25,
  "minimum_install_charge": 0,
  "file_cleanup_fee_default": 0,

  // Structured labor rates (new system)
  "labor_rates": {
    "production": { "hourly_rate": 75, "minimum_charge": 0 },
    "design": { "hourly_rate": 85, "minimum_charge": 0 },
    "installation": { "hourly_rate": 95, "minimum_charge": 125 },
    "finishing": { "hourly_rate": 75, "minimum_charge": 0 },
    "removal": { "hourly_rate": 65, "minimum_charge": 0 }
  },

  // Design charge settings
  "design_charge_separately": "yes",   // "yes" | "no" | "over_included_minutes"
  "design_included_minutes": 0,
  "design_default_rate": 85,

  // Per-category setup
  "category_pricing_methods": {
    "banners": "compare_methods",
    "rigid_signs": "compare_methods",
    "cut_vinyl": "compare_methods",
    "apparel": "quantity_tier",
    ...
  },
  "category_setup_status": {
    "banners": "compare_ready",
    "rigid_signs": "not_started",
    ...
  },
  "category_defaults": {
    "banners": { ... BannerSetupWizard output ... },
    "rigid_signs": { ... },
    "cut_vinyl": { ... },
    "vehicle_wraps": { ... },
    "apparel": { ... },
    "digital_print": { ... },
    "services": { ... },
    "custom": { ... },
    "promotional": { ... }
  },

  // Materials library
  "materials": [ ... MaterialConfig objects ... ],

  // Hardware accessories
  "hardware_accessories": [
    { "id": "hw-...", "key": "...", "name": "...",
      "purchase_cost": 0, "default_sell_price": 0, "default_labor_addon_minutes": 0 }
  ],

  // Historical benchmarks (from invoice import)
  "selling_price_benchmarks": {
    "banners": { "average_sell_price_per_sqft": 8.50, "average_order_total": 250, "label": "Banners" },
    "vehicle_wraps": { "average_sell_price_per_sqft": 18.00, "average_order_total": 2400, "label": "Vehicle Wraps" }
  },

  // AI estimation overrides
  "ai_estimation_rules": { ... },
  "benchmark_rules": { ... },
  "global_calc_rules": { ... },
  "quantity_breaks": { ... }
}
```

### Collection: `pricing_templates`
```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "name": "Standard 3x8 Banner",
  "description": "Default outdoor banner with grommets",
  "category": "banners",
  "pricing_data": { ... JobItemPricingData ... },
  "quantity": 1,
  "is_favorite": false,
  "created_at": "ISO string",
  "updated_at": "ISO string"
}
```

### Collection: `pricing_imports`
```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "created_by": "uuid",
  "status": "mapping_required | ready_for_analysis | analyzed | reviewed",
  "files": [ { "id", "filename", "extension", "storage_path", "size_bytes", "preview" } ],
  "mapping": { "description_field", "quantity_field", "total_field", "dimension_field", "category_field", "category_overrides" },
  "normalized_rows": [ ... ],
  "analysis_summary": { "invoice_count", "line_item_count", "top_categories", "category_metrics", "suggestions", "outlier_rows" },
  "suggestions": [ { "id", "category_key", "benchmark_field", "suggested_value", "confidence", "status", "final_value" } ],
  "created_at": "ISO string",
  "updated_at": "ISO string"
}
```

---

## 15. API Endpoints

### Pricing Calculation
```
POST   /api/pricing/calculate            → Run calculation for any category
```

**Request:**
```json
{
  "category": "banners",
  "quantity": 5,
  "pricing_data": {
    "width_inches": 36,
    "height_inches": 72,
    "unit_of_measure": "inches",
    "banner_material_key": "18oz_banner",
    "banner_hems": "standard",
    "banner_grommets": "corners",
    "banner_pole_pockets": "top",
    "artwork_ready": true,
    "rush_order": false
  }
}
```

### Pricing Configuration
```
GET    /api/pricing/defaults             → Get tenant pricing config
PUT    /api/pricing/defaults             → Update (deep-merges nested objects)
GET    /api/pricing/settings             → Alias for /defaults
PUT    /api/pricing/settings             → Alias for /defaults
```

### Materials
```
GET    /api/pricing/materials            → All materials (or ?category=banner_material)
```

### Templates
```
GET    /api/pricing/templates            → All templates (or ?category=banners)
POST   /api/pricing/templates            → Create template
PUT    /api/pricing/templates/{id}       → Update template
DELETE /api/pricing/templates/{id}       → Delete template
PUT    /api/pricing/templates/{id}/favorite → Toggle favorite
```

### Historical Invoice Import
```
GET    /api/pricing-setup/imports        → List all imports
POST   /api/pricing-setup/imports        → Upload files (multipart/form-data)
GET    /api/pricing-setup/imports/{id}   → Get import
PUT    /api/pricing-setup/imports/{id}/mapping  → Set column mapping
POST   /api/pricing-setup/imports/{id}/analyze  → Run AI analysis (uses credits)
POST   /api/pricing-setup/imports/{id}/review   → Accept/reject suggestions
POST   /api/pricing-setup/imports/migrate-storage → Migrate local files to object storage
```

---

## 16. Rebuild Notes & Warnings

### 16.1 ALL Money Fields Must Be Integer Cents in the Rebuild
**Current state:** All prices are `float` (`suggested_price`, `material_cost`, etc.)
**Rebuild rule:** Store every monetary value as integer cents. Never use `float` for money.

```python
# RIGHT in rebuild
@dataclass
class Money:
    cents: int
    def dollars(self) -> Decimal: return Decimal(self.cents) / 100

# WRONG (current)
suggested_price: float = 8.50
```

---

### 16.2 The `_normalize_pricing_payload` Shim Is Technical Debt

The current route normalizes 8+ legacy field aliases before calling the engine:
- `width` → `width_inches`
- `height` → `height_inches`
- `length_inches` → `height_inches`
- `square_footage` → `area_sqft`
- `substrate_type + thickness` → normalized `substrate_type_key`

**Rebuild rule:** Start with canonical field names only. Kill all aliases from Day 1.

---

### 16.3 Calculate Function Dispatch Is a Giant If/Switch in Server.py

**Current state:** `calculate_pricing()` is a 4,500-line function in `server.py`. All 9 category functions live in the same file.

**Rebuild rule:**
- Each category → its own module: `pricing/categories/banners.py`, `pricing/categories/rigid_signs.py`, etc.
- `calculate_pricing()` → a registry dict: `CALCULATORS = {"banners": calculate_banners, ...}`
- Category functions accept `(input: CategoryPricingInput, config: TenantPricingConfig) -> PricingResult` — no raw dicts

---

### 16.4 The Materials Library Is a Single Array in One Document

**Current state:** All materials are a flat list embedded in the `pricing_configuration` document. As the library grows (50+ materials), reading and writing this document becomes expensive.

**Rebuild rule:**
- Move to a dedicated `pricing_materials` collection with `{tenant_id, key, category, ...}` per document.
- Index on `(tenant_id, key)` — uniqueness enforced at DB level.
- `find_material()` becomes `await db.pricing_materials.find_one({"tenant_id": t, "key": k})`.

---

### 16.5 The Labor System Has Two Modes — Unify Them

**Current state:** Two parallel labor systems: minute-based (new) and hours-based (legacy fallback). `get_labor_minutes_and_rate()` runs both conditionally with `if labor_minutes > 0`.

**Rebuild rule:** Commit to one system. Minutes is superior (more granular). Remove the hours fallback. Migration: convert old `production_labor_hours_per_sqft` configs to `setup_minutes` + `minutes_per_sqft` at startup.

---

### 16.6 The Apparel Shop Table Is the Right Idea — Generalize It

The apparel category has a brilliant data structure: `shop_pricing_table[brand_key][tier_key][placement_key] = sell_price`. The shop owner literally fills in the prices they charge, and the calculator just looks them up.

**Rebuild rule:** Apply this table-first pattern to yard signs and rigid signs too:
- `rigid_signs_table[substrate_key][size_tier] = sell_price`
- `yard_signs_table[quantity_tier] = sell_price_per_sign`
- Only fall back to cost-plus when the table entry is missing.

---

### 16.7 The Overhead Basis Is Inconsistent Across Categories

In Promotional and Cut Vinyl, the setup fee is explicitly excluded from the overhead basis. In Banners and Vehicle Wraps, it's included. This inconsistency makes margin reporting unreliable.

**Rebuild rule:** Settle on one definition: overhead is calculated on `(material_cost + direct_labor_cost)` only. Setup fees, design fees, and install fees are pass-through charges — never subject to overhead.

---

### 16.8 Pricing Defaults `PUT /defaults` Deep-Merges Some Fields, Not Others

The current `update_pricing_defaults` route deep-merges `category_defaults`, `labor_rates`, `selling_price_benchmarks`, and a few others — but any field NOT in that list is overwritten at the top level. This creates subtle bugs when a frontend update only sends a partial object.

**Rebuild rule:** Use a proper JSON Merge Patch (RFC 7396) for all updates, or design atomic `PATCH /pricing/materials/{key}`, `PATCH /pricing/labor-rates`, `PATCH /pricing/category/{category_id}` endpoints instead of one giant PUT.

---

### 16.9 There Is No Pricing Change History

If a shop owner changes their material costs or labor rates, there is no audit trail of what the rates were when old quotes/jobs were created.

**Rebuild rule:** Snapshot the active pricing config on every quote creation: `quote.pricing_snapshot = { ...pricing_configuration }`. This snapshot is used to reproduce the original calculation, even if rates change later.

---

### 16.10 Category Setup Status Is Only a Display Badge

`category_setup_status` (not_started / basic_setup / detailed_setup / compare_ready / needs_review) is set manually by the admin. The calculator fires regardless of whether a category is "set up" or not — it just uses defaults.

**Rebuild rule:** Add an optional `calculate_requires_setup_complete: bool` guard at the route level. When enabled, reject calculation requests for categories that are still `not_started`.

---

*Generated: 2026-06-10 | Reverse-engineered from server.py (4,843 lines) + PricingCalculator.js (4,045 lines)*

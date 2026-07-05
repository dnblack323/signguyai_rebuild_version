# Pricing System — Full Specification
**SignGuy AI | SignTists Lab**
*Generated: June 2026*

---

## How the Calculator Works — Core Engine

Every category follows the same general pipeline:

```
1. Determine Area (from width × height, unit-converted, wasted-adjusted)
2. Look up Material cost per sqft from Pricing Foundation
3. Calculate Labor (production hrs × rate, with multipliers)
4. Optionally add Design, Install, and Overhead costs
5. Compare cost-plus total vs. sell-rate-based total
6. Return max(cost_plus, sell_rate, minimum) as selling price
7. Apply quantity discounts
```

### Master Formula

```
area_per_piece = (width × height) / 144         (if unit = inches)
area_per_piece = width × height                   (if unit = feet)
billable_area  = max(area_per_piece, min_billable_area)
total_area     = billable_area × quantity
waste_area     = total_area × (1 + waste_percent / 100)

material_cost  = waste_area × material_cost_per_sqft
labor_cost     = (production_hours × production_rate)
               + (design_hours × design_rate)
               + (install_hours × install_rate)
overhead_cost  = (material_cost + labor_cost) × (overhead_percent / 100)
total_cost     = material_cost + labor_cost + overhead_cost

sell_rate_price = waste_area × material_sell_rate_per_sqft
cost_plus_price = total_cost × markup_multiplier
selling_price   = max(cost_plus_price, sell_rate_price, minimum_charge)
```

### Sell Methods

| Method | Used By | Logic |
|---|---|---|
| `max_of_rate_or_minimum` | Banners, Rigid Signs, Cut Vinyl, Digital Print | Take highest of cost-plus, sell-rate, and minimum |
| `max_of_package_or_cost_plus` | Vehicle Wraps | Compare against benchmark package prices |
| Custom / flat | Services, Apparel | Based on hours, units, or shop tables |

---

## Global Labor Rates (Defaults — Tenant Configurable)

| Role | Default Rate |
|---|---|
| Production / Shop Labor | $28.00/hr |
| Design | $85.00/hr |
| Installation | $95.00/hr |
| Removal | $65.00/hr |
| Travel | $45.00/hr |
| Consultation | $110.00/hr |
| Site Survey | $95.00/hr |
| Finishing | $28.00/hr |
| Admin / Project Handling | $35.00/hr |
| Other Labor | $65.00/hr |

### Global Markup & Overhead (Defaults)

| Setting | Default |
|---|---|
| Default Markup Multiplier | 2.5× |
| Target Profit Margin | 40% |
| Overhead Percentage | 15% |
| Production Hourly Rate | $28.00/hr |
| Installer Hourly Rate | $40.00/hr |

---

## Category 1 — Banners

### Quiz Questions (Fields)

| Field Key | Label | Type | Options / Notes | Affects Price |
|---|---|---|---|---|
| `width` | Width | Text | e.g. 8 (ft) or 96 (in) | ✅ |
| `height` | Height | Text | e.g. 3 (ft) or 36 (in) | ✅ |
| `unit_of_measure` | Unit of Measure | Select | Feet / Inches | ✅ |
| `sq_footage` | Square Footage | Calculated | Auto from W × H | ✅ |
| `banner_material_key` | Banner Material Type | Select | 13oz, 18oz, Mesh, Blockout, Pole, Fabric, Double-Sided, Custom | ✅ |
| `banner_use_type` | Use Type | Select | Indoor, Outdoor, Event/Display, Fence, Pole Banner, Backwall/Step-and-Repeat, Custom | ✅ |
| `banner_double_sided` | Double-Sided? | Select | No / Same art both sides / Different art both sides | ✅ |
| `banner_laminate` | Laminate / Coating? | Toggle | Yes/No | ✅ |
| `banner_laminate_type_key` | Laminate / Coating Type | Select | From Foundation materials | ✅ |
| `banner_hems` | Hems | Select | None / Standard / Reinforced | ✅ |
| `banner_grommets` | Grommets | Select | None / Corners Only / Every 2ft / Every 3ft / Custom Count | ✅ |
| `banner_grommet_count` | Grommet Count (if custom) | Number | Manual entry | ✅ |
| `banner_pole_pockets` | Pole Pockets | Select | None / Top Only / Top and Bottom / Side Pockets | ✅ |
| `banner_reinforced_corners` | Reinforced Corners? | Toggle | Yes/No | ✅ |
| `banner_wind_slits` | Wind Slits? | Toggle | Yes/No | ✅ |
| `banner_specialty_sewing` | Specialty Sewing? | Toggle | Yes/No | ✅ |
| `artwork_ready` | Artwork Ready? | Toggle | Skips design charge if Yes | ✅ |
| `artwork_needed` | Artwork Needed? | Toggle | Adds design time if Yes | ✅ |
| `design_complexity` | Design Complexity | Select | Simple / Medium / Complex / Extreme | ✅ |
| `install_required` | Install Required? | Toggle | Yes/No | ✅ |
| `install_complexity` | Install Complexity | Select | Easy / Medium / Difficult / High-Access | ✅ |
| `banner_hardware_keys` | Hardware / Accessories | Multi-Select | Grommets, Stands, Bungees, etc. | ✅ |
| `banner_event_premium` | Step-and-Repeat / Event Premium? | Toggle | Adds 1.20× multiplier | ✅ |
| `rush_order` | Rush? | Toggle | Adds rush % increase | ✅ |
| `packaging_notes` | Packaging / Rolling Notes | Textarea | Display only | |
| `delivery_notes` | Pickup / Delivery Notes | Textarea | Display only | |

### Banner Material Options & Default Costs

| Material Key | Name | Shop Cost/sqft | Sell Rate/sqft |
|---|---|---|---|
| `banner_13oz` | 13 oz Banner | $0.85 | $8.00 |
| `banner_18oz` | 18 oz Banner | $1.25 | $10.00 |
| `banner_mesh` | Mesh Banner | $1.40 | $11.00 |
| `banner_blockout` | Blockout Banner | $1.65 | $12.00 |
| `banner_pole` | Pole Banner Material | $2.25 | $14.00 |
| `banner_fabric` | Fabric Display Banner | $2.75 | $16.00 |
| `banner_double_sided` | Double-Sided Banner | $1.95 | $13.00 |
| `banner_custom` | Specialty / Custom | $2.00 | $12.00 |

### Banner Pricing Calculation

```
billable_area = max(W × H, 4.0 sqft)  [min_billable = 4.0]
waste_area    = billable_area × 1.08    [8% waste]
material_cost = waste_area × banner_material_cost_per_sqft
             + waste_area × banner_print_consumable_cost   [$0.75/sqft]

Finishing add-ons (per linear foot of perimeter):
  standard_hem     = perimeter × $0.75/lft
  reinforced_hem   = perimeter × $1.25/lft
  pole_pocket      = pocket_length × $3.50/lft
  specialty_sewing = length × $2.00/lft

Grommet add-ons:
  cost_per_grommet = $0.20 each  →  sell = $0.75 each (min charge $4.00)
  corners_only → 4 grommets
  every_2ft    → ceil(perimeter / 2) grommets
  every_3ft    → ceil(perimeter / 3) grommets

Extra toggles:
  reinforced_corners = +$6.00
  wind_slits         = +$2.00

Sidedness multipliers:
  single          = 1.0×
  same_both_sides = 1.75×
  different_sides = 2.0×

Event / pole banner premiums:
  event_display         = 1.20× on base
  pole_banner_use_type  = 1.30× on base

production_hours = total_area × 0.10 hr/sqft  (min 0.20 hr)
production_cost  = production_hours × $28/hr

design_hours = base(0.5 hr) × complexity_mult  [if artwork needed]
  complexity_multipliers: simple=1.0, medium=1.25, complex=1.5, extreme=2.0

install_hours = total_area × 0.04 hr/sqft + 0.5 base  [if install required]
  × install_complexity_mult [easy=1.0, medium=1.25, difficult=1.5, high_access=2.0]

overhead      = 15% of (material + labor)
markup        = 2.35×
minimum       = $35.00

selling_price = max(total_cost × 2.35, sell_rate × area, $35.00)
```

### Banner Quantity Discounts

| Qty | Discount |
|---|---|
| 1–2 | 0% |
| 3–9 | 5% |
| 10–24 | 10% |
| 25+ | 15% |

---

## Category 2 — Rigid Signs

### Quiz Questions (Fields)

| Field Key | Label | Type | Options / Notes | Affects Price |
|---|---|---|---|---|
| `width` | Width | Number | Inches or Feet | ✅ |
| `height` | Height | Number | Inches or Feet | ✅ |
| `unit_of_measure` | Unit of Measure | Select | Inches (default) / Feet | ✅ |
| `substrate_type_key` | Substrate Type | Select | See substrate table below | ✅ |
| `thickness` | Thickness | Select | 4mm, 10mm, 3mm, 6mm, .040, .063, .080, 1/8, 1/4, 3/16, 1/2, Custom | ✅ |
| `graphic_method` | Graphic Method | Select | Direct Print / Mounted Print / Cut Vinyl Applied | ✅ |
| `protective_finish` | Protective Finish / Laminate | Toggle | Yes/No | ✅ |
| `protective_finish_type` | Protective Finish Type | Select | Standard / From Foundation | ✅ |
| `sidedness` | Single or Double Sided | Select | Single / Double | ✅ |
| `double_sided_art` | Double-Sided Art | Select | Same Art / Different Art | ✅ |
| `shape_type` | Shape Type | Select | Rectangle / Rounded Corners / Simple Contour / Complex Contour / Specialty Routed | ✅ |
| `finish_quality` | Finish Quality Tier | Select | Standard / Premium / Presentation / Architectural | ✅ |
| `hardware_included` | Hardware Included | Toggle | Yes/No | ✅ |
| `hardware_type` | Hardware Type | Select | H-Stake, Stand-Off, Screws, Easel, Hanging, Custom | ✅ |
| `drill_prep_required` | Drill / Prep Required | Toggle | Yes/No | ✅ |
| `artwork_ready` | Artwork Ready | Toggle | Skips design charge | ✅ |
| `artwork_needed` | Artwork Needed | Toggle | Adds design time | ✅ |
| `design_complexity` | Design Complexity | Select | Simple / Medium / Complex / Extreme | ✅ |
| `install_required` | Install Required | Toggle | Yes/No | ✅ |
| `install_complexity` | Install Complexity | Select | Easy / Medium / Difficult / High-Risk | ✅ |
| `rush_order` | Rush | Toggle | Yes/No | ✅ |

### Substrate Options & Default Costs

| Key | Name | Shop Cost/sqft | Sell Rate/sqft |
|---|---|---|---|
| `coroplast_4mm` | Coroplast 4mm | $0.90 | $10.00 |
| `coroplast_10mm` | Coroplast 10mm | $1.60 | $14.00 |
| `pvc_3mm` | PVC 3mm | $2.25 | $16.00 |
| `pvc_6mm` | PVC 6mm | $3.50 | $22.00 |
| `acm_dibond_3mm` | ACM / Dibond 3mm | $4.25 | $24.00 |
| `aluminum_040` | Aluminum .040 | $3.25 | $18.00 |
| `aluminum_063` | Aluminum .063 | $4.25 | $22.00 |
| `aluminum_080` | Aluminum .080 | $5.25 | $26.00 |
| `acrylic_1_8` | Acrylic 1/8" | $4.50 | $24.00 |
| `acrylic_1_4` | Acrylic 1/4" | $6.50 | $32.00 |
| `foamboard_3_16` | Foamboard 3/16" | $1.25 | $12.00 |
| `mdo_1_2` | MDO 1/2" | $3.75 | $20.00 |
| `custom_other_substrate` | Custom Other | $4.00 | $20.00 |

### Hardware Add-On Prices

| Name | Buy Cost | Sell Price |
|---|---|---|
| Standard H-Stake | $1.50 | $3.50 |
| Heavy-Duty Stake | $2.50 | $5.00 |
| Screws / Mounting Set | $1.00 | $3.00 |
| Stand-Off Set | $3.00 | $7.00 |
| Easel Back | $2.00 | $5.00 |
| Hanging Hardware | $1.50 | $4.00 |
| Drill / Prep Fee | — | $3.00 |

### Rigid Signs Pricing Calculation

```
billable_area = max(W × H, 1.0 sqft)   [min_billable = 1.0]
waste_area    = billable_area × 1.05    [5% waste]
material_cost = waste_area × substrate_cost_per_sqft
             + waste_area × graphic_consumable_cost

  graphic method costs:
    direct_print      → direct_print_consumable   = $1.25/sqft
    mounted_print     → mounted_print_graphic      = $2.00/sqft
    cut_vinyl_applied → oracal_651 cut vinyl rate  = $1.25/sqft

Sidedness multipliers:
  single            = 1.0×
  double_same_art   = 1.75×
  double_diff_art   = 2.0×

Shape multipliers (on labor):
  rectangle         = 1.0×
  rounded_corners   = 1.1×
  simple_contour    = 1.25×
  complex_contour   = 1.5×
  specialty_routed  = 2.0×

Finish quality multipliers:
  standard          = 1.0×
  premium           = 1.15×
  presentation      = 1.3×
  architectural     = 1.5×

Thickness multipliers:
  thin_basic        = 1.0×
  medium            = 1.1×
  thick_heavy       = 1.2×

production_hours = total_area × 0.15 hr/sqft  (min 0.2 hr)
  × shape_multiplier × finish_quality_multiplier × thickness_multiplier
production_cost  = production_hours × $28/hr

design_hours = 0.5 hr base × complexity_mult  [if artwork needed]
install_hours = total_area × 0.08 hr/sqft × install_complexity_mult
              [easy=1.0, medium=1.25, difficult=1.5, high_risk=2.0]

hardware_cost = sum(selected_hardware_sell_prices)

overhead      = 15% of (material + labor)
markup        = 2.45×
minimum       = $25.00

selling_price = max(total_cost × 2.45, sell_rate × area, $25.00)
             + hardware_cost
```

### Rigid Signs Quantity Discounts

| Qty | Discount |
|---|---|
| 1–4 | 0% |
| 5–24 | 5% |
| 25–99 | 10% |
| 100+ | 15% |

---

## Category 3 — Cut Vinyl

### Quiz Questions (Fields)

| Field Key | Label | Type | Options / Notes | Affects Price |
|---|---|---|---|---|
| `width` | Width | Number | Default unit: inches | ✅ |
| `height` | Height | Number | | ✅ |
| `unit_of_measure` | Unit of Measure | Select | Inches (default) / Feet | ✅ |
| `vinyl_type_key` | Vinyl Type | Select | See vinyl table below | ✅ |
| `num_colors` | Number of Colors | Select | 1 / 2 / 3 / 4+ | ✅ |
| `weeding_complexity` | Weeding Complexity | Select | Simple / Medium / Complex / Extreme | ✅ |
| `masking_required` | Masking Required | Toggle | Adds transfer tape cost if Yes | ✅ |
| `use_type` | Application / Use Type | Select | Indoor / Outdoor / Wall / Glass-Window / Vehicle / Specialty | ✅ |
| `artwork_ready` | Artwork Ready | Toggle | Skips design charge | ✅ |
| `artwork_needed` | Artwork Needed | Toggle | Adds design time | ✅ |
| `design_complexity` | Design Complexity | Select | Simple / Medium / Complex / Extreme | ✅ |
| `file_cleanup_needed` | File Cleanup Needed | Toggle | Adds cleanup fee | ✅ |
| `install_required` | Install Required | Toggle | Yes/No | ✅ |
| `install_complexity` | Install Complexity | Select | Easy / Medium / Difficult / Extreme | ✅ |
| `surface_type` | Surface Type | Select | Flat Smooth / Glass-Window / Vehicle / Textured-Rough / Curved-Awkward | ✅ |
| `rush_order` | Rush | Toggle | Yes/No | ✅ |

### Vinyl Type Options & Default Costs

| Key | Name | Shop Cost/sqft | Sell Rate/sqft |
|---|---|---|---|
| `oracal_651` | Oracal 651 | $1.25 | $12.00 |
| `oracal_751` | Oracal 751 | $2.50 | $15.00 |
| `oracal_951` | Oracal 951 | $2.50 | $15.00 |
| `avery_hp750` | Avery HP750 | $2.50 | $15.00 |
| `reflective_vinyl` | Reflective Vinyl | $4.50 | $22.00 |
| `metallic_vinyl` | Metallic Vinyl | $4.50 | $22.00 |
| `fluorescent_vinyl` | Fluorescent Vinyl | $4.50 | $22.00 |
| `etched_frost_vinyl` | Etched / Frost Vinyl | $4.50 | $20.00 |
| `wall_vinyl` | Wall Vinyl | $2.50 | $15.00 |
| `specialty_custom_vinyl` | Specialty / Custom | $4.50 | $24.00 |

### Cut Vinyl Pricing Calculation

```
billable_area = max(W × H, 0.5 sqft)   [min_billable = 0.5]
waste_area    = billable_area × 1.10    [10% waste]
vinyl_cost    = waste_area × vinyl_cost_per_sqft
tape_cost     = waste_area × $0.35/sqft  [if masking_required]
material_cost = vinyl_cost + tape_cost

Color multipliers (on labor hours):
  1 color = 1.0×   2 colors = 1.5×
  3 colors = 2.0×  4+ colors = 2.5×  [flags for manual review]

Weeding multipliers (on labor hours):
  simple=1.0×  medium=1.25×  complex=1.5×  extreme=2.0×

production_hours = total_area × 0.20 hr/sqft  (min 0.25 hr)
  × color_multiplier × weeding_multiplier
production_cost = production_hours × $28/hr

Use type multipliers (on sell price):
  indoor=1.0×   outdoor=1.05×  wall=1.05×
  glass_window=1.1×  vehicle=1.15×  specialty=1.1×

Surface type multipliers (on install):
  flat_smooth=1.0×   glass_window=1.1×   vehicle=1.25×
  textured_rough=1.5×  curved_awkward=1.75×

install_hours = total_area × 0.06 hr/sqft
  × install_complexity_mult × surface_type_mult  [if install required]

file_cleanup_fee = $20.00 flat  [if file_cleanup_needed]

design_hours = 0.5 hr × complexity_mult  [if artwork needed]
overhead     = 15% of (material + labor)
markup       = 2.3×
minimum      = $20.00

selling_price = max(total_cost × 2.3, vinyl_sell_rate × area, $20.00)
  × use_type_multiplier
```

### Cut Vinyl Quantity Discounts

| Qty | Discount |
|---|---|
| 1–5 | 0% |
| 6–24 | 5% |
| 25–99 | 10% |
| 100+ | 15% |

---

## Category 4 — Digital Print

### Quiz Questions (Fields)

| Field Key | Label | Type | Options / Notes | Affects Price |
|---|---|---|---|---|
| `width` | Width | Number | Default unit: inches | ✅ |
| `height` | Height | Number | | ✅ |
| `unit_of_measure` | Unit of Measure | Select | Inches (default) / Feet | ✅ |
| `print_media_key` | Print Media Type | Select | See media table below | ✅ |
| `use_type` | Application / Use Type | Select | Indoor / Outdoor / Display / Floor / Window / Wall / Backlit | ✅ |
| `print_quality_mode` | Print Quality Mode | Select | Draft / Standard / High / Photo | ✅ |
| `ink_coverage_percent` | Ink Coverage % | Number | Default 35%; affects ink cost | ✅ |
| `laminate` | Laminate Required | Toggle | Yes/No | ✅ |
| `laminate_material_key` | Laminate Type | Select | Gloss / Matte / Heavy-Duty / Floor / UV / Specialty | ✅ |
| `contour_cut_type` | Contour Cut Type | Select | None / Simple Contour / Complex Contour / Kiss Cut | ✅ |
| `trim_finish_type` | Trim Finish Type | Select | Standard / Premium | ✅ |
| `piece_separation_required` | Piece Separation Required | Toggle | Adds labor per piece | ✅ |
| `separated_piece_count` | Separated Piece Count | Number | Count of pieces | ✅ |
| `artwork_ready` | Artwork Ready | Toggle | Skips design charge | ✅ |
| `artwork_needed` | Artwork Needed | Toggle | Adds design time | ✅ |
| `design_complexity` | Design Complexity | Select | Simple / Medium / Complex / Extreme | ✅ |
| `file_cleanup_needed` | File Cleanup Needed | Toggle | Adds cleanup fee | ✅ |
| `mounted_to_substrate` | Mounted to Substrate | Toggle | Adds substrate cost | ✅ |
| `substrate_material_key` | Substrate Type | Select | From rigid sign substrates | ✅ |
| `install_required` | Install Required | Toggle | Yes/No | ✅ |
| `install_complexity` | Install Complexity | Select | Easy / Medium / Difficult / Extreme | ✅ |
| `rush_order` | Rush | Toggle | Yes/No | ✅ |

### Print Media Options & Default Costs

| Key | Name | Shop Cost/sqft | Sell Rate/sqft |
|---|---|---|---|
| `printable_adhesive_vinyl` | Printable Adhesive Vinyl | $1.50 | $10.00 |
| `poster_paper` | Poster Paper | $0.60 | $6.00 |
| `canvas` | Canvas | $2.25 | $15.00 |
| `backlit_film` | Backlit Film | $2.50 | $16.00 |
| `perforated_window_film` | Perforated Window Film | $2.75 | $18.00 |
| `wall_graphic_media` | Wall Graphic Media | $2.25 | $14.00 |
| `floor_graphic_media` | Floor Graphic Media | $3.00 | $20.00 |
| `removable_adhesive_print_media` | Removable Adhesive | $1.50 | $10.00 |
| `photo_paper` | Photo Paper | $0.75 | $8.00 |
| `specialty_print_media` | Specialty / Custom | $2.00 | $12.00 |

### Laminate Add-On Costs

| Key | Name | Shop Cost/sqft | Sell Rate/sqft |
|---|---|---|---|
| `laminate_gloss` | Gloss Laminate | $0.85 | — |
| `laminate_matte` | Matte Laminate | $0.85 | — |
| `laminate_heavy_duty` | Heavy-Duty Laminate | $1.25 | — |
| `laminate_floor` | Floor Laminate | $1.25 | — |
| `laminate_uv` | UV Laminate | $0.85 | — |
| `laminate_specialty` | Specialty Laminate | $0.85 | — |

### Digital Print Pricing Calculation

```
billable_area = max(W × H, 1.0 sqft)   [min_billable = 1.0]
waste_area    = billable_area × 1.10    [10% waste]
media_cost    = waste_area × media_cost_per_sqft
ink_cost      = waste_area × $0.75/sqft × (ink_coverage_percent / 100)
laminate_cost = waste_area × laminate_cost_per_sqft  [if laminate required]
substrate_cost= waste_area × substrate_cost_per_sqft  [if mounted_to_substrate]
material_cost = media_cost + ink_cost + laminate_cost + substrate_cost

Print quality multipliers (on production labor):
  draft=0.9×  standard=1.0×  high=1.15×  photo=1.3×

Contour cut multipliers (on production labor):
  none=1.0×  simple=1.2×  complex=1.5×  kiss=1.15×

production_hours = total_area × 0.08 hr/sqft  (min 0.2 hr)
  × quality_mult × contour_mult
  + (separation_count × 0.02 hr/piece)
  + (substrate_mounting: total_area × 0.08 hr/sqft)
production_cost = production_hours × $28/hr

laminate_sell_price = waste_area × laminate_sell_rate  [if laminate required]
design_hours  = 0.5 hr × complexity_mult  [if artwork needed]
install_hours = total_area × 0.08 hr/sqft × install_complexity_mult

overhead      = 15% of (material + labor)
markup        = 2.3×
minimum       = $20.00 per item  (floor $40.00 per order)

selling_price = max(total_cost × 2.3, media_sell_rate × area, $20.00)
             + laminate_sell_price addon
```

### Digital Print Quantity Discounts

| Qty | Discount |
|---|---|
| 1–4 | 0% |
| 5–24 | 5% |
| 25–99 | 10% |
| 100+ | 15% |

---

## Category 5 — Vehicle Wraps / Graphics

### Quiz Questions (Fields)

| Field Key | Label | Type | Options / Notes | Affects Price |
|---|---|---|---|---|
| `vehicle_type` | Vehicle Type | Select | Sedan, SUV, Pickup, Mini Van, Cargo Van, Sprinter, Box Truck (12/16/24ft), Trailer, Semi, Custom | ✅ |
| `vehicle_year` | Year | Text | e.g. 2024 — display only | |
| `vehicle_make` | Make | Autocomplete | Ford, Chevrolet, Ram, Mercedes-Benz, Toyota, etc. | |
| `vehicle_model` | Model | Autocomplete | Transit, Silverado, Sprinter, etc. | |
| `coverage_type` | Coverage Type | Select | Spot Graphics / Partial Wrap / Half Wrap / Full Wrap / Custom % | ✅ |
| `custom_coverage_percent` | Custom Coverage % | Number | Used when coverage_type=custom | ✅ |
| `estimated_vehicle_sqft` | Override Estimated Sq Ft | Number | Overrides vehicle-type defaults | ✅ |
| `wrap_material_key` | Wrap Material | Select | See material table below | ✅ |
| `wrap_laminate_required` | Laminate Required? | Toggle | Yes/No | ✅ |
| `wrap_laminate_type_key` | Laminate Type | Select | Gloss / Matte / Satin | ✅ |
| `window_perf_included` | Window Perf Included? | Toggle | Yes/No | ✅ |
| `window_perf_scope` | Window Perf Scope | Select | Rear Only / Side Windows / Full Window Package | ✅ |
| `artwork_ready` | Artwork Ready? | Toggle | Skips design charge | ✅ |
| `artwork_needed` | Artwork Needed? | Toggle | Default: Yes | ✅ |
| `design_complexity` | Design Complexity | Select | Simple / Medium (default) / Complex / Extreme | ✅ |
| `surface_prep_level` | Surface Prep Required | Select | None / Basic / Moderate / Heavy | ✅ |
| `removal_scope` | Removal Required | Select | None / Small / Partial / Full | ✅ |
| `install_required` | Install Required? | Toggle | Default: Yes | ✅ |
| `install_difficulty_level` | Install Difficulty | Select | Easy / Medium (default) / Difficult / Extreme | ✅ |
| `seam_complexity` | Seam Complexity | Select | Basic / Moderate / Advanced | ✅ |
| `second_installer_required` | Second Installer Required? | Toggle | Yes/No | ✅ |
| `rush_order` | Rush? | Toggle | Adds 30% | ✅ |

### Vehicle Type — Base Square Footage

| Vehicle | Base Sq Ft |
|---|---|
| Car (Sedan) | 150 |
| Car (SUV) | 200 |
| Pickup Truck | 175 |
| Cargo Van | 250 |
| Sprinter Van | 350 |
| Box Truck 12ft | 400 |
| Box Truck 16ft | 500 |
| Box Truck 24ft | 650 |
| Trailer | 450 |
| Semi Truck | 800 |
| Other Vehicle | 160 |

### Wrap Material Options & Costs

| Key | Name | Shop Cost/sqft | Sell Rate/sqft |
|---|---|---|---|
| `wrap_standard_calendared` | Standard Calendared Vinyl | $1.50 | $9.00 |
| `wrap_premium_cast` | Premium Cast Vinyl | $2.75 | $14.00 |
| `wrap_cast_film` | Wrap Cast Film | $3.50 | $18.00 |
| `wrap_reflective` | Reflective Vinyl (Wrap) | $5.00 | $24.00 |
| `wrap_etched_frost` | Etched / Frost Film | $2.75 | $14.00 |
| `wrap_specialty_media` | Specialty / Custom Vehicle Media | $4.00 | $20.00 |

### Wrap Laminate Costs

| Key | Name | Shop Cost/sqft |
|---|---|---|
| `wrap_laminate_gloss` | Gloss Wrap Laminate | $1.25 |
| `wrap_laminate_matte` | Matte Wrap Laminate | $1.25 |
| `wrap_laminate_satin` | Satin Wrap Laminate | $1.35 |

### Package Benchmark Prices (Min Sell Guardrail)

| Vehicle | Spot | Partial | Half | Full |
|---|---|---|---|---|
| Sedan | $150 | $650 | $1,400 | $2,400 |
| SUV | $175 | $750 | $1,600 | $2,800 |
| Pickup | $175 | $750 | $1,600 | $2,800 |
| Cargo Van | $225 | $950 | $2,000 | $3,400 |
| Sprinter Van | $225 | $950 | $2,000 | $3,400 |
| Box Truck 12ft | $250 | $1,100 | $2,300 | $4,000 |
| Box Truck 16ft | $300 | $1,300 | $2,700 | $4,600 |
| Box Truck 24ft | $350 | $1,500 | $3,100 | $5,200 |
| Trailer | $250 | $1,200 | $2,400 | $4,200 |
| Semi Truck | $400 | $1,800 | $3,600 | $6,000 |

### Vehicle Wrap Pricing Calculation

```
base_sqft      = vehicle_type_base_sqft  (from table above)
coverage_pct   = spot=15%, partial=40%, half=55%, full=100%, custom=user_input%
wrap_sqft      = base_sqft × coverage_pct  [or manual override]
waste_pct      = spot=10%, partial=12%, half=12%, full=15%, custom=12%
waste_sqft     = wrap_sqft × (1 + waste_pct)

material_cost  = waste_sqft × wrap_material_cost
laminate_cost  = waste_sqft × laminate_cost_per_sqft  [if required]
window_perf:
  rear  = 18 sqft  sell = $18/sqft
  side  = 14 sqft  sell = $20/sqft
  full  = 40 sqft  sell = both rates

Design time by coverage:
  spot=0.75 hr, partial=1.5 hr, half=2.0 hr, full=3.0 hr
  × design_complexity_mult [simple=1.0, medium=1.25, complex=1.5, extreme=2.0]
design_cost = design_hours × $85/hr

Surface prep hours: none=0, basic=0.25, moderate=0.75, heavy=1.5
Removal hours:      none=0, small=0.5, partial=2.0, full=4.0

Install hours by vehicle + coverage (examples):
  Cargo Van: spot=1.5hr, partial=5hr, half=9hr, full=18hr
  Sprinter:  spot=1.5hr, partial=5hr, half=9hr, full=18hr
  Box 16ft:  spot=2.0hr, partial=7hr, half=12hr, full=24hr

× install_difficulty_mult  [easy=1.0, medium=1.25, difficult=1.5, extreme=2.0]
× seam_complexity_mult     [basic=1.0, moderate=1.15, advanced=1.3]
install_cost = install_hours × $75/hr  (min $125)
             + (second_installer: hours × $35/hr)

production_hours = wrap_sqft × 0.12 hr/sqft  (min 1.0 hr)
production_cost  = production_hours × $28/hr

overhead      = 15%
markup        = 2.4×
rush_premium  = +30%  [if rush_order]

cost_plus_price = total_cost × 2.4
package_price   = benchmark_price[vehicle][coverage]  (from table above)

selling_price = max(cost_plus_price, package_price, $150.00)
             + window_perf_sell_price  [if included]
             + rush_premium
```

---

## Category 6 — Apparel

### Quiz Questions (Fields)

| Field Key | Label | Type | Options / Notes | Affects Price |
|---|---|---|---|---|
| `apparel_product_type` | Product Type | Select | Short Sleeve Tee, Long Sleeve, Crewneck, Hoodie, Polo, Standard Cap, Premium Cap, Visor | ✅ |
| `apparel_brand_style_key` | Brand / Style | Select | Gildan 5000, Bella+Canvas 3001, Gildan 18500, etc. | ✅ |
| `apparel_garment_color` | Garment / Hat Color | Text | Black, White, Navy — display only | |
| `customer_supplied` | Customer Supplied Garments | Toggle | Removes blank cost if Yes | ✅ |
| `size_xs` through `size_5xl` | XS, S, M, L, XL, 2XL, 3XL, 4XL, 5XL | Number | Per-size quantity | ✅ |
| `apparel_plus_size_count` | Plus Size Count (2XL–5XL) | Calculated | Auto-counted | ✅ |
| `apparel_placement_set` | Placement Set (Garments) | Select | Front Small / Back Large / Front + Back | ✅ |
| `apparel_placement_set_hat` | Placement Set (Hats) | Select | Front Only / Side-Back / Front + Side/Back | ✅ |
| `apparel_decoration_method` | Decoration Method | Select | HTV / Screen Print Transfer / DTF Transfer / Direct Screen Print / Embroidery / DTG / Patch / Sublimation / Specialty | ✅ |
| `apparel_decoration_subtype` | Method Detail / Subtype | Text | e.g. Siser EasyWeed, Plastisol — display only | |
| `apparel_num_colors` | Number of Colors | Number | Used for HTV, screen print | ✅ |
| `apparel_stitch_count` | Stitch Count (embroidery) | Number | Used for embroidery cost | ✅ |
| `artwork_ready` | Artwork Ready? | Toggle | Skips design charge | ✅ |
| `artwork_needed` | Artwork Needed? | Toggle | Adds design time | ✅ |
| `design_complexity` | Design Complexity | Select | Simple / Medium / Complex / Extreme | ✅ |
| `apparel_custom_name_number` | Custom Name/Number? | Toggle | Adds per-piece charge | ✅ |
| `apparel_custom_name_number_count` | Name/Number Count | Number | Pieces needing custom names | ✅ |
| `apparel_specialty_finish` | Specialty Finish / Vinyl? | Toggle | Adds upcharge | ✅ |
| `apparel_two_tone_hat_finish` | Two-Tone / Specialty Hat Finish? | Toggle | Hats only | ✅ |
| `apparel_leather_patch` | Leather / Faux Patch? | Toggle | Hats only | ✅ |
| `apparel_bag_and_fold` | Bag & Fold? | Toggle | Adds folding labor | ✅ |
| `rush_order` | Rush? | Toggle | Default 17.5% increase | ✅ |
| `apparel_rush_percent` | Rush % Override | Number | Override the default rush % | ✅ |
| `apparel_manual_quote_override` | Manual Quote Override ($) | Number | Bypasses calculator | ✅ |

### Blank Garment Costs (Default Shop Costs)

| Key | Name | Shop Cost | Retail Base |
|---|---|---|---|
| `blank_ss_gildan_5000` | Short Sleeve Tee — Gildan 5000 | $3.25 | $7.00 |
| `blank_ss_bella_3001` | Short Sleeve Tee — Bella+Canvas 3001 | $5.00 | $9.00 |
| `blank_ls_gildan_2400` | Long Sleeve — Gildan 2400 | $6.00 | $10.00 |
| `blank_ls_bella_3501` | Long Sleeve — Bella+Canvas 3501 | $8.00 | $12.00 |
| `blank_cn_gildan_18000` | Crewneck — Gildan 18000 | $9.00 | $13.00 |
| `blank_cn_bella_3901` | Crewneck — Bella+Canvas 3901 | $11.00 | $15.00 |
| `blank_hd_gildan_18500` | Hoodie — Gildan 18500 | $13.00 | $18.00 |
| `blank_hd_bella_3719` | Hoodie — Bella+Canvas 3719 | $17.00 | $22.00 |
| `blank_po_gildan_8800` | Polo — Gildan 8800 | $6.00 | $12.00 |
| `blank_hat_standard` | Hat — Standard Cap | $4.00 | $10.00 |
| `blank_hat_premium` | Hat — Premium Cap | $6.00 | $13.00 |

### Decoration Method Configs

| Method | Setup Fee | Material Cost | Min Sell/Piece |
|---|---|---|---|
| HTV | $10.00 | $0.50/color/piece | — (shop table) |
| Screen Print Transfer | $15.00 | $0.35/color/piece | — (shop table) |
| DTF Transfer | $10.00 | $0.03/sq in | — (shop table) |
| Direct Screen Print | $30.00/color | $0.25/color/piece | $5.00 |
| Embroidery | $25.00 | $0.75/1,000 stitches | $6.00 |
| DTG | $5.00 | $2.50/piece | $8.00 |
| Patch / Emblem | $0.00 | $3.00/piece | $4.00 |
| Sublimation | $10.00 | $0.04/sq in | $5.00 |
| Specialty / Custom | $20.00 | $3.00/piece | $6.00 |

### Apparel Pricing Calculation

```
total_quantity = sum(size_xs + size_s + ... + size_5xl)  [or manual quantity]
plus_size_qty  = sum(size_2xl + size_3xl + size_4xl + size_5xl)

blank_cost (if not customer_supplied):
  = blank_retail_base × total_quantity
  + plus_size_upcharge × plus_size_qty

decoration_cost = method_config_cost × total_quantity
  HTV:           num_colors × $0.50 × quantity  + $10 setup
  DTF:           sqin_area × $0.03 × quantity   + $10 setup
  Embroidery:    stitch_count / 1000 × $0.75 × quantity + $25 setup
  Screen Print:  num_colors × $0.35 × quantity  + $15 setup
  Direct Screen: $30 × num_colors (setup) + $0.25/color × quantity
  DTG:           $2.50 × quantity + $5 setup
  Patch:         $3.00 × quantity

placement_multipliers:
  front_only = 1.0×  back_large = 1.0×  front_back = 1.8×
  hat_front  = 1.0×  hat_side_back = 0.8×  hat_front_side_back = 1.5×

Add-on charges:
  custom_name_number = +$3.50/piece × count
  specialty_finish   = +$1.50/piece
  two_tone_hat       = +$2.00/piece
  leather_patch      = +$4.00/piece
  bag_and_fold       = +$0.50/piece

production_labor = setup_minutes × $28 + (3 min × quantity × $28/60)
design_hours     = 0.5 hr × complexity_mult  [if artwork needed]

rush_premium  = total × 17.5% (default, configurable)
markup        = 2.15×
minimum       = $60.00 per order

selling_price = max(total_cost × 2.15, minimum per piece × quantity, $60)
  + rush_premium
  [or manual_quote_override if set]
```

---

## Category 7 — Services

### Quiz Questions (Fields)

| Field Key | Label | Type | Options / Notes | Affects Price |
|---|---|---|---|---|
| `service_type` | Service Type | Select | From Pricing Foundation (configurable) | ✅ |
| `services_billing_unit` | Billing Unit | Select | Hour / Flat Fee / Piece / Sq Ft / Linear Ft / Mile / Trip / Day / Custom | ✅ |
| `services_labor_role` | Labor Role | Select | From Pricing Foundation labor roles | ✅ |
| `services_complexity` | Complexity | Select | Easy / Medium / Difficult / Extreme | ✅ |
| `estimated_hours` | Estimated Hours | Number | | ✅ |
| `num_workers` | Number of Workers | Number | Default: 1 | ✅ |
| `services_flat_fee` | Flat Fee ($) | Number | Used when billing_unit=flat | ✅ |
| `services_unit_rate_override` | Unit Rate Override ($) | Number | Overrides role rate | ✅ |
| `hourly_rate_override` | Hourly Rate Override ($) | Number | Overrides default rate | ✅ |
| `services_minimum_applies` | Apply Minimum Charge? | Toggle | Yes/No | ✅ |
| `services_minimum_override` | Minimum Charge Override ($) | Number | | ✅ |
| `services_travel_required` | Travel Required? | Toggle | Yes/No | ✅ |
| `services_travel_miles` | Travel Miles | Number | | ✅ |
| `services_trip_charge_applies` | Trip Charge Applies? | Toggle | Yes/No | ✅ |
| `services_trip_count` | Trip Count | Number | Default: 1 | ✅ |
| `services_equipment_required` | Equipment Required? | Toggle | Yes/No | ✅ |
| `services_equipment_type` | Equipment Type | Select | From equipment library in Foundation | ✅ |
| `services_equipment_days` | Equipment Days | Number | | ✅ |
| `services_equipment_hours` | Equipment Hours | Number | | ✅ |
| `services_subcontracted` | Subcontracted / Outsourced? | Toggle | Yes/No | ✅ |
| `services_subcontract_cost` | Subcontract Cost ($) | Number | | ✅ |
| `services_subcontract_markup_applies` | Apply Markup to Subcontract? | Toggle | Default: Yes | ✅ |
| `services_permit_external_fee` | Permit / External Fee ($) | Number | Pass-through | ✅ |
| `rush_order` | Rush? | Toggle | Yes/No | ✅ |
| `services_manual_quote_override` | Manual Quote Override ($) | Number | Bypasses calculator | ✅ |
| `service_notes` | Service Notes | Textarea | Display only | |

### Services Pricing Calculation

```
labor_cost = estimated_hours × num_workers × labor_role_rate
  × complexity_mult [easy=1.0, medium=1.15, difficult=1.35, extreme=1.75]
  (or flat_fee if billing_unit=flat)
  (or unit_rate × quantity if billing_unit=piece/sqft/etc.)

travel_cost  = travel_miles × mileage_rate  [if travel_required]
trip_charge  = trip_cost × trip_count  [if trip_charge_applies]

equipment_cost = equipment_rate × (equipment_days or equipment_hours)

subcontract = services_subcontract_cost
  × markup_mult [if subcontract_markup_applies, else 1×]

permit_fee = services_permit_external_fee  [pass-through, no markup]

total = labor + travel + trip + equipment + subcontract + permit
  = max(total, minimum_charge)  [if minimum_applies]

rush_premium = total × rush_percent
selling_price = total + rush_premium
[or manual_quote_override if set]
```

---

## Category 8 — Promo / Misc

*Uses simplified promotional calculator with manual pricing, markup, and minimum. No area-based formula. Primarily cost-plus from entered unit cost × markup × quantity.*

---

## Category 9 — Custom

*Fallback category. Uses manual pricing entry: unit_price × quantity, with optional markup override. No automatic calculation engine — intended for one-off items that don't fit any other category.*

---

## Pricing Foundation Settings (Admin Configurable)

Located at: **Settings → Pricing Foundation**

| Setting Group | What You Can Configure |
|---|---|
| **Materials** | All material keys, shop cost per sqft, sell rate per sqft, waste factor, compatible categories |
| **Hardware** | Hardware items, buy cost, sell price, labor add-on minutes |
| **Labor Rates** | Hourly rates per role (design, production, install, removal, travel, etc.) |
| **Category Defaults** | Per-category markup multipliers, minimum charges, default materials, waste percentages |
| **Overhead** | Overhead percentage, shop overhead per hour |
| **Quantity Discounts** | Breakpoints and discount percentages per category |
| **Package Benchmarks** | Vehicle wrap benchmark prices by vehicle + coverage type |

---

## Field → Price Impact Reference

| Field | How It Affects Price |
|---|---|
| Width / Height | Directly determines area → all material and labor costs |
| Quantity | Multiplies area and applies tier discount |
| Material Type | Changes cost_per_sqft and sell_rate_per_sqft |
| Double Sided | 1.75× or 2.0× multiplier on material + labor |
| Complexity (design) | simple=1.0× medium=1.25× complex=1.5× extreme=2.0× |
| Weeding Complexity | simple=1.0× medium=1.25× complex=1.5× extreme=2.0× |
| Install Required | Adds install_hours × install_rate |
| Install Complexity | 1.0× to 2.0× multiplier on install hours |
| Surface Type | 1.0× to 1.75× multiplier on install hours |
| Coverage Type (wraps) | Determines % of vehicle base sqft |
| Vehicle Type (wraps) | Sets base sqft (150–800 sqft range) |
| Artwork Ready? | Yes = $0 design charge |
| Artwork Needed? | Yes = design_hours × $85/hr added |
| Rush? | +17.5–30% depending on category |
| Laminate | Adds laminate_cost_per_sqft × area |
| Grommets | Per-grommet sell price add-on |
| Hardware | Flat sell price per hardware item |

---

*End of Pricing Specification*
*Document path: /app/memory/pricing_spec.md*

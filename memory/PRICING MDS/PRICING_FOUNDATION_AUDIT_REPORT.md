# Pricing Foundation & Materials Library Audit Report
**Date**: December 2025  
**Status**: Audit Complete - Implementation Not Started  
**Purpose**: Map current pricing structure for gradual cleanup

---

## 1. Exact Files Related to Pricing Foundation and Calculator Pricing

### Frontend Files
- **`/app/frontend/src/pages/PricingFoundation.js`** (3,108 lines)
  - Shop defaults, labor rates, overhead, markup
  - Materials Library UI (all material categories)
  - Hardware & Accessories Library UI
  - Category Pricing Rules (8 categories)
  - Cut Vinyl pricing defaults
  - Vehicle wrap defaults
  - Apparel pricing defaults
  - Promotional/Custom defaults

- **`/app/frontend/src/components/PricingCalculator.js`** (3,509 lines)
  - Main pricing calculator UI
  - 9 pricing categories (Promotional, Cut Vinyl, Services, Digital Print, Banners, Rigid Signs, Apparel, Vehicle Graphics, Custom)
  - **HARDCODED material dropdown constants** (see section 5)
  - Form inputs for all calculator categories

- **`/app/frontend/src/components/pricing/PricingSetupQuiz.js`** (1,376 lines)
  - Guided pricing setup wizard
  - 10 quiz sections mapping real-world prices to Foundation fields
  - Suggestion builder that converts quiz answers → Pricing Foundation values

- **`/app/frontend/src/components/pricing/StandardizedPricingBreakdown.js`** (322 lines)
  - Displays pricing calculation results
  - Materials, Labor, Design, Setup, Finishing, Hardware, Install, Outsourcing buckets
  - Margin health checks

### Backend Files
- **`/app/backend/server.py`** (4,799 lines)
  - Contains inline pricing calculation logic (NOT in separate route files)
  - `get_pricing_defaults()` function (line ~194)
  - Pricing calculator endpoints (search for `@api_router.post` + "pricing")
  - Material/hardware storage in MongoDB

### Supporting Files
- **`/app/backend/pricing_foundation_field_usage_audit.py`** (553 lines) - Field usage audit script (READ-ONLY)
- **`/app/backend/quiz_mapping_verification.py`** - Quiz → Foundation mapping validation
- **`/app/frontend/src/pages/MaterialsAdmin.js`** (22 lines) - Redirect stub (Materials moved to Pricing Foundation)

---

## 2. Where the Materials Library is Stored and Rendered

### Storage
- **Database**: MongoDB collection (implied: `pricing_defaults` or tenant-level storage)
- **Backend Access**: Via `get_pricing_defaults(tenant_id)` function in `server.py`
- **Data Structure**: Array of material objects stored in `settings.materials` or similar tenant pricing config

### Rendering Location
- **Primary UI**: `PricingFoundation.js` → **Materials Library Tab**
- **Component**: `MaterialsLibraryTab` function (lines ~372-468)
- **Organization**: Materials grouped by 8 categories:
  1. `print_material` (Print / Banner)
  2. `vinyl` (Vinyl)
  3. `substrate` (Substrates / Boards)
  4. `apparel` (Apparel / Garments)
  5. `decoration` (Decoration Methods)
  6. `lamination` (Lamination)
  7. `hardware` (Hardware / Mounting)
  8. `other` (Other)

- **Separate Hardware Tab**: `HardwareAccessoriesTab` (lines ~534-643)
  - 6 hardware categories (mounting, frames, electrical, hardware, accessories, other)

---

## 3. Current Material Fields Available

### Material Object Schema (from `blankMaterial`, line 177-184)
```javascript
{
  id: string,                    // Unique identifier
  key: string,                   // Material key (e.g., "oracal_651")
  name: string,                  // Display name
  category: string,              // Material category
  subtype: string,               // Optional subtype
  brand: string,                 // Manufacturer brand
  vendor: string,                // Supplier/vendor
  thickness: string,             // Material thickness
  width_inches: number,          // Roll/sheet width
  length_inches: number,         // Roll/sheet length
  roll_sheet_size: string,       // e.g., '24"x50yd'
  purchase_unit: string,         // "roll", "sheet", "each"
  purchase_cost: number,         // What the shop paid for the unit
  cost_per_unit: number,         // Cost per purchase unit
  unit_type: string,             // sqft, each, linear_ft, per_color, etc.
  cost_per_sqft: number,         // ✅ SHOP COST per sq ft
  cost_per_linear_foot: number,  // ✅ SHOP COST per linear ft
  sell_rate_per_sqft: number,    // Optional suggested customer charge/sqft
  waste_factor: number,          // Waste % for this material
  waste_override: number,        // Override waste %
  compatible_categories: array,  // Which pricing categories can use this
  is_active: boolean,            // Active/inactive toggle
  notes: string                  // Free-form notes
}
```

### Hardware Object Schema (from `blankHardware`, line 185-190)
```javascript
{
  id: string,
  name: string,
  category: string,              // Hardware category
  subcategory: string,
  unit_type: string,
  purchase_cost: number,         // ✅ SHOP COST
  default_sell_price: number,    // Optional suggested customer charge
  default_labor_addon_minutes: number,
  compatible_categories: array,
  is_active: boolean,
  notes: string
}
```

---

## 4. Whether Materials Currently Show Required Fields

### ✅ Material Fields Visible in Edit Mode (lines 496-527):

| Field | Display Label | Type | Shop Cost | Sell Price | Markup | Waste |
|-------|---------------|------|-----------|------------|--------|-------|
| `cost_per_unit` | Cost / Unit | ✅ | ✅ | ❌ | ❌ | ❌ |
| `cost_per_sqft` | Cost / Sq Ft | ✅ | ✅ | ❌ | ❌ | ❌ |
| `cost_per_linear_foot` | Cost / Linear Ft | ✅ | ✅ | ❌ | ❌ | ❌ |
| `sell_rate_per_sqft` | **Sell Rate / Sq Ft** | ✅ | ❌ | ✅ | ❌ | ❌ |
| `waste_factor` | **Waste Factor %** | ✅ | ❌ | ❌ | ❌ | ✅ |
| `waste_override` | **Waste Override %** | ✅ | ❌ | ❌ | ❌ | ✅ |
| `purchase_cost` | Purchase Cost | ✅ | ✅ | ❌ | ❌ | ❌ |

### ✅ Hardware Fields Visible (lines 672-691):

| Field | Display Label | Shop Cost | Sell Price | Markup | Notes |
|-------|---------------|-----------|------------|--------|-------|
| `purchase_cost` | Purchase Cost | ✅ | ❌ | ❌ | ✅ |
| `default_sell_price` | **Default Sell Price** | ❌ | ✅ | ❌ | ✅ |
| `default_labor_addon_minutes` | Labor Add-on (min) | ❌ | ❌ | ❌ | ✅ |

### 📊 Summary: Materials DO Show
- ✅ **Shop cost** (cost_per_unit, cost_per_sqft, cost_per_linear_foot, purchase_cost)
- ✅ **Optional suggested sell rate per sqft** (sell_rate_per_sqft) — but NOT universal
- ✅ **Waste** (waste_factor, waste_override)
- ❌ **NO markup multiplier field**
- ❌ **NO charge per sqft** (only optional sell_rate_per_sqft suggestion)

**Important Design Note**: Materials Library focuses on **shop cost data**. Customer-facing sell prices are primarily driven by **Category Pricing Rules** in the Category Rules tab, not by forcing every material to have one universal sell price.

---

## 5. Which Material Dropdowns Are Hardcoded vs Pulling from Materials Library

### 🔴 HARDCODED Material Dropdowns (PricingCalculator.js)

**NOT pulling from Materials Library:**

1. **VINYL_TYPES** (lines 53-64) — 10 hardcoded vinyl types
   - Oracal 651, 751, 951, Avery HP750, Reflective, Metallic, Fluorescent, Etched/Frost, Wall Vinyl, Specialty

2. **PRINT_MATERIALS** (lines 67-75) — 7 hardcoded print materials
   - 13oz Banner, 18oz Banner, Adhesive Vinyl, Poster Paper, Canvas, Backlit Film, Perforated Window Film

3. **SUBSTRATE_TYPES** (lines 157-168) — 10 hardcoded substrate types
   - Coroplast 4mm/10mm, Aluminum .040/.063/.080, PVC 3mm/6mm, Acrylic, Dibond/ACM, MDO Plywood

4. **APPAREL_TYPES** (lines 171-179) — 7 hardcoded apparel types
   - T-Shirt, Hoodie, Hat/Cap, Polo, Tank, Long Sleeve, Jacket

5. **TRANSFER_TYPES** (lines 182-188) — 5 hardcoded transfer types
   - HTV, Screen Print, DTF, Sublimation, Embroidery

6. **VEHICLE_TYPES** (lines 191-203) — 10+ hardcoded vehicle types
   - Sedan, SUV, Pickup, Mini Van, Cargo Van, Sprinter, Box Trucks (12ft, 16ft, 24ft)

### ✅ Dropdowns That DO Pull from Materials Library

**In Category Pricing Rules Tab (PricingFoundation.js, lines 739-756):**

```javascript
// These filter materials array by category:
dpMediaOptions         = materials.filter(m => m.category === 'print_media')
dpLaminateOptions      = materials.filter(m => m.category === 'laminate')
cvVinylOptions         = materials.filter(m => m.category === 'cut_vinyl')
rigidSubstrateOptions  = materials.filter(m => m.category === 'substrate')
rigidFinishOptions     = materials.filter(m => m.category === 'rigid_finish' || 'finish')
rigidGraphicOptions    = materials.filter(m => m.category === 'rigid_graphic')
rigidVinylOptions      = materials.filter(m => m.category === 'cut_vinyl')
bannerMaterialOptions  = materials.filter(m => m.category === 'banner_material')
bannerCoatingOptions   = materials.filter(m => m.category === 'banner_coating' || 'laminate')
vehicleWrapMaterialOptions = materials.filter(m => m.category === 'vehicle_wrap_material')
vehicleWrapLaminateOptions = materials.filter(m => m.category === 'vehicle_wrap_laminate')
apparelBlankOptions    = materials.filter(m => m.category === 'apparel_blank')
bannerHardwareOptions  = hardware_accessories.filter(h => compatible_categories.includes('banners'))
```

**These are used in Category Defaults forms** (Digital Print, Cut Vinyl, Rigid Signs, Banners, Vehicle Graphics, Apparel) to populate default material selections.

### ⚠️ Problem Summary: Material Dropdown Duplication

- **Calculator uses hardcoded lists** → User can't add their own materials to calculator dropdowns
- **Category Rules uses Materials Library** → Dynamic, but only for setting defaults
- **No single source of truth** → Materials Library exists but Calculator doesn't use it for dropdown options

---

## 6. Material Dropdowns with Duplicate, Confusing, or Overlapping Options

### 🔴 Duplicates & Overlaps

1. **Vinyl Confusion**:
   - `VINYL_TYPES` in Calculator has "Adhesive Vinyl" overlap with `PRINT_MATERIALS` "Adhesive Vinyl"
   - "Wall Vinyl" vs general vinyl

2. **Print Materials**:
   - `PRINT_MATERIALS` includes "Adhesive Vinyl" which overlaps with Vinyl category
   - "13oz Banner" vs "18oz Banner" — could be unified as "Banner Material" with weight attribute

3. **Substrate Types**:
   - "Dibond/ACM" — two names for similar product (aluminum composite)
   - Multiple aluminum thicknesses (.040, .063, .080) — could be attribute-based
   - Multiple PVC thicknesses (3mm, 6mm) — could be attribute-based

4. **Coroplast**:
   - Appears in both `SUBSTRATE_TYPES` (Coroplast 4mm, 10mm) and as a rigid sign material
   - Yard sign material confusion

5. **Lamination**:
   - Not in hardcoded lists but exists in Materials Library category
   - Overlaps with "coating" in banner options

### 🟡 Category Classification Issues

Materials Library has 8 categories, but Calculator hardcoded lists use different groupings:
- **Print Material** (Library) vs **PRINT_MATERIALS** (Calculator)
- **Vinyl** (Library) vs **VINYL_TYPES** (Calculator)
- **Substrate** (Library) vs **SUBSTRATE_TYPES** (Calculator)

**Overlapping Concepts**:
- Is "Adhesive Vinyl" a vinyl or a print material?
- Is "Banner 13oz" a print material or banner material?
- Is Coroplast a substrate or a rigid sign material?

---

## 7. Pricing Fields That Appear Duplicate or Legacy/Confusing

### 🔴 HIDDEN_FIELDS_LEVEL_1 (lines 72-97) — Already Marked for Hiding

**These 20 fields are hidden in UI but remain in backend:**

#### Unused Labor Rates (4):
- `admin_hourly_rate`
- `removal_hourly_rate`
- `travel_hourly_rate`
- `project_handling_hourly_rate`

#### Minimum Charges Not Enforced (8):
- `minimum_design_charge`
- `minimum_install_charge`
- `minimum_removal_charge`
- `minimum_vinyl_charge`
- `minimum_print_charge`
- `minimum_sign_charge`
- `minimum_service_charge`
- `minimum_wrap_charge`

#### Setup Fees Not Used (6):
- `setup_fee_vinyl`
- `setup_fee_print`
- `setup_fee_apparel_screen`
- `setup_fee_apparel_dtf`
- `setup_fee_default`
- `file_cleanup_fee_default`

#### AI Fallback Settings (2):
- `ai_fallback_behavior`
- `ai_fallback_warnings_enabled`

### 🟡 Potential Additional Legacy/Duplicate Fields

**Labor Rate Confusion**:
- `production_hourly_rate` vs `hourly_rate` — which is canonical?
- `shop_labor_rate` (from Quiz) vs `production_hourly_rate` — duplicate?
- `design_hourly_rate` appears in both Shop Defaults AND Services category

**Markup Duplication**:
- `default_markup_multiplier` (Shop Defaults)
- `default_markup_percent` (Shop Defaults)
- `material_markup_percent` (Shop Defaults)
- `category_defaults.{category}.default_markup_multiplier` (per-category)
- **Which one wins?**

**Minimum Charge Duplication**:
- `minimum_order` (Shop Defaults)
- `category_defaults.{category}.minimum_charge` (per-category)
- 8× category-specific minimums (hidden but still in backend)

**Waste Duplication**:
- `waste_percentage` (Shop Defaults — global)
- `material.waste_factor` (per-material)
- `material.waste_override` (per-material override)
- **Unclear precedence**

**Overhead Confusion**:
- `overhead_percentage` — percent of what?
- `shop_overhead_per_hour` — applied when?
- `apply_overhead_to_jobs` toggle — but how is it calculated?

---

## 8. Which Pricing Fields Actually Affect Calculator Output

### ✅ ACTIVELY USED (per audit script, lines 44-100)

**Top-Level Rates:**
- `design_hourly_rate`
- `production_hourly_rate` / `hourly_rate`
- `install_hourly_rate`

**Margins & Markups:**
- `target_profit_margin_percent`
- `default_markup_percent`
- `material_markup_percent`

**Minimums:**
- `minimum_order`
- `deposit_percentage`

**Waste & Overhead:**
- `waste_percentage`

**Category Sell Rates (8 categories):**
- `category_defaults.banners.sell_rate_defaults.base_rate`
- `category_defaults.rigid_signs.sell_rate_defaults.base_rate`
- `category_defaults.rigid_signs.sell_rate_defaults.yard_sign_rate`
- `category_defaults.cut_vinyl.sell_rate_defaults.base_rate`
- `category_defaults.digital_print.sell_rate_defaults.base_rate`
- `category_defaults.digital_print.sell_rate_defaults.laminate_addon_per_sqft`
- `category_defaults.vehicle_graphics.sell_rate_defaults.printed_wrap_per_sqft`
- `category_defaults.vehicle_graphics.sell_rate_defaults.color_change_per_sqft`
- `category_defaults.apparel.default_blank_cost`
- `category_defaults.apparel.default_decoration_cost`
- `category_defaults.services.labor_rate_overrides.design`
- `category_defaults.services.labor_rate_overrides.production`
- `category_defaults.services.labor_rate_overrides.install`
- `category_defaults.promotional.default_markup_multiplier`
- `category_defaults.custom.default_markup_multiplier`

**Materials (Cost Inputs):**
- `materials[]` array with `cost_per_sqft` values

**Rush Fees:**
- `rush_fee_percentage`
- `rush_fee_flat`

**Time Estimates (Affect Labor Cost):**
- `weeding_time_per_sqft`
- `application_time_per_sqft`
- `print_time_per_sqft`
- `laminate_time_per_sqft`

**Travel:**
- `mileage_rate`
- `minimum_travel_charge`

**Banner Components:**
- `banner_grommet_price_each`
- `banner_hemming_tape_price_per_linear_inch`

---

## 9. Fields Shown in UI But Do Not Appear to Affect Pricing

### 🔴 DISPLAY-ONLY / INFORMATIONAL FIELDS

**Material Metadata (doesn't affect calculation):**
- `material.brand` — for reference only
- `material.vendor` — for reference only
- `material.thickness` — not used in calc
- `material.width_inches` — not used in calc
- `material.length_inches` — not used in calc
- `material.roll_sheet_size` — display only
- `material.purchase_unit` — informational
- `material.subtype` — not used in calc
- `material.notes` — free-form text

**Hardware Metadata:**
- `hardware.subcategory` — not used in calc
- `hardware.notes` — free-form text

**Category Defaults Fields (not referenced in calculator logic):**
- `category_defaults.{category}.default_material_keys` — informational CSV list
- `category_defaults.{category}.default_hardware_keys` — informational CSV list
- `category_defaults.{category}.default_labor_types` — informational CSV list
- `category_defaults.{category}.ai_prefill_overrides` — notes/JSON field, not parsed by calculator

**Quantity Break Structure (stored but not always applied):**
- `quantity_breaks` object — exists but calculator logic unclear

**Rounding Rule:**
- `rounding_rule` — stored but actual rounding logic unclear

---

## 10. Where Quiz Maps Answers into Pricing Foundation Fields

### Quiz → Foundation Mapping (PricingSetupQuiz.js, lines 425-900+)

**10 Quiz Sections:**
1. **Shop Basics** → `design_hourly_rate`, `production_hourly_rate`, `install_hourly_rate`, `target_profit_margin_percent`, `minimum_order`, `deposit_percentage`

2. **Banners** → `category_defaults.banners.sell_rate_defaults.base_rate`, `category_defaults.banners.default_minimum_sell_price`

3. **Yard Signs / Coroplast** → `category_defaults.rigid_signs.sell_rate_defaults.yard_sign_rate`, `category_defaults.rigid_signs.default_minimum_sell_price`, quantity discounts

4. **Rigid Signs** → `category_defaults.rigid_signs.sell_rate_defaults.base_rate`

5. **Cut Vinyl** → `category_defaults.cut_vinyl.sell_rate_defaults.base_rate`, `category_defaults.cut_vinyl.default_minimum_sell_price`

6. **Digital Print** → `category_defaults.digital_print.sell_rate_defaults.base_rate`, `category_defaults.digital_print.sell_rate_defaults.laminate_addon_per_sqft`

7. **Vehicle Graphics** → `category_defaults.vehicle_graphics.sell_rate_defaults.printed_wrap_per_sqft`, `category_defaults.vehicle_graphics.sell_rate_defaults.color_change_per_sqft`, package benchmarks

8. **Apparel** → `category_defaults.apparel.default_blank_cost`, `category_defaults.apparel.default_decoration_cost`, quantity tiers

9. **Services** → labor rate overrides for design, production, install

10. **Promotional / Custom** → `category_defaults.promotional.default_markup_multiplier`

11. **Labor & Design Time** (Section added later) → production time estimates, design minutes, labor inclusion settings

### Mapping Function: `buildSuggestions(rawAnswers)` (lines 425-900+)
- Converts quiz answers into array of suggestion objects
- Each suggestion has:
  - `id`, `field` (display name), `path` (array path in settings object)
  - `suggestedValue`, `confidence` ('high' or 'review'), `section`
- Phase 6B validation: error-level answers dropped, warn-level answers demote suggestions to 'review'

---

## 11. Which Calculators Already Use Pricing Foundation Defaults

### ✅ Pricing Foundation Integration Status

**Backend**: `get_pricing_defaults(tenant_id)` function (line ~194 in server.py)
- Returns base defaults from `PricingDefaults` model
- Merges with tenant-specific config from `db.pricing_defaults`

**Frontend Calculator (PricingCalculator.js)**:
- Loads pricing defaults on mount
- Uses category-specific sell rates when available
- Falls back to global defaults for labor rates

**Category-Specific Integration:**

| Category | Uses Foundation Defaults? | Notes |
|----------|--------------------------|-------|
| Digital Print | ✅ Partial | Uses `sell_rate_defaults.base_rate` + laminate addon |
| Cut Vinyl | ✅ Partial | Uses `sell_rate_defaults.base_rate` + complexity multipliers |
| Rigid Signs | ✅ Partial | Uses `sell_rate_defaults.base_rate` + substrate-specific logic |
| Banners | ✅ Partial | Uses `sell_rate_defaults.base_rate` + hardware costs |
| Vehicle Graphics | ✅ Partial | Uses `sell_rate_defaults.printed_wrap_per_sqft` + labor rates |
| Apparel | ✅ Partial | Uses `default_blank_cost` + `default_decoration_cost` |
| Services | ✅ Yes | Uses labor rate overrides from category defaults |
| Promotional | ✅ Yes | Uses `default_markup_multiplier` |
| Custom | ✅ Yes | Uses `default_markup_multiplier` |

**"Partial" means**: Calculator pulls some defaults but still has local hardcoded logic for materials, hardware, and complexity adjustments.

---

## 12. Which Calculators Still Appear to Use Hardcoded Values

### 🔴 Hardcoded Calculator Logic (Not Using Materials Library)

**Material Selection Dropdowns** (all hardcoded):
- Cut Vinyl calculator: `VINYL_TYPES` array (10 options)
- Digital Print calculator: `PRINT_MATERIALS` array (7 options)
- Rigid Signs calculator: `SUBSTRATE_TYPES` array (10 options)
- Apparel calculator: `APPAREL_TYPES` + `TRANSFER_TYPES` arrays
- Vehicle Graphics: `VEHICLE_TYPES` array

**None of these pull from Materials Library dynamically.**

**Hardcoded Material Costs**:
- Calculator likely has fallback costs embedded in logic when Materials Library entry not found
- No evidence of dynamic cost lookup from `materials[]` array based on user selection

**Complexity Multipliers**:
- Design complexity, install complexity, weeding levels → appear to be local multiplier logic, not Foundation-driven

**Quantity Break Logic**:
- Quantity discounts exist in Foundation but calculator implementation unclear
- May be using local tiering logic instead

**Labor Time Estimates**:
- `weeding_time_per_sqft`, `print_time_per_sqft`, etc. are in Foundation
- But calculator may also have local time estimate logic embedded

### ⚠️ Mixed Integration
Calculator is in a **hybrid state**:
- ✅ Pulls some Foundation values (sell rates, labor rates)
- 🔴 Still relies on hardcoded material lists
- 🔴 Material cost lookup unclear
- 🔴 Complexity/multiplier logic appears local

---

## Problems Found

### 🔴 Critical Issues

1. **Material Dropdown Duplication**
   - Calculator uses 6+ hardcoded material arrays
   - Materials Library exists but isn't used for calculator dropdowns
   - Users can't add custom materials to calculator without code changes

2. **No Single Source of Truth for Material Costs**
   - Materials Library stores cost data
   - Calculator may have fallback/hardcoded costs
   - Unclear which wins when both exist

3. **Markup & Minimum Confusion**
   - 3+ markup fields (default_markup_multiplier, default_markup_percent, material_markup_percent)
   - 10+ minimum charge fields (global + 8 category-specific + hidden ones)
   - Precedence unclear

4. **20 Hidden/Legacy Fields Still in Backend**
   - Already identified in HIDDEN_FIELDS_LEVEL_1
   - Create maintenance burden and confusion
   - Need safe removal plan

5. **Waste Calculation Precedence Unclear**
   - Global waste_percentage
   - Per-material waste_factor
   - Per-material waste_override
   - Which applies when?

### 🟡 Medium Issues

6. **Labor Rate Duplication**
   - `production_hourly_rate` vs `hourly_rate`
   - `shop_labor_rate` (quiz) vs `production_hourly_rate`
   - Aliases or different concepts?

7. **Overhead Calculation Opaque**
   - `overhead_percentage` — percent of what base?
   - `shop_overhead_per_hour` — how applied?
   - `apply_overhead_to_jobs` toggle exists but logic unclear

8. **Material Metadata Bloat**
   - 8+ fields per material (brand, vendor, thickness, width, etc.)
   - Only ~4 actually affect pricing (cost_per_sqft, cost_per_unit, waste)
   - Rest is informational clutter

9. **Category Classification Overlap**
   - "Adhesive Vinyl" in both Vinyl and Print Materials
   - "Banner 13oz" could be Print Material or Banner Material
   - Coroplast in Substrates and Rigid Signs

10. **Quiz Confidence System Underutilized**
    - Quiz has 'high' vs 'review' confidence levels
    - Phase 6B validation demotes warned answers
    - But user may not understand why suggestions are auto-deselected

### 🟢 Minor Issues

11. **Quantity Breaks Stored But Not Consistently Applied**
    - Foundation has quantity_breaks structure
    - Calculator integration unclear

12. **Rounding Rule Stored But Logic Unclear**
    - 5 rounding options available
    - Actual rounding implementation not visible

13. **Display-Only Fields Clutter Forms**
    - Material notes, brand, vendor don't affect calc
    - Could be collapsed/optional sections

14. **File Size / Complexity**
    - PricingFoundation.js: 3,108 lines
    - PricingCalculator.js: 3,509 lines
    - server.py: 4,799 lines
    - Hard to navigate and maintain

---

## Recommended First Small Implementation Step

### 🎯 Phase 1: Material Dropdown Unification (Safest, Highest Impact)

**Goal**: Make ONE category (Cut Vinyl) pull material options from Materials Library instead of hardcoded `VINYL_TYPES` array.

**Why This First?**
- ✅ Self-contained change (only affects Cut Vinyl calculator)
- ✅ Proves Materials Library can replace hardcoded lists
- ✅ Doesn't break other categories
- ✅ Easy to test and rollback
- ✅ Immediate user benefit (can add custom vinyls)

**Implementation:**

1. **Modify PricingCalculator.js**:
   - Replace hardcoded `VINYL_TYPES` constant with dynamic lookup
   - Fetch materials from Pricing Foundation where `category === 'vinyl'` or `category === 'cut_vinyl'`
   - Populate dropdown from filtered materials array
   - Use `material.cost_per_sqft` for cost calculation instead of hardcoded value

2. **Seed Initial Vinyl Materials** (if Materials Library empty):
   - Run one-time script to populate Materials Library with current `VINYL_TYPES` entries
   - Assign cost_per_sqft values (shop owner can update later)

3. **Update UI Hint**:
   - Add tooltip in Cut Vinyl calculator: "Material options managed in Pricing Foundation → Materials Library"

4. **Test**:
   - Verify Cut Vinyl calculator shows Materials Library vinyls
   - Add new vinyl in Materials Library → confirm it appears in calculator dropdown
   - Remove/deactivate vinyl → confirm it's hidden from dropdown
   - Run pricing calculation → verify cost_per_sqft from Materials Library is used

**Files to Modify:**
- `/app/frontend/src/components/PricingCalculator.js` (Cut Vinyl section only, ~50-100 lines)
- `/app/backend/server.py` (if cost lookup logic needs adjustment)

**Success Metrics:**
- Cut Vinyl dropdown dynamically loads from Materials Library
- Shop owner can add custom vinyl without code changes
- Pricing calculation uses Materials Library cost data
- No regressions in other categories

**Future Rollout:**
- Phase 2: Digital Print materials
- Phase 3: Rigid Sign substrates
- Phase 4: Remaining categories
- Phase 5: Unified material picker UI component

---

## Next Steps After Phase 1 Validation

### Phase 2: Material Cost Standardization
- Audit where calculator looks up material costs
- Ensure all categories use `materials[].cost_per_sqft` from Materials Library
- Remove any hardcoded fallback costs

### Phase 3: Markup & Minimum Consolidation
- Document precedence rules (global vs category vs per-item)
- Consolidate duplicate markup fields
- Hide or remove unused minimum charge fields

### Phase 4: Legacy Field Cleanup
- Remove HIDDEN_FIELDS_LEVEL_1 from backend models (20 fields)
- Archive deprecated fields to separate "legacy" object

### Phase 5: Code Refactoring
- Extract pricing calculation logic from server.py into `/app/backend/routes/pricing.py`
- Break PricingFoundation.js into smaller components
- Create shared Material Picker component

---

**End of Audit Report**

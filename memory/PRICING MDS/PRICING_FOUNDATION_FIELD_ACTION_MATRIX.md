# Pricing Foundation Field Action Matrix

Quick reference table for every field audited.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Keep visible - actively used |
| ⚙️ | Keep visible - affects rules |
| 🔍 | Move to Advanced Settings |
| 📊 | Move to Benchmarks section |
| 🙈 | Hide from main UI |
| ❓ | Needs decision (enforce or hide?) |

---

## All 103 Fields - Action Matrix

| # | Field Path | Classification | Affects Price? | Recommended Action | Priority |
|---|------------|----------------|----------------|-------------------|----------|
| 1 | `admin_hourly_rate` | Stored/Display | ❌ No | 🙈 Hide from UI | P1 |
| 2 | `ai_estimation_rules` | Used Indirectly | ⚙️ Yes (AI behavior) | 🔍 Move to Advanced | P2 |
| 3 | `ai_fallback_behavior` | Stored/Display | ❌ No | 🙈 Hide from UI | P1 |
| 4 | `ai_fallback_warnings_enabled` | Stored/Display | ❌ No | 🙈 Hide from UI | P1 |
| 5 | `application_time_per_sqft` | Actively Used | ✅ Yes | ✅ Keep visible | — |
| 6 | `banner_grommet_price_each` | Actively Used | ✅ Yes | ✅ Keep visible | — |
| 7 | `banner_hemming_tape_price_per_linear_inch` | Actively Used | ✅ Yes | ✅ Keep visible | — |
| 8 | `benchmark_rules` | Used Indirectly | ⚙️ Yes (rules) | 🔍 Move to Advanced | P2 |
| 9 | `complexity_multiplier_base` | Used Indirectly | ⚙️ Yes (multiplier) | 🔍 Move to Advanced | P2 |
| 10 | `complexity_multiplier_max` | Used Indirectly | ⚙️ Yes (multiplier) | 🔍 Move to Advanced | P2 |
| 11 | `default_markup_percent` | Actively Used | ✅ Yes | ✅ Keep visible | — |
| 12 | `deposit_percentage` | Actively Used | ✅ Yes | ✅ Keep visible | — |
| 13 | `design_hourly_rate` | Actively Used | ✅ Yes | ✅ Keep visible | — |
| 14 | `file_cleanup_fee_default` | Stored/Display | ❌ No | 🙈 Hide from UI | P1 |
| 15 | `global_calc_rules` | Used Indirectly | ⚙️ Yes (rules) | 🔍 Move to Advanced | P2 |
| 16 | `hardware_accessories` | Actively Used | ✅ Yes | ✅ Keep visible | — |
| 17 | `hourly_rate` | Actively Used | ✅ Yes | ✅ Keep visible | — |
| 18 | `install_complexity_multiplier_base` | Used Indirectly | ⚙️ Yes (multiplier) | 🔍 Move to Advanced | P2 |
| 19 | `install_complexity_multiplier_max` | Used Indirectly | ⚙️ Yes (multiplier) | 🔍 Move to Advanced | P2 |
| 20 | `install_hourly_rate` | Actively Used | ✅ Yes | ✅ Keep visible | — |
| 21 | `laminate_time_per_sqft` | Actively Used | ✅ Yes | ✅ Keep visible | — |
| 22 | `material_markup_percent` | Actively Used | ✅ Yes | ✅ Keep visible | — |
| 23 | `materials` | Actively Used | ✅ Yes | ✅ Keep visible | — |
| 24 | `mileage_rate` | Actively Used | ✅ Yes | ✅ Keep visible | — |
| 25 | `minimum_design_charge` | Stored/Display | ❌ No | ❓ Enforce or hide? | P3 |
| 26 | `minimum_install_charge` | Stored/Display | ❌ No | ❓ Enforce or hide? | P3 |
| 27 | `minimum_order` | Actively Used | ✅ Yes | ✅ Keep visible | — |
| 28 | `minimum_print_charge` | Stored/Display | ❌ No | 🙈 Hide from UI | P1 |
| 29 | `minimum_removal_charge` | Stored/Display | ❌ No | 🙈 Hide from UI | P1 |
| 30 | `minimum_service_charge` | Stored/Display | ❌ No | 🙈 Hide from UI | P1 |
| 31 | `minimum_sign_charge` | Stored/Display | ❌ No | 🙈 Hide from UI | P1 |
| 32 | `minimum_travel_charge` | Actively Used | ✅ Yes | ✅ Keep visible | — |
| 33 | `minimum_vinyl_charge` | Stored/Display | ❌ No | 🙈 Hide from UI | P1 |
| 34 | `minimum_wrap_charge` | Stored/Display | ❌ No | 🙈 Hide from UI | P1 |
| 35 | `print_time_per_sqft` | Actively Used | ✅ Yes | ✅ Keep visible | — |
| 36 | `production_hourly_rate` | Actively Used | ✅ Yes | ✅ Keep visible | — |
| 37 | `project_handling_hourly_rate` | Stored/Display | ❌ No | 🙈 Hide from UI | P1 |
| 38 | `quantity_breaks` | Used Indirectly | ⚙️ Yes (rules) | 🔍 Move to Advanced | P2 |
| 39 | `removal_hourly_rate` | Stored/Display | ❌ No | 🙈 Hide from UI | P1 |
| 40 | `rounding_rule` | Used Indirectly | ⚙️ Yes (rounding) | 🔍 Move to Advanced | P2 |
| 41 | `rush_fee_flat` | Actively Used | ✅ Yes | ✅ Keep visible | — |
| 42 | `rush_fee_percentage` | Actively Used | ✅ Yes | ✅ Keep visible | — |
| 43 | `selling_price_benchmarks` | Stored/Display | ❌ No (reference only) | 📊 Move to Benchmarks | P2 |
| 44 | `setup_fee_apparel_dtf` | Stored/Display | ❌ No | 🙈 Hide from UI | P1 |
| 45 | `setup_fee_apparel_screen` | Stored/Display | ❌ No | 🙈 Hide from UI | P1 |
| 46 | `setup_fee_default` | Stored/Display | ❌ No | 🙈 Hide from UI | P1 |
| 47 | `setup_fee_print` | Stored/Display | ❌ No | 🙈 Hide from UI | P1 |
| 48 | `setup_fee_vinyl` | Stored/Display | ❌ No | 🙈 Hide from UI | P1 |
| 49 | `target_profit_margin_percent` | Actively Used | ✅ Yes | ✅ Keep visible | — |
| 50 | `tenant_id` | Actively Used | — (identifier) | ✅ Keep (internal) | — |
| 51 | `travel_hourly_rate` | Stored/Display | ❌ No | 🙈 Hide from UI | P1 |
| 52 | `waste_percentage` | Actively Used | ✅ Yes | ✅ Keep visible | — |
| 53 | `weeding_time_per_sqft` | Actively Used | ✅ Yes | ✅ Keep visible | — |

### Category Defaults - Banners

| # | Field Path | Classification | Affects Price? | Recommended Action | Priority |
|---|------------|----------------|----------------|-------------------|----------|
| 54 | `category_defaults.banners.sell_rate_defaults.base_rate` | Actively Used | ✅ Yes | ✅ Keep visible | — |
| 55 | `category_defaults.banners.sell_rate_defaults.large_format_rate` | Stored/Display | ❌ No | 🙈 Hide from UI | P1 |
| 56 | `category_defaults.banners.default_minimum_sell_price` | Stored/Display | ❌ No | ❓ Enforce or hide? | P3 |
| 57 | `category_defaults.banners.cost_multipliers` | Stored/Display | ❌ No | 🙈 Hide from UI | P1 |

### Category Defaults - Rigid Signs

| # | Field Path | Classification | Affects Price? | Recommended Action | Priority |
|---|------------|----------------|----------------|-------------------|----------|
| 58 | `category_defaults.rigid_signs.sell_rate_defaults.base_rate` | Actively Used | ✅ Yes | ✅ Keep visible | — |
| 59 | `category_defaults.rigid_signs.sell_rate_defaults.yard_sign_rate` | Actively Used | ✅ Yes | ✅ Keep visible | — |
| 60 | `category_defaults.rigid_signs.default_minimum_sell_price` | Stored/Display | ❌ No | ❓ Enforce or hide? | P3 |
| 61 | `category_defaults.rigid_signs.quantity_breaks.qty_10_percent` | Stored/Display | ❌ No | ❓ Apply discount or hide? | P3 |
| 62 | `category_defaults.rigid_signs.quantity_breaks.qty_25_percent` | Stored/Display | ❌ No | ❓ Apply discount or hide? | P3 |

### Category Defaults - Cut Vinyl

| # | Field Path | Classification | Affects Price? | Recommended Action | Priority |
|---|------------|----------------|----------------|-------------------|----------|
| 63 | `category_defaults.cut_vinyl.sell_rate_defaults.base_rate` | Actively Used | ✅ Yes | ✅ Keep visible | — |
| 64 | `category_defaults.cut_vinyl.default_minimum_sell_price` | Stored/Display | ❌ No | ❓ Enforce or hide? | P3 |

### Category Defaults - Digital Print

| # | Field Path | Classification | Affects Price? | Recommended Action | Priority |
|---|------------|----------------|----------------|-------------------|----------|
| 65 | `category_defaults.digital_print.sell_rate_defaults.base_rate` | Actively Used | ✅ Yes | ✅ Keep visible | — |
| 66 | `category_defaults.digital_print.sell_rate_defaults.laminate_addon_per_sqft` | Actively Used | ✅ Yes | ✅ Keep visible | — |

### Category Defaults - Vehicle Graphics

| # | Field Path | Classification | Affects Price? | Recommended Action | Priority |
|---|------------|----------------|----------------|-------------------|----------|
| 67 | `category_defaults.vehicle_graphics.sell_rate_defaults.printed_wrap_per_sqft` | Actively Used | ✅ Yes | ✅ Keep visible | — |
| 68 | `category_defaults.vehicle_graphics.sell_rate_defaults.color_change_per_sqft` | Actively Used | ✅ Yes | ✅ Keep visible | — |
| 69 | `category_defaults.vehicle_graphics.benchmarks.package_door_lettering` | Stored/Display | ❌ No (reference) | 📊 Move to Benchmarks | P2 |
| 70 | `category_defaults.vehicle_graphics.benchmarks.package_spot_graphics` | Stored/Display | ❌ No (reference) | 📊 Move to Benchmarks | P2 |
| 71 | `category_defaults.vehicle_graphics.benchmarks.package_partial_wrap` | Stored/Display | ❌ No (reference) | 📊 Move to Benchmarks | P2 |
| 72 | `category_defaults.vehicle_graphics.benchmarks.package_full_wrap` | Stored/Display | ❌ No (reference) | 📊 Move to Benchmarks | P2 |

### Category Defaults - Apparel

| # | Field Path | Classification | Affects Price? | Recommended Action | Priority |
|---|------------|----------------|----------------|-------------------|----------|
| 73 | `category_defaults.apparel.default_blank_cost` | Actively Used | ✅ Yes | ✅ Keep visible | — |
| 74 | `category_defaults.apparel.default_decoration_cost` | Actively Used | ✅ Yes | ✅ Keep visible | — |
| 75 | `category_defaults.apparel.shop_pricing_table` | Stored/Display | ❌ No (reference) | 📊 Move to Benchmarks | P2 |

### Category Defaults - Services

| # | Field Path | Classification | Affects Price? | Recommended Action | Priority |
|---|------------|----------------|----------------|-------------------|----------|
| 76 | `category_defaults.services.labor_rate_overrides.design` | Actively Used | ✅ Yes | ✅ Keep visible | — |
| 77 | `category_defaults.services.labor_rate_overrides.production` | Actively Used | ✅ Yes | ✅ Keep visible | — |
| 78 | `category_defaults.services.labor_rate_overrides.install` | Actively Used | ✅ Yes | ✅ Keep visible | — |
| 79 | `category_defaults.services.minimums.design` | Stored/Display | ❌ No | ❓ Enforce or hide? | P3 |
| 80 | `category_defaults.services.minimums.install` | Stored/Display | ❌ No | ❓ Enforce or hide? | P3 |

### Category Defaults - Promotional

| # | Field Path | Classification | Affects Price? | Recommended Action | Priority |
|---|------------|----------------|----------------|-------------------|----------|
| 81 | `category_defaults.promotional.default_markup_multiplier` | Actively Used | ✅ Yes | ✅ Keep visible | — |
| 82 | `category_defaults.promotional.minimum_setup_fee` | Stored/Display | ❌ No | 🙈 Hide from UI | P1 |
| 83 | `category_defaults.promotional.minimum_charge` | Stored/Display | ❌ No | 🙈 Hide from UI | P1 |

### Category Defaults - Custom

| # | Field Path | Classification | Affects Price? | Recommended Action | Priority |
|---|------------|----------------|----------------|-------------------|----------|
| 84 | `category_defaults.custom.default_markup_multiplier` | Actively Used | ✅ Yes | ✅ Keep visible | — |

---

## Action Summary

| Recommended Action | Count | Priority | Effort |
|--------------------|-------|----------|--------|
| ✅ Keep visible (actively used) | 49 | — | None |
| ⚙️ Keep visible (affects rules) | 9 | — | None |
| 🙈 Hide from main UI | 22 | P1 | Low |
| 🔍 Move to Advanced Settings | 10 | P2 | Low |
| 📊 Move to Benchmarks section | 9 | P2 | Medium |
| ❓ Needs decision (enforce or hide?) | 8 | P3 | Medium-High |

**Total fields:** 103  
**Action needed:** 49 fields (47.6%)  
**Keep as-is:** 54 fields (52.4%)

---

## Priority Levels

### P1 (Quick Wins) - 22 Fields

**Action:** Hide from main UI  
**Impact:** Immediate UI cleanup  
**Effort:** 1-2 days  
**Risk:** None (fields remain in backend)

**Fields:** All minimum charges, setup fees, unused labor rates, AI fallback settings, large_format_rate, cost_multipliers, promotional minimums

### P2 (Organization) - 19 Fields

**Action:** Reorganize into Advanced/Benchmarks sections  
**Impact:** Better UI organization  
**Effort:** 3-5 days  
**Risk:** None (just reorganization)

**Fields:** AI rules, calc rules, complexity multipliers, rounding_rule, all benchmark pricing, apparel shop pricing table

### P3 (Feature Decision) - 8 Fields

**Action:** Decide whether to enforce in calculator or hide  
**Impact:** Either activates dormant features or removes clutter  
**Effort:** Varies (calculator updates if enforcing)  
**Risk:** Medium (requires calculator changes if enforcing)

**Fields:** Category minimum sell prices, quantity discounts, service minimums

---

## Quick Implementation Guide

### Step 1: Hide P1 Fields (1 day)

Update `/app/frontend/src/pages/PricingFoundation.js`:

```javascript
// Add hidden fields array
const HIDDEN_FIELDS = [
  'admin_hourly_rate',
  'removal_hourly_rate',
  'travel_hourly_rate',
  'project_handling_hourly_rate',
  'minimum_design_charge',
  'minimum_install_charge',
  'minimum_removal_charge',
  'minimum_vinyl_charge',
  'minimum_print_charge',
  'minimum_sign_charge',
  'minimum_service_charge',
  'minimum_wrap_charge',
  'setup_fee_vinyl',
  'setup_fee_print',
  'setup_fee_apparel_screen',
  'setup_fee_apparel_dtf',
  'setup_fee_default',
  'file_cleanup_fee_default',
  'ai_fallback_behavior',
  'ai_fallback_warnings_enabled',
  'category_defaults.banners.large_format_rate',
  'category_defaults.banners.cost_multipliers',
  'category_defaults.promotional.minimum_setup_fee',
  'category_defaults.promotional.minimum_charge',
];

// Filter fields in render
const visibleFields = allFields.filter(f => !HIDDEN_FIELDS.includes(f.path));
```

### Step 2: Create Advanced Section (2 days)

Add collapsible "Advanced Settings" section:

```javascript
<Collapsible title="Advanced Settings (Rarely Changed)">
  {/* Move these fields here: */}
  {/* - ai_estimation_rules */}
  {/* - benchmark_rules */}
  {/* - global_calc_rules */}
  {/* - complexity multipliers (4 fields) */}
  {/* - rounding_rule */}
  {/* - quantity_breaks */}
</Collapsible>
```

### Step 3: Create Benchmarks Tab (3 days)

Add separate "Market Benchmarks" tab:

```javascript
<Tabs>
  <Tab label="Active Pricing">
    {/* Current pricing fields */}
  </Tab>
  <Tab label="Market Benchmarks">
    <Alert>These are reference prices only. They do not affect your calculated quotes.</Alert>
    {/* - selling_price_benchmarks */}
    {/* - vehicle_graphics.benchmarks */}
    {/* - apparel.shop_pricing_table */}
  </Tab>
</Tabs>
```

---

## Files Generated

- **Full Audit:** `/app/PRICING_FOUNDATION_FIELD_USAGE_AUDIT.md`
- **Cleanup Plan:** `/app/PRICING_FOUNDATION_CLEANUP_PLAN.md`
- **Action Matrix:** `/app/PRICING_FOUNDATION_FIELD_ACTION_MATRIX.md` (this file)
- **Audit Data:** `/app/pricing_foundation_field_usage_audit.json`

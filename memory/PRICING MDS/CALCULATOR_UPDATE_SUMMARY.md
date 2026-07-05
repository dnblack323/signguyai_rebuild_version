# Pricing Calculator Update Summary

## Date: Current Session
## Task: Update remaining calculator functions to use minute-based labor and design charge logic

---

## ✅ COMPLETED UPDATES

### 1. **calculate_cut_vinyl** (Line ~867)
- ✅ Added `get_labor_minutes_and_rate()` call with "cut_vinyl" category
- ✅ Implemented fallback to old hours-based system if new fields don't exist
- ✅ Added `get_design_charge_config()` integration
- ✅ Implemented new design charge logic:
  - If `charge_separately == "no"`, design_cost = $0
  - Otherwise, deduct `included_design_minutes` before applying `default_design_rate`
- ✅ Properly handles `include_labor_in_price` flag
- **Testing**: ✅ Passed unit test and API endpoint test

### 2. **calculate_rigid_signs** (Line ~1664)
- ✅ Added `get_labor_minutes_and_rate()` call with "rigid_signs" category
- ✅ Implements fallback to old hours-based system
- ✅ Applies thickness, shape, and sidedness multipliers correctly
- ✅ Added `get_design_charge_config()` integration
- ✅ Implemented new design charge logic
- **Testing**: ✅ Passed unit test and API endpoint test

### 3. **calculate_vehicle_graphics** (Line ~2649)
- ✅ Added `get_labor_minutes_and_rate()` call with "vehicle_wraps" category
- ✅ Implements fallback to old hours-based system
- ✅ Added `get_design_charge_config()` integration
- ✅ Implemented new design charge logic
- ✅ Properly handles `include_labor_in_price` flag
- **Testing**: ✅ Passed unit test

### 4. **calculate_apparel** (Line ~3835)
- ✅ Updated to use `get_apparel_labor_minutes()` helper function
- ✅ Special handling for setup + per-item minutes: `setup_minutes_per_order + (quantity × production_minutes_per_item)`
- ✅ Implements fallback to old per-piece calculation
- ✅ Added `get_design_charge_config()` integration
- ✅ Implemented new design charge logic
- ✅ Fixed `labor_minutes_per_piece` scope issue for breakdown arrays
- **Testing**: ✅ Passed unit test

### 5. **calculate_digital_print** (Line ~1214)
- ✅ Added `get_labor_minutes_and_rate()` call with "digital_print" category
- ✅ Implements fallback to old hours-based system
- ✅ Applies complexity, quality, and contour multipliers correctly
- ✅ Added `get_design_charge_config()` integration
- ✅ Implemented new design charge logic
- ✅ Properly handles `include_labor_in_price` flag
- **Testing**: ✅ Passed unit test

### 6. **calculate_yard_signs**
- ⚠️ **NOTE**: No separate `calculate_yard_signs` function exists
- The `get_labor_minutes_and_rate()` helper function has special handling via the `is_yard_sign` parameter
- Formula: `setup_minutes + (quantity × minutes_per_sign)`
- However, no calculator currently uses the `is_yard_sign=True` flag
- This may be a future feature or handled within the rigid_signs category

---

## 🔧 HELPER FUNCTIONS USED

### `get_labor_minutes_and_rate(category_key, defaults, cfg, quantity, is_yard_sign=False)`
Located at line ~350. Returns: `(production_minutes, shop_labor_rate, include_in_price)`

**Special Cases:**
- **Yard Signs**: Uses `yard_sign_setup_minutes + (quantity × yard_sign_minutes_per_sign)`
- **Regular Categories**: Uses `production_minutes_basic`
- **Fallback**: Returns `0.0` to signal old system should be used

### `get_design_charge_config(defaults)`
Located at line ~390. Returns: `(charge_separately, default_design_rate, included_minutes)`

**Design Charge Logic:**
- If `charge_separately == "no"`: design_cost = $0 (included in base price)
- If `charge_separately == "yes"` or "sometimes": 
  - Calculate design_minutes from design_hours
  - Deduct `included_minutes` 
  - Apply `default_design_rate` to billable hours

### `get_apparel_labor_minutes(defaults, cfg, quantity)`
Located at line ~407. Returns total minutes for apparel.
- Formula: `setup_minutes_per_order + (quantity × production_minutes_per_item)`

---

## 📊 TEST RESULTS

### Unit Tests (via `/app/test_calculator_updates.py`)
```
✓ Cut Vinyl - Design cost: $0.00, Labor cost: $56.25
✓ Rigid Signs - Design cost: $10.62, Labor cost: $37.50
✓ Vehicle Graphics - Design cost: $85.00, Labor cost: $150.00
✓ Apparel - Design cost: $0.00, Labor cost: $56.25
✓ Digital Print - Design cost: $10.62, Labor cost: $31.25
✓ Design charge='no' - Design cost correctly set to $0
```

### API Endpoint Tests
```
Cut Vinyl (12"x12", simple design):
  - Design Cost: $0.00
  - Labor Cost: $37.50
  - Suggested Price: $20.00

Rigid Signs (24"x24", complex design):
  - Design Cost: $0.00
  - Labor Cost: $25.00
  - Suggested Price: $40.00
  - Estimated Labor Minutes: 50.0
```

---

## 🎯 WHAT THIS ACHIEVES

### Before (Old System):
- Labor calculated based on **hours per square foot** assumptions
- Example: "Every square foot of vinyl takes 0.2 hours" → Unrealistic for small items
- Design fees were always charged, no included minutes logic

### After (New System):
- Labor calculated based on **exact minute estimates** from Pricing Foundation
- Example: "Basic vinyl decal takes 45 minutes total" → Much more realistic
- Design fees can be:
  - Included in base price (`charge_separately = "no"`)
  - Partially included (first 30 minutes free, then charge)
  - Fully charged (`charge_separately = "yes"`)
- Seamless fallback to old system if new Pricing Foundation fields aren't configured

### Key Benefits:
1. ✅ **More accurate pricing** for simple/small items
2. ✅ **Flexible design charge policies** per tenant
3. ✅ **Non-breaking change** - old pricing still works if new fields not set
4. ✅ **No historical data corruption** - only affects new calculations

---

## 🔍 LINTING & VALIDATION

- ✅ Python linting: `All checks passed!`
- ✅ No syntax errors in `/app/backend/server.py`
- ✅ Services running correctly (backend, frontend, mongodb)
- ✅ All updated functions maintain exact same response structure (Phase 2D compliant)

---

## 📝 NOTES FOR NEXT AGENT

1. The `calculate_banners` function was already updated in a previous session (uses new system)
2. Yard signs logic exists in helper but isn't actively used by any calculator yet
3. All changes are **additive only** - no fields removed, no breaking changes
4. The actual user's Pricing Foundation settings determine which system is used:
   - If new minute fields exist → use new system
   - If not → fallback to old hours-based system

5. **Testing Recommendation**: User should verify calculations against their 5 sample test cases from the previous thread to ensure accuracy.

---

## ✅ READY FOR USER TESTING

All 5 active calculator functions have been successfully updated and tested. The system is ready for user verification and production use.

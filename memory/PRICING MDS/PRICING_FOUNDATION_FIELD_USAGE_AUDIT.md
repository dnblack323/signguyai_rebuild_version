# Pricing Foundation Field Usage Audit Report

**Generated:** 2026-05-18T04:24:13.297196  
**Total Fields Audited:** 103  

---

## Summary Statistics

| Classification | Count | Percentage |
|----------------|-------|------------|
| ACTIVELY_USED | 49 | 47.6% |
| USED_INDIRECTLY | 9 | 8.7% |
| STORED_DISPLAY | 45 | 43.7% |
| QUIZ_MAPPED_ONLY | 0 | 0.0% |
| UNUSED | 0 | 0.0% |
| NEEDS_REVIEW | 0 | 0.0% |

---


## ACTIVELY_USED

**Definition:** Actively Used - Field directly changes pricing output  
**Count:** 49  

| Field Path | Reason | Code Usage |
|------------|--------|------------|
| `application_time_per_sqft` | Verified in calculator code - directly affects price output | Backend: 2 files, Frontend: 1 files |
| `banner_grommet_price_each` | Verified in calculator code - directly affects price output | Backend: 3 files, Frontend: 1 files |
| `banner_hemming_tape_price_per_linear_inch` | Verified in calculator code - directly affects price output | Backend: 3 files, Frontend: 1 files |
| `category_defaults` | Found in pricing logic: backend/quiz_mapping_verification.py, backend/server.py | Backend: 5 files, Frontend: 3 files |
| `category_defaults.apparel` | Found in pricing logic: backend/pricing_foundation_field_usage_audit.py, backend/quiz_mapping_verification.py | Backend: 5 files, Frontend: 5 files |
| `category_defaults.apparel.default_blank_cost` | Verified in calculator code - directly affects price output | Backend: 2 files, Frontend: 1 files |
| `category_defaults.apparel.default_decoration_cost` | Verified in calculator code - directly affects price output | Backend: 2 files, Frontend: 1 files |
| `category_defaults.banners` | Found in pricing logic: backend/quiz_mapping_verification.py, backend/server.py | Backend: 5 files, Frontend: 5 files |
| `category_defaults.banners.sell_rate_defaults.base_rate` | Verified in calculator code - directly affects price output | Backend: 2 files, Frontend: 2 files |
| `category_defaults.custom` | Found in pricing logic: backend/pricing_foundation_field_usage_audit.py, backend/quiz_mapping_verification.py | Backend: 5 files, Frontend: 5 files |
| `category_defaults.custom.default_markup_multiplier` | Verified in calculator code - directly affects price output | Backend: 5 files, Frontend: 3 files |
| `category_defaults.cut_vinyl` | Found in pricing logic: backend/pricing_foundation_field_usage_audit.py, backend/quiz_mapping_verification.py | Backend: 5 files, Frontend: 5 files |
| `category_defaults.cut_vinyl.sell_rate_defaults.base_rate` | Verified in calculator code - directly affects price output | Backend: 3 files, Frontend: 2 files |
| `category_defaults.digital_print` | Found in pricing logic: backend/pricing_foundation_field_usage_audit.py, backend/quiz_mapping_verification.py | Backend: 5 files, Frontend: 5 files |
| `category_defaults.digital_print.sell_rate_defaults.base_rate` | Verified in calculator code - directly affects price output | Backend: 3 files, Frontend: 2 files |
| `category_defaults.digital_print.sell_rate_defaults.laminate_addon_per_sqft` | Verified in calculator code - directly affects price output | Backend: 2 files, Frontend: 1 files |
| `category_defaults.promotional` | Found in pricing logic: backend/pricing_foundation_field_usage_audit.py, backend/quiz_mapping_verification.py | Backend: 5 files, Frontend: 5 files |
| `category_defaults.promotional.default_markup_multiplier` | Verified in calculator code - directly affects price output | Backend: 5 files, Frontend: 3 files |
| `category_defaults.rigid_signs` | Found in pricing logic: backend/pricing_foundation_field_usage_audit.py, backend/quiz_mapping_verification.py | Backend: 5 files, Frontend: 5 files |
| `category_defaults.rigid_signs.sell_rate_defaults.base_rate` | Verified in calculator code - directly affects price output | Backend: 3 files, Frontend: 2 files |
| `category_defaults.rigid_signs.sell_rate_defaults.yard_sign_rate` | Verified in calculator code - directly affects price output | Backend: 2 files, Frontend: 1 files |
| `category_defaults.services` | Found in pricing logic: backend/pricing_foundation_field_usage_audit.py, backend/quiz_mapping_verification.py | Backend: 5 files, Frontend: 5 files |
| `category_defaults.services.labor_rate_overrides.design` | Verified in calculator code - directly affects price output | Backend: 5 files, Frontend: 5 files |
| `category_defaults.services.labor_rate_overrides.install` | Verified in calculator code - directly affects price output | Backend: 5 files, Frontend: 5 files |
| `category_defaults.services.labor_rate_overrides.production` | Verified in calculator code - directly affects price output | Backend: 5 files, Frontend: 5 files |
| `category_defaults.services.minimums` | Found in pricing logic: backend/pricing_foundation_field_usage_audit.py, backend/quiz_mapping_verification.py | Backend: 5 files, Frontend: 3 files |
| `category_defaults.vehicle_graphics` | Found in pricing logic: backend/pricing_foundation_field_usage_audit.py, backend/quiz_mapping_verification.py | Backend: 5 files, Frontend: 5 files |
| `category_defaults.vehicle_graphics.sell_rate_defaults.color_change_per_sqft` | Verified in calculator code - directly affects price output | Backend: 2 files, Frontend: 1 files |
| `category_defaults.vehicle_graphics.sell_rate_defaults.printed_wrap_per_sqft` | Verified in calculator code - directly affects price output | Backend: 2 files, Frontend: 1 files |
| `default_markup_percent` | Verified in calculator code - directly affects price output | Backend: 4 files |
| `deposit_percentage` | Verified in calculator code - directly affects price output | Backend: 4 files, Frontend: 2 files |
| `design_hourly_rate` | Verified in calculator code - directly affects price output | Backend: 5 files, Frontend: 2 files |
| `hardware_accessories` | Found in pricing logic: backend/pricing_foundation_field_usage_audit.py, backend/server.py | Backend: 4 files, Frontend: 2 files |
| `hourly_rate` | Verified in calculator code - directly affects price output | Backend: 5 files, Frontend: 5 files |
| `install_hourly_rate` | Verified in calculator code - directly affects price output | Backend: 5 files, Frontend: 2 files |
| `laminate_time_per_sqft` | Verified in calculator code - directly affects price output | Backend: 2 files, Frontend: 1 files |
| `material_markup_percent` | Verified in calculator code - directly affects price output | Backend: 2 files, Frontend: 1 files |
| `materials` | Verified in calculator code - directly affects price output | Backend: 5 files, Frontend: 5 files |
| `mileage_rate` | Verified in calculator code - directly affects price output | Backend: 2 files, Frontend: 1 files |
| `minimum_order` | Verified in calculator code - directly affects price output | Backend: 5 files, Frontend: 2 files |
| `minimum_travel_charge` | Verified in calculator code - directly affects price output | Backend: 2 files, Frontend: 1 files |
| `print_time_per_sqft` | Verified in calculator code - directly affects price output | Backend: 2 files, Frontend: 1 files |
| `production_hourly_rate` | Verified in calculator code - directly affects price output | Backend: 5 files, Frontend: 3 files |
| `rush_fee_flat` | Verified in calculator code - directly affects price output | Backend: 2 files, Frontend: 1 files |
| `rush_fee_percentage` | Verified in calculator code - directly affects price output | Backend: 4 files, Frontend: 1 files |
| `target_profit_margin_percent` | Verified in calculator code - directly affects price output | Backend: 5 files, Frontend: 3 files |
| `tenant_id` | Found in pricing logic: backend/pricing_foundation_field_usage_audit.py, backend/core_runtime.py | Backend: 5 files, Frontend: 5 files |
| `waste_percentage` | Verified in calculator code - directly affects price output | Backend: 5 files, Frontend: 1 files |
| `weeding_time_per_sqft` | Verified in calculator code - directly affects price output | Backend: 2 files, Frontend: 1 files |


## USED_INDIRECTLY

**Definition:** Used Indirectly - Affects multiplier, rule, or default  
**Count:** 9  

| Field Path | Reason | Code Usage |
|------------|--------|------------|
| `ai_estimation_rules` | Affects calculation rules, multipliers, or AI behavior | Backend: 4 files, Frontend: 2 files |
| `benchmark_rules` | Affects calculation rules, multipliers, or AI behavior | Backend: 4 files, Frontend: 1 files |
| `complexity_multiplier_base` | Affects calculation rules, multipliers, or AI behavior | Backend: 3 files, Frontend: 1 files |
| `complexity_multiplier_max` | Affects calculation rules, multipliers, or AI behavior | Backend: 3 files, Frontend: 1 files |
| `global_calc_rules` | Affects calculation rules, multipliers, or AI behavior | Backend: 4 files, Frontend: 1 files |
| `install_complexity_multiplier_base` | Affects calculation rules, multipliers, or AI behavior | Backend: 2 files, Frontend: 1 files |
| `install_complexity_multiplier_max` | Affects calculation rules, multipliers, or AI behavior | Backend: 2 files, Frontend: 1 files |
| `quantity_breaks` | Affects calculation rules, multipliers, or AI behavior | Backend: 5 files, Frontend: 2 files |
| `rounding_rule` | Affects calculation rules, multipliers, or AI behavior | Backend: 4 files, Frontend: 1 files |


## STORED_DISPLAY

**Definition:** Stored / Display Only - Saved but doesn't affect price  
**Count:** 45  

| Field Path | Reason | Code Usage |
|------------|--------|------------|
| `admin_hourly_rate` | Found in models but not calculator: backend/pricing_foundation_field_usage_audit.py, backend/tests/test_pricing_foundation.py | Backend: 3 files, Frontend: 1 files |
| `ai_fallback_behavior` | Found in models but not calculator: backend/pricing_foundation_field_usage_audit.py, backend/models/pricing.py | Backend: 2 files, Frontend: 1 files |
| `ai_fallback_warnings_enabled` | Found in models but not calculator: backend/pricing_foundation_field_usage_audit.py, backend/models/pricing.py | Backend: 2 files, Frontend: 1 files |
| `category_defaults.apparel.shop_pricing_table` | Benchmark/reference pricing - not used in cost-plus calculations | Backend: 5 files, Frontend: 1 files |
| `category_defaults.banners.cost_multipliers` | Found in models but not calculator: backend/pricing_foundation_field_usage_audit.py | Backend: 1 files |
| `category_defaults.banners.default_minimum_sell_price` | Stored in database but not enforced in calculator | Backend: 4 files, Frontend: 2 files |
| `category_defaults.banners.sell_rate_defaults` | Found in models but not calculator: backend/quiz_mapping_verification.py, backend/server.py | Backend: 3 files, Frontend: 2 files |
| `category_defaults.banners.sell_rate_defaults.large_format_rate` | Found in models but not calculator: backend/pricing_foundation_field_usage_audit.py | Backend: 1 files |
| `category_defaults.cut_vinyl.default_minimum_sell_price` | Stored in database but not enforced in calculator | Backend: 4 files, Frontend: 2 files |
| `category_defaults.cut_vinyl.sell_rate_defaults` | Found in models but not calculator: backend/pricing_foundation_field_usage_audit.py, backend/quiz_mapping_verification.py | Backend: 4 files, Frontend: 2 files |
| `category_defaults.digital_print.sell_rate_defaults` | Found in models but not calculator: backend/pricing_foundation_field_usage_audit.py, backend/quiz_mapping_verification.py | Backend: 4 files, Frontend: 2 files |
| `category_defaults.promotional.minimum_charge` | Stored in database but not enforced in calculator | Backend: 5 files, Frontend: 3 files |
| `category_defaults.promotional.minimum_setup_fee` | Stored in database but not enforced in calculator | Backend: 2 files, Frontend: 1 files |
| `category_defaults.rigid_signs.default_minimum_sell_price` | Stored in database but not enforced in calculator | Backend: 4 files, Frontend: 2 files |
| `category_defaults.rigid_signs.quantity_breaks` | Found in models but not calculator: backend/pricing_foundation_field_usage_audit.py, backend/quiz_mapping_verification.py | Backend: 5 files, Frontend: 2 files |
| `category_defaults.rigid_signs.quantity_breaks.qty_10_percent` | Stored in database but not enforced in calculator | Backend: 2 files, Frontend: 1 files |
| `category_defaults.rigid_signs.quantity_breaks.qty_25_percent` | Stored in database but not enforced in calculator | Backend: 2 files, Frontend: 1 files |
| `category_defaults.rigid_signs.sell_rate_defaults` | Found in models but not calculator: backend/pricing_foundation_field_usage_audit.py, backend/quiz_mapping_verification.py | Backend: 4 files, Frontend: 2 files |
| `category_defaults.services.labor_rate_overrides` | Found in models but not calculator: backend/pricing_foundation_field_usage_audit.py, backend/quiz_mapping_verification.py | Backend: 2 files, Frontend: 1 files |
| `category_defaults.services.minimums.design` | Stored in database but not enforced in calculator | Backend: 5 files, Frontend: 5 files |
| `category_defaults.services.minimums.install` | Stored in database but not enforced in calculator | Backend: 5 files, Frontend: 5 files |
| `category_defaults.vehicle_graphics.benchmarks` | Benchmark/reference pricing - not used in cost-plus calculations | Backend: 5 files, Frontend: 5 files |
| `category_defaults.vehicle_graphics.benchmarks.package_door_lettering` | Benchmark/reference pricing - not used in cost-plus calculations | Backend: 2 files, Frontend: 1 files |
| `category_defaults.vehicle_graphics.benchmarks.package_full_wrap` | Benchmark/reference pricing - not used in cost-plus calculations | Backend: 2 files, Frontend: 1 files |
| `category_defaults.vehicle_graphics.benchmarks.package_partial_wrap` | Benchmark/reference pricing - not used in cost-plus calculations | Backend: 2 files, Frontend: 1 files |
| `category_defaults.vehicle_graphics.benchmarks.package_spot_graphics` | Benchmark/reference pricing - not used in cost-plus calculations | Backend: 2 files, Frontend: 1 files |
| `category_defaults.vehicle_graphics.sell_rate_defaults` | Found in models but not calculator: backend/pricing_foundation_field_usage_audit.py, backend/quiz_mapping_verification.py | Backend: 4 files, Frontend: 2 files |
| `file_cleanup_fee_default` | Found in models but not calculator: backend/pricing_foundation_field_usage_audit.py, backend/server.py | Backend: 3 files, Frontend: 1 files |
| `minimum_design_charge` | Stored in database but not enforced in calculator | Backend: 3 files, Frontend: 1 files |
| `minimum_install_charge` | Stored in database but not enforced in calculator | Backend: 4 files, Frontend: 1 files |
| `minimum_print_charge` | Stored in database but not enforced in calculator | Backend: 3 files, Frontend: 1 files |
| `minimum_removal_charge` | Stored in database but not enforced in calculator | Backend: 2 files, Frontend: 1 files |
| `minimum_service_charge` | Stored in database but not enforced in calculator | Backend: 3 files, Frontend: 1 files |
| `minimum_sign_charge` | Stored in database but not enforced in calculator | Backend: 3 files, Frontend: 1 files |
| `minimum_vinyl_charge` | Stored in database but not enforced in calculator | Backend: 3 files, Frontend: 1 files |
| `minimum_wrap_charge` | Stored in database but not enforced in calculator | Backend: 3 files, Frontend: 1 files |
| `project_handling_hourly_rate` | Found in models but not calculator: backend/pricing_foundation_field_usage_audit.py, backend/models/pricing.py | Backend: 2 files, Frontend: 1 files |
| `removal_hourly_rate` | Found in models but not calculator: backend/pricing_foundation_field_usage_audit.py, backend/server.py | Backend: 3 files, Frontend: 1 files |
| `selling_price_benchmarks` | Benchmark/reference pricing - not used in cost-plus calculations | Backend: 5 files, Frontend: 1 files |
| `setup_fee_apparel_dtf` | Found in models but not calculator: backend/pricing_foundation_field_usage_audit.py, backend/tests/test_pricing_foundation.py | Backend: 3 files, Frontend: 1 files |
| `setup_fee_apparel_screen` | Found in models but not calculator: backend/pricing_foundation_field_usage_audit.py, backend/tests/test_pricing_foundation.py | Backend: 3 files, Frontend: 1 files |
| `setup_fee_default` | Found in models but not calculator: backend/pricing_foundation_field_usage_audit.py, backend/server.py | Backend: 4 files, Frontend: 1 files |
| `setup_fee_print` | Found in models but not calculator: backend/pricing_foundation_field_usage_audit.py, backend/server.py | Backend: 4 files, Frontend: 1 files |
| `setup_fee_vinyl` | Found in models but not calculator: backend/pricing_foundation_field_usage_audit.py, backend/tests/test_pricing_foundation.py | Backend: 3 files, Frontend: 1 files |
| `travel_hourly_rate` | Found in models but not calculator: backend/pricing_foundation_field_usage_audit.py, backend/models/pricing.py | Backend: 2 files, Frontend: 1 files |


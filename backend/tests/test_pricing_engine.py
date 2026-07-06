"""Golden-formula tests for services/pricing_engine.py.

Every category is tested against hand-computed expected cent values so that a
future change to the shared PricingResult contract or to any category adapter
cannot silently drift the math. Each test also proves the Pricing Foundation
settings actually drive the result (fixing the legacy "disconnected calculator"
bug where the engine ignored tenant settings entirely).
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.pricing_engine import calculate_item_price


class AreaFamilyTests(unittest.TestCase):
    def test_banners_sell_rate_per_sqft_uses_foundation_rate(self):
        foundation = {"category_defaults": {"banners": {"calculation_method": "sell_rate_per_sqft", "sell_rate_defaults": {"base_rate": 8}}}}
        specs = {"width": 48, "height": 24, "unit_of_measure": "inches", "banner_material_key": "banner_13oz"}
        result = calculate_item_price("banners", 1, specs, foundation)
        self.assertEqual(result["calculation_method"], "sell_rate_per_sqft")
        self.assertEqual(result["selling_price_minor"], 6912)
        self.assertEqual(result["material_cost_minor"], 734)
        self.assertEqual(result["labor_cost_minor"], 2240)
        self.assertEqual(result["warnings"], [])

    def test_banners_cost_plus_uses_shop_labor_rates_and_markup(self):
        foundation = {"category_defaults": {"banners": {"calculation_method": "cost_plus"}}}
        specs = {"width": 48, "height": 24, "unit_of_measure": "inches", "banner_material_key": "banner_13oz"}
        result = calculate_item_price("banners", 1, specs, foundation)
        self.assertEqual(result["calculation_method"], "cost_plus")
        self.assertEqual(result["selling_price_minor"], 8038)
        self.assertEqual(result["total_cost_minor"], 3421)
        self.assertEqual(result["markup_amount_minor"], 4618)

    def test_below_cost_warning_fires_when_owner_sets_minimum_to_zero(self):
        foundation = {"category_defaults": {"banners": {"calculation_method": "sell_rate_per_sqft", "sell_rate_defaults": {"base_rate": 1}, "default_minimum_sell_price": 0}}}
        specs = {"width": 48, "height": 24, "unit_of_measure": "inches", "banner_material_key": "banner_13oz"}
        result = calculate_item_price("banners", 1, specs, foundation)
        self.assertTrue(any(w["code"] == "below_cost" for w in result["warnings"]))

    def test_rigid_signs_reads_own_category_defaults_not_banners(self):
        foundation = {"category_defaults": {"rigid_signs": {"calculation_method": "sell_rate_per_sqft", "sell_rate_defaults": {"base_rate": 10}}}}
        specs = {"width": 24, "height": 24, "unit_of_measure": "inches", "substrate_type_key": "coroplast_4mm"}
        result = calculate_item_price("rigid_signs", 1, specs, foundation)
        # area = 4 sqft (min_area floor), waste 5% -> 4.2 sqft * $10 = $42.00
        self.assertEqual(result["selling_price_minor"], 4200)


class VehicleWrapTests(unittest.TestCase):
    def test_package_benchmark_uses_vehicle_graphics_alias(self):
        # Foundation stores this under "vehicle_graphics" while the order item category
        # is "vehicle_wrap" -- the engine must resolve this alias correctly.
        foundation = {"category_defaults": {"vehicle_graphics": {"calculation_method": "package_benchmark", "benchmarks": {"package_full_wrap": 4200}}}}
        specs = {"vehicle_type": "cargo_van", "coverage_type": "full"}
        result = calculate_item_price("vehicle_wrap", 1, specs, foundation)
        self.assertEqual(result["calculation_method"], "package_benchmark")
        self.assertEqual(result["selling_price_minor"], 420000)
        self.assertEqual(result["warnings"], [])

    def test_cost_plus_ignores_benchmark_when_method_selected(self):
        foundation = {"category_defaults": {"vehicle_graphics": {"calculation_method": "cost_plus", "benchmarks": {"package_full_wrap": 100}}}}
        specs = {"vehicle_type": "cargo_van", "coverage_type": "full"}
        result = calculate_item_price("vehicle_wrap", 1, specs, foundation)
        self.assertEqual(result["calculation_method"], "cost_plus")
        self.assertGreater(result["selling_price_minor"], 100 * 100)


class ServicesTests(unittest.TestCase):
    def test_hourly_default_method_and_below_margin_warning(self):
        specs = {"services_labor_role": "production", "estimated_hours": 3, "num_workers": 1}
        result = calculate_item_price("services", 1, specs, {})
        self.assertEqual(result["calculation_method"], "hourly")
        self.assertEqual(result["selling_price_minor"], 8400)
        self.assertTrue(any(w["code"] == "below_margin" for w in result["warnings"]))

    def test_flat_fee_method_reads_spec_flat_fee(self):
        foundation = {"category_defaults": {"services": {"calculation_method": "flat_fee"}}}
        specs = {"flat_fee_minor": 15000}
        result = calculate_item_price("services", 1, specs, foundation)
        self.assertEqual(result["calculation_method"], "flat_fee")
        self.assertEqual(result["selling_price_minor"], 15000)


class ApparelTests(unittest.TestCase):
    def test_price_table_method_picks_matching_quantity_tier(self):
        foundation = {"category_defaults": {"apparel": {"calculation_method": "price_table", "shop_pricing_table": {"tee_one_side": {"qty_12": 18, "qty_24": 15}}}}}
        specs = {"apparel_product_type": "short_sleeve_tee", "size_s": 12}
        result = calculate_item_price("apparel", 1, specs, foundation)
        self.assertEqual(result["calculation_method"], "price_table")
        self.assertEqual(result["selling_price_minor"], 21600)
        self.assertEqual(result["details"]["apparel_quantity"], 12)

    def test_cost_plus_method_ignores_price_table(self):
        foundation = {"category_defaults": {"apparel": {"calculation_method": "cost_plus", "shop_pricing_table": {"tee_one_side": {"qty_12": 1}}}}}
        specs = {"apparel_product_type": "short_sleeve_tee", "size_s": 12}
        result = calculate_item_price("apparel", 1, specs, foundation)
        self.assertEqual(result["calculation_method"], "cost_plus")
        self.assertGreater(result["selling_price_minor"], 1200)


class PromoMiscAndCustomTests(unittest.TestCase):
    def test_promo_misc_resolves_promotional_alias(self):
        foundation = {"category_defaults": {"promotional": {"default_markup_multiplier": 1.5}}}
        specs = {"unit_cost_minor": 1000}
        result = calculate_item_price("promo_misc", 5, specs, foundation)
        self.assertEqual(result["material_cost_minor"], 5000)
        self.assertEqual(result["selling_price_minor"], 7500)

    def test_promo_misc_falls_back_to_default_markup_without_foundation(self):
        specs = {"unit_cost_minor": 1000}
        result = calculate_item_price("promo_misc", 5, specs, {})
        self.assertEqual(result["selling_price_minor"], 12500)

    def test_custom_is_manual_only_and_has_no_cost_basis(self):
        result = calculate_item_price("custom", 2, {"unit_price_minor": 5000}, {})
        self.assertEqual(result["calculation_method"], "manual")
        self.assertEqual(result["selling_price_minor"], 10000)
        self.assertEqual(result["total_cost_minor"], 0)


if __name__ == "__main__":
    unittest.main()

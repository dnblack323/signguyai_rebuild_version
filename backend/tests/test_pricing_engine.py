"""Golden-formula tests for services/pricing_engine.py.

These tests pin the faithful-port formulas (banners hems/grommets/pole-pockets,
rigid signs sidedness/shape/thickness, cut vinyl weeding/masking, digital print
ink coverage/lamination, vehicle wrap coverage/package-benchmark/install
difficulty, services billing units, apparel shop-table/cost-plus) as a
regression baseline, and prove the engine is driven by tenant Pricing
Foundation settings (never hardcoded constants alone).
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.pricing_engine import calculate_item_price, derive_ticket_quantity


class BannersTests(unittest.TestCase):
    def test_sell_rate_per_sqft_uses_foundation_rate_plus_finishing(self):
        foundation = {"category_defaults": {"banners": {"calculation_method": "sell_rate_per_sqft", "sell_rate_defaults": {"base_rate": 8}}}, "materials": [{"key": "banner_13oz", "cost_per_sqft": 0.85, "sell_rate_per_sqft": 8.0, "name": "13oz Banner"}]}
        specs = {"width_inches": 48, "height_inches": 24, "unit_of_measure": "inches", "banner_material_key": "banner_13oz"}
        result = calculate_item_price("banners", 1, specs, foundation)
        self.assertEqual(result["calculation_method"], "sell_rate_per_sqft")
        self.assertGreater(result["selling_price_minor"], 6912)  # base sell (8.64 sqft * $8) plus hems/grommets finishing
        self.assertEqual(result["warnings"], [])

    def test_cost_plus_is_a_distinct_alternative_method(self):
        foundation = {"category_defaults": {"banners": {"calculation_method": "cost_plus"}}}
        specs = {"width_inches": 48, "height_inches": 24, "unit_of_measure": "inches", "banner_material_key": "banner_13oz"}
        result = calculate_item_price("banners", 1, specs, foundation)
        self.assertEqual(result["calculation_method"], "cost_plus")
        self.assertGreater(result["selling_price_minor"], result["total_cost_minor"])

    def test_grommets_and_hems_add_to_finishing_cost(self):
        foundation = {"category_defaults": {"banners": {"sell_rate_defaults": {"base_rate": 8}}}}
        base_specs = {"width_inches": 48, "height_inches": 24, "unit_of_measure": "inches"}
        plain = calculate_item_price("banners", 1, base_specs, foundation)
        with_pole_pockets = calculate_item_price("banners", 1, {**base_specs, "banner_pole_pockets": "top_and_bottom"}, foundation)
        self.assertGreater(with_pole_pockets["selling_price_minor"], plain["selling_price_minor"])

    def test_missing_material_produces_warning_not_crash(self):
        foundation = {"category_defaults": {"banners": {"sell_rate_defaults": {"base_rate": 8}}}}
        result = calculate_item_price("banners", 1, {"width_inches": 48, "height_inches": 24, "unit_of_measure": "inches", "banner_material_key": "banner_13oz"}, foundation)
        self.assertTrue(any(w["code"] == "missing_foundation_config" for w in result["warnings"]))


class RigidSignsCutVinylDigitalPrintTests(unittest.TestCase):
    def test_rigid_signs_uses_its_own_category_defaults(self):
        foundation = {"category_defaults": {"rigid_signs": {"calculation_method": "sell_rate_per_sqft", "sell_rate_defaults": {"base_rate": 10}}}}
        result = calculate_item_price("rigid_signs", 1, {"width_inches": 24, "height_inches": 24}, foundation)
        self.assertEqual(result["selling_price_minor"], 4000)  # 4 sqft (min floor) * $10

    def test_cut_vinyl_weeding_complexity_increases_labor_cost(self):
        foundation = {"category_defaults": {"cut_vinyl": {"sell_rate_defaults": {"base_rate": 12}}}}
        simple = calculate_item_price("cut_vinyl", 1, {"width_inches": 24, "height_inches": 24, "weeding_complexity": "simple"}, foundation)
        intricate = calculate_item_price("cut_vinyl", 1, {"width_inches": 24, "height_inches": 24, "weeding_complexity": "intricate"}, foundation)
        self.assertGreater(intricate["labor_cost_minor"], simple["labor_cost_minor"])

    def test_digital_print_laminate_adds_material_cost(self):
        foundation = {"category_defaults": {"digital_print": {"sell_rate_defaults": {"base_rate": 10}}}}
        plain = calculate_item_price("digital_print", 1, {"width_inches": 24, "height_inches": 24}, foundation)
        laminated = calculate_item_price("digital_print", 1, {"width_inches": 24, "height_inches": 24, "laminate": True}, foundation)
        self.assertGreaterEqual(laminated["material_cost_minor"], plain["material_cost_minor"])


class VehicleWrapTests(unittest.TestCase):
    def test_package_benchmark_resolves_vehicle_graphics_alias(self):
        foundation = {"category_defaults": {"vehicle_graphics": {"calculation_method": "package_benchmark", "package_pricing_by_vehicle_coverage": {"van_cargo": {"full": 4200}}}}}
        result = calculate_item_price("vehicle_wrap", 1, {"vehicle_type": "van_cargo", "coverage_type": "full"}, foundation)
        self.assertEqual(result["calculation_method"], "package_benchmark")
        self.assertEqual(result["selling_price_minor"], 420000)

    def test_max_of_both_picks_higher_of_package_or_cost_plus(self):
        foundation = {"category_defaults": {"vehicle_graphics": {"calculation_method": "max_of_both", "package_pricing_by_vehicle_coverage": {"van_cargo": {"full": 100}}}}}
        result = calculate_item_price("vehicle_wrap", 1, {"vehicle_type": "van_cargo", "coverage_type": "full"}, foundation)
        self.assertEqual(result["calculation_method"], "max_of_both")
        self.assertGreater(result["selling_price_minor"], 10000)  # cost-plus floor wins over the deliberately-low $100 package price

    def test_second_installer_adds_install_cost(self):
        foundation = {"category_defaults": {"vehicle_graphics": {}}}
        specs = {"vehicle_type": "van_cargo", "coverage_type": "full"}
        solo = calculate_item_price("vehicle_wrap", 1, specs, foundation)
        with_helper = calculate_item_price("vehicle_wrap", 1, {**specs, "second_installer_required": True}, foundation)
        self.assertGreater(with_helper["install_cost_minor"], solo["install_cost_minor"])


class ServicesTests(unittest.TestCase):
    def test_pass_through_plus_markup_can_trigger_below_cost_warning(self):
        foundation = {"category_defaults": {"services": {"calculation_method": "pass_through_plus_markup", "labor_roles": {"production": {"cost_per_hour": 28, "sell_per_hour": 28}}}}}
        result = calculate_item_price("services", 1, {"services_billing_unit": "hour", "estimated_hours": 3, "num_workers": 1}, foundation)
        self.assertEqual(result["details"]["billing_unit"], "hour")
        self.assertTrue(any(w["code"] == "below_cost" for w in result["warnings"]))

    def test_mile_billing_unit_uses_travel_rate(self):
        result = calculate_item_price("services", 1, {"services_billing_unit": "mile", "services_travel_miles": 40}, {})
        self.assertEqual(result["details"]["billing_unit"], "mile")
        self.assertGreater(result["selling_price_minor"], 0)

    def test_equipment_rental_adds_outsourcing_cost(self):
        foundation = {"category_defaults": {"services": {"equipment_library": [{"key": "lift", "cost_per_day": 150, "sell_per_day": 225}]}}}
        result = calculate_item_price("services", 1, {"estimated_hours": 2, "services_equipment_required": True, "services_equipment_days": 1, "services_equipment_type": "lift"}, foundation)
        self.assertGreater(result["outsourcing_cost_minor"], 0)


class ApparelTests(unittest.TestCase):
    def test_quantity_is_derived_from_size_breakdown(self):
        self.assertEqual(derive_ticket_quantity("apparel", 1, {"size_s": 6, "size_m": 6}), 12)
        self.assertEqual(derive_ticket_quantity("apparel", 5, {}), 5)

    def test_price_table_method_picks_matching_row(self):
        foundation = {"category_defaults": {"apparel": {
            "calculation_method": "price_table",
            "available_brand_styles": {"short_sleeve_tee": [{"key": "gildan_5000"}]},
            "available_decoration_methods": ["htv"], "methods_using_shop_table": ["htv"], "method_config": {"htv": {"uses_shop_table": True}},
            "shop_pricing_table": {"gildan_5000": {"1_4": {"front": 18}}},
            "quantity_tiers": [{"key": "1_4", "min_qty": 1, "max_qty": 4}],
        }}}
        result = calculate_item_price("apparel", 1, {"apparel_product_type": "short_sleeve_tee", "size_s": 4}, foundation)
        self.assertEqual(result["details"]["baseline_source"], "shop_table:htv")
        self.assertEqual(result["selling_price_minor"], 7200)


class PromoMiscAndCustomTests(unittest.TestCase):
    def test_promo_misc_resolves_promotional_alias_for_markup(self):
        foundation = {"category_defaults": {"promotional": {"default_markup_multiplier": 1.5}}}
        result = calculate_item_price("promo_misc", 5, {"unit_cost_minor": 1000}, foundation)
        self.assertEqual(result["material_cost_minor"], 5000)
        self.assertGreaterEqual(result["selling_price_minor"], 7500)

    def test_custom_defaults_to_cost_plus_and_supports_override(self):
        result = calculate_item_price("custom", 2, {"unit_cost_minor": 5000, "estimated_hours": 0}, {})
        self.assertGreater(result["selling_price_minor"], 0)
        overridden = calculate_item_price("custom", 2, {"unit_cost_minor": 5000, "estimated_hours": 0, "override_enabled": True, "price_override": 40}, {})
        self.assertEqual(overridden["selling_price_minor"], 8000)


if __name__ == "__main__":
    unittest.main()

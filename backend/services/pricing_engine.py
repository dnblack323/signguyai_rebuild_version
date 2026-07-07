"""Single source of truth for Order Item / Quote Line Item pricing math.

This is a faithful port of the legacy SignGuyAI pricing dispatcher's 9 category
calculators (calculate_banners, calculate_rigid_signs, calculate_cut_vinyl,
calculate_digital_print, calculate_vehicle_graphics, calculate_services,
calculate_apparel, calculate_promotional, calculate_custom). The legacy RESULT
(the actual pricing math/behavior) is preserved intentionally -- only the code
structure is cleaned up per the user's explicit direction: "the final result
was perfect except the resulting code is crap ... don't recreate a simple
crappy module."

Architecture (per user direction, 2026-02):
  - ONE shared PricingResult contract (models/pricing_core.py) for all categories.
  - ONE tenant settings source: every adapter reads Pricing Foundation settings
    (never hardcoded constants alone).
  - EACH category keeps its own calculation adapter, keyed to its real driver:
      banners/rigid_signs/cut_vinyl/digital_print -> square footage
      vehicle_wrap                                 -> vehicle coverage %
      services                                     -> labor hours / billing unit
      apparel                                      -> apparel quantity (tiers)
      promo_misc                                   -> unit cost
      custom                                       -> manual / cost-plus
  - Shops choose a `calculation_method` per category in Pricing Foundation
    settings. The legacy app always drove area categories off a per-material
    `sell_rate_per_sqft` (kept here as "sell_rate_per_sqft", the default -- this
    is the literal legacy formula with every finishing/hardware/multiplier
    preserved). "cost_plus" is a net-new alternative requested by the shop
    owner: same cost basis (material+labor+overhead), priced via markup/margin
    instead of the material's configured sell rate.
"""

from datetime import datetime, timezone

try:
    from ..models.pricing_core import PricingResult
except ImportError:
    from models.pricing_core import PricingResult

CENTS = 100

FOUNDATION_CATEGORY_ALIASES = {"vehicle_wrap": "vehicle_graphics", "promo_misc": "promotional"}

CALCULATION_METHODS = {
    "banners": ("sell_rate_per_sqft", "cost_plus"),
    "rigid_signs": ("sell_rate_per_sqft", "cost_plus"),
    "cut_vinyl": ("sell_rate_per_sqft", "cost_plus"),
    "digital_print": ("sell_rate_per_sqft", "cost_plus"),
    "vehicle_wrap": ("max_of_both", "package_benchmark", "cost_plus"),
    "services": ("max_of_both", "cost_plus", "pass_through_plus_markup"),
    "apparel": ("price_table", "cost_plus"),
    "promo_misc": ("cost_plus_markup",),
    "custom": ("cost_plus",),
}
DEFAULT_METHOD = {
    "banners": "sell_rate_per_sqft", "rigid_signs": "sell_rate_per_sqft", "cut_vinyl": "sell_rate_per_sqft", "digital_print": "sell_rate_per_sqft",
    "vehicle_wrap": "max_of_both", "services": "max_of_both", "apparel": "price_table", "promo_misc": "cost_plus_markup", "custom": "cost_plus",
}

DESIGN_COMPLEXITY_MULT = {"simple": 1.0, "medium": 1.25, "complex": 1.5, "extreme": 2.0}

APPAREL_SIZES = ["xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl", "5xl"]


def derive_ticket_quantity(category: str, quantity: int, specs: dict) -> int:
    """Mirrors legacy's upstream `_derive_ticket_quantity`: for apparel, the real
    quantity is the sum of the size breakdown (when provided), not the raw
    `quantity` field, since orders/quotes track apparel by size."""
    if category == "apparel":
        size_total = sum(int(specs.get(f"size_{size}", 0) or 0) for size in APPAREL_SIZES)
        if size_total > 0:
            return size_total
    return max(int(quantity or 1), 1)


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def calculate_item_price(category: str, quantity: int, specs: dict, foundation: dict | None = None) -> dict:
    quantity = derive_ticket_quantity(category, quantity, specs)
    foundation = foundation or {}
    cfg = _category_config(foundation, category)
    method = _calculation_method(cfg, category)

    adapter = {
        "banners": _banners, "rigid_signs": _rigid_signs, "cut_vinyl": _cut_vinyl, "digital_print": _digital_print,
        "vehicle_wrap": _vehicle_wrap, "services": _services, "apparel": _apparel, "promo_misc": _promo_misc, "custom": _custom,
    }.get(category, _custom)
    raw = adapter(quantity, specs, foundation, cfg, method)

    base_cost = raw["material_cost"] + raw["labor_cost"] + raw["design_cost"] + raw["setup_cost"] + raw["finishing_cost"] + raw["hardware_cost"] + raw["install_cost"] + raw["outsourcing_cost"]
    total_cost = base_cost + raw["overhead_cost"]
    minimum_charge = raw.get("minimum_charge", 0.0)
    selling_price = raw["selling_price"]
    minimum_applied = minimum_charge > 0 and selling_price < minimum_charge
    if minimum_applied:
        selling_price = minimum_charge

    result = {
        "category": category, "calculation_method": method, "quantity": quantity,
        "material_cost_minor": _minor(raw["material_cost"]), "labor_cost_minor": _minor(raw["labor_cost"]),
        "design_cost_minor": _minor(raw["design_cost"]), "setup_cost_minor": _minor(raw["setup_cost"]),
        "finishing_cost_minor": _minor(raw["finishing_cost"]), "hardware_cost_minor": _minor(raw["hardware_cost"]),
        "install_cost_minor": _minor(raw["install_cost"]), "outsourcing_cost_minor": _minor(raw["outsourcing_cost"]),
        "overhead_cost_minor": _minor(raw["overhead_cost"]), "base_cost_minor": _minor(base_cost), "total_cost_minor": _minor(total_cost),
        "markup_amount_minor": _minor(max(selling_price - total_cost, 0.0)),
        "selling_price_minor": _minor(selling_price), "minimum_charge_minor": _minor(minimum_charge),
        "minimum_charge_applied": minimum_applied, "breakdown": raw.get("breakdown", {}), "details": raw.get("details", {}),
    }
    result["warnings"] = _warnings(result, raw.get("warnings", []), foundation)
    return PricingResult(**result).model_dump(mode="json")


# ---------------------------------------------------------------------------
# Foundation settings helpers (mirror legacy get_category_pricing_config,
# find_material, calculate_overhead_cost, get_labor_minutes_and_rate, etc.)
# ---------------------------------------------------------------------------

def _category_config(foundation: dict, category: str) -> dict:
    key = FOUNDATION_CATEGORY_ALIASES.get(category, category)
    merged = {
        "default_markup_multiplier": foundation.get("default_markup_multiplier", 2.5),
        "target_profit_margin_percent": foundation.get("target_profit_margin_percent", 40.0),
        "minimum_charge": foundation.get("minimum_order", 0),
    }
    merged.update((foundation.get("category_defaults") or {}).get(key) or {})
    return merged


def _calculation_method(cfg: dict, category: str) -> str:
    allowed = CALCULATION_METHODS.get(category, ("cost_plus",))
    method = cfg.get("calculation_method")
    return method if method in allowed else DEFAULT_METHOD.get(category, allowed[0])


def _find_material(foundation: dict, key: str) -> dict:
    if not key:
        return {}
    for material in foundation.get("materials") or []:
        if material.get("key") == key or material.get("id") == key:
            return material
    return {}


def _material_cost_per_sqft(foundation: dict, key: str) -> float:
    material = _find_material(foundation, key)
    if not material:
        return 0.0
    cost = material.get("cost_per_sqft")
    if cost in (None, ""):
        cost = material.get("cost_per_unit", 0)
    return float(cost or 0)


def _material_sell_rate(foundation: dict, key: str) -> float:
    return float((_find_material(foundation, key) or {}).get("sell_rate_per_sqft", 0) or 0)


def _find_hardware(foundation: dict, key: str) -> dict:
    if not key:
        return {}
    for item in foundation.get("hardware_accessories") or []:
        if item.get("id") == key or item.get("key") == key:
            return item
    return {}


def _labor_rates(foundation: dict) -> dict:
    rates = foundation.get("labor_rates") or {}
    return {
        "production": float((rates.get("production") or {}).get("hourly_rate", foundation.get("production_hourly_rate", 28)) or 28),
        "design": float((rates.get("design") or {}).get("hourly_rate", foundation.get("design_hourly_rate", 85)) or 85),
        "install": float((rates.get("installation") or {}).get("hourly_rate", foundation.get("install_hourly_rate", 95)) or 95),
        "install_minimum": float((rates.get("installation") or {}).get("minimum_charge", foundation.get("minimum_install_charge", 0)) or 0),
        "removal": float((rates.get("removal") or {}).get("hourly_rate", foundation.get("removal_hourly_rate", 65)) or 65),
    }


def _calculate_overhead(base_cost: float, labor_hours: float, foundation: dict, cfg: dict) -> float:
    if not foundation.get("apply_overhead_to_jobs", True):
        return 0.0
    overhead_percent = float(cfg.get("overhead_percentage", foundation.get("overhead_percentage", 0)) or 0)
    shop_overhead_per_hour = float(cfg.get("shop_overhead_per_hour", foundation.get("shop_overhead_per_hour", 0)) or 0)
    return (base_cost * overhead_percent / 100.0) + (labor_hours * shop_overhead_per_hour)


def _labor_minutes_and_rate(foundation: dict, cfg: dict, quantity: float = 1.0, is_yard_sign: bool = False) -> tuple[float, float, bool]:
    labor = foundation.get("labor") or {}
    shop_labor_rate = float(labor.get("shop_labor_rate", 75.0) or 75.0)
    include_in_price = labor.get("include_labor_in_price", True)
    if include_in_price is None:
        include_in_price = True
    if is_yard_sign:
        setup_minutes, minutes_per_sign = cfg.get("yard_sign_setup_minutes"), cfg.get("yard_sign_minutes_per_sign")
        if setup_minutes is not None and minutes_per_sign is not None:
            return (float(setup_minutes) + quantity * float(minutes_per_sign), shop_labor_rate, include_in_price)
    production_minutes_basic = cfg.get("production_minutes_basic")
    if production_minutes_basic:
        return (float(production_minutes_basic), shop_labor_rate, include_in_price)
    return (0.0, shop_labor_rate, include_in_price)


def _design_charge_config(foundation: dict) -> tuple[str, float, float]:
    design = foundation.get("design") or {}
    charge_separately = design.get("charge_design_separately", "yes")
    if isinstance(charge_separately, bool):
        charge_separately = "yes" if charge_separately else "no"
    return (charge_separately, float(design.get("default_design_rate", 85.0) or 85.0), float(design.get("included_design_minutes", 30.0) or 30.0))


def _design_labor(specs: dict, cfg: dict, foundation: dict, base_hours_key: str = "default_design_time_hours", base_hours_default: float = 0.5) -> tuple[float, float]:
    if specs.get("artwork_ready"):
        return 0.0, 0.0
    artwork_needed = specs.get("artwork_needed")
    if not (artwork_needed or artwork_needed is None):
        return 0.0, 0.0
    charge_separately, design_rate, included_minutes = _design_charge_config(foundation)
    base_hours = float(cfg.get(base_hours_key, base_hours_default) or 0)
    complexity = specs.get("design_complexity") or cfg.get("default_design_complexity", "simple")
    design_hours = base_hours * DESIGN_COMPLEXITY_MULT.get(complexity, 1.0)
    if charge_separately == "no":
        return design_hours, 0.0
    billable_minutes = max(0.0, design_hours * 60 - included_minutes)
    return design_hours, (billable_minutes / 60.0) * design_rate


def _resolve_selling_price(total_cost: float, markup_multiplier: float, target_margin_percent: float) -> float:
    safe_cost = max(float(total_cost or 0), 0.0)
    markup_price = safe_cost * max(float(markup_multiplier or 1), 1.0)
    margin_decimal = float(target_margin_percent or 0) / 100.0
    margin_price = safe_cost / (1 - margin_decimal) if 0 < margin_decimal < 0.95 else 0.0
    return max(markup_price, margin_price, safe_cost)


def _quantity_discount_percent(quantity: float, tiers) -> float:
    for tier in tiers or []:
        min_qty = float(tier.get("min_qty", 0) or 0)
        max_qty = tier.get("max_qty")
        if quantity >= min_qty and (max_qty is None or quantity <= float(max_qty)):
            return float(tier.get("discount_percent", 0) or 0)
    return 0.0


def _apply_rush(price: float, rush_order: bool, rush_percent: float) -> float:
    return price * (1 + rush_percent / 100.0) if rush_order else price


def _line(name, quantity, unit, unit_cost: float, total_cost: float) -> dict:
    return {"name": str(name or ""), "quantity": float(quantity or 0), "unit": unit, "unit_cost_minor": _minor(unit_cost), "total_cost_minor": _minor(total_cost)}


def _nonzero_lines(rows) -> list:
    return [_line(*row) for row in rows if row[4] > 0]


def _minor(value) -> int:
    return round(float(value or 0) * CENTS)


def _warnings(result: dict, category_warnings: list[str], foundation: dict) -> list[dict]:
    warnings = [{"code": "missing_foundation_config", "severity": "warning", "message": message} for message in category_warnings]
    total_cost, selling = result["total_cost_minor"], result["selling_price_minor"]
    if total_cost and selling < total_cost:
        warnings.append({"code": "below_cost", "severity": "critical", "message": f"Selling price (${selling / 100:.2f}) is below total cost (${total_cost / 100:.2f})."})
    elif selling:
        margin_percent = (selling - total_cost) / selling * 100
        target_margin = float(foundation.get("target_profit_margin_percent") or 35)
        if margin_percent < target_margin:
            warnings.append({"code": "below_margin", "severity": "warning", "message": f"Margin ({margin_percent:.1f}%) is below your target of {target_margin:.0f}%."})
    return warnings


def _area_from_specs(specs: dict, cfg: dict, default_unit: str = "inches") -> tuple[float, float, float, float, float]:
    """Returns (width, height, area_per_piece, perimeter_feet_or_0, width/height already in correct unit for perimeter use)."""
    width = float(specs.get("width_inches") or specs.get("width") or 0)
    height = float(specs.get("height_inches") or specs.get("height") or specs.get("length_inches") or 0)
    unit = str(specs.get("unit_of_measure") or cfg.get("default_unit_of_measure", default_unit)).lower()
    if unit == "feet":
        area_per_piece = width * height
    else:
        area_per_piece = (width * height) / 144 if width and height else 0.0
    return width, height, area_per_piece, unit


# ---------------------------------------------------------------------------
# Banners -- driver: square footage. Faithful port of legacy calculate_banners.
# ---------------------------------------------------------------------------

def _banners(quantity, specs, foundation, cfg, method):
    width = float(specs.get("width_inches") or specs.get("width") or 0)
    height = float(specs.get("height_inches") or specs.get("height") or specs.get("length_inches") or 0)
    unit = str(specs.get("unit_of_measure") or cfg.get("default_unit_of_measure", "feet")).lower()
    if unit == "feet":
        area_per_piece, perimeter_feet, width_feet, height_feet = width * height, 2 * (width + height), width, height
    else:
        area_per_piece = (width * height) / 144 if width and height else 0.0
        perimeter_feet = 2 * (width + height) / 12 if width and height else 0.0
        width_feet, height_feet = width / 12, height / 12

    min_billable = float(cfg.get("default_minimum_billable_area", 4.0) or 4.0)
    billable_area_per_piece = max(area_per_piece, min_billable)
    total_billable_area = billable_area_per_piece * quantity
    waste_percent = float(cfg.get("waste_percentage", 8.0) or 0)
    waste_adjusted_area = total_billable_area * (1 + waste_percent / 100.0)

    material_key = specs.get("banner_material_key") or cfg.get("default_banner_material_key", "banner_13oz")
    material = _find_material(foundation, material_key)
    warnings = []
    if not material:
        warnings.append(f"Banner material not found: {material_key}. Using 13oz fallback.")
        material_key = cfg.get("default_banner_material_key", "banner_13oz")
        material = _find_material(foundation, material_key)
    material_cost_sqft = _material_cost_per_sqft(foundation, material_key) or 0.85
    material_sell = _material_sell_rate(foundation, material_key) or (cfg.get("sell_rate_defaults") or {}).get("base_rate", 8.0)

    sided_key = {"same": "double_same", "different": "double_diff"}.get(specs.get("banner_double_sided") or cfg.get("default_double_sided", "no"), "single")
    sided_mult = float((cfg.get("sidedness_multipliers") or {}).get(sided_key, 1.0) or 1.0)
    banner_material_cost = waste_adjusted_area * material_cost_sqft * sided_mult
    consumable_sqft = _material_cost_per_sqft(foundation, cfg.get("banner_print_consumable_key", "banner_print_consumable")) or 0.75
    print_consumable_cost = waste_adjusted_area * consumable_sqft * sided_mult

    laminate_required = specs.get("banner_laminate")
    if laminate_required is None:
        laminate_required = bool(cfg.get("default_laminate_required", False))
    laminate_key = specs.get("banner_laminate_type_key") or cfg.get("default_laminate_key", "banner_laminate_coating")
    laminate_cost_sqft, laminate_cost = 0.0, 0.0
    if laminate_required:
        laminate_cost_sqft = _material_cost_per_sqft(foundation, laminate_key)
        if laminate_cost_sqft <= 0:
            warnings.append(f"Laminate/coating not found: {laminate_key}.")
        laminate_cost = waste_adjusted_area * laminate_cost_sqft * sided_mult

    hems = specs.get("banner_hems") or cfg.get("default_hems", "standard")
    hem_rate = {"standard": float(cfg.get("standard_hem_rate_per_linear_foot", 0.75) or 0), "reinforced": float(cfg.get("reinforced_hem_rate_per_linear_foot", 1.25) or 0)}.get(hems, 0.0)
    hem_cost = perimeter_feet * hem_rate * quantity

    grommet_mode = specs.get("banner_grommets") or cfg.get("default_grommets", "corners")
    grommet_cost_each, grommet_sell_each = float(cfg.get("grommet_cost_each", 0.20) or 0), float(cfg.get("grommet_sell_each", 0.75) or 0)
    grommet_min_charge, default_corners = float(cfg.get("grommet_minimum_charge", 4.0) or 0), int(cfg.get("grommet_default_corner_count", 4) or 4)
    if grommet_mode == "corners":
        grommet_count = default_corners
    elif grommet_mode in ("every_2ft", "every_3ft"):
        spacing = float((cfg.get("grommet_spacing_feet") or {}).get(grommet_mode, 2.0 if grommet_mode == "every_2ft" else 3.0))
        grommet_count = max(4, round(perimeter_feet / spacing)) if perimeter_feet else default_corners
    elif grommet_mode == "custom":
        grommet_count = int(specs.get("banner_grommet_count") or 0)
    else:
        grommet_count = 0
    total_grommets = grommet_count * quantity
    grommet_material_cost = total_grommets * grommet_cost_each
    grommet_sell = total_grommets * grommet_sell_each
    if grommet_mode != "none" and grommet_sell > 0:
        grommet_sell = max(grommet_sell, grommet_min_charge * quantity)
    grommet_labor_hours = (total_grommets * 0.5) / 60.0

    pole_mode = specs.get("banner_pole_pockets") or cfg.get("default_pole_pockets", "none")
    pole_feet = {"top": width_feet, "top_and_bottom": width_feet * 2, "side_pockets": height_feet * 2}.get(pole_mode, 0.0)
    pole_pocket_cost = pole_feet * float(cfg.get("pole_pocket_rate_per_linear_foot", 3.50) or 0) * quantity

    reinforced_corners = specs.get("banner_reinforced_corners")
    if reinforced_corners is None:
        reinforced_corners = bool(cfg.get("default_reinforced_corners", False))
    reinforced_corners_cost = float(cfg.get("reinforced_corners_charge", 6.0) or 0) * quantity if reinforced_corners else 0.0

    wind_slits = specs.get("banner_wind_slits")
    if wind_slits is None:
        wind_slits = bool(cfg.get("default_wind_slits", False))
    wind_slit_cost = float(cfg.get("wind_slit_charge", 2.0) or 0) * quantity if wind_slits else 0.0

    specialty_sewing = specs.get("banner_specialty_sewing")
    if specialty_sewing is None:
        specialty_sewing = bool(cfg.get("default_specialty_sewing", False))
    specialty_sewing_cost = perimeter_feet * float(cfg.get("specialty_sewing_rate_per_linear_foot", 2.0) or 0) * quantity if specialty_sewing else 0.0

    rates = _labor_rates(foundation)
    labor_minutes, shop_labor_rate, include_labor = _labor_minutes_and_rate(foundation, cfg, quantity)
    if labor_minutes > 0:
        production_hours = labor_minutes / 60.0
        production_cost = production_hours * shop_labor_rate if include_labor else 0.0
    else:
        per_piece_hours = max(billable_area_per_piece * float(cfg.get("production_labor_hours_per_sqft", 0.10) or 0), float(cfg.get("min_production_labor_hours_per_item", 0.20) or 0))
        production_hours = per_piece_hours * quantity
        production_cost = production_hours * rates["production"]

    design_hours, design_cost = _design_labor(specs, cfg, foundation)

    install_hours, install_cost = 0.0, 0.0
    if specs.get("install_required"):
        base_install_hours = float(cfg.get("install_base_hours", 0.5) or 0) + total_billable_area * float(cfg.get("install_hours_per_sqft", 0.04) or 0)
        install_mult = float((cfg.get("install_complexity_multipliers") or {}).get(specs.get("install_complexity") or cfg.get("default_install_complexity", "easy"), 1.0) or 1.0)
        install_hours = base_install_hours * install_mult
        install_cost = max(rates["install_minimum"], install_hours * rates["install"])

    hardware_keys = specs.get("banner_hardware_keys") or []
    hardware_cost = hardware_sell = hardware_labor_minutes = 0.0
    for hk in hardware_keys:
        hw = _find_hardware(foundation, hk)
        if not hw:
            warnings.append(f"Hardware not found: {hk}.")
            continue
        hardware_cost += float(hw.get("purchase_cost", 0) or 0) * quantity
        hardware_sell += float(hw.get("default_sell_price", 0) or 0) * quantity
        hardware_labor_minutes += float(hw.get("default_labor_addon_minutes", 0) or 0) * quantity
    hardware_labor_hours = hardware_labor_minutes / 60.0
    hardware_labor_cost = hardware_labor_hours * rates["production"]
    finishing_labor_cost = grommet_labor_hours * rates["production"]

    material_total = banner_material_cost + print_consumable_cost + laminate_cost
    labor_total = production_cost + hardware_labor_cost + finishing_labor_cost
    total_labor_hours = production_hours + design_hours + install_hours + grommet_labor_hours + hardware_labor_hours
    overhead_cost = _calculate_overhead(material_total + labor_total + grommet_material_cost + hardware_cost, total_labor_hours, foundation, cfg)

    finishing_sell = hem_cost + pole_pocket_cost + reinforced_corners_cost + wind_slit_cost + specialty_sewing_cost + grommet_sell
    min_sell_per_item = float(cfg.get("default_minimum_sell_price", cfg.get("minimum_charge", 35.0)) or 35.0)

    if method == "cost_plus":
        total_cost_basis = material_total + grommet_material_cost + hardware_cost + labor_total + overhead_cost
        sell_base = _resolve_selling_price(total_cost_basis, float(cfg.get("default_markup_multiplier", 2.35) or 2.35), float(cfg.get("target_profit_margin_percent", 40.0) or 40.0))
    else:
        sell_base = material_sell * total_billable_area * sided_mult
        if cfg.get("sell_method") == "max_of_rate_or_minimum":
            sell_base = max(sell_base, min_sell_per_item * quantity)

    suggested_price = sell_base + finishing_sell + design_cost + install_cost + hardware_sell
    discount_percent = _quantity_discount_percent(quantity, cfg.get("quantity_discounts"))
    suggested_price *= (1 - discount_percent / 100.0)

    event_premium = 1.0
    use_type = str(specs.get("banner_use_type") or cfg.get("default_use_type", "outdoor")).lower()
    event_flag = specs.get("banner_event_premium")
    if event_flag is None:
        event_flag = use_type in ("backwall_step_repeat", "event_display")
    if event_flag:
        event_premium *= float(cfg.get("event_premium_multiplier", 1.20) or 1.0)
    if use_type == "pole_banner":
        event_premium *= float(cfg.get("pole_banner_premium_multiplier", 1.30) or 1.0)
    suggested_price *= event_premium
    suggested_price = max(suggested_price, min_sell_per_item * quantity)
    suggested_price = _apply_rush(suggested_price, specs.get("rush_order"), float(foundation.get("rush_fee_percentage", 0) or 0))

    breakdown = {
        "materials": _nonzero_lines([
            (material.get("name", material_key) if material else material_key, waste_adjusted_area * sided_mult, "sqft", material_cost_sqft, banner_material_cost),
            ("Print Consumable", waste_adjusted_area * sided_mult, "sqft", consumable_sqft, print_consumable_cost),
            (f"Laminate ({laminate_key})", waste_adjusted_area * sided_mult, "sqft", laminate_cost_sqft, laminate_cost),
        ]),
        "labor": _nonzero_lines([
            ("Production Labor", production_hours, "hours", rates["production"], production_cost),
            ("Finishing Labor (Grommets)", grommet_labor_hours, "hours", rates["production"], finishing_labor_cost),
            ("Hardware Installation Labor", hardware_labor_hours, "hours", rates["production"], hardware_labor_cost),
        ]),
        "design": _nonzero_lines([("Design/Artwork", design_hours, "hours", rates["design"], design_cost)]),
        "finishing": _nonzero_lines([(f"Grommets ({grommet_mode})", total_grommets, "each", grommet_cost_each, grommet_material_cost)]),
        "hardware": [_line(_find_hardware(foundation, hk).get("name", hk), quantity, "each", float(_find_hardware(foundation, hk).get("purchase_cost", 0) or 0), float(_find_hardware(foundation, hk).get("purchase_cost", 0) or 0) * quantity) for hk in hardware_keys if _find_hardware(foundation, hk)],
        "install": _nonzero_lines([("Installation", install_hours, "hours", rates["install"], install_cost)]),
    }

    return {
        "material_cost": material_total, "labor_cost": production_cost + hardware_labor_cost + finishing_labor_cost,
        "design_cost": design_cost, "setup_cost": 0.0, "finishing_cost": grommet_material_cost, "hardware_cost": hardware_cost,
        "install_cost": install_cost, "outsourcing_cost": 0.0, "overhead_cost": overhead_cost,
        "selling_price": suggested_price, "minimum_charge": min_sell_per_item * quantity, "breakdown": breakdown, "warnings": warnings,
        "details": {"area_sqft": area_per_piece, "billable_area_sqft": billable_area_per_piece, "waste_adjusted_area": waste_adjusted_area, "perimeter_feet": perimeter_feet, "quantity_discount_percent": discount_percent},
    }


# ---------------------------------------------------------------------------
# Rigid Signs -- driver: square footage. Faithful port of legacy calculate_rigid_signs.
# ---------------------------------------------------------------------------

def _rigid_signs(quantity, specs, foundation, cfg, method):
    width = float(specs.get("width_inches") or specs.get("width") or 24)
    height = float(specs.get("height_inches") or specs.get("height") or specs.get("length_inches") or 24)
    unit = str(specs.get("unit_of_measure") or "inches").lower()
    area_per_piece = (width * height) if unit == "feet" else (width * height) / 144
    min_billable = float(cfg.get("default_minimum_billable_area", 1.0) or 1.0)
    billable_area_per_piece = max(area_per_piece, min_billable)
    total_billable_area = billable_area_per_piece * quantity
    waste_percent = float(cfg.get("waste_percentage", foundation.get("waste_percentage", 0)) or 0)
    waste_adjusted_area = total_billable_area * (1 + waste_percent / 100.0)

    is_yard_sign = specs.get("substrate_type_key") == "coroplast_4mm" and float(cfg.get("yard_sign_setup_minutes") or 0) > 0
    default_substrate = cfg.get("default_substrate_key", "coroplast_4mm")
    substrate_key = specs.get("substrate_type_key") or default_substrate
    substrate = _find_material(foundation, substrate_key)
    warnings = []
    if not substrate:
        warnings.append(f"Missing substrate type: {substrate_key}. Using default.")
        substrate_key = default_substrate
        substrate = _find_material(foundation, substrate_key)
    substrate_cost_sqft = _material_cost_per_sqft(foundation, substrate_key) or 0.90
    substrate_sell = _material_sell_rate(foundation, substrate_key) or (cfg.get("sell_rate_defaults") or {}).get("base_rate", 10.0)
    substrate_cost = waste_adjusted_area * substrate_cost_sqft

    graphic_method = specs.get("graphic_method") or cfg.get("default_graphic_method", "direct_print")
    mounting_hours = 0.0
    if graphic_method == "mounted_print":
        graphic_cost_sqft = _material_cost_per_sqft(foundation, cfg.get("mounted_print_graphic_key", "mounted_print_graphic"))
        mounting_hours = waste_adjusted_area * float(cfg.get("default_mounting_labor_hours_per_sqft", 0.08) or 0)
    elif graphic_method == "cut_vinyl_applied":
        graphic_cost_sqft = _material_cost_per_sqft(foundation, cfg.get("cut_vinyl_material_key", "oracal_651"))
    else:
        graphic_cost_sqft = _material_cost_per_sqft(foundation, cfg.get("direct_print_consumable_key", "direct_print_consumable")) or 0.50

    sidedness = specs.get("sidedness") or cfg.get("default_sidedness", "single")
    double_art = specs.get("double_sided_art") or cfg.get("default_double_sided_art", "same")
    sided_key = ("double_diff" if double_art == "different" else "double_same") if sidedness == "double" else "single"
    sided_mult = float((cfg.get("sidedness_multipliers") or {}).get(sided_key, 1.0) or 1.0)

    shape_mult = float((cfg.get("shape_multipliers") or {}).get(specs.get("shape_type") or cfg.get("default_shape_type", "rectangle"), 1.0) or 1.0)
    thickness_value = str(specs.get("thickness") or "").lower()
    thickness_tier = "thick_heavy" if any(t in thickness_value for t in ["10mm", "0.080", "1/4", "1/2"]) else "medium" if any(t in thickness_value for t in ["6mm", "0.063"]) else "thin_basic"
    thickness_mult = float((cfg.get("thickness_multipliers") or {}).get(thickness_tier, 1.0) or 1.0)
    finish_quality_mult = float((cfg.get("finish_quality_multipliers") or {}).get(specs.get("finish_quality") or cfg.get("default_finish_quality", "standard"), 1.0) or 1.0)

    finish_required = specs.get("protective_finish")
    if finish_required is None:
        finish_required = bool(cfg.get("default_finish_required", False))
    finish_key = specs.get("protective_finish_type") or cfg.get("default_finish_key", "rigid_finish_standard")
    finish_cost = 0.0
    if finish_required:
        finish_cost_sqft = _material_cost_per_sqft(foundation, finish_key)
        if finish_cost_sqft <= 0:
            warnings.append(f"Missing finish type: {finish_key}.")
        finish_cost = waste_adjusted_area * finish_cost_sqft * sided_mult

    graphic_face_cost = waste_adjusted_area * graphic_cost_sqft * sided_mult
    rates = _labor_rates(foundation)
    labor_minutes, shop_labor_rate, include_labor = _labor_minutes_and_rate(foundation, cfg, quantity, is_yard_sign)
    if labor_minutes > 0:
        base_production_hours = labor_minutes / 60.0
    else:
        per_piece_hours = max(billable_area_per_piece * float(cfg.get("production_labor_hours_per_sqft", 0.15) or 0), float(cfg.get("min_production_labor_hours_per_item", 0.2) or 0))
        base_production_hours = per_piece_hours * quantity
    production_hours = base_production_hours * thickness_mult * shape_mult * sided_mult
    production_cost = 0.0 if (labor_minutes > 0 and not include_labor) else production_hours * (shop_labor_rate if labor_minutes > 0 else rates["production"])
    mounting_cost = mounting_hours * rates["production"]

    design_hours, design_cost = _design_labor(specs, cfg, foundation)

    install_hours, install_cost = 0.0, 0.0
    if specs.get("install_required"):
        install_mult = float((cfg.get("install_complexity_multipliers") or {}).get(specs.get("install_complexity") or "easy", 1.0) or 1.0)
        install_hours = total_billable_area * float(cfg.get("install_hours_per_sqft", 0.08) or 0) * install_mult
        install_cost = max(rates["install_minimum"], install_hours * rates["install"])

    hardware_cost = hardware_sell = hardware_labor_cost = 0.0
    if specs.get("hardware_included"):
        hw_key = specs.get("hardware_type") or ""
        hw = _find_hardware(foundation, hw_key)
        hardware_cost = float(hw.get("purchase_cost", 0) or 0) * quantity
        hardware_sell = float(hw.get("default_sell_price", 0) or 0) * quantity
        if hw_key and not hw:
            warnings.append(f"Missing hardware: {hw_key}.")
        hardware_labor_cost = float(cfg.get("hardware_handling_labor_cost", 5.0) or 0) * quantity

    drill_prep_fee = float(cfg.get("drill_prep_fee", 3.0) or 0) * quantity if specs.get("drill_prep_required") else 0.0

    material_total = substrate_cost + graphic_face_cost + finish_cost + hardware_cost
    labor_total = production_cost + mounting_cost + hardware_labor_cost
    overhead_cost = _calculate_overhead(material_total + labor_total + design_cost + install_cost, production_hours + design_hours + install_hours + mounting_hours, foundation, cfg)

    min_sell = float(cfg.get("default_minimum_sell_price", cfg.get("minimum_charge", 25.0)) or 25.0)
    if method == "cost_plus":
        total_cost_basis = material_total + labor_total + design_cost + install_cost + overhead_cost
        sell_base = _resolve_selling_price(total_cost_basis, float(cfg.get("default_markup_multiplier", 2.45) or 2.45), float(cfg.get("target_profit_margin_percent", 40.0) or 40.0)) - design_cost - install_cost
        sell_base = max(sell_base, 0)
    else:
        sell_base = float(substrate_sell or 0) * total_billable_area * sided_mult * thickness_mult * shape_mult * finish_quality_mult
        if cfg.get("sell_method") == "max_of_rate_or_minimum":
            sell_base = max(sell_base, min_sell)

    discount_percent = _quantity_discount_percent(quantity, cfg.get("quantity_discounts"))
    sell_base *= (1 - discount_percent / 100.0)
    suggested_price = sell_base + design_cost + install_cost + drill_prep_fee + hardware_sell
    suggested_price = _apply_rush(suggested_price, specs.get("rush_order"), float(foundation.get("rush_fee_percentage", 0) or 0))

    breakdown = {
        "materials": _nonzero_lines([
            (substrate.get("name", substrate_key) if substrate else substrate_key, waste_adjusted_area, "sqft", substrate_cost_sqft, substrate_cost),
            (f"Graphics ({graphic_method})", waste_adjusted_area * sided_mult, "sqft", graphic_cost_sqft, graphic_face_cost),
        ]),
        "labor": _nonzero_lines([("Production Labor", production_hours, "hours", rates["production"], production_cost), ("Mounting Labor", mounting_hours, "hours", rates["production"], mounting_cost)]),
        "design": _nonzero_lines([("Design/Artwork", design_hours, "hours", rates["design"], design_cost)]),
        "finishing": _nonzero_lines([(finish_key, waste_adjusted_area * sided_mult, "sqft", _material_cost_per_sqft(foundation, finish_key), finish_cost)]),
        "hardware": _nonzero_lines([(specs.get("hardware_type", "Hardware"), quantity, "each", hardware_cost / quantity if quantity else 0, hardware_cost)]),
        "install": _nonzero_lines([("Installation", install_hours, "hours", rates["install"], install_cost), ("Hardware Installation Labor", quantity, "pieces", hardware_labor_cost / quantity if quantity else 0, hardware_labor_cost)]),
        "setup": _nonzero_lines([("Drill Prep", quantity, "pieces", drill_prep_fee / quantity if quantity else 0, drill_prep_fee)]),
    }

    return {
        "material_cost": material_total, "labor_cost": production_cost + mounting_cost, "design_cost": design_cost,
        "setup_cost": drill_prep_fee, "finishing_cost": finish_cost, "hardware_cost": hardware_cost + hardware_labor_cost,
        "install_cost": install_cost, "outsourcing_cost": 0.0, "overhead_cost": overhead_cost,
        "selling_price": suggested_price, "minimum_charge": min_sell * quantity, "breakdown": breakdown, "warnings": warnings,
        "details": {"area_sqft": area_per_piece, "billable_area_sqft": billable_area_per_piece, "quantity_discount_percent": discount_percent},
    }


# ---------------------------------------------------------------------------
# Cut Vinyl -- driver: square footage. Faithful port of legacy calculate_cut_vinyl.
# ---------------------------------------------------------------------------

def _cut_vinyl(quantity, specs, foundation, cfg, method):
    width = float(specs.get("width_inches") or specs.get("width") or 12)
    height = float(specs.get("height_inches") or specs.get("height") or specs.get("length_inches") or 12)
    unit = str(specs.get("unit_of_measure") or "inches").lower()
    area_per_piece = (width * height) if unit == "feet" else (width * height) / 144
    min_billable = float(cfg.get("default_minimum_billable_area", 0.5) or 0.5)
    billable_area_per_piece = max(area_per_piece, min_billable)
    total_billable_area = billable_area_per_piece * quantity
    waste_percent = float(cfg.get("waste_percentage", 10.0) or 0)
    waste_adjusted_area = total_billable_area * (1 + waste_percent / 100.0)

    vinyl_key = specs.get("vinyl_type_key") or cfg.get("default_vinyl_key", "oracal_651")
    vinyl = _find_material(foundation, vinyl_key)
    warnings = []
    if not vinyl:
        warnings.append(f"Vinyl type not found: {vinyl_key}. Using Oracal 651 fallback.")
        vinyl_key = cfg.get("default_vinyl_key", "oracal_651")
        vinyl = _find_material(foundation, vinyl_key)
    vinyl_cost_sqft = _material_cost_per_sqft(foundation, vinyl_key) or 1.25
    vinyl_sell = _material_sell_rate(foundation, vinyl_key) or (cfg.get("sell_rate_defaults") or {}).get("base_rate", 12.0)
    vinyl_cost = waste_adjusted_area * vinyl_cost_sqft

    num_colors = max(int(specs.get("num_colors") or 1), 1)
    color_change_cost = max(num_colors - 1, 0) * float(cfg.get("color_change_setup_fee", 5.0) or 0)

    masking_required = specs.get("masking_required")
    if masking_required is None:
        masking_required = bool(cfg.get("default_masking_required", False))
    masking_cost_sqft = _material_cost_per_sqft(foundation, cfg.get("mask_tape_key", "application_tape")) or 0.15
    masking_cost = waste_adjusted_area * masking_cost_sqft if masking_required else 0.0

    weeding_complexity = specs.get("weeding_complexity") or cfg.get("default_weeding_complexity", "simple")
    weeding_mult = float((cfg.get("weeding_complexity_multipliers") or {}).get(weeding_complexity, {"simple": 1.0, "detailed": 1.5, "intricate": 2.25}.get(weeding_complexity, 1.0)) or 1.0)

    rates = _labor_rates(foundation)
    labor_minutes, shop_labor_rate, include_labor = _labor_minutes_and_rate(foundation, cfg, quantity)
    if labor_minutes > 0:
        production_hours = (labor_minutes / 60.0) * weeding_mult
        production_cost = 0.0 if not include_labor else production_hours * shop_labor_rate
    else:
        per_piece_hours = max(billable_area_per_piece * float(cfg.get("production_labor_hours_per_sqft", 0.20) or 0), float(cfg.get("min_production_labor_hours_per_item", 0.15) or 0))
        production_hours = per_piece_hours * quantity * weeding_mult
        production_cost = production_hours * rates["production"]

    design_hours, design_cost = _design_labor(specs, cfg, foundation)
    install_hours, install_cost = 0.0, 0.0
    if specs.get("install_required"):
        install_mult = float((cfg.get("install_complexity_multipliers") or {}).get(specs.get("install_complexity") or "easy", 1.0) or 1.0)
        install_hours = total_billable_area * float(cfg.get("install_hours_per_sqft", 0.10) or 0) * install_mult
        install_cost = max(rates["install_minimum"], install_hours * rates["install"])

    use_type = str(specs.get("use_type") or cfg.get("default_use_type", "indoor")).lower()
    use_type_mult = float((cfg.get("use_type_multipliers") or {}).get(use_type, 1.0) or 1.0)

    material_total = vinyl_cost + masking_cost
    labor_total = production_cost
    overhead_cost = _calculate_overhead(material_total + labor_total + design_cost + install_cost + color_change_cost, production_hours + design_hours + install_hours, foundation, cfg)

    min_sell = float(cfg.get("default_minimum_sell_price", cfg.get("minimum_charge", 20.0)) or 20.0)
    if method == "cost_plus":
        total_cost_basis = material_total + labor_total + color_change_cost + design_cost + install_cost + overhead_cost
        sell_base = _resolve_selling_price(total_cost_basis, float(cfg.get("default_markup_multiplier", 2.30) or 2.30), float(cfg.get("target_profit_margin_percent", 40.0) or 40.0)) - design_cost - install_cost
        sell_base = max(sell_base, 0)
    else:
        sell_base = float(vinyl_sell or 0) * total_billable_area * use_type_mult
        if cfg.get("sell_method") == "max_of_rate_or_minimum":
            sell_base = max(sell_base, min_sell)

    discount_percent = _quantity_discount_percent(quantity, cfg.get("quantity_discounts"))
    sell_base *= (1 - discount_percent / 100.0)
    suggested_price = sell_base + color_change_cost + design_cost + install_cost
    suggested_price = max(suggested_price, min_sell)
    suggested_price = _apply_rush(suggested_price, specs.get("rush_order"), float(foundation.get("rush_fee_percentage", 0) or 0))

    breakdown = {
        "materials": _nonzero_lines([
            (vinyl.get("name", vinyl_key) if vinyl else vinyl_key, waste_adjusted_area, "sqft", vinyl_cost_sqft, vinyl_cost),
            ("Application Tape/Mask", waste_adjusted_area, "sqft", masking_cost_sqft, masking_cost),
        ]),
        "labor": _nonzero_lines([("Production/Weeding Labor", production_hours, "hours", rates["production"], production_cost)]),
        "design": _nonzero_lines([("Design/Artwork", design_hours, "hours", rates["design"], design_cost)]),
        "setup": _nonzero_lines([("Color Change Setup", max(num_colors - 1, 0), "each", float(cfg.get("color_change_setup_fee", 5.0) or 0), color_change_cost)]),
        "install": _nonzero_lines([("Installation", install_hours, "hours", rates["install"], install_cost)]),
    }

    return {
        "material_cost": material_total, "labor_cost": labor_total, "design_cost": design_cost, "setup_cost": color_change_cost,
        "finishing_cost": 0.0, "hardware_cost": 0.0, "install_cost": install_cost, "outsourcing_cost": 0.0, "overhead_cost": overhead_cost,
        "selling_price": suggested_price, "minimum_charge": min_sell, "breakdown": breakdown, "warnings": warnings,
        "details": {"area_sqft": area_per_piece, "billable_area_sqft": billable_area_per_piece, "num_colors": num_colors, "quantity_discount_percent": discount_percent},
    }



# ---------------------------------------------------------------------------
# Digital Print -- driver: square footage. Faithful port of legacy calculate_digital_print.
# ---------------------------------------------------------------------------

def _digital_print(quantity, specs, foundation, cfg, method):
    width = float(specs.get("width_inches") or specs.get("width") or 12)
    height = float(specs.get("height_inches") or specs.get("height") or specs.get("length_inches") or 12)
    unit = str(specs.get("unit_of_measure") or "inches").lower()
    area_per_piece = (width * height) if unit == "feet" else (width * height) / 144
    min_billable = float(cfg.get("default_minimum_billable_area", 1.0) or 1.0)
    billable_area_per_piece = max(area_per_piece, min_billable)
    total_billable_area = billable_area_per_piece * quantity
    waste_percent = float(cfg.get("waste_percentage", 10.0) or 0)
    waste_adjusted_area = total_billable_area * (1 + waste_percent / 100.0)

    media_key = specs.get("print_media_key") or cfg.get("default_print_media_key", "printable_adhesive_vinyl")
    media = _find_material(foundation, media_key)
    warnings = []
    if not media:
        warnings.append(f"Print media not found: {media_key}. Using default fallback.")
        media_key = cfg.get("default_print_media_key", "printable_adhesive_vinyl")
        media = _find_material(foundation, media_key)
    media_cost_sqft = _material_cost_per_sqft(foundation, media_key) or 1.50
    media_sell = _material_sell_rate(foundation, media_key) or (cfg.get("sell_rate_defaults") or {}).get("base_rate", 10.0)

    ink_coverage_percent = float(specs.get("ink_coverage_percent") if specs.get("ink_coverage_percent") is not None else cfg.get("default_ink_coverage_percent", 60))
    ink_cost_per_sqft_full = float(cfg.get("ink_cost_per_sqft_full_coverage", 0.35) or 0.35)
    ink_cost = waste_adjusted_area * ink_cost_per_sqft_full * (ink_coverage_percent / 100.0)
    media_cost = waste_adjusted_area * media_cost_sqft

    laminate_required = specs.get("laminate")
    if laminate_required is None:
        laminate_required = bool(cfg.get("default_laminate_required", False))
    laminate_key = specs.get("laminate_type_key") or cfg.get("default_laminate_key", "print_laminate_gloss")
    laminate_cost_sqft, laminate_cost = 0.0, 0.0
    if laminate_required:
        laminate_cost_sqft = _material_cost_per_sqft(foundation, laminate_key) or float(cfg.get("sell_rate_defaults", {}).get("laminate_addon_per_sqft", 0) or 0)
        laminate_cost = waste_adjusted_area * laminate_cost_sqft

    mounted = specs.get("mounted_to_substrate")
    substrate_cost = 0.0
    mounting_hours = 0.0
    if mounted:
        substrate_key = specs.get("substrate_material_key") or cfg.get("default_mount_substrate_key", "acm_dibond_3mm")
        substrate_cost_sqft = _material_cost_per_sqft(foundation, substrate_key) or 4.25
        substrate_cost = waste_adjusted_area * substrate_cost_sqft
        mounting_hours = waste_adjusted_area * float(cfg.get("default_mounting_labor_hours_per_sqft", 0.08) or 0)

    quality_mode = specs.get("print_quality_mode") or cfg.get("default_print_quality_mode", "production")
    quality_mult = float((cfg.get("print_quality_multipliers") or {}).get(quality_mode, {"draft": 0.85, "production": 1.0, "premium": 1.35}.get(quality_mode, 1.0)) or 1.0)

    contour_cut_type = specs.get("contour_cut_type") or "none"
    contour_hours = {"simple_shape": 0.1, "complex_shape": 0.3}.get(contour_cut_type, 0.0) * quantity
    piece_count = int(specs.get("separated_piece_count") or 1) if specs.get("piece_separation_required") else 1
    separation_hours = max(piece_count - 1, 0) * float(cfg.get("piece_separation_minutes_each", 2.0) or 2.0) / 60.0

    trim_finish = specs.get("trim_finish_type") or "none"
    trim_cost = float(cfg.get("trim_finish_charges", {}).get(trim_finish, 0) or 0) * quantity

    rates = _labor_rates(foundation)
    labor_minutes, shop_labor_rate, include_labor = _labor_minutes_and_rate(foundation, cfg, quantity)
    if labor_minutes > 0:
        production_hours = (labor_minutes / 60.0) * quality_mult
        production_cost = 0.0 if not include_labor else production_hours * shop_labor_rate
    else:
        per_piece_hours = max(billable_area_per_piece * float(cfg.get("production_labor_hours_per_sqft", 0.08) or 0), float(cfg.get("min_production_labor_hours_per_item", 0.15) or 0))
        production_hours = per_piece_hours * quantity * quality_mult
        production_cost = production_hours * rates["production"]
    production_hours += contour_hours + separation_hours
    production_cost += (contour_hours + separation_hours) * rates["production"]
    mounting_cost = mounting_hours * rates["production"]

    design_hours, design_cost = _design_labor(specs, cfg, foundation)

    file_cleanup_needed = specs.get("file_cleanup_needed")
    file_cleanup_cost = float(cfg.get("file_cleanup_fee", 15.0) or 0) if file_cleanup_needed else 0.0

    install_hours, install_cost = 0.0, 0.0
    if specs.get("install_required"):
        install_mult = float((cfg.get("install_complexity_multipliers") or {}).get(specs.get("install_complexity") or "easy", 1.0) or 1.0)
        install_hours = total_billable_area * float(cfg.get("install_hours_per_sqft", 0.06) or 0) * install_mult
        install_cost = max(rates["install_minimum"], install_hours * rates["install"])

    setup_fee = float(cfg.get("default_setup_fee", 0) or 0) if specs.get("include_setup_fee") else 0.0

    material_total = media_cost + ink_cost + laminate_cost + substrate_cost
    labor_total = production_cost + mounting_cost
    overhead_cost = _calculate_overhead(material_total + labor_total + design_cost + install_cost + trim_cost + file_cleanup_cost, production_hours + design_hours + install_hours + mounting_hours, foundation, cfg)

    min_sell = float(cfg.get("default_minimum_sell_price", cfg.get("minimum_charge", 20.0)) or 20.0)
    if method == "cost_plus":
        total_cost_basis = material_total + labor_total + design_cost + install_cost + trim_cost + file_cleanup_cost + setup_fee + overhead_cost
        sell_base = _resolve_selling_price(total_cost_basis, float(cfg.get("default_markup_multiplier", 2.30) or 2.30), float(cfg.get("target_profit_margin_percent", 40.0) or 40.0)) - design_cost - install_cost - trim_cost - file_cleanup_cost - setup_fee
        sell_base = max(sell_base, 0)
    else:
        sell_base = float(media_sell or 0) * total_billable_area
        if cfg.get("sell_method") == "max_of_rate_or_minimum":
            sell_base = max(sell_base, min_sell)

    discount_percent = _quantity_discount_percent(quantity, cfg.get("quantity_discounts"))
    sell_base *= (1 - discount_percent / 100.0)
    suggested_price = sell_base + design_cost + install_cost + trim_cost + file_cleanup_cost + setup_fee
    suggested_price = max(suggested_price, min_sell)
    suggested_price = _apply_rush(suggested_price, specs.get("rush_order"), float(foundation.get("rush_fee_percentage", 0) or 0))

    breakdown = {
        "materials": _nonzero_lines([
            (media.get("name", media_key) if media else media_key, waste_adjusted_area, "sqft", media_cost_sqft, media_cost),
            ("Ink", waste_adjusted_area, "sqft", ink_cost_per_sqft_full * (ink_coverage_percent / 100.0), ink_cost),
            (f"Laminate ({laminate_key})", waste_adjusted_area, "sqft", laminate_cost_sqft, laminate_cost),
            ("Mount Substrate", waste_adjusted_area, "sqft", substrate_cost / waste_adjusted_area if waste_adjusted_area else 0, substrate_cost),
        ]),
        "labor": _nonzero_lines([("Production Labor", production_hours, "hours", rates["production"], production_cost), ("Mounting Labor", mounting_hours, "hours", rates["production"], mounting_cost)]),
        "design": _nonzero_lines([("Design/Artwork", design_hours, "hours", rates["design"], design_cost)]),
        "finishing": _nonzero_lines([("Trim/Finish", quantity, "each", trim_cost / quantity if quantity else 0, trim_cost)]),
        "install": _nonzero_lines([("Installation", install_hours, "hours", rates["install"], install_cost)]),
        "setup": _nonzero_lines([("File Cleanup", 1, "job", file_cleanup_cost, file_cleanup_cost), ("Setup Fee", 1, "job", setup_fee, setup_fee)]),
    }

    return {
        "material_cost": material_total, "labor_cost": labor_total, "design_cost": design_cost,
        "setup_cost": file_cleanup_cost + setup_fee, "finishing_cost": trim_cost, "hardware_cost": 0.0,
        "install_cost": install_cost, "outsourcing_cost": 0.0, "overhead_cost": overhead_cost,
        "selling_price": suggested_price, "minimum_charge": min_sell, "breakdown": breakdown, "warnings": warnings,
        "details": {"area_sqft": area_per_piece, "billable_area_sqft": billable_area_per_piece, "ink_coverage_percent": ink_coverage_percent, "quantity_discount_percent": discount_percent},
    }


# ---------------------------------------------------------------------------
# Vehicle Wrap -- driver: coverage %. Faithful port of legacy calculate_vehicle_graphics.
# ---------------------------------------------------------------------------

VEHICLE_BASE_SQFT = {"sedan": 150, "suv": 200, "pickup": 175, "van_cargo": 250, "sprinter_van": 350, "box_truck_16": 500, "trailer": 450, "semi": 800}
COVERAGE_FACTORS = {"spot": 0.10, "partial": 0.25, "half": 0.45, "full": 1.0}


def _vehicle_wrap(quantity, specs, foundation, cfg, method):
    vehicle_type = specs.get("vehicle_type") or "van_cargo"
    coverage_raw = str(specs.get("coverage_type") or cfg.get("default_coverage_type", "spot")).lower()
    custom_percent = float(specs.get("custom_coverage_percent") or 0)
    is_custom = coverage_raw == "custom"
    if is_custom:
        if custom_percent >= 100:
            coverage_key, coverage_factor = "full", 1.0
        elif custom_percent >= 60:
            coverage_key, coverage_factor = "full", custom_percent / 100.0
        elif custom_percent >= 35:
            coverage_key, coverage_factor = "half", custom_percent / 100.0
        elif custom_percent > 0:
            coverage_key, coverage_factor = "partial", custom_percent / 100.0
        else:
            coverage_key, coverage_factor = "spot", COVERAGE_FACTORS["spot"]
    else:
        coverage_key = coverage_raw if coverage_raw in COVERAGE_FACTORS else "spot"
        coverage_factor = COVERAGE_FACTORS.get(coverage_key, 0.10)

    vehicle_base_sqft = float(next((m.get("base_sqft", 160) for m in (foundation.get("materials") or []) if m.get("category") == "vehicle_type" and (m.get("key") == vehicle_type or m.get("id") == vehicle_type)), VEHICLE_BASE_SQFT.get(vehicle_type, 160)))
    estimated_area_per_vehicle = float(specs.get("estimated_vehicle_sqft") or (vehicle_base_sqft * coverage_factor))
    total_area = estimated_area_per_vehicle * quantity

    waste_map = cfg.get("waste_by_coverage") or {}
    waste_percent = float(waste_map.get("custom" if is_custom and "custom" in waste_map else coverage_key, cfg.get("waste_percentage", 12.0)) or 12.0)
    waste_adjusted_area = total_area * (1 + waste_percent / 100.0)

    wrap_key = specs.get("wrap_material_key") or cfg.get("default_wrap_material_key", "wrap_standard_calendared")
    wrap_material = _find_material(foundation, wrap_key)
    warnings = []
    if not wrap_material:
        warnings.append(f"Wrap material not found: {wrap_key}. Using calendared fallback.")
        wrap_key = cfg.get("default_wrap_material_key", "wrap_standard_calendared")
        wrap_material = _find_material(foundation, wrap_key)
    vinyl_cost_sqft = _material_cost_per_sqft(foundation, wrap_key) or 1.50
    vinyl_material_cost = waste_adjusted_area * vinyl_cost_sqft

    lam_required = specs.get("wrap_laminate_required")
    if lam_required is None:
        lam_required = bool(cfg.get("default_laminate_required_for_prints", True))
    lam_key = specs.get("wrap_laminate_type_key") or cfg.get("default_wrap_laminate_key", "wrap_laminate_gloss")
    laminate_cost_sqft, laminate_material_cost = 0.0, 0.0
    if lam_required:
        laminate_cost_sqft = _material_cost_per_sqft(foundation, lam_key)
        if laminate_cost_sqft <= 0:
            warnings.append(f"Laminate not found: {lam_key}.")
            laminate_cost_sqft = 1.25
        laminate_material_cost = waste_adjusted_area * laminate_cost_sqft

    perf_included = specs.get("window_perf_included")
    if perf_included is None:
        perf_included = bool(cfg.get("default_window_perf_included", False))
    perf_scope = str(specs.get("window_perf_scope") or cfg.get("default_window_perf_scope", "rear")).lower()
    perf_material_cost, perf_sell, perf_area = 0.0, 0.0, 0.0
    if perf_included:
        scope_area_map = cfg.get("window_perf_scope_area_sqft", {"rear": 18.0, "side": 14.0, "full": 40.0})
        perf_area = float(scope_area_map.get(perf_scope, 18.0) or 18.0) * quantity
        perf_cost_sqft = _material_cost_per_sqft(foundation, cfg.get("window_perf_material_key", "wrap_window_perf")) or 2.50
        perf_material_cost = perf_area * perf_cost_sqft * (1 + waste_percent / 100.0)
        rear_rate, side_rate = float(cfg.get("window_perf_sell_rate_rear_per_sqft", 18.0) or 18.0), float(cfg.get("window_perf_sell_rate_side_per_sqft", 20.0) or 20.0)
        sell_rate = side_rate if perf_scope == "side" else (rear_rate + side_rate) / 2.0 if perf_scope == "full" else rear_rate
        perf_sell = perf_area * sell_rate

    rates = _labor_rates(foundation)
    labor_minutes, shop_labor_rate, include_labor = _labor_minutes_and_rate(foundation, cfg, quantity)
    if labor_minutes > 0:
        production_hours = labor_minutes / 60.0
        production_cost = 0.0 if not include_labor else production_hours * shop_labor_rate
    else:
        per_piece_hours = max(estimated_area_per_vehicle * float(cfg.get("production_labor_hours_per_sqft", 0.12) or 0.12), float(cfg.get("min_production_labor_hours_per_item", 1.0) or 1.0))
        production_hours = per_piece_hours * quantity
        production_cost = production_hours * rates["production"]

    charge_separately, default_design_rate, included_minutes = _design_charge_config(foundation)
    design_hours, design_cost = 0.0, 0.0
    if not specs.get("artwork_ready") and (specs.get("artwork_needed") if specs.get("artwork_needed") is not None else True):
        design_time_map = cfg.get("design_time_by_coverage_hours") or {}
        base_design = float(design_time_map.get(coverage_key, design_time_map.get("partial", 1.5)) or 1.5)
        dc_mult = float((cfg.get("design_complexity_multipliers") or {}).get(str(specs.get("design_complexity") or "medium").lower(), 1.0) or 1.0)
        design_hours = base_design * dc_mult
        if charge_separately != "no":
            billable_minutes = max(0.0, design_hours * 60 - included_minutes)
            design_cost = (billable_minutes / 60.0) * default_design_rate

    prep_scope = str(specs.get("surface_prep_level") or cfg.get("default_surface_prep", "none")).lower()
    prep_hours = float((cfg.get("surface_prep_hours") or {}).get(prep_scope, 0) or 0) * quantity
    prep_cost = prep_hours * rates["production"]

    removal_scope = str(specs.get("removal_scope") or cfg.get("default_removal_scope", "none")).lower()
    removal_hours = float((cfg.get("removal_hours") or {}).get(removal_scope, 0) or 0) * quantity
    removal_cost = removal_hours * rates["removal"]
    removal_consumables = float(cfg.get("removal_consumables_allowance", 8.0) or 8.0) * quantity if removal_scope != "none" else 0.0

    install_required = specs.get("install_required") if specs.get("install_required") is not None else bool(cfg.get("default_install_required", True))
    install_hours, install_labor_cost, helper_cost = 0.0, 0.0, 0.0
    install_difficulty_key = str(specs.get("install_difficulty_level") or cfg.get("default_install_difficulty", "medium")).lower()
    seam_key = str(specs.get("seam_complexity") or cfg.get("default_seam_complexity", "basic")).lower()
    second_installer = specs.get("second_installer_required") if specs.get("second_installer_required") is not None else bool(cfg.get("default_second_installer_required", False))
    install_minimum = float(cfg.get("install_minimum", 125.0) or 125.0)
    install_rate = float(cfg.get("install_rate_per_hour", 75.0) or 75.0)
    helper_rate = float(cfg.get("second_installer_rate_per_hour", 35.0) or 35.0)
    if install_required:
        install_map = cfg.get("install_hours_by_vehicle_coverage") or {}
        vehicle_map = install_map.get(vehicle_type, install_map.get("other", {})) or {}
        base_install_hrs = float(vehicle_map.get(coverage_key, vehicle_map.get("partial", 4.0)) or 4.0)
        if is_custom and custom_percent > 0:
            full_hrs = float(vehicle_map.get("full", base_install_hrs * 4) or (base_install_hrs * 4))
            base_install_hrs = full_hrs * (custom_percent / 100.0)
        diff_mult = float((cfg.get("install_difficulty_multipliers") or {}).get(install_difficulty_key, 1.0) or 1.0)
        seam_mult = float((cfg.get("seam_complexity_multipliers") or {}).get(seam_key, 1.0) or 1.0)
        install_hours = base_install_hrs * diff_mult * seam_mult * quantity
        install_labor_cost = max(install_minimum * quantity, install_hours * install_rate)
        if second_installer:
            helper_cost = install_hours * helper_rate

    material_total = vinyl_material_cost + perf_material_cost + removal_consumables
    labor_total = production_cost + prep_cost + removal_cost
    total_labor_hours = production_hours + design_hours + prep_hours + removal_hours + install_hours + (install_hours if second_installer else 0)
    overhead_cost = _calculate_overhead(material_total + labor_total + laminate_material_cost + design_cost + install_labor_cost + helper_cost, total_labor_hours, foundation, cfg)
    total_cost_basis = material_total + laminate_material_cost + labor_total + design_cost + install_labor_cost + helper_cost + overhead_cost

    cost_plus_price = _resolve_selling_price(total_cost_basis, float(cfg.get("default_markup_multiplier", foundation.get("default_markup_multiplier", 2.4)) or 2.4), float(cfg.get("target_profit_margin_percent", foundation.get("target_profit_margin_percent", 42.0)) or 42.0))

    package_map = cfg.get("package_pricing_by_vehicle_coverage") or {}
    vehicle_pkg = package_map.get(vehicle_type, package_map.get("other", {})) or {}
    package_price_per_vehicle = float(vehicle_pkg.get(coverage_key, vehicle_pkg.get("partial", 0)) or 0)
    if is_custom and custom_percent > 0:
        package_price_per_vehicle = float(vehicle_pkg.get("full", package_price_per_vehicle * 4) or 0) * (custom_percent / 100.0)
    if install_required:
        package_price_per_vehicle *= float((cfg.get("install_difficulty_multipliers") or {}).get(install_difficulty_key, 1.0) or 1.0) * float((cfg.get("seam_complexity_multipliers") or {}).get(seam_key, 1.0) or 1.0)
    package_price_total = package_price_per_vehicle * quantity

    if method == "package_benchmark":
        suggested_price = package_price_total if package_price_total > 0 else cost_plus_price
    elif method == "cost_plus":
        suggested_price = cost_plus_price
    else:
        suggested_price = max(package_price_total, cost_plus_price)
    suggested_price += perf_sell

    min_sell = float(cfg.get("default_minimum_sell_price", cfg.get("minimum_charge", 150.0)) or 150.0)
    suggested_price = max(suggested_price, min_sell * quantity)
    rush_pct = float(cfg.get("rush_increase_percent", foundation.get("rush_fee_percentage", 30.0)) or 30.0)
    suggested_price = _apply_rush(suggested_price, specs.get("rush_order"), rush_pct)

    breakdown = {
        "materials": _nonzero_lines([
            (wrap_material.get("name", wrap_key) if wrap_material else wrap_key, waste_adjusted_area, "sqft", vinyl_cost_sqft, vinyl_material_cost),
            (f"Window Perf ({perf_scope})", perf_area * (1 + waste_percent / 100.0), "sqft", perf_material_cost / (perf_area * (1 + waste_percent / 100.0)) if perf_area else 0, perf_material_cost),
            ("Removal Consumables", quantity, "vehicle", float(cfg.get("removal_consumables_allowance", 8.0) or 8.0), removal_consumables),
        ]),
        "finishing": _nonzero_lines([(f"Laminate ({lam_key})", waste_adjusted_area, "sqft", laminate_cost_sqft, laminate_material_cost)]),
        "labor": _nonzero_lines([
            ("Production / Prep Labor", production_hours, "hours", rates["production"], production_cost),
            (f"Surface Prep ({prep_scope})", prep_hours, "hours", rates["production"], prep_cost),
            (f"Removal Labor ({removal_scope})", removal_hours, "hours", rates["removal"], removal_cost),
        ]),
        "design": _nonzero_lines([("Design / Artwork", design_hours, "hours", default_design_rate, design_cost)]),
        "install": _nonzero_lines([("Vehicle Install Labor", install_hours, "hours", install_labor_cost / install_hours if install_hours else install_rate, install_labor_cost), ("Second Installer (Helper)", install_hours, "hours", helper_rate, helper_cost)]),
    }

    return {
        "material_cost": material_total, "labor_cost": labor_total, "design_cost": design_cost, "setup_cost": 0.0,
        "finishing_cost": laminate_material_cost, "hardware_cost": 0.0, "install_cost": install_labor_cost + helper_cost,
        "outsourcing_cost": 0.0, "overhead_cost": overhead_cost, "selling_price": suggested_price, "minimum_charge": min_sell * quantity,
        "breakdown": breakdown, "warnings": warnings,
        "details": {"vehicle_type": vehicle_type, "coverage_resolved": coverage_key, "estimated_area_per_vehicle": estimated_area_per_vehicle, "cost_plus_price": cost_plus_price, "package_price_total": package_price_total},
    }



# ---------------------------------------------------------------------------
# Services -- driver: labor hours / billing unit. Faithful port of legacy calculate_services.
# ---------------------------------------------------------------------------

def _services(quantity, specs, foundation, cfg, method):
    warnings = []
    service_types = cfg.get("available_service_types") or []
    st_key = specs.get("service_type") or cfg.get("default_service_type", "general_labor")
    st_info = next((s for s in service_types if s.get("key") == st_key), None)
    if not st_info:
        if service_types:
            warnings.append(f"Service type '{st_key}' not found. Using general_labor fallback.")
        st_key, st_info = "general_labor", {}

    billing_unit = str(specs.get("services_billing_unit") or st_info.get("default_billing_unit") or "hour").lower()
    labor_role = specs.get("services_labor_role") or st_info.get("default_labor_role") or cfg.get("default_labor_role", "production")
    labor_roles = cfg.get("labor_roles") or {}
    role_entry = labor_roles.get(labor_role, labor_roles.get("production", {})) or {}
    labor_cost_rate = float(role_entry.get("cost_per_hour", 28.0) or 28.0)
    labor_sell_rate = float(specs.get("hourly_rate_override") or role_entry.get("sell_per_hour", 75.0) or 75.0)

    complexity_key = str(specs.get("services_complexity") or "medium").lower()
    complexity_mult = float((cfg.get("complexity_multipliers") or {}).get(complexity_key, 1.25))

    qty_raw = float(quantity or 1)
    min_billable_qty = float(cfg.get("default_min_billable_quantity", 1.0) or 1.0)
    minimum_applies = specs.get("services_minimum_applies") if specs.get("services_minimum_applies") is not None else True
    estimated_hours = float(specs.get("estimated_hours") or 0)
    effective_hours = estimated_hours
    if billing_unit == "hour" and minimum_applies and 0 < effective_hours < min_billable_qty:
        effective_hours = min_billable_qty

    flat_fee = specs.get("services_flat_fee") if specs.get("services_flat_fee") is not None else st_info.get("default_flat_fee")
    unit_rate = float((specs.get("services_unit_rate_override") if specs.get("services_unit_rate_override") is not None else st_info.get("default_suggested_sell_per_hour")) or 0)
    num_workers = max(int(round(float(specs.get("num_workers") or 1))), 1)
    trip_rate_default = float(cfg.get("trip_charge_default", 45.0) or 0)
    trip_cost_rate = float(cfg.get("trip_charge_cost", 0) or 0)
    trip_count = max(int(specs.get("services_trip_count") or 1), 1)

    labor_cost, labor_sell_baseline = 0.0, 0.0
    if billing_unit == "hour":
        hrs = effective_hours * num_workers
        labor_cost = hrs * labor_cost_rate * complexity_mult
        labor_sell_baseline = hrs * (unit_rate or labor_sell_rate) * complexity_mult
    elif billing_unit == "flat":
        labor_cost = (effective_hours or 0.5) * num_workers * labor_cost_rate
        labor_sell_baseline = float(flat_fee if flat_fee is not None else unit_rate) * qty_raw
    elif billing_unit in ("piece", "sqft", "linear_foot"):
        labor_cost = (effective_hours or 0) * num_workers * labor_cost_rate * complexity_mult
        labor_sell_baseline = qty_raw * (unit_rate or labor_sell_rate) * complexity_mult
    elif billing_unit == "mile":
        miles = float(specs.get("services_travel_miles") or qty_raw or 0)
        labor_cost = miles * float(cfg.get("travel_cost_per_mile", 0.65) or 0)
        labor_sell_baseline = miles * float(cfg.get("travel_sell_rate_per_mile", 1.25) or 0)
    elif billing_unit == "trip":
        trips = max(trip_count, int(qty_raw))
        labor_cost = trips * trip_cost_rate + (effective_hours * num_workers * labor_cost_rate)
        labor_sell_baseline = trips * (unit_rate or trip_rate_default)
    elif billing_unit == "day":
        day_hours = float(cfg.get("default_day_hours", 8) or 8)
        labor_cost = qty_raw * day_hours * num_workers * labor_cost_rate * complexity_mult
        labor_sell_baseline = qty_raw * (unit_rate or labor_sell_rate * day_hours) * complexity_mult
    else:
        labor_cost = (effective_hours or 0) * num_workers * labor_cost_rate * complexity_mult
        labor_sell_baseline = qty_raw * (unit_rate or labor_sell_rate) * complexity_mult

    travel_cost, travel_sell = 0.0, 0.0
    travel_required = specs.get("services_travel_required") if specs.get("services_travel_required") is not None else bool(st_info.get("requires_travel", cfg.get("default_travel_enabled", False)))
    travel_miles = float(specs.get("services_travel_miles") or 0)
    if travel_required and billing_unit != "mile":
        travel_cost = travel_miles * float(cfg.get("travel_cost_per_mile", 0.65) or 0)
        travel_sell = travel_miles * float(cfg.get("travel_sell_rate_per_mile", 1.25) or 0)
    travel_native_unit = billing_unit in ("mile", "trip")
    if bool(specs.get("services_trip_charge_applies")) and not travel_native_unit:
        travel_cost += trip_count * trip_cost_rate
        travel_sell += trip_count * trip_rate_default
        min_trip = float(cfg.get("minimum_trip_charge", 45.0) or 0)
        if travel_sell < min_trip:
            travel_sell = min_trip

    equipment_cost, equipment_sell = 0.0, 0.0
    equipment_required = specs.get("services_equipment_required") if specs.get("services_equipment_required") is not None else bool(cfg.get("default_equipment_enabled", False))
    equipment_days, equipment_hours = float(specs.get("services_equipment_days") or 0), float(specs.get("services_equipment_hours") or 0)
    equipment_type = specs.get("services_equipment_type") or "custom"
    if equipment_required and (equipment_days > 0 or equipment_hours > 0):
        eq_library = cfg.get("equipment_library") or []
        eq_entry = next((e for e in eq_library if e.get("key") == equipment_type), None)
        if not eq_entry:
            warnings.append(f"Equipment type '{equipment_type}' not found. Using generic custom rates.")
            eq_entry = {"cost_per_day": cfg.get("equipment_cost_per_day", 150.0), "sell_per_day": cfg.get("equipment_sell_rate_per_day", 225.0), "cost_per_hour": 25.0, "sell_per_hour": 45.0}
        equipment_cost += equipment_days * float(eq_entry.get("cost_per_day", 150.0) or 0) + equipment_hours * float(eq_entry.get("cost_per_hour", 25.0) or 0)
        equipment_sell += equipment_days * float(eq_entry.get("sell_per_day", 225.0) or 0) + equipment_hours * float(eq_entry.get("sell_per_hour", 45.0) or 0)

    subcontract_cost, subcontract_sell = 0.0, 0.0
    subcontracted = specs.get("services_subcontracted") if specs.get("services_subcontracted") is not None else bool(st_info.get("typically_subcontracted", False))
    markup_applies = specs.get("services_subcontract_markup_applies") if specs.get("services_subcontract_markup_applies") is not None else True
    if subcontracted and specs.get("services_subcontract_cost"):
        subcontract_cost = float(specs.get("services_subcontract_cost") or 0)
        markup_pct = float(cfg.get("subcontract_markup_percent", 20.0) or 0)
        subcontract_sell = subcontract_cost * (1 + markup_pct / 100.0) if markup_applies else subcontract_cost

    permit_cost = float(specs.get("services_permit_external_fee") or 0)
    permit_sell = permit_cost

    non_labor_cost = travel_cost + equipment_cost + subcontract_cost + permit_cost
    hour_like_units = ("hour", "flat", "piece", "sqft", "linear_foot", "custom")
    day_hours = float(cfg.get("default_day_hours", 8) or 8)
    if billing_unit in hour_like_units:
        labor_hours_for_overhead = effective_hours * num_workers
    elif billing_unit == "day":
        labor_hours_for_overhead = qty_raw * day_hours * num_workers
    elif billing_unit == "trip":
        labor_hours_for_overhead = max(trip_count, int(qty_raw)) * 1.0 * num_workers
    elif billing_unit == "mile":
        labor_hours_for_overhead = (travel_miles / 35.0) * num_workers if travel_miles else 0
    else:
        labor_hours_for_overhead = 0
    overhead_cost = _calculate_overhead(non_labor_cost + labor_cost, labor_hours_for_overhead, foundation, cfg)
    production_cost_total = labor_cost + non_labor_cost + overhead_cost

    markup = float(cfg.get("default_markup_multiplier", 1.8) or 1.8)
    target_margin = float(cfg.get("target_profit_margin_percent", 35.0) or 35.0)
    allocable_base = production_cost_total - non_labor_cost
    labor_overhead_share = overhead_cost * (labor_cost / allocable_base) if (allocable_base > 0 and labor_cost > 0) else overhead_cost
    cost_plus_labor_sell = _resolve_selling_price(labor_cost + labor_overhead_share, markup, target_margin)

    sell_method = st_info.get("sell_method") or cfg.get("default_sell_method") or method
    if sell_method == "cost_plus":
        baseline_portion = cost_plus_labor_sell
    elif sell_method == "pass_through_plus_markup":
        baseline_portion = 0.0
    else:
        baseline_portion = max(labor_sell_baseline, cost_plus_labor_sell)
    suggested_price = baseline_portion + travel_sell + equipment_sell + subcontract_sell + permit_sell

    per_service_min = float(st_info.get("default_minimum_charge") or cfg.get("default_minimum_sell_price") or 25.0)
    effective_min = float(specs.get("services_minimum_override") or 0) or per_service_min
    if minimum_applies:
        suggested_price = max(suggested_price, effective_min, float(cfg.get("default_minimum_sell_price", 25.0) or 25.0))

    foundation_rush_raw = foundation.get("default_rush_percent")
    rush_pct = float(foundation_rush_raw) if foundation_rush_raw is not None else float(cfg.get("rush_percent", 25.0) or 25.0)
    suggested_price = _apply_rush(suggested_price, specs.get("rush_order"), rush_pct)

    if specs.get("services_manual_quote_override") and float(specs.get("services_manual_quote_override")) > 0:
        suggested_price = float(specs.get("services_manual_quote_override"))

    outsourcing_total = travel_cost + equipment_cost + subcontract_cost + permit_cost
    breakdown = {
        "labor": _nonzero_lines([(f"{(st_info.get('label') if st_info else st_key)} Labor ({labor_role})", effective_hours * num_workers if billing_unit in hour_like_units else labor_hours_for_overhead, "hours", labor_cost_rate, labor_cost)]),
        "outsourcing": _nonzero_lines([
            (f"Travel ({travel_miles} mi)" if travel_miles > 0 else "Travel / Trip Charge", travel_miles or trip_count, "miles" if travel_miles > 0 else "trips", float(cfg.get("travel_cost_per_mile", 0.65) or 0) if travel_miles > 0 else trip_cost_rate, travel_cost),
            (f"Equipment Rental ({equipment_type})", equipment_days or equipment_hours, "days" if equipment_days > 0 else "hours", (equipment_cost / equipment_days) if equipment_days > 0 else (equipment_cost / equipment_hours if equipment_hours > 0 else equipment_cost), equipment_cost),
            ("Subcontract / Vendor", 1, "job", subcontract_cost, subcontract_cost),
            ("Permits / External Fees", 1, "job", permit_cost, permit_cost),
        ]),
    }

    return {
        "material_cost": 0.0, "labor_cost": labor_cost, "design_cost": 0.0, "setup_cost": 0.0, "finishing_cost": 0.0,
        "hardware_cost": 0.0, "install_cost": 0.0, "outsourcing_cost": outsourcing_total, "overhead_cost": overhead_cost,
        "selling_price": suggested_price, "minimum_charge": effective_min if minimum_applies else 0, "breakdown": breakdown, "warnings": warnings,
        "details": {"service_type": st_key, "billing_unit": billing_unit, "labor_role": labor_role, "effective_hours": effective_hours, "num_workers": num_workers},
    }


# ---------------------------------------------------------------------------
# Apparel -- driver: apparel quantity. Faithful port of legacy calculate_apparel.
# ---------------------------------------------------------------------------

def _apparel(quantity, specs, foundation, cfg, method):
    product_types = cfg.get("available_product_types") or []
    product_type_key = specs.get("apparel_product_type") or (product_types[0]["key"] if product_types else "short_sleeve_tee")
    product_type_info = next((p for p in product_types if p.get("key") == product_type_key), {}) or {}
    is_hat = bool(product_type_info.get("is_hat", False))

    brand_styles = (cfg.get("available_brand_styles") or {}).get(product_type_key, []) or []
    brand_key = specs.get("apparel_brand_style_key") or (brand_styles[0]["key"] if brand_styles else "")
    placement_key = specs.get("apparel_placement_set") or "front"
    avail_methods = cfg.get("available_decoration_methods") or ["htv"]
    method_key = specs.get("apparel_decoration_method") or cfg.get("default_decoration_method", "htv")
    if method_key not in avail_methods:
        method_key = "htv"
    method_cfg = (cfg.get("method_config") or {}).get(method_key, {}) or {}
    uses_shop_table = method_key in (cfg.get("methods_using_shop_table") or []) and bool(method_cfg.get("uses_shop_table", False))

    qty = max(int(round(quantity or 1)), 1)
    tiers = cfg.get("quantity_tiers") or []
    tier_key = "1_4"
    for tier in tiers:
        min_q, max_q = int(tier.get("min_qty", 0) or 0), tier.get("max_qty")
        if qty >= min_q and (max_q is None or qty <= int(max_q)):
            tier_key = tier.get("key", "1_4")
            break

    blank_material = _find_material(foundation, brand_key) if brand_key else {}
    blank_cost_per_piece = float(specs.get("blank_cost_override")) if specs.get("blank_cost_override") is not None else float((blank_material or {}).get("cost_per_unit", 0) or 0)
    if specs.get("customer_supplied"):
        blank_cost_per_piece = 0.0
    total_blank_cost = blank_cost_per_piece * qty

    warnings = []
    shop_table = cfg.get("shop_pricing_table") or {}
    per_piece_sell, baseline_source = 0.0, ""
    if uses_shop_table and brand_key:
        per_piece_sell = float(((shop_table.get(brand_key, {}) or {}).get(tier_key, {}) or {}).get(placement_key, 0) or 0)
        if per_piece_sell > 0:
            baseline_source = f"shop_table:{method_key}"
        else:
            warnings.append(f"Shop table missing row for {brand_key}/{tier_key}/{placement_key}. Falling back to cost-plus.")

    decoration_material_per_piece = 0.0
    if "material_cost_per_color_per_piece" in method_cfg:
        decoration_material_per_piece = float(method_cfg["material_cost_per_color_per_piece"] or 0) * max(int(specs.get("apparel_num_colors") or 1), 1)
    elif "material_cost_per_piece" in method_cfg:
        decoration_material_per_piece = float(method_cfg["material_cost_per_piece"] or 0)
    elif "cost_per_1k_stitches" in method_cfg:
        decoration_material_per_piece = float(method_cfg["cost_per_1k_stitches"] or 0) * (float(specs.get("apparel_stitch_count") or method_cfg.get("default_stitch_count", 6000)) / 1000.0)
    elif "material_cost_per_sqin" in method_cfg:
        decoration_material_per_piece = float(method_cfg["material_cost_per_sqin"] or 0) * 80.0
    total_decoration_material_cost = decoration_material_per_piece * qty

    if per_piece_sell <= 0 or method == "cost_plus":
        setup_fee_flat = float(method_cfg.get("default_setup_fee", cfg.get("default_setup_fee", 10.0)) or 0)
        setup_fee_amortized = setup_fee_flat / qty if qty > 0 else 0.0
        prod_rate = _labor_rates(foundation)["production"]
        labor_minutes_pp = float(cfg.get("apparel_labor_minutes_per_piece", 1.5) or 1.5)
        labor_cost_pp = (labor_minutes_pp / 60.0) * prod_rate
        cost_per_piece = blank_cost_per_piece + decoration_material_per_piece + labor_cost_pp + setup_fee_amortized
        markup = float(cfg.get("default_markup_multiplier", 2.15) or 2.15)
        per_piece_sell = max(cost_per_piece * markup, float(method_cfg.get("min_sell_per_piece", cfg.get("default_minimum_sell_price", 10.0)) or 10.0))
        baseline_source = f"cost_plus:{method_key}"

    retail_base = float((blank_material or {}).get("retail_base_no_print", 0) or 0)
    if retail_base > 0:
        per_piece_sell = max(per_piece_sell, retail_base)

    suggested_price = per_piece_sell * qty

    plus_size_count = int(specs.get("apparel_plus_size_count") or 0)
    plus_size_cost = (plus_size_count * float(cfg.get("plus_size_upcharge_per_x", 2.0) or 0)) if not is_hat else 0.0
    suggested_price += plus_size_cost

    custom_nn_count = int(specs.get("apparel_custom_name_number_count") or 0)
    custom_nn_cost = (float(cfg.get("custom_name_number_hat", 3.0) if is_hat else cfg.get("custom_name_number_garment", 4.0)) * custom_nn_count) if specs.get("apparel_custom_name_number") else 0.0
    suggested_price += custom_nn_cost

    specialty_cost = (float(cfg.get("specialty_vinyl_hat", 1.5) if is_hat else cfg.get("specialty_finish_garment", 2.0)) * qty) if specs.get("apparel_specialty_finish") else 0.0
    suggested_price += specialty_cost
    two_tone_cost = (float(cfg.get("two_tone_hat_finish", 1.5) or 0) * qty) if (is_hat and specs.get("apparel_two_tone_hat_finish")) else 0.0
    suggested_price += two_tone_cost
    patch_cost = (float(cfg.get("leather_patch_hat", 2.5) or 0) * qty) if (is_hat and specs.get("apparel_leather_patch")) else 0.0
    suggested_price += patch_cost
    bag_fold_cost = (float(cfg.get("bag_and_fold_each", 1.0) or 0) * qty) if specs.get("apparel_bag_and_fold") else 0.0
    suggested_price += bag_fold_cost

    complexity_key = str(specs.get("design_complexity") or cfg.get("default_design_complexity", "simple")).lower()
    artwork_ready = bool(specs.get("artwork_ready"))
    artwork_needed = specs.get("artwork_needed") if specs.get("artwork_needed") is not None else bool(cfg.get("default_artwork_needed", False))
    setup_fee = 0.0
    if not artwork_ready and artwork_needed:
        setup_fee = float((cfg.get("design_complexity_setup_fees") or {}).get(complexity_key, cfg.get("default_setup_fee", 10.0)) or 10.0)
    suggested_price += setup_fee

    rush_percent = float(specs.get("apparel_rush_percent") if specs.get("apparel_rush_percent") is not None else cfg.get("default_rush_percent", 17.5))
    suggested_price = _apply_rush(suggested_price, specs.get("rush_order"), rush_percent)

    min_sell_per_piece = float(cfg.get("default_minimum_sell_price", 10.0) or 10.0)
    suggested_price = max(suggested_price, min_sell_per_piece * qty)

    if specs.get("apparel_manual_quote_override") and float(specs.get("apparel_manual_quote_override")) > 0:
        suggested_price = float(specs.get("apparel_manual_quote_override"))

    prod_rate = _labor_rates(foundation)["production"]
    labor_minutes_pp = float(cfg.get("apparel_labor_minutes_per_piece", 1.5) or 1.5) + float(cfg.get("apparel_handling_labor_minutes_per_piece", 0.5) or 0.5)
    labor_hours = (labor_minutes_pp * qty) / 60.0
    labor_cost_total = labor_hours * prod_rate

    design_hours, design_cost = 0.0, 0.0
    if not artwork_ready and artwork_needed:
        design_hours = {"simple": 0.25, "medium": 0.5, "complex": 1.0, "extreme": 1.5}.get(complexity_key, 0.25)
        charge_separately, design_rate, included_minutes = _design_charge_config(foundation)
        if charge_separately != "no":
            billable_minutes = max(0.0, design_hours * 60 - included_minutes)
            design_cost = (billable_minutes / 60.0) * design_rate
        labor_hours += design_hours

    material_total = total_blank_cost + total_decoration_material_cost
    finishing_total = total_decoration_material_cost + plus_size_cost + custom_nn_cost + specialty_cost + two_tone_cost + patch_cost + bag_fold_cost
    overhead_cost = _calculate_overhead(material_total + labor_cost_total + design_cost, labor_hours, foundation, cfg)

    breakdown = {
        "materials": _nonzero_lines([((blank_material or {}).get("name") or brand_key or "Blank Garment", qty, "each", blank_cost_per_piece, total_blank_cost)]),
        "labor": _nonzero_lines([("Production / Pressing Labor", (labor_minutes_pp * qty) / 60.0, "hours", prod_rate, labor_cost_total)]),
        "design": _nonzero_lines([("Design / Artwork", design_hours, "hours", _labor_rates(foundation)["design"], design_cost)]),
        "setup": _nonzero_lines([("Apparel Setup Fee", 1, "job", setup_fee, setup_fee)]),
        "finishing": _nonzero_lines([
            (f"Decoration Consumable ({method_key})", qty, "each", decoration_material_per_piece, total_decoration_material_cost),
            ("Plus-Size Upcharge", plus_size_count, "piece", float(cfg.get("plus_size_upcharge_per_x", 2.0) or 0), plus_size_cost),
            ("Custom Name/Number", custom_nn_count, "piece", custom_nn_cost / custom_nn_count if custom_nn_count else 0, custom_nn_cost),
            ("Specialty Finish", qty, "piece", specialty_cost / qty if qty else 0, specialty_cost),
            ("Bag & Fold", qty, "piece", bag_fold_cost / qty if qty else 0, bag_fold_cost),
        ]),
    }

    return {
        "material_cost": total_blank_cost, "labor_cost": labor_cost_total - design_cost, "design_cost": design_cost,
        "setup_cost": setup_fee, "finishing_cost": finishing_total - total_decoration_material_cost, "hardware_cost": 0.0,
        "install_cost": 0.0, "outsourcing_cost": 0.0, "overhead_cost": overhead_cost,
        "selling_price": suggested_price, "minimum_charge": min_sell_per_piece * qty, "breakdown": breakdown, "warnings": warnings,
        "details": {"apparel_quantity": qty, "quantity_tier": tier_key, "baseline_source": baseline_source, "per_piece_sell": per_piece_sell},
    }


# ---------------------------------------------------------------------------
# Promo / Misc -- driver: unit cost. Custom -- manual / cost-plus.
# Faithful ports of legacy calculate_promotional / calculate_custom.
# ---------------------------------------------------------------------------

def _promo_misc(quantity, specs, foundation, cfg, method):
    material_cost_map = cfg.get("material_cost_map") or {}
    unit_cost = float(specs.get("unit_cost_minor")) / CENTS if specs.get("unit_cost_minor") is not None else float(material_cost_map.get(specs.get("promo_product_type", ""), 0) or 0)
    material_cost = unit_cost * quantity

    setup_fee = float(cfg.get("default_setup_fee", cfg.get("minimum_setup_fee", 0)) or 0) if specs.get("include_setup_fee") else 0.0
    labor_hours = float(cfg.get("default_labor_hours_per_unit", 0.05) or 0.05) * quantity
    prod_rate = _labor_rates(foundation)["production"]
    labor_cost = labor_hours * prod_rate

    pre_overhead_total = material_cost + labor_cost + setup_fee
    overhead_cost = _calculate_overhead(pre_overhead_total, labor_hours, foundation, cfg)

    markup_percent = specs.get("markup_percent")
    markup_multiplier = (1 + float(markup_percent) / 100.0) if markup_percent is not None else float(cfg.get("default_markup_multiplier", 2.5) or 2.5)
    suggested_price = _resolve_selling_price(pre_overhead_total + overhead_cost, markup_multiplier, float(cfg.get("target_profit_margin_percent", 40.0) or 40.0))

    minimum_charge = float(cfg.get("minimum_charge", foundation.get("minimum_order", 0)) or 0)
    suggested_price = max(suggested_price, minimum_charge)
    suggested_price = _apply_rush(suggested_price, specs.get("rush_order"), float(foundation.get("rush_fee_percentage", 0) or 0))

    breakdown = {
        "materials": _nonzero_lines([("Unit Cost", quantity, "each", unit_cost, material_cost)]),
        "labor": _nonzero_lines([("Handling Labor", labor_hours, "hours", prod_rate, labor_cost)]),
        "setup": _nonzero_lines([("Setup Fee", 1, "job", setup_fee, setup_fee)]),
    }
    return {
        "material_cost": material_cost, "labor_cost": labor_cost, "design_cost": 0.0, "setup_cost": setup_fee,
        "finishing_cost": 0.0, "hardware_cost": 0.0, "install_cost": 0.0, "outsourcing_cost": 0.0, "overhead_cost": overhead_cost,
        "selling_price": suggested_price, "minimum_charge": minimum_charge, "breakdown": breakdown, "warnings": [],
        "details": {"markup_multiplier": markup_multiplier},
    }


def _custom(quantity, specs, foundation, cfg, method):
    unit_material_cost = float(specs.get("unit_cost_minor")) / CENTS if specs.get("unit_cost_minor") is not None else 0.0
    material_cost = unit_material_cost * quantity

    prod_rate = _labor_rates(foundation)["production"]
    hourly_rate = float(specs.get("hourly_rate_override_minor")) / CENTS if specs.get("hourly_rate_override_minor") else prod_rate
    labor_hours = float(specs.get("estimated_hours")) if specs.get("estimated_hours") is not None else float(cfg.get("default_labor_hours_per_unit", 0.25) or 0.25) * quantity
    labor_cost = labor_hours * hourly_rate

    pre_overhead_total = material_cost + labor_cost
    overhead_cost = _calculate_overhead(pre_overhead_total, labor_hours, foundation, cfg)
    markup_percent = specs.get("markup_percent")
    markup_multiplier = (1 + float(markup_percent) / 100.0) if markup_percent is not None else float(cfg.get("default_markup_multiplier", 2.5) or 2.5)
    suggested_price = _resolve_selling_price(pre_overhead_total + overhead_cost, markup_multiplier, float(cfg.get("target_profit_margin_percent", 40.0) or 40.0))

    if specs.get("price_override") and specs.get("override_enabled"):
        suggested_price = float(specs.get("price_override")) * quantity

    minimum_charge = float(cfg.get("minimum_charge", foundation.get("minimum_order", 0)) or 0)
    suggested_price = max(suggested_price, minimum_charge)
    suggested_price = _apply_rush(suggested_price, specs.get("rush_order"), float(foundation.get("rush_fee_percentage", 0) or 0))

    breakdown = {
        "materials": _nonzero_lines([("Custom Item Material", quantity, "each", unit_material_cost, material_cost)]),
        "labor": _nonzero_lines([("Custom Labor", labor_hours, "hours", hourly_rate, labor_cost)]),
    }
    return {
        "material_cost": material_cost, "labor_cost": labor_cost, "design_cost": 0.0, "setup_cost": 0.0,
        "finishing_cost": 0.0, "hardware_cost": 0.0, "install_cost": 0.0, "outsourcing_cost": 0.0, "overhead_cost": overhead_cost,
        "selling_price": suggested_price, "minimum_charge": minimum_charge, "breakdown": breakdown, "warnings": [],
        "details": {"manual_description": specs.get("manual_description", "")},
    }


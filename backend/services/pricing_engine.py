"""Single source of truth for Order Item / Quote Line Item pricing math.

Legacy lesson applied here (see PRICING_LEGACY_ARCHITECTURE_MISTAKES_AND_PREVENTION.md
and PRICING_REFACTOR_PLAN.md): the calculator must read the tenant's saved Pricing
Foundation settings, never hardcoded module constants alone, and every category must
return one shared `PricingResult` contract (see models/pricing_core.py) even though the
underlying formula differs per category "driver":

  - banners / rigid_signs / cut_vinyl / digital_print -> driver: square footage
  - vehicle_wrap                                        -> driver: vehicle coverage %
  - services                                             -> driver: labor hours
  - apparel                                              -> driver: apparel quantity
  - promo_misc                                           -> driver: unit cost
  - custom                                               -> driver: manual entry

Each category also lets the tenant choose *how* they want that category priced
(a "calculation_method" stored in Pricing Foundation settings), because shop owners
think about their own pricing differently:
  - area categories:  "cost_plus" (materials+labor+overhead+markup) or "sell_rate_per_sqft"
  - vehicle_wrap:      "cost_plus" or "package_benchmark" (flat package price by coverage)
  - services:          "hourly" or "flat_fee"
  - apparel:           "cost_plus" or "price_table" (shop's own qty-tier price sheet)
  - promo_misc/custom: single method, no choice needed.
"""

from decimal import Decimal, ROUND_HALF_UP

try:
    from ..models.pricing_core import PricingResult
except ImportError:
    from models.pricing_core import PricingResult

MONEY = Decimal("100")

# Fallback COST data (per sqft) used by the "cost_plus" method when a tenant has not
# configured per-material costs of their own. sell_rate is a legacy fallback only used
# if the tenant has never configured `sell_rate_defaults.base_rate` at all.
MATERIALS = {
    "banners": {
        "banner_13oz": (Decimal("0.85"), Decimal("8.00")),
        "banner_18oz": (Decimal("1.25"), Decimal("10.00")),
        "banner_mesh": (Decimal("1.40"), Decimal("11.00")),
        "banner_blockout": (Decimal("1.65"), Decimal("12.00")),
        "banner_fabric": (Decimal("2.75"), Decimal("16.00")),
        "banner_custom": (Decimal("2.00"), Decimal("12.00")),
    },
    "rigid_signs": {
        "coroplast_4mm": (Decimal("0.90"), Decimal("10.00")),
        "pvc_3mm": (Decimal("2.25"), Decimal("16.00")),
        "acm_dibond_3mm": (Decimal("4.25"), Decimal("24.00")),
        "aluminum_040": (Decimal("3.25"), Decimal("18.00")),
        "acrylic_1_8": (Decimal("4.50"), Decimal("24.00")),
        "custom_other_substrate": (Decimal("4.00"), Decimal("20.00")),
    },
    "cut_vinyl": {
        "oracal_651": (Decimal("1.25"), Decimal("12.00")),
        "oracal_751": (Decimal("2.50"), Decimal("15.00")),
        "reflective_vinyl": (Decimal("4.50"), Decimal("22.00")),
        "wall_vinyl": (Decimal("2.50"), Decimal("15.00")),
        "specialty_custom_vinyl": (Decimal("4.50"), Decimal("24.00")),
    },
    "digital_print": {
        "printable_adhesive_vinyl": (Decimal("1.50"), Decimal("10.00")),
        "poster_paper": (Decimal("0.60"), Decimal("6.00")),
        "canvas": (Decimal("2.25"), Decimal("15.00")),
        "backlit_film": (Decimal("2.50"), Decimal("16.00")),
        "wall_graphic_media": (Decimal("2.25"), Decimal("14.00")),
        "specialty_print_media": (Decimal("2.00"), Decimal("12.00")),
    },
    "vehicle_wrap": {
        "wrap_standard_calendared": (Decimal("1.50"), Decimal("9.00")),
        "wrap_premium_cast": (Decimal("2.75"), Decimal("14.00")),
        "wrap_cast_film": (Decimal("3.50"), Decimal("18.00")),
        "wrap_reflective": (Decimal("5.00"), Decimal("24.00")),
        "wrap_specialty_media": (Decimal("4.00"), Decimal("20.00")),
    },
}

DEFAULTS = {
    "production_rate": Decimal("28.00"),
    "design_rate": Decimal("85.00"),
    "install_rate": Decimal("95.00"),
    "overhead_percent": Decimal("15"),
    "target_margin_percent": Decimal("35"),
}

AREA_FAMILY = {
    "banners": {"material_key": "banner_material_key", "min_area": Decimal("4.0"), "waste_percent": Decimal("8"), "markup": Decimal("2.35"), "minimum": Decimal("35.00"), "labor_per_sqft": Decimal("0.10")},
    "rigid_signs": {"material_key": "substrate_type_key", "min_area": Decimal("1.0"), "waste_percent": Decimal("5"), "markup": Decimal("2.45"), "minimum": Decimal("25.00"), "labor_per_sqft": Decimal("0.15")},
    "cut_vinyl": {"material_key": "vinyl_type_key", "min_area": Decimal("0.5"), "waste_percent": Decimal("10"), "markup": Decimal("2.30"), "minimum": Decimal("20.00"), "labor_per_sqft": Decimal("0.20")},
    "digital_print": {"material_key": "print_media_key", "min_area": Decimal("1.0"), "waste_percent": Decimal("10"), "markup": Decimal("2.30"), "minimum": Decimal("20.00"), "labor_per_sqft": Decimal("0.08")},
}

# The Pricing Setup Quiz (frontend) historically named a couple of categories
# differently than the Order/Quote item category enum. Normalize here so both
# sides of the app read/write the same tenant settings (legacy mistake M-0x:
# "vehicle_graphics" in the frontend vs "vehicle_wraps" in the backend).
FOUNDATION_CATEGORY_ALIASES = {"vehicle_wrap": "vehicle_graphics", "promo_misc": "promotional"}

CALCULATION_METHODS = {
    "banners": ("cost_plus", "sell_rate_per_sqft"),
    "rigid_signs": ("cost_plus", "sell_rate_per_sqft"),
    "cut_vinyl": ("cost_plus", "sell_rate_per_sqft"),
    "digital_print": ("cost_plus", "sell_rate_per_sqft"),
    "vehicle_wrap": ("cost_plus", "package_benchmark"),
    "services": ("hourly", "flat_fee"),
    "apparel": ("cost_plus", "price_table"),
    "promo_misc": ("cost_plus_markup",),
    "custom": ("manual",),
}
DEFAULT_METHOD = {
    "banners": "sell_rate_per_sqft", "rigid_signs": "sell_rate_per_sqft", "cut_vinyl": "sell_rate_per_sqft", "digital_print": "sell_rate_per_sqft",
    "vehicle_wrap": "package_benchmark", "services": "hourly", "apparel": "price_table", "promo_misc": "cost_plus_markup", "custom": "manual",
}


def calculate_item_price(category: str, quantity: int, specs: dict, foundation: dict | None = None) -> dict:
    quantity = max(int(quantity or 1), 1)
    foundation = foundation or {}
    cat_defaults = _category_defaults(foundation, category)
    method = _calculation_method(cat_defaults, category)

    if category in AREA_FAMILY:
        result = _area_family(category, quantity, specs, foundation, cat_defaults, method)
    elif category == "vehicle_wrap":
        result = _vehicle_wrap(quantity, specs, foundation, cat_defaults, method)
    elif category == "services":
        result = _services(quantity, specs, foundation, cat_defaults, method)
    elif category == "apparel":
        result = _apparel(quantity, specs, foundation, cat_defaults, method)
    elif category == "promo_misc":
        result = _promo_misc(quantity, specs, foundation, cat_defaults)
    else:
        result = _custom(quantity, specs)

    result["category"] = category
    result["calculation_method"] = method
    result["quantity"] = quantity
    result["warnings"] = _warnings(result, foundation)
    return PricingResult(**result).model_dump(mode="json")


# ---------------------------------------------------------------------------
# Foundation settings lookup helpers
# ---------------------------------------------------------------------------

def _category_defaults(foundation: dict, category: str) -> dict:
    key = FOUNDATION_CATEGORY_ALIASES.get(category, category)
    return (foundation.get("category_defaults") or {}).get(key) or {}


def _calculation_method(cat_defaults: dict, category: str) -> str:
    allowed = CALCULATION_METHODS.get(category, ("cost_plus",))
    method = cat_defaults.get("calculation_method")
    return method if method in allowed else DEFAULT_METHOD.get(category, allowed[0])


def _shop_rate(foundation: dict, key: str, fallback: Decimal) -> Decimal:
    value = foundation.get(key)
    return _dec(value) if value not in (None, "") else fallback


def _dec(value, fallback: Decimal = Decimal("0")) -> Decimal:
    try:
        return Decimal(str(value)) if value not in (None, "") else fallback
    except Exception:
        return fallback


# ---------------------------------------------------------------------------
# Area family: banners / rigid_signs / cut_vinyl / digital_print
# ---------------------------------------------------------------------------

def _area_family(category, quantity, specs, foundation, cat_defaults, method):
    config = AREA_FAMILY[category]
    area = _area(specs)
    billable_area = max(area, _dec(cat_defaults.get("minimum_billable_area_sqft"), config["min_area"]))
    waste_percent = _dec(cat_defaults.get("waste_percent"), config["waste_percent"])
    total_area = billable_area * Decimal(quantity)
    waste_area = total_area * (Decimal("1") + waste_percent / Decimal("100"))

    material_cost_rate, sell_rate_fallback = MATERIALS[category].get(specs.get(config["material_key"]), next(iter(MATERIALS[category].values())))
    material_cost = waste_area * material_cost_rate

    production_rate = _shop_rate(foundation, "production_hourly_rate", DEFAULTS["production_rate"])
    design_rate = _shop_rate(foundation, "design_hourly_rate", DEFAULTS["design_rate"])
    install_rate = _shop_rate(foundation, "install_hourly_rate", DEFAULTS["install_rate"])
    production_hours = max(total_area * config["labor_per_sqft"], Decimal("0.2"))
    design_hours = Decimal("0.5") * _complexity(specs.get("design_complexity", "simple")) if specs.get("artwork_needed") else Decimal("0")
    install_hours = total_area * Decimal("0.08") if specs.get("install_required") else Decimal("0")
    production_labor = production_hours * production_rate
    labor_cost = production_labor + design_hours * design_rate + install_hours * install_rate

    overhead_percent = _dec(cat_defaults.get("overhead_percent") or foundation.get("overhead_percent"), DEFAULTS["overhead_percent"])
    overhead_cost = (material_cost + production_labor) * overhead_percent / Decimal("100")

    breakdown = {
        "materials": [_line(specs.get(config["material_key"], "material"), waste_area, "sqft", material_cost_rate, material_cost)],
        "labor": [_line("Production", production_hours, "hr", production_rate, production_labor)]
        + ([_line("Design", design_hours, "hr", design_rate, design_hours * design_rate)] if design_hours else [])
        + ([_line("Install", install_hours, "hr", install_rate, install_hours * install_rate)] if install_hours else []),
        "overhead": [_line("Shop overhead", overhead_percent, "%", Decimal("0"), overhead_cost)],
    }

    total_cost = material_cost + labor_cost + overhead_cost
    if method == "sell_rate_per_sqft":
        sell_rate = _dec((cat_defaults.get("sell_rate_defaults") or {}).get("base_rate"), sell_rate_fallback)
        selling = waste_area * sell_rate
        markup_amount = Decimal("0")
    else:
        markup_multiplier = _dec(cat_defaults.get("default_markup_multiplier"), config["markup"])
        selling = total_cost * markup_multiplier
        markup_amount = selling - total_cost

    minimum_sell = _dec(cat_defaults.get("default_minimum_sell_price"), config["minimum"])
    selling = max(selling, minimum_sell)
    discount = _quantity_discount(category, quantity)
    selling = selling * (Decimal("1") - discount)

    return {
        "selling_price_minor": _minor(selling), "material_cost_minor": _minor(material_cost),
        "labor_cost_minor": _minor(labor_cost), "overhead_cost_minor": _minor(overhead_cost),
        "markup_amount_minor": _minor(markup_amount), "total_cost_minor": _minor(total_cost),
        "breakdown": breakdown,
        "details": {"area_sqft": float(area), "billable_area_sqft": float(billable_area), "waste_area_sqft": float(waste_area), "quantity_discount_percent": float(discount * 100)},
    }


# ---------------------------------------------------------------------------
# Vehicle wrap: driver = coverage % of vehicle
# ---------------------------------------------------------------------------

VEHICLE_BASE_SQFT = {"sedan": 150, "suv": 200, "pickup": 175, "cargo_van": 250, "sprinter_van": 350, "box_truck_16": 500, "trailer": 450, "semi": 800}
COVERAGE_PERCENT = {"spot": Decimal("0.15"), "partial": Decimal("0.40"), "half": Decimal("0.55"), "full": Decimal("1.0")}
COVERAGE_BENCHMARK_FIELD = {"spot": "package_spot_graphics", "partial": "package_partial_wrap", "half": "package_partial_wrap", "full": "package_full_wrap"}


def _vehicle_wrap(quantity, specs, foundation, cat_defaults, method):
    base_sqft = VEHICLE_BASE_SQFT.get(specs.get("vehicle_type"), 160)
    coverage = COVERAGE_PERCENT.get(specs.get("coverage_type"), _dec(specs.get("custom_coverage_percent"), Decimal("40")) / Decimal("100"))
    wrap_sqft = Decimal(base_sqft) * coverage
    waste_area = wrap_sqft * Decimal("1.12")

    material_cost_rate, _ = MATERIALS["vehicle_wrap"].get(specs.get("wrap_material_key"), MATERIALS["vehicle_wrap"]["wrap_premium_cast"])
    material_cost = waste_area * material_cost_rate

    production_rate = _shop_rate(foundation, "production_hourly_rate", DEFAULTS["production_rate"])
    design_rate = _shop_rate(foundation, "design_hourly_rate", DEFAULTS["design_rate"])
    install_rate = _shop_rate(foundation, "install_hourly_rate", DEFAULTS["install_rate"])
    production_hours = max(wrap_sqft * Decimal("0.12"), Decimal("1.0"))
    design_hours = Decimal("1.5") * _complexity(specs.get("design_complexity", "medium")) if specs.get("artwork_needed", True) else Decimal("0")
    install_hours = Decimal("5.0") * _complexity(specs.get("install_difficulty_level", "medium")) if specs.get("install_required", True) else Decimal("0")
    production_labor = production_hours * production_rate
    labor_cost = production_labor + design_hours * design_rate + install_hours * install_rate

    overhead_percent = _dec(cat_defaults.get("overhead_percent") or foundation.get("overhead_percent"), DEFAULTS["overhead_percent"])
    overhead_cost = (material_cost + production_labor) * overhead_percent / Decimal("100")
    total_cost = material_cost + labor_cost + overhead_cost

    breakdown = {
        "materials": [_line(specs.get("wrap_material_key", "wrap material"), waste_area, "sqft", material_cost_rate, material_cost)],
        "labor": [_line("Production", production_hours, "hr", production_rate, production_labor)]
        + ([_line("Design", design_hours, "hr", design_rate, design_hours * design_rate)] if design_hours else [])
        + ([_line("Install", install_hours, "hr", install_rate, install_hours * install_rate)] if install_hours else []),
        "overhead": [_line("Shop overhead", overhead_percent, "%", Decimal("0"), overhead_cost)],
    }

    if method == "package_benchmark":
        benchmark_field = COVERAGE_BENCHMARK_FIELD.get(specs.get("coverage_type"), "package_partial_wrap")
        selling = _dec((cat_defaults.get("benchmarks") or {}).get(benchmark_field), total_cost * Decimal("2.4"))
        markup_amount = selling - total_cost
    else:
        markup_multiplier = _dec(cat_defaults.get("default_markup_multiplier"), Decimal("2.4"))
        selling = total_cost * markup_multiplier
        markup_amount = selling - total_cost

    minimum_sell = _dec(cat_defaults.get("default_minimum_sell_price"), Decimal("150"))
    selling = max(selling, minimum_sell) * Decimal(quantity)

    return {
        "selling_price_minor": _minor(selling), "material_cost_minor": _minor(material_cost),
        "labor_cost_minor": _minor(labor_cost), "overhead_cost_minor": _minor(overhead_cost),
        "markup_amount_minor": _minor(markup_amount), "total_cost_minor": _minor(total_cost),
        "breakdown": breakdown, "details": {"wrap_sqft": float(wrap_sqft), "coverage_percent": float(coverage * 100)},
    }


# ---------------------------------------------------------------------------
# Services: driver = labor hours
# ---------------------------------------------------------------------------

def _services(quantity, specs, foundation, cat_defaults, method):
    labor_role = specs.get("services_labor_role", "production")
    rate_overrides = cat_defaults.get("labor_rate_overrides") or {}
    role_rate_fallback = {"design": foundation.get("design_hourly_rate"), "install": foundation.get("install_hourly_rate")}.get(labor_role, foundation.get("production_hourly_rate"))
    rate = _dec(specs.get("hourly_rate_override_minor")) / MONEY if specs.get("hourly_rate_override_minor") else _dec(rate_overrides.get(labor_role), _dec(role_rate_fallback, DEFAULTS["production_rate"]))
    minimums = cat_defaults.get("minimums") or {}
    minimum_charge = _dec(specs.get("services_minimum_override")) / MONEY if specs.get("services_minimum_override") else _dec(minimums.get(labor_role), Decimal("60.00"))

    if method == "flat_fee":
        flat_fee = _dec(specs.get("flat_fee_minor")) / MONEY
        selling = max(flat_fee, minimum_charge) * Decimal(quantity)
        hours = Decimal("0")
        labor_cost = Decimal("0")
        breakdown = {"labor": [_line("Flat fee", 1, "flat", flat_fee, flat_fee)]}
    else:
        hours = _dec(specs.get("estimated_hours"), Decimal("1")) * _dec(specs.get("num_workers"), Decimal("1"))
        labor_cost = hours * rate
        selling = max(labor_cost, minimum_charge) * Decimal(quantity)
        breakdown = {"labor": [_line(f"{labor_role} labor", hours, "hr", rate, labor_cost)]}

    return {
        "selling_price_minor": _minor(selling), "material_cost_minor": 0, "labor_cost_minor": _minor(labor_cost),
        "overhead_cost_minor": 0, "markup_amount_minor": 0, "total_cost_minor": _minor(labor_cost),
        "breakdown": breakdown, "details": {"hours": float(hours), "labor_role": labor_role},
    }


# ---------------------------------------------------------------------------
# Apparel: driver = apparel quantity (size breakdown)
# ---------------------------------------------------------------------------

APPAREL_PRODUCT_TABLE_KEY = {"short_sleeve_tee": "tee_one_side", "hoodie": "hoodie_one_side", "polo": "tee_one_side", "standard_cap": "tee_one_side", "premium_cap": "tee_one_side"}


def _apparel(quantity, specs, foundation, cat_defaults, method):
    qty = sum(int(specs.get(f"size_{size}", 0) or 0) for size in ["xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl", "5xl"]) or quantity
    blank_cost = _dec(cat_defaults.get("default_blank_cost"), Decimal("7.00")) if not specs.get("customer_supplied") else Decimal("0")
    decoration_cost = _dec(cat_defaults.get("default_decoration_cost"), Decimal("5.00"))
    material_cost = blank_cost * Decimal(qty)
    labor_cost = decoration_cost * Decimal(qty) + Decimal("10.00")

    price_table = cat_defaults.get("shop_pricing_table") or {}
    table_key = APPAREL_PRODUCT_TABLE_KEY.get(specs.get("apparel_product_type"), "tee_one_side")
    tiers = price_table.get(table_key) or {}

    if method == "price_table" and tiers:
        best_tier_price = None
        best_tier_qty = -1
        for tier_key, tier_price in tiers.items():
            tier_qty = int(str(tier_key).replace("qty_", "") or 0)
            if qty >= tier_qty and tier_qty > best_tier_qty:
                best_tier_qty, best_tier_price = tier_qty, tier_price
        per_unit = _dec(best_tier_price, next(iter(tiers.values()), Decimal("18.00")))
        selling = per_unit * Decimal(qty)
        markup_amount = Decimal("0")
        breakdown = {"materials": [_line("Blanks", qty, "each", blank_cost, material_cost)], "labor": [_line("Decoration + setup", qty, "each", decoration_cost, labor_cost)]}
    else:
        markup_multiplier = _dec(cat_defaults.get("default_markup_multiplier"), Decimal("2.15"))
        cost = material_cost + labor_cost
        selling = max(cost * markup_multiplier, Decimal("60.00"))
        markup_amount = selling - cost
        breakdown = {"materials": [_line("Blanks", qty, "each", blank_cost, material_cost)], "labor": [_line("Decoration + setup", qty, "each", decoration_cost, labor_cost)]}

    total_cost = material_cost + labor_cost
    return {
        "selling_price_minor": _minor(selling), "material_cost_minor": _minor(material_cost),
        "labor_cost_minor": _minor(labor_cost), "overhead_cost_minor": 0,
        "markup_amount_minor": _minor(markup_amount), "total_cost_minor": _minor(total_cost),
        "breakdown": breakdown, "details": {"apparel_quantity": qty, "price_table_key": table_key},
    }


# ---------------------------------------------------------------------------
# Promo / Misc: driver = unit cost. Custom: driver = manual entry.
# ---------------------------------------------------------------------------

def _promo_misc(quantity, specs, foundation, cat_defaults):
    unit_cost = _dec(specs.get("unit_cost_minor")) / MONEY
    markup = _dec(specs.get("markup_multiplier"), _dec(cat_defaults.get("default_markup_multiplier"), Decimal("2.5")))
    setup_fee = _dec(cat_defaults.get("minimum_setup_fee"), Decimal("0"))
    minimum_charge = _dec(cat_defaults.get("minimum_charge"), Decimal("0"))
    material_cost = unit_cost * Decimal(quantity)
    selling = max(material_cost * markup + setup_fee, minimum_charge)
    return {
        "selling_price_minor": _minor(selling), "material_cost_minor": _minor(material_cost), "labor_cost_minor": 0,
        "overhead_cost_minor": 0, "markup_amount_minor": _minor(selling - material_cost), "total_cost_minor": _minor(material_cost),
        "breakdown": {"materials": [_line("Unit cost", quantity, "each", unit_cost, material_cost)]},
        "details": {"markup_multiplier": float(markup), "setup_fee_minor": _minor(setup_fee)},
    }


def _custom(quantity, specs):
    unit_price = _dec(specs.get("unit_price_minor")) / MONEY
    selling = unit_price * Decimal(quantity)
    return {
        "selling_price_minor": _minor(selling), "material_cost_minor": 0, "labor_cost_minor": 0,
        "overhead_cost_minor": 0, "markup_amount_minor": 0, "total_cost_minor": 0,
        "breakdown": {}, "details": {"manual_description": specs.get("manual_description", "")},
    }


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _warnings(result: dict, foundation: dict) -> list[dict]:
    warnings = []
    total_cost = result.get("total_cost_minor", 0)
    selling = result.get("selling_price_minor", 0)
    if total_cost and selling < total_cost:
        warnings.append({"code": "below_cost", "severity": "critical", "message": f"Selling price (${selling / 100:.2f}) is below total cost (${total_cost / 100:.2f})."})
    elif selling:
        margin_percent = (selling - total_cost) / selling * 100
        target_margin = float(foundation.get("target_profit_margin_percent") or 35)
        if margin_percent < target_margin:
            warnings.append({"code": "below_margin", "severity": "warning", "message": f"Margin ({margin_percent:.1f}%) is below your target of {target_margin:.0f}%."})
    return warnings


def _area(specs):
    width = _dec(specs.get("width"))
    height = _dec(specs.get("height"))
    if specs.get("unit_of_measure", "inches") == "feet":
        return width * height
    return (width * height) / Decimal("144")


def _complexity(value):
    return {"simple": Decimal("1.0"), "medium": Decimal("1.25"), "complex": Decimal("1.5"), "extreme": Decimal("2.0"), "difficult": Decimal("1.5"), "high_risk": Decimal("2.0")}.get(str(value), Decimal("1.0"))


def _quantity_discount(category, quantity):
    if category == "banners":
        return Decimal("0.15") if quantity >= 25 else Decimal("0.10") if quantity >= 10 else Decimal("0.05") if quantity >= 3 else Decimal("0")
    return Decimal("0.15") if quantity >= 100 else Decimal("0.10") if quantity >= 25 else Decimal("0.05") if quantity >= 5 else Decimal("0")


def _minor(value: Decimal) -> int:
    return int((value * MONEY).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def _line(name, quantity, unit, unit_cost: Decimal, total_cost: Decimal) -> dict:
    return {"name": str(name or ""), "quantity": float(quantity), "unit": unit, "unit_cost_minor": _minor(unit_cost), "total_cost_minor": _minor(total_cost)}

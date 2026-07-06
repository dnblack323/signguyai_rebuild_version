def field(key, label, field_type, options=None, affects_price=False):
    return {
        "key": key,
        "label": label,
        "type": field_type,
        "options": options or [],
        "affects_price": affects_price,
    }


CATEGORY_SCHEMAS = {
    "rigid_signs": [
        field("width", "Width", "number", affects_price=True),
        field("height", "Height", "number", affects_price=True),
        field("unit_of_measure", "Unit of Measure", "select", ["inches", "feet"], True),
        field("substrate_type_key", "Substrate Type", "select", ["coroplast_4mm", "pvc_3mm", "acm_dibond_3mm", "aluminum_040", "acrylic_1_8", "custom_other_substrate"], True),
        field("graphic_method", "Graphic Method", "select", ["direct_print", "mounted_print", "cut_vinyl_applied"], True),
        field("sidedness", "Single or Double Sided", "select", ["single", "double_same_art", "double_diff_art"], True),
        field("artwork_needed", "Artwork Needed", "toggle", affects_price=True),
        field("design_complexity", "Design Complexity", "select", ["simple", "medium", "complex", "extreme"], True),
        field("install_required", "Install Required", "toggle", affects_price=True),
    ],
    "banners": [
        field("width", "Width", "number", affects_price=True),
        field("height", "Height", "number", affects_price=True),
        field("unit_of_measure", "Unit of Measure", "select", ["feet", "inches"], True),
        field("banner_material_key", "Banner Material Type", "select", ["banner_13oz", "banner_18oz", "banner_mesh", "banner_blockout", "banner_fabric", "banner_custom"], True),
        field("banner_double_sided", "Double-Sided?", "select", ["single", "same_both_sides", "different_sides"], True),
        field("banner_hems", "Hems", "select", ["none", "standard", "reinforced"], True),
        field("banner_grommets", "Grommets", "select", ["none", "corners_only", "every_2ft", "every_3ft", "custom_count"], True),
        field("artwork_needed", "Artwork Needed", "toggle", affects_price=True),
        field("install_required", "Install Required", "toggle", affects_price=True),
    ],
    "cut_vinyl": [
        field("width", "Width", "number", affects_price=True),
        field("height", "Height", "number", affects_price=True),
        field("unit_of_measure", "Unit of Measure", "select", ["inches", "feet"], True),
        field("vinyl_type_key", "Vinyl Type", "select", ["oracal_651", "oracal_751", "reflective_vinyl", "wall_vinyl", "specialty_custom_vinyl"], True),
        field("num_colors", "Number of Colors", "select", ["1", "2", "3", "4+"], True),
        field("weeding_complexity", "Weeding Complexity", "select", ["simple", "medium", "complex", "extreme"], True),
        field("masking_required", "Masking Required", "toggle", affects_price=True),
    ],
    "digital_print": [
        field("width", "Width", "number", affects_price=True),
        field("height", "Height", "number", affects_price=True),
        field("unit_of_measure", "Unit of Measure", "select", ["inches", "feet"], True),
        field("print_media_key", "Print Media Type", "select", ["printable_adhesive_vinyl", "poster_paper", "canvas", "backlit_film", "wall_graphic_media", "specialty_print_media"], True),
        field("print_quality_mode", "Print Quality", "select", ["draft", "standard", "high", "photo"], True),
        field("laminate", "Laminate Required", "toggle", affects_price=True),
        field("install_required", "Install Required", "toggle", affects_price=True),
    ],
    "vehicle_wrap": [
        field("vehicle_type", "Vehicle Type", "select", ["sedan", "suv", "pickup", "cargo_van", "sprinter_van", "box_truck_16", "trailer", "semi", "other"], True),
        field("coverage_type", "Coverage Type", "select", ["spot", "partial", "half", "full", "custom"], True),
        field("custom_coverage_percent", "Custom Coverage %", "number", affects_price=True),
        field("wrap_material_key", "Wrap Material", "select", ["wrap_standard_calendared", "wrap_premium_cast", "wrap_cast_film", "wrap_reflective", "wrap_specialty_media"], True),
        field("wrap_laminate_required", "Laminate Required", "toggle", affects_price=True),
        field("artwork_needed", "Artwork Needed", "toggle", affects_price=True),
        field("install_required", "Install Required", "toggle", affects_price=True),
    ],
    "apparel": [
        field("apparel_product_type", "Product Type", "select", ["short_sleeve_tee", "hoodie", "polo", "standard_cap", "premium_cap"], True),
        field("apparel_brand_style_key", "Brand / Style", "select", ["blank_ss_gildan_5000", "blank_ss_bella_3001", "blank_hd_gildan_18500", "blank_hat_standard"], True),
        field("apparel_decoration_method", "Decoration Method", "select", ["htv", "screen_print_transfer", "dtf_transfer", "embroidery", "dtg", "patch"], True),
        field("size_s", "Small Qty", "number", affects_price=True),
        field("size_m", "Medium Qty", "number", affects_price=True),
        field("size_l", "Large Qty", "number", affects_price=True),
        field("size_xl", "XL Qty", "number", affects_price=True),
    ],
    "services": [
        field("service_type", "Service Type", "text", affects_price=True),
        field("services_billing_unit", "Billing Unit", "select", ["hour", "flat_fee", "piece", "sqft", "linear_ft", "mile", "trip", "day"], True),
        field("services_labor_role", "Labor Role", "select", ["production", "design", "install", "consultation", "site_survey", "other"], True),
        field("estimated_hours", "Estimated Hours", "number", affects_price=True),
        field("num_workers", "Number of Workers", "number", affects_price=True),
        field("flat_fee_minor", "Flat Fee (cents, used when Foundation method is Flat Fee)", "number", affects_price=True),
    ],
    "promo_misc": [
        field("unit_cost_minor", "Unit Cost Minor", "number", affects_price=True),
        field("markup_multiplier", "Markup Multiplier", "number", affects_price=True),
    ],
    "custom": [
        field("unit_price_minor", "Unit Price Minor", "number", affects_price=True),
        field("manual_description", "Manual Description", "textarea"),
    ],
}
def category_schema(category: str) -> dict:
    return {"category": category, "fields": CATEGORY_SCHEMAS.get(category, CATEGORY_SCHEMAS["custom"])}

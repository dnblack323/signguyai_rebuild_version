SUBSCRIPTION_PRODUCTS = [
    {
        "product_id": "prod_core_os",
        "name": "SignGuy Core Standalone",
        "module_key": "core",
        "billing_interval": "month",
        "founders_price_minor": 9900,
        "general_availability_price_minor": 14900,
        "founders_monthly_credits": 300,
        "general_availability_monthly_credits": 300,
    },
    {
        "product_id": "prod_webstore_standalone",
        "name": "Web Stores Standalone",
        "module_key": "webstores",
        "billing_interval": "month",
        "founders_price_minor": 5900,
        "general_availability_price_minor": 8900,
        "founders_monthly_credits": 200,
        "general_availability_monthly_credits": 300,
    },
    {
        "product_id": "prod_wrap_standalone",
        "name": "Wrap Command Center Standalone",
        "module_key": "wrap",
        "billing_interval": "month",
        "founders_price_minor": 7900,
        "general_availability_price_minor": 11900,
        "founders_monthly_credits": 350,
        "general_availability_monthly_credits": 500,
    },
    {
        "product_id": "prod_complete_bundle",
        "name": "The Complete Bundle",
        "module_key": "complete_bundle",
        "billing_interval": "month",
        "founders_price_minor": 18900,
        "general_availability_price_minor": 27900,
        "founders_monthly_credits": 1000,
        "general_availability_monthly_credits": 1000,
    },
]

CREDIT_TOP_UP_PRODUCTS = [
    {"product_id": "prod_topup_100", "name": "AI Quick Fix Pack", "purchase_type": "one_time", "price_minor": 1900, "credits": 100},
    {"product_id": "prod_topup_300", "name": "AI Growth Boost Pack", "purchase_type": "one_time", "price_minor": 4500, "credits": 300},
    {"product_id": "prod_topup_800", "name": "AI Power Pack", "purchase_type": "one_time", "price_minor": 9900, "credits": 800},
]

FOUNDERS_PROMO = {
    "code": "FOUNDERS3MO",
    "coupon_id": "founders_launch_coupon",
    "max_redemptions": 25,
    "duration_months": 3,
    "fee_holiday_months": 3,
    "discounts_minor": {
        "prod_core_os": 4000,
        "prod_webstore_standalone": 2000,
        "prod_wrap_standalone": 3000,
        "prod_complete_bundle": 7000,
    },
}

TRANSACTION_FEE_BASIS_POINTS = {
    "promo_active": {"standard": 0, "webstore": 0},
    "founders": {"standard": 50, "webstore": 150},
    "general_availability": {"standard": 100, "webstore": 200},
}


def billing_catalog() -> dict:
    return {
        "subscription_products": SUBSCRIPTION_PRODUCTS,
        "credit_top_up_products": CREDIT_TOP_UP_PRODUCTS,
        "founders_promo": FOUNDERS_PROMO,
        "transaction_fee_basis_points": TRANSACTION_FEE_BASIS_POINTS,
    }


def calculate_monthly_credit_bank(product_ids: list[str], phase: str) -> int:
    if "prod_complete_bundle" in product_ids:
        return 1000
    phase_key = "founders_monthly_credits" if phase == "founders" else "general_availability_monthly_credits"
    products = {product["product_id"]: product for product in SUBSCRIPTION_PRODUCTS}
    return sum(int(products[product_id][phase_key]) for product_id in product_ids if product_id in products)


def determine_transaction_fee_basis_points(
    *,
    phase: str,
    checkout_channel: str,
    shop_onboarded_index: int,
    has_redeemed_promo_code: bool,
    months_since_promo_applied: int,
) -> tuple[int, str]:
    normalized_channel = "webstore" if checkout_channel == "webstore" else "standard"
    if shop_onboarded_index > 50 or phase == "general_availability":
        return TRANSACTION_FEE_BASIS_POINTS["general_availability"][normalized_channel], "general_availability_rate"
    if has_redeemed_promo_code and months_since_promo_applied < FOUNDERS_PROMO["fee_holiday_months"]:
        return TRANSACTION_FEE_BASIS_POINTS["promo_active"][normalized_channel], "founders_promo_fee_holiday"
    return TRANSACTION_FEE_BASIS_POINTS["founders"][normalized_channel], "founders_baseline_rate"


def product_entitlement_defaults(product_ids: list[str]) -> dict[str, bool]:
    product_set = set(product_ids)
    complete = "prod_complete_bundle" in product_set
    return {
        "core": complete or "prod_core_os" in product_set,
        "webstores": complete or "prod_webstore_standalone" in product_set,
        "wrap": complete or "prod_wrap_standalone" in product_set,
    }

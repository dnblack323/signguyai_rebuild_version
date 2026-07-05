try:
    from ..models.webstores import LaunchCheck, WebstoreCapabilities, WebstoreLaunchReadiness
except ImportError:
    from models.webstores import LaunchCheck, WebstoreCapabilities, WebstoreLaunchReadiness


def get_webstore_capabilities(product_mode: str = "full_app", entitlement: dict | None = None) -> WebstoreCapabilities:
    """Return tenant entitlement read model without changing store records."""
    normalized_mode = "standalone" if product_mode == "standalone" else "full_app"
    status = (entitlement or {}).get("status", "preview")
    enabled = status in {"enabled", "trial"}
    return WebstoreCapabilities(
        product_mode=normalized_mode,
        management_available=enabled or status == "preview",
        publishing_enabled=enabled,
        cart_checkout_enabled=enabled,
        entitlement_status=status,
    )


def get_launch_readiness() -> WebstoreLaunchReadiness:
    checks = [
        LaunchCheck(key="store_setup", label="Store setup complete", passed=True),
        LaunchCheck(key="products_priced", label="Store-specific products priced", passed=True),
        LaunchCheck(key="owner_approved", label="Owner approved preview", passed=False),
        LaunchCheck(key="terms_accepted", label="Owner accepted terms and fee summary", passed=False),
        LaunchCheck(key="stripe_details", label="Stripe details submitted", passed=False),
        LaunchCheck(key="stripe_capabilities", label="Card payments and transfers active", passed=False),
    ]
    return WebstoreLaunchReadiness(
        can_publish=all(check.passed for check in checks),
        can_checkout=False,
        checks=checks,
    )

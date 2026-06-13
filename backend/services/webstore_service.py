try:
    from ..models.webstores import WebstoreCapabilities
except ImportError:
    from models.webstores import WebstoreCapabilities


def get_webstore_capabilities(product_mode: str = "full_app") -> WebstoreCapabilities:
    """Return tenant entitlement read model without changing store records."""
    normalized_mode = "standalone" if product_mode == "standalone" else "full_app"
    return WebstoreCapabilities(product_mode=normalized_mode)

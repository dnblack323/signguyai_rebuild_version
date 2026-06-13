from pydantic import BaseModel


class WebstoreCapabilities(BaseModel):
    management_available: bool = True
    publishing_enabled: bool = False
    cart_checkout_enabled: bool = False
    standalone_available: bool = True
    product_mode: str = "full_app"

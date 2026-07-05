from typing import Any, Literal

from pydantic import Field

try:
    from .base import PreviewEnvelope, TenantDocument
except ImportError:
    from models.base import PreviewEnvelope, TenantDocument


BillingPhase = Literal["founders", "general_availability"]
CheckoutChannel = Literal["standard", "webstore"]
FeatureEntitlementStatus = Literal["enabled", "disabled", "trial", "suspended"]


class FeatureEntitlementPayload(PreviewEnvelope):
    feature_key: str = ""
    status: FeatureEntitlementStatus = "enabled"
    source_product_id: str = ""
    mode: str = "full_app"
    metadata: dict[str, Any] = Field(default_factory=dict)


class FeatureEntitlementDocument(FeatureEntitlementPayload, TenantDocument):
    updated_by: str = ""


class FeatureEntitlementListResponse(PreviewEnvelope):
    entitlements: list[dict[str, Any]] = Field(default_factory=list)
    total: int = 0


class CreditBankRequest(PreviewEnvelope):
    product_ids: list[str] = Field(default_factory=list)
    phase: BillingPhase = "general_availability"


class CreditBankResponse(PreviewEnvelope):
    monthly_credits: int
    product_ids: list[str]
    phase: BillingPhase


class PlatformFeeRequest(PreviewEnvelope):
    phase: BillingPhase = "general_availability"
    checkout_channel: CheckoutChannel = "standard"
    shop_onboarded_index: int = 51
    has_redeemed_promo_code: bool = False
    months_since_promo_applied: int = 999


class PlatformFeeResponse(PreviewEnvelope):
    basis_points: int
    rate: float
    reason: str

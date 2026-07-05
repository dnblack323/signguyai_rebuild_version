from typing import Literal

from pydantic import BaseModel

WebstoreProductMode = Literal["full_app", "standalone"]
WebstoreType = Literal["b2b", "fundraiser", "event", "promotional", "employee", "general"]
WebstoreStatus = Literal[
    "draft",
    "questionnaire_sent",
    "questionnaire_received",
    "setup_in_progress",
    "owner_review_pending",
    "changes_requested",
    "stripe_onboarding_pending",
    "ready_to_launch",
    "live",
    "paused",
    "closed",
    "archived",
    "cancelled",
]


class WebstoreCapabilities(BaseModel):
    management_available: bool = True
    publishing_enabled: bool = False
    cart_checkout_enabled: bool = False
    standalone_available: bool = True
    product_mode: WebstoreProductMode = "full_app"
    standalone_platform_fee_basis_points: int = 150
    direct_stripe_owner_payout: bool = True
    draft_preview_available: bool = True
    entitlement_status: str = "preview"


class LaunchCheck(BaseModel):
    key: str
    label: str
    passed: bool


class WebstoreLaunchReadiness(BaseModel):
    can_publish: bool
    can_checkout: bool
    checks: list[LaunchCheck]

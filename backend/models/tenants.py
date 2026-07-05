from typing import Any

from pydantic import Field

try:
    from .base import PreviewEnvelope
    from .platform_admin import TenantAccountStatus, TenantBillingStatus
except ImportError:
    from models.base import PreviewEnvelope
    from models.platform_admin import TenantAccountStatus, TenantBillingStatus


class TenantProfilePayload(PreviewEnvelope):
    name: str = ""
    owner_email: str = ""
    phone: str = ""
    website: str = ""
    address: str = ""
    city: str = ""
    state: str = ""
    zip_code: str = ""
    country: str = "US"
    default_tax_rate: float = 0
    branding_settings: dict[str, Any] = Field(default_factory=dict)
    signature_settings: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)


class TenantProfilePatch(PreviewEnvelope):
    name: str | None = None
    owner_email: str | None = None
    phone: str | None = None
    website: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None
    country: str | None = None
    default_tax_rate: float | None = None
    branding_settings: dict[str, Any] | None = None
    signature_settings: dict[str, Any] | None = None
    metadata: dict[str, Any] | None = None


class TenantProfileResponse(TenantProfilePayload):
    id: str
    tenant_id: str
    slug: str = ""
    account_status: TenantAccountStatus = "active"
    billing_status: TenantBillingStatus = "current"
    plan: str = ""
    is_founder: bool = False
    founder_number: int | None = None
    updated_by: str = ""
    version: int = 1

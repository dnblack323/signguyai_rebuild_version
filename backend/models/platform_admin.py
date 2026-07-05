from datetime import datetime
from typing import Any, Literal

from pydantic import Field

try:
    from .base import StrictBaseModel
except ImportError:
    from models.base import StrictBaseModel


TenantAccountStatus = Literal["trialing", "active", "past_due", "suspended", "cancelled"]
TenantBillingStatus = Literal["trialing", "current", "past_due", "failed", "cancelled"]


class TenantStatusPatch(StrictBaseModel):
    account_status: TenantAccountStatus | None = None
    billing_status: TenantBillingStatus | None = None
    suspension_reason: str = ""
    maintenance_banner: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)


class TenantListResponse(StrictBaseModel):
    tenants: list[dict[str, Any]] = Field(default_factory=list)
    total: int = 0


class PlatformAdminAuditListResponse(StrictBaseModel):
    events: list[dict[str, Any]] = Field(default_factory=list)
    total: int = 0


class TenantReadinessCheck(StrictBaseModel):
    key: str
    label: str
    passed: bool
    severity: Literal["blocker", "warning", "info"] = "blocker"
    detail: str = ""


class TenantReadinessResponse(StrictBaseModel):
    tenant_id: str
    can_launch: bool
    checks: list[TenantReadinessCheck] = Field(default_factory=list)


class PlatformAdminAuditEvent(StrictBaseModel):
    id: str
    action: str
    target_tenant_id: str
    actor_id: str
    actor_email: str = ""
    actor_role: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

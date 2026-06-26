from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

try:
    from ..shared.dates import utc_now
    from ..shared.ids import uuid7_str
except ImportError:
    from shared.dates import utc_now
    from shared.ids import uuid7_str


class StrictBaseModel(BaseModel):
    """Default model posture for authoritative backend data."""

    model_config = ConfigDict(extra="forbid", validate_assignment=True)


class PreviewEnvelope(BaseModel):
    """Compatibility boundary for prototype/imported app payloads.

    Wrap Lab and transferred UI areas may temporarily round-trip broad nested
    payloads. Authoritative domain documents should inherit StrictBaseModel or
    TenantDocument instead.
    """

    model_config = ConfigDict(extra="allow")


class BaseDocument(StrictBaseModel):
    id: str = Field(default_factory=uuid7_str)
    tenant_id: str
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
    version: int = 1


class TenantDocument(BaseDocument):
    """Tenant-owned mutable aggregate base required by the rebuild blueprint."""

    migration: dict[str, Any] | None = None

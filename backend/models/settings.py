from typing import Any, Literal

from pydantic import Field

try:
    from .base import PreviewEnvelope, TenantDocument
except ImportError:
    from models.base import PreviewEnvelope, TenantDocument


SettingStatus = Literal["draft", "active", "disabled"]


class SettingValue(PreviewEnvelope):
    """Flexible tenant settings payload while module schemas are still settling."""

    value: dict[str, Any] = Field(default_factory=dict)
    status: SettingStatus = "active"
    schema_version: int = Field(default=1, ge=1)
    source: str = "manual"
    metadata: dict[str, Any] = Field(default_factory=dict)
    notes: str = ""


class TenantSettingDocument(SettingValue, TenantDocument):
    namespace: str
    key: str
    updated_by: str = ""


class SettingUpdatePayload(SettingValue):
    pass


class SettingListResponse(PreviewEnvelope):
    settings: list[dict[str, Any]] = Field(default_factory=list)
    total: int = 0

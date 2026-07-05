from typing import Any, Literal

from pydantic import Field

try:
    from .base import PreviewEnvelope, TenantDocument
except ImportError:
    from models.base import PreviewEnvelope, TenantDocument


AuditSeverity = Literal["info", "warning", "critical"]


class ActivityEventPayload(PreviewEnvelope):
    event_type: str
    module: str
    entity_type: str = ""
    entity_id: str = ""
    summary: str
    actor_id: str = ""
    actor_role: str = ""
    actor_email: str = ""
    actor_source: str = ""
    severity: AuditSeverity = "info"
    metadata: dict[str, Any] = Field(default_factory=dict)
    changes: dict[str, Any] = Field(default_factory=dict)


class ActivityEventDocument(ActivityEventPayload, TenantDocument):
    pass


class ActivityEventListResponse(PreviewEnvelope):
    events: list[dict[str, Any]] = Field(default_factory=list)
    total: int = 0

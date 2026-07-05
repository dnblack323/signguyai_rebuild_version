from datetime import datetime
from typing import Any, Literal

from pydantic import Field

try:
    from .base import PreviewEnvelope, TenantDocument
except ImportError:
    from models.base import PreviewEnvelope, TenantDocument


EmailDeliveryStatus = Literal["queued", "sent", "delivered", "deferred", "bounce", "dropped", "spamreport", "blocked", "failed"]
NotificationRecipientType = Literal["staff", "customer", "webstore_owner", "platform_admin"]
NotificationStatus = Literal["unread", "read", "archived"]
NotificationSeverity = Literal["info", "warning", "critical"]


class EmailActivityPayload(PreviewEnvelope):
    recipient_email: str
    recipient_name: str = ""
    subject: str
    template_key: str = ""
    provider: str = "sendgrid"
    provider_message_id: str = ""
    status: EmailDeliveryStatus = "sent"
    delivery_status: EmailDeliveryStatus = "sent"
    related_entity_type: str = ""
    related_entity_id: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)
    events: list[dict[str, Any]] = Field(default_factory=list)
    sent_at: datetime | None = None
    last_event_at: datetime | None = None


class EmailActivityDocument(EmailActivityPayload, TenantDocument):
    created_by: str = ""


class EmailActivityListResponse(PreviewEnvelope):
    emails: list[dict[str, Any]] = Field(default_factory=list)
    total: int = 0


class NotificationPayload(PreviewEnvelope):
    recipient_type: NotificationRecipientType
    recipient_id: str
    title: str
    message: str
    status: NotificationStatus = "unread"
    severity: NotificationSeverity = "info"
    channel: str = "in_app"
    link: str = ""
    related_entity_type: str = ""
    related_entity_id: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)


class NotificationDocument(NotificationPayload, TenantDocument):
    created_by: str = ""
    read_at: datetime | None = None
    archived_at: datetime | None = None


class NotificationUpdatePayload(PreviewEnvelope):
    status: NotificationStatus


class NotificationListResponse(PreviewEnvelope):
    notifications: list[dict[str, Any]] = Field(default_factory=list)
    total: int = 0


class SendGridWebhookResponse(PreviewEnvelope):
    processed: int = 0
    matched: int = 0
    rejected: int = 0

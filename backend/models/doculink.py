from datetime import datetime
from typing import Any, Literal

from pydantic import Field

from .base import PreviewEnvelope, TenantDocument, utc_now


DocumentStatus = Literal[
    "draft",
    "internal_review",
    "ready_to_send",
    "sent",
    "viewed",
    "approved",
    "declined",
    "signed",
    "finalized",
    "archived",
    "voided",
]
DocumentVisibility = Literal["internal", "customer_portal", "owner_portal", "employee_portal", "secure_link"]
DocumentSourceType = Literal[
    "manual",
    "upload",
    "template",
    "questionnaire",
    "generated_pdf",
    "ai_generated",
    "portal_submission",
    "system_generated",
]
TemplateType = Literal["document", "questionnaire", "form", "email", "sms", "approval", "packet", "ai_prompt_backed"]
ScanStatus = Literal["pending", "accepted", "rejected", "scan_unavailable"]


class FileDocument(TenantDocument):
    original_filename: str
    stored_filename: str
    object_path: str
    mime_type: str
    size_bytes: int = 0
    sha256: str = ""
    scan_status: ScanStatus = "scan_unavailable"
    uploaded_by: str = ""
    archived_at: datetime | None = None


class FileUploadRead(PreviewEnvelope):
    id: str
    tenant_id: str
    original_filename: str
    stored_filename: str
    mime_type: str
    size_bytes: int
    sha256: str
    scan_status: str
    uploaded_by: str = ""
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None = None


class BusinessDocumentPayload(PreviewEnvelope):
    title: str
    document_type: str = "general"
    category_id: str = ""
    status: DocumentStatus = "draft"
    visibility: DocumentVisibility = "internal"
    source_type: DocumentSourceType = "manual"
    ai_generated: bool = False
    requires_review: bool = False
    customer_id: str = ""
    order_id: str = ""
    quote_id: str = ""
    invoice_id: str = ""
    primary_file_id: str = ""
    current_version_id: str = ""
    created_by: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)


class BusinessDocument(BusinessDocumentPayload, TenantDocument):
    finalized_at: datetime | None = None
    archived_at: datetime | None = None
    voided_at: datetime | None = None


class DocumentUpdatePayload(PreviewEnvelope):
    title: str | None = None
    document_type: str | None = None
    category_id: str | None = None
    status: DocumentStatus | None = None
    visibility: DocumentVisibility | None = None
    source_type: DocumentSourceType | None = None
    ai_generated: bool | None = None
    requires_review: bool | None = None
    customer_id: str | None = None
    order_id: str | None = None
    quote_id: str | None = None
    invoice_id: str | None = None
    primary_file_id: str | None = None
    current_version_id: str | None = None
    metadata: dict[str, Any] | None = None


class FileLinkPayload(PreviewEnvelope):
    file_id: str = ""
    entity_type: str
    entity_id: str
    relationship_type: str = "attachment"
    customer_visible: bool = False
    created_by: str = ""


class FileLink(FileLinkPayload, TenantDocument):
    pass


class DocumentLinkPayload(PreviewEnvelope):
    document_id: str = ""
    entity_type: str
    entity_id: str
    relationship_type: str = "reference"
    created_by: str = ""


class DocumentLink(DocumentLinkPayload, TenantDocument):
    pass


class DocumentSharePayload(PreviewEnvelope):
    share_type: str = "internal"
    recipient_type: str = "user"
    recipient_id: str = ""
    access_level: str = "view"
    expires_at: datetime | None = None
    created_by: str = ""


class DocumentShare(DocumentSharePayload, TenantDocument):
    document_id: str
    revoked_at: datetime | None = None


class DocumentActivityPayload(PreviewEnvelope):
    document_id: str = ""
    activity_type: str
    actor_type: str = "user"
    actor_id: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)


class DocumentActivity(DocumentActivityPayload, TenantDocument):
    pass


class DocumentTemplatePlaceholder(PreviewEnvelope):
    title: str
    template_type: TemplateType = "document"
    category_id: str = ""
    status: str = "draft"
    current_version_id: str = ""
    created_by: str = ""
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


LOCKED_DOCUMENT_STATUSES = {"approved", "signed", "finalized"}
FINAL_STATUS_TIMESTAMPS = {
    "finalized": "finalized_at",
    "archived": "archived_at",
    "voided": "voided_at",
}

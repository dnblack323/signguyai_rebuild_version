from datetime import date, datetime
from typing import Any, Literal

from pydantic import Field

from .base import PreviewEnvelope
from .orders import ItemCategory


QuoteStatus = Literal["draft", "sent", "approved", "declined", "expired", "converted", "cancelled"]
ApprovalMethod = Literal["phone", "email", "text", "in_person", "other"]
EDITABLE_QUOTE_STATUSES = {"draft", "sent"}


class QuoteLineItemPayload(PreviewEnvelope):
    item_name: str
    item_category: ItemCategory = "custom"
    item_subcategory: str = ""
    quantity: int = Field(default=1, ge=1)
    unit_type: str = "each"
    description: str = ""
    specs: dict[str, Any] = Field(default_factory=dict)
    estimated_price_minor: int = 0
    material_estimate_minor: int = 0
    labor_estimate_minor: int = 0
    production_required: bool | None = None


class QuoteLineItemDocument(QuoteLineItemPayload):
    id: str
    tenant_id: str
    quote_id: str
    created_at: datetime
    updated_at: datetime
    version: int = 1


class QuoteLineItemPatch(PreviewEnvelope):
    item_name: str | None = None
    item_category: ItemCategory | None = None
    item_subcategory: str | None = None
    quantity: int | None = None
    unit_type: str | None = None
    description: str | None = None
    specs: dict[str, Any] | None = None
    estimated_price_minor: int | None = None
    material_estimate_minor: int | None = None
    labor_estimate_minor: int | None = None
    production_required: bool | None = None


class QuotePayload(PreviewEnvelope):
    customer_id: str = ""
    customer_name: str = ""
    contact_name: str = ""
    phone: str = ""
    email: str = ""
    company_name: str = ""
    lead_source: str = "phone"
    title: str = ""
    quote_date: date | None = None
    expires_at: date | None = None
    staff_owner_id: str = ""
    discount_minor: int = 0
    tax_minor: int = 0
    notes: str = ""
    internal_notes: str = ""
    terms: str = "Quote is valid until the expiration date shown above. Production starts after approval and any required deposit."
    line_items: list[QuoteLineItemPayload] = Field(default_factory=list)


class QuoteDocument(QuotePayload):
    id: str
    tenant_id: str
    quote_number: str
    status: QuoteStatus = "draft"
    subtotal_minor: int = 0
    total_minor: int = 0
    sent_at: datetime | None = None
    approved_at: datetime | None = None
    approved_by_user_id: str = ""
    approval_method: ApprovalMethod | None = None
    approval_note: str = ""
    approved_contact_name: str = ""
    declined_at: datetime | None = None
    decline_reason: str = ""
    converted_at: datetime | None = None
    converted_order_id: str = ""
    created_at: datetime
    updated_at: datetime
    version: int = 1


class QuotePatch(PreviewEnvelope):
    customer_id: str | None = None
    customer_name: str | None = None
    contact_name: str | None = None
    phone: str | None = None
    email: str | None = None
    company_name: str | None = None
    lead_source: str | None = None
    title: str | None = None
    quote_date: date | None = None
    expires_at: date | None = None
    staff_owner_id: str | None = None
    discount_minor: int | None = None
    tax_minor: int | None = None
    notes: str | None = None
    internal_notes: str | None = None
    terms: str | None = None
    status: Literal["draft", "sent", "expired", "cancelled"] | None = None


class QuoteApprovalPayload(PreviewEnvelope):
    approval_method: ApprovalMethod = "phone"
    approval_note: str = ""
    approved_contact_name: str = ""


class QuoteDeclinePayload(PreviewEnvelope):
    decline_reason: str = ""

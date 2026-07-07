from datetime import date, datetime
from typing import Literal

from pydantic import Field

from .base import PreviewEnvelope


InvoiceStatus = Literal["draft", "issued", "partially_paid", "paid", "overdue", "void", "cancelled"]
PaymentMethod = Literal["cash", "check", "card", "ach", "other"]


class InvoiceLineItem(PreviewEnvelope):
    order_item_id: str = ""
    item_number: str = ""
    description: str = ""
    quantity: int = 1
    amount_minor: int = 0


class InvoicePatch(PreviewEnvelope):
    due_date: date | None = None
    notes: str | None = None
    discount_minor: int | None = None
    tax_minor: int | None = None
    status: Literal["draft", "issued", "void", "cancelled", "overdue"] | None = None


class InvoicePaymentPayload(PreviewEnvelope):
    amount_minor: int = Field(gt=0)
    payment_method: PaymentMethod = "cash"
    note: str = ""


class InvoiceDocument(PreviewEnvelope):
    id: str
    tenant_id: str
    invoice_number: str
    order_id: str
    order_number: str = ""
    customer_id: str = ""
    customer_name: str = ""
    contact_name: str = ""
    email: str = ""
    phone: str = ""
    status: InvoiceStatus = "draft"
    line_items: list[InvoiceLineItem] = Field(default_factory=list)
    subtotal_minor: int = 0
    discount_minor: int = 0
    tax_minor: int = 0
    total_minor: int = 0
    amount_paid_minor: int = 0
    balance_due_minor: int = 0
    invoice_date: date | None = None
    due_date: date | None = None
    notes: str = ""
    payment_terms: str = "Due on receipt unless otherwise agreed."
    created_at: datetime
    updated_at: datetime
    version: int = 1

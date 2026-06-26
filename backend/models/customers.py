from datetime import datetime
from typing import Any

from pydantic import Field

from .base import PreviewEnvelope, utc_now


class CustomerPayload(PreviewEnvelope):
    id: str | None = None
    businessName: str = ""
    firstName: str = ""
    lastName: str = ""
    email: str = ""
    phone: str = ""
    companyType: str = ""
    source: str = "manual"
    tags: list[str] = Field(default_factory=list)
    notes: str = ""
    openOrders: int = 0
    lifetimeValueMinor: int = 0
    metadata: dict[str, Any] = Field(default_factory=dict)


class CustomerDocument(CustomerPayload):
    id: str
    tenant_id: str
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
    version: int = 1

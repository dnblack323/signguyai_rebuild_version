"""
Models for the Example Section.

Convention notes (match the rest of SignGuy):
- Documents use a STRING `id` (uuid4), NOT a Mongo ObjectId. Every query in the
  codebase filters on `{"id": ...}` and projects `{"_id": 0}`. Follow that here.
- EVERY business document carries `tenant_id` for multi-tenant isolation.
- datetimes are stored as ISO strings via `.isoformat()` and `datetime.now(timezone.utc)`.
- Keep Base / Create / Update / full-document split like customer.py / jobs.py.
"""
from datetime import datetime, timezone
from typing import Optional, List
from uuid import uuid4
from pydantic import BaseModel, Field


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class ExampleItemBase(BaseModel):
    name: str
    notes: Optional[str] = None
    status: str = "active"            # rename to a proper Enum in models/enums.py if it has states
    # Link back to existing core records instead of duplicating them:
    order_id: Optional[str] = None    # reuse `orders`
    customer_id: Optional[str] = None # reuse `customers`


class ExampleItemCreate(ExampleItemBase):
    pass


class ExampleItemUpdate(BaseModel):
    name: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class ExampleItem(ExampleItemBase):
    id: str = Field(default_factory=lambda: str(uuid4()))
    tenant_id: str
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=_now_iso)
    updated_at: str = Field(default_factory=_now_iso)

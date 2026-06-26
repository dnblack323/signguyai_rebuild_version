from datetime import datetime
from typing import Any

from pydantic import Field

from .base import PreviewEnvelope, utc_now


class CommunityReplyPayload(PreviewEnvelope):
    id: str | None = None
    body: str
    author_name: str = "Shop Admin"
    author_email: str = ""
    is_official: bool = False
    created_at: datetime = Field(default_factory=utc_now)


class CommunityPostPayload(PreviewEnvelope):
    id: str | None = None
    title: str
    body: str
    category: str = "question"
    status: str = "open"
    author_name: str = "Shop Admin"
    author_email: str = ""
    upvotes: int = 0
    upvoted_by: list[str] = Field(default_factory=list)
    replies: list[dict[str, Any]] = Field(default_factory=list)
    is_pinned: bool = False
    is_answered: bool = False
    linked_module: str = ""
    linked_record_id: str = ""


class NotePayload(PreviewEnvelope):
    id: str | None = None
    title: str
    body: str = ""
    scope: str = "general"
    visibility: str = "internal"
    status: str = "open"
    priority: str = "normal"
    customer_id: str = ""
    order_id: str = ""
    quote_id: str = ""
    wrap_project_id: str = ""
    portal_id: str = ""
    tags: list[str] = Field(default_factory=list)
    assigned_to: str = ""
    created_by: str = "Shop Admin"


class AIGeneratePayload(PreviewEnvelope):
    tool_id: str
    input_data: dict[str, Any] = Field(default_factory=dict)
    customer_id: str = ""
    order_id: str = ""
    source_module: str = "ai-suite"

from typing import Any, Literal

from pydantic import Field

from .base import PreviewEnvelope, TenantDocument


class PricingFoundationPayload(PreviewEnvelope):
    """Tenant pricing defaults edited from Settings -> Pricing Foundation.

    The nested pricing object is intentionally flexible while the rebuild pricing
    rules are still expanding by category. The authoritative envelope remains
    tenant/version controlled and can be tightened after the full pricing schema
    settles.
    """

    status: Literal["draft", "active"] = "active"
    source: str = "manual"
    settings: dict[str, Any] = Field(default_factory=dict)
    quiz_answers: dict[str, Any] = Field(default_factory=dict)
    applied_suggestions: list[dict[str, Any]] = Field(default_factory=list)
    notes: str = ""


class PricingFoundationDocument(PricingFoundationPayload, TenantDocument):
    key: str = "default"


class PricingFoundationPatch(PreviewEnvelope):
    status: Literal["draft", "active"] | None = None
    source: str | None = None
    settings: dict[str, Any] | None = None
    quiz_answers: dict[str, Any] | None = None
    applied_suggestions: list[dict[str, Any]] | None = None
    notes: str | None = None

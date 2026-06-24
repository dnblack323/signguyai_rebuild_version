from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from .base import utc_now


WrapStage = Literal[
    "Intake", "Quote", "Contract", "Design", "Proof Approval", "Inspection",
    "Production", "Install", "Pickup", "Aftercare", "Complete",
]


class WrapProjectPayload(BaseModel):
    """Flexible domain envelope matching the complete Wrap Lab project record.

    The standalone prototype has a broad nested schema. Known workflow fields
    are typed here while extra fields remain round-trippable during migration.
    """

    model_config = ConfigDict(extra="allow")

    id: str | None = None
    customerName: str = ""
    businessName: str = ""
    stage: WrapStage = "Intake"
    stageIndex: int = Field(default=0, ge=0, le=10)
    quoteStatus: str = "pending"
    contractStatus: str = "pending"
    paymentStatus: str = "unpaid"
    inspectionAcknowledged: bool = False
    finalSignoff: bool = False
    files: list[dict[str, Any]] = Field(default_factory=list)
    proofs: list[dict[str, Any]] = Field(default_factory=list)
    damageMarkers: list[dict[str, Any]] = Field(default_factory=list)
    productionChecklist: list[dict[str, Any]] = Field(default_factory=list)
    installChecklist: list[dict[str, Any]] = Field(default_factory=list)
    issuesLog: list[dict[str, Any]] = Field(default_factory=list)
    chatHistory: list[dict[str, Any]] = Field(default_factory=list)
    mockupStudio: dict[str, Any] | None = None


class WrapProjectDocument(WrapProjectPayload):
    id: str
    tenant_id: str
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
    version: int = 1


class WrapProjectPatch(BaseModel):
    model_config = ConfigDict(extra="allow")


class WrapFileUpload(BaseModel):
    name: str
    category: str = "Other"
    contentType: str = "application/octet-stream"
    dataUrl: str
    customerVisible: bool = False
    marketingPermission: bool = False


class WrapWorkflowAction(BaseModel):
    action: Literal[
        "approve_quote", "request_quote_revision", "pay_deposit", "sign_contract",
        "approve_proof", "request_proof_revision", "acknowledge_inspection",
        "advance_stage", "complete_stage", "send_message", "resolve_issue",
    ]
    payload: dict[str, Any] = Field(default_factory=dict)

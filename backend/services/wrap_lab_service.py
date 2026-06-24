from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException


STAGES = [
    "Intake", "Quote", "Contract", "Design", "Proof Approval", "Inspection",
    "Production", "Install", "Pickup", "Aftercare", "Complete",
]


def public_project(project: dict[str, Any]) -> dict[str, Any]:
    """Explicit portal allowlist so internal pricing/cost notes never leak."""
    allowed = {
        "id", "businessName", "business_name", "customerName", "customer_name", "firstName",
        "lastName", "year", "make", "model", "bodyType", "wrapType", "stage", "stageIndex",
        "quoteAmount", "depositAmount", "quoteStatus", "contractStatus", "paymentStatus",
        "proofs", "mockupImage", "damageMarkers", "inspectionAcknowledged", "files",
        "chatHistory", "finalSignoff", "mockupStudio",
    }
    result = {key: value for key, value in project.items() if key in allowed}
    result["files"] = [
        file for file in result.get("files", []) if file.get("customerVisible")
    ]
    return result


def apply_workflow_action(project: dict[str, Any], action: str, payload: dict[str, Any]) -> dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    history = list(project.get("chatHistory") or project.get("chat_history") or [])

    if action == "approve_quote":
        project["quoteStatus"] = "approved"
        history.append({"sender": "customer", "text": "Quote approved in the customer portal.", "time": now})
    elif action == "request_quote_revision":
        project["quoteStatus"] = "revision_requested"
        history.append({"sender": "customer", "text": payload.get("message", "Quote revision requested."), "time": now})
    elif action == "pay_deposit":
        project["paymentStatus"] = "deposit_paid"
        project["depositAmount"] = payload.get("amount", project.get("depositAmount", 0))
        history.append({"sender": "customer", "text": "Required deposit paid through the portal.", "time": now})
    elif action == "sign_contract":
        if project.get("paymentStatus") == "unpaid":
            raise HTTPException(status_code=409, detail="Deposit must be paid before signing")
        project["contractStatus"] = "signed"
        project["contractSignedAt"] = now
        project["contractSignedBy"] = payload.get("signedBy", "Customer")
        project["contractSignature"] = payload.get("signature")
    elif action == "approve_proof":
        proofs = list(project.get("proofs", []))
        if not proofs:
            raise HTTPException(status_code=409, detail="No proof is available")
        proofs[-1] = {**proofs[-1], "status": "Approved", "approvedAt": now}
        project["proofs"] = proofs
    elif action == "request_proof_revision":
        proofs = list(project.get("proofs", []))
        if not proofs:
            raise HTTPException(status_code=409, detail="No proof is available")
        proofs[-1] = {**proofs[-1], "status": "Revision Requested", "notes": payload.get("message", "")}
        project["proofs"] = proofs
    elif action == "acknowledge_inspection":
        project["inspectionAcknowledged"] = True
        project["inspectionAcknowledgedAt"] = now
    elif action in {"advance_stage", "complete_stage"}:
        current = int(project.get("stageIndex", 0))
        target = min(10, int(payload.get("stageIndex", current + 1)))
        _assert_stage_gate(project, target)
        project["stageIndex"] = target
        project["stage"] = STAGES[target]
    elif action == "send_message":
        message = str(payload.get("message", "")).strip()
        if not message:
            raise HTTPException(status_code=422, detail="Message is required")
        history.append({"sender": payload.get("sender", "shop"), "text": message, "time": now})
    elif action == "resolve_issue":
        index = int(payload.get("index", -1))
        issues = list(project.get("issuesLog", []))
        if index < 0 or index >= len(issues):
            raise HTTPException(status_code=404, detail="Issue not found")
        issues[index] = {**issues[index], "resolved": True, "resolvedAt": now}
        project["issuesLog"] = issues

    project["chatHistory"] = history
    return project


def _assert_stage_gate(project: dict[str, Any], target: int):
    if target >= 3 and project.get("quoteStatus") != "approved":
        raise HTTPException(status_code=409, detail="Quote approval is required")
    if target >= 3 and project.get("contractStatus") != "signed":
        raise HTTPException(status_code=409, detail="Signed contract is required")
    if target >= 3 and project.get("paymentStatus") == "unpaid":
        raise HTTPException(status_code=409, detail="Deposit payment is required")
    if target >= 5:
        proofs = project.get("proofs", [])
        if not proofs or proofs[-1].get("status") != "Approved":
            raise HTTPException(status_code=409, detail="Approved proof is required")
    if target >= 6 and not project.get("inspectionAcknowledged"):
        raise HTTPException(status_code=409, detail="Inspection acknowledgement is required")
    if target >= 7 and not all(item.get("done") for item in project.get("productionChecklist", [])):
        raise HTTPException(status_code=409, detail="Production checklist is incomplete")
    if target >= 8 and not all(item.get("done") for item in project.get("installChecklist", [])):
        raise HTTPException(status_code=409, detail="Install checklist is incomplete")

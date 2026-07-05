import hashlib
import hmac
import json
import os

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status

try:
    from ..core_runtime import get_database, require_permission
    from ..models.access import Permission, RuntimeIdentityContext
    from ..models.communications import (
        EmailActivityListResponse,
        EmailActivityPayload,
        NotificationListResponse,
        NotificationPayload,
        NotificationUpdatePayload,
        SendGridWebhookResponse,
    )
    from ..repositories.communications import CommunicationsRepository
    from ..services.activity import record_activity_event
    from ..services.communications import create_notification, record_email_activity
except ImportError:
    from core_runtime import get_database, require_permission
    from models.access import Permission, RuntimeIdentityContext
    from models.communications import (
        EmailActivityListResponse,
        EmailActivityPayload,
        NotificationListResponse,
        NotificationPayload,
        NotificationUpdatePayload,
        SendGridWebhookResponse,
    )
    from repositories.communications import CommunicationsRepository
    from services.activity import record_activity_event
    from services.communications import create_notification, record_email_activity


router = APIRouter(prefix="/communications", tags=["Communications"])


def repository() -> CommunicationsRepository:
    return CommunicationsRepository(get_database())


@router.get("/email-activity", response_model=EmailActivityListResponse)
async def list_email_activity(
    delivery_status: str = "",
    recipient_email: str = "",
    template_key: str = "",
    related_entity_type: str = "",
    related_entity_id: str = "",
    limit: int = Query(default=100, ge=1, le=250),
    context: RuntimeIdentityContext = Depends(require_permission(Permission.EMAIL_ACTIVITY_VIEW.value)),
) -> EmailActivityListResponse:
    filters = {
        "delivery_status": delivery_status,
        "recipient_email": recipient_email,
        "template_key": template_key,
        "related_entity_type": related_entity_type,
        "related_entity_id": related_entity_id,
    }
    repo = repository()
    await repo.ensure_indexes()
    emails = await repo.list_email_activity(context.tenant_id, filters=filters, limit=limit)
    return EmailActivityListResponse(emails=emails, total=len(emails))


@router.post("/email-activity", status_code=status.HTTP_201_CREATED)
async def create_email_activity_record(
    payload: EmailActivityPayload,
    context: RuntimeIdentityContext = Depends(require_permission(Permission.EMAIL_MANAGE.value)),
):
    return await record_email_activity(get_database(), context, payload.model_dump())


@router.get("/notifications", response_model=NotificationListResponse)
async def list_notifications(
    recipient_type: str = "",
    recipient_id: str = "",
    status_filter: str = Query(default="", alias="status"),
    severity: str = "",
    limit: int = Query(default=100, ge=1, le=250),
    context: RuntimeIdentityContext = Depends(require_permission(Permission.NOTIFICATIONS_VIEW.value)),
) -> NotificationListResponse:
    filters = {
        "recipient_type": recipient_type,
        "recipient_id": recipient_id,
        "status": status_filter,
        "severity": severity,
    }
    if context.role == "staff":
        filters["recipient_type"] = "staff"
        filters["recipient_id"] = context.user_id
    repo = repository()
    await repo.ensure_indexes()
    rows = await repo.list_notifications(context.tenant_id, filters=filters, limit=limit)
    return NotificationListResponse(notifications=rows, total=len(rows))


@router.post("/notifications", status_code=status.HTTP_201_CREATED)
async def create_notification_record(
    payload: NotificationPayload,
    context: RuntimeIdentityContext = Depends(require_permission(Permission.NOTIFICATIONS_MANAGE.value)),
):
    return await create_notification(get_database(), context, payload.model_dump())


@router.patch("/notifications/{notification_id}")
async def update_notification_status(
    notification_id: str,
    payload: NotificationUpdatePayload,
    context: RuntimeIdentityContext = Depends(require_permission(Permission.NOTIFICATIONS_VIEW.value)),
):
    repo = repository()
    await repo.ensure_indexes()
    existing_rows = await repo.list_notifications(context.tenant_id, filters={"id": notification_id}, limit=1)
    if not existing_rows:
        raise HTTPException(status_code=404, detail="Notification not found")
    existing = existing_rows[0]
    if context.role == "staff" and (existing.get("recipient_type") != "staff" or existing.get("recipient_id") != context.user_id):
        raise HTTPException(status_code=403, detail="Permission denied")
    updated = await repo.update_notification_status(context.tenant_id, notification_id, payload.status)
    await record_activity_event(
        get_database(),
        context,
        event_type="notification.status.updated",
        module="communications",
        summary=f"Notification marked {payload.status}",
        entity_type="notification",
        entity_id=notification_id,
        metadata={"status": payload.status},
    )
    return updated


@router.post("/webhooks/sendgrid", response_model=SendGridWebhookResponse)
async def ingest_sendgrid_webhook(
    request: Request,
    x_signguyai_webhook_signature: str = Header(default=""),
) -> SendGridWebhookResponse:
    raw_body = await request.body()
    _verify_webhook_signature(raw_body, x_signguyai_webhook_signature)
    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid webhook payload") from exc
    events = payload if isinstance(payload, list) else [payload]
    repo = repository()
    await repo.ensure_indexes()
    processed = 0
    matched = 0
    rejected = 0
    for event in events:
        if not isinstance(event, dict):
            rejected += 1
            continue
        processed += 1
        if await repo.apply_email_event(event):
            matched += 1
    return SendGridWebhookResponse(processed=processed, matched=matched, rejected=rejected)


def _verify_webhook_signature(raw_body: bytes, signature_header: str) -> None:
    secret = os.getenv("SIGNGUYAI_SENDGRID_WEBHOOK_SECRET", "").strip()
    if not secret:
        return
    expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    provided = signature_header.removeprefix("sha256=").strip()
    if not provided or not hmac.compare_digest(expected, provided):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

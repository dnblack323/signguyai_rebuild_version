try:
    from ..models.access import RuntimeIdentityContext
    from ..repositories.communications import CommunicationsRepository
    from .activity import record_activity_event
except ImportError:
    from models.access import RuntimeIdentityContext
    from repositories.communications import CommunicationsRepository
    from services.activity import record_activity_event


async def record_email_activity(database, context: RuntimeIdentityContext, payload: dict) -> dict:
    repo = CommunicationsRepository(database)
    await repo.ensure_indexes()
    created = await repo.create_email_activity(context.tenant_id, payload, actor_id=context.user_id)
    await record_activity_event(
        database,
        context,
        event_type="email.activity.created",
        module="communications",
        summary=f"Email activity recorded for {created.get('recipient_email')}",
        entity_type="email_activity",
        entity_id=created["id"],
        metadata={
            "recipient_email": created.get("recipient_email"),
            "template_key": created.get("template_key"),
            "delivery_status": created.get("delivery_status"),
        },
    )
    return created


async def create_notification(database, context: RuntimeIdentityContext, payload: dict) -> dict:
    repo = CommunicationsRepository(database)
    await repo.ensure_indexes()
    created = await repo.create_notification(context.tenant_id, payload, actor_id=context.user_id)
    await record_activity_event(
        database,
        context,
        event_type="notification.created",
        module="communications",
        summary=f"Notification created for {created.get('recipient_type')} {created.get('recipient_id')}",
        entity_type="notification",
        entity_id=created["id"],
        metadata={
            "recipient_type": created.get("recipient_type"),
            "recipient_id": created.get("recipient_id"),
            "severity": created.get("severity"),
        },
    )
    return created

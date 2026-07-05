try:
    from ..models.access import RuntimeIdentityContext
    from ..models.activity import ActivityEventPayload
    from ..repositories.activity import ActivityEventRepository
except ImportError:
    from models.access import RuntimeIdentityContext
    from models.activity import ActivityEventPayload
    from repositories.activity import ActivityEventRepository


async def record_activity_event(
    database,
    context: RuntimeIdentityContext,
    *,
    event_type: str,
    module: str,
    summary: str,
    entity_type: str = "",
    entity_id: str = "",
    metadata: dict | None = None,
    changes: dict | None = None,
    severity: str = "info",
) -> dict:
    repo = ActivityEventRepository(database)
    await repo.ensure_indexes()
    payload = ActivityEventPayload(
        event_type=event_type,
        module=module,
        entity_type=entity_type,
        entity_id=entity_id,
        summary=summary,
        actor_id=context.user_id,
        actor_role=context.role,
        actor_email=context.email,
        actor_source=context.auth_source,
        severity=severity,
        metadata=metadata or {},
        changes=changes or {},
    )
    return await repo.create(context.tenant_id, payload.model_dump())

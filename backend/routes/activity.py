from fastapi import APIRouter, Depends, Query

try:
    from ..core_runtime import get_database, require_permission
    from ..models.access import Permission, RuntimeIdentityContext
    from ..models.activity import ActivityEventListResponse
    from ..repositories.activity import ActivityEventRepository
except ImportError:
    from core_runtime import get_database, require_permission
    from models.access import Permission, RuntimeIdentityContext
    from models.activity import ActivityEventListResponse
    from repositories.activity import ActivityEventRepository


router = APIRouter(prefix="/activity", tags=["Activity"])


def repository() -> ActivityEventRepository:
    return ActivityEventRepository(get_database())


@router.get("/events", response_model=ActivityEventListResponse)
async def list_activity_events(
    module: str = "",
    event_type: str = "",
    entity_type: str = "",
    entity_id: str = "",
    actor_id: str = "",
    limit: int = Query(default=100, ge=1, le=250),
    context: RuntimeIdentityContext = Depends(require_permission(Permission.ACTIVITY_VIEW.value)),
) -> ActivityEventListResponse:
    filters = {}
    for key, value in {
        "module": module,
        "event_type": event_type,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "actor_id": actor_id,
    }.items():
        if value:
            filters[key] = value
    repo = repository()
    await repo.ensure_indexes()
    events = await repo.list(context.tenant_id, filters=filters, limit=limit)
    return ActivityEventListResponse(events=events, total=len(events))

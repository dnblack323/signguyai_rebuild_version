from fastapi import APIRouter, Depends, HTTPException, Query

try:
    from ..core_runtime import get_database, require_permission
    from ..models.access import Permission, RuntimeIdentityContext
    from ..models.settings import SettingListResponse, SettingUpdatePayload
    from ..repositories.settings import SettingsRepository
    from ..services.activity import record_activity_event
except ImportError:
    from core_runtime import get_database, require_permission
    from models.access import Permission, RuntimeIdentityContext
    from models.settings import SettingListResponse, SettingUpdatePayload
    from repositories.settings import SettingsRepository
    from services.activity import record_activity_event


router = APIRouter(prefix="/settings", tags=["Settings"])


def repository() -> SettingsRepository:
    return SettingsRepository(get_database())


@router.get("/config", response_model=SettingListResponse)
async def list_settings(
    namespace: str = Query(default=""),
    context: RuntimeIdentityContext = Depends(require_permission(Permission.SETTINGS_VIEW.value)),
) -> SettingListResponse:
    repo = repository()
    await repo.ensure_indexes()
    settings = await repo.list(context.tenant_id, namespace=namespace.strip())
    return SettingListResponse(settings=settings, total=len(settings))


@router.get("/config/{namespace}/{key}")
async def get_setting(
    namespace: str,
    key: str,
    context: RuntimeIdentityContext = Depends(require_permission(Permission.SETTINGS_VIEW.value)),
):
    repo = repository()
    await repo.ensure_indexes()
    setting = await repo.get(context.tenant_id, namespace.strip(), key.strip())
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    return setting


@router.put("/config/{namespace}/{key}")
async def save_setting(
    namespace: str,
    key: str,
    payload: SettingUpdatePayload,
    context: RuntimeIdentityContext = Depends(require_permission(Permission.SETTINGS_MANAGE.value)),
):
    database = get_database()
    repo = repository()
    await repo.ensure_indexes()
    setting = await repo.upsert(
        context.tenant_id,
        namespace.strip(),
        key.strip(),
        payload.model_dump(),
        actor_id=context.user_id,
    )
    await record_activity_event(
        database,
        context,
        event_type="settings.config.updated",
        module="settings",
        entity_type="tenant_setting",
        entity_id=setting["id"],
        summary=f"Updated setting {setting['namespace']}/{setting['key']}",
        metadata={"namespace": setting["namespace"], "key": setting["key"]},
        changes={"value": setting.get("value", {})},
    )
    return setting

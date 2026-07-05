from fastapi import APIRouter, Depends

try:
    from ..core_runtime import get_database, require_permission
    from ..models.access import Permission, RuntimeIdentityContext
    from ..models.tenants import TenantProfilePatch, TenantProfileResponse
    from ..repositories.tenants import TenantRepository
    from ..services.activity import record_activity_event
except ImportError:
    from core_runtime import get_database, require_permission
    from models.access import Permission, RuntimeIdentityContext
    from models.tenants import TenantProfilePatch, TenantProfileResponse
    from repositories.tenants import TenantRepository
    from services.activity import record_activity_event


router = APIRouter(prefix="/tenant", tags=["Tenant"])


def repository() -> TenantRepository:
    return TenantRepository(get_database())


@router.get("", response_model=TenantProfileResponse)
async def get_current_tenant(
    context: RuntimeIdentityContext = Depends(require_permission(Permission.SETTINGS_VIEW.value)),
) -> TenantProfileResponse:
    repo = repository()
    await repo.ensure_indexes()
    tenant = await repo.get(context.tenant_id)
    if not tenant:
        tenant, _previous = await repo.upsert_current(
            context.tenant_id,
            {"name": context.tenant_id, "owner_email": context.email},
            actor_id=context.user_id,
        )
    return TenantProfileResponse(**tenant)


@router.put("", response_model=TenantProfileResponse)
async def update_current_tenant(
    payload: TenantProfilePatch,
    context: RuntimeIdentityContext = Depends(require_permission(Permission.SETTINGS_MANAGE.value)),
) -> TenantProfileResponse:
    repo = repository()
    await repo.ensure_indexes()
    tenant, previous = await repo.upsert_current(context.tenant_id, payload.model_dump(exclude_none=True), actor_id=context.user_id)
    await record_activity_event(
        get_database(),
        context,
        event_type="tenant.profile.updated",
        module="tenant",
        summary="Updated tenant profile",
        entity_type="tenant",
        entity_id=tenant["tenant_id"],
        metadata={"fields": sorted(payload.model_dump(exclude_none=True).keys())},
        changes={
            "before": {
                "name": previous.get("name") if previous else None,
                "owner_email": previous.get("owner_email") if previous else None,
            },
            "after": {
                "name": tenant.get("name"),
                "owner_email": tenant.get("owner_email"),
            },
        },
    )
    return TenantProfileResponse(**tenant)

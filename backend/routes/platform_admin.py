from fastapi import APIRouter, Depends, HTTPException, Query, status

try:
    from ..core_runtime import get_database, get_identity_context
    from ..models.access import RuntimeIdentityContext, UserRole
    from ..models.platform_admin import PlatformAdminAuditListResponse, TenantListResponse, TenantReadinessResponse, TenantStatusPatch
    from ..repositories.platform_admin import PlatformAdminRepository
except ImportError:
    from core_runtime import get_database, get_identity_context
    from models.access import RuntimeIdentityContext, UserRole
    from models.platform_admin import PlatformAdminAuditListResponse, TenantListResponse, TenantReadinessResponse, TenantStatusPatch
    from repositories.platform_admin import PlatformAdminRepository


router = APIRouter(prefix="/platform-admin", tags=["Platform Admin"])


def repository() -> PlatformAdminRepository:
    return PlatformAdminRepository(get_database())


async def require_platform_admin(context: RuntimeIdentityContext = Depends(get_identity_context)) -> RuntimeIdentityContext:
    if context.role not in {UserRole.PLATFORM_CREATOR.value, UserRole.PLATFORM_ADMIN.value}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Platform admin access required")
    return context


@router.get("/tenants", response_model=TenantListResponse)
async def list_tenants(
    search: str = "",
    status_filter: str = Query(default="", alias="status"),
    limit: int = Query(default=200, ge=1, le=500),
    _context: RuntimeIdentityContext = Depends(require_platform_admin),
) -> TenantListResponse:
    repo = repository()
    await repo.ensure_indexes()
    tenants = await repo.list_tenants(search=search, status=status_filter, limit=limit)
    return TenantListResponse(tenants=tenants, total=len(tenants))


@router.get("/tenants/{tenant_id}")
async def get_tenant(
    tenant_id: str,
    _context: RuntimeIdentityContext = Depends(require_platform_admin),
):
    repo = repository()
    await repo.ensure_indexes()
    tenant = await repo.get_tenant(tenant_id)
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return tenant


@router.patch("/tenants/{tenant_id}/status")
async def update_tenant_status(
    tenant_id: str,
    payload: TenantStatusPatch,
    context: RuntimeIdentityContext = Depends(require_platform_admin),
):
    repo = repository()
    await repo.ensure_indexes()
    tenant = await repo.update_tenant_status(tenant_id, payload.model_dump(exclude_none=True), context)
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return tenant


@router.get("/tenants/{tenant_id}/readiness", response_model=TenantReadinessResponse)
async def tenant_readiness(
    tenant_id: str,
    _context: RuntimeIdentityContext = Depends(require_platform_admin),
) -> TenantReadinessResponse:
    repo = repository()
    await repo.ensure_indexes()
    readiness = await repo.tenant_readiness(tenant_id)
    if not readiness:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return TenantReadinessResponse(**readiness)


@router.get("/audit-events", response_model=PlatformAdminAuditListResponse)
async def list_audit_events(
    tenant_id: str = "",
    limit: int = Query(default=100, ge=1, le=500),
    _context: RuntimeIdentityContext = Depends(require_platform_admin),
) -> PlatformAdminAuditListResponse:
    repo = repository()
    await repo.ensure_indexes()
    events = await repo.list_audit_events(target_tenant_id=tenant_id, limit=limit)
    return PlatformAdminAuditListResponse(events=events, total=len(events))

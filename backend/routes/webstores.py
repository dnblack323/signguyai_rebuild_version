from fastapi import APIRouter, Depends, Query

try:
    from ..core_runtime import get_database, get_tenant_id
    from ..models.webstores import WebstoreCapabilities, WebstoreLaunchReadiness
    from ..repositories.billing import FeatureEntitlementRepository
    from ..services.webstore_service import get_launch_readiness, get_webstore_capabilities
except ImportError:
    from core_runtime import get_database, get_tenant_id
    from models.webstores import WebstoreCapabilities, WebstoreLaunchReadiness
    from repositories.billing import FeatureEntitlementRepository
    from services.webstore_service import get_launch_readiness, get_webstore_capabilities

router = APIRouter(prefix="/webstores", tags=["Webstores"])


@router.get("/capabilities", response_model=WebstoreCapabilities)
async def capabilities(product_mode: str = Query(default="full_app"), tenant_id: str = Depends(get_tenant_id)):
    repo = FeatureEntitlementRepository(get_database())
    entitlement = await repo.get(tenant_id, "webstores")
    return get_webstore_capabilities(product_mode, entitlement=entitlement)


@router.get("/launch-readiness", response_model=WebstoreLaunchReadiness)
def launch_readiness():
    return get_launch_readiness()

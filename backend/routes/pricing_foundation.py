from fastapi import APIRouter, Depends

try:
    from ..core_runtime import get_database, get_tenant_id
    from ..models.pricing_foundation import PricingFoundationPayload
    from ..repositories.pricing_foundation import PricingFoundationRepository
except ImportError:
    from core_runtime import get_database, get_tenant_id
    from models.pricing_foundation import PricingFoundationPayload
    from repositories.pricing_foundation import PricingFoundationRepository


router = APIRouter(prefix="/pricing-foundation", tags=["Pricing Foundation"])


def repository() -> PricingFoundationRepository:
    return PricingFoundationRepository(get_database())


@router.get("")
async def get_pricing_foundation(tenant_id: str = Depends(get_tenant_id)):
    repo = repository()
    await repo.ensure_indexes()
    existing = await repo.get_default(tenant_id)
    return existing or {
        "id": "",
        "tenant_id": tenant_id,
        "key": "default",
        "status": "active",
        "source": "default",
        "settings": {},
        "quiz_answers": {},
        "applied_suggestions": [],
        "notes": "",
        "version": 0,
    }


@router.put("")
async def save_pricing_foundation(payload: PricingFoundationPayload, tenant_id: str = Depends(get_tenant_id)):
    repo = repository()
    await repo.ensure_indexes()
    return await repo.upsert_default(tenant_id, payload.model_dump())

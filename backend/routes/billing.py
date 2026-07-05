from fastapi import APIRouter, Depends, Query

try:
    from ..core_runtime import get_database, require_permission
    from ..models.access import Permission, RuntimeIdentityContext
    from ..models.billing import (
        CreditBankRequest,
        CreditBankResponse,
        FeatureEntitlementListResponse,
        FeatureEntitlementPayload,
        PlatformFeeRequest,
        PlatformFeeResponse,
    )
    from ..repositories.billing import FeatureEntitlementRepository
    from ..services.activity import record_activity_event
    from ..services.billing_rules import billing_catalog, calculate_monthly_credit_bank, determine_transaction_fee_basis_points
except ImportError:
    from core_runtime import get_database, require_permission
    from models.access import Permission, RuntimeIdentityContext
    from models.billing import (
        CreditBankRequest,
        CreditBankResponse,
        FeatureEntitlementListResponse,
        FeatureEntitlementPayload,
        PlatformFeeRequest,
        PlatformFeeResponse,
    )
    from repositories.billing import FeatureEntitlementRepository
    from services.activity import record_activity_event
    from services.billing_rules import billing_catalog, calculate_monthly_credit_bank, determine_transaction_fee_basis_points


router = APIRouter(prefix="/billing", tags=["Billing"])


def repository() -> FeatureEntitlementRepository:
    return FeatureEntitlementRepository(get_database())


@router.get("/catalog")
async def get_billing_catalog(
    _context: RuntimeIdentityContext = Depends(require_permission(Permission.SETTINGS_VIEW.value)),
):
    return billing_catalog()


@router.post("/credit-bank", response_model=CreditBankResponse)
async def preview_credit_bank(
    payload: CreditBankRequest,
    _context: RuntimeIdentityContext = Depends(require_permission(Permission.SETTINGS_VIEW.value)),
) -> CreditBankResponse:
    return CreditBankResponse(
        monthly_credits=calculate_monthly_credit_bank(payload.product_ids, payload.phase),
        product_ids=payload.product_ids,
        phase=payload.phase,
    )


@router.post("/platform-fee", response_model=PlatformFeeResponse)
async def preview_platform_fee(
    payload: PlatformFeeRequest,
    _context: RuntimeIdentityContext = Depends(require_permission(Permission.SETTINGS_VIEW.value)),
) -> PlatformFeeResponse:
    basis_points, reason = determine_transaction_fee_basis_points(
        phase=payload.phase,
        checkout_channel=payload.checkout_channel,
        shop_onboarded_index=payload.shop_onboarded_index,
        has_redeemed_promo_code=payload.has_redeemed_promo_code,
        months_since_promo_applied=payload.months_since_promo_applied,
    )
    return PlatformFeeResponse(basis_points=basis_points, rate=basis_points / 10000, reason=reason)


@router.get("/feature-entitlements", response_model=FeatureEntitlementListResponse)
async def list_feature_entitlements(
    status: str = "",
    feature_key: str = "",
    _limit: int = Query(default=100, ge=1, le=250),
    context: RuntimeIdentityContext = Depends(require_permission(Permission.SETTINGS_VIEW.value)),
) -> FeatureEntitlementListResponse:
    repo = repository()
    await repo.ensure_indexes()
    rows = await repo.list(context.tenant_id, status=status, feature_key=feature_key)
    return FeatureEntitlementListResponse(entitlements=rows, total=len(rows))


@router.put("/feature-entitlements/{feature_key}")
async def upsert_feature_entitlement(
    feature_key: str,
    payload: FeatureEntitlementPayload,
    context: RuntimeIdentityContext = Depends(require_permission(Permission.SETTINGS_MANAGE.value)),
):
    repo = repository()
    await repo.ensure_indexes()
    saved = await repo.upsert(context.tenant_id, feature_key, payload.model_dump(), actor_id=context.user_id)
    await record_activity_event(
        get_database(),
        context,
        event_type="billing.entitlement.updated",
        module="billing",
        summary=f"Updated entitlement {feature_key}",
        entity_type="feature_entitlement",
        entity_id=saved["id"],
        metadata={
            "feature_key": feature_key,
            "status": saved.get("status"),
            "source_product_id": saved.get("source_product_id"),
            "mode": saved.get("mode"),
        },
    )
    return saved

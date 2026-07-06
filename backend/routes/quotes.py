from fastapi import APIRouter, Depends, HTTPException, Query, status

try:
    from ..core_runtime import get_database, get_identity_context
    from ..models.orders import PricingCalculatePayload, PricingOverridePayload
    from ..models.quotes import QuoteApprovalPayload, QuoteDeclinePayload, QuoteLineItemPatch, QuoteLineItemPayload, QuotePatch, QuotePayload
    from ..repositories.doculink import DocuLinkRepository
    from ..repositories.orders import OrdersRepository
    from ..repositories.pricing_foundation import PricingFoundationRepository
    from ..repositories.quotes import QuotesRepository
    from ..services.pricing_engine import calculate_item_price
except ImportError:
    from core_runtime import get_database, get_identity_context
    from models.orders import PricingCalculatePayload, PricingOverridePayload
    from models.quotes import QuoteApprovalPayload, QuoteDeclinePayload, QuoteLineItemPatch, QuoteLineItemPayload, QuotePatch, QuotePayload
    from repositories.doculink import DocuLinkRepository
    from repositories.orders import OrdersRepository
    from repositories.pricing_foundation import PricingFoundationRepository
    from repositories.quotes import QuotesRepository
    from services.pricing_engine import calculate_item_price


quotes_router = APIRouter(prefix="/quotes", tags=["Quotes"])


def repository() -> QuotesRepository:
    return QuotesRepository(get_database())


def orders_repository() -> OrdersRepository:
    return OrdersRepository(get_database())


def doculink_repository() -> DocuLinkRepository:
    return DocuLinkRepository(get_database())


def pricing_foundation_repository() -> PricingFoundationRepository:
    return PricingFoundationRepository(get_database())


async def _foundation_settings(tenant_id: str) -> dict:
    foundation = await pricing_foundation_repository().get_default(tenant_id)
    return (foundation or {}).get("settings", {})


@quotes_router.get("")
async def list_quotes(
    context=Depends(get_identity_context),
    status_filter: str = Query(default="", alias="status"),
    customer_id: str = "",
):
    repo = repository()
    await repo.ensure_indexes()
    return await repo.list_quotes(context.tenant_id, {"status": status_filter, "customer_id": customer_id})


@quotes_router.post("", status_code=status.HTTP_201_CREATED)
async def create_quote(payload: QuotePayload, context=Depends(get_identity_context)):
    repo = repository()
    await repo.ensure_indexes()
    data = payload.model_dump(exclude_none=True)
    data["line_items"] = [item for item in data.get("line_items", [])]
    return await repo.create_quote(context.tenant_id, data, actor_id=context.user_id)


@quotes_router.get("/{quote_id}")
async def get_quote(quote_id: str, context=Depends(get_identity_context)):
    quote = await repository().get_quote(context.tenant_id, quote_id)
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    return quote


@quotes_router.put("/{quote_id}")
async def update_quote(quote_id: str, payload: QuotePatch, context=Depends(get_identity_context)):
    try:
        updated = await repository().update_quote(context.tenant_id, quote_id, payload.model_dump(exclude_none=True), actor_id=context.user_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    if not updated:
        raise HTTPException(status_code=404, detail="Quote not found")
    return updated


@quotes_router.delete("/{quote_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quote(quote_id: str, context=Depends(get_identity_context)):
    if not await repository().delete_quote(context.tenant_id, quote_id):
        raise HTTPException(status_code=404, detail="Quote not found or already converted")


@quotes_router.get("/{quote_id}/activity")
async def quote_activity(quote_id: str, context=Depends(get_identity_context)):
    return await repository().list_events(context.tenant_id, quote_id)


@quotes_router.post("/{quote_id}/items", status_code=status.HTTP_201_CREATED)
async def add_quote_item(quote_id: str, payload: QuoteLineItemPayload, context=Depends(get_identity_context)):
    try:
        return await repository().add_item(context.tenant_id, quote_id, payload.model_dump(exclude_none=True), actor_id=context.user_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@quotes_router.put("/{quote_id}/items/{item_id}")
async def update_quote_item(quote_id: str, item_id: str, payload: QuoteLineItemPatch, context=Depends(get_identity_context)):
    try:
        updated = await repository().update_item(context.tenant_id, quote_id, item_id, payload.model_dump(exclude_none=True), actor_id=context.user_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    if not updated:
        raise HTTPException(status_code=404, detail="Quote line item not found")
    return updated


@quotes_router.delete("/{quote_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quote_item(quote_id: str, item_id: str, context=Depends(get_identity_context)):
    try:
        deleted = await repository().delete_item(context.tenant_id, quote_id, item_id, actor_id=context.user_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    if not deleted:
        raise HTTPException(status_code=404, detail="Quote line item not found")


@quotes_router.post("/{quote_id}/items/{item_id}/calculate-pricing")
async def calculate_quote_item_pricing(quote_id: str, item_id: str, payload: PricingCalculatePayload, context=Depends(get_identity_context)):
    repo = repository()
    items = await repo.list_items(context.tenant_id, quote_id)
    item = next((row for row in items if row["id"] == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Quote line item not found")
    specs = {**item.get("specs", {}), **payload.specs}
    foundation = await _foundation_settings(context.tenant_id)
    calculation = calculate_item_price(item["item_category"], item.get("quantity", 1), specs, foundation)
    try:
        updated = await repo.update_item(context.tenant_id, quote_id, item_id, {
            "specs": specs,
            "estimated_price_minor": calculation["selling_price_minor"],
            "material_estimate_minor": calculation["material_cost_minor"],
            "labor_estimate_minor": calculation["labor_cost_minor"],
        }, actor_id=context.user_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return {"calculation": calculation, "item": updated}


@quotes_router.post("/{quote_id}/items/{item_id}/override-pricing")
async def override_quote_item_pricing(quote_id: str, item_id: str, payload: PricingOverridePayload, context=Depends(get_identity_context)):
    try:
        updated = await repository().set_pricing_override(context.tenant_id, quote_id, item_id, payload.override_price_minor, payload.reason, context.user_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    if not updated:
        raise HTTPException(status_code=404, detail="Quote line item not found")
    return updated


@quotes_router.post("/{quote_id}/send")
async def send_quote(quote_id: str, context=Depends(get_identity_context)):
    try:
        updated = await repository().send_quote(context.tenant_id, quote_id, actor_id=context.user_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    if not updated:
        raise HTTPException(status_code=404, detail="Quote not found")
    return updated


@quotes_router.post("/{quote_id}/approve")
async def approve_quote(quote_id: str, payload: QuoteApprovalPayload, context=Depends(get_identity_context)):
    try:
        updated = await repository().approve_quote(context.tenant_id, quote_id, payload.model_dump(exclude_none=True), actor_id=context.user_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    if not updated:
        raise HTTPException(status_code=404, detail="Quote not found")
    return updated


@quotes_router.post("/{quote_id}/decline")
async def decline_quote(quote_id: str, payload: QuoteDeclinePayload, context=Depends(get_identity_context)):
    try:
        updated = await repository().decline_quote(context.tenant_id, quote_id, payload.decline_reason, actor_id=context.user_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    if not updated:
        raise HTTPException(status_code=404, detail="Quote not found")
    return updated


@quotes_router.post("/{quote_id}/convert-to-order")
async def convert_quote_to_order(quote_id: str, context=Depends(get_identity_context)):
    try:
        return await repository().convert_to_order(context.tenant_id, quote_id, orders_repository(), actor_id=context.user_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@quotes_router.get("/{quote_id}/files")
async def quote_files(quote_id: str, context=Depends(get_identity_context)):
    return await doculink_repository().list_links(context.tenant_id, entity_type="quote", entity_id=quote_id)

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

try:
    from ..core_runtime import get_database, get_tenant_id
    from ..models.orders import LinkArtworkPayload, OrderItemPatch, OrderItemPayload, OrderPatch, OrderPayload, PricingCalculatePayload, QuoteDraftPatch
    from ..repositories.doculink import DocuLinkRepository
    from ..repositories.orders import OrdersRepository
    from ..services.order_schemas import category_schema
    from ..services.pricing_engine import calculate_item_price
except ImportError:
    from core_runtime import get_database, get_tenant_id
    from models.orders import LinkArtworkPayload, OrderItemPatch, OrderItemPayload, OrderPatch, OrderPayload, PricingCalculatePayload, QuoteDraftPatch
    from repositories.doculink import DocuLinkRepository
    from repositories.orders import OrdersRepository
    from services.order_schemas import category_schema
    from services.pricing_engine import calculate_item_price


orders_router = APIRouter(prefix="/orders", tags=["Orders"])
items_router = APIRouter(prefix="/order-items", tags=["Order Items"])


def repository() -> OrdersRepository:
    return OrdersRepository(get_database())


def doculink_repository() -> DocuLinkRepository:
    return DocuLinkRepository(get_database())


@orders_router.get("")
async def list_orders(
    tenant_id: str = Depends(get_tenant_id),
    status_filter: str = Query(default="", alias="status"),
    source: str = "",
    customer_id: str = "",
):
    repo = repository()
    await repo.ensure_indexes()
    return await repo.list_orders(tenant_id, {"status": status_filter, "order_source": source, "customer_id": customer_id})


@orders_router.post("", status_code=status.HTTP_201_CREATED)
async def create_order(payload: OrderPayload, tenant_id: str = Depends(get_tenant_id)):
    repo = repository()
    await repo.ensure_indexes()
    return await repo.create_order(tenant_id, payload.model_dump(exclude_none=True))


@orders_router.get("/{order_id}")
async def get_order(order_id: str, tenant_id: str = Depends(get_tenant_id)):
    order = await repository().get_order(tenant_id, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@orders_router.put("/{order_id}")
async def update_order(order_id: str, payload: OrderPatch, tenant_id: str = Depends(get_tenant_id)):
    updated = await repository().update_order(tenant_id, order_id, payload.model_dump(exclude_none=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Order not found")
    return updated


@orders_router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_order(order_id: str, tenant_id: str = Depends(get_tenant_id)):
    if not await repository().delete_order(tenant_id, order_id):
        raise HTTPException(status_code=404, detail="Order not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@orders_router.post("/{order_id}/items", status_code=status.HTTP_201_CREATED)
async def create_order_item(order_id: str, payload: OrderItemPayload, tenant_id: str = Depends(get_tenant_id)):
    repo = repository()
    await repo.ensure_indexes()
    data = payload.model_dump(exclude_none=True)
    data["order_id"] = order_id
    try:
        return await repo.create_item(tenant_id, data)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@orders_router.get("/{order_id}/items")
async def list_order_items(order_id: str, tenant_id: str = Depends(get_tenant_id)):
    return await repository().list_items(tenant_id, order_id=order_id)


@orders_router.get("/{order_id}/activity")
async def order_activity(order_id: str, tenant_id: str = Depends(get_tenant_id)):
    return await repository().list_events(tenant_id, order_id)


@orders_router.get("/{order_id}/production-summary")
async def production_summary(order_id: str, tenant_id: str = Depends(get_tenant_id)):
    order = await repository().get_order(tenant_id, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    items = order.get("items", [])
    work_orders = await repository().list_work_order_drafts(tenant_id, order_id)
    return {
        "order_id": order_id,
        "item_count": len(items),
        "completed_items": sum(1 for item in items if item.get("status") == "completed"),
        "overall_progress": order.get("overall_progress", 0),
        "status_counts": {status: sum(1 for item in items if item.get("status") == status) for status in sorted({item.get("status") for item in items})},
        "work_order_draft_count": len(work_orders),
        "latest_work_order_draft": work_orders[0] if work_orders else None,
    }


@orders_router.get("/{order_id}/financials")
async def order_financials(order_id: str, tenant_id: str = Depends(get_tenant_id)):
    order = await repository().get_order(tenant_id, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    quote_drafts = await repository().list_quote_drafts(tenant_id, order_id)
    invoice_drafts = await repository().list_invoice_drafts(tenant_id, order_id)
    return {
        "order_id": order_id,
        "estimated_total_minor": order.get("estimated_total_minor", 0),
        "payment_status": order.get("payment_status", "unpaid"),
        "item_count": order.get("order_item_count", 0),
        "quote_draft_count": len(quote_drafts),
        "latest_quote_draft": quote_drafts[0] if quote_drafts else None,
        "invoice_draft_count": len(invoice_drafts),
        "latest_invoice_draft": invoice_drafts[0] if invoice_drafts else None,
        "invoice_total_minor": invoice_drafts[0].get("total_minor", 0) if invoice_drafts else 0,
        "balance_due_minor": invoice_drafts[0].get("balance_due_minor", order.get("estimated_total_minor", 0)) if invoice_drafts else order.get("estimated_total_minor", 0),
    }


@orders_router.get("/{order_id}/quotes")
async def order_quote_drafts(order_id: str, tenant_id: str = Depends(get_tenant_id)):
    if not await repository().get_order(tenant_id, order_id, include_items=False):
        raise HTTPException(status_code=404, detail="Order not found")
    return await repository().list_quote_drafts(tenant_id, order_id)


@orders_router.put("/{order_id}/quotes/{quote_id}")
async def update_order_quote_draft(order_id: str, quote_id: str, payload: QuoteDraftPatch, tenant_id: str = Depends(get_tenant_id)):
    updated = await repository().update_quote_draft(tenant_id, order_id, quote_id, payload.model_dump(exclude_none=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Quote draft not found")
    return updated


@orders_router.get("/{order_id}/invoices")
async def order_invoice_drafts(order_id: str, tenant_id: str = Depends(get_tenant_id)):
    if not await repository().get_order(tenant_id, order_id, include_items=False):
        raise HTTPException(status_code=404, detail="Order not found")
    return await repository().list_invoice_drafts(tenant_id, order_id)


@orders_router.get("/{order_id}/work-orders")
async def order_work_order_drafts(order_id: str, tenant_id: str = Depends(get_tenant_id)):
    if not await repository().get_order(tenant_id, order_id, include_items=False):
        raise HTTPException(status_code=404, detail="Order not found")
    return await repository().list_work_order_drafts(tenant_id, order_id)


@orders_router.get("/{order_id}/files")
async def order_files(order_id: str, tenant_id: str = Depends(get_tenant_id)):
    return await doculink_repository().list_links(tenant_id, entity_type="order", entity_id=order_id)


@orders_router.post("/{order_id}/upload")
async def order_upload_placeholder(order_id: str):
    raise HTTPException(status_code=409, detail="Use /api/doculink/files/upload with entity_type=order and this order ID")


@orders_router.post("/{order_id}/generate-quote")
async def generate_quote_placeholder(order_id: str, tenant_id: str = Depends(get_tenant_id)):
    repo = repository()
    await repo.ensure_indexes()
    try:
        return await repo.generate_quote_draft(tenant_id, order_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@orders_router.post("/{order_id}/generate-invoice")
async def generate_invoice_placeholder(order_id: str, tenant_id: str = Depends(get_tenant_id)):
    repo = repository()
    await repo.ensure_indexes()
    try:
        return await repo.generate_invoice_draft(tenant_id, order_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@orders_router.post("/{order_id}/generate-work_order")
async def generate_work_order_placeholder(order_id: str, tenant_id: str = Depends(get_tenant_id)):
    repo = repository()
    await repo.ensure_indexes()
    try:
        return await repo.generate_work_order_draft(tenant_id, order_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@orders_router.post("/{order_id}/start-production")
async def start_production(order_id: str, tenant_id: str = Depends(get_tenant_id)):
    updated = await repository().update_order(tenant_id, order_id, {"status": "in_production"})
    if not updated:
        raise HTTPException(status_code=404, detail="Order not found")
    return updated


@items_router.get("")
async def list_order_items_direct(tenant_id: str = Depends(get_tenant_id), order_id: str = "", category: str = ""):
    repo = repository()
    await repo.ensure_indexes()
    return await repo.list_items(tenant_id, order_id=order_id, category=category)


@items_router.post("", status_code=status.HTTP_201_CREATED)
async def create_order_item_direct(payload: OrderItemPayload, tenant_id: str = Depends(get_tenant_id)):
    repo = repository()
    await repo.ensure_indexes()
    try:
        return await repo.create_item(tenant_id, payload.model_dump(exclude_none=True))
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@items_router.get("/schema/{category}")
async def get_category_schema(category: str):
    return category_schema(category)


@items_router.get("/{item_id}")
async def get_order_item(item_id: str, tenant_id: str = Depends(get_tenant_id)):
    item = await repository().get_item(tenant_id, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found")
    return item


@items_router.put("/{item_id}")
async def update_order_item(item_id: str, payload: OrderItemPatch, tenant_id: str = Depends(get_tenant_id)):
    updated = await repository().update_item(tenant_id, item_id, payload.model_dump(exclude_none=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Order item not found")
    return updated


@items_router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_order_item(item_id: str, tenant_id: str = Depends(get_tenant_id)):
    if not await repository().delete_item(tenant_id, item_id):
        raise HTTPException(status_code=404, detail="Order item not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@items_router.post("/{item_id}/clone", status_code=status.HTTP_201_CREATED)
async def clone_order_item(item_id: str, tenant_id: str = Depends(get_tenant_id)):
    repo = repository()
    source = await repo.get_item(tenant_id, item_id)
    if not source:
        raise HTTPException(status_code=404, detail="Order item not found")
    clone = {key: value for key, value in source.items() if key not in {"id", "item_number", "created_at", "updated_at", "version", "latest_pricing_snapshot"}}
    clone["item_name"] = f"{clone.get('item_name', 'Item')} Copy"
    return await repo.create_item(tenant_id, clone)


@items_router.post("/{item_id}/calculate-pricing")
async def calculate_pricing(item_id: str, payload: PricingCalculatePayload, tenant_id: str = Depends(get_tenant_id)):
    repo = repository()
    item = await repo.get_item(tenant_id, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found")
    specs = {**item.get("specs", {}), **payload.specs}
    calculation = calculate_item_price(item["item_category"], item.get("quantity", 1), specs)
    if payload.save_snapshot:
        snapshot = await repo.save_pricing_snapshot(tenant_id, item, calculation)
        return {"calculation": calculation, "snapshot": snapshot}
    return calculation


@items_router.post("/{item_id}/save-pricing")
async def save_pricing(item_id: str, payload: PricingCalculatePayload, tenant_id: str = Depends(get_tenant_id)):
    repo = repository()
    item = await repo.get_item(tenant_id, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found")
    specs = {**item.get("specs", {}), **payload.specs}
    calculation = calculate_item_price(item["item_category"], item.get("quantity", 1), specs)
    snapshot = await repo.save_pricing_snapshot(tenant_id, item, calculation)
    return {"calculation": calculation, "snapshot": snapshot}

@orders_router.post("/{order_id}/items/{item_id}/link-artwork")
async def link_artwork(order_id: str, item_id: str, payload: LinkArtworkPayload, tenant_id: str = Depends(get_tenant_id)):
    item = await repository().get_item(tenant_id, item_id)
    if not item or item["order_id"] != order_id:
        raise HTTPException(status_code=404, detail="Order item not found")
    try:
        return await doculink_repository().create_file_link(tenant_id, {
            "file_id": payload.file_id,
            "entity_type": "order_item",
            "entity_id": item_id,
            "relationship_type": payload.relationship_type,
        })
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

from fastapi import APIRouter, Depends, HTTPException, Query, status

try:
    from ..core_runtime import get_database, get_identity_context
    from ..models.invoices import InvoicePatch, InvoicePaymentPayload
    from ..repositories.doculink import DocuLinkRepository
    from ..repositories.invoices import InvoicesRepository
except ImportError:
    from core_runtime import get_database, get_identity_context
    from models.invoices import InvoicePatch, InvoicePaymentPayload
    from repositories.doculink import DocuLinkRepository
    from repositories.invoices import InvoicesRepository


invoices_router = APIRouter(prefix="/invoices", tags=["Invoices"])


def repository() -> InvoicesRepository:
    return InvoicesRepository(get_database())


def doculink_repository() -> DocuLinkRepository:
    return DocuLinkRepository(get_database())


@invoices_router.get("")
async def list_invoices(
    context=Depends(get_identity_context),
    status_filter: str = Query(default="", alias="status"),
    order_id: str = "",
    customer_id: str = "",
):
    repo = repository()
    await repo.ensure_indexes()
    return await repo.list_invoices(context.tenant_id, {"status": status_filter, "order_id": order_id, "customer_id": customer_id})


@invoices_router.post("/generate-from-order/{order_id}", status_code=status.HTTP_201_CREATED)
async def generate_invoice_from_order(order_id: str, context=Depends(get_identity_context)):
    repo = repository()
    await repo.ensure_indexes()
    try:
        return await repo.generate_from_order(context.tenant_id, order_id, actor_id=context.user_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@invoices_router.get("/{invoice_id}")
async def get_invoice(invoice_id: str, context=Depends(get_identity_context)):
    invoice = await repository().get_invoice(context.tenant_id, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@invoices_router.put("/{invoice_id}")
async def update_invoice(invoice_id: str, payload: InvoicePatch, context=Depends(get_identity_context)):
    try:
        updated = await repository().update_invoice(context.tenant_id, invoice_id, payload.model_dump(exclude_none=True), actor_id=context.user_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    if not updated:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return updated


@invoices_router.post("/{invoice_id}/record-payment")
async def record_payment(invoice_id: str, payload: InvoicePaymentPayload, context=Depends(get_identity_context)):
    try:
        updated = await repository().record_payment(context.tenant_id, invoice_id, payload.model_dump(exclude_none=True), actor_id=context.user_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    if not updated:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return updated


@invoices_router.get("/{invoice_id}/activity")
async def invoice_activity(invoice_id: str, context=Depends(get_identity_context)):
    return await repository().list_events(context.tenant_id, invoice_id)


@invoices_router.get("/{invoice_id}/files")
async def invoice_files(invoice_id: str, context=Depends(get_identity_context)):
    return await doculink_repository().list_links(context.tenant_id, entity_type="invoice", entity_id=invoice_id)

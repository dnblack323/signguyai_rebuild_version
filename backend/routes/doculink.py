from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse

try:
    from ..core_runtime import get_database, get_tenant_id
    from ..models.doculink import BusinessDocumentPayload, DocumentSharePayload, DocumentUpdatePayload, FileLinkPayload, DocumentLinkPayload
    from ..repositories.doculink import DocuLinkRepository
    from ..services.doculink_storage import get_object_storage
except ImportError:
    from core_runtime import get_database, get_tenant_id
    from models.doculink import BusinessDocumentPayload, DocumentSharePayload, DocumentUpdatePayload, FileLinkPayload, DocumentLinkPayload
    from repositories.doculink import DocuLinkRepository
    from services.doculink_storage import get_object_storage


router = APIRouter(prefix="/doculink", tags=["DocuLink"])


def repository() -> DocuLinkRepository:
    return DocuLinkRepository(get_database())


def actor_id(x_actor_id: str = Query(default="preview-user")) -> str:
    return x_actor_id or "preview-user"


@router.get("/documents")
async def list_documents(
    tenant_id: str = Depends(get_tenant_id),
    status_filter: str = Query(default="", alias="status"),
    visibility: str = "",
    document_type: str = "",
    customer_id: str = "",
    order_id: str = "",
):
    repo = repository()
    await repo.ensure_indexes()
    return await repo.list_documents(tenant_id, {
        "status": status_filter,
        "visibility": visibility,
        "document_type": document_type,
        "customer_id": customer_id,
        "order_id": order_id,
    })


@router.post("/documents", status_code=status.HTTP_201_CREATED)
async def create_document(payload: BusinessDocumentPayload, tenant_id: str = Depends(get_tenant_id), actor: str = Depends(actor_id)):
    repo = repository()
    await repo.ensure_indexes()
    data = payload.model_dump(exclude_none=True)
    if data.get("source_type") == "ai_generated":
        data["ai_generated"] = True
        data["status"] = data.get("status") or "draft"
        data["requires_review"] = True
    return await repo.create_document(tenant_id, data, actor_id=actor)


@router.get("/documents/{document_id}")
async def get_document(document_id: str, tenant_id: str = Depends(get_tenant_id)):
    document = await repository().get_document(tenant_id, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


@router.put("/documents/{document_id}")
async def update_document(document_id: str, payload: DocumentUpdatePayload, tenant_id: str = Depends(get_tenant_id), actor: str = Depends(actor_id)):
    try:
        updated = await repository().update_document(tenant_id, document_id, payload.model_dump(exclude_none=True), actor_id=actor)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    if not updated:
        raise HTTPException(status_code=404, detail="Document not found")
    return updated


@router.post("/files/upload", status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    tenant_id: str = Depends(get_tenant_id),
    actor: str = Depends(actor_id),
    document_id: str = Form(default=""),
    entity_type: str = Form(default=""),
    entity_id: str = Form(default=""),
    relationship_type: str = Form(default="attachment"),
):
    repo = repository()
    await repo.ensure_indexes()
    storage_payload = await get_object_storage().save_upload(tenant_id, file, document_id=document_id or None)
    created = await repo.create_file(tenant_id, storage_payload, actor_id=actor)
    if entity_type and entity_id:
        await repo.create_file_link(tenant_id, {
            "file_id": created["id"],
            "entity_type": entity_type,
            "entity_id": entity_id,
            "relationship_type": relationship_type,
        }, actor_id=actor)
    if document_id:
        document = await repo.get_document(tenant_id, document_id)
        if document:
            patch = {"primary_file_id": document.get("primary_file_id") or created["id"]}
            await repo.update_document(tenant_id, document_id, patch, actor_id=actor)
            await repo.record_activity(tenant_id, document_id, "uploaded", actor_id=actor, metadata={"file_id": created["id"]})
    return created


@router.get("/files")
async def list_files(
    tenant_id: str = Depends(get_tenant_id),
    mime_type: str = "",
    scan_status: str = "",
):
    repo = repository()
    await repo.ensure_indexes()
    return await repo.list_files(tenant_id, {"mime_type": mime_type, "scan_status": scan_status})


@router.get("/files/{file_id}")
async def get_file(file_id: str, tenant_id: str = Depends(get_tenant_id)):
    file_record = await repository().get_file(tenant_id, file_id)
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    return file_record


@router.get("/files/{file_id}/download")
async def download_file(file_id: str, tenant_id: str = Depends(get_tenant_id), actor: str = Depends(actor_id)):
    repo = repository()
    file_record = await repo.get_file_for_download(tenant_id, file_id)
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    path = get_object_storage().resolve_path(file_record["object_path"])
    await repo.record_activity(tenant_id, "", "downloaded", actor_id=actor, metadata={"file_id": file_id})
    return FileResponse(path, media_type=file_record.get("mime_type") or "application/octet-stream", filename=file_record.get("original_filename"))


@router.post("/files/{file_id}/links", status_code=status.HTTP_201_CREATED)
async def link_file(file_id: str, payload: FileLinkPayload, tenant_id: str = Depends(get_tenant_id), actor: str = Depends(actor_id)):
    repo = repository()
    await repo.ensure_indexes()
    data = payload.model_dump(exclude_none=True) | {"file_id": file_id}
    try:
        return await repo.create_file_link(tenant_id, data, actor_id=actor)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/documents/{document_id}/links", status_code=status.HTTP_201_CREATED)
async def link_document(document_id: str, payload: DocumentLinkPayload, tenant_id: str = Depends(get_tenant_id), actor: str = Depends(actor_id)):
    repo = repository()
    await repo.ensure_indexes()
    data = payload.model_dump(exclude_none=True) | {"document_id": document_id}
    try:
        return await repo.create_document_link(tenant_id, data, actor_id=actor)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/links")
async def list_links(tenant_id: str = Depends(get_tenant_id), entity_type: str = "", entity_id: str = ""):
    return await repository().list_links(tenant_id, entity_type=entity_type, entity_id=entity_id)


@router.post("/documents/{document_id}/shares", status_code=status.HTTP_201_CREATED)
async def share_document(document_id: str, payload: DocumentSharePayload, tenant_id: str = Depends(get_tenant_id), actor: str = Depends(actor_id)):
    try:
        return await repository().create_share(tenant_id, document_id, payload.model_dump(exclude_none=True), actor_id=actor)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/documents/{document_id}/activities")
async def document_activities(document_id: str, tenant_id: str = Depends(get_tenant_id)):
    return await repository().list_activities(tenant_id, document_id)

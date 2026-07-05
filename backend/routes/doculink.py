from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse

try:
    from ..core_runtime import get_database, require_permission
    from ..models.access import Permission, RuntimeIdentityContext
    from ..models.doculink import BusinessDocumentPayload, DocumentSharePayload, DocumentUpdatePayload, FileLinkPayload, DocumentLinkPayload
    from ..repositories.doculink import DocuLinkRepository
    from ..services.activity import record_activity_event
    from ..services.doculink_storage import get_object_storage
except ImportError:
    from core_runtime import get_database, require_permission
    from models.access import Permission, RuntimeIdentityContext
    from models.doculink import BusinessDocumentPayload, DocumentSharePayload, DocumentUpdatePayload, FileLinkPayload, DocumentLinkPayload
    from repositories.doculink import DocuLinkRepository
    from services.activity import record_activity_event
    from services.doculink_storage import get_object_storage


router = APIRouter(prefix="/doculink", tags=["DocuLink"])


def repository() -> DocuLinkRepository:
    return DocuLinkRepository(get_database())


@router.get("/documents")
async def list_documents(
    context: RuntimeIdentityContext = Depends(require_permission(Permission.FILES_VIEW.value)),
    status_filter: str = Query(default="", alias="status"),
    visibility: str = "",
    document_type: str = "",
    customer_id: str = "",
    order_id: str = "",
):
    repo = repository()
    await repo.ensure_indexes()
    return await repo.list_documents(context.tenant_id, {
        "status": status_filter,
        "visibility": visibility,
        "document_type": document_type,
        "customer_id": customer_id,
        "order_id": order_id,
    })


@router.post("/documents", status_code=status.HTTP_201_CREATED)
async def create_document(payload: BusinessDocumentPayload, context: RuntimeIdentityContext = Depends(require_permission(Permission.FILES_UPLOAD.value))):
    repo = repository()
    await repo.ensure_indexes()
    data = payload.model_dump(exclude_none=True)
    if data.get("source_type") == "ai_generated":
        data["ai_generated"] = True
        data["status"] = data.get("status") or "draft"
        data["requires_review"] = True
    return await repo.create_document(context.tenant_id, data, actor_id=context.user_id)


@router.get("/documents/{document_id}")
async def get_document(document_id: str, context: RuntimeIdentityContext = Depends(require_permission(Permission.FILES_VIEW.value))):
    document = await repository().get_document(context.tenant_id, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


@router.put("/documents/{document_id}")
async def update_document(document_id: str, payload: DocumentUpdatePayload, context: RuntimeIdentityContext = Depends(require_permission(Permission.FILES_UPLOAD.value))):
    try:
        updated = await repository().update_document(context.tenant_id, document_id, payload.model_dump(exclude_none=True), actor_id=context.user_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    if not updated:
        raise HTTPException(status_code=404, detail="Document not found")
    return updated


@router.post("/files/upload", status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    context: RuntimeIdentityContext = Depends(require_permission(Permission.FILES_UPLOAD.value)),
    document_id: str = Form(default=""),
    entity_type: str = Form(default=""),
    entity_id: str = Form(default=""),
    relationship_type: str = Form(default="attachment"),
    customer_visible: bool = Form(default=False),
):
    tenant_id = context.tenant_id
    actor = context.user_id
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
            "customer_visible": customer_visible,
        }, actor_id=actor)
    if document_id:
        document = await repo.get_document(tenant_id, document_id)
        if document:
            patch = {"primary_file_id": document.get("primary_file_id") or created["id"]}
            await repo.update_document(tenant_id, document_id, patch, actor_id=actor)
            await repo.record_activity(tenant_id, document_id, "uploaded", actor_id=actor, metadata={"file_id": created["id"]})
    await record_activity_event(
        get_database(),
        context,
        event_type="files.uploaded",
        module="files",
        summary=f"Uploaded {created.get('original_filename')}",
        entity_type="file",
        entity_id=created["id"],
        metadata={
            "mime_type": created.get("mime_type"),
            "size_bytes": created.get("size_bytes"),
            "document_id": document_id,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "customer_visible": customer_visible,
        },
    )
    return created


@router.get("/files")
async def list_files(
    context: RuntimeIdentityContext = Depends(require_permission(Permission.FILES_VIEW.value)),
    mime_type: str = "",
    scan_status: str = "",
):
    repo = repository()
    await repo.ensure_indexes()
    return await repo.list_files(context.tenant_id, {"mime_type": mime_type, "scan_status": scan_status})


@router.get("/files/{file_id}")
async def get_file(file_id: str, context: RuntimeIdentityContext = Depends(require_permission(Permission.FILES_VIEW.value))):
    file_record = await repository().get_file(context.tenant_id, file_id)
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    return file_record


@router.get("/files/{file_id}/download")
async def download_file(file_id: str, context: RuntimeIdentityContext = Depends(require_permission(Permission.FILES_VIEW.value))):
    repo = repository()
    file_record = await repo.get_file_for_download(context.tenant_id, file_id)
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    path = get_object_storage().resolve_path(file_record["object_path"])
    await repo.record_activity(context.tenant_id, "", "downloaded", actor_id=context.user_id, metadata={"file_id": file_id})
    await record_activity_event(
        get_database(),
        context,
        event_type="files.downloaded",
        module="files",
        summary=f"Downloaded {file_record.get('original_filename')}",
        entity_type="file",
        entity_id=file_id,
        metadata={
            "mime_type": file_record.get("mime_type"),
            "size_bytes": file_record.get("size_bytes"),
        },
    )
    return FileResponse(path, media_type=file_record.get("mime_type") or "application/octet-stream", filename=file_record.get("original_filename"))


@router.post("/files/{file_id}/links", status_code=status.HTTP_201_CREATED)
async def link_file(file_id: str, payload: FileLinkPayload, context: RuntimeIdentityContext = Depends(require_permission(Permission.FILES_UPLOAD.value))):
    repo = repository()
    await repo.ensure_indexes()
    data = payload.model_dump(exclude_none=True) | {"file_id": file_id}
    try:
        created = await repo.create_file_link(context.tenant_id, data, actor_id=context.user_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    await record_activity_event(
        get_database(),
        context,
        event_type="files.linked",
        module="files",
        summary=f"Linked file to {created.get('entity_type')} {created.get('entity_id')}",
        entity_type="file",
        entity_id=file_id,
        metadata={
            "linked_entity_type": created.get("entity_type"),
            "linked_entity_id": created.get("entity_id"),
            "relationship_type": created.get("relationship_type"),
            "customer_visible": created.get("customer_visible", False),
        },
    )
    return created


@router.post("/documents/{document_id}/links", status_code=status.HTTP_201_CREATED)
async def link_document(document_id: str, payload: DocumentLinkPayload, context: RuntimeIdentityContext = Depends(require_permission(Permission.FILES_UPLOAD.value))):
    repo = repository()
    await repo.ensure_indexes()
    data = payload.model_dump(exclude_none=True) | {"document_id": document_id}
    try:
        return await repo.create_document_link(context.tenant_id, data, actor_id=context.user_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/links")
async def list_links(
    context: RuntimeIdentityContext = Depends(require_permission(Permission.FILES_VIEW.value)),
    entity_type: str = "",
    entity_id: str = "",
):
    return await repository().list_links(context.tenant_id, entity_type=entity_type, entity_id=entity_id)


@router.post("/documents/{document_id}/shares", status_code=status.HTTP_201_CREATED)
async def share_document(document_id: str, payload: DocumentSharePayload, context: RuntimeIdentityContext = Depends(require_permission(Permission.FILES_MANAGE.value))):
    try:
        created = await repository().create_share(context.tenant_id, document_id, payload.model_dump(exclude_none=True), actor_id=context.user_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    await record_activity_event(
        get_database(),
        context,
        event_type="documents.shared",
        module="files",
        summary=f"Shared document {document_id}",
        entity_type="document",
        entity_id=document_id,
        metadata={
            "share_type": created.get("share_type"),
            "recipient_type": created.get("recipient_type"),
            "recipient_id": created.get("recipient_id"),
            "access_level": created.get("access_level"),
        },
    )
    return created


@router.get("/documents/{document_id}/activities")
async def document_activities(document_id: str, context: RuntimeIdentityContext = Depends(require_permission(Permission.FILES_VIEW.value))):
    return await repository().list_activities(context.tenant_id, document_id)

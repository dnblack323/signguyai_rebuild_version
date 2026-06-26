from fastapi import APIRouter, Depends, HTTPException, Response, status

try:
    from ..core_runtime import get_database, get_tenant_id
    from ..models.wrap_lab import WrapFileUpload, WrapProjectPayload, WrapWorkflowAction
    from ..repositories.wrap_projects import WrapProjectRepository
    from ..shared.dates import utc_now
    from ..shared.ids import new_id
    from ..services.wrap_lab_service import apply_workflow_action, public_project
except ImportError:
    from core_runtime import get_database, get_tenant_id
    from models.wrap_lab import WrapFileUpload, WrapProjectPayload, WrapWorkflowAction
    from repositories.wrap_projects import WrapProjectRepository
    from shared.dates import utc_now
    from shared.ids import new_id
    from services.wrap_lab_service import apply_workflow_action, public_project

router = APIRouter(prefix="/wrap-lab", tags=["Wrap Lab"])


def repository() -> WrapProjectRepository:
    return WrapProjectRepository(get_database())


def dump_payload(payload: WrapProjectPayload) -> dict:
    return payload.model_dump(by_alias=True, exclude_none=True)


@router.get("/projects")
async def list_projects(tenant_id: str = Depends(get_tenant_id)):
    repo = repository()
    await repo.ensure_indexes()
    return await repo.list(tenant_id)


@router.post("/projects", status_code=status.HTTP_201_CREATED)
async def create_project(payload: WrapProjectPayload, tenant_id: str = Depends(get_tenant_id)):
    repo = repository()
    await repo.ensure_indexes()
    return await repo.create(tenant_id, dump_payload(payload))


@router.get("/projects/{project_id}")
async def get_project(project_id: str, tenant_id: str = Depends(get_tenant_id)):
    project = await repository().get(tenant_id, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Wrap project not found")
    return project


@router.put("/projects/{project_id}")
async def replace_project(project_id: str, payload: WrapProjectPayload, tenant_id: str = Depends(get_tenant_id)):
    project = await repository().replace(tenant_id, project_id, dump_payload(payload))
    if not project:
        raise HTTPException(status_code=404, detail="Wrap project not found")
    return project


@router.post("/projects/{project_id}/actions")
async def workflow_action(project_id: str, request: WrapWorkflowAction, tenant_id: str = Depends(get_tenant_id)):
    repo = repository()
    project = await repo.get(tenant_id, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Wrap project not found")
    updated = apply_workflow_action(project, request.action, request.payload)
    result = await repo.replace(tenant_id, project_id, updated)
    return result


@router.post("/projects/{project_id}/files", status_code=status.HTTP_201_CREATED)
async def add_file(project_id: str, request: WrapFileUpload, tenant_id: str = Depends(get_tenant_id)):
    repo = repository()
    project = await repo.get(tenant_id, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Wrap project not found")
    files = list(project.get("files", []))
    uploaded_at = utc_now()
    files.append({
        **request.model_dump(by_alias=True),
        "id": new_id(),
        "uploaded_at": uploaded_at,
        "date": uploaded_at.date().isoformat(),
    })
    return await repo.patch(tenant_id, project_id, {"files": files})


@router.get("/portal/{project_id}")
async def get_public_portal(project_id: str, tenant_id: str = Depends(get_tenant_id)):
    project = await repository().get(tenant_id, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Wrap project not found")
    return public_project(project)


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: str, tenant_id: str = Depends(get_tenant_id)):
    if not await repository().delete(tenant_id, project_id):
        raise HTTPException(status_code=404, detail="Wrap project not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)

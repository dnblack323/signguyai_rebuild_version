"""
Routes for the Example Section.

Convention notes (match the rest of SignGuy):
- This router is included into `server.py`'s `api_router` which already has
  `prefix="/api"`. So we set `prefix="/example-section"` here -> final paths are
  `/api/example-section/...`. (Do NOT put `/api` in this file; that would double it.)
- Auth/db come from `core_runtime` (same import every other route file uses).
- Multi-tenant isolation is NON-NEGOTIABLE: every read/write filters by the
  current user's `tenant_id`. SignGuy passed a 28-test cross-tenant isolation
  audit — new routes must keep that invariant or the agent will have to retrofit it.
- Use `require_write_access` (defined in server.py) on POST/PUT/DELETE if you want
  grace-period read-only behavior; or import a permission dependency. Kept simple
  here with `get_current_active_user`.
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from typing import List

from core_runtime import db, logger, get_current_active_user
from models import UserInDB  # re-exported via models/__init__.py
# Once you add the models to models/__init__.py (see INTEGRATION_CHECKLIST.md):
from models import ExampleItem, ExampleItemCreate, ExampleItemUpdate

router = APIRouter(prefix="/example-section", tags=["example-section"])


@router.get("", response_model=List[ExampleItem])
async def list_items(current_user: UserInDB = Depends(get_current_active_user)):
    """List all items for the CURRENT tenant only."""
    docs = await db.example_items.find(
        {"tenant_id": current_user.tenant_id}, {"_id": 0}
    ).to_list(1000)
    return docs


@router.get("/{item_id}", response_model=ExampleItem)
async def get_item(item_id: str, current_user: UserInDB = Depends(get_current_active_user)):
    doc = await db.example_items.find_one(
        {"id": item_id, "tenant_id": current_user.tenant_id}, {"_id": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Item not found")
    return doc


@router.post("", response_model=ExampleItem)
async def create_item(
    payload: ExampleItemCreate,
    current_user: UserInDB = Depends(get_current_active_user),
):
    item = ExampleItem(
        **payload.model_dump(),
        tenant_id=current_user.tenant_id,
        created_by=current_user.id,
    )
    await db.example_items.insert_one(item.model_dump())
    return item


@router.put("/{item_id}", response_model=ExampleItem)
async def update_item(
    item_id: str,
    payload: ExampleItemUpdate,
    current_user: UserInDB = Depends(get_current_active_user),
):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if update:
        update["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = await db.example_items.update_one(
            {"id": item_id, "tenant_id": current_user.tenant_id},
            {"$set": update},
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Item not found")
    doc = await db.example_items.find_one(
        {"id": item_id, "tenant_id": current_user.tenant_id}, {"_id": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Item not found")
    return doc


@router.delete("/{item_id}")
async def delete_item(item_id: str, current_user: UserInDB = Depends(get_current_active_user)):
    result = await db.example_items.delete_one(
        {"id": item_id, "tenant_id": current_user.tenant_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Deleted"}

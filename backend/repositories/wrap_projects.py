from pymongo import ReturnDocument

try:
    from ..shared.dates import utc_now
    from ..shared.ids import new_id
    from ..shared.indexes import ensure_collection_indexes
except ImportError:
    from shared.dates import utc_now
    from shared.ids import new_id
    from shared.indexes import ensure_collection_indexes


class WrapProjectRepository:
    def __init__(self, database):
        self.collection = database.wrap_projects

    async def ensure_indexes(self):
        await ensure_collection_indexes(self.collection, "wrap_projects")

    async def list(self, tenant_id: str):
        return await self.collection.find(
            {"tenant_id": tenant_id}, {"_id": 0}
        ).sort("updated_at", DESCENDING).to_list(length=500)

    async def get(self, tenant_id: str, project_id: str):
        return await self.collection.find_one(
            {"tenant_id": tenant_id, "id": project_id}, {"_id": 0}
        )

    async def create(self, tenant_id: str, project: dict):
        now = utc_now()
        document = {
            **project,
            "id": project.get("id") or new_id(),
            "tenant_id": tenant_id,
            "created_at": now,
            "updated_at": now,
            "version": 1,
        }
        await self.collection.insert_one(document.copy())
        document.pop("_id", None)
        return document

    async def replace(self, tenant_id: str, project_id: str, project: dict):
        current = await self.get(tenant_id, project_id)
        if not current:
            return None
        document = {
            **project,
            "id": project_id,
            "tenant_id": tenant_id,
            "created_at": current["created_at"],
            "updated_at": utc_now(),
            "version": int(current.get("version", 1)) + 1,
        }
        return await self.collection.find_one_and_replace(
            {"tenant_id": tenant_id, "id": project_id},
            document,
            projection={"_id": 0},
            return_document=ReturnDocument.AFTER,
        )

    async def patch(self, tenant_id: str, project_id: str, fields: dict):
        fields = {k: v for k, v in fields.items() if k not in {"id", "tenant_id", "tenantId", "created_at", "createdAt"}}
        fields["updated_at"] = utc_now()
        return await self.collection.find_one_and_update(
            {"tenant_id": tenant_id, "id": project_id},
            {"$set": fields, "$inc": {"version": 1}},
            projection={"_id": 0},
            return_document=ReturnDocument.AFTER,
        )

    async def delete(self, tenant_id: str, project_id: str) -> bool:
        result = await self.collection.delete_one({"tenant_id": tenant_id, "id": project_id})
        return result.deleted_count == 1

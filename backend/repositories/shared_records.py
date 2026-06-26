from pymongo import DESCENDING

try:
    from ..models.base import utc_now
    from ..shared.ids import new_id
    from ..shared.indexes import ensure_collection_indexes
    from .shared_record_children import SharedRecordChildRepository
except ImportError:
    from models.base import utc_now
    from shared.ids import new_id
    from shared.indexes import ensure_collection_indexes
    from repositories.shared_record_children import SharedRecordChildRepository


class SharedRecordRepository:
    def __init__(self, database, collection_name: str, id_prefix: str):
        self.collection = database[collection_name]
        self.collection_name = collection_name
        self.id_prefix = id_prefix
        self.children = SharedRecordChildRepository(database)

    async def ensure_indexes(self):
        await ensure_collection_indexes(self.collection, self.collection.name)
        await self.children.ensure_indexes()

    async def list(self, tenant_id: str, filters: dict | None = None, limit: int = 100) -> list[dict]:
        query = {"tenant_id": tenant_id, **(filters or {})}
        cursor = self.collection.find(query).sort([("is_pinned", DESCENDING), ("updated_at", DESCENDING)]).limit(limit)
        records = [self._public(document) async for document in cursor]
        return await self.children.hydrate_records(tenant_id, self.collection_name, records)

    async def get(self, tenant_id: str, record_id: str) -> dict | None:
        document = await self.collection.find_one({"tenant_id": tenant_id, "id": record_id})
        return await self.children.hydrate_record(tenant_id, self.collection_name, self._public(document) if document else None)

    async def create(self, tenant_id: str, payload: dict) -> dict:
        now = utc_now()
        parent, children = self.children.split_record(self.collection_name, payload)
        document = {
            **parent,
            "id": payload.get("id") or new_id(),
            "tenant_id": tenant_id,
            "created_at": payload.get("created_at") or now,
            "updated_at": now,
            "version": 1,
        }
        await self.collection.insert_one(document)
        await self.children.replace_children(tenant_id, self.collection_name, document["id"], children)
        return await self.children.hydrate_record(tenant_id, self.collection_name, self._public(document))

    async def update(self, tenant_id: str, record_id: str, patch: dict) -> dict | None:
        existing = await self.collection.find_one({"tenant_id": tenant_id, "id": record_id})
        if not existing:
            return None
        parent_patch, children = self.children.split_record(self.collection_name, patch)
        document = {
            **existing,
            **parent_patch,
            "id": record_id,
            "tenant_id": tenant_id,
            "created_at": existing.get("created_at"),
            "updated_at": utc_now(),
            "version": int(existing.get("version", 1)) + 1,
        }
        await self.collection.replace_one({"tenant_id": tenant_id, "id": record_id}, document)
        await self.children.replace_children(tenant_id, self.collection_name, record_id, children)
        return await self.children.hydrate_record(tenant_id, self.collection_name, self._public(document))

    def _public(self, document: dict) -> dict:
        return {key: value for key, value in document.items() if key != "_id"}

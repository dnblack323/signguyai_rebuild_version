from uuid import uuid4

from pymongo import ASCENDING, DESCENDING

try:
    from ..models.base import utc_now
except ImportError:
    from models.base import utc_now


class SharedRecordRepository:
    def __init__(self, database, collection_name: str, id_prefix: str):
        self.collection = database[collection_name]
        self.id_prefix = id_prefix

    async def ensure_indexes(self):
        await self.collection.create_index([("tenant_id", ASCENDING), ("id", ASCENDING)], unique=True)
        await self.collection.create_index([("tenant_id", ASCENDING), ("created_at", DESCENDING)])
        await self.collection.create_index([("tenant_id", ASCENDING), ("category", ASCENDING)])
        await self.collection.create_index([("tenant_id", ASCENDING), ("status", ASCENDING)])

    async def list(self, tenant_id: str, filters: dict | None = None, limit: int = 100) -> list[dict]:
        query = {"tenant_id": tenant_id, **(filters or {})}
        cursor = self.collection.find(query).sort([("is_pinned", DESCENDING), ("updated_at", DESCENDING)]).limit(limit)
        return [self._public(document) async for document in cursor]

    async def get(self, tenant_id: str, record_id: str) -> dict | None:
        document = await self.collection.find_one({"tenant_id": tenant_id, "id": record_id})
        return self._public(document) if document else None

    async def create(self, tenant_id: str, payload: dict) -> dict:
        now = utc_now()
        document = {
            **payload,
            "id": payload.get("id") or f"{self.id_prefix}-{str(uuid4())[:8].upper()}",
            "tenant_id": tenant_id,
            "created_at": payload.get("created_at") or now,
            "updated_at": now,
            "version": 1,
        }
        await self.collection.insert_one(document)
        return self._public(document)

    async def update(self, tenant_id: str, record_id: str, patch: dict) -> dict | None:
        existing = await self.collection.find_one({"tenant_id": tenant_id, "id": record_id})
        if not existing:
            return None
        document = {
            **existing,
            **patch,
            "id": record_id,
            "tenant_id": tenant_id,
            "created_at": existing.get("created_at"),
            "updated_at": utc_now(),
            "version": int(existing.get("version", 1)) + 1,
        }
        await self.collection.replace_one({"tenant_id": tenant_id, "id": record_id}, document)
        return self._public(document)

    def _public(self, document: dict) -> dict:
        return {key: value for key, value in document.items() if key != "_id"}

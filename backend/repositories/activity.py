from pymongo import DESCENDING

try:
    from ..models.base import utc_now
    from ..shared.ids import new_id
    from ..shared.indexes import ensure_collection_indexes
except ImportError:
    from models.base import utc_now
    from shared.ids import new_id
    from shared.indexes import ensure_collection_indexes


class ActivityEventRepository:
    collection_name = "activity_events"

    def __init__(self, database):
        self.collection = database[self.collection_name]

    async def ensure_indexes(self):
        await ensure_collection_indexes(self.collection, self.collection_name)

    async def create(self, tenant_id: str, payload: dict) -> dict:
        now = utc_now()
        document = {
            **payload,
            "id": payload.get("id") or new_id(),
            "tenant_id": tenant_id,
            "created_at": payload.get("created_at") or now,
            "updated_at": payload.get("updated_at") or now,
            "version": 1,
        }
        await self.collection.insert_one(document)
        return self._public(document)

    async def list(self, tenant_id: str, filters: dict | None = None, limit: int = 100) -> list[dict]:
        query = {"tenant_id": tenant_id, **(filters or {})}
        cursor = self.collection.find(query).sort([("created_at", DESCENDING)]).limit(limit)
        return [self._public(document) async for document in cursor]

    def _public(self, document: dict) -> dict:
        return {key: value for key, value in document.items() if key != "_id"}

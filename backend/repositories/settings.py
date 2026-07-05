try:
    from ..models.base import utc_now
    from ..shared.ids import new_id
    from ..shared.indexes import ensure_collection_indexes
except ImportError:
    from models.base import utc_now
    from shared.ids import new_id
    from shared.indexes import ensure_collection_indexes


class SettingsRepository:
    collection_name = "tenant_settings"

    def __init__(self, database):
        self.collection = database[self.collection_name]

    async def ensure_indexes(self):
        await ensure_collection_indexes(self.collection, self.collection_name)

    async def list(self, tenant_id: str, namespace: str = "") -> list[dict]:
        query = {"tenant_id": tenant_id}
        if namespace:
            query["namespace"] = namespace
        cursor = self.collection.find(query).sort([("namespace", 1), ("key", 1)])
        return [self._public(document) async for document in cursor]

    async def get(self, tenant_id: str, namespace: str, key: str) -> dict | None:
        document = await self.collection.find_one({"tenant_id": tenant_id, "namespace": namespace, "key": key})
        return self._public(document) if document else None

    async def upsert(self, tenant_id: str, namespace: str, key: str, payload: dict, actor_id: str) -> dict:
        existing = await self.collection.find_one({"tenant_id": tenant_id, "namespace": namespace, "key": key})
        now = utc_now()
        safe_payload = {
            field: value
            for field, value in payload.items()
            if field not in {"_id", "id", "tenant_id", "namespace", "key", "created_at", "updated_at", "updated_by", "version"}
        }
        if existing:
            document = {
                **existing,
                **safe_payload,
                "tenant_id": tenant_id,
                "namespace": namespace,
                "key": key,
                "created_at": existing.get("created_at"),
                "updated_at": now,
                "updated_by": actor_id,
                "version": int(existing.get("version", 1)) + 1,
            }
            await self.collection.replace_one({"tenant_id": tenant_id, "namespace": namespace, "key": key}, document)
            return self._public(document)

        document = {
            **safe_payload,
            "id": payload.get("id") or new_id(),
            "tenant_id": tenant_id,
            "namespace": namespace,
            "key": key,
            "value": payload.get("value", {}),
            "status": payload.get("status", "active"),
            "schema_version": payload.get("schema_version", 1),
            "source": payload.get("source", "manual"),
            "metadata": payload.get("metadata", {}),
            "notes": payload.get("notes", ""),
            "created_at": now,
            "updated_at": now,
            "updated_by": actor_id,
            "version": 1,
        }
        await self.collection.insert_one(document)
        return self._public(document)

    def _public(self, document: dict) -> dict:
        return {key: value for key, value in document.items() if key != "_id"}

try:
    from ..models.base import utc_now
    from ..shared.ids import new_id
    from ..shared.indexes import ensure_collection_indexes
except ImportError:
    from models.base import utc_now
    from shared.ids import new_id
    from shared.indexes import ensure_collection_indexes


class FeatureEntitlementRepository:
    collection_name = "feature_entitlements"

    def __init__(self, database):
        self.collection = database[self.collection_name]

    async def ensure_indexes(self):
        await ensure_collection_indexes(self.collection, self.collection_name)

    async def list(self, tenant_id: str, status: str = "", feature_key: str = "") -> list[dict]:
        query = {"tenant_id": tenant_id}
        if status:
            query["status"] = status
        if feature_key:
            query["feature_key"] = feature_key
        cursor = self.collection.find(query).sort([("feature_key", 1)])
        return [self._public(document) async for document in cursor]

    async def get(self, tenant_id: str, feature_key: str) -> dict | None:
        document = await self.collection.find_one({"tenant_id": tenant_id, "feature_key": feature_key})
        return self._public(document) if document else None

    async def upsert(self, tenant_id: str, feature_key: str, payload: dict, actor_id: str) -> dict:
        existing = await self.collection.find_one({"tenant_id": tenant_id, "feature_key": feature_key})
        now = utc_now()
        safe_payload = {
            key: value
            for key, value in payload.items()
            if key not in {"_id", "id", "tenant_id", "feature_key", "created_at", "updated_at", "updated_by", "version"}
        }
        if existing:
            document = {
                **existing,
                **safe_payload,
                "tenant_id": tenant_id,
                "feature_key": feature_key,
                "created_at": existing.get("created_at"),
                "updated_at": now,
                "updated_by": actor_id,
                "version": int(existing.get("version", 1)) + 1,
            }
            await self.collection.replace_one({"tenant_id": tenant_id, "feature_key": feature_key}, document)
            return self._public(document)
        document = {
            **safe_payload,
            "id": payload.get("id") or new_id(),
            "tenant_id": tenant_id,
            "feature_key": feature_key,
            "status": payload.get("status", "enabled"),
            "source_product_id": payload.get("source_product_id", ""),
            "mode": payload.get("mode", "full_app"),
            "metadata": payload.get("metadata", {}),
            "created_at": now,
            "updated_at": now,
            "updated_by": actor_id,
            "version": 1,
        }
        await self.collection.insert_one(document.copy())
        return self._public(document)

    def _public(self, document: dict) -> dict:
        return {key: value for key, value in document.items() if key != "_id"}

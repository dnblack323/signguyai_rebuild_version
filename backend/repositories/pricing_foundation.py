try:
    from ..models.base import utc_now
    from ..shared.ids import new_id
    from ..shared.indexes import ensure_collection_indexes
except ImportError:
    from models.base import utc_now
    from shared.ids import new_id
    from shared.indexes import ensure_collection_indexes


class PricingFoundationRepository:
    collection_name = "pricing_foundations"

    def __init__(self, database):
        self.collection = database[self.collection_name]

    async def ensure_indexes(self):
        await ensure_collection_indexes(self.collection, self.collection_name)

    async def get_default(self, tenant_id: str) -> dict | None:
        document = await self.collection.find_one({"tenant_id": tenant_id, "key": "default"})
        return self._public(document) if document else None

    async def upsert_default(self, tenant_id: str, payload: dict) -> dict:
        existing = await self.collection.find_one({"tenant_id": tenant_id, "key": "default"})
        now = utc_now()
        safe_payload = {key: value for key, value in payload.items() if key not in {"_id", "id", "tenant_id", "key", "created_at", "updated_at", "version"}}
        if existing:
            document = {
                **existing,
                **safe_payload,
                "tenant_id": tenant_id,
                "key": "default",
                "created_at": existing.get("created_at"),
                "updated_at": now,
                "version": int(existing.get("version", 1)) + 1,
            }
            await self.collection.replace_one({"tenant_id": tenant_id, "key": "default"}, document)
            return self._public(document)

        document = {
            **safe_payload,
            "id": payload.get("id") or new_id(),
            "tenant_id": tenant_id,
            "key": "default",
            "status": payload.get("status", "active"),
            "source": payload.get("source", "manual"),
            "settings": payload.get("settings", {}),
            "quiz_answers": payload.get("quiz_answers", {}),
            "applied_suggestions": payload.get("applied_suggestions", []),
            "notes": payload.get("notes", ""),
            "created_at": now,
            "updated_at": now,
            "version": 1,
        }
        await self.collection.insert_one(document)
        return self._public(document)

    def _public(self, document: dict) -> dict:
        return {key: value for key, value in document.items() if key != "_id"}

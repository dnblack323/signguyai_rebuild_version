from uuid import uuid4

from pymongo import ASCENDING

try:
    from ..models.base import utc_now
except ImportError:
    from models.base import utc_now


class CustomerRepository:
    def __init__(self, database):
        self.collection = database.customers

    async def ensure_indexes(self):
        await self.collection.create_index([("tenant_id", ASCENDING), ("id", ASCENDING)], unique=True)
        await self.collection.create_index([("tenant_id", ASCENDING), ("email", ASCENDING)])

    async def list(self, tenant_id: str) -> list[dict]:
        cursor = self.collection.find({"tenant_id": tenant_id}).sort("businessName", ASCENDING)
        return [self._public(document) async for document in cursor]

    async def get(self, tenant_id: str, customer_id: str) -> dict | None:
        document = await self.collection.find_one({"tenant_id": tenant_id, "id": customer_id})
        return self._public(document) if document else None

    async def create(self, tenant_id: str, payload: dict) -> dict:
        now = utc_now()
        document = {
            **payload,
            "id": payload.get("id") or f"CUST-{str(uuid4())[:8].upper()}",
            "tenant_id": tenant_id,
            "created_at": now,
            "updated_at": now,
            "version": 1,
        }
        await self.collection.insert_one(document)
        return self._public(document)

    async def replace(self, tenant_id: str, customer_id: str, payload: dict) -> dict | None:
        existing = await self.collection.find_one({"tenant_id": tenant_id, "id": customer_id})
        if not existing:
            return None
        document = {
            **existing,
            **payload,
            "id": customer_id,
            "tenant_id": tenant_id,
            "created_at": existing.get("created_at"),
            "updated_at": utc_now(),
            "version": int(existing.get("version", 1)) + 1,
        }
        await self.collection.replace_one({"tenant_id": tenant_id, "id": customer_id}, document)
        return self._public(document)

    def _public(self, document: dict) -> dict:
        return {key: value for key, value in document.items() if key != "_id"}

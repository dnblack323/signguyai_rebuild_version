try:
    from ..models.base import utc_now
    from ..shared.ids import new_id
    from ..shared.indexes import ensure_collection_indexes
    from ..shared.money import to_minor_units
    from .customer_children import CustomerChildRepository
except ImportError:
    from models.base import utc_now
    from shared.ids import new_id
    from shared.indexes import ensure_collection_indexes
    from shared.money import to_minor_units
    from repositories.customer_children import CustomerChildRepository

from pymongo import ASCENDING


class CustomerRepository:
    def __init__(self, database):
        self.collection = database.customers
        self.children = CustomerChildRepository(database)

    async def ensure_indexes(self):
        await ensure_collection_indexes(self.collection, "customers")
        await self.children.ensure_indexes()

    async def list(self, tenant_id: str) -> list[dict]:
        cursor = self.collection.find({"tenant_id": tenant_id}).sort("businessName", ASCENDING)
        customers = [self._public(document) async for document in cursor]
        return await self.children.hydrate_customers(tenant_id, customers)

    async def get(self, tenant_id: str, customer_id: str) -> dict | None:
        document = await self.collection.find_one({"tenant_id": tenant_id, "id": customer_id})
        return await self.children.hydrate_customer(tenant_id, self._public(document) if document else None)

    async def create(self, tenant_id: str, payload: dict) -> dict:
        now = utc_now()
        payload = self._normalize_payload(payload)
        parent, children = self.children.split_customer(payload)
        document = {
            **parent,
            "id": payload.get("id") or new_id(),
            "tenant_id": tenant_id,
            "created_at": now,
            "updated_at": now,
            "version": 1,
        }
        await self.collection.insert_one(document)
        await self.children.replace_children(tenant_id, document["id"], children)
        return await self.children.hydrate_customer(tenant_id, self._public(document))

    async def replace(self, tenant_id: str, customer_id: str, payload: dict) -> dict | None:
        existing = await self.collection.find_one({"tenant_id": tenant_id, "id": customer_id})
        if not existing:
            return None
        payload = self._normalize_payload(payload)
        parent, children = self.children.split_customer(payload)
        document = {
            **existing,
            **parent,
            "id": customer_id,
            "tenant_id": tenant_id,
            "created_at": existing.get("created_at"),
            "updated_at": utc_now(),
            "version": int(existing.get("version", 1)) + 1,
        }
        await self.collection.replace_one({"tenant_id": tenant_id, "id": customer_id}, document)
        await self.children.replace_children(tenant_id, customer_id, children)
        return await self.children.hydrate_customer(tenant_id, self._public(document))

    def _public(self, document: dict) -> dict:
        return {key: value for key, value in document.items() if key != "_id"}

    def _normalize_payload(self, payload: dict) -> dict:
        normalized = dict(payload)
        email = str(normalized.get("email") or "").strip().lower()
        business_name = str(normalized.get("businessName") or "").strip().lower()
        person_name = f"{normalized.get('firstName', '')} {normalized.get('lastName', '')}".strip().lower()
        normalized["normalized_email"] = email
        normalized["normalized_name"] = business_name or person_name

        if "lifetimeValue" in normalized and "lifetimeValueMinor" not in normalized:
            normalized["lifetimeValueMinor"] = int(to_minor_units(str(normalized.pop("lifetimeValue") or "0")))
        else:
            normalized.pop("lifetimeValue", None)

        return normalized

try:
    from ..models.base import utc_now
    from ..shared.ids import new_id
    from ..shared.indexes import ensure_collection_indexes
    from ..shared.money import to_minor_units
except ImportError:
    from models.base import utc_now
    from shared.ids import new_id
    from shared.indexes import ensure_collection_indexes
    from shared.money import to_minor_units


class CustomerRepository:
    def __init__(self, database):
        self.collection = database.customers

    async def ensure_indexes(self):
        await ensure_collection_indexes(self.collection, "customers")

    async def list(self, tenant_id: str) -> list[dict]:
        cursor = self.collection.find({"tenant_id": tenant_id}).sort("businessName", ASCENDING)
        return [self._public(document) async for document in cursor]

    async def get(self, tenant_id: str, customer_id: str) -> dict | None:
        document = await self.collection.find_one({"tenant_id": tenant_id, "id": customer_id})
        return self._public(document) if document else None

    async def create(self, tenant_id: str, payload: dict) -> dict:
        now = utc_now()
        payload = self._normalize_payload(payload)
        document = {
            **payload,
            "id": payload.get("id") or new_id(),
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
        payload = self._normalize_payload(payload)
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

import re

try:
    from ..shared.dates import utc_now
    from ..shared.ids import new_id
    from ..shared.indexes import ensure_collection_indexes
except ImportError:
    from shared.dates import utc_now
    from shared.ids import new_id
    from shared.indexes import ensure_collection_indexes


class TenantRepository:
    collection_name = "tenants"

    def __init__(self, database):
        self.collection = database[self.collection_name]

    async def ensure_indexes(self):
        await ensure_collection_indexes(self.collection, self.collection_name)

    async def get(self, tenant_id: str) -> dict | None:
        document = await self.collection.find_one({"tenant_id": tenant_id})
        return self._public(document) if document else None

    async def upsert_current(self, tenant_id: str, payload: dict, actor_id: str) -> tuple[dict, dict | None]:
        existing = await self.collection.find_one({"tenant_id": tenant_id})
        now = utc_now()
        safe_payload = {
            key: value
            for key, value in payload.items()
            if key not in {"_id", "id", "tenant_id", "slug", "account_status", "billing_status", "created_at", "updated_at", "updated_by", "version"}
            and value is not None
        }
        if existing:
            document = {
                **existing,
                **safe_payload,
                "tenant_id": tenant_id,
                "created_at": existing.get("created_at"),
                "updated_at": now,
                "updated_by": actor_id,
                "version": int(existing.get("version", 1)) + 1,
            }
            await self.collection.replace_one({"tenant_id": tenant_id}, document)
            return self._public(document), self._public(existing)

        name = safe_payload.get("name") or tenant_id
        document = {
            **safe_payload,
            "id": payload.get("id") or new_id(),
            "tenant_id": tenant_id,
            "name": name,
            "slug": self._slug(name, tenant_id),
            "account_status": "active",
            "billing_status": "current",
            "plan": payload.get("plan", ""),
            "is_founder": bool(payload.get("is_founder", False)),
            "founder_number": payload.get("founder_number"),
            "created_at": now,
            "updated_at": now,
            "updated_by": actor_id,
            "version": 1,
        }
        await self.collection.insert_one(document.copy())
        return self._public(document), None

    def _slug(self, name: str, tenant_id: str) -> str:
        base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
        base = base or tenant_id.lower()
        suffix = re.sub(r"[^a-z0-9]", "", tenant_id.lower())[-6:] or "shop"
        return f"{base}-{suffix}"

    def _public(self, document: dict) -> dict:
        return {key: value for key, value in document.items() if key != "_id"}

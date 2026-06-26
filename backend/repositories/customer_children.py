from typing import Any

from pymongo import ASCENDING

try:
    from ..shared.dates import utc_now
    from ..shared.ids import new_id
    from ..shared.indexes import ensure_collection_indexes
except ImportError:
    from shared.dates import utc_now
    from shared.ids import new_id
    from shared.indexes import ensure_collection_indexes


CUSTOMER_CHILD_FIELDS = ("tags", "notes")


class CustomerChildRepository:
    collection_name = "customer_child_records"

    def __init__(self, database):
        self.collection = database[self.collection_name]

    async def ensure_indexes(self):
        await ensure_collection_indexes(self.collection, self.collection_name)

    def split_customer(self, payload: dict[str, Any]) -> tuple[dict[str, Any], dict[str, list[Any]]]:
        parent = dict(payload)
        children: dict[str, list[Any]] = {}
        tags = parent.pop("tags", None)
        if isinstance(tags, list):
            children["tags"] = list(tags)
        notes = parent.pop("notes", None)
        if isinstance(notes, str) and notes.strip():
            children["notes"] = [{"body": notes.strip(), "kind": "legacy_summary"}]
        elif isinstance(notes, list):
            children["notes"] = [row for row in notes if isinstance(row, dict)]
        return parent, children

    async def replace_children(self, tenant_id: str, customer_id: str, child_values: dict[str, list[Any]]) -> None:
        if not child_values:
            return
        await self.ensure_indexes()
        now = utc_now()
        record_types = list(child_values)
        await self.collection.delete_many({
            "tenant_id": tenant_id,
            "customer_id": customer_id,
            "record_type": {"$in": record_types},
        })
        documents = []
        for record_type, rows in child_values.items():
            for position, row in enumerate(rows):
                payload = dict(row) if isinstance(row, dict) else {"value": row}
                child_id = str(payload.get("id") or new_id())
                payload["id"] = child_id
                documents.append({
                    "id": child_id,
                    "tenant_id": tenant_id,
                    "customer_id": customer_id,
                    "record_type": record_type,
                    "position": position,
                    "payload": payload,
                    "created_at": now,
                    "updated_at": now,
                    "version": 1,
                })
        if documents:
            await self.collection.insert_many(documents)

    async def hydrate_customers(self, tenant_id: str, customers: list[dict]) -> list[dict]:
        if not customers:
            return customers
        customer_ids = [customer["id"] for customer in customers]
        cursor = self.collection.find(
            {"tenant_id": tenant_id, "customer_id": {"$in": customer_ids}},
            {"_id": 0},
        ).sort([("customer_id", ASCENDING), ("record_type", ASCENDING), ("position", ASCENDING)])
        children_by_customer: dict[str, list[dict]] = {}
        async for child in cursor:
            children_by_customer.setdefault(child["customer_id"], []).append(child)
        return [self.attach_children(customer, children_by_customer.get(customer["id"], [])) for customer in customers]

    async def hydrate_customer(self, tenant_id: str, customer: dict | None) -> dict | None:
        if not customer:
            return None
        cursor = self.collection.find(
            {"tenant_id": tenant_id, "customer_id": customer["id"]},
            {"_id": 0},
        ).sort([("record_type", ASCENDING), ("position", ASCENDING)])
        return self.attach_children(customer, await cursor.to_list(length=1000))

    def attach_children(self, customer: dict[str, Any], children: list[dict]) -> dict:
        hydrated = dict(customer)
        tags = []
        notes = []
        seen = set()
        for child in children:
            payload = child.get("payload") or {}
            if child.get("record_type") == "tags":
                seen.add("tags")
                tags.append(payload.get("value"))
            elif child.get("record_type") == "notes":
                seen.add("notes")
                notes.append(dict(payload))
        if "tags" in seen:
            hydrated["tags"] = [tag for tag in tags if tag]
        elif "tags" not in hydrated:
            hydrated["tags"] = []
        if "notes" in seen:
            hydrated["notes"] = "\n\n".join(note.get("body", "") for note in notes if note.get("body"))
        elif "notes" not in hydrated:
            hydrated["notes"] = ""
        return hydrated

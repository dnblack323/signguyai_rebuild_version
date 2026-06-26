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


SHARED_CHILD_FIELDS: dict[str, dict[str, str]] = {
    "community_posts": {
        "replies": "dict_list",
        "upvoted_by": "value_list",
    },
    "shared_notes": {
        "tags": "value_list",
    },
}


class SharedRecordChildRepository:
    collection_name = "shared_record_child_records"

    def __init__(self, database):
        self.collection = database[self.collection_name]

    async def ensure_indexes(self):
        await ensure_collection_indexes(self.collection, self.collection_name)

    def split_record(self, collection_name: str, payload: dict[str, Any]) -> tuple[dict[str, Any], dict[str, list[Any]]]:
        parent = dict(payload)
        children = {}
        for field in SHARED_CHILD_FIELDS.get(collection_name, {}):
            value = parent.pop(field, None)
            if isinstance(value, list):
                children[field] = list(value)
        return parent, children

    async def replace_children(self, tenant_id: str, parent_collection: str, parent_id: str, child_values: dict[str, list[Any]]) -> None:
        if not child_values:
            return
        await self.ensure_indexes()
        now = utc_now()
        record_types = list(child_values)
        await self.collection.delete_many({
            "tenant_id": tenant_id,
            "parent_collection": parent_collection,
            "parent_id": parent_id,
            "record_type": {"$in": record_types},
        })
        documents = []
        for record_type, rows in child_values.items():
            mode = SHARED_CHILD_FIELDS.get(parent_collection, {}).get(record_type, "dict_list")
            for position, row in enumerate(rows):
                payload = dict(row) if isinstance(row, dict) else {"value": row}
                child_id = str(payload.get("id") or new_id())
                payload["id"] = child_id
                documents.append({
                    "id": child_id,
                    "tenant_id": tenant_id,
                    "parent_collection": parent_collection,
                    "parent_id": parent_id,
                    "record_type": record_type,
                    "position": position,
                    "mode": mode,
                    "payload": payload,
                    "created_at": now,
                    "updated_at": now,
                    "version": 1,
                })
        if documents:
            await self.collection.insert_many(documents)

    async def hydrate_records(self, tenant_id: str, parent_collection: str, records: list[dict]) -> list[dict]:
        if not records:
            return records
        parent_ids = [record["id"] for record in records]
        cursor = self.collection.find(
            {"tenant_id": tenant_id, "parent_collection": parent_collection, "parent_id": {"$in": parent_ids}},
            {"_id": 0},
        ).sort([("parent_id", ASCENDING), ("record_type", ASCENDING), ("position", ASCENDING)])
        children_by_parent: dict[str, list[dict]] = {}
        async for child in cursor:
            children_by_parent.setdefault(child["parent_id"], []).append(child)
        return [self.attach_children(parent_collection, record, children_by_parent.get(record["id"], [])) for record in records]

    async def hydrate_record(self, tenant_id: str, parent_collection: str, record: dict | None) -> dict | None:
        if not record:
            return None
        cursor = self.collection.find(
            {"tenant_id": tenant_id, "parent_collection": parent_collection, "parent_id": record["id"]},
            {"_id": 0},
        ).sort([("record_type", ASCENDING), ("position", ASCENDING)])
        return self.attach_children(parent_collection, record, await cursor.to_list(length=1000))

    def attach_children(self, parent_collection: str, record: dict, children: list[dict]) -> dict:
        hydrated = dict(record)
        configured = SHARED_CHILD_FIELDS.get(parent_collection, {})
        grouped = {field: [] for field in configured}
        seen = set()
        for child in children:
            record_type = child.get("record_type")
            if record_type not in grouped:
                continue
            seen.add(record_type)
            payload = child.get("payload") or {}
            if configured[record_type] == "value_list":
                grouped[record_type].append(payload.get("value"))
            else:
                grouped[record_type].append(dict(payload))
        for field in configured:
            if field in seen:
                hydrated[field] = grouped[field]
            elif field not in hydrated:
                hydrated[field] = []
        return hydrated

from typing import Any

from pymongo import ASCENDING, ReturnDocument

try:
    from ..shared.dates import utc_now
    from ..shared.ids import new_id
    from ..shared.indexes import ensure_collection_indexes
except ImportError:
    from shared.dates import utc_now
    from shared.ids import new_id
    from shared.indexes import ensure_collection_indexes


WRAP_CHILD_ARRAY_FIELDS: tuple[str, ...] = (
    "files",
    "proofs",
    "damageMarkers",
    "productionChecklist",
    "installChecklist",
    "issuesLog",
    "chatHistory",
)

MOCKUP_STUDIO_CHILD_FIELDS: tuple[str, ...] = (
    "assets",
    "concepts",
    "activity",
)


class WrapProjectChildRepository:
    """Normalized child records for unbounded Wrap Lab project arrays."""

    collection_name = "wrap_project_child_records"

    def __init__(self, database):
        self.collection = database[self.collection_name]

    async def ensure_indexes(self):
        await ensure_collection_indexes(self.collection, self.collection_name)

    async def hydrate_project(self, tenant_id: str, project: dict | None) -> dict | None:
        if not project:
            return None
        children = await self.list_for_project(tenant_id, project["id"])
        return self.attach_children(project, children)

    async def hydrate_projects(self, tenant_id: str, projects: list[dict]) -> list[dict]:
        if not projects:
            return projects
        project_ids = [project["id"] for project in projects]
        cursor = self.collection.find(
            {"tenant_id": tenant_id, "project_id": {"$in": project_ids}},
            {"_id": 0},
        ).sort([("project_id", ASCENDING), ("record_type", ASCENDING), ("position", ASCENDING)])
        children_by_project: dict[str, list[dict]] = {}
        async for child in cursor:
            children_by_project.setdefault(child["project_id"], []).append(child)
        return [
            self.attach_children(project, children_by_project.get(project["id"], []))
            for project in projects
        ]

    async def list_for_project(self, tenant_id: str, project_id: str) -> list[dict]:
        cursor = self.collection.find(
            {"tenant_id": tenant_id, "project_id": project_id},
            {"_id": 0},
        ).sort([("record_type", ASCENDING), ("position", ASCENDING)])
        return await cursor.to_list(length=2000)

    async def replace_children(self, tenant_id: str, project_id: str, child_values: dict[str, list[dict[str, Any]]]) -> None:
        if not child_values:
            return
        await self.ensure_indexes()
        now = utc_now()
        record_types = list(child_values)
        await self.collection.delete_many({
            "tenant_id": tenant_id,
            "project_id": project_id,
            "record_type": {"$in": record_types},
        })
        documents = []
        for record_type, rows in child_values.items():
            for position, payload in enumerate(rows):
                child_id = str(payload.get("id") or new_id())
                normalized_payload = {**payload, "id": child_id}
                documents.append({
                    "id": child_id,
                    "tenant_id": tenant_id,
                    "project_id": project_id,
                    "record_type": record_type,
                    "position": position,
                    "payload": normalized_payload,
                    "created_at": now,
                    "updated_at": now,
                    "version": 1,
                })
        if documents:
            await self.collection.insert_many(documents)

    async def append_child(self, tenant_id: str, project_id: str, record_type: str, payload: dict[str, Any]) -> dict:
        await self.ensure_indexes()
        now = utc_now()
        position = await self.collection.count_documents({
            "tenant_id": tenant_id,
            "project_id": project_id,
            "record_type": record_type,
        })
        child_id = str(payload.get("id") or new_id())
        normalized_payload = {**payload, "id": child_id}
        document = {
            "id": child_id,
            "tenant_id": tenant_id,
            "project_id": project_id,
            "record_type": record_type,
            "position": position,
            "payload": normalized_payload,
            "created_at": now,
            "updated_at": now,
            "version": 1,
        }
        await self.collection.insert_one(document)
        document.pop("_id", None)
        return document

    async def update_child_payload(self, tenant_id: str, project_id: str, record_type: str, child_id: str, payload: dict[str, Any]) -> dict | None:
        now = utc_now()
        return await self.collection.find_one_and_update(
            {"tenant_id": tenant_id, "project_id": project_id, "record_type": record_type, "id": child_id},
            {"$set": {"payload": {**payload, "id": child_id}, "updated_at": now}, "$inc": {"version": 1}},
            projection={"_id": 0},
            return_document=ReturnDocument.AFTER,
        )

    def split_project(self, project: dict[str, Any]) -> tuple[dict[str, Any], dict[str, list[dict[str, Any]]]]:
        parent = dict(project)
        children: dict[str, list[dict[str, Any]]] = {}
        for field in WRAP_CHILD_ARRAY_FIELDS:
            value = parent.pop(field, None)
            if isinstance(value, list):
                children[field] = [dict(row) for row in value if isinstance(row, dict)]
        studio = parent.get("mockupStudio")
        if isinstance(studio, dict):
            studio_parent = dict(studio)
            for field in MOCKUP_STUDIO_CHILD_FIELDS:
                value = studio_parent.pop(field, None)
                if isinstance(value, list):
                    children[f"mockupStudio.{field}"] = [dict(row) for row in value if isinstance(row, dict)]
            parent["mockupStudio"] = studio_parent
        return parent, children

    def attach_children(self, project: dict[str, Any], children: list[dict]) -> dict:
        hydrated = dict(project)
        grouped = {field: [] for field in (*WRAP_CHILD_ARRAY_FIELDS, *(f"mockupStudio.{field}" for field in MOCKUP_STUDIO_CHILD_FIELDS))}
        seen_types: set[str] = set()
        for child in children:
            record_type = child.get("record_type")
            if record_type in grouped:
                seen_types.add(record_type)
                grouped[record_type].append(dict(child.get("payload") or {}))
        for field in WRAP_CHILD_ARRAY_FIELDS:
            if field in seen_types:
                hydrated[field] = grouped[field]
            elif field not in hydrated:
                hydrated[field] = []
        if any(f"mockupStudio.{field}" in seen_types for field in MOCKUP_STUDIO_CHILD_FIELDS):
            studio = dict(hydrated.get("mockupStudio") or {})
            for field in MOCKUP_STUDIO_CHILD_FIELDS:
                studio[field] = grouped[f"mockupStudio.{field}"]
            hydrated["mockupStudio"] = studio
        elif "mockupStudio" not in hydrated:
            hydrated["mockupStudio"] = None
        return hydrated

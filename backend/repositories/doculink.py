from datetime import datetime
from typing import Any

from pymongo import DESCENDING

try:
    from ..models.doculink import FINAL_STATUS_TIMESTAMPS, LOCKED_DOCUMENT_STATUSES
    from ..shared.dates import utc_now
    from ..shared.ids import new_id
    from ..shared.indexes import ensure_collection_indexes
except ImportError:
    from models.doculink import FINAL_STATUS_TIMESTAMPS, LOCKED_DOCUMENT_STATUSES
    from shared.dates import utc_now
    from shared.ids import new_id
    from shared.indexes import ensure_collection_indexes


class DocuLinkRepository:
    collections = (
        "files",
        "documents",
        "file_links",
        "document_links",
        "document_shares",
        "document_activities",
        "document_templates",
        "template_versions",
        "template_fields",
        "template_categories",
    )

    def __init__(self, database):
        self.database = database
        self.files = database.files
        self.documents = database.documents
        self.file_links = database.file_links
        self.document_links = database.document_links
        self.document_shares = database.document_shares
        self.document_activities = database.document_activities

    async def ensure_indexes(self):
        for collection_name in self.collections:
            await ensure_collection_indexes(self.database[collection_name], collection_name)

    async def create_file(self, tenant_id: str, payload: dict, actor_id: str = "") -> dict:
        now = utc_now()
        document = {
            **payload,
            "id": payload.get("id") or new_id(),
            "tenant_id": tenant_id,
            "uploaded_by": payload.get("uploaded_by") or actor_id,
            "created_at": now,
            "updated_at": now,
            "version": 1,
            "archived_at": None,
        }
        await self.files.insert_one(document.copy())
        return self._public(document)

    async def get_file(self, tenant_id: str, file_id: str) -> dict | None:
        document = await self.files.find_one({"tenant_id": tenant_id, "id": file_id})
        return self._public(document) if document else None

    async def get_file_for_download(self, tenant_id: str, file_id: str) -> dict | None:
        document = await self.files.find_one({"tenant_id": tenant_id, "id": file_id})
        return {key: value for key, value in document.items() if key != "_id"} if document else None

    async def list_files(self, tenant_id: str, filters: dict | None = None, limit: int = 200) -> list[dict]:
        query = {"tenant_id": tenant_id, **self._clean_filters(filters or {})}
        cursor = self.files.find(query, {"_id": 0, "object_path": 0}).sort("created_at", DESCENDING).limit(limit)
        return await cursor.to_list(length=limit)

    async def create_document(self, tenant_id: str, payload: dict, actor_id: str = "") -> dict:
        now = utc_now()
        status = payload.get("status", "draft")
        document = {
            **payload,
            "id": payload.get("id") or new_id(),
            "tenant_id": tenant_id,
            "created_by": payload.get("created_by") or actor_id,
            "created_at": now,
            "updated_at": now,
            "version": 1,
            "finalized_at": now if status == "finalized" else None,
            "archived_at": now if status == "archived" else None,
            "voided_at": now if status == "voided" else None,
        }
        await self.documents.insert_one(document.copy())
        await self.record_activity(tenant_id, document["id"], "created", actor_id=actor_id, metadata={"status": status})
        return self._public(document)

    async def update_document(self, tenant_id: str, document_id: str, patch: dict, actor_id: str = "") -> dict | None:
        existing = await self.documents.find_one({"tenant_id": tenant_id, "id": document_id})
        if not existing:
            return None
        if existing.get("status") in LOCKED_DOCUMENT_STATUSES and any(key not in {"status", "archived_at", "voided_at"} for key in patch):
            raise ValueError("Approved, signed, and finalized documents are read-only")
        now = utc_now()
        patch = {key: value for key, value in patch.items() if value is not None and key not in {"id", "tenant_id", "created_at", "created_by"}}
        next_status = patch.get("status")
        if next_status in FINAL_STATUS_TIMESTAMPS and not existing.get(FINAL_STATUS_TIMESTAMPS[next_status]):
            patch[FINAL_STATUS_TIMESTAMPS[next_status]] = now
        updated = {
            **existing,
            **patch,
            "id": document_id,
            "tenant_id": tenant_id,
            "created_at": existing.get("created_at"),
            "updated_at": now,
            "version": int(existing.get("version", 1)) + 1,
        }
        await self.documents.replace_one({"tenant_id": tenant_id, "id": document_id}, updated)
        if next_status and next_status != existing.get("status"):
            await self.record_activity(tenant_id, document_id, next_status, actor_id=actor_id, metadata={"from": existing.get("status"), "to": next_status})
        else:
            await self.record_activity(tenant_id, document_id, "updated", actor_id=actor_id)
        return self._public(updated)

    async def get_document(self, tenant_id: str, document_id: str) -> dict | None:
        document = await self.documents.find_one({"tenant_id": tenant_id, "id": document_id})
        return self._public(document) if document else None

    async def list_documents(self, tenant_id: str, filters: dict | None = None, limit: int = 200) -> list[dict]:
        query = {"tenant_id": tenant_id, **self._clean_filters(filters or {})}
        cursor = self.documents.find(query, {"_id": 0}).sort("created_at", DESCENDING).limit(limit)
        return await cursor.to_list(length=limit)

    async def create_file_link(self, tenant_id: str, payload: dict, actor_id: str = "") -> dict:
        if not await self.get_file(tenant_id, payload["file_id"]):
            raise LookupError("File not found")
        document = self._base_link(payload, tenant_id, actor_id)
        await self.file_links.update_one(
            {"tenant_id": tenant_id, "file_id": payload["file_id"], "entity_type": payload["entity_type"], "entity_id": payload["entity_id"]},
            {"$setOnInsert": document},
            upsert=True,
        )
        await self.record_activity(tenant_id, payload.get("document_id", ""), "linked", actor_id=actor_id, metadata={"file_id": payload["file_id"], "entity_type": payload["entity_type"], "entity_id": payload["entity_id"]})
        return self._public(document)

    async def create_document_link(self, tenant_id: str, payload: dict, actor_id: str = "") -> dict:
        if not await self.get_document(tenant_id, payload["document_id"]):
            raise LookupError("Document not found")
        document = self._base_link(payload, tenant_id, actor_id)
        await self.document_links.update_one(
            {"tenant_id": tenant_id, "document_id": payload["document_id"], "entity_type": payload["entity_type"], "entity_id": payload["entity_id"]},
            {"$setOnInsert": document},
            upsert=True,
        )
        await self.record_activity(tenant_id, payload["document_id"], "linked", actor_id=actor_id, metadata={"entity_type": payload["entity_type"], "entity_id": payload["entity_id"]})
        return self._public(document)

    async def list_links(self, tenant_id: str, entity_type: str = "", entity_id: str = "") -> dict:
        query = {"tenant_id": tenant_id}
        if entity_type:
            query["entity_type"] = entity_type
        if entity_id:
            query["entity_id"] = entity_id
        return {
            "file_links": await self.file_links.find(query, {"_id": 0}).sort("created_at", DESCENDING).to_list(length=500),
            "document_links": await self.document_links.find(query, {"_id": 0}).sort("created_at", DESCENDING).to_list(length=500),
        }

    async def create_share(self, tenant_id: str, document_id: str, payload: dict, actor_id: str = "") -> dict:
        if not await self.get_document(tenant_id, document_id):
            raise LookupError("Document not found")
        now = utc_now()
        share = {
            **payload,
            "id": payload.get("id") or new_id(),
            "tenant_id": tenant_id,
            "document_id": document_id,
            "created_by": payload.get("created_by") or actor_id,
            "revoked_at": None,
            "created_at": now,
            "updated_at": now,
            "version": 1,
        }
        await self.document_shares.insert_one(share.copy())
        await self.record_activity(tenant_id, document_id, "shared", actor_id=actor_id, metadata={"share_type": share.get("share_type"), "access_level": share.get("access_level")})
        return self._public(share)

    async def record_activity(self, tenant_id: str, document_id: str, activity_type: str, actor_type: str = "user", actor_id: str = "", metadata: dict | None = None) -> dict:
        now = utc_now()
        document = {
            "id": new_id(),
            "tenant_id": tenant_id,
            "document_id": document_id,
            "activity_type": activity_type,
            "actor_type": actor_type,
            "actor_id": actor_id,
            "metadata": self._redact(metadata or {}),
            "created_at": now,
            "updated_at": now,
            "version": 1,
        }
        await self.document_activities.insert_one(document.copy())
        return self._public(document)

    async def list_activities(self, tenant_id: str, document_id: str) -> list[dict]:
        return await self.document_activities.find(
            {"tenant_id": tenant_id, "document_id": document_id},
            {"_id": 0},
        ).sort("created_at", DESCENDING).to_list(length=500)

    def _base_link(self, payload: dict, tenant_id: str, actor_id: str) -> dict:
        now = utc_now()
        return {
            **payload,
            "id": payload.get("id") or new_id(),
            "tenant_id": tenant_id,
            "created_by": payload.get("created_by") or actor_id,
            "created_at": now,
            "updated_at": now,
            "version": 1,
        }

    def _public(self, document: dict | None) -> dict | None:
        if not document:
            return None
        return {key: value for key, value in document.items() if key not in {"_id", "object_path"}}

    def _clean_filters(self, filters: dict) -> dict:
        return {key: value for key, value in filters.items() if value not in {"", None}}

    def _redact(self, metadata: dict) -> dict:
        sensitive = {"password", "secret", "token", "api_key", "authorization"}
        redacted = {}
        for key, value in metadata.items():
            redacted[key] = "[redacted]" if key.lower() in sensitive else value
        return redacted

from pymongo import DESCENDING

try:
    from ..models.base import utc_now
    from ..shared.ids import new_id
    from ..shared.indexes import ensure_collection_indexes
except ImportError:
    from models.base import utc_now
    from shared.ids import new_id
    from shared.indexes import ensure_collection_indexes


TERMINAL_BAD_EMAIL_STATUSES = {"bounce", "dropped", "spamreport", "blocked", "failed"}


class CommunicationsRepository:
    email_collection_name = "email_activity"
    notification_collection_name = "notifications"

    def __init__(self, database):
        self.email_activity = database[self.email_collection_name]
        self.notifications = database[self.notification_collection_name]

    async def ensure_indexes(self):
        await ensure_collection_indexes(self.email_activity, self.email_collection_name)
        await ensure_collection_indexes(self.notifications, self.notification_collection_name)

    async def create_email_activity(self, tenant_id: str, payload: dict, actor_id: str = "") -> dict:
        now = utc_now()
        document = {
            **payload,
            "id": payload.get("id") or new_id(),
            "tenant_id": tenant_id,
            "created_by": payload.get("created_by") or actor_id,
            "created_at": payload.get("created_at") or now,
            "updated_at": payload.get("updated_at") or now,
            "sent_at": payload.get("sent_at") or now,
            "version": 1,
        }
        await self.email_activity.insert_one(document.copy())
        return self._public(document)

    async def list_email_activity(self, tenant_id: str, filters: dict | None = None, limit: int = 100) -> list[dict]:
        query = {"tenant_id": tenant_id, **self._clean(filters or {})}
        cursor = self.email_activity.find(query).sort([("created_at", DESCENDING)]).limit(limit)
        return [self._public(document) async for document in cursor]

    async def apply_email_event(self, event: dict) -> bool:
        tenant_id = str(event.get("tenant_id") or event.get("tenantId") or event.get("custom_args", {}).get("tenant_id") or "")
        provider_message_id = str(event.get("sg_message_id") or event.get("smtp-id") or event.get("message_id") or "")
        if not tenant_id or not provider_message_id:
            return False
        normalized_status = self._normalize_email_status(str(event.get("event") or "sent"))
        existing = await self.email_activity.find_one({"tenant_id": tenant_id, "provider_message_id": provider_message_id})
        if not existing:
            return False
        if existing.get("delivery_status") in TERMINAL_BAD_EMAIL_STATUSES and normalized_status not in TERMINAL_BAD_EMAIL_STATUSES:
            normalized_status = existing.get("delivery_status")
        patch = {
            **existing,
            "delivery_status": normalized_status,
            "status": normalized_status,
            "last_event_at": utc_now(),
            "events": [*(existing.get("events") or []), self._redact_event(event)],
            "updated_at": utc_now(),
            "version": int(existing.get("version", 1)) + 1,
        }
        await self.email_activity.replace_one({"tenant_id": tenant_id, "id": existing["id"]}, patch)
        return True

    async def create_notification(self, tenant_id: str, payload: dict, actor_id: str = "") -> dict:
        now = utc_now()
        document = {
            **payload,
            "id": payload.get("id") or new_id(),
            "tenant_id": tenant_id,
            "created_by": payload.get("created_by") or actor_id,
            "created_at": payload.get("created_at") or now,
            "updated_at": payload.get("updated_at") or now,
            "read_at": payload.get("read_at"),
            "archived_at": payload.get("archived_at"),
            "version": 1,
        }
        await self.notifications.insert_one(document.copy())
        return self._public(document)

    async def list_notifications(self, tenant_id: str, filters: dict | None = None, limit: int = 100) -> list[dict]:
        query = {"tenant_id": tenant_id, **self._clean(filters or {})}
        cursor = self.notifications.find(query).sort([("created_at", DESCENDING)]).limit(limit)
        return [self._public(document) async for document in cursor]

    async def update_notification_status(self, tenant_id: str, notification_id: str, status: str) -> dict | None:
        existing = await self.notifications.find_one({"tenant_id": tenant_id, "id": notification_id})
        if not existing:
            return None
        now = utc_now()
        document = {
            **existing,
            "status": status,
            "updated_at": now,
            "read_at": existing.get("read_at") or (now if status == "read" else None),
            "archived_at": existing.get("archived_at") or (now if status == "archived" else None),
            "version": int(existing.get("version", 1)) + 1,
        }
        await self.notifications.replace_one({"tenant_id": tenant_id, "id": notification_id}, document)
        return self._public(document)

    def _public(self, document: dict) -> dict:
        return {key: value for key, value in document.items() if key != "_id"}

    def _clean(self, filters: dict) -> dict:
        return {key: value for key, value in filters.items() if value not in {"", None}}

    def _normalize_email_status(self, value: str) -> str:
        value = value.lower().strip()
        if value in {"processed", "open", "click"}:
            return "delivered"
        if value in {"bounce", "dropped", "spamreport", "blocked", "deferred", "delivered", "failed"}:
            return value
        return "sent"

    def _redact_event(self, event: dict) -> dict:
        sensitive = {"password", "secret", "token", "api_key", "authorization"}
        return {key: ("[redacted]" if key.lower() in sensitive else value) for key, value in event.items()}

from pymongo import ASCENDING, DESCENDING

try:
    from ..shared.dates import utc_now
    from ..shared.ids import new_id
    from ..shared.indexes import ensure_collection_indexes
    from ..shared.sequences import next_sequence_number
except ImportError:
    from shared.dates import utc_now
    from shared.ids import new_id
    from shared.indexes import ensure_collection_indexes
    from shared.sequences import next_sequence_number


LOCKED_QUOTE_STATUSES = {"approved", "declined", "expired", "converted", "cancelled"}


class QuotesRepository:
    collections = ("quotes", "quote_line_items", "quote_events")

    def __init__(self, database):
        self.database = database
        self.quotes = database.quotes
        self.items = database.quote_line_items
        self.events = database.quote_events

    async def ensure_indexes(self):
        for collection in self.collections:
            await ensure_collection_indexes(self.database[collection], collection)

    async def list_quotes(self, tenant_id: str, filters: dict | None = None, limit: int = 200) -> list[dict]:
        query = {"tenant_id": tenant_id, **self._clean(filters or {})}
        rows = await self.quotes.find(query, {"_id": 0}).sort("updated_at", DESCENDING).limit(limit).to_list(length=limit)
        return [await self._with_projection(tenant_id, row) for row in rows]

    async def get_quote(self, tenant_id: str, quote_id: str, include_items: bool = True) -> dict | None:
        quote = await self.quotes.find_one({"tenant_id": tenant_id, "id": quote_id}, {"_id": 0})
        if not quote:
            return None
        quote = await self._with_projection(tenant_id, quote)
        if include_items:
            quote["line_items"] = await self.list_items(tenant_id, quote_id)
        return quote

    async def create_quote(self, tenant_id: str, payload: dict, actor_id: str = "") -> dict:
        now = utc_now()
        quote_id = new_id()
        line_items = payload.pop("line_items", []) or []
        document = {
            **payload,
            "id": quote_id,
            "tenant_id": tenant_id,
            "quote_number": await next_sequence_number(self.database, tenant_id, "quotes", "QUO"),
            "status": "draft",
            "staff_owner_id": payload.get("staff_owner_id") or actor_id,
            "subtotal_minor": 0,
            "total_minor": 0,
            "created_at": now,
            "updated_at": now,
            "version": 1,
        }
        await self.quotes.insert_one(document.copy())
        for line_item in line_items:
            await self.add_item(tenant_id, quote_id, line_item, recalculate=False)
        await self.recalculate_totals(tenant_id, quote_id)
        await self.record_event(tenant_id, quote_id, "quote_created", actor_id, {"quote_number": document["quote_number"]})
        return await self.get_quote(tenant_id, quote_id)

    async def update_quote(self, tenant_id: str, quote_id: str, patch: dict, actor_id: str = "") -> dict | None:
        existing = await self.quotes.find_one({"tenant_id": tenant_id, "id": quote_id})
        if not existing:
            return None
        if existing.get("status") in LOCKED_QUOTE_STATUSES and "status" not in patch:
            raise ValueError(f"Quote is {existing.get('status')} and can no longer be edited")
        patch = {key: value for key, value in patch.items() if value is not None and key not in {"id", "tenant_id", "created_at", "quote_number"}}
        updated = {
            **existing,
            **patch,
            "updated_at": utc_now(),
            "version": int(existing.get("version", 1)) + 1,
        }
        await self.quotes.replace_one({"tenant_id": tenant_id, "id": quote_id}, updated)
        if patch:
            await self.record_event(tenant_id, quote_id, "quote_updated", actor_id, {"fields": sorted(patch.keys())})
        return await self.get_quote(tenant_id, quote_id)

    async def delete_quote(self, tenant_id: str, quote_id: str) -> bool:
        existing = await self.quotes.find_one({"tenant_id": tenant_id, "id": quote_id})
        if not existing or existing.get("status") == "converted":
            return False
        result = await self.quotes.delete_one({"tenant_id": tenant_id, "id": quote_id})
        await self.items.delete_many({"tenant_id": tenant_id, "quote_id": quote_id})
        return result.deleted_count == 1

    async def list_items(self, tenant_id: str, quote_id: str) -> list[dict]:
        return await self.items.find({"tenant_id": tenant_id, "quote_id": quote_id}, {"_id": 0}).sort("created_at", ASCENDING).to_list(length=200)

    async def add_item(self, tenant_id: str, quote_id: str, payload: dict, actor_id: str = "", recalculate: bool = True) -> dict:
        quote = await self.quotes.find_one({"tenant_id": tenant_id, "id": quote_id})
        if not quote:
            raise LookupError("Quote not found")
        if quote.get("status") in LOCKED_QUOTE_STATUSES:
            raise ValueError(f"Quote is {quote.get('status')} and can no longer be edited")
        now = utc_now()
        document = {
            **payload,
            "id": payload.get("id") or new_id(),
            "tenant_id": tenant_id,
            "quote_id": quote_id,
            "created_at": now,
            "updated_at": now,
            "version": 1,
        }
        await self.items.insert_one(document.copy())
        if recalculate:
            await self.recalculate_totals(tenant_id, quote_id)
            await self.record_event(tenant_id, quote_id, "quote_line_item_added", actor_id, {"item_id": document["id"]})
        return {key: value for key, value in document.items() if key != "_id"}

    async def update_item(self, tenant_id: str, quote_id: str, item_id: str, patch: dict, actor_id: str = "") -> dict | None:
        quote = await self.quotes.find_one({"tenant_id": tenant_id, "id": quote_id})
        if not quote:
            return None
        if quote.get("status") in LOCKED_QUOTE_STATUSES:
            raise ValueError(f"Quote is {quote.get('status')} and can no longer be edited")
        existing = await self.items.find_one({"tenant_id": tenant_id, "id": item_id, "quote_id": quote_id})
        if not existing:
            return None
        patch = {key: value for key, value in patch.items() if value is not None and key not in {"id", "tenant_id", "quote_id", "created_at"}}
        updated = {**existing, **patch, "updated_at": utc_now(), "version": int(existing.get("version", 1)) + 1}
        await self.items.replace_one({"tenant_id": tenant_id, "id": item_id}, updated)
        await self.recalculate_totals(tenant_id, quote_id)
        await self.record_event(tenant_id, quote_id, "quote_line_item_updated", actor_id, {"item_id": item_id, "fields": sorted(patch.keys())})
        return {key: value for key, value in updated.items() if key != "_id"}

    async def set_pricing_override(self, tenant_id: str, quote_id: str, item_id: str, override_price_minor: int, reason: str, actor_id: str) -> dict | None:
        existing = await self.items.find_one({"tenant_id": tenant_id, "id": item_id, "quote_id": quote_id})
        if not existing:
            return None
        now = utc_now()
        original_price_minor = int(existing.get("estimated_price_minor", 0))
        updated = {
            **existing,
            "manual_price_override_minor": override_price_minor,
            "estimated_price_minor": override_price_minor,
            "override_reason": reason,
            "override_actor_id": actor_id,
            "override_at": now,
            "updated_at": now,
            "version": int(existing.get("version", 1)) + 1,
        }
        await self.items.replace_one({"tenant_id": tenant_id, "id": item_id}, updated)
        await self.recalculate_totals(tenant_id, quote_id)
        await self.record_event(tenant_id, quote_id, "quote_line_item_pricing_override_set", actor_id, {
            "item_id": item_id, "original_price_minor": original_price_minor, "override_price_minor": override_price_minor, "reason": reason,
        })
        return {key: value for key, value in updated.items() if key != "_id"}

    async def delete_item(self, tenant_id: str, quote_id: str, item_id: str, actor_id: str = "") -> bool:
        quote = await self.quotes.find_one({"tenant_id": tenant_id, "id": quote_id})
        if not quote:
            return False
        if quote.get("status") in LOCKED_QUOTE_STATUSES:
            raise ValueError(f"Quote is {quote.get('status')} and can no longer be edited")
        result = await self.items.delete_one({"tenant_id": tenant_id, "id": item_id, "quote_id": quote_id})
        if result.deleted_count:
            await self.recalculate_totals(tenant_id, quote_id)
            await self.record_event(tenant_id, quote_id, "quote_line_item_deleted", actor_id, {"item_id": item_id})
        return result.deleted_count == 1

    async def recalculate_totals(self, tenant_id: str, quote_id: str) -> None:
        items = await self.list_items(tenant_id, quote_id)
        subtotal = sum(int(item.get("estimated_price_minor", 0)) for item in items)
        quote = await self.quotes.find_one({"tenant_id": tenant_id, "id": quote_id})
        discount = int(quote.get("discount_minor", 0) or 0)
        tax = int(quote.get("tax_minor", 0) or 0)
        total = max(0, subtotal - discount + tax)
        await self.quotes.update_one(
            {"tenant_id": tenant_id, "id": quote_id},
            {"$set": {"subtotal_minor": subtotal, "total_minor": total, "updated_at": utc_now()}},
        )

    async def send_quote(self, tenant_id: str, quote_id: str, actor_id: str = "") -> dict | None:
        quote = await self.quotes.find_one({"tenant_id": tenant_id, "id": quote_id})
        if not quote:
            return None
        if quote.get("status") not in {"draft", "sent"}:
            raise ValueError(f"Quote is {quote.get('status')} and cannot be sent")
        await self.quotes.update_one(
            {"tenant_id": tenant_id, "id": quote_id},
            {"$set": {"status": "sent", "sent_at": utc_now(), "updated_at": utc_now()}, "$inc": {"version": 1}},
        )
        await self.record_event(tenant_id, quote_id, "quote_sent", actor_id, {})
        return await self.get_quote(tenant_id, quote_id)

    async def approve_quote(self, tenant_id: str, quote_id: str, approval: dict, actor_id: str = "") -> dict | None:
        quote = await self.quotes.find_one({"tenant_id": tenant_id, "id": quote_id})
        if not quote:
            return None
        if quote.get("status") not in {"draft", "sent"}:
            raise ValueError(f"Quote is {quote.get('status')} and cannot be approved")
        items = await self.list_items(tenant_id, quote_id)
        if not items:
            raise ValueError("Add at least one line item before approving a quote")
        now = utc_now()
        await self.quotes.update_one(
            {"tenant_id": tenant_id, "id": quote_id},
            {"$set": {
                "status": "approved",
                "approved_at": now,
                "approved_by_user_id": actor_id,
                "approval_method": approval.get("approval_method", "phone"),
                "approval_note": approval.get("approval_note", ""),
                "approved_contact_name": approval.get("approved_contact_name", ""),
                "updated_at": now,
            }, "$inc": {"version": 1}},
        )
        await self.record_event(tenant_id, quote_id, "quote_approved", actor_id, approval)
        return await self.get_quote(tenant_id, quote_id)

    async def decline_quote(self, tenant_id: str, quote_id: str, reason: str, actor_id: str = "") -> dict | None:
        quote = await self.quotes.find_one({"tenant_id": tenant_id, "id": quote_id})
        if not quote:
            return None
        if quote.get("status") not in {"draft", "sent"}:
            raise ValueError(f"Quote is {quote.get('status')} and cannot be declined")
        now = utc_now()
        await self.quotes.update_one(
            {"tenant_id": tenant_id, "id": quote_id},
            {"$set": {"status": "declined", "declined_at": now, "decline_reason": reason, "updated_at": now}, "$inc": {"version": 1}},
        )
        await self.record_event(tenant_id, quote_id, "quote_declined", actor_id, {"reason": reason})
        return await self.get_quote(tenant_id, quote_id)

    async def convert_to_order(self, tenant_id: str, quote_id: str, orders_repository, actor_id: str = "") -> dict:
        quote = await self.quotes.find_one({"tenant_id": tenant_id, "id": quote_id})
        if not quote:
            raise LookupError("Quote not found")
        if quote.get("converted_order_id"):
            order = await orders_repository.get_order(tenant_id, quote["converted_order_id"])
            return {"order": order, "quote": await self.get_quote(tenant_id, quote_id)}
        if quote.get("status") != "approved":
            raise ValueError("Only an approved quote can be converted into an order")

        line_items = await self.list_items(tenant_id, quote_id)
        order_payload = {
            "customer_id": quote.get("customer_id", ""),
            "customer_name": quote.get("customer_name", ""),
            "contact_name": quote.get("contact_name", ""),
            "phone": quote.get("phone", ""),
            "email": quote.get("email", ""),
            "company_name": quote.get("company_name", ""),
            "order_source": quote.get("lead_source", "phone"),
            "status": "approved",
            "payment_status": "unpaid",
            "approval_status": "approved",
            "order_title": quote.get("title") or f"Order for {quote.get('quote_number')}",
            "customer_notes": quote.get("notes", ""),
            "internal_notes": f"Converted from quote {quote.get('quote_number')}.",
            "source_quote_id": quote_id,
            "created_by": actor_id,
        }
        order = await orders_repository.create_order(tenant_id, order_payload)

        for line_item in line_items:
            item_payload = {
                "order_id": order["id"],
                "item_name": line_item.get("item_name", ""),
                "item_category": line_item.get("item_category", "custom"),
                "item_subcategory": line_item.get("item_subcategory", ""),
                "quantity": line_item.get("quantity", 1),
                "unit_type": line_item.get("unit_type", "each"),
                "description": line_item.get("description", ""),
                "specs": line_item.get("specs", {}),
                "estimated_price_minor": line_item.get("estimated_price_minor", 0),
                "material_estimate_minor": line_item.get("material_estimate_minor", 0),
                "labor_estimate_minor": line_item.get("labor_estimate_minor", 0),
                "production_required": line_item.get("production_required"),
                "created_by": actor_id,
            }
            await orders_repository.create_item(tenant_id, item_payload)

        now = utc_now()
        await self.quotes.update_one(
            {"tenant_id": tenant_id, "id": quote_id},
            {"$set": {"status": "converted", "converted_at": now, "converted_order_id": order["id"], "updated_at": now}, "$inc": {"version": 1}},
        )
        await self.record_event(tenant_id, quote_id, "quote_converted_to_order", actor_id, {"order_id": order["id"], "order_number": order.get("order_number")})
        await orders_repository.record_event(tenant_id, order["id"], "", "order_created_from_quote", actor_id, {"quote_id": quote_id, "quote_number": quote.get("quote_number")})

        return {"order": await orders_repository.get_order(tenant_id, order["id"], include_items=True), "quote": await self.get_quote(tenant_id, quote_id)}

    async def record_event(self, tenant_id: str, quote_id: str, event_type: str, actor_id: str = "", metadata: dict | None = None) -> dict:
        now = utc_now()
        document = {
            "id": new_id(),
            "tenant_id": tenant_id,
            "quote_id": quote_id,
            "event_type": event_type,
            "actor_id": actor_id,
            "actor_type": "user",
            "metadata": metadata or {},
            "created_at": now,
            "updated_at": now,
            "version": 1,
        }
        await self.events.insert_one(document.copy())
        return {key: value for key, value in document.items() if key != "_id"}

    async def list_events(self, tenant_id: str, quote_id: str) -> list[dict]:
        return await self.events.find({"tenant_id": tenant_id, "quote_id": quote_id}, {"_id": 0}).sort("created_at", DESCENDING).to_list(length=200)

    async def _with_projection(self, tenant_id: str, quote: dict) -> dict:
        items = await self.items.find({"tenant_id": tenant_id, "quote_id": quote["id"]}, {"_id": 0}).to_list(length=200)
        return {**quote, "line_item_count": len(items)}

    def _clean(self, filters: dict) -> dict:
        return {key: value for key, value in filters.items() if value not in {"", None}}

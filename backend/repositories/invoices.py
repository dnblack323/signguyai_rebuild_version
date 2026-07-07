from pymongo import DESCENDING

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


LOCKED_INVOICE_STATUSES = {"void", "cancelled"}


class InvoicesRepository:
    collections = ("invoices", "invoice_events")

    def __init__(self, database):
        self.database = database
        self.invoices = database.invoices
        self.events = database.invoice_events
        self.orders = database.orders
        self.order_items = database.order_items

    async def ensure_indexes(self):
        for collection in self.collections:
            await ensure_collection_indexes(self.database[collection], collection)

    async def list_invoices(self, tenant_id: str, filters: dict | None = None, limit: int = 200) -> list[dict]:
        query = {"tenant_id": tenant_id, **self._clean(filters or {})}
        return await self.invoices.find(query, {"_id": 0}).sort("created_at", DESCENDING).limit(limit).to_list(length=limit)

    async def get_invoice(self, tenant_id: str, invoice_id: str) -> dict | None:
        return await self.invoices.find_one({"tenant_id": tenant_id, "id": invoice_id}, {"_id": 0})

    async def list_by_order(self, tenant_id: str, order_id: str) -> list[dict]:
        return await self.list_invoices(tenant_id, {"order_id": order_id})

    async def generate_from_order(self, tenant_id: str, order_id: str, actor_id: str = "") -> dict:
        order = await self.orders.find_one({"tenant_id": tenant_id, "id": order_id}, {"_id": 0})
        if not order:
            raise LookupError("Order not found")
        items = await self.order_items.find({"tenant_id": tenant_id, "order_id": order_id}, {"_id": 0}).to_list(length=1000)
        if not items:
            raise ValueError("Add at least one order item before generating an invoice")

        line_items = [{
            "order_item_id": item["id"],
            "item_number": item.get("item_number", ""),
            "description": item.get("item_name", ""),
            "quantity": item.get("quantity", 1),
            "amount_minor": int(item.get("estimated_price_minor", 0) or 0),
        } for item in items]
        subtotal = sum(int(item.get("amount_minor", 0)) for item in line_items)

        now = utc_now()
        document = {
            "id": new_id(),
            "tenant_id": tenant_id,
            "invoice_number": await next_sequence_number(self.database, tenant_id, "invoices", "INV"),
            "order_id": order_id,
            "order_number": order.get("order_number", ""),
            "customer_id": order.get("customer_id", ""),
            "customer_name": order.get("customer_name", ""),
            "contact_name": order.get("contact_name", ""),
            "email": order.get("email", ""),
            "phone": order.get("phone", ""),
            "status": "draft",
            "line_items": line_items,
            "subtotal_minor": subtotal,
            "discount_minor": 0,
            "tax_minor": 0,
            "total_minor": subtotal,
            "amount_paid_minor": 0,
            "balance_due_minor": subtotal,
            "invoice_date": now.date().isoformat(),
            "notes": "",
            "payment_terms": "Due on receipt unless otherwise agreed.",
            "created_at": now,
            "updated_at": now,
            "version": 1,
        }
        await self.invoices.insert_one(document.copy())
        await self.orders.update_one({"tenant_id": tenant_id, "id": order_id}, {"$set": {"payment_status": "invoiced", "updated_at": now}})
        await self.record_event(tenant_id, document["id"], "invoice_generated", actor_id, {"invoice_number": document["invoice_number"], "total_minor": subtotal, "order_id": order_id})
        return {key: value for key, value in document.items() if key != "_id"}

    async def update_invoice(self, tenant_id: str, invoice_id: str, patch: dict, actor_id: str = "") -> dict | None:
        existing = await self.invoices.find_one({"tenant_id": tenant_id, "id": invoice_id})
        if not existing:
            return None
        if existing.get("status") in LOCKED_INVOICE_STATUSES and patch.get("status") not in {None, *LOCKED_INVOICE_STATUSES}:
            raise ValueError(f"Invoice is {existing.get('status')} and can no longer be edited")
        patch = {key: value for key, value in patch.items() if value is not None and key not in {"id", "tenant_id", "created_at", "invoice_number", "order_id"}}
        subtotal = int(existing.get("subtotal_minor", 0))
        discount = int(patch.get("discount_minor", existing.get("discount_minor", 0)) or 0)
        tax = int(patch.get("tax_minor", existing.get("tax_minor", 0)) or 0)
        total = max(0, subtotal - discount + tax)
        paid = int(existing.get("amount_paid_minor", 0))
        updated = {
            **existing,
            **patch,
            "total_minor": total,
            "balance_due_minor": max(0, total - paid),
            "updated_at": utc_now(),
            "version": int(existing.get("version", 1)) + 1,
        }
        await self.invoices.replace_one({"tenant_id": tenant_id, "id": invoice_id}, updated)
        if patch:
            await self.record_event(tenant_id, invoice_id, "invoice_updated", actor_id, {"fields": sorted(patch.keys())})
        return {key: value for key, value in updated.items() if key != "_id"}

    async def record_payment(self, tenant_id: str, invoice_id: str, payment: dict, actor_id: str = "") -> dict | None:
        existing = await self.invoices.find_one({"tenant_id": tenant_id, "id": invoice_id})
        if not existing:
            return None
        if existing.get("status") in LOCKED_INVOICE_STATUSES:
            raise ValueError(f"Invoice is {existing.get('status')} and cannot receive payments")
        amount_minor = int(payment.get("amount_minor", 0))
        if amount_minor <= 0:
            raise ValueError("Payment amount must be greater than zero")
        total = int(existing.get("total_minor", 0))
        paid = int(existing.get("amount_paid_minor", 0)) + amount_minor
        balance = max(0, total - paid)
        status = "paid" if balance == 0 else "partially_paid"
        now = utc_now()
        updated = {
            **existing,
            "amount_paid_minor": paid,
            "balance_due_minor": balance,
            "status": status,
            "updated_at": now,
            "version": int(existing.get("version", 1)) + 1,
        }
        await self.invoices.replace_one({"tenant_id": tenant_id, "id": invoice_id}, updated)
        await self.orders.update_one({"tenant_id": tenant_id, "id": existing["order_id"]}, {"$set": {"payment_status": status, "updated_at": now}})
        await self.record_event(tenant_id, invoice_id, "invoice_payment_recorded", actor_id, {
            "amount_minor": amount_minor,
            "payment_method": payment.get("payment_method", "cash"),
            "note": payment.get("note", ""),
            "balance_due_minor": balance,
        })
        return {key: value for key, value in updated.items() if key != "_id"}

    async def record_event(self, tenant_id: str, invoice_id: str, event_type: str, actor_id: str = "", metadata: dict | None = None) -> dict:
        now = utc_now()
        document = {
            "id": new_id(),
            "tenant_id": tenant_id,
            "invoice_id": invoice_id,
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

    async def list_events(self, tenant_id: str, invoice_id: str) -> list[dict]:
        return await self.events.find({"tenant_id": tenant_id, "invoice_id": invoice_id}, {"_id": 0}).sort("created_at", DESCENDING).to_list(length=200)

    def _clean(self, filters: dict) -> dict:
        return {key: value for key, value in filters.items() if value not in {"", None}}

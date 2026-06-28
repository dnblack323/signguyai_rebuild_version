from pymongo import ASCENDING, DESCENDING, ReturnDocument

try:
    from ..shared.dates import utc_now
    from ..shared.ids import new_id
    from ..shared.indexes import ensure_collection_indexes
except ImportError:
    from shared.dates import utc_now
    from shared.ids import new_id
    from shared.indexes import ensure_collection_indexes


class OrdersRepository:
    collections = ("orders", "order_items", "order_item_specs", "order_item_pricing_snapshots", "order_events", "quote_drafts", "invoice_drafts", "work_order_drafts")

    def __init__(self, database):
        self.database = database
        self.orders = database.orders
        self.items = database.order_items
        self.specs = database.order_item_specs
        self.snapshots = database.order_item_pricing_snapshots
        self.events = database.order_events
        self.quote_drafts = database.quote_drafts
        self.invoice_drafts = database.invoice_drafts
        self.work_order_drafts = database.work_order_drafts

    async def ensure_indexes(self):
        for collection in self.collections:
            await ensure_collection_indexes(self.database[collection], collection)

    async def list_orders(self, tenant_id: str, filters: dict | None = None, limit: int = 200) -> list[dict]:
        query = {"tenant_id": tenant_id, **self._clean(filters or {})}
        rows = await self.orders.find(query, {"_id": 0}).sort("updated_at", DESCENDING).limit(limit).to_list(length=limit)
        return [await self._with_projection(tenant_id, row) for row in rows]

    async def get_order(self, tenant_id: str, order_id: str, include_items: bool = True) -> dict | None:
        order = await self.orders.find_one({"tenant_id": tenant_id, "id": order_id}, {"_id": 0})
        if not order:
            return None
        order = await self._with_projection(tenant_id, order)
        if include_items:
            order["items"] = await self.list_items(tenant_id, order_id=order_id)
        return order

    async def create_order(self, tenant_id: str, payload: dict) -> dict:
        now = utc_now()
        order_id = payload.get("id") or new_id()
        order_number = payload.get("order_number") or await self._next_order_number(tenant_id)
        document = {
            **payload,
            "id": order_id,
            "tenant_id": tenant_id,
            "order_number": order_number,
            "name": payload.get("name") or self._default_order_name(payload, now),
            "created_at": now,
            "updated_at": now,
            "version": 1,
            "is_archived": False,
        }
        document.pop("items", None)
        await self.orders.insert_one(document.copy())
        await self.record_event(tenant_id, order_id, "", "order_created", payload.get("created_by", ""), {"status": document.get("status")})
        return await self.get_order(tenant_id, order_id, include_items=True)

    async def update_order(self, tenant_id: str, order_id: str, patch: dict) -> dict | None:
        existing = await self.orders.find_one({"tenant_id": tenant_id, "id": order_id})
        if not existing:
            return None
        patch = {key: value for key, value in patch.items() if value is not None and key not in {"id", "tenant_id", "created_at", "order_number", "items"}}
        updated = {
            **existing,
            **patch,
            "id": order_id,
            "tenant_id": tenant_id,
            "created_at": existing.get("created_at"),
            "updated_at": utc_now(),
            "version": int(existing.get("version", 1)) + 1,
        }
        await self.orders.replace_one({"tenant_id": tenant_id, "id": order_id}, updated)
        if patch.get("status") and patch.get("status") != existing.get("status"):
            await self.record_event(tenant_id, order_id, "", "order_status_changed", patch.get("actor_id", ""), {"from": existing.get("status"), "to": patch["status"]})
        return await self.get_order(tenant_id, order_id, include_items=True)

    async def delete_order(self, tenant_id: str, order_id: str) -> bool:
        updated = await self.update_order(tenant_id, order_id, {"is_archived": True, "status": "cancelled"})
        if updated:
            await self.record_event(tenant_id, order_id, "", "order_archived", "", {})
        return bool(updated)

    async def list_items(self, tenant_id: str, order_id: str = "", category: str = "") -> list[dict]:
        query = {"tenant_id": tenant_id, **self._clean({"order_id": order_id, "item_category": category})}
        rows = await self.items.find(query, {"_id": 0}).sort("created_at", ASCENDING).to_list(length=500)
        return [await self._hydrate_item(tenant_id, row) for row in rows]

    async def get_item(self, tenant_id: str, item_id: str) -> dict | None:
        item = await self.items.find_one({"tenant_id": tenant_id, "id": item_id}, {"_id": 0})
        return await self._hydrate_item(tenant_id, item) if item else None

    async def create_item(self, tenant_id: str, payload: dict) -> dict:
        order = await self.get_order(tenant_id, payload["order_id"], include_items=False)
        if not order:
            raise LookupError("Order not found")
        now = utc_now()
        item_id = payload.get("id") or new_id()
        item_number = payload.get("item_number") or await self._next_item_number(tenant_id, order["id"], order["order_number"])
        specs = payload.pop("specs", {})
        document = {
            **payload,
            "id": item_id,
            "tenant_id": tenant_id,
            "customer_id": order.get("customer_id", ""),
            "item_number": item_number,
            "created_at": now,
            "updated_at": now,
            "version": 1,
        }
        await self.items.insert_one(document.copy())
        await self.save_item_specs(tenant_id, item_id, order["id"], specs)
        await self.record_event(tenant_id, order["id"], item_id, "order_item_created", payload.get("created_by", ""), {"item_category": document.get("item_category")})
        return await self.get_item(tenant_id, item_id)

    async def update_item(self, tenant_id: str, item_id: str, patch: dict) -> dict | None:
        existing = await self.items.find_one({"tenant_id": tenant_id, "id": item_id})
        if not existing:
            return None
        specs = patch.pop("specs", None)
        patch = {key: value for key, value in patch.items() if value is not None and key not in {"id", "tenant_id", "created_at", "order_id", "item_number"}}
        updated = {
            **existing,
            **patch,
            "updated_at": utc_now(),
            "version": int(existing.get("version", 1)) + 1,
        }
        await self.items.replace_one({"tenant_id": tenant_id, "id": item_id}, updated)
        if specs is not None:
            await self.save_item_specs(tenant_id, item_id, existing["order_id"], specs)
        if patch.get("status") and patch.get("status") != existing.get("status"):
            await self.record_event(tenant_id, existing["order_id"], item_id, "order_item_status_changed", patch.get("actor_id", ""), {"from": existing.get("status"), "to": patch["status"]})
        return await self.get_item(tenant_id, item_id)

    async def delete_item(self, tenant_id: str, item_id: str) -> bool:
        item = await self.items.find_one({"tenant_id": tenant_id, "id": item_id})
        if not item:
            return False
        result = await self.items.delete_one({"tenant_id": tenant_id, "id": item_id})
        await self.specs.delete_many({"tenant_id": tenant_id, "order_item_id": item_id})
        await self.record_event(tenant_id, item["order_id"], item_id, "order_item_deleted", "", {})
        return result.deleted_count == 1

    async def save_item_specs(self, tenant_id: str, item_id: str, order_id: str, specs: dict) -> dict:
        now = utc_now()
        document = {
            "id": new_id(),
            "tenant_id": tenant_id,
            "order_id": order_id,
            "order_item_id": item_id,
            "specs": specs or {},
            "created_at": now,
            "updated_at": now,
            "version": 1,
        }
        await self.specs.update_one(
            {"tenant_id": tenant_id, "order_item_id": item_id},
            {"$set": document},
            upsert=True,
        )
        return document

    async def save_pricing_snapshot(self, tenant_id: str, item: dict, calculation: dict) -> dict:
        now = utc_now()
        document = {
            "id": new_id(),
            "tenant_id": tenant_id,
            "order_id": item["order_id"],
            "order_item_id": item["id"],
            "item_category": item["item_category"],
            "calculation": calculation,
            "selling_price_minor": calculation["selling_price_minor"],
            "material_cost_minor": calculation["material_cost_minor"],
            "labor_cost_minor": calculation["labor_cost_minor"],
            "created_at": now,
            "updated_at": now,
            "version": 1,
        }
        await self.snapshots.insert_one(document.copy())
        await self.items.update_one(
            {"tenant_id": tenant_id, "id": item["id"]},
            {"$set": {
                "estimated_price_minor": calculation["selling_price_minor"],
                "material_estimate_minor": calculation["material_cost_minor"],
                "labor_estimate_minor": calculation["labor_cost_minor"],
                "updated_at": now,
            }, "$inc": {"version": 1}},
        )
        await self.record_event(tenant_id, item["order_id"], item["id"], "pricing_snapshot_saved", "", {"selling_price_minor": calculation["selling_price_minor"]})
        return {key: value for key, value in document.items() if key != "_id"}

    async def list_pricing_snapshots(self, tenant_id: str, item_id: str) -> list[dict]:
        return await self.snapshots.find({"tenant_id": tenant_id, "order_item_id": item_id}, {"_id": 0}).sort("created_at", DESCENDING).to_list(length=50)

    async def record_event(self, tenant_id: str, order_id: str, item_id: str, event_type: str, actor_id: str = "", metadata: dict | None = None) -> dict:
        now = utc_now()
        document = {
            "id": new_id(),
            "tenant_id": tenant_id,
            "order_id": order_id,
            "order_item_id": item_id,
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

    async def list_events(self, tenant_id: str, order_id: str, item_id: str = "") -> list[dict]:
        query = {"tenant_id": tenant_id, "order_id": order_id, **self._clean({"order_item_id": item_id})}
        return await self.events.find(query, {"_id": 0}).sort("created_at", DESCENDING).to_list(length=500)

    async def list_quote_drafts(self, tenant_id: str, order_id: str) -> list[dict]:
        return await self.quote_drafts.find({"tenant_id": tenant_id, "order_id": order_id}, {"_id": 0}).sort("created_at", DESCENDING).to_list(length=50)

    async def list_invoice_drafts(self, tenant_id: str, order_id: str) -> list[dict]:
        return await self.invoice_drafts.find({"tenant_id": tenant_id, "order_id": order_id}, {"_id": 0}).sort("created_at", DESCENDING).to_list(length=50)

    async def list_work_order_drafts(self, tenant_id: str, order_id: str) -> list[dict]:
        return await self.work_order_drafts.find({"tenant_id": tenant_id, "order_id": order_id}, {"_id": 0}).sort("created_at", DESCENDING).to_list(length=50)

    async def get_quote_draft(self, tenant_id: str, quote_id: str) -> dict | None:
        return await self.quote_drafts.find_one({"tenant_id": tenant_id, "id": quote_id}, {"_id": 0})

    async def update_quote_draft(self, tenant_id: str, order_id: str, quote_id: str, patch: dict, actor_id: str = "") -> dict | None:
        existing = await self.quote_drafts.find_one({"tenant_id": tenant_id, "id": quote_id, "order_id": order_id})
        if not existing:
            return None
        allowed = {"status", "title", "notes", "internal_notes", "terms", "discount_minor", "tax_minor"}
        patch = {key: value for key, value in patch.items() if key in allowed and value is not None}
        if "discount_minor" in patch:
            patch["discount_minor"] = max(0, int(patch["discount_minor"] or 0))
        if "tax_minor" in patch:
            patch["tax_minor"] = max(0, int(patch["tax_minor"] or 0))
        subtotal = int(existing.get("subtotal_minor", 0))
        discount = int(patch.get("discount_minor", existing.get("discount_minor", 0)) or 0)
        tax = int(patch.get("tax_minor", existing.get("tax_minor", 0)) or 0)
        updated = {
            **existing,
            **patch,
            "total_minor": max(0, subtotal - discount + tax),
            "updated_at": utc_now(),
            "version": int(existing.get("version", 1)) + 1,
        }
        await self.quote_drafts.replace_one({"tenant_id": tenant_id, "id": quote_id, "order_id": order_id}, updated)
        if patch:
            await self.record_event(tenant_id, order_id, "", "quote_draft_updated", actor_id, {"quote_id": quote_id, "fields": sorted(patch.keys())})
        return {key: value for key, value in updated.items() if key != "_id"}

    async def generate_quote_draft(self, tenant_id: str, order_id: str, actor_id: str = "") -> dict:
        order = await self.get_order(tenant_id, order_id, include_items=True)
        if not order:
            raise LookupError("Order not found")
        items = order.get("items", [])
        if not items:
            raise ValueError("Add at least one order item before generating a quote")

        line_items = []
        subtotal = 0
        for item in items:
            snapshot = item.get("latest_pricing_snapshot") or {}
            calculation = snapshot.get("calculation") or {}
            unit_total = int(item.get("estimated_price_minor") or calculation.get("selling_price_minor") or 0)
            subtotal += unit_total
            line_items.append({
                "order_item_id": item["id"],
                "item_number": item.get("item_number", ""),
                "item_name": item.get("item_name", ""),
                "item_category": item.get("item_category", ""),
                "quantity": item.get("quantity", 1),
                "unit_type": item.get("unit_type", "each"),
                "description": item.get("description", ""),
                "selling_price_minor": unit_total,
                "material_cost_minor": int(item.get("material_estimate_minor") or calculation.get("material_cost_minor") or 0),
                "labor_cost_minor": int(item.get("labor_estimate_minor") or calculation.get("labor_cost_minor") or 0),
                "pricing_snapshot_id": snapshot.get("id", ""),
                "specs": item.get("specs", {}),
            })

        now = utc_now()
        document = {
            "id": new_id(),
            "tenant_id": tenant_id,
            "quote_number": await self._next_quote_number(tenant_id),
            "order_id": order_id,
            "order_number": order.get("order_number", ""),
            "customer_id": order.get("customer_id", ""),
            "customer_name": order.get("customer_name", ""),
            "contact_name": order.get("contact_name", ""),
            "email": order.get("email", ""),
            "phone": order.get("phone", ""),
            "status": "draft_internal",
            "title": order.get("order_title") or f"Quote for {order.get('order_number', 'order')}",
            "source": "order_snapshot",
            "line_items": line_items,
            "subtotal_minor": subtotal,
            "discount_minor": 0,
            "tax_minor": 0,
            "total_minor": subtotal,
            "notes": order.get("customer_notes", ""),
            "internal_notes": "Generated from current order item pricing snapshots.",
            "terms": "Quote is valid for 30 days. Production starts after written approval and required deposit.",
            "created_at": now,
            "updated_at": now,
            "version": 1,
        }
        await self.quote_drafts.insert_one(document.copy())
        await self.record_event(tenant_id, order_id, "", "quote_draft_generated", actor_id, {"quote_id": document["id"], "quote_number": document["quote_number"], "total_minor": subtotal})
        await self.update_order(tenant_id, order_id, {"status": "quote_sent" if order.get("status") in {"awaiting_quote", "awaiting_review", "new_intake", "draft"} else order.get("status")})
        return {key: value for key, value in document.items() if key != "_id"}

    async def generate_invoice_draft(self, tenant_id: str, order_id: str, actor_id: str = "") -> dict:
        order = await self.get_order(tenant_id, order_id, include_items=True)
        if not order:
            raise LookupError("Order not found")

        quote_drafts = await self.list_quote_drafts(tenant_id, order_id)
        source_quote = next((quote for quote in quote_drafts if quote.get("status") == "approved"), quote_drafts[0] if quote_drafts else None)
        if source_quote:
            line_items = [{
                "source_quote_line": item.get("order_item_id", ""),
                "item_number": item.get("item_number", ""),
                "description": item.get("item_name", ""),
                "quantity": item.get("quantity", 1),
                "amount_minor": int(item.get("selling_price_minor", 0) or 0),
            } for item in source_quote.get("line_items", [])]
            subtotal = int(source_quote.get("subtotal_minor", 0) or 0)
            discount = int(source_quote.get("discount_minor", 0) or 0)
            tax = int(source_quote.get("tax_minor", 0) or 0)
            total = int(source_quote.get("total_minor", 0) or 0)
            source_type = "quote_draft"
            source_quote_id = source_quote.get("id", "")
        else:
            items = order.get("items", [])
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
            discount = 0
            tax = 0
            total = subtotal
            source_type = "order_snapshot"
            source_quote_id = ""

        now = utc_now()
        document = {
            "id": new_id(),
            "tenant_id": tenant_id,
            "invoice_number": await self._next_invoice_number(tenant_id),
            "order_id": order_id,
            "order_number": order.get("order_number", ""),
            "quote_draft_id": source_quote_id,
            "customer_id": order.get("customer_id", ""),
            "customer_name": order.get("customer_name", ""),
            "contact_name": order.get("contact_name", ""),
            "email": order.get("email", ""),
            "phone": order.get("phone", ""),
            "status": "draft_unpaid",
            "source": source_type,
            "line_items": line_items,
            "subtotal_minor": subtotal,
            "discount_minor": discount,
            "tax_minor": tax,
            "total_minor": total,
            "amount_paid_minor": 0,
            "balance_due_minor": total,
            "payment_terms": "Due on receipt unless otherwise agreed.",
            "created_at": now,
            "updated_at": now,
            "version": 1,
        }
        await self.invoice_drafts.insert_one(document.copy())
        await self.record_event(tenant_id, order_id, "", "invoice_draft_generated", actor_id, {"invoice_id": document["id"], "invoice_number": document["invoice_number"], "total_minor": total})
        return {key: value for key, value in document.items() if key != "_id"}

    async def generate_work_order_draft(self, tenant_id: str, order_id: str, actor_id: str = "") -> dict:
        order = await self.get_order(tenant_id, order_id, include_items=True)
        if not order:
            raise LookupError("Order not found")
        items = order.get("items", [])
        if not items:
            raise ValueError("Add at least one order item before generating a work order")

        now = utc_now()
        production_items = []
        for position, item in enumerate(items, start=1):
            production_items.append({
                "order_item_id": item["id"],
                "item_number": item.get("item_number", ""),
                "item_name": item.get("item_name", ""),
                "item_category": item.get("item_category", ""),
                "quantity": item.get("quantity", 1),
                "status": item.get("status", "new"),
                "priority": item.get("priority", "normal"),
                "department_route": item.get("department_route", ""),
                "assigned_team": item.get("assigned_team", ""),
                "due_date": item.get("due_date"),
                "production_notes": item.get("production_notes", ""),
                "install_notes": item.get("install_notes", ""),
                "special_instructions": item.get("special_instructions", ""),
                "specs": item.get("specs", {}),
                "step_order": position,
                "tasks": self._default_production_tasks(item),
            })

        document = {
            "id": new_id(),
            "tenant_id": tenant_id,
            "work_order_number": await self._next_work_order_number(tenant_id),
            "order_id": order_id,
            "order_number": order.get("order_number", ""),
            "customer_id": order.get("customer_id", ""),
            "customer_name": order.get("customer_name", ""),
            "status": "draft",
            "source": "order_items_snapshot",
            "production_items": production_items,
            "item_count": len(production_items),
            "shared_production_notes": order.get("shared_production_notes", ""),
            "shared_design_notes": order.get("shared_design_notes", ""),
            "shared_install_notes": order.get("shared_install_notes", ""),
            "shared_color_brand_notes": order.get("shared_color_brand_notes", ""),
            "created_at": now,
            "updated_at": now,
            "version": 1,
        }
        await self.work_order_drafts.insert_one(document.copy())
        await self.record_event(tenant_id, order_id, "", "work_order_draft_generated", actor_id, {"work_order_id": document["id"], "work_order_number": document["work_order_number"], "item_count": len(production_items)})
        await self.update_order(tenant_id, order_id, {"status": "in_production" if order.get("status") in {"approved", "awaiting_approval", "quote_sent"} else order.get("status")})
        return {key: value for key, value in document.items() if key != "_id"}

    async def _hydrate_item(self, tenant_id: str, item: dict) -> dict:
        spec = await self.specs.find_one({"tenant_id": tenant_id, "order_item_id": item["id"]}, {"_id": 0})
        snapshots = await self.list_pricing_snapshots(tenant_id, item["id"])
        return {**item, "specs": spec.get("specs", {}) if spec else {}, "latest_pricing_snapshot": snapshots[0] if snapshots else None}

    async def _with_projection(self, tenant_id: str, order: dict) -> dict:
        items = await self.items.find({"tenant_id": tenant_id, "order_id": order["id"]}, {"_id": 0}).to_list(length=1000)
        total = sum(int(item.get("estimated_price_minor", 0)) for item in items)
        completed = sum(1 for item in items if item.get("status") == "completed")
        return {**order, "order_item_count": len(items), "overall_progress": round((completed / len(items)) * 100, 2) if items else 0, "estimated_total_minor": total}

    async def _next_order_number(self, tenant_id: str) -> str:
        count = await self.orders.count_documents({"tenant_id": tenant_id})
        return f"ORD-{count + 1:04d}"

    async def _next_item_number(self, tenant_id: str, order_id: str, order_number: str) -> str:
        count = await self.items.count_documents({"tenant_id": tenant_id, "order_id": order_id})
        return f"{order_number}-{count + 1:02d}"

    async def _next_quote_number(self, tenant_id: str) -> str:
        count = await self.quote_drafts.count_documents({"tenant_id": tenant_id})
        return f"Q-{count + 1:04d}"

    async def _next_invoice_number(self, tenant_id: str) -> str:
        count = await self.invoice_drafts.count_documents({"tenant_id": tenant_id})
        return f"INV-{count + 1:04d}"

    async def _next_work_order_number(self, tenant_id: str) -> str:
        count = await self.work_order_drafts.count_documents({"tenant_id": tenant_id})
        return f"WO-{count + 1:04d}"

    def _default_production_tasks(self, item: dict) -> list[dict]:
        category = item.get("item_category", "custom")
        base = ["review_specs", "prep_artwork", "produce", "quality_check", "pack_or_stage"]
        if category == "vehicle_wrap":
            base = ["review_vehicle_specs", "pre_install_inspection", "print_laminate_panels", "install_wrap", "post_install_qc"]
        elif category in {"banners", "rigid_signs", "digital_print"}:
            base = ["review_specs", "preflight_artwork", "print_or_fabricate", "finish_edges_or_mount", "quality_check"]
        elif category == "apparel":
            base = ["review_sizes", "prep_decoration_files", "decorate_apparel", "quality_check", "pack"]
        return [{"task_key": task, "status": "not_started"} for task in base]

    def _default_order_name(self, payload: dict, now) -> str:
        customer = payload.get("customer_name") or payload.get("company_name") or "ORDER"
        return f"{customer.upper().replace(' ', '-')}-{now.strftime('%m%d%y')}"

    def _clean(self, filters: dict) -> dict:
        return {key: value for key, value in filters.items() if value not in {"", None}}

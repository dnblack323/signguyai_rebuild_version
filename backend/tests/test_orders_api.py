import unittest
from copy import deepcopy
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from server import app


class FakeOrdersRepository:
    def __init__(self):
        self.orders = {}
        self.items = {}
        self.events = []
        self.snapshots = []
        self.quote_drafts = []
        self.invoice_drafts = []
        self.work_order_drafts = []
        self.counter = 0

    async def ensure_indexes(self):
        return None

    def _id(self, prefix):
        self.counter += 1
        return f"{prefix}-{self.counter}"

    async def create_order(self, tenant_id, payload):
        order_id = payload.get("id") or self._id("ORDID")
        order = {
            **payload,
            "id": order_id,
            "tenant_id": tenant_id,
            "order_number": payload.get("order_number") or f"ORD-{len(self.orders) + 1:04d}",
            "status": payload.get("status", "draft"),
            "order_item_count": 0,
            "overall_progress": 0,
            "estimated_total_minor": 0,
        }
        self.orders[(tenant_id, order_id)] = order
        await self.record_event(tenant_id, order_id, "", "order_created")
        return deepcopy(order) | {"items": []}

    async def list_orders(self, tenant_id, filters=None, limit=200):
        rows = [deepcopy(row) for (tenant, _), row in self.orders.items() if tenant == tenant_id]
        for key, value in (filters or {}).items():
            if value:
                rows = [row for row in rows if row.get(key) == value]
        return rows

    async def get_order(self, tenant_id, order_id, include_items=True):
        row = self.orders.get((tenant_id, order_id))
        if not row:
            return None
        result = deepcopy(row)
        if include_items:
            result["items"] = await self.list_items(tenant_id, order_id=order_id)
        return result

    async def update_order(self, tenant_id, order_id, patch):
        row = self.orders.get((tenant_id, order_id))
        if not row:
            return None
        row = {**row, **patch}
        self.orders[(tenant_id, order_id)] = row
        if patch.get("status"):
            await self.record_event(tenant_id, order_id, "", "order_status_changed")
        return await self.get_order(tenant_id, order_id)

    async def delete_order(self, tenant_id, order_id):
        return bool(await self.update_order(tenant_id, order_id, {"is_archived": True, "status": "cancelled"}))

    async def create_item(self, tenant_id, payload):
        if (tenant_id, payload["order_id"]) not in self.orders:
            raise LookupError("Order not found")
        item_id = payload.get("id") or self._id("ITEM")
        item = {
            **payload,
            "id": item_id,
            "tenant_id": tenant_id,
            "item_number": f"{self.orders[(tenant_id, payload['order_id'])]['order_number']}-{len(self.items) + 1:02d}",
            "specs": payload.get("specs", {}),
            "latest_pricing_snapshot": None,
        }
        self.items[(tenant_id, item_id)] = item
        await self.record_event(tenant_id, payload["order_id"], item_id, "order_item_created")
        return deepcopy(item)

    async def list_items(self, tenant_id, order_id="", category=""):
        rows = [deepcopy(row) for (tenant, _), row in self.items.items() if tenant == tenant_id]
        if order_id:
            rows = [row for row in rows if row.get("order_id") == order_id]
        if category:
            rows = [row for row in rows if row.get("item_category") == category]
        return rows

    async def get_item(self, tenant_id, item_id):
        row = self.items.get((tenant_id, item_id))
        return deepcopy(row) if row else None

    async def update_item(self, tenant_id, item_id, patch):
        row = self.items.get((tenant_id, item_id))
        if not row:
            return None
        row = {**row, **patch}
        self.items[(tenant_id, item_id)] = row
        if patch.get("status"):
            await self.record_event(tenant_id, row["order_id"], item_id, "order_item_status_changed")
        return deepcopy(row)

    async def delete_item(self, tenant_id, item_id):
        return self.items.pop((tenant_id, item_id), None) is not None

    async def save_pricing_snapshot(self, tenant_id, item, calculation):
        snapshot = {"id": self._id("PRICE"), "tenant_id": tenant_id, "order_id": item["order_id"], "order_item_id": item["id"], "calculation": calculation, **calculation}
        self.snapshots.append(snapshot)
        self.items[(tenant_id, item["id"])]["estimated_price_minor"] = calculation["selling_price_minor"]
        self.items[(tenant_id, item["id"])]["latest_pricing_snapshot"] = snapshot
        await self.record_event(tenant_id, item["order_id"], item["id"], "pricing_snapshot_saved")
        return deepcopy(snapshot)

    async def list_events(self, tenant_id, order_id, item_id=""):
        rows = [deepcopy(row) for row in self.events if row["tenant_id"] == tenant_id and row["order_id"] == order_id]
        if item_id:
            rows = [row for row in rows if row["order_item_id"] == item_id]
        return rows

    async def list_quote_drafts(self, tenant_id, order_id):
        return [deepcopy(row) for row in self.quote_drafts if row["tenant_id"] == tenant_id and row["order_id"] == order_id]

    async def list_invoice_drafts(self, tenant_id, order_id):
        return [deepcopy(row) for row in self.invoice_drafts if row["tenant_id"] == tenant_id and row["order_id"] == order_id]

    async def list_work_order_drafts(self, tenant_id, order_id):
        return [deepcopy(row) for row in self.work_order_drafts if row["tenant_id"] == tenant_id and row["order_id"] == order_id]

    async def update_quote_draft(self, tenant_id, order_id, quote_id, patch, actor_id=""):
        for index, quote in enumerate(self.quote_drafts):
            if quote["tenant_id"] == tenant_id and quote["order_id"] == order_id and quote["id"] == quote_id:
                updated = {**quote, **patch}
                subtotal = int(updated.get("subtotal_minor", 0))
                updated["total_minor"] = max(0, subtotal - int(updated.get("discount_minor", 0) or 0) + int(updated.get("tax_minor", 0) or 0))
                self.quote_drafts[index] = updated
                await self.record_event(tenant_id, order_id, "", "quote_draft_updated", metadata={"quote_id": quote_id})
                return deepcopy(updated)
        return None

    async def generate_quote_draft(self, tenant_id, order_id, actor_id=""):
        order = await self.get_order(tenant_id, order_id)
        if not order:
            raise LookupError("Order not found")
        if not order.get("items"):
            raise ValueError("Add at least one order item before generating a quote")
        line_items = []
        total = 0
        for item in order["items"]:
            price = int(item.get("estimated_price_minor", 0))
            total += price
            line_items.append({"order_item_id": item["id"], "item_number": item["item_number"], "item_name": item["item_name"], "selling_price_minor": price})
        quote = {
            "id": self._id("QUOTE"),
            "tenant_id": tenant_id,
            "quote_number": f"Q-{len(self.quote_drafts) + 1:04d}",
            "order_id": order_id,
            "customer_id": order.get("customer_id", ""),
            "customer_name": order.get("customer_name", ""),
            "status": "draft_internal",
            "title": f"Quote for {order.get('order_number', order_id)}",
            "line_items": line_items,
            "subtotal_minor": total,
            "discount_minor": 0,
            "tax_minor": 0,
            "total_minor": total,
            "notes": "",
            "internal_notes": "Generated from current order item pricing snapshots.",
            "terms": "Quote is valid for 30 days.",
        }
        self.quote_drafts.insert(0, quote)
        await self.record_event(tenant_id, order_id, "", "quote_draft_generated", metadata={"quote_id": quote["id"]})
        await self.update_order(tenant_id, order_id, {"status": "quote_sent"})
        return deepcopy(quote)

    async def generate_invoice_draft(self, tenant_id, order_id, actor_id=""):
        order = await self.get_order(tenant_id, order_id)
        if not order:
            raise LookupError("Order not found")
        quote = next((row for row in self.quote_drafts if row["tenant_id"] == tenant_id and row["order_id"] == order_id and row.get("status") == "approved"), None)
        if quote:
            line_items = [{"description": item["item_name"], "amount_minor": item["selling_price_minor"]} for item in quote["line_items"]]
            total = quote["total_minor"]
            source = "quote_draft"
            quote_id = quote["id"]
        else:
            if not order.get("items"):
                raise ValueError("Add at least one order item before generating an invoice")
            line_items = [{"description": item["item_name"], "amount_minor": int(item.get("estimated_price_minor", 0))} for item in order["items"]]
            total = sum(item["amount_minor"] for item in line_items)
            source = "order_snapshot"
            quote_id = ""
        invoice = {
            "id": self._id("INV"),
            "tenant_id": tenant_id,
            "invoice_number": f"INV-{len(self.invoice_drafts) + 1:04d}",
            "order_id": order_id,
            "quote_draft_id": quote_id,
            "customer_id": order.get("customer_id", ""),
            "customer_name": order.get("customer_name", ""),
            "status": "draft_unpaid",
            "source": source,
            "line_items": line_items,
            "subtotal_minor": total,
            "discount_minor": 0,
            "tax_minor": 0,
            "total_minor": total,
            "amount_paid_minor": 0,
            "balance_due_minor": total,
        }
        self.invoice_drafts.insert(0, invoice)
        await self.record_event(tenant_id, order_id, "", "invoice_draft_generated", metadata={"invoice_id": invoice["id"]})
        return deepcopy(invoice)

    async def generate_work_order_draft(self, tenant_id, order_id, actor_id=""):
        order = await self.get_order(tenant_id, order_id)
        if not order:
            raise LookupError("Order not found")
        if not order.get("items"):
            raise ValueError("Add at least one order item before generating a work order")
        production_items = [{
            "order_item_id": item["id"],
            "item_number": item["item_number"],
            "item_name": item["item_name"],
            "item_category": item.get("item_category", "custom"),
            "tasks": [{"task_key": "review_specs", "status": "not_started"}, {"task_key": "produce", "status": "not_started"}, {"task_key": "quality_check", "status": "not_started"}],
        } for item in order["items"]]
        work_order = {
            "id": self._id("WO"),
            "tenant_id": tenant_id,
            "work_order_number": f"WO-{len(self.work_order_drafts) + 1:04d}",
            "order_id": order_id,
            "customer_id": order.get("customer_id", ""),
            "customer_name": order.get("customer_name", ""),
            "status": "draft",
            "source": "order_items_snapshot",
            "production_items": production_items,
            "item_count": len(production_items),
        }
        self.work_order_drafts.insert(0, work_order)
        await self.record_event(tenant_id, order_id, "", "work_order_draft_generated", metadata={"work_order_id": work_order["id"]})
        await self.update_order(tenant_id, order_id, {"status": "in_production"})
        return deepcopy(work_order)

    async def record_event(self, tenant_id, order_id, item_id="", event_type="event", actor_id="", metadata=None):
        event = {"id": self._id("EVT"), "tenant_id": tenant_id, "order_id": order_id, "order_item_id": item_id, "event_type": event_type, "metadata": metadata or {}}
        self.events.insert(0, event)
        return deepcopy(event)


class OrdersApiTests(unittest.TestCase):
    def setUp(self):
        self.repo = FakeOrdersRepository()
        self.doculink = AsyncMock()
        self.doculink.list_links = AsyncMock(return_value={"file_links": [], "document_links": []})
        self.doculink.create_file_link = AsyncMock(return_value={"id": "LINK-1", "entity_type": "order_item"})
        self.patches = [
            patch("routes.orders.repository", return_value=self.repo),
            patch("routes.orders.doculink_repository", return_value=self.doculink),
        ]
        for active_patch in self.patches:
            active_patch.start()
        self.client = TestClient(app)

    def tearDown(self):
        for active_patch in self.patches:
            active_patch.stop()

    def test_orders_are_tenant_scoped_and_do_not_embed_item_ids(self):
        created = self.client.post("/api/orders", json={"customer_name": "Apex", "order_source": "email"}, headers={"X-Tenant-Id": "shop-a"})
        self.assertEqual(created.status_code, 201)
        order = created.json()
        self.assertNotIn("item_ids", order)

        self.client.post(f"/api/orders/{order['id']}/items", json={"item_name": "Banner", "item_category": "banners", "quantity": 2}, headers={"X-Tenant-Id": "shop-a"})
        shop_a = self.client.get("/api/orders", headers={"X-Tenant-Id": "shop-a"}).json()
        shop_b = self.client.get("/api/orders", headers={"X-Tenant-Id": "shop-b"}).json()
        self.assertEqual(len(shop_a), 1)
        self.assertEqual(shop_b, [])

    def test_item_schema_and_pricing_snapshot(self):
        order = self.client.post("/api/orders", json={"customer_name": "Apex"}).json()
        item = self.client.post(f"/api/orders/{order['id']}/items", json={
            "item_name": "Outdoor banner",
            "item_category": "banners",
            "quantity": 2,
            "specs": {"width": 8, "height": 3, "unit_of_measure": "feet", "banner_material_key": "banner_13oz"},
        }).json()
        schema = self.client.get("/api/order-items/schema/banners").json()
        self.assertEqual(schema["category"], "banners")

        result = self.client.post(f"/api/order-items/{item['id']}/save-pricing", json={"specs": {}}).json()
        self.assertGreater(result["calculation"]["selling_price_minor"], 0)
        updated = self.client.get(f"/api/order-items/{item['id']}").json()
        self.assertGreater(updated["estimated_price_minor"], 0)

    def test_order_item_specs_can_be_updated_before_pricing(self):
        order = self.client.post("/api/orders", json={"customer_name": "Apex", "customer_id": "CUST-1"}).json()
        item = self.client.post(f"/api/orders/{order['id']}/items", json={"item_name": "Yard sign", "item_category": "rigid_signs"}).json()

        updated = self.client.put(f"/api/order-items/{item['id']}", json={
            "specs": {"width": 24, "height": 18, "unit_of_measure": "inches", "substrate_type_key": "coroplast_4mm"}
        }).json()

        self.assertEqual(updated["specs"]["width"], 24)
        self.assertEqual(updated["specs"]["substrate_type_key"], "coroplast_4mm")

    def test_activity_and_doculink_artwork_link(self):
        order = self.client.post("/api/orders", json={"customer_name": "Apex"}).json()
        item = self.client.post(f"/api/orders/{order['id']}/items", json={"item_name": "Wrap", "item_category": "vehicle_wrap"}).json()
        link = self.client.post(f"/api/orders/{order['id']}/items/{item['id']}/link-artwork", json={"file_id": "FILE-1"}).json()
        self.assertEqual(link["id"], "LINK-1")
        activity = self.client.get(f"/api/orders/{order['id']}/activity").json()
        self.assertTrue(any(row["event_type"] == "order_item_created" for row in activity))

    def test_order_and_item_status_updates_record_activity(self):
        order = self.client.post("/api/orders", json={"customer_name": "Apex"}).json()
        item = self.client.post(f"/api/orders/{order['id']}/items", json={"item_name": "Banner", "item_category": "banners"}).json()

        updated_order = self.client.put(f"/api/orders/{order['id']}", json={"status": "approved"}).json()
        updated_item = self.client.put(f"/api/order-items/{item['id']}", json={"status": "in_production"}).json()
        activity = self.client.get(f"/api/orders/{order['id']}/activity").json()

        self.assertEqual(updated_order["status"], "approved")
        self.assertEqual(updated_item["status"], "in_production")
        self.assertTrue(any(row["event_type"] == "order_status_changed" for row in activity))
        self.assertTrue(any(row["event_type"] == "order_item_status_changed" for row in activity))

    def test_generate_quote_draft_from_order_item_pricing(self):
        order = self.client.post("/api/orders", json={"customer_name": "Apex", "customer_id": "CUST-1"}).json()
        item = self.client.post(f"/api/orders/{order['id']}/items", json={"item_name": "Banner", "item_category": "banners"}).json()
        self.client.post(f"/api/order-items/{item['id']}/save-pricing", json={"specs": {"width": 4, "height": 8, "unit_of_measure": "feet"}})

        quote = self.client.post(f"/api/orders/{order['id']}/generate-quote").json()
        quotes = self.client.get(f"/api/orders/{order['id']}/quotes").json()
        financials = self.client.get(f"/api/orders/{order['id']}/financials").json()

        self.assertEqual(quote["status"], "draft_internal")
        self.assertEqual(len(quote["line_items"]), 1)
        self.assertGreater(quote["total_minor"], 0)
        self.assertEqual(quotes[0]["id"], quote["id"])
        self.assertEqual(financials["latest_quote_draft"]["id"], quote["id"])

    def test_quote_draft_can_be_edited_without_changing_order_items(self):
        order = self.client.post("/api/orders", json={"customer_name": "Apex", "customer_id": "CUST-1"}).json()
        item = self.client.post(f"/api/orders/{order['id']}/items", json={"item_name": "Banner", "item_category": "banners"}).json()
        self.client.post(f"/api/order-items/{item['id']}/save-pricing", json={"specs": {"width": 4, "height": 8, "unit_of_measure": "feet"}})
        quote = self.client.post(f"/api/orders/{order['id']}/generate-quote").json()

        edited = self.client.put(f"/api/orders/{order['id']}/quotes/{quote['id']}", json={
            "status": "ready_for_review",
            "notes": "Customer-facing scope note.",
            "terms": "50% deposit required.",
            "discount_minor": 500,
            "tax_minor": 125,
        }).json()
        activity = self.client.get(f"/api/orders/{order['id']}/activity").json()
        unchanged_item = self.client.get(f"/api/order-items/{item['id']}").json()

        self.assertEqual(edited["status"], "ready_for_review")
        self.assertEqual(edited["notes"], "Customer-facing scope note.")
        self.assertEqual(edited["total_minor"], quote["subtotal_minor"] - 500 + 125)
        self.assertGreater(unchanged_item["estimated_price_minor"], 0)
        self.assertTrue(any(row["event_type"] == "quote_draft_updated" for row in activity))

    def test_generate_invoice_draft_from_approved_quote(self):
        order = self.client.post("/api/orders", json={"customer_name": "Apex", "customer_id": "CUST-1"}).json()
        item = self.client.post(f"/api/orders/{order['id']}/items", json={"item_name": "Banner", "item_category": "banners"}).json()
        self.client.post(f"/api/order-items/{item['id']}/save-pricing", json={"specs": {"width": 4, "height": 8, "unit_of_measure": "feet"}})
        quote = self.client.post(f"/api/orders/{order['id']}/generate-quote").json()
        approved = self.client.put(f"/api/orders/{order['id']}/quotes/{quote['id']}", json={"status": "approved", "discount_minor": 250}).json()

        invoice = self.client.post(f"/api/orders/{order['id']}/generate-invoice").json()
        invoices = self.client.get(f"/api/orders/{order['id']}/invoices").json()
        financials = self.client.get(f"/api/orders/{order['id']}/financials").json()
        activity = self.client.get(f"/api/orders/{order['id']}/activity").json()

        self.assertEqual(invoice["source"], "quote_draft")
        self.assertEqual(invoice["quote_draft_id"], approved["id"])
        self.assertEqual(invoice["total_minor"], approved["total_minor"])
        self.assertEqual(invoices[0]["id"], invoice["id"])
        self.assertEqual(financials["latest_invoice_draft"]["id"], invoice["id"])
        self.assertTrue(any(row["event_type"] == "invoice_draft_generated" for row in activity))

    def test_generate_work_order_draft_from_order_items(self):
        order = self.client.post("/api/orders", json={"customer_name": "Apex", "customer_id": "CUST-1", "status": "approved"}).json()
        self.client.post(f"/api/orders/{order['id']}/items", json={"item_name": "Banner", "item_category": "banners"}).json()
        self.client.post(f"/api/orders/{order['id']}/items", json={"item_name": "Install", "item_category": "services"}).json()

        work_order = self.client.post(f"/api/orders/{order['id']}/generate-work_order").json()
        work_orders = self.client.get(f"/api/orders/{order['id']}/work-orders").json()
        production = self.client.get(f"/api/orders/{order['id']}/production-summary").json()
        updated_order = self.client.get(f"/api/orders/{order['id']}").json()
        activity = self.client.get(f"/api/orders/{order['id']}/activity").json()

        self.assertEqual(work_order["status"], "draft")
        self.assertEqual(work_order["item_count"], 2)
        self.assertTrue(all(row["tasks"] for row in work_order["production_items"]))
        self.assertEqual(work_orders[0]["id"], work_order["id"])
        self.assertEqual(production["latest_work_order_draft"]["id"], work_order["id"])
        self.assertEqual(updated_order["status"], "in_production")
        self.assertTrue(any(row["event_type"] == "work_order_draft_generated" for row in activity))


if __name__ == "__main__":
    unittest.main()

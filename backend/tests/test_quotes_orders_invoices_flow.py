"""
Tests for the Quote -> Order -> Invoice workflow (session feature):
- Quotes CRUD, line items, approval, decline, convert-to-order (idempotency)
- Direct Order creation (no quote)
- Invoice generation from order, payment recording (partial + full)
- Sequential numbering via shared/sequences.py atomic counter
- Locked-state validations (409s)
"""
import os
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture
def client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


def create_quote(client, name_suffix=""):
    payload = {
        "customer_name": f"TEST_Customer {uuid.uuid4().hex[:6]}{name_suffix}",
        "title": "Storefront banner package",
        "contact_name": "Jane Doe",
        "email": "jane@example.com",
        "phone": "555-1234",
    }
    resp = client.post(f"{API}/quotes", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


class TestQuoteLifecycle:
    def test_create_quote_has_sequential_number(self, client):
        quote = create_quote(client)
        assert quote["status"] == "draft"
        assert quote["quote_number"].startswith("QUO-")
        assert isinstance(quote["quote_number"], str)

    def test_sequential_numbers_no_collision(self, client):
        numbers = []
        for _ in range(3):
            q = create_quote(client)
            numbers.append(int(q["quote_number"].split("-")[1]))
        assert numbers[1] == numbers[0] + 1
        assert numbers[2] == numbers[1] + 1

    def test_add_line_item_updates_totals(self, client):
        quote = create_quote(client)
        item_payload = {"item_name": "3x6 Banner", "item_category": "banners", "quantity": 2, "estimated_price_minor": 5000}
        resp = client.post(f"{API}/quotes/{quote['id']}/items", json=item_payload)
        assert resp.status_code == 201, resp.text
        get_resp = client.get(f"{API}/quotes/{quote['id']}")
        data = get_resp.json()
        assert len(data["line_items"]) == 1
        assert data["subtotal_minor"] == 5000
        assert data["total_minor"] == 5000

    def test_calculate_pricing_updates_item(self, client):
        quote = create_quote(client)
        item = client.post(f"{API}/quotes/{quote['id']}/items", json={"item_name": "Vinyl Banner", "item_category": "banners", "quantity": 1}).json()
        resp = client.post(f"{API}/quotes/{quote['id']}/items/{item['id']}/calculate-pricing", json={"specs": {"width_ft": 3, "height_ft": 6}})
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert "calculation" in body and "item" in body
        assert body["item"]["estimated_price_minor"] >= 0

    def test_approve_with_zero_line_items_fails_409(self, client):
        quote = create_quote(client)
        resp = client.post(f"{API}/quotes/{quote['id']}/approve", json={"approval_method": "phone"})
        assert resp.status_code == 409
        assert "line item" in resp.json().get("detail", "").lower()

    def test_send_then_approve_records_fields(self, client):
        quote = create_quote(client)
        client.post(f"{API}/quotes/{quote['id']}/items", json={"item_name": "Sign", "item_category": "rigid_signs", "quantity": 1, "estimated_price_minor": 10000})
        send_resp = client.post(f"{API}/quotes/{quote['id']}/send")
        assert send_resp.status_code == 200
        assert send_resp.json()["status"] == "sent"

        approve_resp = client.post(f"{API}/quotes/{quote['id']}/approve", json={
            "approval_method": "email", "approved_contact_name": "Jane Doe", "approval_note": "ok via email",
        })
        assert approve_resp.status_code == 200, approve_resp.text
        approved = approve_resp.json()
        assert approved["status"] == "approved"
        assert approved["approval_method"] == "email"
        assert approved["approved_contact_name"] == "Jane Doe"
        assert approved["approved_at"] is not None
        assert approved["approved_by_user_id"] != ""

    def test_convert_to_order_idempotent(self, client):
        quote = create_quote(client)
        client.post(f"{API}/quotes/{quote['id']}/items", json={"item_name": "Vehicle Wrap", "item_category": "vehicle_wrap", "quantity": 1, "estimated_price_minor": 250000})
        client.post(f"{API}/quotes/{quote['id']}/send")
        client.post(f"{API}/quotes/{quote['id']}/approve", json={"approval_method": "phone"})

        first = client.post(f"{API}/quotes/{quote['id']}/convert-to-order")
        assert first.status_code == 200, first.text
        order_1 = first.json()["order"]
        assert order_1["order_number"].startswith("ORD-")
        assert order_1["source_quote_id"] == quote["id"]
        assert len(order_1.get("items", [])) == 1

        second = client.post(f"{API}/quotes/{quote['id']}/convert-to-order")
        assert second.status_code == 200
        order_2 = second.json()["order"]
        assert order_2["id"] == order_1["id"]
        assert order_2["order_number"] == order_1["order_number"]

        quote_after = client.get(f"{API}/quotes/{quote['id']}").json()
        assert quote_after["status"] == "converted"

        orders_list = client.get(f"{API}/orders").json()
        matching = [o for o in orders_list if o.get("source_quote_id") == quote["id"]]
        assert len(matching) == 1

    def test_locked_quote_cannot_be_edited(self, client):
        quote = create_quote(client)
        client.post(f"{API}/quotes/{quote['id']}/items", json={"item_name": "Item A", "item_category": "banners", "quantity": 1, "estimated_price_minor": 1000})
        client.post(f"{API}/quotes/{quote['id']}/decline", json={"decline_reason": "customer said no"})

        put_resp = client.put(f"{API}/quotes/{quote['id']}", json={"title": "new title"})
        assert put_resp.status_code == 409

        add_item_resp = client.post(f"{API}/quotes/{quote['id']}/items", json={"item_name": "Extra", "item_category": "banners", "quantity": 1})
        assert add_item_resp.status_code == 409

        items = client.get(f"{API}/quotes/{quote['id']}").json()["line_items"]
        delete_resp = client.delete(f"{API}/quotes/{quote['id']}/items/{items[0]['id']}")
        assert delete_resp.status_code == 409


class TestDirectOrderFlow:
    def test_direct_order_created_without_quote(self, client):
        payload = {
            "customer_name": f"TEST_DirectCustomer_{uuid.uuid4().hex[:6]}",
            "order_source": "walk_in",
            "order_title": "Direct walk-in order",
        }
        resp = client.post(f"{API}/orders", json=payload)
        assert resp.status_code == 201, resp.text
        order = resp.json()
        assert order.get("source_quote_id", "") == ""
        assert order["order_number"].startswith("ORD-")

        source_quote_resp = client.get(f"{API}/orders/{order['id']}/source-quote")
        assert source_quote_resp.status_code == 200
        assert source_quote_resp.json() is None


class TestInvoiceFlow:
    def _build_order_with_item(self, client):
        order = client.post(f"{API}/orders", json={
            "customer_name": f"TEST_InvoiceCustomer_{uuid.uuid4().hex[:6]}", "order_source": "phone",
        }).json()
        item_resp = client.post(f"{API}/orders/{order['id']}/items", json={
            "item_name": "Banner Panel", "item_category": "banners", "quantity": 1, "estimated_price_minor": 20000,
        })
        assert item_resp.status_code == 201, item_resp.text
        return order

    def test_generate_invoice_from_order(self, client):
        order = self._build_order_with_item(client)
        resp = client.post(f"{API}/invoices/generate-from-order/{order['id']}")
        assert resp.status_code == 201, resp.text
        invoice = resp.json()
        assert invoice["invoice_number"].startswith("INV-")
        assert invoice["order_id"] == order["id"]
        assert invoice["total_minor"] == 20000
        assert invoice["status"] == "draft"

        listing = client.get(f"{API}/invoices").json()
        assert any(i["id"] == invoice["id"] for i in listing)

    def test_partial_then_full_payment(self, client):
        order = self._build_order_with_item(client)
        invoice = client.post(f"{API}/invoices/generate-from-order/{order['id']}").json()

        partial = client.post(f"{API}/invoices/{invoice['id']}/record-payment", json={"amount_minor": 5000, "payment_method": "cash"})
        assert partial.status_code == 200, partial.text
        partial_data = partial.json()
        assert partial_data["status"] == "partially_paid"
        assert partial_data["balance_due_minor"] == 15000

        full = client.post(f"{API}/invoices/{invoice['id']}/record-payment", json={"amount_minor": 15000, "payment_method": "card"})
        assert full.status_code == 200
        full_data = full.json()
        assert full_data["status"] == "paid"
        assert full_data["balance_due_minor"] == 0

    def test_cannot_manually_set_status_to_paid(self, client):
        order = self._build_order_with_item(client)
        invoice = client.post(f"{API}/invoices/generate-from-order/{order['id']}").json()
        resp = client.put(f"{API}/invoices/{invoice['id']}", json={"status": "paid"})
        # Pydantic model InvoicePatch does not allow "paid" as a literal value -> 422 expected
        assert resp.status_code == 422, resp.text

    def test_generate_invoice_without_items_fails_409(self, client):
        order = client.post(f"{API}/orders", json={"customer_name": "TEST_EmptyOrder", "order_source": "phone"}).json()
        resp = client.post(f"{API}/invoices/generate-from-order/{order['id']}")
        assert resp.status_code == 409


class TestRegression:
    def test_order_items_crud_still_works(self, client):
        order = client.post(f"{API}/orders", json={"customer_name": "TEST_RegressionCustomer", "order_source": "phone"}).json()
        item = client.post(f"{API}/orders/{order['id']}/items", json={
            "item_name": "Test Item", "item_category": "cut_vinyl", "quantity": 3,
        }).json()
        assert item["quantity"] == 3
        update_resp = client.put(f"{API}/order-items/{item['id']}", json={"production_required": True, "quantity": 5})
        assert update_resp.status_code == 200
        assert update_resp.json()["quantity"] == 5
        assert update_resp.json()["production_required"] is True

    def test_generate_work_order_draft_still_works(self, client):
        order = client.post(f"{API}/orders", json={"customer_name": "TEST_WorkOrderCustomer", "order_source": "phone"}).json()
        client.post(f"{API}/orders/{order['id']}/items", json={"item_name": "WO Item", "item_category": "banners", "quantity": 1})
        resp = client.post(f"{API}/orders/{order['id']}/generate-work_order")
        assert resp.status_code == 200, resp.text

    def test_generate_quote_endpoint_removed(self, client):
        order = client.post(f"{API}/orders", json={"customer_name": "TEST_NoQuoteDraft", "order_source": "phone"}).json()
        resp = client.post(f"{API}/orders/{order['id']}/generate-quote")
        assert resp.status_code == 404

    def test_doculink_entity_type_quote_and_invoice(self, client):
        quote = create_quote(client)
        resp = client.get(f"{API}/quotes/{quote['id']}/files")
        assert resp.status_code == 200

        order = client.post(f"{API}/orders", json={"customer_name": "TEST_InvFiles", "order_source": "phone"}).json()
        client.post(f"{API}/orders/{order['id']}/items", json={"item_name": "X", "item_category": "banners", "quantity": 1, "estimated_price_minor": 100})
        invoice = client.post(f"{API}/invoices/generate-from-order/{order['id']}").json()
        resp2 = client.get(f"{API}/invoices/{invoice['id']}/files")
        assert resp2.status_code == 200

    def test_dashboard_and_customers_load(self, client):
        customers_resp = client.get(f"{API}/customers")
        assert customers_resp.status_code == 200

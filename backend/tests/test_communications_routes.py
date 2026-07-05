import hashlib
import hmac
import json
import os
import unittest
from copy import deepcopy
from unittest.mock import patch

from fastapi.testclient import TestClient

from core_runtime import encode_bearer_token
from server import app


class FakeCommunicationsCursor:
    def __init__(self, rows):
        self.rows = rows

    def sort(self, *_args, **_kwargs):
        self.rows = list(reversed(self.rows))
        return self

    def limit(self, value):
        self.rows = self.rows[:value]
        return self

    def __aiter__(self):
        self._iter = iter(self.rows)
        return self

    async def __anext__(self):
        try:
            return deepcopy(next(self._iter))
        except StopIteration as exc:
            raise StopAsyncIteration from exc


class FakeCommunicationsCollection:
    def __init__(self):
        self.rows = []

    async def create_index(self, *_args, **_kwargs):
        return None

    def find(self, query):
        return FakeCommunicationsCursor([
            row for row in self.rows
            if all(row.get(key) == value for key, value in query.items())
        ])

    async def find_one(self, query):
        for row in self.rows:
            if all(row.get(key) == value for key, value in query.items()):
                return deepcopy(row)
        return None

    async def insert_one(self, document):
        self.rows.append(deepcopy(document))

    async def replace_one(self, query, document):
        for index, row in enumerate(self.rows):
            if all(row.get(key) == value for key, value in query.items()):
                self.rows[index] = deepcopy(document)
                return
        self.rows.append(deepcopy(document))


class FakeCommunicationsDatabase:
    def __init__(self):
        self.collections = {}

    def __getitem__(self, name):
        if name not in self.collections:
            self.collections[name] = FakeCommunicationsCollection()
        return self.collections[name]


class CommunicationsRoutesTests(unittest.TestCase):
    def setUp(self):
        self.database = FakeCommunicationsDatabase()
        self.database_patch = patch("routes.communications.get_database", return_value=self.database)
        self.database_patch.start()
        self.client = TestClient(app)

    def tearDown(self):
        self.database_patch.stop()
        os.environ.pop("SIGNGUYAI_SENDGRID_WEBHOOK_SECRET", None)

    def bearer(self, role: str, tenant_id: str = "shop-a", user_id: str = "user-a") -> str:
        token = encode_bearer_token({
            "sub": user_id,
            "tenant_id": tenant_id,
            "role": role,
            "email": f"{user_id}@example.com",
        })
        return f"Bearer {token}"

    def test_admin_can_create_and_list_tenant_scoped_email_activity(self):
        with patch.dict(
            os.environ,
            {"JWT_SECRET_KEY": "communications-test-secret", "SIGNGUYAI_AUTH_MODE": "enforced"},
            clear=False,
        ):
            created = self.client.post(
                "/api/communications/email-activity",
                json={
                    "recipient_email": "customer@example.com",
                    "subject": "Invoice ready",
                    "template_key": "invoice_ready",
                    "provider_message_id": "msg-a",
                    "related_entity_type": "invoice",
                    "related_entity_id": "INV-1",
                },
                headers={"Authorization": self.bearer("admin", tenant_id="shop-a")},
            )
            self.assertEqual(created.status_code, 201)
            self.client.post(
                "/api/communications/email-activity",
                json={"recipient_email": "other@example.com", "subject": "Other tenant", "provider_message_id": "msg-b"},
                headers={"Authorization": self.bearer("admin", tenant_id="shop-b")},
            )
            listed = self.client.get(
                "/api/communications/email-activity?related_entity_type=invoice",
                headers={"Authorization": self.bearer("admin", tenant_id="shop-a")},
            )

        self.assertEqual(listed.status_code, 200)
        body = listed.json()
        self.assertEqual(body["total"], 1)
        self.assertEqual(body["emails"][0]["tenant_id"], "shop-a")
        self.assertNotIn("_id", body["emails"][0])
        self.assertEqual(self.database["activity_events"].rows[0]["event_type"], "email.activity.created")

    def test_staff_cannot_view_email_activity(self):
        with patch.dict(
            os.environ,
            {"JWT_SECRET_KEY": "communications-test-secret", "SIGNGUYAI_AUTH_MODE": "enforced"},
            clear=False,
        ):
            response = self.client.get(
                "/api/communications/email-activity",
                headers={"Authorization": self.bearer("staff")},
            )

        self.assertEqual(response.status_code, 403)

    def test_staff_only_sees_own_staff_notifications(self):
        with patch.dict(
            os.environ,
            {"JWT_SECRET_KEY": "communications-test-secret", "SIGNGUYAI_AUTH_MODE": "enforced"},
            clear=False,
        ):
            own = self.client.post(
                "/api/communications/notifications",
                json={"recipient_type": "staff", "recipient_id": "user-a", "title": "Assigned", "message": "You have a task"},
                headers={"Authorization": self.bearer("admin")},
            ).json()
            self.client.post(
                "/api/communications/notifications",
                json={"recipient_type": "staff", "recipient_id": "user-b", "title": "Other", "message": "Other task"},
                headers={"Authorization": self.bearer("admin")},
            )
            listed = self.client.get(
                "/api/communications/notifications",
                headers={"Authorization": self.bearer("staff", user_id="user-a")},
            )
            marked = self.client.patch(
                f"/api/communications/notifications/{own['id']}",
                json={"status": "read"},
                headers={"Authorization": self.bearer("staff", user_id="user-a")},
            )

        self.assertEqual(listed.status_code, 200)
        self.assertEqual(listed.json()["total"], 1)
        self.assertEqual(listed.json()["notifications"][0]["recipient_id"], "user-a")
        self.assertEqual(marked.status_code, 200)
        self.assertEqual(marked.json()["status"], "read")

    def test_sendgrid_webhook_requires_signature_when_secret_is_configured(self):
        self.database["email_activity"].rows.append({
            "id": "email-a",
            "tenant_id": "shop-a",
            "recipient_email": "customer@example.com",
            "subject": "Invoice ready",
            "provider_message_id": "sg-message-a",
            "delivery_status": "sent",
            "status": "sent",
            "events": [],
            "version": 1,
        })
        payload = [{"tenant_id": "shop-a", "sg_message_id": "sg-message-a", "event": "bounce"}]
        raw_body = json.dumps(payload).encode("utf-8")
        signature = hmac.new(b"webhook-secret", raw_body, hashlib.sha256).hexdigest()

        with patch.dict(os.environ, {"SIGNGUYAI_SENDGRID_WEBHOOK_SECRET": "webhook-secret"}, clear=False):
            rejected = self.client.post("/api/communications/webhooks/sendgrid", json=payload)
            accepted = self.client.post(
                "/api/communications/webhooks/sendgrid",
                content=raw_body,
                headers={"X-SignGuyAI-Webhook-Signature": f"sha256={signature}", "Content-Type": "application/json"},
            )

        self.assertEqual(rejected.status_code, 401)
        self.assertEqual(accepted.status_code, 200)
        self.assertEqual(accepted.json()["matched"], 1)
        self.assertEqual(self.database["email_activity"].rows[0]["delivery_status"], "bounce")


if __name__ == "__main__":
    unittest.main()

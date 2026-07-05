import os
import unittest
from copy import deepcopy
from unittest.mock import patch

from fastapi.testclient import TestClient

from core_runtime import encode_bearer_token
from server import app


class FakePlatformAdminCursor:
    def __init__(self, rows):
        self.rows = list(rows)

    def sort(self, key_or_list, direction=None):
        if isinstance(key_or_list, list):
            key, direction = key_or_list[0]
        else:
            key = key_or_list
        self.rows = sorted(self.rows, key=lambda row: str(row.get(key, "")), reverse=direction == -1)
        return self

    def limit(self, value):
        self.rows = self.rows[:value]
        return self

    async def to_list(self, length):
        return [deepcopy(row) for row in self.rows[:length]]


class FakePlatformAdminCollection:
    def __init__(self):
        self.rows = []

    async def create_index(self, *_args, **_kwargs):
        return None

    def find(self, query):
        return FakePlatformAdminCursor([
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


class FakePlatformAdminDatabase:
    def __init__(self):
        self.collections = {}

    def __getitem__(self, name):
        if name not in self.collections:
            self.collections[name] = FakePlatformAdminCollection()
        return self.collections[name]


class PlatformAdminRouteTests(unittest.TestCase):
    def setUp(self):
        self.database = FakePlatformAdminDatabase()
        self.database["tenants"].rows.extend([
            {
                "id": "tenant-a",
                "tenant_id": "shop-a",
                "name": "Apex Signs",
                "slug": "apex-signs",
                "owner_email": "owner@apex.example",
                "account_status": "active",
                "billing_status": "current",
                "updated_at": "2026-07-05T00:00:02Z",
                "version": 1,
            },
            {
                "id": "tenant-b",
                "tenant_id": "shop-b",
                "name": "Beacon Wraps",
                "slug": "beacon-wraps",
                "owner_email": "owner@beacon.example",
                "account_status": "past_due",
                "billing_status": "past_due",
                "updated_at": "2026-07-05T00:00:01Z",
                "version": 1,
            },
        ])
        self.database["pricing_foundations"].rows.append({
            "id": "pricing-a",
            "tenant_id": "shop-a",
            "key": "default",
            "settings": {"labor": {"shop_labor_rate": 95}},
        })
        self.database["feature_entitlements"].rows.append({
            "id": "entitlement-a",
            "tenant_id": "shop-a",
            "feature_key": "core",
            "status": "enabled",
        })
        self.database_patch = patch("routes.platform_admin.get_database", return_value=self.database)
        self.database_patch.start()
        self.client = TestClient(app)

    def tearDown(self):
        self.database_patch.stop()

    def bearer(self, role: str, tenant_id: str = "platform", user_id: str = "admin-a") -> str:
        token = encode_bearer_token({
            "sub": user_id,
            "tenant_id": tenant_id,
            "role": role,
            "email": f"{user_id}@example.com",
        })
        return f"Bearer {token}"

    def test_platform_admin_can_list_tenants_across_tenants(self):
        with patch.dict(os.environ, {"JWT_SECRET_KEY": "platform-admin-test-secret", "SIGNGUYAI_AUTH_MODE": "enforced"}, clear=False):
            response = self.client.get(
                "/api/platform-admin/tenants?search=apex",
                headers={"Authorization": self.bearer("platform_admin")},
            )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["total"], 1)
        self.assertEqual(body["tenants"][0]["tenant_id"], "shop-a")
        self.assertNotIn("_id", body["tenants"][0])

    def test_non_platform_roles_cannot_access_platform_admin(self):
        with patch.dict(os.environ, {"JWT_SECRET_KEY": "platform-admin-test-secret", "SIGNGUYAI_AUTH_MODE": "enforced"}, clear=False):
            admin_response = self.client.get(
                "/api/platform-admin/tenants",
                headers={"Authorization": self.bearer("admin", tenant_id="shop-a")},
            )
            owner_response = self.client.get(
                "/api/platform-admin/tenants",
                headers={"Authorization": self.bearer("owner", tenant_id="shop-a")},
            )

        self.assertEqual(admin_response.status_code, 403)
        self.assertEqual(owner_response.status_code, 403)

    def test_platform_admin_can_suspend_tenant_and_audit_event_is_recorded(self):
        with patch.dict(os.environ, {"JWT_SECRET_KEY": "platform-admin-test-secret", "SIGNGUYAI_AUTH_MODE": "enforced"}, clear=False):
            updated = self.client.patch(
                "/api/platform-admin/tenants/shop-b/status",
                json={"account_status": "suspended", "billing_status": "failed", "suspension_reason": "Failed payment attempt 3"},
                headers={"Authorization": self.bearer("platform_admin", user_id="support-a")},
            )
            audit = self.client.get(
                "/api/platform-admin/audit-events?tenant_id=shop-b",
                headers={"Authorization": self.bearer("platform_admin", user_id="support-a")},
            )

        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["account_status"], "suspended")
        self.assertEqual(updated.json()["billing_status"], "failed")
        self.assertEqual(updated.json()["updated_by"], "support-a")
        self.assertEqual(audit.status_code, 200)
        self.assertEqual(audit.json()["total"], 1)
        self.assertEqual(audit.json()["events"][0]["action"], "tenant.status.updated")
        self.assertEqual(audit.json()["events"][0]["target_tenant_id"], "shop-b")

    def test_platform_admin_readiness_reports_tenant_launch_checks(self):
        with patch.dict(
            os.environ,
            {
                "JWT_SECRET_KEY": "platform-admin-test-secret",
                "SIGNGUYAI_AUTH_MODE": "enforced",
                "SENDGRID_API_KEY": "test-sendgrid-key",
                "DOCULINK_OBJECT_STORAGE_ROOT": "C:/tmp/object-storage",
            },
            clear=False,
        ):
            ready = self.client.get(
                "/api/platform-admin/tenants/shop-a/readiness",
                headers={"Authorization": self.bearer("platform_admin")},
            )
            not_ready = self.client.get(
                "/api/platform-admin/tenants/shop-b/readiness",
                headers={"Authorization": self.bearer("platform_admin")},
            )

        self.assertEqual(ready.status_code, 200)
        self.assertTrue(ready.json()["can_launch"])
        self.assertEqual({check["key"] for check in ready.json()["checks"]}, {
            "tenant_profile",
            "account_status",
            "billing_status",
            "pricing_foundation",
            "feature_entitlements",
            "object_storage",
            "email_provider",
        })
        self.assertEqual(not_ready.status_code, 200)
        self.assertFalse(not_ready.json()["can_launch"])

    def test_missing_tenant_readiness_returns_404(self):
        with patch.dict(os.environ, {"JWT_SECRET_KEY": "platform-admin-test-secret", "SIGNGUYAI_AUTH_MODE": "enforced"}, clear=False):
            response = self.client.get(
                "/api/platform-admin/tenants/missing-shop/readiness",
                headers={"Authorization": self.bearer("platform_admin")},
            )

        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()

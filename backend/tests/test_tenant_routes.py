import os
import unittest
from copy import deepcopy
from unittest.mock import patch

from fastapi.testclient import TestClient

from core_runtime import encode_bearer_token
from server import app


class FakeTenantCollection:
    def __init__(self):
        self.rows = []

    async def create_index(self, *_args, **_kwargs):
        return None

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


class FakeTenantDatabase:
    def __init__(self):
        self.collections = {}

    def __getitem__(self, name):
        if name not in self.collections:
            self.collections[name] = FakeTenantCollection()
        return self.collections[name]


class TenantRouteTests(unittest.TestCase):
    def setUp(self):
        self.database = FakeTenantDatabase()
        self.database_patch = patch("routes.tenants.get_database", return_value=self.database)
        self.database_patch.start()
        self.client = TestClient(app)

    def tearDown(self):
        self.database_patch.stop()

    def bearer(self, role: str, tenant_id: str = "shop-a", user_id: str = "user-a") -> str:
        token = encode_bearer_token({
            "sub": user_id,
            "tenant_id": tenant_id,
            "role": role,
            "email": f"{user_id}@example.com",
        })
        return f"Bearer {token}"

    def test_owner_can_create_update_and_read_current_tenant_profile(self):
        with patch.dict(os.environ, {"JWT_SECRET_KEY": "tenant-test-secret", "SIGNGUYAI_AUTH_MODE": "enforced"}, clear=False):
            saved = self.client.put(
                "/api/tenant",
                json={"name": "Apex Signs", "owner_email": "owner@apex.example", "phone": "724-555-0101"},
                headers={"Authorization": self.bearer("owner", tenant_id="shop-a", user_id="owner-a")},
            )
            loaded = self.client.get(
                "/api/tenant",
                headers={"Authorization": self.bearer("admin", tenant_id="shop-a", user_id="admin-a")},
            )

        self.assertEqual(saved.status_code, 200)
        self.assertEqual(saved.json()["tenant_id"], "shop-a")
        self.assertEqual(saved.json()["name"], "Apex Signs")
        self.assertEqual(saved.json()["updated_by"], "owner-a")
        self.assertEqual(loaded.status_code, 200)
        self.assertEqual(loaded.json()["name"], "Apex Signs")
        self.assertEqual(len(self.database["activity_events"].rows), 1)
        self.assertEqual(self.database["activity_events"].rows[0]["event_type"], "tenant.profile.updated")

    def test_admin_and_staff_cannot_update_tenant_profile(self):
        with patch.dict(os.environ, {"JWT_SECRET_KEY": "tenant-test-secret", "SIGNGUYAI_AUTH_MODE": "enforced"}, clear=False):
            admin_response = self.client.put(
                "/api/tenant",
                json={"name": "Apex Signs"},
                headers={"Authorization": self.bearer("admin", tenant_id="shop-a")},
            )
            staff_response = self.client.put(
                "/api/tenant",
                json={"name": "Apex Signs"},
                headers={"Authorization": self.bearer("staff", tenant_id="shop-a")},
            )

        self.assertEqual(admin_response.status_code, 403)
        self.assertEqual(staff_response.status_code, 403)

    def test_tenant_profile_updates_are_scoped_to_current_tenant(self):
        with patch.dict(os.environ, {"JWT_SECRET_KEY": "tenant-test-secret", "SIGNGUYAI_AUTH_MODE": "enforced"}, clear=False):
            self.client.put(
                "/api/tenant",
                json={"name": "Apex Signs"},
                headers={"Authorization": self.bearer("owner", tenant_id="shop-a")},
            )
            self.client.put(
                "/api/tenant",
                json={"name": "Beacon Wraps"},
                headers={"Authorization": self.bearer("owner", tenant_id="shop-b")},
            )
            shop_a = self.client.get(
                "/api/tenant",
                headers={"Authorization": self.bearer("owner", tenant_id="shop-a")},
            )

        self.assertEqual(shop_a.status_code, 200)
        self.assertEqual(shop_a.json()["name"], "Apex Signs")
        self.assertEqual(len(self.database["tenants"].rows), 2)


if __name__ == "__main__":
    unittest.main()

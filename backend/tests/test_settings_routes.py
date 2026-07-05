import os
import unittest
from copy import deepcopy
from unittest.mock import patch

from fastapi.testclient import TestClient

from core_runtime import encode_bearer_token
from server import app


class FakeSettingsCursor:
    def __init__(self, rows):
        self.rows = rows

    def sort(self, *_args, **_kwargs):
        self.rows = sorted(self.rows, key=lambda row: (row.get("namespace", ""), row.get("key", "")))
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


class FakeSettingsCollection:
    def __init__(self):
        self.rows = []

    async def create_index(self, *_args, **_kwargs):
        return None

    def find(self, query):
        return FakeSettingsCursor([
            deepcopy(row)
            for row in self.rows
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


class FakeSettingsDatabase:
    def __init__(self):
        self.collections = {}

    def __getitem__(self, name):
        if name not in self.collections:
            self.collections[name] = FakeSettingsCollection()
        return self.collections[name]


class SettingsRoutesTests(unittest.TestCase):
    def setUp(self):
        self.database = FakeSettingsDatabase()
        self.database_patch = patch("routes.settings.get_database", return_value=self.database)
        self.database_patch.start()
        self.client = TestClient(app)

    def tearDown(self):
        self.database_patch.stop()

    def bearer(self, role: str, tenant_id: str = "shop-a", user_id: str = "user-a") -> str:
        token = encode_bearer_token({
            "sub": user_id,
            "tenant_id": tenant_id,
            "role": role,
        })
        return f"Bearer {token}"

    def test_owner_can_save_and_read_tenant_setting(self):
        with patch.dict(os.environ, {"SIGNGUYAI_AUTH_MODE": "preview"}, clear=False):
            saved = self.client.put(
                "/api/settings/config/email/digest",
                json={
                    "value": {"enabled": True, "recipients": ["owner@example.com"]},
                    "metadata": {"group": "email"},
                },
                headers={"X-Tenant-Id": "shop-a", "X-Actor-Id": "owner-a"},
            )
            listed = self.client.get("/api/settings/config?namespace=email", headers={"X-Tenant-Id": "shop-a"})

        self.assertEqual(saved.status_code, 200)
        body = saved.json()
        self.assertEqual(body["tenant_id"], "shop-a")
        self.assertEqual(body["namespace"], "email")
        self.assertEqual(body["key"], "digest")
        self.assertEqual(body["updated_by"], "owner-a")
        self.assertEqual(body["version"], 1)
        self.assertNotIn("_id", body)
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(listed.json()["total"], 1)
        activity_events = self.database["activity_events"].rows
        self.assertEqual(len(activity_events), 1)
        self.assertEqual(activity_events[0]["event_type"], "settings.config.updated")
        self.assertEqual(activity_events[0]["actor_id"], "owner-a")
        self.assertEqual(activity_events[0]["metadata"], {"namespace": "email", "key": "digest"})

    def test_settings_are_tenant_scoped(self):
        with patch.dict(os.environ, {"SIGNGUYAI_AUTH_MODE": "preview"}, clear=False):
            self.client.put(
                "/api/settings/config/integrations/meta",
                json={"value": {"connected": True}},
                headers={"X-Tenant-Id": "shop-a"},
            )
            shop_b = self.client.get("/api/settings/config", headers={"X-Tenant-Id": "shop-b"})

        self.assertEqual(shop_b.status_code, 200)
        self.assertEqual(shop_b.json()["total"], 0)

    def test_admin_can_view_but_cannot_write_settings(self):
        with patch.dict(
            os.environ,
            {"JWT_SECRET_KEY": "settings-test-secret", "SIGNGUYAI_AUTH_MODE": "enforced"},
            clear=False,
        ):
            read_response = self.client.get(
                "/api/settings/config",
                headers={"Authorization": self.bearer("admin")},
            )
            write_response = self.client.put(
                "/api/settings/config/email/digest",
                json={"value": {"enabled": True}},
                headers={"Authorization": self.bearer("admin")},
            )

        self.assertEqual(read_response.status_code, 200)
        self.assertEqual(write_response.status_code, 403)

    def test_staff_cannot_view_or_write_settings(self):
        with patch.dict(
            os.environ,
            {"JWT_SECRET_KEY": "settings-test-secret", "SIGNGUYAI_AUTH_MODE": "enforced"},
            clear=False,
        ):
            read_response = self.client.get(
                "/api/settings/config",
                headers={"Authorization": self.bearer("staff")},
            )
            write_response = self.client.put(
                "/api/settings/config/email/digest",
                json={"value": {"enabled": True}},
                headers={"Authorization": self.bearer("staff")},
            )

        self.assertEqual(read_response.status_code, 403)
        self.assertEqual(write_response.status_code, 403)

    def test_setting_updates_increment_version_and_preserve_created_at(self):
        with patch.dict(os.environ, {"SIGNGUYAI_AUTH_MODE": "preview"}, clear=False):
            first = self.client.put(
                "/api/settings/config/assistant/personality",
                json={"value": {"tone": "direct"}},
                headers={"X-Tenant-Id": "shop-a", "X-Actor-Id": "owner-a"},
            ).json()
            second = self.client.put(
                "/api/settings/config/assistant/personality",
                json={"value": {"tone": "brief"}},
                headers={"X-Tenant-Id": "shop-a", "X-Actor-Id": "owner-b"},
            ).json()

        self.assertEqual(second["version"], 2)
        self.assertEqual(second["created_at"], first["created_at"])
        self.assertEqual(second["updated_by"], "owner-b")
        self.assertEqual(second["value"]["tone"], "brief")


if __name__ == "__main__":
    unittest.main()

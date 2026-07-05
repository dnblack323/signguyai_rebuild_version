import os
import unittest
from copy import deepcopy
from unittest.mock import patch

from fastapi.testclient import TestClient

from core_runtime import encode_bearer_token
from server import app


class FakeActivityCursor:
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


class FakeActivityCollection:
    def __init__(self):
        self.rows = []

    async def create_index(self, *_args, **_kwargs):
        return None

    def find(self, query):
        return FakeActivityCursor([
            row for row in self.rows
            if all(row.get(key) == value for key, value in query.items())
        ])

    async def insert_one(self, document):
        self.rows.append(deepcopy(document))


class FakeActivityDatabase:
    def __init__(self):
        self.collections = {"activity_events": FakeActivityCollection()}

    def __getitem__(self, name):
        if name not in self.collections:
            self.collections[name] = FakeActivityCollection()
        return self.collections[name]


class ActivityRouteTests(unittest.TestCase):
    def setUp(self):
        self.database = FakeActivityDatabase()
        self.database_patch = patch("routes.activity.get_database", return_value=self.database)
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

    def seed_event(self, tenant_id: str, event_id: str, module: str = "settings", actor_id: str = "user-a"):
        self.database["activity_events"].rows.append({
            "id": event_id,
            "tenant_id": tenant_id,
            "event_type": "settings.config.updated",
            "module": module,
            "entity_type": "tenant_setting",
            "entity_id": "setting-a",
            "summary": "Updated setting email/digest",
            "actor_id": actor_id,
            "actor_role": "owner",
            "actor_email": "owner@example.com",
            "actor_source": "bearer",
            "severity": "info",
            "metadata": {"namespace": "email", "key": "digest"},
            "changes": {"value": {"enabled": True}},
            "created_at": f"2026-07-05T00:00:0{len(self.database['activity_events'].rows)}Z",
            "updated_at": f"2026-07-05T00:00:0{len(self.database['activity_events'].rows)}Z",
            "version": 1,
        })

    def test_admin_can_list_tenant_scoped_activity_events(self):
        self.seed_event("shop-a", "event-a")
        self.seed_event("shop-b", "event-b")

        with patch.dict(
            os.environ,
            {"JWT_SECRET_KEY": "activity-test-secret", "SIGNGUYAI_AUTH_MODE": "enforced"},
            clear=False,
        ):
            response = self.client.get(
                "/api/activity/events?module=settings",
                headers={"Authorization": self.bearer("admin", tenant_id="shop-a")},
            )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["total"], 1)
        self.assertEqual(body["events"][0]["id"], "event-a")
        self.assertNotIn("_id", body["events"][0])

    def test_staff_cannot_view_activity_events(self):
        with patch.dict(
            os.environ,
            {"JWT_SECRET_KEY": "activity-test-secret", "SIGNGUYAI_AUTH_MODE": "enforced"},
            clear=False,
        ):
            response = self.client.get(
                "/api/activity/events",
                headers={"Authorization": self.bearer("staff")},
            )

        self.assertEqual(response.status_code, 403)

    def test_activity_events_filter_by_entity_and_actor(self):
        self.seed_event("shop-a", "event-a", actor_id="user-a")
        self.seed_event("shop-a", "event-b", actor_id="user-b")

        with patch.dict(
            os.environ,
            {"JWT_SECRET_KEY": "activity-test-secret", "SIGNGUYAI_AUTH_MODE": "enforced"},
            clear=False,
        ):
            response = self.client.get(
                "/api/activity/events?actor_id=user-b&entity_type=tenant_setting",
                headers={"Authorization": self.bearer("owner", tenant_id="shop-a")},
            )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["total"], 1)
        self.assertEqual(body["events"][0]["id"], "event-b")


if __name__ == "__main__":
    unittest.main()

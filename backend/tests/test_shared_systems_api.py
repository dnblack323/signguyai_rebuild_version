import unittest
from copy import deepcopy
from unittest.mock import patch

from fastapi.testclient import TestClient

from server import app


class FakeSharedRepository:
    def __init__(self, prefix="REC"):
        self.prefix = prefix
        self.rows = {}
        self.counter = 0

    async def ensure_indexes(self):
        return None

    async def list(self, tenant_id, filters=None, limit=100):
        filters = filters or {}
        rows = [deepcopy(row) for (tenant, _), row in self.rows.items() if tenant == tenant_id]
        for key, value in filters.items():
            rows = [row for row in rows if row.get(key) == value]
        return rows[:limit]

    async def get(self, tenant_id, record_id):
        row = self.rows.get((tenant_id, record_id))
        return deepcopy(row) if row else None

    async def create(self, tenant_id, payload):
        self.counter += 1
        record_id = payload.get("id") or f"{self.prefix}-{self.counter}"
        row = {**payload, "id": record_id, "tenant_id": tenant_id, "version": 1}
        self.rows[(tenant_id, record_id)] = row
        return deepcopy(row)

    async def update(self, tenant_id, record_id, patch):
        if (tenant_id, record_id) not in self.rows:
            return None
        row = {**self.rows[(tenant_id, record_id)], **patch, "version": self.rows[(tenant_id, record_id)].get("version", 1) + 1}
        self.rows[(tenant_id, record_id)] = row
        return deepcopy(row)


class SharedSystemsApiTests(unittest.TestCase):
    def setUp(self):
        self.community = FakeSharedRepository("COMM")
        self.notes = FakeSharedRepository("NOTE")
        self.ai = FakeSharedRepository("AI")
        self.patches = [
            patch("routes.shared_systems.community_repo", return_value=self.community),
            patch("routes.shared_systems.notes_repo", return_value=self.notes),
            patch("routes.shared_systems.ai_response_repo", return_value=self.ai),
        ]
        for active_patch in self.patches:
            active_patch.start()
        self.client = TestClient(app)

    def tearDown(self):
        for active_patch in self.patches:
            active_patch.stop()

    def test_community_post_reply_and_stats_are_tenant_scoped(self):
        created = self.client.post("/api/community/posts", json={
            "title": "Need bug reports",
            "body": "Community issue intake",
            "category": "bug_report",
        }, headers={"X-Tenant-Id": "shop-a"})
        self.assertEqual(created.status_code, 201)
        post_id = created.json()["id"]

        reply = self.client.post(f"/api/community/posts/{post_id}/reply", json={
            "body": "Official answer",
            "is_official": True,
        }, headers={"X-Tenant-Id": "shop-a"})
        self.assertEqual(reply.status_code, 200)
        self.assertTrue(reply.json()["is_answered"])

        shop_a = self.client.get("/api/community/posts", headers={"X-Tenant-Id": "shop-a"}).json()
        shop_b = self.client.get("/api/community/posts", headers={"X-Tenant-Id": "shop-b"}).json()
        self.assertEqual(shop_a["total"], 1)
        self.assertEqual(shop_b["total"], 0)

        stats = self.client.get("/api/community/stats", headers={"X-Tenant-Id": "shop-a"}).json()
        self.assertEqual(stats["bug_reports"], 1)
        self.assertEqual(stats["answered"], 1)

    def test_notes_create_and_filter(self):
        self.client.post("/api/notes", json={"title": "Order context", "scope": "orders"}, headers={"X-Tenant-Id": "shop-a"})
        self.client.post("/api/notes", json={"title": "Customer context", "scope": "customers"}, headers={"X-Tenant-Id": "shop-a"})
        notes = self.client.get("/api/notes?scope=orders", headers={"X-Tenant-Id": "shop-a"}).json()
        self.assertEqual(len(notes), 1)
        self.assertEqual(notes[0]["title"], "Order context")

    def test_ai_generate_records_response(self):
        result = self.client.post("/api/ai/generate", json={
            "tool_id": "idea_brainstormer",
            "input_data": {"prompt": "new wrap shop campaign"},
        })
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()["tool"], "idea_brainstormer")
        self.assertIn("Idea Brainstormer", result.json()["output"])


if __name__ == "__main__":
    unittest.main()

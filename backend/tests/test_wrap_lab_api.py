import unittest
from copy import deepcopy
from unittest.mock import patch

from fastapi.testclient import TestClient

from server import app


class FakeWrapRepository:
    def __init__(self):
        self.rows = {}

    async def ensure_indexes(self):
        return None

    async def list(self, tenant_id):
        return [deepcopy(row) for (tenant, _), row in self.rows.items() if tenant == tenant_id]

    async def get(self, tenant_id, project_id):
        row = self.rows.get((tenant_id, project_id))
        return deepcopy(row) if row else None

    async def create(self, tenant_id, project):
        row = {**project, "id": project.get("id") or "WRAP-TEST", "tenant_id": tenant_id, "version": 1}
        self.rows[(tenant_id, row["id"])] = row
        return deepcopy(row)

    async def replace(self, tenant_id, project_id, project):
        if (tenant_id, project_id) not in self.rows:
            return None
        row = {**project, "id": project_id, "tenant_id": tenant_id, "version": self.rows[(tenant_id, project_id)]["version"] + 1}
        self.rows[(tenant_id, project_id)] = row
        return deepcopy(row)

    async def patch(self, tenant_id, project_id, fields):
        row = self.rows[(tenant_id, project_id)] | fields
        self.rows[(tenant_id, project_id)] = row
        return deepcopy(row)

    async def delete(self, tenant_id, project_id):
        return self.rows.pop((tenant_id, project_id), None) is not None


class WrapLabApiTests(unittest.TestCase):
    def setUp(self):
        self.repository = FakeWrapRepository()
        self.patch = patch("routes.wrap_lab.repository", return_value=self.repository)
        self.patch.start()
        self.client = TestClient(app)

    def tearDown(self):
        self.patch.stop()

    def test_crud_is_tenant_scoped(self):
        payload = {"id": "WRAP-API-1", "businessName": "Apex", "stage": "Intake", "stageIndex": 0}
        created = self.client.post("/api/wrap-lab/projects", json=payload, headers={"X-Tenant-Id": "shop-a"})
        self.assertEqual(created.status_code, 201)
        self.assertEqual(len(self.client.get("/api/wrap-lab/projects", headers={"X-Tenant-Id": "shop-a"}).json()), 1)
        self.assertEqual(len(self.client.get("/api/wrap-lab/projects", headers={"X-Tenant-Id": "shop-b"}).json()), 0)

    def test_portal_action_persists(self):
        payload = {"id": "WRAP-API-2", "businessName": "Apex", "stage": "Quote", "stageIndex": 1, "quoteStatus": "pending"}
        self.client.post("/api/wrap-lab/projects", json=payload)
        result = self.client.post("/api/wrap-lab/projects/WRAP-API-2/actions", json={"action": "approve_quote", "payload": {}})
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()["quoteStatus"], "approved")


if __name__ == "__main__":
    unittest.main()

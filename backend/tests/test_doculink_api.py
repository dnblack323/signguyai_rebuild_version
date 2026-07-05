import io
import os
import tempfile
import unittest
from pathlib import Path
from copy import deepcopy
from unittest.mock import patch

from fastapi.testclient import TestClient

from core_runtime import encode_bearer_token
from server import app


class FakeDocuLinkRepository:
    def __init__(self):
        self.files = {}
        self.documents = {}
        self.file_links = []
        self.document_links = []
        self.activities = {}
        self.counter = 0

    async def ensure_indexes(self):
        return None

    def _id(self, prefix):
        self.counter += 1
        return f"{prefix}-{self.counter}"

    async def create_document(self, tenant_id, payload, actor_id=""):
        document = {
            **payload,
            "id": payload.get("id") or self._id("DOC"),
            "tenant_id": tenant_id,
            "version": 1,
        }
        self.documents[(tenant_id, document["id"])] = document
        await self.record_activity(tenant_id, document["id"], "created", actor_id=actor_id, metadata={"status": document.get("status", "draft")})
        return deepcopy(document)

    async def list_documents(self, tenant_id, filters=None, limit=200):
        rows = [deepcopy(row) for (tenant, _), row in self.documents.items() if tenant == tenant_id]
        for key, value in (filters or {}).items():
            if value:
                rows = [row for row in rows if row.get(key) == value]
        return rows[:limit]

    async def get_document(self, tenant_id, document_id):
        row = self.documents.get((tenant_id, document_id))
        return deepcopy(row) if row else None

    async def update_document(self, tenant_id, document_id, patch, actor_id=""):
        row = self.documents.get((tenant_id, document_id))
        if not row:
            return None
        row = {**row, **patch, "version": row.get("version", 1) + 1}
        self.documents[(tenant_id, document_id)] = row
        await self.record_activity(tenant_id, document_id, "updated", actor_id=actor_id)
        return deepcopy(row)

    async def create_file(self, tenant_id, payload, actor_id=""):
        file_record = {
            **payload,
            "id": payload.get("id") or self._id("FILE"),
            "tenant_id": tenant_id,
            "uploaded_by": actor_id,
            "version": 1,
        }
        self.files[(tenant_id, file_record["id"])] = file_record
        return {key: value for key, value in deepcopy(file_record).items() if key != "object_path"}

    async def get_file(self, tenant_id, file_id):
        row = self.files.get((tenant_id, file_id))
        return {key: value for key, value in deepcopy(row).items() if key != "object_path"} if row else None

    async def get_file_for_download(self, tenant_id, file_id):
        row = self.files.get((tenant_id, file_id))
        return deepcopy(row) if row else None

    async def list_files(self, tenant_id, filters=None, limit=200):
        return [
            {key: value for key, value in deepcopy(row).items() if key != "object_path"}
            for (tenant, _), row in self.files.items()
            if tenant == tenant_id
        ][:limit]

    async def create_file_link(self, tenant_id, payload, actor_id=""):
        if (tenant_id, payload["file_id"]) not in self.files:
            raise LookupError("File not found")
        row = {**payload, "id": self._id("FLINK"), "tenant_id": tenant_id, "created_by": actor_id}
        self.file_links.append(row)
        await self.record_activity(tenant_id, payload.get("document_id", ""), "linked", actor_id=actor_id)
        return deepcopy(row)

    async def create_document_link(self, tenant_id, payload, actor_id=""):
        if (tenant_id, payload["document_id"]) not in self.documents:
            raise LookupError("Document not found")
        row = {**payload, "id": self._id("DLINK"), "tenant_id": tenant_id, "created_by": actor_id}
        self.document_links.append(row)
        await self.record_activity(tenant_id, payload["document_id"], "linked", actor_id=actor_id)
        return deepcopy(row)

    async def list_links(self, tenant_id, entity_type="", entity_id=""):
        def matches(row):
            return row["tenant_id"] == tenant_id and (not entity_type or row.get("entity_type") == entity_type) and (not entity_id or row.get("entity_id") == entity_id)
        return {
            "file_links": [deepcopy(row) for row in self.file_links if matches(row)],
            "document_links": [deepcopy(row) for row in self.document_links if matches(row)],
        }

    async def create_share(self, tenant_id, document_id, payload, actor_id=""):
        if (tenant_id, document_id) not in self.documents:
            raise LookupError("Document not found")
        row = {**payload, "id": self._id("SHARE"), "tenant_id": tenant_id, "document_id": document_id}
        await self.record_activity(tenant_id, document_id, "shared", actor_id=actor_id)
        return row

    async def record_activity(self, tenant_id, document_id, activity_type, actor_type="user", actor_id="", metadata=None):
        row = {"id": self._id("ACT"), "tenant_id": tenant_id, "document_id": document_id, "activity_type": activity_type, "actor_id": actor_id, "metadata": metadata or {}}
        self.activities.setdefault((tenant_id, document_id), []).insert(0, row)
        return deepcopy(row)

    async def list_activities(self, tenant_id, document_id):
        return deepcopy(self.activities.get((tenant_id, document_id), []))


class DocuLinkApiTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        os.environ["DOCULINK_OBJECT_STORAGE_ROOT"] = self.tmp.name
        self.repo = FakeDocuLinkRepository()
        self.activity_events = []
        self.patch = patch("routes.doculink.repository", return_value=self.repo)
        self.patch.start()
        self.activity_patch = patch("routes.doculink.record_activity_event", side_effect=self.record_activity_event)
        self.activity_patch.start()
        self.client = TestClient(app)

    def tearDown(self):
        self.activity_patch.stop()
        self.patch.stop()
        self.tmp.cleanup()
        os.environ.pop("DOCULINK_OBJECT_STORAGE_ROOT", None)
        os.environ.pop("SIGNGUYAI_MAX_UPLOAD_BYTES", None)

    async def record_activity_event(self, _database, context, **payload):
        event = {
            "tenant_id": context.tenant_id,
            "actor_id": context.user_id,
            **payload,
        }
        self.activity_events.append(event)
        return deepcopy(event)

    def bearer(self, role: str, tenant_id: str = "shop-a", user_id: str = "user-a") -> str:
        token = encode_bearer_token({
            "sub": user_id,
            "tenant_id": tenant_id,
            "role": role,
        })
        return f"Bearer {token}"

    def test_document_create_is_tenant_scoped_and_activity_is_recorded(self):
        created = self.client.post("/api/doculink/documents", json={
            "title": "Wrap intake packet",
            "document_type": "packet",
            "visibility": "internal",
        }, headers={"X-Tenant-Id": "shop-a"})
        self.assertEqual(created.status_code, 201)
        document_id = created.json()["id"]

        shop_a = self.client.get("/api/doculink/documents", headers={"X-Tenant-Id": "shop-a"}).json()
        shop_b = self.client.get("/api/doculink/documents", headers={"X-Tenant-Id": "shop-b"}).json()
        self.assertEqual(len(shop_a), 1)
        self.assertEqual(len(shop_b), 0)

        activities = self.client.get(f"/api/doculink/documents/{document_id}/activities", headers={"X-Tenant-Id": "shop-a"}).json()
        self.assertEqual(activities[0]["activity_type"], "created")

    def test_upload_stores_binary_outside_mongo_and_downloads_through_endpoint(self):
        upload = self.client.post(
            "/api/doculink/files/upload",
            files={"file": ("proof.txt", io.BytesIO(b"proof data"), "text/plain")},
            headers={"X-Tenant-Id": "shop-a", "X-Actor-Id": "staff-a"},
        )
        self.assertEqual(upload.status_code, 201)
        file_record = upload.json()
        self.assertNotIn("object_path", file_record)
        self.assertEqual(file_record["size_bytes"], len(b"proof data"))
        self.assertEqual(file_record["uploaded_by"], "staff-a")
        stored_files = list(Path(self.tmp.name).rglob("proof*"))
        self.assertEqual(stored_files, [])
        self.assertTrue(list(Path(self.tmp.name).rglob("*.txt")))

        download = self.client.get(f"/api/doculink/files/{file_record['id']}/download", headers={"X-Tenant-Id": "shop-a", "X-Actor-Id": "staff-a"})
        self.assertEqual(download.status_code, 200)
        self.assertEqual(download.content, b"proof data")
        self.assertEqual([event["event_type"] for event in self.activity_events], ["files.uploaded", "files.downloaded"])
        self.assertEqual(self.activity_events[0]["actor_id"], "staff-a")

        cross_tenant = self.client.get(f"/api/doculink/files/{file_record['id']}/download", headers={"X-Tenant-Id": "shop-b"})
        self.assertEqual(cross_tenant.status_code, 404)

    def test_upload_rejects_disallowed_mime_type(self):
        with patch.dict(os.environ, {"SIGNGUYAI_AUTH_MODE": "preview"}, clear=False):
            response = self.client.post(
                "/api/doculink/files/upload",
                files={"file": ("malware.exe", io.BytesIO(b"not really exe"), "application/x-msdownload")},
                headers={"X-Tenant-Id": "shop-a"},
            )

        self.assertEqual(response.status_code, 415)
        self.assertEqual(self.activity_events, [])

    def test_upload_rejects_file_over_configured_size_limit(self):
        with patch.dict(os.environ, {"SIGNGUYAI_AUTH_MODE": "preview", "SIGNGUYAI_MAX_UPLOAD_BYTES": "4"}, clear=False):
            response = self.client.post(
                "/api/doculink/files/upload",
                files={"file": ("proof.txt", io.BytesIO(b"proof data"), "text/plain")},
                headers={"X-Tenant-Id": "shop-a"},
            )

        self.assertEqual(response.status_code, 413)
        self.assertEqual(self.activity_events, [])

    def test_file_download_requires_authentication_when_auth_is_enforced(self):
        with patch.dict(os.environ, {"SIGNGUYAI_AUTH_MODE": "enforced"}, clear=False):
            response = self.client.get("/api/doculink/files/FILE-1/download")

        self.assertEqual(response.status_code, 401)

    def test_staff_can_upload_and_download_but_cannot_share_documents(self):
        with patch.dict(
            os.environ,
            {"JWT_SECRET_KEY": "doculink-test-secret", "SIGNGUYAI_AUTH_MODE": "enforced"},
            clear=False,
        ):
            upload = self.client.post(
                "/api/doculink/files/upload",
                files={"file": ("proof.txt", io.BytesIO(b"proof data"), "text/plain")},
                headers={"Authorization": self.bearer("staff")},
            )
            self.assertEqual(upload.status_code, 201)
            file_id = upload.json()["id"]

            download = self.client.get(
                f"/api/doculink/files/{file_id}/download",
                headers={"Authorization": self.bearer("staff")},
            )
            share = self.client.post(
                "/api/doculink/documents/DOC-1/shares",
                json={"share_type": "customer_portal", "recipient_type": "customer", "recipient_id": "CUST-1"},
                headers={"Authorization": self.bearer("staff")},
            )

        self.assertEqual(download.status_code, 200)
        self.assertEqual(share.status_code, 403)

    def test_files_and_documents_can_link_to_supported_records(self):
        document = self.client.post("/api/doculink/documents", json={"title": "Proof approval", "document_type": "approval"}).json()
        upload = self.client.post(
            "/api/doculink/files/upload",
            files={"file": ("proof.txt", io.BytesIO(b"proof data"), "text/plain")},
        ).json()

        file_link = self.client.post(f"/api/doculink/files/{upload['id']}/links", json={
            "entity_type": "wrap_project",
            "entity_id": "WRAP-1",
            "relationship_type": "attachment",
            "customer_visible": True,
        })
        self.assertEqual(file_link.status_code, 201)
        self.assertTrue(file_link.json()["customer_visible"])

        document_link = self.client.post(f"/api/doculink/documents/{document['id']}/links", json={
            "entity_type": "wrap_project",
            "entity_id": "WRAP-1",
            "relationship_type": "approval_for",
        })
        self.assertEqual(document_link.status_code, 201)

        links = self.client.get("/api/doculink/links?entity_type=wrap_project&entity_id=WRAP-1").json()
        self.assertEqual(len(links["file_links"]), 1)
        self.assertEqual(len(links["document_links"]), 1)
        self.assertTrue(links["file_links"][0]["customer_visible"])
        self.assertIn("files.linked", [event["event_type"] for event in self.activity_events])

    def test_ai_generated_document_starts_as_review_required_draft(self):
        created = self.client.post("/api/doculink/documents", json={
            "title": "AI generated proposal",
            "document_type": "proposal",
            "source_type": "ai_generated",
        })
        self.assertEqual(created.status_code, 201)
        body = created.json()
        self.assertTrue(body["ai_generated"])
        self.assertTrue(body["requires_review"])
        self.assertEqual(body["status"], "draft")


if __name__ == "__main__":
    unittest.main()

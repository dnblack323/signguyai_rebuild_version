import unittest

from repositories.wrap_project_children import WRAP_CHILD_ARRAY_FIELDS, WrapProjectChildRepository
from shared.indexes import INDEX_MANIFEST, TENANT_ID_INDEX, collection_indexes


class WrapProjectChildNormalizationTests(unittest.TestCase):
    def test_split_project_removes_unbounded_child_arrays_from_parent(self):
        repo = WrapProjectChildRepository.__new__(WrapProjectChildRepository)
        parent, children = repo.split_project({
            "id": "WRAP-1",
            "businessName": "Apex",
            "files": [{"id": "file-1", "name": "before.jpg"}],
            "proofs": [{"id": "proof-1", "status": "Pending"}],
            "chatHistory": [{"id": "msg-1", "text": "hello"}],
            "mockupStudio": {
                "settings": {"count": 3},
                "assets": [{"id": "asset-1", "name": "logo.ai"}],
                "concepts": [{"id": "concept-1", "title": "Bold Motion"}],
                "activity": [{"message": "Concept generated"}],
            },
        })
        self.assertEqual(parent, {"id": "WRAP-1", "businessName": "Apex", "mockupStudio": {"settings": {"count": 3}}})
        self.assertEqual(set(children), {"files", "proofs", "chatHistory", "mockupStudio.assets", "mockupStudio.concepts", "mockupStudio.activity"})

    def test_attach_children_restores_frontend_compatible_arrays(self):
        repo = WrapProjectChildRepository.__new__(WrapProjectChildRepository)
        hydrated = repo.attach_children(
            {"id": "WRAP-1", "businessName": "Apex", "mockupStudio": {"settings": {"count": 3}}},
            [
                {"record_type": "files", "payload": {"id": "file-1", "name": "before.jpg"}},
                {"record_type": "chatHistory", "payload": {"id": "msg-1", "text": "hello"}},
                {"record_type": "mockupStudio.concepts", "payload": {"id": "concept-1", "title": "Bold Motion"}},
            ],
        )
        self.assertEqual(hydrated["files"][0]["name"], "before.jpg")
        self.assertEqual(hydrated["chatHistory"][0]["text"], "hello")
        self.assertEqual(hydrated["mockupStudio"]["concepts"][0]["title"], "Bold Motion")
        self.assertEqual(hydrated["mockupStudio"]["settings"], {"count": 3})
        for field in WRAP_CHILD_ARRAY_FIELDS:
            self.assertIn(field, hydrated)

    def test_attach_children_preserves_legacy_embedded_arrays_when_not_normalized_yet(self):
        repo = WrapProjectChildRepository.__new__(WrapProjectChildRepository)
        hydrated = repo.attach_children(
            {"id": "WRAP-1", "files": [{"id": "legacy-file", "name": "legacy.jpg"}]},
            [],
        )
        self.assertEqual(hydrated["files"][0]["name"], "legacy.jpg")

    def test_child_record_indexes_are_manifested(self):
        self.assertIn("wrap_project_child_records", INDEX_MANIFEST)
        self.assertIn(TENANT_ID_INDEX, collection_indexes("wrap_project_child_records"))


if __name__ == "__main__":
    unittest.main()

import unittest

from repositories.customer_children import CustomerChildRepository
from shared.indexes import INDEX_MANIFEST, TENANT_ID_INDEX, collection_indexes


class CustomerChildNormalizationTests(unittest.TestCase):
    def test_customer_tags_and_notes_split_from_parent(self):
        repo = CustomerChildRepository.__new__(CustomerChildRepository)
        parent, children = repo.split_customer({
            "id": "CUST-1",
            "businessName": "Apex",
            "tags": ["fleet", "wrap"],
            "notes": "Prefers morning installs.",
        })
        self.assertEqual(parent, {"id": "CUST-1", "businessName": "Apex"})
        self.assertEqual(children["tags"], ["fleet", "wrap"])
        self.assertEqual(children["notes"][0]["body"], "Prefers morning installs.")

    def test_customer_children_hydrate_frontend_shape(self):
        repo = CustomerChildRepository.__new__(CustomerChildRepository)
        hydrated = repo.attach_children({"id": "CUST-1", "businessName": "Apex"}, [
            {"record_type": "tags", "payload": {"id": "tag-1", "value": "fleet"}},
            {"record_type": "tags", "payload": {"id": "tag-2", "value": "wrap"}},
            {"record_type": "notes", "payload": {"id": "note-1", "body": "Prefers morning installs."}},
        ])
        self.assertEqual(hydrated["tags"], ["fleet", "wrap"])
        self.assertEqual(hydrated["notes"], "Prefers morning installs.")

    def test_customer_child_record_indexes_are_manifested(self):
        self.assertIn("customer_child_records", INDEX_MANIFEST)
        self.assertIn(TENANT_ID_INDEX, collection_indexes("customer_child_records"))


if __name__ == "__main__":
    unittest.main()

import unittest

from repositories.shared_record_children import SharedRecordChildRepository
from shared.indexes import INDEX_MANIFEST, TENANT_ID_INDEX, collection_indexes


class SharedRecordChildNormalizationTests(unittest.TestCase):
    def test_community_post_replies_and_upvotes_split_from_parent(self):
        repo = SharedRecordChildRepository.__new__(SharedRecordChildRepository)
        parent, children = repo.split_record("community_posts", {
            "id": "COMM-1",
            "title": "Bug",
            "replies": [{"id": "reply-1", "body": "Fixed"}],
            "upvoted_by": ["user-1"],
        })
        self.assertEqual(parent, {"id": "COMM-1", "title": "Bug"})
        self.assertEqual(children["replies"][0]["body"], "Fixed")
        self.assertEqual(children["upvoted_by"], ["user-1"])

    def test_community_post_children_hydrate_to_frontend_shape(self):
        repo = SharedRecordChildRepository.__new__(SharedRecordChildRepository)
        hydrated = repo.attach_children("community_posts", {"id": "COMM-1", "title": "Bug"}, [
            {"record_type": "replies", "payload": {"id": "reply-1", "body": "Fixed"}},
            {"record_type": "upvoted_by", "payload": {"id": "vote-1", "value": "user-1"}},
        ])
        self.assertEqual(hydrated["replies"][0]["body"], "Fixed")
        self.assertEqual(hydrated["upvoted_by"], ["user-1"])

    def test_note_tags_split_and_hydrate_to_frontend_shape(self):
        repo = SharedRecordChildRepository.__new__(SharedRecordChildRepository)
        parent, children = repo.split_record("shared_notes", {"id": "NOTE-1", "title": "Order context", "tags": ["orders", "wrap-it"]})
        self.assertEqual(parent, {"id": "NOTE-1", "title": "Order context"})
        self.assertEqual(children["tags"], ["orders", "wrap-it"])
        hydrated = repo.attach_children("shared_notes", parent, [
            {"record_type": "tags", "payload": {"id": "tag-1", "value": "orders"}},
            {"record_type": "tags", "payload": {"id": "tag-2", "value": "wrap-it"}},
        ])
        self.assertEqual(hydrated["tags"], ["orders", "wrap-it"])

    def test_shared_child_record_indexes_are_manifested(self):
        self.assertIn("shared_record_child_records", INDEX_MANIFEST)
        self.assertIn(TENANT_ID_INDEX, collection_indexes("shared_record_child_records"))


if __name__ == "__main__":
    unittest.main()

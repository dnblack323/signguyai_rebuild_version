import unittest
import uuid

from models.base import BaseDocument, StrictBaseModel
from repositories.customers import CustomerRepository
from shared.ids import uuid7_str
from shared.indexes import INDEX_MANIFEST, TENANT_ID_INDEX, collection_indexes
from shared.money import assert_minor_units, to_minor_units


class DataLayerFoundationTests(unittest.TestCase):
    def test_uuid7_helper_returns_version_7_uuid(self):
        generated = uuid.UUID(uuid7_str())
        self.assertEqual(generated.version, 7)

    def test_base_document_uses_uuid7_and_tenant_fields(self):
        document = BaseDocument(tenant_id="shop-a")
        self.assertEqual(uuid.UUID(document.id).version, 7)
        self.assertEqual(document.tenant_id, "shop-a")
        self.assertEqual(document.version, 1)

    def test_strict_base_rejects_extra_fields(self):
        class Example(StrictBaseModel):
            name: str

        with self.assertRaises(Exception):
            Example(name="ok", unexpected=True)

    def test_money_helpers_only_accept_minor_unit_safe_values(self):
        self.assertEqual(to_minor_units("12.34"), 1234)
        self.assertEqual(assert_minor_units(2500), 2500)
        with self.assertRaises(TypeError):
            to_minor_units(12.34)

    def test_manifest_declares_tenant_id_unique_index_for_current_collections(self):
        for collection_name in ["customers", "wrap_projects", "community_posts", "shared_notes", "ai_responses"]:
            indexes = collection_indexes(collection_name)
            self.assertIn(TENANT_ID_INDEX, indexes)
            self.assertIn(collection_name, INDEX_MANIFEST)

    def test_customer_payload_normalization_removes_float_money_and_adds_lookup_fields(self):
        repo = CustomerRepository.__new__(CustomerRepository)
        normalized = repo._normalize_payload({
            "businessName": " Apex Wraps ",
            "email": "Owner@Example.COM ",
            "lifetimeValue": 12.34,
        })
        self.assertNotIn("lifetimeValue", normalized)
        self.assertEqual(normalized["lifetimeValueMinor"], 1234)
        self.assertEqual(normalized["normalized_email"], "owner@example.com")
        self.assertEqual(normalized["normalized_name"], "apex wraps")


if __name__ == "__main__":
    unittest.main()

import os
import unittest
from copy import deepcopy
from unittest.mock import patch

from fastapi.testclient import TestClient

from core_runtime import encode_bearer_token
from server import app


class FakeBillingCursor:
    def __init__(self, rows):
        self.rows = rows

    def sort(self, *_args, **_kwargs):
        self.rows = sorted(self.rows, key=lambda row: row.get("feature_key", ""))
        return self

    def __aiter__(self):
        self._iter = iter(self.rows)
        return self

    async def __anext__(self):
        try:
            return deepcopy(next(self._iter))
        except StopIteration as exc:
            raise StopAsyncIteration from exc


class FakeBillingCollection:
    def __init__(self):
        self.rows = []

    async def create_index(self, *_args, **_kwargs):
        return None

    def find(self, query):
        return FakeBillingCursor([
            row for row in self.rows
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


class FakeBillingDatabase:
    def __init__(self):
        self.collections = {}

    def __getitem__(self, name):
        if name not in self.collections:
            self.collections[name] = FakeBillingCollection()
        return self.collections[name]


class BillingRouteTests(unittest.TestCase):
    def setUp(self):
        self.database = FakeBillingDatabase()
        self.billing_database_patch = patch("routes.billing.get_database", return_value=self.database)
        self.webstore_database_patch = patch("routes.webstores.get_database", return_value=self.database)
        self.billing_database_patch.start()
        self.webstore_database_patch.start()
        self.client = TestClient(app)

    def tearDown(self):
        self.webstore_database_patch.stop()
        self.billing_database_patch.stop()

    def bearer(self, role: str, tenant_id: str = "shop-a", user_id: str = "user-a") -> str:
        token = encode_bearer_token({
            "sub": user_id,
            "tenant_id": tenant_id,
            "role": role,
        })
        return f"Bearer {token}"

    def test_catalog_exposes_plan_strategy_products_and_promo(self):
        with patch.dict(
            os.environ,
            {"JWT_SECRET_KEY": "billing-test-secret", "SIGNGUYAI_AUTH_MODE": "enforced"},
            clear=False,
        ):
            response = self.client.get("/api/billing/catalog", headers={"Authorization": self.bearer("admin")})

        self.assertEqual(response.status_code, 200)
        body = response.json()
        products = {product["product_id"]: product for product in body["subscription_products"]}
        self.assertEqual(products["prod_core_os"]["founders_price_minor"], 9900)
        self.assertEqual(products["prod_webstore_standalone"]["general_availability_monthly_credits"], 300)
        self.assertEqual(body["founders_promo"]["code"], "FOUNDERS3MO")
        self.assertEqual(body["credit_top_up_products"][2]["credits"], 800)

    def test_credit_bank_complete_bundle_takes_precedence_and_addons_are_additive(self):
        with patch.dict(
            os.environ,
            {"JWT_SECRET_KEY": "billing-test-secret", "SIGNGUYAI_AUTH_MODE": "enforced"},
            clear=False,
        ):
            bundle = self.client.post(
                "/api/billing/credit-bank",
                json={"product_ids": ["prod_core_os", "prod_complete_bundle", "prod_wrap_standalone"], "phase": "founders"},
                headers={"Authorization": self.bearer("admin")},
            )
            additive = self.client.post(
                "/api/billing/credit-bank",
                json={"product_ids": ["prod_core_os", "prod_webstore_standalone", "prod_wrap_standalone"], "phase": "general_availability"},
                headers={"Authorization": self.bearer("admin")},
            )

        self.assertEqual(bundle.json()["monthly_credits"], 1000)
        self.assertEqual(additive.json()["monthly_credits"], 1100)

    def test_platform_fee_router_matches_founders_promo_and_ga_rules(self):
        with patch.dict(
            os.environ,
            {"JWT_SECRET_KEY": "billing-test-secret", "SIGNGUYAI_AUTH_MODE": "enforced"},
            clear=False,
        ):
            promo = self.client.post(
                "/api/billing/platform-fee",
                json={"phase": "founders", "checkout_channel": "webstore", "shop_onboarded_index": 12, "has_redeemed_promo_code": True, "months_since_promo_applied": 2},
                headers={"Authorization": self.bearer("admin")},
            )
            founders = self.client.post(
                "/api/billing/platform-fee",
                json={"phase": "founders", "checkout_channel": "standard", "shop_onboarded_index": 12},
                headers={"Authorization": self.bearer("admin")},
            )
            ga = self.client.post(
                "/api/billing/platform-fee",
                json={"phase": "general_availability", "checkout_channel": "webstore", "shop_onboarded_index": 51},
                headers={"Authorization": self.bearer("admin")},
            )

        self.assertEqual(promo.json()["basis_points"], 0)
        self.assertEqual(founders.json()["basis_points"], 50)
        self.assertEqual(ga.json()["basis_points"], 200)

    def test_feature_entitlements_are_tenant_scoped_and_drive_webstore_capabilities(self):
        with patch.dict(
            os.environ,
            {"JWT_SECRET_KEY": "billing-test-secret", "SIGNGUYAI_AUTH_MODE": "enforced"},
            clear=False,
        ):
            saved = self.client.put(
                "/api/billing/feature-entitlements/webstores",
                json={"status": "enabled", "source_product_id": "prod_webstore_standalone", "mode": "standalone"},
                headers={"Authorization": self.bearer("owner", tenant_id="shop-a")},
            )
            self.client.put(
                "/api/billing/feature-entitlements/webstores",
                json={"status": "disabled", "source_product_id": "prod_webstore_standalone"},
                headers={"Authorization": self.bearer("owner", tenant_id="shop-b")},
            )
            listed = self.client.get(
                "/api/billing/feature-entitlements",
                headers={"Authorization": self.bearer("admin", tenant_id="shop-a")},
            )
            capabilities = self.client.get(
                "/api/webstores/capabilities?product_mode=standalone",
                headers={"Authorization": self.bearer("admin", tenant_id="shop-a")},
            )

        self.assertEqual(saved.status_code, 200)
        self.assertEqual(listed.json()["total"], 1)
        self.assertEqual(listed.json()["entitlements"][0]["tenant_id"], "shop-a")
        self.assertEqual(self.database["activity_events"].rows[0]["event_type"], "billing.entitlement.updated")
        self.assertTrue(capabilities.json()["publishing_enabled"])
        self.assertEqual(capabilities.json()["entitlement_status"], "enabled")


if __name__ == "__main__":
    unittest.main()

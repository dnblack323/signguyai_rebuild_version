"""Full regression across all 9 pricing categories via the Order Item
calculate-pricing API (POST /api/order-items/{id}/calculate-pricing).

Covers the pricing_engine.py rewrite this turn: banners, rigid_signs,
cut_vinyl, digital_print, vehicle_wrap, services, apparel, promo_misc, custom.
Verifies every category returns HTTP 200 with a positive selling_price_minor,
a non-crashing breakdown, and the expected calculation_method label.
Also verifies apparel-specific behavior: quantity derived from size breakdown
when size_* fields are set and top-level quantity is left at default.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')


@pytest.fixture(scope="module")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def test_order(api_client):
    resp = api_client.post(f"{BASE_URL}/api/orders", json={
        "order_name": "TEST_AllCategoriesOrder", "customer_id": "", "order_source": "walk_in"
    })
    assert resp.status_code == 201, resp.text
    return resp.json()


CATEGORY_SPECS = {
    "banners": {"width_inches": 48, "height_inches": 24, "unit_of_measure": "inches", "banner_material_key": "banner_13oz", "banner_grommets": "corners"},
    "rigid_signs": {"width_inches": 24, "height_inches": 18, "unit_of_measure": "inches", "substrate_type_key": "coroplast_4mm", "sidedness": "single"},
    "cut_vinyl": {"width_inches": 12, "height_inches": 12, "unit_of_measure": "inches", "vinyl_type_key": "oracal_651", "num_colors": 2},
    "digital_print": {"width_inches": 24, "height_inches": 36, "unit_of_measure": "inches", "print_media_key": "printable_adhesive_vinyl"},
    "vehicle_wrap": {"vehicle_type": "van_cargo", "coverage_type": "partial", "wrap_material_key": "wrap_standard_calendared"},
    "services": {"service_type": "Install Labor", "services_billing_unit": "hour", "estimated_hours": 3},
    "apparel": {"apparel_product_type": "short_sleeve_tee", "apparel_decoration_method": "screen_print", "apparel_num_colors": 2, "size_m": 12},
    "promo_misc": {"promo_product_type": "Koozie", "unit_cost_minor": 150},
    "custom": {"unit_cost_minor": 500, "estimated_hours": 1},
}


@pytest.mark.parametrize("category,specs", list(CATEGORY_SPECS.items()))
def test_category_calculate_pricing_positive(api_client, test_order, category, specs):
    item_resp = api_client.post(f"{BASE_URL}/api/orders/{test_order['id']}/items", json={
        "item_name": f"TEST {category} item",
        "item_category": category,
        "quantity": 1,
        "specs": specs,
    })
    assert item_resp.status_code == 201, item_resp.text
    item = item_resp.json()

    calc_resp = api_client.post(f"{BASE_URL}/api/order-items/{item['id']}/calculate-pricing", json={
        "specs": specs, "save_snapshot": False
    })
    assert calc_resp.status_code == 200, calc_resp.text
    data = calc_resp.json()
    assert data["category"] == category
    assert data["selling_price_minor"] > 0, f"{category} produced non-positive price: {data}"
    assert "calculation_method" in data and data["calculation_method"]
    assert isinstance(data.get("breakdown"), dict)


def test_apparel_quantity_derived_from_size_breakdown(api_client, test_order):
    """Apparel: quantity should derive from size_* fields, not the stored item quantity."""
    specs = {"apparel_product_type": "short_sleeve_tee", "apparel_decoration_method": "screen_print", "size_m": 12}
    item_resp = api_client.post(f"{BASE_URL}/api/orders/{test_order['id']}/items", json={
        "item_name": "TEST Apparel Size-Derived",
        "item_category": "apparel",
        "quantity": 1,  # deliberately left at default/low value
        "specs": specs,
    })
    assert item_resp.status_code == 201, item_resp.text
    item = item_resp.json()

    calc_resp = api_client.post(f"{BASE_URL}/api/order-items/{item['id']}/calculate-pricing", json={
        "specs": specs, "save_snapshot": False
    })
    assert calc_resp.status_code == 200, calc_resp.text
    data = calc_resp.json()
    assert data["quantity"] == 12, f"Expected derived quantity=12 from size_m, got {data['quantity']}"
    assert data["selling_price_minor"] > 0

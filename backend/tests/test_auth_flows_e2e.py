"""
E2E tests for the real email/password JWT auth rebuild (enforced auth mode).
Covers: register, login, lockout, forgot/reset password, tenant isolation,
unauthenticated access boundaries, and module smoke tests (customers/orders/tenant).
"""
import os
import time
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"


def unique_email(prefix="test"):
    return f"TEST_{prefix}_{uuid.uuid4().hex[:10]}@example.com"


def unique_name(prefix="User"):
    return f"{prefix} {uuid.uuid4().hex[:8]}"


@pytest.fixture
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestRegisterLogin:
    def test_register_new_account_success(self, api_client):
        email = unique_email("reg")
        resp = api_client.post(f"{API}/auth/register", json={
            "email": email,
            "password": "StrongPass123!",
            "full_name": unique_name("Test User"),
            "company_name": unique_name("Test Co"),
        })
        assert resp.status_code == 201, resp.text
        data = resp.json()
        assert "access_token" in data and isinstance(data["access_token"], str) and len(data["access_token"]) > 10
        assert data["identity"]["email"] == email.lower()
        assert data["identity"]["role"] == "owner"
        assert data["identity"]["auth_source"] == "bearer"
        assert data["identity"]["tenant_id"]

    def test_register_duplicate_email_rejected(self, api_client):
        email = unique_email("dup")
        payload = {
            "email": email,
            "password": "StrongPass123!",
            "full_name": unique_name("Dup User"),
            "company_name": unique_name("Dup Co"),
        }
        r1 = api_client.post(f"{API}/auth/register", json=payload)
        assert r1.status_code == 201
        r2 = api_client.post(f"{API}/auth/register", json=payload)
        assert r2.status_code == 400
        assert "already exists" in r2.json().get("detail", "").lower()

    def test_login_success(self, api_client):
        email = unique_email("login")
        password = "StrongPass123!"
        api_client.post(f"{API}/auth/register", json={
            "email": email, "password": password, "full_name": unique_name("Login User"),
        })
        resp = api_client.post(f"{API}/auth/login", json={"email": email, "password": password})
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["identity"]["email"] == email.lower()

    def test_login_wrong_password(self, api_client):
        email = unique_email("wrongpw")
        api_client.post(f"{API}/auth/register", json={
            "email": email, "password": "StrongPass123!", "full_name": unique_name("WP User"),
        })
        resp = api_client.post(f"{API}/auth/login", json={"email": email, "password": "WrongPassword1!"})
        assert resp.status_code == 401
        assert "invalid email or password" in resp.json().get("detail", "").lower()

    def test_me_endpoint_with_token(self, api_client):
        email = unique_email("me")
        password = "StrongPass123!"
        reg = api_client.post(f"{API}/auth/register", json={
            "email": email, "password": password, "full_name": unique_name("Me User"),
        })
        token = reg.json()["access_token"]
        resp = api_client.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert resp.json()["email"] == email.lower()


class TestBruteForceLockout:
    def test_five_failed_attempts_locks_account(self, api_client):
        email = unique_email("lockout")
        api_client.post(f"{API}/auth/register", json={
            "email": email, "password": "StrongPass123!", "full_name": unique_name("Lockout User"),
        })
        last_resp = None
        for _ in range(5):
            last_resp = api_client.post(f"{API}/auth/login", json={"email": email, "password": "WrongPass!"})
            assert last_resp.status_code == 401
        # 6th attempt should be locked out
        resp6 = api_client.post(f"{API}/auth/login", json={"email": email, "password": "WrongPass!"})
        assert resp6.status_code == 429, resp6.text
        assert "too many" in resp6.json().get("detail", "").lower()
        # even correct password should be blocked during lockout
        resp7 = api_client.post(f"{API}/auth/login", json={"email": email, "password": "StrongPass123!"})
        assert resp7.status_code == 429


class TestForgotResetPassword:
    def test_forgot_password_nonexistent_email_generic_message(self, api_client):
        resp = api_client.post(f"{API}/auth/forgot-password", json={"email": unique_email("nouser")})
        assert resp.status_code == 200
        assert "reset link has been sent" in resp.json()["message"].lower()

    def test_forgot_password_existing_email_generic_message(self, api_client):
        email = unique_email("fp")
        api_client.post(f"{API}/auth/register", json={
            "email": email, "password": "StrongPass123!", "full_name": unique_name("FP User"),
        })
        resp = api_client.post(f"{API}/auth/forgot-password", json={"email": email})
        assert resp.status_code == 200
        assert "reset link has been sent" in resp.json()["message"].lower()

    def test_reset_password_invalid_token_rejected(self, api_client):
        resp = api_client.post(f"{API}/auth/reset-password", json={
            "token": "invalid-token-xyz",
            "new_password": "NewPassword123!",
        })
        assert resp.status_code == 400
        assert "invalid" in resp.json().get("detail", "").lower() or "expired" in resp.json().get("detail", "").lower() or "already been used" in resp.json().get("detail", "").lower()


class TestTenantIsolation:
    def test_tenant_a_customer_not_visible_to_tenant_b(self, api_client):
        # Register tenant A
        email_a = unique_email("tenantA")
        reg_a = api_client.post(f"{API}/auth/register", json={
            "email": email_a, "password": "StrongPass123!", "full_name": unique_name("Tenant A Owner"), "company_name": unique_name("Shop A"),
        })
        assert reg_a.status_code == 201, reg_a.text
        token_a = reg_a.json()["access_token"]

        # Register tenant B
        email_b = unique_email("tenantB")
        reg_b = api_client.post(f"{API}/auth/register", json={
            "email": email_b, "password": "StrongPass123!", "full_name": unique_name("Tenant B Owner"), "company_name": unique_name("Shop B"),
        })
        assert reg_b.status_code == 201, reg_b.text
        token_b = reg_b.json()["access_token"]

        # Create customer as tenant A
        customer_payload = {
            "name": "TEST_Isolation Customer",
            "email": unique_email("cust"),
        }
        create_resp = api_client.post(
            f"{API}/customers",
            json=customer_payload,
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert create_resp.status_code in (200, 201), create_resp.text
        created_customer = create_resp.json()
        customer_id = created_customer.get("id") or created_customer.get("_id")

        # Tenant A can see its own customer
        def _extract_items(payload):
            if isinstance(payload, list):
                return payload
            return payload.get("items", [])

        list_a = api_client.get(f"{API}/customers", headers={"Authorization": f"Bearer {token_a}"})
        assert list_a.status_code == 200, list_a.text
        a_ids = [c.get("id") or c.get("_id") for c in _extract_items(list_a.json())]
        assert customer_id in a_ids

        # Tenant B must NOT see tenant A's customer
        list_b = api_client.get(f"{API}/customers", headers={"Authorization": f"Bearer {token_b}"})
        assert list_b.status_code == 200, list_b.text
        b_ids = [c.get("id") or c.get("_id") for c in _extract_items(list_b.json())]
        assert customer_id not in b_ids, "CRITICAL: Tenant isolation broken - Tenant B can see Tenant A's customer"


class TestUnauthenticatedBoundary:
    @pytest.mark.parametrize("endpoint", ["/customers", "/orders", "/tenant"])
    def test_protected_endpoints_require_auth(self, api_client, endpoint):
        resp = api_client.get(f"{API}{endpoint}")
        assert resp.status_code == 401, f"{endpoint} returned {resp.status_code} instead of 401"
        assert "authentication required" in resp.json().get("detail", "").lower()


class TestModuleSmoke:
    @pytest.fixture
    def auth_token(self, api_client):
        email = unique_email("smoke")
        reg = api_client.post(f"{API}/auth/register", json={
            "email": email, "password": "StrongPass123!", "full_name": f"Smoke User {uuid.uuid4().hex[:6]}",
        })
        assert reg.status_code == 201, reg.text
        return reg.json()["access_token"]

    def test_customers_list_after_auth(self, api_client, auth_token):
        resp = api_client.get(f"{API}/customers", headers={"Authorization": f"Bearer {auth_token}"})
        assert resp.status_code == 200, resp.text

    def test_orders_list_after_auth(self, api_client, auth_token):
        resp = api_client.get(f"{API}/orders", headers={"Authorization": f"Bearer {auth_token}"})
        assert resp.status_code == 200, resp.text

    def test_tenant_after_auth(self, api_client, auth_token):
        resp = api_client.get(f"{API}/tenant", headers={"Authorization": f"Bearer {auth_token}"})
        assert resp.status_code == 200, resp.text

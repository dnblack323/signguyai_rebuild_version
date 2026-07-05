"""Shared runtime dependencies for the rebuild.

Route modules deliberately do not create database clients. This mirrors the
main SignGuyAI architecture and keeps tenant/runtime concerns in one place.
"""

import base64
import hashlib
import hmac
import json
import os
import time
from functools import lru_cache

from fastapi import Depends, Header, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorClient

try:
    from .models.access import RuntimeIdentityContext, identity_has_permission, role_permissions
except ImportError:
    from models.access import RuntimeIdentityContext, identity_has_permission, role_permissions


MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME")

if not MONGO_URL or not DB_NAME:
    raise RuntimeError("Missing required environment variables: MONGO_URL and DB_NAME must be set.")

PREVIEW_TENANT_ID = "preview-shop"
PREVIEW_USER_ID = "preview-user"
SUPPORTED_JWT_ALGORITHM = "HS256"


@lru_cache(maxsize=1)
def get_mongo_client() -> AsyncIOMotorClient:
    return AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=2500)


def get_database():
    return get_mongo_client()[DB_NAME]


def auth_mode() -> str:
    return os.getenv("SIGNGUYAI_AUTH_MODE", "preview").strip().lower() or "preview"


def jwt_secret() -> str:
    return os.getenv("JWT_SECRET_KEY") or os.getenv("SIGNGUYAI_JWT_SECRET") or "signguyai-local-preview-secret"


def _decode_base64url(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def _encode_base64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode()


def encode_bearer_token(claims: dict, expires_in_seconds: int = 86400) -> str:
    payload = dict(claims)
    payload.setdefault("exp", int(time.time()) + expires_in_seconds)
    header_value = _encode_base64url(
        json.dumps(
            {"alg": SUPPORTED_JWT_ALGORITHM, "typ": "JWT"},
            separators=(",", ":"),
            sort_keys=True,
        ).encode()
    )
    payload_value = _encode_base64url(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode())
    signature = hmac.new(jwt_secret().encode(), f"{header_value}.{payload_value}".encode(), hashlib.sha256).digest()
    return f"{header_value}.{payload_value}.{_encode_base64url(signature)}"


def decode_bearer_claims(token: str) -> dict:
    try:
        header_value, payload_value, signature_value = token.split(".")
        header = json.loads(_decode_base64url(header_value))
        if header.get("alg") != SUPPORTED_JWT_ALGORITHM:
            raise ValueError("Unsupported token algorithm")
        signing_input = f"{header_value}.{payload_value}".encode()
        expected = hmac.new(jwt_secret().encode(), signing_input, hashlib.sha256).digest()
        actual = _decode_base64url(signature_value)
        if not hmac.compare_digest(expected, actual):
            raise ValueError("Invalid token signature")
        claims = json.loads(_decode_base64url(payload_value))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token") from exc

    expires_at = claims.get("exp")
    if expires_at is not None and float(expires_at) < time.time():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication token expired")
    return claims


def _bearer_token(authorization: str | None) -> str:
    if not authorization:
        return ""
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization header")
    return token.strip()


def context_from_claims(claims: dict) -> RuntimeIdentityContext:
    tenant_id = str(claims.get("tenant_id") or claims.get("tenantId") or "").strip()
    user_id = str(claims.get("sub") or claims.get("user_id") or claims.get("userId") or "").strip()
    role = str(claims.get("role") or "").strip()
    if not tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant claim is required")
    if not user_id or not role:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User and role claims are required")
    permissions = claims.get("permissions")
    if not isinstance(permissions, list):
        permissions = role_permissions(role)
    return RuntimeIdentityContext(
        tenant_id=tenant_id,
        user_id=user_id,
        role=role,
        permissions=[str(permission) for permission in permissions],
        email=str(claims.get("email") or ""),
        auth_source="bearer",
        impersonating=bool(claims.get("impersonating", False)),
        platform_admin_id=str(claims.get("platform_admin_id") or ""),
        claims=claims,
    )


def preview_context(x_tenant_id: str | None = None, x_actor_id: str | None = None) -> RuntimeIdentityContext:
    tenant_id = (x_tenant_id or "").strip() or PREVIEW_TENANT_ID
    actor_id = (x_actor_id or "").strip() or PREVIEW_USER_ID
    return RuntimeIdentityContext(
        tenant_id=tenant_id,
        user_id=actor_id,
        role="owner",
        permissions=role_permissions("owner"),
        auth_source="preview",
    )


async def get_identity_context(
    authorization: str | None = Header(default=None),
    x_tenant_id: str | None = Header(default=None),
    x_actor_id: str | None = Header(default=None),
) -> RuntimeIdentityContext:
    token = _bearer_token(authorization)
    if token:
        return context_from_claims(decode_bearer_claims(token))
    if auth_mode() == "enforced":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return preview_context(x_tenant_id=x_tenant_id, x_actor_id=x_actor_id)


async def get_tenant_id(
    authorization: str | None = Header(default=None),
    x_tenant_id: str | None = Header(default=None),
    x_actor_id: str | None = Header(default=None),
) -> str:
    context = await get_identity_context(authorization=authorization, x_tenant_id=x_tenant_id, x_actor_id=x_actor_id)
    return context.tenant_id


def has_permission(user: dict, permission: str) -> bool:
    return identity_has_permission(user, permission)


def require_permission(permission: str):
    async def dependency(context: RuntimeIdentityContext = Depends(get_identity_context)) -> RuntimeIdentityContext:
        if not identity_has_permission(context, permission):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")
        return context

    return dependency


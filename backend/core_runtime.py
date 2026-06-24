"""Shared runtime dependencies for the rebuild.

Route modules deliberately do not create database clients. This mirrors the
main SignGuyAI architecture and keeps tenant/runtime concerns in one place.
"""

import os
from functools import lru_cache

from fastapi import Header
from motor.motor_asyncio import AsyncIOMotorClient


MONGO_URL = os.getenv("MONGO_URL", "mongodb://127.0.0.1:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "signguyai_rebuild")


@lru_cache(maxsize=1)
def get_mongo_client() -> AsyncIOMotorClient:
    return AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=2500)


def get_database():
    return get_mongo_client()[MONGO_DB_NAME]


async def get_tenant_id(x_tenant_id: str = Header(default="preview-shop")) -> str:
    """Preview-safe tenant dependency; replace with authenticated claims later."""
    return x_tenant_id.strip() or "preview-shop"


def has_permission(user: dict, permission: str) -> bool:
    if user.get("role") in {"platform_creator", "platform_admin", "owner"}:
        return True
    return permission in user.get("permissions", [])


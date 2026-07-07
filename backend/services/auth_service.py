import hashlib
import os
import secrets

import bcrypt
from fastapi import HTTPException, status

try:
    from ..core_runtime import encode_bearer_token
    from ..models.access import role_permissions
    from ..repositories.tenants import TenantRepository
    from ..repositories.users import UserRepository
    from ..shared.dates import utc_now
    from ..shared.ids import new_id
except ImportError:
    from core_runtime import encode_bearer_token
    from models.access import role_permissions
    from repositories.tenants import TenantRepository
    from repositories.users import UserRepository
    from shared.dates import utc_now
    from shared.ids import new_id


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, AttributeError):
        return False


def _issue_token(user: dict, expires_in_seconds: int) -> tuple[str, list[str]]:
    permissions = role_permissions(user["role"])
    claims = {
        "sub": user["id"],
        "tenant_id": user["tenant_id"],
        "role": user["role"],
        "email": user["email"],
        "permissions": permissions,
    }
    token = encode_bearer_token(claims, expires_in_seconds=expires_in_seconds)
    return token, permissions


async def register_account(database, *, email: str, password: str, full_name: str, company_name: str) -> dict:
    user_repo = UserRepository(database)
    tenant_repo = TenantRepository(database)
    await user_repo.ensure_indexes()
    await tenant_repo.ensure_indexes()

    normalized_email = email.lower().strip()
    if await user_repo.find_by_email(normalized_email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An account with this email already exists")

    tenant_id = new_id()
    await tenant_repo.upsert_current(
        tenant_id,
        {"name": company_name.strip() or full_name.strip(), "owner_email": normalized_email},
        actor_id="registration",
    )
    user = await user_repo.create(
        tenant_id=tenant_id,
        email=normalized_email,
        password_hash=hash_password(password),
        full_name=full_name.strip(),
        role="owner",
    )
    token, permissions = _issue_token(user, expires_in_seconds=86400)
    return {"token": token, "expires_in_seconds": 86400, "user": user, "permissions": permissions}


async def login(database, *, email: str, password: str, remember_me: bool) -> dict:
    user_repo = UserRepository(database)
    await user_repo.ensure_indexes()
    normalized_email = email.lower().strip()

    if await user_repo.is_locked_out(normalized_email):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Please try again in 15 minutes.",
        )

    user = await user_repo.find_by_email(normalized_email)
    if not user or not verify_password(password, user["password_hash"]):
        await user_repo.record_failed_attempt(normalized_email)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if not user.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This account has been disabled")

    await user_repo.clear_failed_attempts(normalized_email)
    expires_in_seconds = 60 * 60 * 24 * 30 if remember_me else 60 * 60 * 24
    token, permissions = _issue_token(user, expires_in_seconds)
    return {"token": token, "expires_in_seconds": expires_in_seconds, "user": user, "permissions": permissions}


async def forgot_password(database, *, email: str) -> None:
    user_repo = UserRepository(database)
    await user_repo.ensure_indexes()
    user = await user_repo.find_by_email(email.lower().strip())
    if not user:
        return
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    await user_repo.create_reset_token(user["id"], token_hash)
    frontend_url = os.environ.get("FRONTEND_URL", "")
    print(f"[password-reset] Reset link for {user['email']}: {frontend_url}/reset-password?token={raw_token}")


async def reset_password(database, *, token: str, new_password: str) -> None:
    user_repo = UserRepository(database)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    record = await user_repo.find_reset_token(token_hash)
    expired = bool(record) and record["expires_at"].replace(tzinfo=None) < utc_now().replace(tzinfo=None)
    if not record or record.get("used") or expired:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset link is invalid or has already been used",
        )
    await user_repo.update_password(record["user_id"], hash_password(new_password))
    await user_repo.mark_reset_token_used(token_hash)

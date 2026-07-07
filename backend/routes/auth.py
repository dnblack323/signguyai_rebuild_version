import os
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import Field

try:
    from ..core_runtime import auth_mode, encode_bearer_token, get_database, get_identity_context
    from ..models.access import RuntimeIdentityContext, role_permissions
    from ..models.base import StrictBaseModel
    from ..services import auth_service
except ImportError:
    from core_runtime import auth_mode, encode_bearer_token, get_database, get_identity_context
    from models.access import RuntimeIdentityContext, role_permissions
    from models.base import StrictBaseModel
    from services import auth_service


auth_router = APIRouter(prefix="/auth", tags=["Auth"])
users_router = APIRouter(prefix="/users", tags=["Users"])


class IdentityResponse(StrictBaseModel):
    tenant_id: str
    user_id: str
    role: str
    permissions: list[str] = Field(default_factory=list)
    email: str = ""
    auth_source: Literal["bearer", "preview"]
    impersonating: bool = False
    platform_admin_id: str = ""


class PermissionsResponse(StrictBaseModel):
    role: str
    permissions: list[str] = Field(default_factory=list)


class DevTokenRequest(StrictBaseModel):
    tenant_id: str = "preview-shop"
    user_id: str = "preview-user"
    role: str = "owner"
    email: str = ""
    expires_in_seconds: int = Field(default=86400, ge=60, le=60 * 60 * 24 * 30)


class DevTokenResponse(StrictBaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_seconds: int
    identity: IdentityResponse


class RegisterRequest(StrictBaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1)
    company_name: str = ""


class LoginRequest(StrictBaseModel):
    email: str
    password: str
    remember_me: bool = False


class ForgotPasswordRequest(StrictBaseModel):
    email: str


class ResetPasswordRequest(StrictBaseModel):
    token: str
    new_password: str = Field(min_length=8)


class MessageResponse(StrictBaseModel):
    message: str


class AuthResponse(StrictBaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_seconds: int
    identity: IdentityResponse


def _identity_response(context: RuntimeIdentityContext) -> IdentityResponse:
    return IdentityResponse(
        tenant_id=context.tenant_id,
        user_id=context.user_id,
        role=context.role,
        permissions=list(context.permissions),
        email=context.email,
        auth_source=context.auth_source,
        impersonating=context.impersonating,
        platform_admin_id=context.platform_admin_id,
    )


def _auth_response(result: dict) -> AuthResponse:
    user = result["user"]
    identity = IdentityResponse(
        tenant_id=user["tenant_id"],
        user_id=user["id"],
        role=user["role"],
        permissions=result["permissions"],
        email=user["email"],
        auth_source="bearer",
    )
    return AuthResponse(access_token=result["token"], expires_in_seconds=result["expires_in_seconds"], identity=identity)


@auth_router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register_account(payload: RegisterRequest) -> AuthResponse:
    result = await auth_service.register_account(
        get_database(),
        email=payload.email,
        password=payload.password,
        full_name=payload.full_name,
        company_name=payload.company_name,
    )
    return _auth_response(result)


@auth_router.post("/login", response_model=AuthResponse)
async def login_account(payload: LoginRequest) -> AuthResponse:
    result = await auth_service.login(
        get_database(),
        email=payload.email,
        password=payload.password,
        remember_me=payload.remember_me,
    )
    return _auth_response(result)


@auth_router.post("/logout", response_model=MessageResponse)
async def logout_account() -> MessageResponse:
    return MessageResponse(message="Logged out")


@auth_router.post("/forgot-password", response_model=MessageResponse)
async def request_password_reset(payload: ForgotPasswordRequest) -> MessageResponse:
    await auth_service.forgot_password(get_database(), email=payload.email)
    return MessageResponse(message="If an account exists for this email, a reset link has been sent.")


@auth_router.post("/reset-password", response_model=MessageResponse)
async def complete_password_reset(payload: ResetPasswordRequest) -> MessageResponse:
    await auth_service.reset_password(get_database(), token=payload.token, new_password=payload.new_password)
    return MessageResponse(message="Password has been reset. You can now log in.")


@auth_router.get("/me", response_model=IdentityResponse)
@users_router.get("/me", response_model=IdentityResponse)
async def current_identity(context: RuntimeIdentityContext = Depends(get_identity_context)) -> IdentityResponse:
    return _identity_response(context)


@auth_router.get("/permissions", response_model=PermissionsResponse)
@users_router.get("/me/permissions", response_model=PermissionsResponse)
async def current_permissions(context: RuntimeIdentityContext = Depends(get_identity_context)) -> PermissionsResponse:
    return PermissionsResponse(role=context.role, permissions=list(context.permissions))


@auth_router.post("/dev-token", response_model=DevTokenResponse, status_code=status.HTTP_201_CREATED)
async def create_dev_token(payload: DevTokenRequest) -> DevTokenResponse:
    dev_auth_enabled = os.getenv("SIGNGUYAI_ENABLE_DEV_AUTH", "").strip().lower() in {"1", "true", "yes", "on"}
    if auth_mode() == "enforced" and not dev_auth_enabled:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Dev auth is disabled")

    permissions = role_permissions(payload.role)
    claims = {
        "sub": payload.user_id,
        "tenant_id": payload.tenant_id,
        "role": payload.role,
        "permissions": permissions,
    }
    if payload.email:
        claims["email"] = payload.email
    access_token = encode_bearer_token(claims, expires_in_seconds=payload.expires_in_seconds)
    identity = IdentityResponse(
        tenant_id=payload.tenant_id,
        user_id=payload.user_id,
        role=payload.role,
        permissions=permissions,
        email=payload.email,
        auth_source="bearer",
    )
    return DevTokenResponse(
        access_token=access_token,
        expires_in_seconds=payload.expires_in_seconds,
        identity=identity,
    )

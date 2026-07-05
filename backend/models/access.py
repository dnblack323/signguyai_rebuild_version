from enum import StrEnum
from typing import Any

from pydantic import Field

try:
    from .base import StrictBaseModel
except ImportError:
    from models.base import StrictBaseModel


class UserRole(StrEnum):
    PLATFORM_CREATOR = "platform_creator"
    PLATFORM_ADMIN = "platform_admin"
    OWNER = "owner"
    ADMIN = "admin"
    STAFF = "staff"
    WEBSTORE_OWNER = "webstore_owner"


class Permission(StrEnum):
    CUSTOMERS_VIEW = "customers:view"
    CUSTOMERS_CREATE = "customers:create"
    CUSTOMERS_EDIT = "customers:edit"
    CUSTOMERS_DELETE = "customers:delete"
    QUOTES_VIEW = "quotes:view"
    QUOTES_CREATE = "quotes:create"
    QUOTES_EDIT = "quotes:edit"
    QUOTES_DELETE = "quotes:delete"
    QUOTES_CONVERT = "quotes:convert"
    ORDERS_VIEW = "orders:view"
    ORDERS_CREATE = "orders:create"
    ORDERS_EDIT = "orders:edit"
    ORDERS_DELETE = "orders:delete"
    INVOICES_VIEW = "invoices:view"
    INVOICES_CREATE = "invoices:create"
    INVOICES_EDIT = "invoices:edit"
    INVOICES_DELETE = "invoices:delete"
    TIME_OWN = "time:own"
    TIME_VIEW_ALL = "time:view_all"
    TIME_MANAGE = "time:manage"
    PAYROLL_VIEW = "payroll:view"
    PAYROLL_MANAGE = "payroll:manage"
    EMPLOYEES_VIEW = "employees:view"
    EMPLOYEES_MANAGE = "employees:manage"
    FINANCIALS_VIEW = "financials:view"
    FINANCIALS_MANAGE = "financials:manage"
    USERS_VIEW = "users:view"
    USERS_MANAGE = "users:manage"
    SETTINGS_VIEW = "settings:view"
    SETTINGS_MANAGE = "settings:manage"
    ACTIVITY_VIEW = "activity:view"
    FILES_VIEW = "files:view"
    FILES_UPLOAD = "files:upload"
    FILES_MANAGE = "files:manage"
    EMAIL_ACTIVITY_VIEW = "email_activity:view"
    EMAIL_MANAGE = "email:manage"
    NOTIFICATIONS_VIEW = "notifications:view"
    NOTIFICATIONS_MANAGE = "notifications:manage"
    WEBSTORES_VIEW = "webstores:view"
    WEBSTORES_CREATE = "webstores:create"
    WEBSTORES_MANAGE = "webstores:manage"
    PRODUCTS_VIEW = "products:view"
    PRODUCTS_CREATE = "products:create"
    PRODUCTS_MANAGE = "products:manage"
    INVENTORY_VIEW = "inventory:view"
    INVENTORY_PULL = "inventory:pull"
    INVENTORY_ADJUST = "inventory:adjust"
    PURCHASING_MANAGE = "purchasing:manage"
    PURCHASING_APPROVE = "purchasing:approve"
    VENDORS_MANAGE = "vendors:manage"
    PLATFORM_ADMIN_ACCESS = "platform_admin:access"
    PLATFORM_ADMIN_IMPERSONATE = "platform_admin:impersonate"


PLATFORM_BYPASS_ROLES = {
    UserRole.PLATFORM_CREATOR.value,
    UserRole.PLATFORM_ADMIN.value,
    UserRole.OWNER.value,
}

ALL_PERMISSIONS = [permission.value for permission in Permission]

ROLE_PERMISSIONS: dict[str, list[str]] = {
    UserRole.PLATFORM_CREATOR.value: ALL_PERMISSIONS,
    UserRole.PLATFORM_ADMIN.value: ALL_PERMISSIONS,
    UserRole.OWNER.value: ALL_PERMISSIONS,
    UserRole.ADMIN.value: [
        Permission.CUSTOMERS_VIEW,
        Permission.CUSTOMERS_CREATE,
        Permission.CUSTOMERS_EDIT,
        Permission.QUOTES_VIEW,
        Permission.QUOTES_CREATE,
        Permission.QUOTES_EDIT,
        Permission.QUOTES_CONVERT,
        Permission.ORDERS_VIEW,
        Permission.ORDERS_CREATE,
        Permission.ORDERS_EDIT,
        Permission.INVOICES_VIEW,
        Permission.INVOICES_CREATE,
        Permission.INVOICES_EDIT,
        Permission.TIME_VIEW_ALL,
        Permission.TIME_MANAGE,
        Permission.EMPLOYEES_VIEW,
        Permission.FINANCIALS_VIEW,
        Permission.USERS_VIEW,
        Permission.SETTINGS_VIEW,
        Permission.ACTIVITY_VIEW,
        Permission.FILES_VIEW,
        Permission.FILES_UPLOAD,
        Permission.FILES_MANAGE,
        Permission.EMAIL_ACTIVITY_VIEW,
        Permission.EMAIL_MANAGE,
        Permission.NOTIFICATIONS_VIEW,
        Permission.NOTIFICATIONS_MANAGE,
        Permission.WEBSTORES_VIEW,
        Permission.WEBSTORES_CREATE,
        Permission.WEBSTORES_MANAGE,
        Permission.PRODUCTS_VIEW,
        Permission.PRODUCTS_CREATE,
        Permission.PRODUCTS_MANAGE,
        Permission.INVENTORY_VIEW,
        Permission.INVENTORY_PULL,
        Permission.INVENTORY_ADJUST,
        Permission.PURCHASING_MANAGE,
        Permission.VENDORS_MANAGE,
    ],
    UserRole.STAFF.value: [
        Permission.CUSTOMERS_VIEW,
        Permission.QUOTES_VIEW,
        Permission.ORDERS_VIEW,
        Permission.INVOICES_VIEW,
        Permission.TIME_OWN,
        Permission.EMPLOYEES_VIEW,
        Permission.FILES_VIEW,
        Permission.FILES_UPLOAD,
        Permission.NOTIFICATIONS_VIEW,
        Permission.PRODUCTS_VIEW,
        Permission.INVENTORY_VIEW,
        Permission.INVENTORY_PULL,
    ],
    UserRole.WEBSTORE_OWNER.value: [],
}

ROLE_PERMISSIONS = {
    role: [permission.value if isinstance(permission, Permission) else permission for permission in permissions]
    for role, permissions in ROLE_PERMISSIONS.items()
}


class RuntimeIdentityContext(StrictBaseModel):
    tenant_id: str
    user_id: str
    role: str
    permissions: list[str] = Field(default_factory=list)
    email: str = ""
    auth_source: str = "preview"
    impersonating: bool = False
    platform_admin_id: str = ""
    claims: dict[str, Any] = Field(default_factory=dict)


def role_permissions(role: str) -> list[str]:
    return list(ROLE_PERMISSIONS.get(role, []))


def role_has_permission(role: str, permission: str) -> bool:
    if role in PLATFORM_BYPASS_ROLES:
        return True
    return permission in ROLE_PERMISSIONS.get(role, [])


def identity_has_permission(identity: RuntimeIdentityContext | dict[str, Any], permission: str) -> bool:
    if isinstance(identity, RuntimeIdentityContext):
        role = identity.role
        permissions = identity.permissions
    else:
        role = str(identity.get("role", ""))
        permissions = identity.get("permissions", [])
    if role in PLATFORM_BYPASS_ROLES:
        return True
    return permission in permissions or role_has_permission(role, permission)

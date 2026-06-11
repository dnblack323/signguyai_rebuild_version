"""Shared runtime dependencies.

Database, authentication, permission, and tenant helpers belong here as the
rebuild progresses. Route modules must not create their own runtime clients.
"""


def has_permission(user: dict, permission: str) -> bool:
    if user.get("role") in {"platform_creator", "platform_admin", "owner"}:
        return True
    return permission in user.get("permissions", [])


def get_health():
    return {
        "status": "healthy",
        "release": "webstores-foundation-preview",
        "architecture": "controlling-spec-modular-shell",
    }


def get_release():
    return {
        "name": "Webstores Foundation Preview",
        "workspaces": ["operations", "business", "productivity", "ai-hub", "settings"],
        "active_capabilities": [
            "reusable-action-ribbon",
            "single-call-dashboard-digest",
            "global-search",
            "global-create",
            "notifications",
            "module-registry",
            "webstores-management",
            "webstores-entitlement-gates",
            "webstores-standalone-shell",
        ],
    }

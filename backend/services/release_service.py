def get_health():
    return {
        "status": "healthy",
        "release": "preview-2",
        "architecture": "day-1-structured-shell",
    }


def get_release():
    return {
        "name": "Day 1 Structured Preview",
        "workspaces": ["operations", "business", "productivity", "ai-hub"],
        "active_capabilities": [
            "reusable-action-ribbon",
            "single-call-dashboard-digest",
            "global-search",
            "global-create",
            "notifications",
            "module-registry",
        ],
    }


import os

try:
    from ..shared.dates import utc_now
    from ..shared.ids import new_id
    from ..shared.indexes import ensure_collection_indexes
except ImportError:
    from shared.dates import utc_now
    from shared.ids import new_id
    from shared.indexes import ensure_collection_indexes


class PlatformAdminRepository:
    collections = ("tenants", "platform_admin_audit_events")

    def __init__(self, database):
        self.database = database
        self.tenants = database["tenants"]
        self.audit_events = database["platform_admin_audit_events"]
        self.pricing_foundations = database["pricing_foundations"]
        self.feature_entitlements = database["feature_entitlements"]

    async def ensure_indexes(self):
        for collection_name in self.collections:
            await ensure_collection_indexes(self.database[collection_name], collection_name)

    async def list_tenants(self, search: str = "", status: str = "", limit: int = 200) -> list[dict]:
        cursor = self.tenants.find({}).sort("updated_at", -1).limit(limit)
        rows = [self._public(row) for row in await cursor.to_list(length=limit)]
        if status:
            rows = [row for row in rows if row.get("account_status") == status or row.get("billing_status") == status]
        if search:
            needle = search.lower()
            rows = [
                row for row in rows
                if needle in " ".join(str(row.get(key, "")) for key in ("tenant_id", "name", "slug", "owner_email")).lower()
            ]
        return rows

    async def get_tenant(self, tenant_id: str) -> dict | None:
        document = await self.tenants.find_one({"tenant_id": tenant_id})
        return self._public(document) if document else None

    async def update_tenant_status(self, tenant_id: str, patch: dict, actor_context) -> dict | None:
        existing = await self.tenants.find_one({"tenant_id": tenant_id})
        if not existing:
            return None
        now = utc_now()
        safe_patch = {
            key: value for key, value in patch.items()
            if key in {"account_status", "billing_status", "suspension_reason", "maintenance_banner", "metadata"} and value is not None
        }
        updated = {
            **existing,
            **safe_patch,
            "updated_at": now,
            "updated_by": actor_context.user_id,
            "version": int(existing.get("version", 1)) + 1,
        }
        if safe_patch.get("account_status") == "suspended" and not updated.get("suspended_at"):
            updated["suspended_at"] = now
        if safe_patch.get("account_status") and safe_patch.get("account_status") != "suspended":
            updated["suspended_at"] = None
            updated["suspension_reason"] = safe_patch.get("suspension_reason", "")
        await self.tenants.replace_one({"tenant_id": tenant_id}, updated)
        await self.record_audit_event(
            "tenant.status.updated",
            tenant_id,
            actor_context,
            {
                "before": {
                    "account_status": existing.get("account_status"),
                    "billing_status": existing.get("billing_status"),
                },
                "after": {
                    "account_status": updated.get("account_status"),
                    "billing_status": updated.get("billing_status"),
                },
                "fields": sorted(safe_patch.keys()),
            },
        )
        return self._public(updated)

    async def record_audit_event(self, action: str, target_tenant_id: str, actor_context, metadata: dict | None = None) -> dict:
        now = utc_now()
        document = {
            "id": new_id(),
            "action": action,
            "target_tenant_id": target_tenant_id,
            "actor_id": actor_context.user_id,
            "actor_email": actor_context.email,
            "actor_role": actor_context.role,
            "metadata": metadata or {},
            "created_at": now,
            "updated_at": now,
            "version": 1,
        }
        await self.audit_events.insert_one(document.copy())
        return self._public(document)

    async def list_audit_events(self, target_tenant_id: str = "", limit: int = 100) -> list[dict]:
        query = {"target_tenant_id": target_tenant_id} if target_tenant_id else {}
        cursor = self.audit_events.find(query).sort("created_at", -1).limit(limit)
        return [self._public(row) for row in await cursor.to_list(length=limit)]

    async def tenant_readiness(self, tenant_id: str) -> dict | None:
        tenant = await self.tenants.find_one({"tenant_id": tenant_id})
        if not tenant:
            return None
        pricing = await self.pricing_foundations.find_one({"tenant_id": tenant_id, "key": "default"})
        entitlement_cursor = self.feature_entitlements.find({"tenant_id": tenant_id}).limit(200)
        entitlements = await entitlement_cursor.to_list(length=200)
        checks = [
            self._check("tenant_profile", "Tenant profile exists", bool(tenant.get("name")), f"Tenant name: {tenant.get('name') or 'missing'}"),
            self._check("account_status", "Account is active or trialing", tenant.get("account_status") in {"active", "trialing"}, f"Account status: {tenant.get('account_status') or 'missing'}"),
            self._check("billing_status", "Billing is current or trialing", tenant.get("billing_status") in {"current", "trialing"}, f"Billing status: {tenant.get('billing_status') or 'missing'}"),
            self._check("pricing_foundation", "Pricing foundation saved", bool(pricing and pricing.get("settings")), "Pricing settings are present" if pricing else "Pricing foundation missing"),
            self._check("feature_entitlements", "Feature entitlements configured", bool(entitlements), f"{len(entitlements)} entitlement record(s) found"),
            self._check("object_storage", "Object storage configured", self._storage_configured(), "Configured" if self._storage_configured() else "Using local/default storage configuration"),
            self._check("email_provider", "SendGrid configured", bool(os.getenv("SENDGRID_API_KEY")), "Configured" if os.getenv("SENDGRID_API_KEY") else "SENDGRID_API_KEY is missing"),
        ]
        return {
            "tenant_id": tenant_id,
            "can_launch": all(check["passed"] for check in checks if check["severity"] == "blocker"),
            "checks": checks,
        }

    def _public(self, document: dict) -> dict:
        return {key: value for key, value in document.items() if key != "_id"}

    def _check(self, key: str, label: str, passed: bool, detail: str, severity: str = "blocker") -> dict:
        return {"key": key, "label": label, "passed": passed, "severity": severity, "detail": detail}

    def _storage_configured(self) -> bool:
        return any(os.getenv(key) for key in ("DOCULINK_OBJECT_STORAGE_ROOT", "S3_BUCKET", "EMERGENT_OBJECT_STORAGE_BUCKET"))

<!-- METADATA -->

```yaml
task: Add Platform Admin readiness endpoint
status: done
priority: 10
dep: []
assignee: ""
requiresHumanReview: false
expiresAt: null
```

<!-- DESCRIPTION -->

Add a platform-admin-only readiness endpoint for a tenant. The endpoint should report clear pass/fail checks based on current tenant data and environment configuration only.

<!-- ACCEPTANCE -->

## Acceptance criteria

- [x] Platform admin can read tenant readiness for a specific tenant.
- [x] Non-platform roles cannot read tenant readiness.
- [x] Readiness includes tenant profile, account status, billing status, pricing foundation, entitlements, object storage config, and email provider config.
- [x] Missing tenant returns 404.
- [x] No login, checkout, webhook, or impersonation behavior is added.

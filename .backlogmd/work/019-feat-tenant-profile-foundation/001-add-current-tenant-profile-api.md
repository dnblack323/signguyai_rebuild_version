<!-- METADATA -->

```yaml
task: Add current tenant profile API
status: done
priority: 10
dep: []
assignee: ""
requiresHumanReview: false
expiresAt: null
```

<!-- DESCRIPTION -->

Add `GET /api/tenant` and `PUT /api/tenant` for the current runtime tenant. Reads and writes must scope to the caller's own tenant ID, write through the shared tenants collection used by Platform Admin, and record tenant-scoped activity on updates.

<!-- ACCEPTANCE -->

## Acceptance criteria

- [x] Current tenant can read its own tenant profile.
- [x] Owner/platform roles can update only their own tenant profile.
- [x] Admin/staff cannot update tenant profile.
- [x] Tenant profile updates create activity/audit events.
- [x] No login, registration, password, invitation, or user provisioning behavior is added.

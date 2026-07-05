<!-- METADATA -->

```yaml
task: Add Settings Configuration backend foundation
status: done
priority: 10
dep: []
assignee: ""
requiresHumanReview: false
expiresAt: null
```

<!-- DESCRIPTION -->

## Description

Add a tenant-scoped Settings Configuration model, repository, routes, and tests. The implementation should provide a reusable settings read/write boundary with backend-owned permission enforcement and last-changed metadata, without building any login or user-management flows.

<!-- ACCEPTANCE -->

## Acceptance criteria

- [x] Tenant settings are stored in one collection keyed by `tenant_id`, `namespace`, and `key`.
- [x] Settings read routes require `settings:view`; write routes require `settings:manage`.
- [x] Settings responses include `updated_by` and `updated_at` metadata and never expose Mongo `_id`.
- [x] Backend tests cover tenant scoping, owner writes, admin/staff permission denial, and response shape.
- [x] Backend compile, focused tests, full backend tests, frontend build, and diff checks pass.

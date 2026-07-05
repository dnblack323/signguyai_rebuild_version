<!-- METADATA -->

```yaml
task: Add Activity and Audit Trail backend foundation
status: done
priority: 10
dep: []
assignee: ""
requiresHumanReview: false
expiresAt: null
```

<!-- DESCRIPTION -->

## Description

Add a tenant-scoped audit event model, repository, service helper, and read route. Integrate Settings Configuration writes with the audit service so tenant configuration changes produce attributable activity events.

<!-- ACCEPTANCE -->

## Acceptance criteria

- [x] Audit events are stored in one collection keyed by `tenant_id` and event `id`.
- [x] Audit events include actor, module, entity, event type, summary, metadata, changes, and immutable timestamps.
- [x] `GET /api/activity/events` is tenant-scoped and requires an activity/audit view permission.
- [x] Settings writes create an audit event with the acting user id and setting namespace/key.
- [x] Backend tests cover tenant scoping, permission denial, response shape, and Settings audit integration.
- [x] Backend compile, focused tests, full backend tests, frontend build, and diff checks pass.

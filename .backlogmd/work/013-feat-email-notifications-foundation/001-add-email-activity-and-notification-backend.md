<!-- METADATA -->

```yaml
task: Add email activity and notification backend
status: done
priority: 10
dep: []
assignee: ""
requiresHumanReview: false
expiresAt: null
```

<!-- DESCRIPTION -->

Add backend models, repositories, routes, indexes, and tests for tenant-scoped email activity and shared notifications. Include a protected SendGrid-style webhook ingest route, but do not implement SMS/Twilio or module-specific email triggers in this task.

<!-- ACCEPTANCE -->

## Acceptance criteria

- [x] Tenant owners/admins can read tenant-scoped email activity without seeing other tenants.
- [x] Shared notification records support staff/customer recipients and read/archive state.
- [x] Staff can read their own staff notifications without broad tenant notification access.
- [x] Webhook ingest rejects unsigned payloads when a webhook secret is configured.
- [x] Email activity and notification writes create shared activity events.
- [x] Focused and full backend tests pass.

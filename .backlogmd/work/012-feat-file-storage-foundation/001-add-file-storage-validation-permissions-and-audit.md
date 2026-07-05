<!-- METADATA -->

```yaml
task: Add file storage validation, permissions, and audit
status: done
priority: 10
dep: []
assignee: ""
requiresHumanReview: false
expiresAt: null
```

<!-- DESCRIPTION -->

Add the cross-module file-storage safeguards required before deeper module imports. This task hardens DocuLink's file endpoints with explicit runtime permissions, shared upload validation, security-relevant activity events, and a safe customer-visible file-link flag.

<!-- ACCEPTANCE -->

## Acceptance criteria

- [x] Uploads use a shared validation path with file size, MIME allowlist, and basic content checks.
- [x] File upload/list/detail/download/link/share endpoints require explicit runtime permissions and tenant-scoped identity.
- [x] File uploads, downloads, links, and shares create activity events.
- [x] File links support an explicit `customer_visible` flag that defaults to false.
- [x] Regression tests cover validation, auth enforcement, tenant scoping, audit logging, and customer-visible link metadata.

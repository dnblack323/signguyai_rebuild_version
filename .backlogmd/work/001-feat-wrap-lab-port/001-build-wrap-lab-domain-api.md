<!-- METADATA -->

```yaml
task: Build Wrap Lab domain and API
status: done
priority: 10
dep: []
assignee: ""
requiresHumanReview: false
expiresAt: null
```

<!-- DESCRIPTION -->

Add tenant-scoped Mongo persistence, models, services, and FastAPI routes for projects and all nested Wrap Lab workflow data.

<!-- ACCEPTANCE -->

## Acceptance criteria

- [x] Mongo runtime is configured through environment variables
- [x] Project CRUD and workflow mutations are tenant scoped
- [x] Files, proofs, inspections, checklists, communication, signatures, portal state, and concept state persist
- [x] API regression tests cover the core workflow

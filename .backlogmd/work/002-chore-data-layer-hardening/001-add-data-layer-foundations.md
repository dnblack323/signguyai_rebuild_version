<!-- METADATA -->

```yaml
task: Add data layer foundations
status: done
priority: 10
dep: []
assignee: ""
requiresHumanReview: false
expiresAt: null
```

<!-- DESCRIPTION -->

## Description

Add shared backend helpers and update existing repositories/models to use blueprint-aligned primitives without breaking current screens.

<!-- ACCEPTANCE -->

## Acceptance criteria

- [x] Add UUIDv7-compatible ID generation helper.
- [x] Add strict tenant document base and preview envelope model boundaries.
- [x] Add money minor-unit helper.
- [x] Add central index manifest scaffolding.
- [x] Update current repositories to use shared IDs, dates, and manifest-defined indexes.
- [x] Run focused backend tests.

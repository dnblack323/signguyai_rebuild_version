<!-- METADATA -->

```yaml
task: Normalize current area child records
status: done
priority: 10
dep: []
assignee: ""
requiresHumanReview: false
expiresAt: null
```

<!-- DESCRIPTION -->

## Description

Move remaining mutable child data from current areas into tenant-scoped child-record collections: Wrap Lab mockup studio arrays, community replies/upvotes, note tags, and customer tags/notes.

<!-- ACCEPTANCE -->

## Acceptance criteria

- [x] Normalize Wrap Lab mockup studio assets, concepts, and activity.
- [x] Normalize community replies and upvote membership.
- [x] Normalize shared note tags.
- [x] Normalize customer tags and note summaries.
- [x] Preserve existing frontend response shapes through hydration.
- [x] Add regression tests.
- [x] Run backend tests.

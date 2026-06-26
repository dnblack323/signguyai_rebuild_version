<!-- METADATA -->

```yaml
task: Build DocuLink phase one
status: done
priority: 10
dep: []
assignee: ""
requiresHumanReview: false
expiresAt: null
```

<!-- DESCRIPTION -->

## Description

Create the DocuLink backend models, repositories, secure upload/download flow, route set, Wrap Lab bridge methods, and basic Documents frontend shell.

<!-- ACCEPTANCE -->

## Acceptance criteria

- [x] Add backend models and repositories for files, documents, links, shares, activities, and template placeholders.
- [x] Add tenant-scoped indexes and lifecycle constants.
- [x] Add local object-storage adapter that stores binary files outside MongoDB.
- [x] Add controlled download endpoint that does not expose raw object paths.
- [x] Add upload, document, link, share, and activity API routes under `/api/doculink`.
- [x] Add Wrap Lab bridge service methods.
- [x] Add Documents / DocuLink frontend shell with lists, filters, detail, upload, create, and link actions.
- [x] Add backend and frontend-relevant tests for tenant isolation, linking, download, audit activity, and Wrap Lab bridge.

<!-- METADATA -->

```yaml
work: Build File Uploads and Storage foundation
status: done
assignee: ""
```

<!-- DESCRIPTION -->

Close the Phase/Foundation file-storage gaps that are not tied to a later module import: shared upload validation, explicit file permissions, tenant-scoped authenticated file retrieval, customer-visible attachment metadata, and activity/audit events for security-relevant file actions.

<!-- CONTEXT -->

Implementation target is `C:\Users\thesi\Documents\GitHub\signguyai_rebuild_version`. The source rebuild doc is `FILE_UPLOADS_ATTACHMENTS_STORAGE_REBUILD_DOC.md`. Do not copy vulnerable original-app file retrieval patterns. Every file retrieval must require runtime identity and tenant-scoped lookup. Keep binary bytes out of MongoDB; object storage owns file bytes and Mongo stores metadata only. Customer/portal exposure must be explicit and default to false.

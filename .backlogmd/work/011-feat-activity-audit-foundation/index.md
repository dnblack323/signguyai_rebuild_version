<!-- METADATA -->

```yaml
work: Build Activity and Audit Trail foundation
status: done
assignee: ""
```

<!-- DESCRIPTION -->

Create the shared tenant-scoped activity/audit foundation that modules can use to record who did what, when, and to which record.

<!-- CONTEXT -->

Implementation target is `C:\Users\thesi\Documents\GitHub\signguyai_rebuild_version`. Source doc is `ACTIVITY_LOG_AUDIT_TRAIL_SYSTEM_HISTORY_REBUILD_DOC.md`. This rebuild slice should not edit login, registration, password reset, or invitation flows. Build the reusable audit-event infrastructure first and wire one real producer, Settings writes, to prove the pattern.

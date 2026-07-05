<!-- METADATA -->

```yaml
work: Build Settings Configuration foundation
status: done
assignee: ""
```

<!-- DESCRIPTION -->

Create the shared tenant-scoped settings backend foundation that future settings screens and module specs can reuse instead of inventing independent storage and permission patterns.

<!-- CONTEXT -->

Implementation target is `C:\Users\thesi\Documents\GitHub\signguyai_rebuild_version`. Source doc is `SETTINGS_CONFIGURATION_FRAMEWORK_REBUILD_DOC.md`. Login, registration, invitations, and password flows are explicitly out of scope because the user wants Emergent to handle those. This slice should add backend contracts and tests only: one settings collection, shared permission dependency, last-changed metadata, and stable API routes future modules can call.

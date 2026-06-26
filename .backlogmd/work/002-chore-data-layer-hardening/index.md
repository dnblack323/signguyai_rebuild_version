<!-- METADATA -->

```yaml
work: Harden rebuilt data layer foundations
status: done
assignee: ""
```

<!-- DESCRIPTION -->

Align the current rebuild backend foundations with the Rebuilt Data Layer Blueprint before larger modules like orders, inventory, billing, and payroll are built on top.

<!-- CONTEXT -->

Implementation target is `C:\Users\thesi\Documents\GitHub\signguyai_rebuild_version`. Keep the original `signguyai` repository read-only. Preserve existing Wrap Lab and shared-system API compatibility while adding blueprint-aligned foundations: tenant-scoped documents, UUIDv7-style IDs, UTC datetimes, integer money helpers, and central index manifest scaffolding.

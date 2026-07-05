<!-- METADATA -->

```yaml
work: Build Tenant profile non-login foundation
status: done
assignee: ""
```

<!-- DESCRIPTION -->

Add the tenant/organization profile API that lets the current tenant read and update its own company record without implementing registration, login, or user provisioning.

<!-- CONTEXT -->

Implementation target is `C:\Users\thesi\Documents\GitHub\signguyai_rebuild_version`. The Tenants/Organizations spec says Tenant is the Organization in this app. The user asked Codex to hold off on creating logins and related account flows, so this item must not create registration, password, invitation, or user provisioning behavior.

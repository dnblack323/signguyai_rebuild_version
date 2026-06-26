<!-- METADATA -->

```yaml
work: Build DocuLink shared document foundation
status: done
assignee: ""
```

<!-- DESCRIPTION -->

Build Phase 1 of DocuLink: the shared document, file, template, approval, and record-linking system used by Customers, Orders, Quotes, Invoices, Wrap Lab, Webstores, portals, AI tools, and future modules.

<!-- CONTEXT -->

Implementation target is `C:\Users\thesi\Documents\GitHub\signguyai_rebuild_version`. Navigation label is Documents, page/module title is DocuLink, internal key is `doculink`, API prefix is `/api/doculink`. Do not store Base64 file data in MongoDB. Binary content must go through an object-storage adapter; Mongo stores metadata, links, shares, lifecycle state, and audit activities. Preserve existing Wrap Lab behavior.

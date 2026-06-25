<!-- METADATA -->

```yaml
work: Port Wrap Lab into the rebuild
status: in-progress
assignee: "/root"
```

<!-- DESCRIPTION -->

Rebuild the standalone Wrap Lab application inside signguyai_rebuild_version with its existing screens and behavior, backed by the rebuild React/FastAPI/Mongo architecture.

<!-- CONTEXT -->

The visual and functional source of truth is `C:\Users\thesi\Documents\GitHub\wraplab-ai`. The old `signguyai` Wrap Command Center is not a feature source; it is only an architectural reference for React, FastAPI, MongoDB, tenant isolation, routes, services, and models. The target branch is `codex/wrap-lab-port`, based on rebuild `main`.

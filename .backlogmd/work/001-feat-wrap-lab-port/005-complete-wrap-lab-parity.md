<!-- METADATA -->

```yaml
task: Complete Wrap Lab parity transfer
status: done
priority: 5
dep: ["work/001-feat-wrap-lab-port/004-embed-wrap-lab-in-rebuild-shell.md"]
assignee: ""
requiresHumanReview: false
expiresAt: null
```

<!-- DESCRIPTION -->

## Description

Close the feature gaps found after comparing the static `wraplab-ai` prototype against the React/FastAPI/Mongo rebuild implementation. Keep the rebuild architecture, shared customers, shell integration, and copied runtime assets, but restore the missing Wrap Lab workflow behavior.

<!-- ACCEPTANCE -->

## Acceptance criteria

- [x] Customer portal quote, payment, contract, proof, inspection, concept feedback, and packet flows work from the rebuild app.
- [x] Mockup Studio supports asset upload, replacement, delete, download, generation settings, concept actions, and portal sharing.
- [x] File, issue, scheduling, document/packet, and diagnostics behaviors are available without relying on the original static app.
- [x] Backend action model and service cover the transferred workflow actions.
- [x] Frontend build and backend tests pass.

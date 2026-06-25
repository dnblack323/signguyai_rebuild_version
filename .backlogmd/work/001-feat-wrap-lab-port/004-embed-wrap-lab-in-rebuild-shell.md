<!-- METADATA -->

```yaml
task: Embed Wrap Lab in the rebuild shell
status: in-progress
priority: 40
dep: ["work/001-feat-wrap-lab-port/003-verify-wrap-lab-parity.md"]
assignee: "/root"
requiresHumanReview: false
expiresAt: null
```

<!-- DESCRIPTION -->

Correct the integration so the existing Wrap Center placeholder renders Wrap Lab inside the rebuild application shell instead of replacing the core application with a standalone screen.

<!-- ACCEPTANCE -->

## Acceptance criteria

- [ ] Core rebuild navigation, modules, Webstores, header, banner, and ribbon remain visible
- [ ] Wrap Center renders the Wrap Lab dashboard in the module content area
- [ ] The rebuild ribbon exposes Wrap Lab contextual actions
- [ ] Wrap Lab styling is isolated from the core shell
- [ ] Embedded desktop and mobile views are browser verified

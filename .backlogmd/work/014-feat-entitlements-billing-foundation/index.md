<!-- METADATA -->

```yaml
work: Build Entitlements and Billing Rules foundation
status: done
assignee: ""
```

<!-- DESCRIPTION -->

Add backend-owned plan, credit, platform-fee, and feature-entitlement rules from the fee strategy PDF so modules can be gated consistently before deeper module imports.

<!-- CONTEXT -->

Implementation target is `C:\Users\thesi\Documents\GitHub\signguyai_rebuild_version`. Source pricing document is `2PLANSTRATEGY.pdf`, rendered locally because the PDF is image-only. Use integer minor units and basis points. Do not integrate Stripe checkout yet; this slice owns the canonical rules and read models only.

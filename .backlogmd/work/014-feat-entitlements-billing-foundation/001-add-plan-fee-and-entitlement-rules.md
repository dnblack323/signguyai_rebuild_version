<!-- METADATA -->

```yaml
task: Add plan fee and entitlement rules
status: done
priority: 10
dep: []
assignee: ""
requiresHumanReview: false
expiresAt: null
```

<!-- DESCRIPTION -->

Implement canonical billing catalog constants, monthly credit-bank calculation, platform transaction fee calculation, and tenant feature-entitlement records. Register APIs and tests without adding Stripe checkout or customer billing flows.

<!-- ACCEPTANCE -->

## Acceptance criteria

- [x] Billing catalog exposes subscription products, top-up packs, promo-code metadata, and transaction fee rates from the plan strategy PDF.
- [x] Monthly credit-bank calculation honors Complete Bundle precedence and founders/GA credit differences.
- [x] Platform fee calculation honors promo holiday, founders rates, and GA rates.
- [x] Feature entitlement records can be listed and upserted tenant-safely.
- [x] Webstore capabilities read from entitlement rules instead of only hardcoded preview state.
- [x] Focused and full backend tests pass.

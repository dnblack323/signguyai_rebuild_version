# Webstores Product And Entitlement Specification

## Product Modes

### Full SignGuyAI App

Webstores management is always available from the main SignGuyAI app. A tenant can create stores, complete setup, manage products, collect owner information, review approvals, prepare branding, and inspect reports without purchasing commerce capabilities.

### Webstores Standalone

Customers who only want Webstores receive a focused Webstores-only shell. It uses the same Webstores domain and records as the full app. It must not fork or duplicate stores, products, owners, forms, documents, notifications, reports, payments, orders, or AI usage.

Preview route: `/?mode=webstores`

## Capability Gates

| Capability | Default | Rule |
| --- | --- | --- |
| Webstore management | Enabled | Always available in full-app and standalone modes. |
| Publish storefront | Disabled | Separately entitled. A store can be fully prepared before publishing is enabled. |
| Shopping cart and checkout | Disabled | Separately entitled commerce capability. Activates cart, checkout, payments, and canonical order bridge together. |
| Standalone product mode | Available | Commercial product choice, not a separate Webstores data model. |

Backend capability contract:

- `GET /api/webstores/capabilities`
- `GET /api/webstores/capabilities?product_mode=standalone`

## Required Enforcement

- Frontend gating explains unavailable actions but is never authoritative.
- Backend services enforce publishing and cart/checkout entitlements.
- Public storefront routes remain unavailable until publishing is enabled.
- Cart, checkout, payment creation, and canonical order bridge remain unavailable until cart/checkout is enabled.
- Disabling commerce does not remove or corrupt store setup, products, owner approvals, or reports.

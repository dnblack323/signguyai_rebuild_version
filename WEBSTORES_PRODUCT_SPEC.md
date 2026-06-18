# Order Portal Manager Capability And Entitlement Specification

The controlling product source is now `ORDER_PORTAL_MANAGER_MASTER_SPEC.md`, converted from `Order_Portal_Manager_Master_Build_Spec-1.pdf`.

This file preserves the capability/entitlement rules for the current implementation while the code still uses some `webstores` compatibility names.

User-facing language should be **Order Portal Manager** and **Order Portals**. Existing internal `webstores` routes or services may remain until a safe rename pass.

## Product Modes

### Full SignGuyAI App

Order Portal Manager appears as a main-app add-on. A tenant can create portals, complete setup, manage portal-specific products, collect owner information, review approvals, prepare branding, and inspect reports without purchasing commerce capabilities.

### Standalone Order Portal Manager

Customers who only want Order Portal Manager receive a focused standalone shell. It uses the same Order Portal domain and records as the full app add-on. It must not fork or duplicate portals, products, owners, forms, documents, notifications, reports, payments, buyer orders, ledger records, activity logs, or AI usage.

Preview route: `/?mode=webstores`

## Capability Gates

| Capability | Default | Rule |
| --- | --- | --- |
| Portal management | Enabled | Available in standalone and main-app add-on modes. |
| Launch/publish | Disabled until ready | Requires entitlement, owner approval/terms, launch checks, products/pricing, and Stripe readiness where required. |
| Cart/checkout | Disabled until ready | Requires commerce entitlement, live portal status, server-side total validation, and Stripe/payment readiness. |
| Stripe Connect | Gated | Required when owner payouts or checkout flow requires it. |
| AI setup | Gated by plan/credits later | Includes summary, missing-info detection, product suggestions, descriptions, mockups, cleanup, and promo copy. |
| Mockup/background cleanup | Gated by plan/credits later | Original artwork must remain preserved. Cleaned files are separate. |
| Owner payouts | Gated | Requires store owner onboarding and payout readiness where applicable. |
| Main-app bridge | Gated/internal | Creates canonical Customer/Order/Order Item/Financials links without duplicating core logic. |
| Standalone product mode | Available | Commercial shell choice, not a separate data model. |
| Platform usage fee | Required for commerce | Applies to eligible product order subtotal unless terms change. |

Backend capability contract:

- `GET /api/webstores/capabilities`
- `GET /api/webstores/capabilities?product_mode=standalone`

## Required Enforcement

- Frontend gating explains unavailable actions but is never authoritative.
- Backend services enforce publishing and cart/checkout entitlements.
- Public storefront routes remain unavailable until launch/publish is enabled.
- Cart, checkout, payment creation, and canonical order bridge remain unavailable until cart/checkout is enabled.
- Disabling commerce does not remove or corrupt portal setup, products, owner approvals, reports, activity, or files.
- Home is an operational dashboard, not a documentation page. Portal types appear only during New Portal creation, and every top tab uses its own compact contextual ribbon.
- The first sellable release must include checkout, Stripe, buyer orders, owner portal, reporting, and hardening.

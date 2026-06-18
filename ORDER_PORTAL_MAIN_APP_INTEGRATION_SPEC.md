# Order Portal Manager Main App Integration Specification

## Purpose

Order Portal Manager must ship standalone first without becoming a throwaway fork. The main SignGuyAI OS must later consume the same domain core, not a copied implementation.

## Architecture Rule

Build one shared Order Portal Manager core with two shells:

- **Standalone shell:** focused Order Portal Manager product for shops that only want portals.
- **Main SignGuyAI add-on shell:** add-on module inside the full SignGuyAI OS.

The standalone shell and main-app add-on must share models, services, repositories, permission checks, launch checks, checkout rules, activity events, AI usage, and ledger logic.

## Layering

### Shared Core

Shared core owns:

- portal records
- portal owner records
- questionnaires and submissions
- product templates
- portal-specific products
- artwork files
- artwork cleanup versions
- mockups
- launch packets
- public storefront data
- buyer orders
- Stripe/checkout workflows
- revenue ledger entries
- reports/aggregates
- QR/share assets
- activity logs
- AI usage events
- launch readiness

### Standalone Shell

Standalone shell owns:

- standalone product branding
- standalone dashboard/navigation
- standalone shop onboarding
- standalone subscription entry points
- standalone-focused settings
- standalone login/session UI

Standalone shell must not define alternate portal, order, product, owner, payment, document, report, notification, or AI usage models.

### Main App Adapter

Main app adapter owns:

- placement in SignGuyAI Add-ons navigation
- main app authentication/session integration
- main app permission mapping
- Customer/Contact linking
- Documents/Doc Library linking
- Orders/Order Items bridge
- Work Order/Production bridge
- Financials/reporting bridge
- timeline/activity projection

Adapters translate between Order Portal Manager and existing SignGuyAI domains. They do not duplicate business logic.

## Integration Contracts

- `portal_owner.customer_id` may link to main SignGuyAI Customer.
- `portal_owner.contact_id` may link to main SignGuyAI Contact.
- `portal_product` remains portal-specific and may reference a reusable `product_template_id`.
- Buyer checkout creates a `buyer_order` first.
- `buyer_order` can bridge idempotently into canonical main SignGuyAI `Order`.
- Buyer order lines can bridge into canonical `Order Items`.
- Production-required buyer order items can later create `Work Orders` and `Production Tasks`.
- `artwork_file` can later link to Doc Library assets without losing original portal ownership.
- `revenue_ledger` can feed Financials/reporting without replacing the ledger.
- `activity_log` can appear in customer/order/portal timelines.
- Standalone auth and main app auth remain separate shells over shared domain permissions.

## Naming And Compatibility

User-facing naming:

- Order Portal Manager
- Order Portals
- Portal Owner
- Buyer Order
- Store Launch Packet

Temporary compatibility naming:

- Existing `webstores` file, route, or function names may remain until a safe rename pass.
- New docs, labels, and product decisions should use Order Portal Manager language.

Do not perform a broad code rename until tests and route compatibility are in place.

## Anti-Duplication Rules

Do not create:

- a standalone-only portal model
- a main-app-only portal model
- a second product catalog
- a second owner portal system
- a second buyer order system
- a second checkout/Stripe workflow
- a second document/artwork storage pattern
- a second notification or activity log path
- a second AI usage tracker
- a second reporting ledger

If the standalone shell needs a simpler UX, simplify the shell only. Do not simplify by forking domain logic.

## Main App Bridge Timing

Early internal releases may keep buyer orders inside Order Portal Manager. The bridge to main SignGuyAI Orders should be added only after checkout/order records are stable.

Bridge requirements:

- idempotent bridge key
- visible failed bridge status
- retry path
- source portal/order references on main Order
- immutable pricing/payment snapshots
- audit event for bridge creation and retry

## Security And Visibility

- Every tenant-owned record includes tenant/shop scope.
- Public storefront responses use allowlisted serializers.
- Owner portal responses use allowlisted serializers.
- Portal owners never see internal costs, margins, production notes, platform admin data, unrelated tenant data, or supplier data.
- Buyers only see public product prices, donation options where enabled, shipping/tax, checkout totals, and public pickup/shipping/FAQ content.

## Agent Build Checklist

Before adding any Order Portal feature, agents must answer:

1. Is this shared core, standalone shell, or main-app adapter?
2. Does it duplicate a main SignGuyAI system?
3. Does it expose internal data to portal owners or buyers?
4. Does it keep products portal-specific?
5. Does it preserve future Customer/Order/Doc Library/Financials integration?
6. Does it use integer cents for money?
7. Does it create activity/audit events for major changes?

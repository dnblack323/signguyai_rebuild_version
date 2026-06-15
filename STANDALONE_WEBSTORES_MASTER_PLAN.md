# Standalone Webstores Master Rebuild Plan

## Authority

`SignGuy_AI_Webstore_Master_Rebuild_Spec.pdf`, dated June 15, 2026, is the protected source of truth for Webstores. This standalone-first plan controls Webstores implementation sequencing. Older Webstores plans remain historical only.

## Commercial Priority

Ship Standalone Webstores first so it can generate revenue while the full SignGuyAI operating system is rebuilt. Standalone and main-app Webstores must use the same domain, data models, services, portals, templates, documents, communications, payments, reporting, audit, and future canonical-order bridge. Standalone is a focused product shell, not a fork.

Recommended standalone commercial default:

- Platform fee: 5% of eligible checkout amount.
- Eligible base: product subtotal, donations, and platform/store service fees.
- Exclude sales tax, refunded amounts, and pass-through shipping labels unless terms explicitly change.
- Store owners receive applicable money directly through Stripe Connect.

## Protected Product Rules

- Approved store types: B2B, Fundraiser, Event, Promotional, Employee, General.
- Legacy Creator maps to Promotional.
- Donations may be enabled for every store type.
- Each Webstore owns its own product catalog.
- Universal product and bundle templates copy into a store-specific product record and can then be edited per store.
- Draft creation, setup, products, questionnaires, preview, owner review, and demo UI remain available without commerce activation.
- Publishing requires Webstore entitlement plus all launch checks.
- Cart and checkout require a live store, commerce entitlement, and Stripe/payment readiness.
- Owner approval includes terms version, fee summary, payout terms, production/fulfillment responsibilities, store snapshot, approver identity, IP, user agent, and timestamp.
- Money is stored as integer cents. Rates use explicit decimals/basis points.
- Public and portal responses use explicit allowlists and never expose internal costs, margins, supplier data, locked settings, tenant-wide data, or unrelated stores.
- Checkout creates Webstore order/payment records and an idempotent bridge to canonical Customer, Order, Order Items, Work Order, and Production Tasks.

## Required Standalone Navigation

Top tabs:

1. Home
2. Stores
3. Templates
4. Orders
5. Payments
6. Reports
7. Owner Portal
8. Settings

`Setup` and `Products` are not top tabs. There is no universal product catalog.
Store-specific setup, products, questionnaires, preview, owner review, and
launch controls live inside the selected Store workflow. `Templates` is the
universal reusable starting-point library; copied templates become
store-specific products.

Home is an overview and triage command center. Its ribbon contains only:

1. New Store
2. Store List
3. Questionnaires
4. Approvals
5. Needs Action
6. Launch Blockers
7. New Orders
8. Snapshot

Selected-store actions never appear on Home. Clicking a store from a Home queue
or the Stores list opens Store Detail, which is the workbench for one selected
store. Store Detail owns setup, questionnaire, store-specific products,
preview, owner review, orders, payments, reports, activity, launch readiness,
launch, QR sharing, and pause or close controls.

Each Webstore top tab owns a contextual ribbon of no more than 12 actions that
are useful for the content currently open. Ribbon labels remain on one line;
shorten labels instead of wrapping them. The Home dashboard is operational, not
a specification or education page. It focuses on stores in setup,
questionnaires waiting, owner approvals, launch blockers, live stores, new
orders, recent activity, revenue, and stores needing action. Store type
selection appears only inside New Store. Launch, fee, and Stripe rules appear
only in the selected Store workflow, Payments, Owner Portal, Settings, or
contextual warning surfaces.

Standalone branding and visual rules:

- Reserve a visible top-header slot for the tenant's uploaded company logo.
- Use readable larger typography suitable for daily business use.
- Keep a light interface with color, card depth, subtle shadows, and branded accents. Do not use dark mode as the default.
- Home may use a light branded operational hero, but it must remain concise and action-focused.

## Store Lifecycle

Canonical statuses:

- draft
- questionnaire_sent
- questionnaire_received
- setup_in_progress
- owner_review_pending
- changes_requested
- stripe_onboarding_pending
- ready_to_launch
- live
- paused
- closed
- archived
- cancelled

The 15-stage progress model is computed/stamped separately:

1. setup_received
2. questionnaire_sent
3. questionnaire_submitted
4. waiting_artwork
5. store_being_built
6. products_being_added
7. pricing_review
8. preview_ready
9. owner_review_sent
10. owner_approved
11. stripe_ready
12. store_live
13. orders_coming_in
14. production_started
15. completed

Every status/stage change emits an immutable event. Stamps are sequence validated.

## Standalone MVP Release

The first sellable release must include:

- Tenant signup, owner/admin login, subscription/entitlement foundation, and standalone shell.
- Store CRUD for all six types with canonical statuses and globally unique immutable slugs.
- Store-type-specific setup fields.
- Universal questionnaire plus one short store-type section.
- Original questionnaire response storage, uploads, AI summary, missing-info review, safe-field dry run, and locked-setting protection.
- Store-specific product CRUD with images, variants, sizes, colors, cost cents, selling price cents, owner share, platform fee snapshot fields, internal notes, and production notes.
- Universal product/bundle template library with copy-to-store workflow.
- Staff preview for non-live stores with audit event.
- Owner portal invite/magic link, progress view, preview, request changes, approval, terms acceptance, fee summary, QR code, and Stripe onboarding status.
- Launch checklist enforcing entitlement, owner approval, terms, products/pricing, Stripe card payments, and transfer readiness where required.
- Public branded coming-soon, paused, closed, unavailable, and live status pages.
- Stripe Connect onboarding/status refresh and direct owner-payout foundation.
- 5% standalone platform fee snapshot and owner-visible terms.
- Checkout foundation using server-calculated cents and Stripe-hosted checkout.
- Webstore orders, payments/refunds, idempotent webhook handling, and visible failures.
- Admin reporting plus simplified owner reporting using live aggregations.
- Audit/activity events and notifications for important actions.

## Release Sequence

### S0: Protected Foundation

- Approve this behavior contract.
- Define route, permission, portal, entitlement, Stripe, fee, and public-data matrices.
- Implement tenant-scoped models, repositories, indexes, ID/money/date helpers, audit events, fixtures, CI, and deterministic tests.
- Required indexes include tenant-scoped lookups, globally unique slug, idempotency key uniqueness, Stripe event uniqueness, and TTL expiry.

### S1: Sellable Setup And Owner Approval

- Standalone shell and authentication.
- Six store types, statuses, setup stages, store CRUD, and store-specific catalogs.
- Templates, questionnaires, files, AI summary, safe-answer dry run.
- Owner portal, review/change request, terms/fee approval, QR/share.
- Draft/private preview and branded non-live status screens.
- Billing/entitlement setup for selling the standalone subscription, while publish/checkout remain gated until S2.

### S2: Publish, Stripe, And Checkout

- Stripe Connect onboarding and account health.
- Launch-readiness service and guarded launch/pause/close.
- Public allowlisted storefront.
- Cart, promo, donation, pickup/shipping, server-side price validation, Stripe Checkout Session, idempotency, and confirmation.
- Webhooks, payment/refund records, direct owner payout/failed transfer handling.
- 5% standalone platform fee and immutable pricing/fee snapshot.

### S3: Orders, Production Bridge, And Reporting

- Webstore order lifecycle and event logs.
- Idempotent canonical Customer/Order/Order Item/Work Order/Production Task bridge with retries and visible failure alerts.
- Admin analytics, owner analytics, payout history, fundraiser metrics, cached dashboard counters plus nightly reconciliation.

### S4: Operational Hardening

- Email/SMS/MMS templates and delivery logs.
- Auto-close jobs, retry jobs, refund/dispute recovery, failed transfer retry.
- Permission, tenant-isolation, public/portal allowlist, Stripe webhook replay, idempotency, load, browser, and migration tests.
- Support tools, documentation, onboarding, exports, backups, monitoring, and launch checklist.

## Acceptance Gate For Paid Customers

Do not sell the standalone product as production-ready until:

- Tenant and portal isolation tests pass.
- Store owner cannot see locked/internal fields.
- Public serializer allowlist tests pass.
- Owner approval stores terms and fee snapshot.
- Launch is impossible without entitlement, approval, terms, products/pricing, and required Stripe capabilities.
- Checkout amounts are server-calculated in cents.
- Stripe webhooks, retries, refunds, transfer failures, and idempotency are tested.
- Orders/payments cannot duplicate under retries.
- Paused/closed stores disable checkout while preserving history.
- Required backup, monitoring, support, and reconciliation procedures exist.

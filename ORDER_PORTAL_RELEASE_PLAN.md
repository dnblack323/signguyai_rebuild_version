# Order Portal Manager Release Plan

## Authority

This release plan follows `ORDER_PORTAL_MANAGER_MASTER_SPEC.md`.

Early releases are internal engineering milestones. The first customer-sellable release must include checkout, Stripe, buyer orders, owner portal, reporting, and hardening.

## Release 0: Foundation Lock

Goal: prevent duplicate systems before feature coding continues.

Deliver:

- Shared Order Portal Manager domain contract.
- Standalone shell vs main-app adapter boundary.
- Tenant/shop scoping rules.
- Money/date/id conventions.
- Activity/audit event rules.
- Public and owner portal allowlist rules.
- Compatibility note for temporary `webstores` naming.

Not sellable.

## Release 1: Internal Portal Setup MVP

Goal: create and manage draft portals.

Deliver:

- Standalone shell and dashboard.
- Platform admin basics.
- Sign shop account/login.
- Order Portals list.
- New Portal Wizard.
- Store type selection.
- Portal owner records.
- Portal statuses.
- Activity log.
- Portal Detail workbench.
- Basic branding.
- Product template library.
- Portal-specific product list.

Not sellable.

## Release 2: Questionnaire And Owner Portal

Goal: collect owner setup information cleanly.

Deliver:

- Store Owner Portal login.
- Questionnaire send/submission.
- Store-type questionnaire sections.
- Artwork/logo upload.
- Known product selection.
- "Open to suggestions" checkbox.
- Owner progress dashboard.
- Missing info queue.

Not sellable.

## Release 3: AI Setup And Product Builder

Goal: make setup AI-assisted while keeping the shop in control.

Deliver:

- AI questionnaire summary.
- AI missing-info detection.
- AI field mapping suggestions.
- AI product suggestions from templates.
- AI product descriptions.
- Suggested production cost.
- Suggested selling price.
- Suggested owner share.
- Platform fee estimate.
- Estimated shop gross.
- Product suggestion review cards.
- Human approval before products become final.

Not sellable.

## Release 4: Artwork, Mockups, And Launch Packet

Goal: create the polished review package.

Deliver:

- Artwork file records.
- Original artwork preservation.
- Cleaned artwork as separate version.
- Background removal / transparent PNG workflow.
- Mockup generator.
- Mockup review/approval.
- Store Launch Packet.
- Pricing/fee summary.
- Product mockups.
- Promotional copy.
- QR code/share link.
- Owner review.
- Owner approval/change request.

Not sellable until checkout and money handling are complete.

## Release 5: Public Storefront, Checkout, And Buyer Orders

Goal: enable buyers to order online.

Deliver:

- Public portal/store home.
- Product list.
- Product detail.
- Cart.
- Server-calculated checkout totals.
- Stripe Checkout.
- Confirmation page.
- Buyer order records.
- Order statuses.
- Size/color/variant/personalization capture.
- Fundraiser progress meter.
- Donation tools.
- Pickup/shipping info.
- Basic public FAQ.

Launch candidate only after Release 6 and Release 7 are complete.

## Release 6: Stripe, Billing, Fees, And Ledger

Goal: make money tracking reliable.

Deliver:

- Sign shop Stripe setup.
- Store owner payout onboarding where needed.
- Store owner setup/monthly/relaunch billing settings.
- Platform usage fee tracking.
- Revenue ledger line items.
- Payment reporting.
- Payout reporting.
- Refund records.
- Failed payment/transfer visibility.
- Immutable checkout pricing/fee snapshots.

Required before selling.

## Release 7: Reports And Launch Hardening

Goal: make the product ready for paid customers.

Deliver:

- Sign shop reports.
- Store owner reports.
- Product totals.
- Size/variant breakdowns.
- Pickup list.
- Production summary.
- Fundraiser totals.
- Donation totals.
- QR downloads.
- Promotional copy generator.
- Relaunch portal.
- Duplicate portal.
- Closed portal archive.
- Permission tests.
- Tenant isolation tests.
- Public/owner data visibility tests.
- Checkout/idempotency/webhook tests.
- Backup/monitoring/support procedures.

This is the first sellable release.

## Release 8: Main SignGuyAI Add-On Integration

Goal: embed the same system into SignGuyAI OS.

Deliver:

- Add-ons navigation placement.
- Main app auth adapter.
- Customer/contact linking.
- Doc Library/artwork linking.
- Canonical Order/Order Item bridge.
- Financials/reporting bridge.
- Customer/order timeline activity projection.
- Main app permission mapping.

## Later Advanced Releases

Delay until the core is stable:

- SMS/MMS.
- Advanced tax automation.
- Full inventory.
- Full production management.
- Full CRM.
- Public marketplace.
- Advanced website/theme builder.
- Customer-facing product designer.
- Complex multi-location permissions.

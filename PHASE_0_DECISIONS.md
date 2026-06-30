---
status: current phase-0 decision record
source: user answers captured 2026-06-30
applies_to: SignGuyAI rebuild production planning
---

# Phase 0 Decisions

This document records the current rebuild decisions that control scope, architecture, terminology, release order, and launch gates.

## 1. Product Direction

SignGuy AI is a full SaaS operating system for custom sign shops, print shops, wrap shops, and custom graphics businesses.

V1 targets solo operators, small shops, and growing shops. Multi-location, franchise, and enterprise modes are later premium add-ons.

The product must win against generic tools because it is built specifically for sign and graphics workflows:

- Wrap Command Center / Wrap Lab.
- Substrate, square-foot, material, labor, and production-aware pricing.
- Artwork, proofing, markup, and signature workflows.
- Integrated order portals / webstores for sign-shop commerce.
- Shop-specific customer, production, document, and portal workflows.

## 2. V1 Scope

V1 is the launch feature set and should not be sold until complete.

V1 includes the Core App Shell plus the foundational shop workflow:

- Final app layout and navigation.
- User accounts and tenant shell.
- CRM.
- Quotes.
- Orders.
- Order Items.
- Invoices.
- Production Board.
- Document Library.
- Minimal but configurable Pricing Calculator.
- Customer Portal Lite.
- Proof approvals.
- Structured drawings and signature requests.
- Platform Admin Portal.
- Required launch integrations.

The app starts from a clean codebase. There is no legacy customer/data migration requirement.

## 3. Release Order

### Release 0: Core App Shell And SaaS Foundation

Build this before feature depth.

- Tenant isolation middleware.
- Role and permission system.
- App shell, navigation, layout, and module slots.
- Auth and user management.
- Platform creator/admin foundation.
- Billing foundation.
- Object storage foundation.
- Email foundation.
- Audit log foundation.
- Commercial launch gates wired into the architecture.

Tenant isolation tests are Release 0 exit criteria.

### Release 1: Core Shop Workflow

Build the deterministic business system first.

- Customers.
- Quotes.
- Orders.
- Order Items.
- Production-required flag on Order Items.
- Automatic production-ticket/work-order creation only for items where `production_required = true`.
- Invoices.
- Document Library.
- Customer Portal Lite.
- Basic proof approval.
- Structured signatures/drawings.
- Minimal configurable Pricing Calculator.

### Release 2: Webstores / Order Portal Add-On

Webstores are the first major expansion module, not a distant future release.

Purpose:

- Prove shared portal, product, payment, customer, and order systems.
- Add Stripe Connect and storefront/order portal commerce.
- Keep shared systems reusable instead of duplicating data models.

### Release 3: Workforce Add-On

Payroll and time tracking wait until the core order flow works.

Includes:

- Time tracking.
- Payroll.
- Employee pay workflows.
- Deeper staff productivity tools.

### Later Add-Ons

- Full AI tools and AI credits.
- Twilio/SMS.
- QuickBooks.
- Meta/Facebook messaging.
- Buy now pay later.
- Zapier.
- Multi-location/franchise mode.
- Advanced analytics/forecasting.

## 4. Canonical Workflow

The strict canonical flow is:

```text
Quote -> Order -> Invoice
```

An approved quote converts into an order. The order is produced. The completed or billable order becomes an invoice.

One order can contain multiple Order Items, such as:

- Vehicle wrap.
- Banner.
- Install fee.
- Design fee.
- Apparel.
- Decal.
- Custom product.

## 5. Terminology

User-facing UI must not use legacy `Jobs` terminology.

Use:

- `Orders`.
- `Order Items`.
- `Production Board`.
- `Production Tickets` only where a physical production unit is being described.
- `Work Orders` or `Work Order Summary` for production documentation.

Avoid:

- `Jobs`.
- `Job Tickets`.
- `Job Items`.

Implementation note: if old/internal code temporarily uses job-ticket naming, it is compatibility-only and must not control product language or new schema design.

## 6. Order Item Production Rules

Every Order Item has:

```text
production_required: true | false
```

Default behavior:

- Physical products default to `true`.
- Fees, delivery, discounts, admin charges, and non-production lines default to `false`.

When `production_required = true`, the system automatically creates the production unit needed by the Production Board / Work Order flow.

This avoids polluting production with fees while avoiding manual busywork for real physical items.

## 7. Pricing Decisions

V1 pricing must support all launch pricing categories, not a narrow subset.

Pricing must be configurable, owner/admin controlled, and explainable.

Required:

- Owner/Admin pricing setup only.
- Manual override support.
- Required audited override reason.
- Show Math / Behind the Scenes panel for owners.
- Backend-authoritative pricing math.
- Money stored as integer cents.
- Pricing and billing tests before launch.

The exact subscription plan table is still unresolved in this record because the answer referenced an attachment that was not present in the received files.

## 8. Customer Portal Decisions

V1 includes Customer Portal Lite.

Customers need both:

- Secure token-based magic links for quick unauthenticated actions.
- Formal portal accounts with PIN/password for full history access.

V1 customer portal capabilities:

- View and approve quotes.
- View orders.
- Pay invoices online.
- Upload files.
- Approve proofs.

Customer-facing pages are a separate security boundary. Public and portal payloads must use explicit allowlists.

Never expose:

- Internal shop notes.
- Internal markup files.
- Wholesale supplier costs.
- Internal labor cost.
- Margin/profit details.
- Staff-only production comments.

## 9. Roles And Permissions

Required launch roles:

- `platform_creator`: the product owner.
- `platform_admin`: support/admin staff.
- `owner`: shop boss.
- `admin`: shop manager.
- `staff`: employee.

Staff access is permission-based and workspace-limited. Production staff should see operations and productivity views, while business finance/payroll/settings areas can be completely hidden.

Owner impersonation of staff/customers is not required for V1.

Platform support impersonation is required for launch, with a strict admin audit log.

## 10. Billing And Dunning

Business model:

- SaaS subscription with tiered pricing.
- 7-day trial.
- No mandatory setup fee.

Dunning workflow:

```text
Failed payment attempt 1 -> email
Failed payment attempt 2 -> email
Failed payment attempt 3 -> suspend tenant
Successful payment -> auto-reactivate tenant
```

Stripe webhook signatures must be verified before launch.

The exact plan/pricing table is pending because the referenced pricing attachment was not present.

## 11. Data And Multi-Tenancy

Every business record must be tenant-scoped from day one.

Rules:

- No business logic before tenant isolation is enforced.
- Every business record has `tenant_id`.
- One shop's customer database is walled off from every other shop.
- Customers belong to one tenant only.
- No multi-location support in V1.
- UTC datetimes.
- App-generated IDs.
- Immutable audit/activity events for important business actions.
- Backend owns business math.

## 12. Documents, Files, And Signatures

Required V1 document types:

- Contracts.
- Invoice templates.
- Work Orders.
- Artwork.
- Proofs.
- Permits.

File rules:

- Use cloud object storage from day one.
- Use Emergent Object Storage / S3-compatible storage.
- Do not store base64 images in MongoDB.
- Proofing and artwork systems require file versioning.

E-signatures are required in V1 for commercial launch.

Structured drawings and signature requests are launch features because contracts and approvals need legally meaningful records.

## 13. Required Launch Integrations

Required for launch:

- User accounts/auth.
- Stripe for SaaS billing.
- Stripe Connect for webstores/order portals.
- SendGrid for system emails.
- Emergent Object Storage for files.

Deferred:

- Twilio/SMS.
- QuickBooks.
- Meta/Facebook messaging.
- BNPL/Affirm.
- Zapier.

## 14. Platform Admin Requirements

The Platform Admin Portal is a launch feature.

It must support:

- View tenants.
- Manage billing status.
- Suspend and reactivate accounts.
- Support impersonation with audit logging.
- Broadcast mass emails.
- Maintenance mode banners.
- Email deliverability dashboard.
- SendGrid bounce visibility.
- AI token/usage tracking.
- Admin audit log.

## 15. Launch Quality Bar

The Commercial Launch Gate requires:

- Verified tenant isolation tests before beta users.
- API integration tests for all money flows.
- Pricing calculation tests.
- Billing and Stripe webhook tests.
- Verified Stripe webhook signatures.
- Backup/restore drills completed.
- Error tracking active.
- Clean demo tenant with seeded sample data.
- Responsive internal app.
- Mobile-friendly field/installer view for photo upload from the shop floor or install bay.

If tenant data can bleed across accounts, the launch is blocked.

## 16. Open Items

These items still need answers or source files:

1. Final subscription plan/pricing table. The answer referenced `SEE ATTACHED`, but no pricing attachment was available in this turn.
2. Exact list of all V1 pricing categories and calculator behaviors. The answer says `ALL`; this needs conversion into a concrete category matrix.
3. Final public product naming for `Webstores` versus `Order Portal Manager`, because current rebuild docs prefer Order Portal language while the latest answers still use Webstores.
4. Final UI label for the production unit created from an Order Item. Current decision: do not use `Job Ticket` publicly.

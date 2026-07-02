---
status: current phase-0 decision record
source: user answers captured 2026-06-30
pricing_source: CHAT'S FEE STRUCTURE.pdf, last read 2026-06-30
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

## 8. Founder Launch Pricing

Launch with one complete Founder Edition first. Do not make early buyers choose between Core, Webstores, Wrap Command Center, and bundle variations before real usage data exists.

Founder Edition:

- First 25 signed shops only.
- $119/month for the first 3 months using a single Founder Launch promo code.
- $189/month beginning in month 4, locked while the account remains continuously active and current.
- Includes Core SignGuy AI OS, Webstores, Wrap Command Center, Customer Portal, documents, approvals, production tools, pricing, invoicing, and standard platform improvements.
- Includes 850 AI credits per month at launch.
- 0% SignGuy platform fee on invoices/payment links and Webstore payments for the first 3 months.
- Stripe processing fees still apply separately.
- After the promo period: 0.5% SignGuy fee on invoices/payment links and 1.5% on Webstore sales.
- No permanent 0% transaction-fee promise.

Implementation rule:

- Keep the $119 intro as a Stripe coupon, not as a separate permanent product price.
- Store founder status, promotion start date, post-promo fee schedule, and founder account number on the tenant record.
- Founder pricing can stay locked for active founders, but new pricing can apply to new customers after Founder Edition closes.

## 9. General Availability Pricing

After Founder availability closes, the public bundle becomes the clearest main offer.

| Product | Founder Base Rate | General Availability | Included Monthly Credits |
| --- | ---: | ---: | ---: |
| SignGuy AI OS - Core | $99/month | $149/month | 300 |
| Webstores Add-On | $59/month | $89/month | 200 Founder / 300 GA |
| Wrap Command Center Add-On | $79/month | $119/month | 350 Founder / 500 GA |
| Complete Bundle | $189/month | $279/month | 850 Founder / 1,100 GA |

Bundle rule:

- The bundle must always be the obvious best value.
- Standalone module pricing should exist internally and later publicly, but it should not distract from the initial Founder launch.

## 10. Platform Transaction Fees

Charge SignGuy platform fees separately from Stripe processing fees. Both must be disclosed before checkout or payout.

| Account Status | Invoice / Payment Link Fee | Webstore Sale Fee | Notes |
| --- | ---: | ---: | --- |
| Founder months 1-3 | 0% | 0% | Founder fee holiday. Stripe processing still applies. |
| Founder month 4+ | 0.5% | 1.5% | Lower founder rate, locked while active. |
| General Availability | 1.0% | 2.0% | Standard fee schedule after founders close. |
| Custom enterprise / high volume | Custom | Custom | Only after real volume and support demand justify negotiation. |

## 11. AI Credits And Guardrails

Included credits can expire at the end of the billing cycle. Purchased credits remain available for at least 12 months.

Credit packs:

| Pack | Credits | Launch Price | Expiration |
| --- | ---: | ---: | --- |
| Quick Fix Pack | 100 | $19 | 12 months |
| Growth Boost Pack | 300 | $45 | 12 months |
| Power Pack | 800 | $99 | 12 months |

Launch guardrails:

- Limit image generation to 20 images per tenant per day.
- Limit AI Business Assistant usage to 50 messages per tenant per day.
- Limit historical invoice analysis to 3 runs per tenant per day.
- Show a low-credit warning at 20% remaining.
- Block paid AI actions when credit balance reaches zero.
- Log actual AI/model cost per tenant, feature, model, and month before scaling beyond the founder group.

## 12. Customer Portal Decisions

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

## 13. Roles And Permissions

Required launch roles:

- `platform_creator`: the product owner.
- `platform_admin`: support/admin staff.
- `owner`: shop boss.
- `admin`: shop manager.
- `staff`: employee.

Staff access is permission-based and workspace-limited. Production staff should see operations and productivity views, while business finance/payroll/settings areas can be completely hidden.

Owner impersonation of staff/customers is not required for V1.

Platform support impersonation is required for launch, with a strict admin audit log.

## 14. Billing And Dunning

Business model:

- SaaS subscription with tiered pricing.
- Founder launch sells only the complete Founder Edition to the first 25 shops.
- General Availability opens later with the $279/month complete bundle and standalone module prices.
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

## 15. Pricing Rollout Decision Rules

Rollout:

- Phase 1: Founder launch. Sell only the complete Founder Edition to the first 25 shops.
- Phase 2: Review after 10-20 active paying shops. Review adoption, feature usage, AI cost, support burden, payment volume, churn, and Webstore demand.
- Phase 3: Public pricing. Open General Availability using the $279/month complete bundle plus standalone module prices.

Do not change active founder pricing casually. New pricing can apply to new customers after Founder Edition closes.

## 16. Data And Multi-Tenancy

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

## 17. Documents, Files, And Signatures

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

## 18. Required Launch Integrations

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

## 19. Platform Admin Requirements

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

## 20. Launch Quality Bar

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

## 21. Open Items

These items still need answers or source files:

1. Exact list of all V1 pricing categories and calculator behaviors. The answer says `ALL`; this needs conversion into a concrete category matrix.
2. Final public product naming for `Webstores` versus `Order Portal Manager`, because current rebuild docs prefer Order Portal language while the latest answers still use Webstores.
3. Final UI label for the production unit created from an Order Item. Current decision: do not use `Job Ticket` publicly.

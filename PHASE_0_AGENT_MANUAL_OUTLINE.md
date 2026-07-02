---
status: outline
purpose: phase-0 section of the step-by-step AI agent rebuild manual
source: PHASE_0_DECISIONS.md
---

# Phase 0 Agent Manual Outline

Phase 0 is not a coding phase. It is the control phase that prevents the rebuild from drifting back into the same problems as the first version: duplicated systems, legacy terminology, oversized files, unclear release scope, weak tenant boundaries, and feature sprawl.

Every later AI-agent task must treat this phase as the decision lock.

## Phase 0 Goal

Create the exact instructions, boundaries, and acceptance gates needed before production implementation continues.

By the end of Phase 0, an AI agent should know:

- What V1 is.
- What V1 is not.
- What must be built first.
- What must be deferred.
- What names to use.
- What architecture rules cannot be broken.
- What tests prove the foundation is safe.
- What mistakes from the old build must not be repeated.

## Required Phase 0 Inputs

The agent must read these before producing any Phase 0 output:

1. `PHASE_0_DECISIONS.md`
2. `README.md`
3. `DOCS_INDEX.md`
4. `ORDER_PORTAL_RELEASE_PLAN.md`
5. Current app feature reference from the original build, read-only
6. Current rebuild repo structure
7. Current backlog state under `.backlogmd/work/`

The original `signguyai` app is reference material only. It is not the implementation target.

## Phase 0.1: Product And V1 Lock

Purpose: define the sellable product without drifting into every possible feature.

Agent must capture:

- Product statement.
- Target customer.
- Why this product is different from generic business tools.
- V1 launch scope.
- Explicit non-V1 scope.
- Founder launch positioning.

Key decision:

- V1 is the Core App Shell plus CRM, Quotes, Orders, Order Items, Invoices, Production Board, Document Library, Customer Portal Lite, Proofs, Signatures, Platform Admin, and a minimal configurable Pricing Calculator.

Do not allow:

- Payroll in V1.
- Full AI tools in V1.
- SMS, QuickBooks, Meta/Facebook, BNPL, Zapier, or franchise mode in V1.
- A vague "MVP" label that can be sold before launch gates are met.

Deliverable:

- `PHASE_0_PRODUCT_AND_SCOPE.md`

## Phase 0.2: Release Order Lock

Purpose: make the build sequence clear enough that agents do not build exciting add-ons before the foundation.

Agent must define:

- Release 0: SaaS foundation and app shell.
- Release 1: Core shop workflow.
- Release 2: Webstores / Order Portal add-on.
- Release 3: Workforce add-on.
- Later add-ons.

Required ordering:

1. Tenant/auth/billing/file/email/audit foundation.
2. Core deterministic business workflow.
3. Webstores / Order Portal as first expansion.
4. Workforce/payroll later.
5. Full AI tools later.

Do not allow:

- AI mutating business records before deterministic workflows are stable.
- Payroll/time tracking before Quote -> Order -> Invoice works.
- Webstores to create duplicate customer/product/payment systems.

Deliverable:

- `PHASE_0_RELEASE_SEQUENCE.md`

## Phase 0.3: Terminology And UX Language Lock

Purpose: kill legacy naming before it infects schemas, routes, navigation, docs, and UI.

Agent must define:

- Approved user-facing terms.
- Forbidden user-facing terms.
- Acceptable internal compatibility terms.
- Navigation labels.
- Production-unit naming.

Locked terminology:

- Use `Orders`.
- Use `Order Items`.
- Use `Production Board`.
- Use `Work Orders` or `Work Order Summary`.
- Do not use `Jobs`, `Job Tickets`, or `Job Items` in the UI.

Open naming item:

- Final public naming for `Webstores` versus `Order Portal Manager`.

Deliverable:

- `PHASE_0_TERMINOLOGY_GUIDE.md`

## Phase 0.4: Architecture Guardrails

Purpose: prevent the rebuild from becoming another monolith with duplicated logic.

Agent must define rules for:

- Backend module boundaries.
- Frontend module boundaries.
- Shared services.
- Add-on boundaries.
- File size and component size.
- API route conventions.
- Business logic ownership.

Required rules:

- Business math lives on the backend.
- Pricing logic lives in a pricing service, not a giant route file or frontend component.
- Tenant isolation is enforced centrally.
- Shared systems must not be duplicated across add-ons.
- Add-ons consume shared customers, products, files, payments, portals, and audit logs.
- Public/customer payloads use explicit allowlists.

Do not allow:

- Giant backend server files.
- Giant frontend page components.
- Duplicate quote/order/invoice logic.
- Duplicate webstore/customer/payment models.
- Base64 file storage in MongoDB.
- Dead "temporary" legacy modules without a removal plan.

Deliverable:

- `PHASE_0_ARCHITECTURE_GUARDRAILS.md`

## Phase 0.5: Data Foundation Rules

Purpose: make the data model safe before feature work creates hard-to-remove mistakes.

Agent must define:

- Tenant scoping rules.
- ID rules.
- Money rules.
- Date/time rules.
- Audit/event rules.
- File metadata rules.
- Versioning rules.

Locked rules:

- Every business record has `tenant_id`.
- Money is stored as integer cents.
- Datetimes are UTC.
- IDs are app-generated.
- Important changes create immutable activity/audit events.
- Object storage holds binary files.
- MongoDB stores metadata and links, not base64 blobs.
- Proof and artwork files require versioning.

Deliverable:

- `PHASE_0_DATA_RULES.md`

## Phase 0.6: Permissions, Roles, And Security Boundary

Purpose: define access control before screens and routes multiply.

Agent must define:

- Role hierarchy.
- Permission matrix.
- Workspace visibility rules.
- Platform impersonation rules.
- Customer portal boundary.
- Staff visibility limits.

Launch roles:

- `platform_creator`
- `platform_admin`
- `owner`
- `admin`
- `staff`

Required security rules:

- Platform support impersonation requires strict audit logging.
- Owner impersonation of staff/customers is not V1.
- Staff should not see finance/payroll/settings unless explicitly allowed.
- Customer portals must never expose internal cost, margin, notes, or staff-only files.

Deliverable:

- `PHASE_0_ROLES_AND_SECURITY.md`

## Phase 0.7: Billing, Pricing, And Founder Launch Rules

Purpose: make the revenue model implementation-ready before Stripe work starts.

Agent must define:

- Founder Edition.
- General Availability pricing.
- Platform transaction fees.
- Trial rules.
- Dunning rules.
- AI credit packs.
- AI credit limits.
- Stripe implementation notes.

Locked founder launch:

- First 25 shops.
- $119/month for first 3 months via coupon.
- $189/month ongoing founder rate while active.
- Includes Core OS, Webstores, Wrap Command Center, and 850 monthly AI credits.
- 0% platform fee for first 3 months.
- Then 0.5% invoices/payment links and 1.5% webstore sales.

Required implementation rule:

- The $119 intro is a Stripe coupon, not a permanent product price.

Deliverable:

- `PHASE_0_BILLING_AND_FEES.md`

## Phase 0.8: Integration Boundary

Purpose: prevent nice-to-have integrations from delaying launch.

Agent must split integrations into launch-required and deferred.

Required launch integrations:

- User accounts/auth.
- Stripe SaaS billing.
- Stripe Connect.
- SendGrid.
- Emergent Object Storage.

Deferred:

- Twilio/SMS.
- QuickBooks.
- Meta/Facebook messaging.
- BNPL/Affirm.
- Zapier.

Deliverable:

- `PHASE_0_INTEGRATION_BOUNDARY.md`

## Phase 0.9: Test And Launch Gate Plan

Purpose: define what "bug free enough to sell" means in practical terms.

Agent must define:

- Release 0 exit tests.
- V1 commercial launch gate.
- Required CI tests.
- Required manual verification.
- Seed/demo data requirements.
- Mobile/field installer acceptance.

Required gates:

- Tenant isolation tests before beta users.
- Pricing tests.
- Billing tests.
- Stripe webhook signature verification.
- Money-flow integration tests.
- Backup/restore drill.
- Error tracking active.
- Clean demo tenant.
- Responsive internal app.
- Mobile-friendly field/installer view for photo uploads.

Do not allow:

- Selling before money, tenant, public link, and backup gates pass.
- Treating frontend-only demos as production features.
- Calling a workflow complete without API tests and at least one realistic seeded scenario.

Deliverable:

- `PHASE_0_LAUNCH_GATES.md`

## Phase 0.10: Agent Build Rules

Purpose: create the instruction format every future AI agent must follow.

Each future build instruction should include:

- Objective.
- Source docs to read first.
- Files/modules allowed to edit.
- Files/modules not allowed to edit.
- Required schema/model changes.
- Required API changes.
- Required frontend changes.
- Required tests.
- Required acceptance criteria.
- Known old-build mistakes to avoid.
- Stop conditions.

Standard agent rule:

- Read before editing.
- Keep changes scoped.
- Do not invent legacy compatibility unless required.
- Do not create duplicate systems.
- Do not skip tests for auth, tenant isolation, money, files, or public links.
- Do not leave dead code, unused routes, or parked components in the production path.

Deliverable:

- `PHASE_0_AGENT_BUILD_RULES.md`

## Phase 0 Exit Criteria

Phase 0 is complete only when:

- Product/V1 scope is locked.
- Release sequence is locked.
- Terminology guide is locked.
- Architecture guardrails are written.
- Data rules are written.
- Role/security model is written.
- Billing/fees are written.
- Integration boundary is written.
- Launch gates are written.
- Agent build rules are written.
- Open naming and pricing-category questions are either resolved or explicitly parked with owners.

No implementation phase should begin until these documents exist and are internally consistent.

## Phase 0 Open Questions

These are the only remaining roadmap-shaping questions from the current decision record:

1. What exact pricing categories and calculator behaviors does `ALL` include for V1?
2. Should the public product name be `Webstores`, `Order Portal Manager`, or something else?
3. What is the final public label for the production unit automatically created from production-required Order Items?

## Phase 0 Anti-Regression Checklist

Use this checklist before allowing any later agent to build.

- [ ] No `Jobs` wording in user-facing V1 docs.
- [ ] No duplicate customer/order/product/payment systems.
- [ ] No feature module stores its own private file system.
- [ ] No base64 binary storage in MongoDB.
- [ ] No frontend-owned pricing math.
- [ ] No public/customer response returns raw database records.
- [ ] No AI feature mutates records before deterministic workflows are tested.
- [ ] No payroll/time tracking before core order flow is stable.
- [ ] No Stripe webhook without signature verification.
- [ ] No tenant-scoped route without tenant isolation tests.
- [ ] No sellable label before commercial launch gates pass.

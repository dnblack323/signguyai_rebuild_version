# SignGuyAI Master Agent Rebuild Plan

## Controlling Rule

This is the sole implementation plan for the clean SignGuyAI rebuild. It supersedes prior rebuild plans, Day 1 notes, mixed roadmaps, screenshots, and agent memory when they conflict. The controlling source is `SignGuyAI_Final_Controlling_Master_Rebuild_Spec.pdf`, generated June 13, 2026.

Preserve approved behavior, labels, defaults, workflows, calculations, screens, and business outcomes. Do not copy legacy route sprawl, giant files, duplicate models, or outdated architecture. Owner corrections control unless they create a security, payment, tenant-isolation, accounting, or deterministic-math defect.

## Product And Shell

SignGuyAI is a multi-tenant SaaS operating system for custom sign shops.

Final primary navigation:

- Icon-only Home button: opens the global Command Center.
- Operations top-level modules: Customers, Quotes, Orders, Production, Approvals, and Doc Library.
- Business: invoices, payments, AR, sales, expenses, deductions, taxes, payroll administration, purchasing, inventory alerts, reports, and margins.
- Productivity: tasks, Kanban, reminders, checklists, internal messages, announcements, unified calendar, and team coordination.
- AI Hub: assistant and tools shells, prompt library, onboarding, documentation, bug reports, feature requests, community, roadmap, release notes, and guarded AI tools.
- Settings: company, permissions, Pricing Foundation, production stages, team/payroll, billing terms, integrations, Webstore settings, feature flags, and plan entitlements.
- `?` Help icon: opens a compact Help menu containing current-page tips plus links to documentation categories, onboarding, support, bug reports, feature requests, roadmap, and release notes. Help does not consume primary navigation space.

Operations placement rules:

- Order Items are managed inside an Order and are not a top-level Operations module.
- Work Orders are created, viewed, or downloaded from an Order and are also available inside Production. Use the user-facing label Work Order, not Work Order Summary, in navigation and common actions.
- Production contains the Production Board, Work Orders, production tasks, and Shop Schedule.
- Use the labels Production, Approvals, Doc Library, and Shop Schedule.
- Customer Portal access belongs inside customer/order records and portal workflows, not top-level Operations navigation.
- Webstores and Wrap Center are Add-ons. Show their icons in a lower `Add-ons` section of the compact blue primary rail. Collapsed mode uses icon tooltips; expanded mode shows icons and labels. Wrap Center uses a vehicle icon.

Navigation rules:

- Primary rail selects the major workspace.
- Workspace navigation selects a module.
- Office-style contextual ribbon exposes actions.
- Detail tabs select record areas.
- Filters narrow lists, cards identify attention, boards move work, and Settings controls behavior.
- Ban large or wide permanent left sidebars everywhere in the app. The blue primary workspace rail is icon-only while collapsed and expands with icons and labels when hovered or keyboard-focused. Expansion slides over app content and must never shift or permanently consume content width. Use compact horizontal module navigation. Contextual drawers/panels may open temporarily for Settings, Documents, Help, or complex record tasks.

The Home Command Center uses the accepted compact dark rail, global search, global `+ Create`, notifications, Help/profile area, icon-over-label ribbon, white cards, thin borders, subtle shadows, and teal/navy/white visual language. Its compact ribbon actions are New Order, New Quote, New Customer, Pricing Calc, Send Proof, Request Approval, Send Document, New Invoice, Send Email, New Task, Schedule Install, and Open Calendar.

Dashboards use one digest endpoint per context and reusable widgets. Home focuses on cross-shop Action Required, KPIs, schedule, open orders, production, approvals, unpaid invoices, sales, tasks, inventory, AI status, recent activity, and onboarding. Workspace dashboards show only contextual information. Disabled modules show explicit states, never fake zeroes. Digest data shows staleness when older than the configured threshold.

## Final Language And Work Hierarchy

Final commercial flow: `Quote -> Order -> Invoice`.

Final production flow: `Order -> Order Items -> Work Order -> Production Tasks`.

- Quote: pre-sale estimate/proposal with Quote Items that can be accepted and converted idempotently.
- Order: main confirmed operational record.
- Invoice: frozen billing document generated from an Order or manually where allowed.
- Order Item: one commercial deliverable or charge. Never label it Line Item.
- Work Order: production-facing packet/view generated from production-required Order Items. Never label it Job Ticket.
- Production Task: task/stage tied to an Order Item and optionally grouped by Work Order.

Non-production fees, discounts, deposits, delivery, permits, design-only charges, and administration charges do not create production tasks unless explicitly marked `production_required`.

Use `completed`, never `complete`, as the final status value. Lifecycle exceptions such as `void`, `archived`, `cancelled`, and `on_hold` require reasons and audit events.

Canonical statuses:

- Orders: draft, confirmed, in_production, ready, delivered/fulfilled, on_hold, cancelled, void, archived.
- Order Items: draft, awaiting_info, awaiting_proof, awaiting_approval, ready_for_production, in_production, in_qc, ready, completed, rework, on_hold, cancelled.
- Production Tasks: not_started, in_progress, paused, completed, blocked, cancelled.
- Invoices: draft, sent, viewed, partial, paid, overdue, void, written_off.
- Quotes: draft, sent, viewed, accepted, declined, expired, converted.
- Proofs: draft, sent, approved, revision_requested, expired.
- Purchase Orders: draft, sent, acknowledged, partial, received, cancelled.
- Webstores: pending/setup, active, completed/closed, disabled, unavailable.
- Timeclock: active, completed, edited/corrected.

## Canonical Architecture

Build a modular monolith: one deployable frontend and one deployable backend with enforced domain boundaries.

Backend:

- `models/`: Pydantic/domain schemas and value objects only.
- `routes/`: thin validation, authorization, service calls, and responses.
- `services/`: workflows, calculations, status transitions, orchestration, and side effects.
- `repositories/`: database access, queries, persistence, and index behavior.
- `integrations/`: Stripe, email, Meta, object storage, LLMs, and external services.
- `shared/`: money, units, dates, auth, errors, audit, notifications, IDs, and idempotency.
- `server.py`: initialization and router registration only.

Frontend:

- `pages/`: focused route-level pages.
- `components/`: reusable UI.
- `modules/`: domain-specific feature components.
- `ribbon/`: shared Office-style ribbon.
- `context/`: narrow auth, tenant, settings, and page contexts.
- `lib/`: API client, formatters, money/date/unit helpers.
- Use route-level code splitting for authenticated, public, portal, admin, and heavy feature routes.

Global data rules:

- Every tenant-owned authoritative record contains `tenant_id`; every tenant query includes it through shared authorization.
- Tenant-scoped unique indexes begin with `tenant_id`, except intentionally global public slugs.
- Use centralized application-generated IDs, preferably UUIDv7 strings. Never expose Mongo `_id`.
- Persist native timezone-aware UTC datetimes; serialize ISO strings at API boundaries.
- Persist money as integer cents. Use explicit decimal or basis-point rates, never binary floats.
- Mutable aggregates have `created_at`, `updated_at`, and integer `version`.
- Cross-domain references use IDs. Only small immutable snapshots preserve historical truth.
- Prohibit unbounded arrays; use separate collections for activities, messages, files, transactions, tasks, revisions, and audit events.
- Migrated records retain provenance and warnings.
- Use explicit archived/void/disabled states; use soft deletion only when restoration or audit requires it.

## Domains And Shared Systems

Domain ownership:

- Identity: tenants, users, roles, permissions, sessions, invitations, impersonation audit.
- CRM: customers, contacts, notes, files, activity.
- Pricing: Pricing Foundation, category rules, calculators, profiles, templates, snapshots, overrides.
- Sales/Orders: quotes, orders, Order Items, totals, deposits, discounts, lifecycle.
- Production: Work Order Summaries, tasks, stages, proof production state, schedule.
- Billing: invoices, invoice lines, payments, refunds, links, transactions, history.
- Workforce: employees, schedules, timeclock, payroll worksheets, job time, employee portal boundaries.
- Inventory: items, lots, locations, transactions, reservations, shortages, purchasing, POs.
- Documents: files/assets, categories, questionnaires, templates, proof versions, signed URLs, visibility.
- Portals: customer, employee, Webstore owner, partner/B2B, public token, platform admin.
- Ecommerce/Webstores: stores, products, storefronts, Webstore orders, checkout, payouts, owner portal.
- Communications: email, SMS/MMS, templates, conversations, delivery events, notifications.
- AI: AI Hub, prompt library, drafts, summaries, reviewed actions, usage, credits, audit.
- Platform: plans, subscriptions, entitlements, grants, usage counters, support, analytics.

All add-ons reuse shared customers/contacts, quotes/orders/Order Items/invoices, tasks, notes/comments, messages/conversations, calendar/events, notifications, files/documents/assets, activity/audit events, forms/questionnaires, portals, payment foundation, reports, and AI usage tracking. No add-on creates a duplicate universe.

## Required Core Behavior

Orders contain tenant/customer snapshots, source, type, controlled lifecycle, due/fulfillment details, notes, creator and status audit fields. Status and totals are service-derived/read models. Webstore source fields are set at creation.

Order Items retain structured category, quantity, unit, dimensions, material, specifications, artwork, priority, production flag, frozen pricing snapshot, workflow template, assignments, source relation, and activity links.

Work Order Summaries show Order context and production-required Order Items with production rollup, assignees, proof/artwork state, materials, notes, install/packaging/rework details, checklist, and activity. They never compete with Order Items as a sellable aggregate.

Production Tasks reference Order and Order Item, with optional Work Order Summary grouping, stage, controlled status, assignments, estimated/actual minutes, ordering, timestamps, blocks, and activity.

Production Board uses tenant-configurable stages. Proofs use uploaded artwork, versions, public approval/revision token pages, activity, and notifications. Documents and artwork use object storage, signed URLs, explicit visibility, versions, categories, forms, templates, markup/measurements, and before/after photos.

Customers include contact/address/tax/preferences/tags/notes/state/files/activity. Lifetime value is computed from paid invoices. Customer detail tabs: Overview, Orders, Quotes, Invoices, Messages, Files, Portal, Timeline, and Webstore Connections.

Pricing Foundation lives in Settings > Pricing. Pricing Calculator is global, a ribbon action, and embedded in Quote/Order Item flows. Pricing functions are deterministic and side-effect free; sold pricing is frozen in snapshots. Overrides require reason/user/time/audit. Base pricing includes shop rate, materials, labor, markup/overhead/waste, rush, tax, category defaults, common sign categories, calculation breakdown, and snapshots. Smart Pricing Pro adds deeper analysis, live updates, market intelligence, AI recommendations, margins, waste, labor assumptions, complexity, upsells, historical comparisons, and confidence.

Quotes support signed expiring public acceptance and idempotent conversion. Aging quotes surface in Action Required. Invoices use frozen lines; balances derive from payment transactions. Public payment links use signed/random tokens. Stripe/live payouts require webhook verification, idempotency, reconciliation, recovery, refunds/disputes, and disconnect recovery.

## Webstores And Add-Ons

Webstores are protected approved behavior and the first full expansion track, not a late placeholder.

Approved store types: B2B, Fundraiser, Event, Promotional, General. Creator is an optional ownership/payout mode, not a primary type. Donations can apply to any store.

Setup workflow: create and link customer/owner -> send reusable questionnaire/upload requests -> owner completes details -> AI produces reviewed summary and missing-info/product drafts -> admin review -> build catalog/branding/payments -> owner preview/approval -> launch with QR/share/slug/domain/status/tracking/reporting.

WebstoreProduct is separate from InventoryItem and Order Item. Checkout creates WebstoreOrder first, then bridges into canonical Customer, Order, Order Items, Billing, Work Order Summary, and Production Tasks as appropriate. Client-side cart persists locally until confirmed checkout. Public route is `/store/{store_slug}` with globally unique slug. Owner portal exposes store progress, approvals, products, orders, performance, donations, reports, QR/marketing assets, and allowed settings, but never unrelated tenant records, supplier data, or internal costs/margins.

Wrap Command Center is the second full expansion and reuses all shared systems. It covers vehicle intake/questionnaire/photos/measurements, estimating/pricing, proofs/approvals, deposits, scheduling, production, install notes/damage/photos, portal updates, signatures, completion, and warranty/care.

Later gated add-ons: Smart Pricing Pro; AI Tools Pro/higher AI usage; SMS/MMS; Production Timing Pro; Employee Training/Equipment Certification.

## Workforce, Inventory, Portals, Communications, And AI

Team schedule supports multi-employee day/week views. Timeclock is append-only with audited corrections. Final payroll runs freeze rates/hours. Pay periods and overtime are configurable; Donnell tenant defaults may be Sat-Fri, Friday payday, and weekly overtime after 40 hours at 1.5x.

Inventory and purchasing retain early shell/models/contracts/material links and activate after core workflows stabilize. InventoryItem is catalog, InventoryLot is physical batch, and InventoryTransaction is immutable ledger. Support quantity, roll, sheet, remnant, pack, board, case, and needed units. Compute on hand/reserved/available/incoming/shortage/value from ledger and lots. Never mutate on-hand without a transaction. Material requirements link production-required Order Items/Work Order Summaries to inventory and support reserved, pulled, consumed, shortage, returned, and waste. Shortages can create draft PO lines; receiving creates lots/transactions and resolves shortages. Supplier APIs, automatic ordering, AI purchasing, and Webstore inventory reservations are later dependencies.

Every portal is a separate allowlisted security boundary. Public quote/proof/payment/form/signature pages use signed/random tokens, expiration, rate limits, tenant isolation, and audit. Customer communications live in Operations, internal messages in Productivity, and platform/support/community in AI Hub. Notifications are centralized, deduplicated, retryable, preference-aware, auditable, and delivery-event linked.

AI Hub exists from the beginning. AI may draft and recommend early, but permission-filtered deterministic services control mutations. AI never silently changes money, inventory, approvals, refunds, supplier/PO actions, selling prices, permissions, payroll, taxes, or payment state. Mutations require preview, sources, assumptions, affected records, impact, confirmation, and deterministic validation. Charge AI credits idempotently only for completed actions.

Feature flags and entitlements exist from the beginning. Founders status is a commercial grant/price lock, never a feature bypass. Use versioned plan catalog, subscriptions, entitlement grants, and usage counters.

## Release Sequence

### Phase 0: Decisions And Foundation

Approve protected behavior specs, route/navigation/permission matrix, entitlement map, canonical data models, migration mappings, repository structure, CI, indexes, auth, audit, observability, and fixtures.

### Phase 1: Base Shell And Pilot Core

Deliver final shell and Home baseline, Settings, permissions, search/create, customers, Pricing Foundation, Quotes, Orders, Order Items, Work Order Summaries, Production Board, documents, invoices/manual payments, basic portals, and basic productivity.

### Phase 1W: Webstore Preservation Track

In parallel where practical, preserve approved setup, store types, catalog, owner flow, questionnaires, storefront, local cart, and canonical order bridge. Gate unsafe payment dependencies only.

### Phase 2: Webstores Full Expansion

Production-ready Webstores with safe checkout, owner portal, reports, approved store modes, canonical order bridge, and shared portal/document/form/payment foundations.

### Phase 3: Wrap Command Center

Deliver the complete wrap workflow using shared systems.

### Phase 4: Workforce, Productivity, And Financial Control

Employee portal, timeclock, payroll worksheet, advanced productivity, reports, taxes, and expenses.

### Phase 5: Inventory And Purchasing Activation

Ledger-safe inventory, lots, transactions, shortages, material requirements, purchase orders, and receiving.

### Phase 6+: Advanced Add-Ons And Platform Growth

Smart Pricing Pro, AI Tools Pro, SMS/MMS, Production Timing Pro, Training Pro, SaaS subscriptions, platform administration, and public ecosystem.

## Migration, Testing, Security, And Delivery Gates

The old app is a behavior, screenshot, test-data, and migration source only. Reconcile legacy orders/jobs/job_items/job_tickets before cutover. Map legacy Job Tickets to Work Order Summary/production data, LineItem/JobItem to Order Items, and legacy Jobs to Orders. Preserve historical pricing snapshots and legacy Webstore aliases for verified compatibility. Do not maintain permanent dual writes. Every migration has verification, reconciliation, rollback, and tenant-isolation checks.

Every protected behavior gets a behavior spec containing outcomes; exact labels/fields/defaults/validation; states/transitions; calculations; roles; notifications/side effects; recovery/idempotency; acceptance tests; and approved changes.

Required tests: deterministic unit/service/API integration/browser workflows, frontend tests, permission and tenant isolation, financial rounding/cents/taxes/payments/refunds/snapshots, public token validity/expiration/rate-limit/audit, dashboard digest performance, complete Webstore workflow, and migration verification/rollback.

Security and performance gates:

- Explicit production CORS.
- Centralized authorization.
- Manifest-driven named validated indexes; readiness fails without required security/unique indexes.
- Route-level frontend code splitting.
- Decompose large pages early.
- Object storage with signed URLs and streaming.
- Streaming, transaction-safe backup/export/restore.
- Background jobs are idempotent, observable, retryable, and multi-worker safe.
- Portals never expose internal costs, financial fields, supplier data, unrelated records, or owner-only settings.
- Frontend and AI never own authoritative pricing, tax, payroll, inventory, payment, refund, permission, or status transitions.

## Detail Page Patterns

- Customer: Overview, Orders, Quotes, Invoices, Messages, Files, Portal, Timeline, Webstore Connections.
- Order: Overview, Items, Pricing, Proofs, Production/Work Order Summary, Messages, Billing, Files, Timeline.
- Order Item: Overview, Specs, Pricing Snapshot, Artwork/Proofs, Production Tasks, Materials, Files, Timeline.
- Work Order Summary: Overview, Order Items, Artwork, Proofs, Materials, Notes, Tasks/Stages, Activity.
- Webstore: Overview, Setup, Products, Orders, Owner Portal, Payments, Reports, Settings.
- Employee: Overview, Schedule, Time, Payroll, Assigned Work, Portal, Notes.
- Inventory Item: Overview, Stock/Lots, Usage, Vendors, Pricing Links, History.

## Agent Non-Negotiables

- Never restore Job Ticket or Line Item as final user-facing terms.
- Never remove early approved Webstores behavior due to older roadmaps.
- Never duplicate shared platform systems inside add-ons.
- Never ship fake-zero placeholder cards, unsafe portal exposure, or protected behavior without acceptance tests.
- Preserve protected behavior unless unsafe or impossible; clearly flag true conflicts.

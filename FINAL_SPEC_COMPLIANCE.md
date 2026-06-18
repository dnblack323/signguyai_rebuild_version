# Final Controlling Spec Compliance

This file tracks the running preview against `MASTER_AGENT_REBUILD_PLAN.md`.

## Order Portal Manager Direction

- `Order_Portal_Manager_Master_Build_Spec-1.pdf` is now converted into `ORDER_PORTAL_MANAGER_MASTER_SPEC.md`.
- Order Portal Manager by Sign Guy AI is the controlling standalone-first product direction for the former Webstores track.
- Current preview code and UI still use some Webstores naming for compatibility.
- Existing `webstores` routes/services/files should be renamed only through a safe compatibility pass with tests.
- The New Store Wizard exists as a preview and must evolve into the New Portal Wizard.
- The first customer-sellable release must include checkout, Stripe, buyer orders, owner portal, reports, and launch hardening.
- Early MVPs are internal engineering milestones only, not sellable releases.
- Future agents must read `ORDER_PORTAL_AGENT_BUILD_RULES.md` before modifying this area.

## Represented Now

- Final compact shell with icon-only Home entry, Operations, Business, Productivity, AI Hub, and Settings.
- No permanently wide left sidebar. The blue workspace rail is icon-only by default, expands over content only when clicked/touched, and automatically collapses when clicking/touching outside without shifting content.
- Help is a full compact menu opened through the `?` icon. It includes current-page tips and routes to documentation, onboarding, support, bug reports, feature requests, roadmap, and release notes.
- Home is the global Command Center; workspace dashboards are separate contextual foundations.
- Global search, global create, notifications, and compact Office-style Home ribbon.
- Operations top-level navigation is limited to Customers, Quotes, Orders, Production, Approvals, and Doc Library.
- Order Items and Work Order create/download actions live inside Orders. Work Orders and Shop Schedule live inside Production.
- Webstores and Wrap Center use the lower Add-ons rail section; collapsed mode uses icons/tooltips and expanded mode shows labels. Wrap Center uses a vehicle icon.
- Removed the tall workspace/title row; a compact section-information banner now sits directly beneath the ribbon.
- Webstores shown as the first expansion preview, with approved store types in its target description.
- Webstore management is always available in the main app. Publishing and Cart/Checkout are shown as separate feature gates.
- A standalone Webstores-only shell reuses the same Webstores workspace and entitlement model.
- Order Portal Manager is now the standalone-first commercial product direction under `ORDER_PORTAL_MANAGER_MASTER_SPEC.md` and `ORDER_PORTAL_RELEASE_PLAN.md`.
- Standalone Home is operational: setup stores, questionnaires, owner approvals, launch blockers, live stores, new orders, activity, revenue, and stores needing action.
- Webstore top tabs each use a contextual 12-action ribbon. Store type selection appears only inside New Store.
- Standalone capability contracts expose the 5% fee, direct Stripe owner payout, draft preview, and blocked launch-readiness checks.
- Pricing Foundation in Settings and Pricing Calculator as a Business/global action.
- Backend ownership folders: models, routes, services, repositories, integrations, shared.
- Base records include tenant ID, application ID, native UTC datetimes, and version.
- Explicit configurable CORS origin instead of allow-all.

## Contracts Established But Not Production-Complete

- Single dashboard digest endpoint.
- Central permission helper and frontend API helper.
- Honest module availability states.
- Responsive shell and mobile navigation.

## Required Next Implementation Work

- Phase 0 behavior specs, canonical models, repository/index contracts, auth/tenant enforcement, audit, CI, observability, fixtures, and deterministic tests.
- Phase 1 real Customers, Pricing Foundation, Quotes, Orders, Order Items, Work Order Summaries, Production Board, documents, invoices/manual payments, portals, and productivity workflows.
- Parallel Phase 1W Webstore preservation workflow and canonical order bridge.
- Route-level code splitting, frontend test suite, and browser acceptance coverage.

The current application remains a structural preview, not a production-ready implementation.

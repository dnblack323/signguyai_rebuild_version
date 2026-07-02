---
status: current recovery plan
created: 2026-07-01
applies_to: SignGuyAI rebuild current repo state
active_repo: C:\Users\thesi\Documents\GitHub\signguyai_rebuild_version
reference_repo: C:\Users\thesi\Documents\Codex\signguyai-main (4)\codex_signguyai
---

# Rebuild Recovery Plan

This plan picks up from the current rebuild repo state. It does not restart the app.

The rebuild is already past a blank slate. It has a Vite/React app shell, FastAPI backend, tenant-scoped Mongo repository patterns, DocuLink foundation, shared customers, Orders/Order Items, pricing foundation, shared notes/community/AI preview systems, Webstores/Order Portal preview, and Wrap Lab work.

The recovery decision is: keep this work, stop adding new feature depth temporarily, and close the foundation gaps that would make the app unsafe to sell at scale.

## Current Position

The current rebuild is not cleanly sitting in one phase. Work has been completed out of order:

- Release 0 / Phase 1 foundation is partially done.
- Release 1 core workflow is partially done.
- DocuLink is ahead of schedule and should be kept.
- Wrap Lab is ahead of schedule and should be kept as a module/prototype track.
- Webstores / Order Portal has strong specs and a rich preview UI, but not the full production backend.
- Auth, real tenant membership, billing, entitlements, launch gates, observability, and platform admin are still the biggest missing launch foundation.

Do not rebuild from scratch unless the repo becomes technically unrecoverable. It is currently recoverable.

## Evidence Snapshot

Observed backend areas:

- `backend/server.py` includes health, DocuLink, customers, orders, order items, pricing foundation, shared systems, webstores, and wrap lab routers.
- `backend/core_runtime.py` centralizes Mongo and tenant access, but tenant ID still defaults to `preview-shop` from a header.
- `backend/shared/ids.py` provides UUIDv7-style IDs.
- `backend/shared/money.py` blocks float money and converts to integer minor units.
- `backend/shared/indexes.py` contains tenant indexes for customers, DocuLink, orders, pricing foundations, shared systems, and Wrap Lab child records.
- `backend/routes/orders.py` supports orders, order items, activity, files, pricing snapshots, quote drafts, invoice drafts, and work order drafts.
- `backend/routes/doculink.py` supports files, documents, links, shares, and activity.
- `backend/routes/webstores.py` only exposes capabilities and launch-readiness endpoints.
- `backend/routes/shared_systems.py` has community, notes, AI tool catalog, and preview AI generation.

Observed frontend areas:

- `frontend/src/App.jsx` has the main app shell, areas, top bar, ribbon, modals, and standalone modes.
- `frontend/src/components/orders/OrdersWorkspace.jsx` has a functional Orders workspace with items, pricing, files, quotes, invoices, work orders, notes, and activity tabs.
- `frontend/src/components/customers/CustomersWorkspace.jsx` has shared customer create/edit/search.
- `frontend/src/components/doculink/DocuLinkWorkspace.jsx` exists.
- `frontend/src/components/settings/PricingFoundationWorkspace.jsx` exists.
- `frontend/src/components/webstores/WebstoresWorkspace.jsx` is mostly a detailed preview/workspace.
- `frontend/src/components/wrap-lab/WrapLabApp.jsx` and related files exist.

Observed backlog:

- Done: Wrap Lab port.
- Done: data layer hardening.
- Done: Wrap Lab child-record normalization.
- Done: shared current-area child-record normalization.
- Done: DocuLink foundation.
- Done: Orders foundation.

Backlog hygiene issue:

- The completed Orders backlog item still has `assignee: "/root"` and says `Order Items/Job Tickets` in the task description. Clean this up before using backlog as the agent control source.

Verification snapshot:

- Backend compile passed with bundled Python: `python -m compileall backend`.
- Test execution is currently blocked because the available Python runtimes do not have `pytest`, `fastapi`, or `pymongo` installed.
- Frontend build did not run because `frontend/node_modules` is missing.

## Phase Map

| Roadmap Phase | Current Status | What Is Done | What Still Needs Done |
| --- | --- | --- | --- |
| Phase 0: Product shape | Mostly done, with open naming decisions | `PHASE_0_DECISIONS.md` and `PHASE_0_AGENT_MANUAL_OUTLINE.md` exist. Founder pricing and release order are captured. | Final public name for Webstores vs Order Portal Manager. Final production-unit label. Pricing category matrix details. |
| Phase 1: Architecture and data model | Strong partial | FastAPI/Vite shell, Mongo repositories, UUIDv7 IDs, integer money, tenant indexes, normalized child records. | Full schema review against Phase 0, production naming cleanup, environment bootstrap, repeatable verification. |
| Phase 2: Auth, tenant isolation, billing | Not launch-ready | Preview tenant dependency exists. Permission helper exists. Billing docs exist. | Real auth, user accounts, tenant membership, roles, entitlements, founder billing records, Stripe products/coupons, platform fees, tenant isolation tests. |
| Phase 3: Core CRM | Partial | Shared customer records, frontend workspace, customer API. | Real CRM depth: contacts, addresses, activity, tags, import/export, customer portal linkage, duplicate handling. |
| Phase 4: Pricing engine | Partial | Pricing foundation workspace, backend persistence, category schemas, backend pricing snapshots, integer cents. | Complete launch category matrix, owner override reasons, audited overrides, explain-math panel, pricing tests, tenant-specific settings applied to calculations. |
| Phase 5: Production workflow | Early partial | Order items, statuses, work order drafts, production summary concepts. | Rename schema to `production_required`, default rules by item type, automatic production units, production board, production task states, field/mobile view. |
| Phase 6: Customer portal | Mostly missing | DocuLink share concepts and Wrap portal preview concepts exist. | Customer Portal Lite, public auth/magic links, proof approval, structured signatures/drawings, customer-visible files/statuses. |
| Phase 7: Documents/files/templates | Partial and promising | DocuLink foundation, file upload/linking, document records, shares, activity. | Templates, signature request flow, proof approval flow, storage provider hardening, file scanning policy, access control. |
| Phase 8: Employee tools | Mostly not started | Navigation placeholders and preview module status exist. | Time tracking, payroll, employee roles, staff productivity tools. Defer until core workflow is stable. |
| Phase 9: Webstores/add-ons | Spec and UI preview only | Order Portal docs, standalone mode, preview workspace, capability/readiness endpoints. | Real portal CRUD, products, public storefront, cart, checkout, Stripe Connect, owner portal, portal-to-order conversion. |
| Phase 10: AI tools | Preview only | AI tool catalog and preview response persistence exist. | Real AI provider, credit ledger, cost tracking, daily limits, model logging, tenant balance enforcement. |
| Phase 11: Admin/observability/hardening | Mostly missing | Platform admin is listed in Phase 0. Basic health route exists. | Platform admin portal, audit logs, error tracking, logs, backups, rate limits, support tooling, security review. |
| Phase 12: Launch polish | Not started | App has a previewable shell. | QA pass, onboarding, empty states, docs, terms/privacy, production deploy path, monitoring, support process. |

## Resume From Here

The next work should be a Foundation Closure sprint. This is the point where the rebuild gets back under control.

### Step 1: Lock the current repo state

Goal: make sure every future agent knows what exists and can verify it.

Instructions:

1. Keep `signguyai_rebuild_version` as the implementation repo.
2. Keep the older `signguyai` repo as reference only.
3. Add this recovery plan to the docs index.
4. Clean backlog language and stale assignee metadata.
5. Install or document the exact backend/frontend dependencies needed to run tests and builds.
6. Run and record:
   - backend compile
   - backend tests
   - frontend build
   - git status

Exit criteria:

- A future agent can run the same verification commands without guessing.
- Completed backlog items do not contain misleading terminology.
- The docs entry point is clear: Phase 0 decisions, this recovery plan, then module specs.

### Step 2: Close Phase 0 leftovers

Goal: finish the few decisions that affect every future feature.

Needed decisions:

1. Public name: `Webstores`, `Order Portal Manager`, `Order Portals`, or another final label.
2. Production unit label: final UI wording for the production record created from an Order Item.
3. Pricing category matrix: which sign/product categories launch in V1, which are add-ons, and which are manual-only.

Exit criteria:

- `PHASE_0_DECISIONS.md` has no major open decisions that affect schema, nav, pricing, or sales copy.
- All future agents use the same naming rules.

### Step 3: Finish Release 0 foundation before more feature depth

Goal: make the app commercially safe before building deeper modules.

Build order:

1. Auth and users.
2. Tenant membership and role claims.
3. Replace preview tenant headers with authenticated tenant resolution.
4. Role and permission enforcement at route level.
5. Feature flags and entitlements.
6. Founder billing model and Stripe product/coupon plan.
7. Platform fee schedule model.
8. Object storage production config.
9. Email provider foundation.
10. Audit log foundation.
11. Platform creator/admin skeleton.

Exit criteria:

- Tenant isolation tests pass for every protected resource.
- No route relies on `preview-shop` for production behavior.
- Billing/entitlements can decide what a tenant may access.
- Foundation supports Founder Edition without hardcoding temporary promo logic into feature modules.

### Step 4: Repair core workflow naming and schema drift

Goal: align current Orders work with Phase 0 before production depth is added.

Required cleanup:

1. Replace or migrate `production_flow_enabled` to `production_required`.
2. Set defaults by item category:
   - physical products default true
   - fees, delivery, discounts, admin charges, and non-production lines default false
3. Remove user-facing `Job Ticket` wording from active docs/backlog/UI unless it is explicitly historical.
4. Keep `Orders`, `Order Items`, `Production Board`, `Production Tickets`, and `Work Orders` consistent.

Exit criteria:

- New code and docs match Phase 0 terminology.
- Production records are created only from `production_required = true` items.

### Step 5: Complete Release 1 core shop workflow

Goal: finish the deterministic business system before add-ons.

Build order:

1. Customers and contacts.
2. Quote models and quote approval.
3. Quote to Order conversion.
4. Order and Order Item completion.
5. Invoice models and payment-link readiness.
6. Production Board.
7. Document Library templates.
8. Customer Portal Lite.
9. Proof approval.
10. Structured drawings and signatures.
11. Minimal configurable Pricing Calculator.

Exit criteria:

- A shop can run the core flow: `Quote -> Order -> Production -> Invoice`.
- A customer can approve a proof or quote from Customer Portal Lite.
- A non-production fee line does not create production work.

### Step 6: Bring Webstores / Order Portal back in sequence

Goal: turn the preview/spec work into the first real expansion module only after shared systems are ready.

Build order:

1. Portal CRUD.
2. Portal owner records and owner portal access.
3. Products and product templates.
4. Public storefront.
5. Cart and checkout.
6. Stripe Connect.
7. Platform fee ledger.
8. Buyer order to core Order conversion.
9. Owner reports.
10. Launch readiness gates.

Exit criteria:

- A portal order becomes a real core Order.
- Payments, owner payouts, and platform fees are tracked.
- Checkout cannot launch until readiness gates pass.

### Step 7: Keep Wrap Lab but do not let it drive the core rebuild

Goal: preserve useful Wrap Lab progress while the foundation catches up.

Instructions:

1. Keep Wrap Lab as an add-on/module track.
2. Reuse shared customers, files, pricing, AI, and portal systems.
3. Do not duplicate CRM, DocuLink, billing, auth, or tenant logic inside Wrap Lab.
4. Revisit Wrap Lab after Release 1 core flow and Release 0 foundation are stable.

Exit criteria:

- Wrap Lab remains functional.
- Shared systems are reused instead of forked.

## What Not To Do Next

Do not start over.

Do not build payroll, QuickBooks, Twilio, full AI, multi-location, or advanced analytics yet.

Do not build more Webstores checkout depth before auth, entitlements, billing, and Stripe Connect architecture are in place.

Do not build production-board depth until the `production_required` schema rule is corrected.

Do not treat preview UI as backend-complete.

## Next Agent Task

The next agent should perform this exact task:

```text
Create the Foundation Closure backlog item and complete Step 1 from REBUILD_RECOVERY_PLAN.md:
link the recovery plan in docs, clean stale backlog language/assignee metadata, install or document verification dependencies, then run backend compile, backend tests, frontend build, and report the current pass/fail state.
```

After that is done, the next task should be Step 2: close the remaining Phase 0 naming and pricing-category decisions.

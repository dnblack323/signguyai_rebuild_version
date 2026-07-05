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

## Source Boundaries For Phase 0

Phase 0 should settle cross-app decisions and agent routing. It should not re-spec every module.

Use this source order:

1. Current user instruction in the active thread.
2. Module-specific rebuild docs for implementation rules inside one module.
3. `PHASE_0_DECISIONS.md` for product-wide scope, release order, terminology, launch integrations, and launch gates.
4. This recovery plan for current repo-state sequencing.
5. Architecture maps and older/live-app inspections as comparison inputs, not automatic tasks.

Module-specific rebuild sheets live at:

```text
C:\Users\thesi\OneDrive\1 SignGuyAi OS\0REBUILD\all EMERGENT MD FILES\MODULE SPECS MDS\
```

Those sheets own module details such as Auth, Tenants/Organizations, Users/Roles/Permissions, Settings, Orders, Pricing, Webstores, AI, Platform Admin, and similar module behavior. Phase 0 may point to those sheets and record cross-module dependencies, but should not duplicate their endpoint lists, field-by-field rules, or UI workflows.

The architecture map source is:

```text
C:\Users\thesi\OneDrive\1 SignGuyAi OS\0REBUILD\all EMERGENT MD FILES\SIGNGUY_AI_ARCHITECTURE_MAP.md
```

Use it as an architecture/navigation recommendation map. Compare each recommendation against the current rebuild before applying it.

Already satisfied in the current rebuild:

- The old flat 13-tab navigation has already been replaced by grouped workspaces in `frontend/src/data.js`.
- The duplicate `frontend/src/context` and `frontend/src/contexts` folder issue is not present; the rebuild currently uses `frontend/src/context`.
- The old unused `PricingPage.js` / `PricingPagePublic.js` cleanup does not apply; those files were not found in the rebuild.
- Backend Order Item routes are already mounted as `/api/order-items`, not `/api/job-tickets`.

Recently resolved cross-cutting Phase 0 drift:

- Order Item payload/patch models now use canonical `production_required`.
- Work order draft generation only snapshots Order Items where `production_required = true`.
- Category-aware defaults now set physical product items to production-required by default and service/non-production items to false unless explicitly overridden.

Still relevant as cross-cutting Phase 0 drift:

- Active backlog/docs should not use `Job Ticket` wording unless explicitly discussing legacy compatibility.
- `DOCS_INDEX.md` must route agents to module specs and architecture sources before new module work begins.

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

Backlog hygiene note:

- The completed Orders backlog item had stale `assignee: "/root"` metadata and legacy combined Order Item wording. This was cleaned during Phase 0 control-doc alignment so active backlog language now follows `Order Items`.

Verification snapshot:

- Backend compile passes with bundled Python: `python -m compileall backend`.
- Focused Orders tests pass with bundled Python: `python -m unittest tests.test_orders_api`.
- Full backend unittest discovery passes with bundled Python: `python -m unittest discover tests`.
- Frontend production build passes from `frontend/`: `npm.cmd run build`.
- `git diff --check` currently reports only Windows line-ending warnings on edited files.

## Phase Map

| Roadmap Phase | Current Status | What Is Done | What Still Needs Done |
| --- | --- | --- | --- |
| Phase 0: Product shape | Mostly done, with open naming decisions | `PHASE_0_DECISIONS.md` and `PHASE_0_AGENT_MANUAL_OUTLINE.md` exist. Founder pricing and release order are captured. | Final public name for Webstores vs Order Portal Manager. Final production-unit label. Pricing category matrix details. |
| Phase 1: Architecture and data model | Strong partial | FastAPI/Vite shell, Mongo repositories, UUIDv7 IDs, integer money, tenant indexes, normalized child records, repeatable backend/frontend verification. | Full schema review against Phase 0 and production environment bootstrap. |
| Phase 2: Auth, tenant isolation, billing | Not launch-ready | Preview tenant dependency exists. Permission helper exists. Billing docs exist. Current-tenant profile read/update exists without login/user provisioning. | Real auth, user accounts, tenant membership, role claims, entitlements, founder billing records, Stripe products/coupons, platform fees, tenant isolation tests. |
| Phase 3: Core CRM | Partial | Shared customer records, frontend workspace, customer API. | Real CRM depth: contacts, addresses, activity, tags, import/export, customer portal linkage, duplicate handling. |
| Phase 4: Pricing engine | Partial | Pricing foundation workspace, backend persistence, category schemas, backend pricing snapshots, integer cents. | Complete launch category matrix, owner override reasons, audited overrides, explain-math panel, pricing tests, tenant-specific settings applied to calculations. |
| Phase 5: Production workflow | Early partial | Order items, statuses, work order drafts, production summary concepts, `production_required` schema, and category-aware production defaults. | Automatic production units beyond draft snapshots, production board, production task states, field/mobile view. |
| Phase 6: Customer portal | Mostly missing | DocuLink share concepts and Wrap portal preview concepts exist. | Customer Portal Lite, public auth/magic links, proof approval, structured signatures/drawings, customer-visible files/statuses. |
| Phase 7: Documents/files/templates | Partial and promising | DocuLink foundation, file upload/linking, document records, shares, activity. | Templates, signature request flow, proof approval flow, storage provider hardening, file scanning policy, access control. |
| Phase 8: Employee tools | Mostly not started | Navigation placeholders and preview module status exist. | Time tracking, payroll, employee roles, staff productivity tools. Defer until core workflow is stable. |
| Phase 9: Webstores/add-ons | Spec and UI preview only | Order Portal docs, standalone mode, preview workspace, capability/readiness endpoints. | Real portal CRUD, products, public storefront, cart, checkout, Stripe Connect, owner portal, portal-to-order conversion. |
| Phase 10: AI tools | Preview only | AI tool catalog and preview response persistence exist. | Real AI provider, credit ledger, cost tracking, daily limits, model logging, tenant balance enforcement. |
| Phase 11: Admin/observability/hardening | Early partial | Basic health route exists. Platform Admin backend skeleton can list tenants, update tenant account/billing status, record platform admin audit events, and report tenant launch-readiness checks without implementing login or impersonation flows. | Platform admin frontend portal, impersonation after Emergent-owned auth, error tracking, logs, backups, rate limits, support tooling, security review. |
| Phase 12: Launch polish | Not started | App has a previewable shell. | QA pass, onboarding, empty states, docs, terms/privacy, production deploy path, monitoring, support process. |

## Resume From Here

The next work should be a Foundation Closure sprint. This is the point where the rebuild gets back under control.

### Step 1: Lock the current repo state

Goal: make sure every future agent knows what exists and can verify it.

Instructions:

1. Keep `signguyai_rebuild_version` as the implementation repo.
2. Keep the older `signguyai` repo as reference only.
3. Keep `DOCS_INDEX.md` as the entry point for Phase 0, the recovery plan, module specs, and architecture source maps.
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
- The docs entry point is clear: Phase 0 decisions, this recovery plan, module specs, and architecture maps.

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

This step is module-owned implementation work. Use the Auth, Tenants/Organizations, Users/Roles/Permissions, Settings, Billing, and Platform Admin rebuild sheets where available instead of inventing rules from this recovery plan.

Build order:

1. Auth and users.
2. Tenant membership and role claims. Current-tenant profile storage is done; membership/user provisioning waits for Emergent-owned auth/login work.
3. Replace preview tenant headers with authenticated tenant resolution.
4. Role and permission enforcement at route level.
5. Feature flags and entitlements.
6. Founder billing model and Stripe product/coupon plan.
7. Platform fee schedule model.
8. Object storage production config.
9. Email provider foundation.
10. Audit log foundation.
11. Platform creator/admin skeleton. Backend tenant status/audit/readiness foundation is done; frontend portal and impersonation wait for Emergent-owned auth/login work.

Exit criteria:

- Tenant isolation tests pass for every protected resource.
- No route relies on `preview-shop` for production behavior.
- Billing/entitlements can decide what a tenant may access.
- Foundation supports Founder Edition without hardcoding temporary promo logic into feature modules.

### Step 4: Repair core workflow naming and schema drift

Goal: align current Orders work with Phase 0 before production depth is added.

This step is Orders/Production module work. Phase 0 only defines the canonical naming rule; the actual schema/API/UI migration belongs to the Orders/Production spec-backed task.

Required cleanup:

1. Replace or migrate `production_flow_enabled` to `production_required`. Done for active API/frontend code, with repository read normalization for old saved records.
2. Set defaults by item category. Done in backend rules and mirrored in the Orders UI:
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

Do not build production-board depth until the `production_required` cleanup remains verified and Release 0 tenant/auth/permission foundations are ready to protect the workflow.

Do not treat preview UI as backend-complete.

## Next Agent Task

The next agent should perform this exact task:

```text
Create the next module-owned Release 0 foundation task from the module rebuild sheets:
start with Auth + Tenants + Users/Roles/Permissions, replace preview tenant assumptions through the spec-backed auth/tenant/user path, then prove tenant isolation and route permission tests.
```

Current Codex-thread constraint: the user asked Codex to hold off on creating logins and related account flows because Emergent will handle that part. Codex work should stay on non-login foundation closure unless the user changes that boundary.

Do not start deeper feature work until the module-owned Release 0 foundation is complete.

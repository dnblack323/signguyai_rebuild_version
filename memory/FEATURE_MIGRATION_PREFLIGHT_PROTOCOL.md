# SignGuyAI Rebuild — Feature Migration Preflight Protocol

> **MANDATORY**: This protocol MUST be run (all 6 sections) before implementing ANY feature/module
> that is being ported or rebuilt from the original legacy repository
> (`github.com/dnblack323/signguyai`) into the rebuild application (`signguyai_rebuild_version`,
> this repo). Do not begin coding a legacy-sourced feature until Sections 1-4 are produced and,
> where scope/risk warrants it, reviewed with the user. This file is the source of truth for that
> process — read it fully before starting any legacy feature migration and follow it every time.

> **STEP 0 — ALWAYS DO THIS FIRST**: Before running this protocol (or implementing ANY plan at
> all), check the CURRENT rebuild repo's own documentation for existing decisions/specs on the
> feature, in this order:
> 1. `/app/DOCS_INDEX.md` (source precedence rules — always check this first)
> 2. `/app/PHASE_0_DECISIONS.md`, `/app/PHASE_0_AGENT_MANUAL_OUTLINE.md`, `/app/REBUILD_RECOVERY_PLAN.md`
> 3. `/app/.backlogmd/work/*/index.md` and task files — shows what's already been built/decided and why (many Release 0 items are marked `status: done` with explicit scope notes, e.g. "do not build full password login until module-specific specs exist")
> 4. Any module-specific root doc relevant to the feature (e.g. `ORDER_PORTAL_*.md` for Webstores, `CURRENT_APP_AREAS_AND_TABS.md` for navigation/IA)
> 5. `/app/memory/PRD.md` and `/app/memory/*.md` (this session's own accumulated notes/decisions)
> 6. Only THEN fall back to the legacy repo's `memory/*_REBUILD_DOC.md` blueprints for business-logic behavior not already decided in the current repo's own docs.
> Never implement a plan based only on the legacy repo or only on assumption — the current rebuild
> repo's own docs/backlog take precedence per the Source Precedence rules in `DOCS_INDEX.md`.

> **STEP 0b — LEGACY REPO `memory/` FOLDER IS THE WELL-DOCUMENTED SOURCE FOR BUSINESS LOGIC**
> (Pricing, Quotes, Orders, Invoices, etc.). Per the user's explicit instruction, this folder is
> heavily documented — check it thoroughly, do not skip straight to writing code. Confirmed file
> index for the highest-priority "core features first" areas (`github.com/dnblack323/signguyai/memory/`):
> - **Orders/Quotes**: `orders_spec.md` (17KB), `NEW_ORDER_WORKFLOW_REBUILD_DOC.md` (41KB) — no
>   separate dedicated "quotes" doc was found; Quote→Order conversion behavior is expected to live
>   inside these two. Verify this assumption during the Quotes preflight audit and flag it if wrong.
> - **Pricing**: `pricing_spec.md` (37KB), `pricing_quiz_spec.md` (26KB — intake questionnaire that
>   feeds pricing), `PHASE_0_PRICING_DECISIONS_FORMULA_GOVERNANCE.md` (130KB — the pricing formula
>   governance doc), `TIER_SYSTEM_AUDIT_REPORT.md`, `TIER_CONFIG_DEPRECATION_PLAN.md` (tier system
>   problems + how the legacy app deprecated its own broken tier config — read before touching
>   Plans/Tiers/Founders billing).
> - **Invoices**: `INVOICE_FEE_STORAGE_ANALYSIS.md` (6KB).
> - **"Avoid repeating the same mistakes" sources (read these for EVERY feature, not just once)**:
>   `RUNNING_ISSUE_TRACKER.md` (39KB — running log of real bugs/issues hit during the legacy build),
>   `remaining_code_issues.md` (known unresolved issues), `PRELAUNCH_PLATFORM_GAPS.md`,
>   `PRELAUNCH_CHECKLIST.md`, `PRELAUNCH_OPEN_ITEMS_TRACKER.md`, `MASTER_HISTORY.md` /
>   `SESSION_HISTORY.md` / `CHANGELOG.md` (historical record of what broke and why). Cross-reference
>   the feature being migrated against these before finalizing the "Problems Found" section of the
>   audit (Section 3.5 below) — do not rediscover a bug the legacy team already documented.
> - Full file listing fetched via `https://api.github.com/repos/dnblack323/signguyai/contents/memory`
>   — re-fetch this if a needed doc isn't listed above, since this list is not exhaustive of every
>   file (60+ files exist covering AI, Webstores, Wrap Lab, Settings, Files, Email, Inventory, etc.).

---

FEATURE / MODULE TO REVIEW:
[INSERT FEATURE OR MODULE NAME]

IMPORTANT:
The original repository is a reference source, not a blueprint.
Do not blindly copy old code, old UI, old routes, old database structures, old terminology, or old workflows just because they already exist.
Your job is to inspect the original implementation, identify the useful business behavior, uncover technical or architectural problems, then rebuild the feature cleanly using the new application architecture.

The goal is:
- Preserve useful behavior.
- Remove bad patterns.
- Avoid duplicate systems.
- Prevent tenant, security, portal, billing, and data problems.
- Build the feature so it can scale with the rest of SignGuy AI.

==================================================
## SECTION 1: NON-NEGOTIABLE REBUILD RULES

Follow these rules before reviewing or implementing anything:

- Use the rebuild application's existing architecture whenever possible.
- Do not create parallel systems for: authentication, tenant ownership, users or permissions, customers, documents, file uploads, notifications, messaging, forms, questionnaires, signatures, settings, audit logs, AI credits, Stripe or payments, shared UI components, API patterns, database conventions.
- Extend existing rebuild systems instead of creating duplicate systems.
- Use the required SignGuyAI terminology: **Quote converts to Order. Order contains one or more Order Items. Production receives a Work Order Summary.** Do not use "Job Ticket" as the main term — replace old "Job Ticket" terminology with Order Item or Work Order Summary where appropriate.
- Do not recreate old duplicate pages, duplicate routes, duplicate menus, duplicate dashboards, or duplicate workflows.
- Do not carry over old UI layouts simply because they work. Use the current rebuild navigation, current design system, current shared components, and current page patterns.
- Every feature must respect: tenant isolation, role permissions, portal visibility rules, audit history, loading states, error states, empty states, validation, responsive design, duplicate submission prevention.
- Do not create frontend-only security. All permissions, tenant checks, ownership rules, and portal access controls must be enforced on the backend.
- Any status change that affects an Order, Quote, Invoice, Approval, Production item, Webstore order, Wrap project, or other important record must create an audit/history entry.
- Do not hardcode: tenant IDs, user IDs, emails, URLs, prices, categories, status values, permissions, integration keys, branding values.
- Keep the feature modular. Do not build one giant page, one giant API route, one giant service file, or one giant database object that tries to control unrelated behavior.
- Before implementation, inspect how this feature connects to shared SignGuyAI systems, including where relevant: Customers, Orders, Order Items, Quotes, Invoices, Payments, Production, Work Order Summaries, DocuLink, Files/attachments, Forms/questionnaires, Signatures, Messaging, Email/SMS, Notifications, Tasks, Calendar, Inventory, Purchasing, Pricing, Webstores, Wrap Lab, AI tools, AI credits, User roles, Customer portal, Employee portal, Webstore owner portal, Webstore manager portal, Platform admin, Settings, Analytics, Audit logs.

==================================================
## SECTION 2: ORIGINAL REPOSITORY INVESTIGATION

Inspect the original repository for everything connected to this feature. Search for: routes, pages, subpages, frontend components, backend routes, controllers, services, utilities, hooks, stores, contexts, reducers, database schemas, collections, models, migrations, API calls, forms, validation, status logic, workflow logic, permissions, route guards, portal access, tenant filtering, uploads, attachments, documents, notifications, emails, SMS/MMS, automation, integrations, tests, old versions, duplicate versions, deprecated routes, dead code, hidden dependencies, feature flags, legacy redirects.

Do not stop at the first file that appears related. Trace the feature end-to-end from: UI entry point → frontend state → API request → backend logic → database storage → related modules → notifications/automation → portal visibility → reporting/analytics impact.

Note: the legacy repo's `memory/*_REBUILD_DOC.md` files (already discovered — Auth, Tenants/Organizations, Users/Roles/Permissions, Settings, New Order Workflow, Email/SendGrid, File Uploads/Attachments, Inventory/Purchasing/Vendors, Business Finance/Reporting/Analytics, Activity Log/Audit Trail, AI Workspace, Adoption/Help/Community, Webstore Master) are pre-written blueprints for many modules — check there FIRST before manually re-tracing legacy code end-to-end, since much of Section 2/3 may already be documented there.

==================================================
## SECTION 3: FEATURE MIGRATION PREFLIGHT AUDIT

Before implementing anything, produce a Feature Migration Preflight Audit using this exact structure:

1. **FEATURE PURPOSE** — what it does, who uses it, business problem solved, internal/customer-facing/employee-facing/portal-facing/public-facing/platform-admin-only, whether it should remain in the rebuild.
2. **ORIGINAL SOURCE MAP** — all important original files/routes/APIs/DB entities/components/services/integrations, grouped by frontend, backend, database, integrations, shared systems, portals, legacy or duplicate code.
3. **CURRENT DATA MODEL** — main entities, important fields, relationships, ownership rules, tenant rules, user rules, status fields/transitions, linked records, required audit history, uploaded files/documents, portal visibility fields, records that should be archived instead of deleted.
4. **FEATURE DEPENDENCIES** — what it depends on, what depends on it, shared systems it must reuse, possible circular dependencies, modules that could break if changed.
5. **PROBLEMS FOUND IN THE ORIGINAL IMPLEMENTATION** — duplicate pages/routes/logic, old terminology, confusing UI flow, inconsistent field names/status values, missing validation/tenant filters, weak or frontend-only permissions, insecure portal access, incorrect ownership rules, hardcoded values, bad data model, missing audit logs/error handling, poor loading/empty states, inefficient queries, missing indexes, duplicate record risks, race conditions, broken integrations, dead code, unused fields, legacy redirects, missing mobile usability, hidden dependencies, logic belonging in another shared system.
6. **KEEP / REBUILD / REMOVE DECISIONS**:
   - KEEP — business rules/workflows/data/behavior worth preserving.
   - REBUILD — things that stay but need better architecture/UX/data structure/security.
   - REMOVE OR DEPRECATE — legacy routes, duplicate screens, dead code, outdated terminology, unnecessary fields, confusing workflows, broken behavior to leave behind.
7. **REBUILD RECOMMENDATION** — route structure, page structure, reusable UI components, backend endpoints, service layer, DB entities/relationships, permission model, tenant isolation model, audit logging requirements, notification requirements, document/file connections, portal access rules, integration boundaries, analytics/reporting effects, reusable shared systems that must be used.
8. **RISKS BEFORE IMPLEMENTATION** — tenant crossover, permission leaks, incorrect portal access, data loss, duplicate records, broken Order relationships, broken payment mapping, billing errors, missing audit history, file exposure, migration conflicts, integration failures, regression in other modules.
9. **REQUIRED ACCEPTANCE TESTS** — tenant isolation, permissions, role access, backend authorization, form validation, loading/error/empty states, create/edit/archive-or-delete flows, duplicate prevention, status changes, audit history, file handling, linked records, notifications, portal access, mobile responsiveness, integration failures, related-module regression checks.

==================================================
## SECTION 4: IMPLEMENTATION PLAN

After the audit is complete, create an implementation plan covering: what's preserved, what's rebuilt differently, what's removed/deprecated, exact routes/frontend files/backend files to create or modify, database changes, API changes, permission changes, portal changes, integration changes, shared components/services reused, data migration needs, test plan, rollback/safety considerations.

**Do not begin coding until the audit and implementation plan are complete.**

==================================================
## SECTION 5: IMPLEMENTATION RULES

- Build the feature inside the new rebuild architecture. Reuse existing shared systems.
- Do not copy large blocks of old code without refactoring. Do not recreate legacy duplicate UI.
- Do not introduce new terminology that conflicts with SignGuyAI terminology.
- Keep frontend, backend, database, and permissions cleanly separated.
- Add audit logging for important actions and status changes.
- Add validation on both frontend and backend.
- Add useful loading, empty, success, and error states. Prevent duplicate submissions. Make the feature responsive.
- Ensure all related records remain tenant-safe. Ensure all portal-visible data is intentionally filtered and protected.
- Add or update tests before marking the feature complete.

==================================================
## SECTION 6: REQUIRED DELIVERY FORMAT

Return work in this order: Feature Migration Preflight Audit → Original Source Map → Problems Found → Keep/Rebuild/Remove Decisions → Proposed Rebuild Architecture → Exact Implementation Plan → Files to Create or Modify → Database Changes → API Changes → Permission and Tenant Isolation Rules → Portal Rules → Integration Requirements → Required Acceptance Tests → Legacy Code/Routes/Components/Fields That Can Be Deprecated → Implementation Summary After Completion.

**Final reminder**: The purpose is not to make the new app behave exactly like the old app. The purpose is to preserve the useful feature behavior while removing duplicate systems, security risks, legacy clutter, confusing UX, weak architecture, and future maintenance problems.

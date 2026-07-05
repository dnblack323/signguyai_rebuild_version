# TENANTS, ORGANIZATIONS & MULTI-TENANT ARCHITECTURE — Rebuild Documentation

## Module Status
- [x] Existing and working (Tenant creation via self-registration, suspension/reactivation, settings save, platform-admin tenant list/detail, onboarding checklist)
- [x] Existing but incomplete (Platform-admin-initiated tenant creation — only exists as "Promote User to New Tenant," and it is disabled by default; no way to create a brand-new empty tenant with no pre-existing user)
- [x] Existing but broken (`PUT /admin/tenant/{id}/plan`, legacy `/tenant/{id}/tier`, and `POST /admin/tenant/{id}/reset-usage` — confirmed 500 crash, see §12)
- [ ] Partially built / prototype
- [ ] Planned only
- [x] Needs replacement ("Settings merge" pattern is actually a full-field overwrite disguised as a merge; `owner_email` vs. `role=owner` desync; three separate/inconsistent "founder slot" counters)
- [x] Needs verification (items called out inline below)

**Documentation Date:** 2026-07-02
**Completed By:** E1 (AI Agent) — direct code inspection + live API verification (one bug reproduced live against the running preview backend with a real token, traceback captured from `backend.err.log`), no screenshots used.
**Repository / Branch Reviewed:** `/app/` (current preview checkout, main branch per `.emergent` metadata)
**Related App Version / Deployment:** Preview environment (current `REACT_APP_BACKEND_URL`); production tenant referenced in `test_credentials.md` (`thesigntistslab@gmail.com`, role `platform_creator`, tenant "The Signtists Lab")

> **Method note:** Every claim below was verified by reading the actual file or by a live `curl` call against the running backend (not inferred from UI). Files read in full or in relevant ranges: `backend/models/auth.py` (Tenant/TenantBase/TenantCreate/TenantUpdate models, full), `backend/models/enums.py` (`UserRole`, `TenantPlan`, full), `backend/routes/auth.py` (register, login, setup-admin, admin user-management sections, full), `backend/routes/platform_admin.py` (entire file, 1451 lines — tenant list/detail/suspend/reactivate/delete/mark-paid/dunning/promote-to-tenant/broadcast-email), `backend/routes/tiers.py` (plan/tier admin endpoints), `backend/server.py` (`/api/tenant` GET/PUT/logo routes, `startup_migrations`), `backend/core_runtime.py` (`generate_tenant_slug`, `get_password_hash` — used to confirm an adjacent bcrypt-rehash quirk noted in §12), `backend/routes/billing.py` (founder-count/founder-number logic, grep-level), `backend/services/founders_config.py` (grep-level), `frontend/src/pages/CompanySettings.js` (settings-save call sites), `frontend/src/pages/PlatformAdmin.js` (tenant list screen), `frontend/src/pages/PlatformAdminTenantDetail.js` (tenant detail screen, promote-to-tenant UI), `frontend/src/context/PlanContext.js` (full), `frontend/src/context/AuthContext.js` (grep-level, confirmed no tenant object is cached client-side). **Live verification:** logged in as the platform_creator test account, called `PUT /api/tiers/admin/tenant/{own_tenant_id}/plan?plan=os_pro` against the real preview backend → received `500 Internal Server Error`; confirmed root cause via `tail /var/log/supervisor/backend.err.log` (`AttributeError: SETTINGS_EDIT`).

---

## 1. Module Identity

### Module Name
Tenants, Organizations, and Multi-Tenant Architecture.

### Alternate / Legacy Names
- Code and comments universally call this a **"Tenant"** (`db.tenants`, `Tenant` model, `tenant_id` field everywhere). The word **"Organization"** does not exist anywhere in the backend as a distinct entity, model, or collection — it only appears as UI copy/form-field labels inside the *Webstores* module (e.g., "Organization / Cause Name" on fundraiser questionnaires) and inside `models/questionnaires.py` form templates. **There is no `Organization` model separate from `Tenant`.** In this app, "Tenant" *is* "Organization" — one company/shop = one tenant = one row in `db.tenants`.
- "Company" is the informal name used in code comments (`# Self-registration always creates a new tenant (company)...`) and in the `company_name` field that lives on `User`, not `Tenant` (see §5 — this is a real duplication).

### Primary Purpose
Represent one sign/graphics shop (a "company") as a single isolated data boundary. Every tenant-scoped collection (`users`, `orders`, `invoices`, `customers`, `jobs`, `webstores`, etc.) carries a `tenant_id` foreign key back to this module's core `Tenant` document. This module owns: how a tenant is born (registration), how it is identified/branded (name, address, logo, branding settings), how it is suspended/reactivated/deleted (platform governance), and how its configuration (payroll, time-tracking, employee-portal, branding settings) is stored and updated.

### Main Users
- **Shop Owner** (`role=owner`) — the only role that can edit tenant settings (`PUT /api/tenant`) or upload/remove the tenant logo.
- **Admin / Staff** — read tenant data implicitly (via any tenant-scoped request) but cannot edit tenant-level settings.
- **Platform Admin / Platform Creator** — the only roles that can list all tenants, view any tenant's detail, suspend/reactivate/delete a tenant, override its plan/dunning threshold, mark it paid, broadcast email its owner, or (subject to a disabled feature flag) move a user into a brand-new tenant.
- **The self-registering visitor** — an unauthenticated person hitting `/register` is, functionally, the only real "Create Tenant" actor in the entire system today (see §2).

### Why This Module Matters
Every tenant-scoped query in the entire application (`{"tenant_id": current_user.tenant_id}`) depends on this module's `Tenant.id` being correct, unique, and properly gated by `is_active`. If a tenant's `is_active` flag or `tenant_id` linkage is wrong, it either (a) locks a real, paying customer out of their own data, or (b) — in the worst case — lets one tenant's data leak into another's queries. This module is also the **billing/plan anchor**: `tenant.plan`, `tenant.is_founder`, and `tenant.founder_number` gate what features a shop can use (consumed by the Plans/Tiers module) and what the shop should be charged (consumed by the Billing/Stripe module).

### Module Boundary
**This module owns:**
- The `Tenant` document itself: identity fields (`name`, `slug`, `owner_email`, `phone`, `address`, `city`, `state`, `zip_code`, `country`, `website`, `logo_url`), plan/founder fields (`plan`, `is_founder`, `founder_number`, `founder_locked_at`), and the nested settings objects (`time_tracking_settings`, `payroll_settings`, `employee_portal_settings`, `signature_settings`, `branding_settings`, `default_tax_rate`, `assistant_personality`, `assistant_skip_confirm`).
- Tenant creation (as a side-effect of user self-registration — there is no standalone "create tenant" flow today).
- Tenant identity read/update (`GET /api/tenant`, `PUT /api/tenant`, logo upload/delete).
- Platform-Admin tenant governance: list, detail, suspend, reactivate, permanently delete, mark-paid override, dunning-threshold override, onboarding checklist, promote-user-to-new-tenant, broadcast email to owners.
- Tenant suspension/reactivation *state* (`is_active`, `suspension_reason`, `suspended_at`/`_by`, `reactivated_at`/`_by`) — the *enforcement* of this state (blocking login/requests) is owned jointly with the Auth module (see `AUTH_MODULE_REBUILD_DOC.md` §2 and §6, which already documents the two enforcement points).

**This module does not own:**
- Who is logged in / password verification / JWT issuance — owned by the Auth module (this doc only covers the `Tenant` side of the `tenant_id` relationship, not `User` credentials).
- The actual subscription/payment logic (Stripe checkout, webhooks, invoicing) — owned by Billing (this module only stores the *result* fields — `plan`, `is_founder`, `founder_number`, dunning counters — that Billing writes into the `Tenant` document).
- Feature-gating logic itself (what a given `plan` unlocks) — owned by the Tiers/Plans module (`services/plan_configs.py`, `services/feature_gate.py`); this module only stores which plan a tenant is on.
- Webstore-specific "organization/fundraiser" concepts (store name, cause name, `store_slug`) — those are Webstore module data, not Tenant module data, despite using similar vocabulary ("organization").
- Impersonation mechanics — owned by Auth/Platform Admin's impersonation endpoints (this doc references them only where a Platform Admin action touches the `Tenant` document directly, e.g., suspend/reactivate).

---

## 2. Current State Summary

### What Exists Today
A tenant is a single MongoDB document in `db.tenants`. There is **exactly one way** a tenant gets created in the entire live application: a visitor submits `POST /api/auth/register`, which (a) always creates a brand-new `Tenant`, (b) always makes the registrant its `owner`, and (c) always starts a 48-hour free trial. There is no other public or platform-admin-facing path that creates a tenant from a blank slate. A second, narrower creation path exists in code — `POST /platform-admin/users/{user_id}/promote-to-tenant` — but it does not create a tenant "from scratch"; it *moves an existing user* out of their current tenant into a brand-new one, and it is **disabled by default** (`ENABLE_PROMOTE_TO_TENANT` env var, unset in this environment).

Once created, a tenant is identified/edited through `GET/PUT /api/tenant` (self-service, Owner-only, always scoped to `current_user.tenant_id` — a tenant can only ever edit itself, never another tenant, which is correctly enforced here). Platform Admins separately manage the full universe of tenants through `routes/platform_admin.py`: list (with search), detail, suspend, reactivate, permanently delete (with full cross-collection data wipe), mark paid (dunning override), set a per-tenant dunning threshold, and broadcast email to owners by audience segment.

"Organization" is not a first-class concept — the Tenant document *is* the organization. "Tenant switching" (one human user moving between multiple tenants without logging out) does not exist anywhere in the code; a `User.tenant_id` is set once and is never something the user themself can change. The closest analogs are Platform-Admin-only, staff-facing tools: impersonation (temporary, logs you in *as* a different user in a different tenant) and promote-to-tenant (permanent, one-way, disabled by default).

### What Works Well
- Tenant creation via self-registration is atomic-enough in practice: tenant → credits → credit-transaction → user → sample data, all in sequence, with only the last (sample data) step allowed to fail silently (documented already in the Auth doc). Confirmed no orphaned-tenant-without-user code path exists.
- Tenant self-edit (`PUT /api/tenant`) correctly scopes to `current_user.tenant_id` — there is no way for one tenant's Owner to edit a *different* tenant's settings through this endpoint (verified: the endpoint takes no `tenant_id` parameter at all, it always uses the caller's own).
- Platform-Admin tenant suspend/reactivate/delete/mark-paid/dunning-threshold actions are **all** wrapped in `log_admin_action(...)` calls with rich metadata (actor, target, tenant, summary, before/after values) — this is a genuinely well-built, consistent audit pattern and should be the template for every other Platform-Admin write action in the rebuild.
- Suspend has a real self-lockout guard: you cannot suspend a tenant that contains a `platform_admin` user (prevents a platform admin from accidentally locking themselves out).
- Delete has a real self-lockout guard: a Platform Admin cannot delete *their own* tenant.
- Reactivate optionally sends a real, non-stub "You're back" email to the tenant owner (`send_tenant_reactivated_email`, confirmed implemented, not a placeholder) and gracefully reports email failure without blocking the reactivation itself.
- Broadcast-email-to-owners has real safeguards: SendGrid-not-configured pre-check, per-actor hourly rate limiting via an audit-log-driven counter (no extra collection needed), per-recipient placeholder personalization with HTML-escaping (XSS-safe), dedupe-by-email (so a human who owns two tenants isn't emailed twice), and a `test_to` preview mode before a real blast. This is a mature, well-thought-out feature.
- The onboarding checklist (19 default items, idempotent creation, dedupe-by-key-keeping-latest) is solid and gives Platform Admin/Sales a real customer-onboarding tracking tool.

### What Is Broken, Confusing, or Incomplete
- **CRITICAL, CONFIRMED LIVE — `PUT /api/tiers/admin/tenant/{tenant_id}/plan`, its legacy alias `PUT /api/tiers/admin/tenant/{tenant_id}/tier`, and `POST /api/tiers/admin/tenant/{tenant_id}/reset-usage` are completely non-functional.** All three call `Permission.SETTINGS_EDIT`, which **does not exist** on the `Permission` enum (only `SETTINGS_VIEW` and `SETTINGS_MANAGE` exist). Every call raises an uncaught `AttributeError` and returns `HTTP 500`. **Reproduced live** against the running preview backend with a valid `platform_creator` token — confirmed via `backend.err.log` traceback (`File "/app/backend/routes/tiers.py", line 316, in set_tenant_plan ... AttributeError: SETTINGS_EDIT`). This means **no one can change a tenant's plan or reset its usage counters today through this endpoint**, despite the endpoint existing, being routed, and presumably being relied upon by whatever admin UI calls it.
- **Latent cross-tenant IDOR waiting behind the bug above.** These three endpoints take `tenant_id` as a free path parameter and check only a *generic* permission (`SETTINGS_EDIT`/`SETTINGS_MANAGE`) via a lightweight, duplicate JWT-decode dependency (`get_current_user_dep`, defined locally in `tiers.py`, a **fifth** independent re-implementation of "decode the JWT and load the user" beyond the four already catalogued in the Auth doc) — **not** the `require_platform_admin` dependency used everywhere else in `platform_admin.py`. There is no check anywhere in this function that `tenant_id == current_user.tenant_id`. If a future fix simply swaps `SETTINGS_EDIT` for `SETTINGS_MANAGE` without adding a platform-admin or same-tenant guard, **any regular tenant Owner/Admin with `SETTINGS_MANAGE` would be able to change or reset the usage of any other tenant in the entire system** by guessing/enumerating tenant IDs. This must be fixed as a security requirement, not just a crash fix.
- **`is_founder` shown to Platform Admins is silently always `False`, even for real founder tenants.** `_enrich_with_founder_flag()` (used by both `list_tenants` and `get_tenant_detail`) computes `is_founder` by counting `db.users.count_documents({"tenant_id": ..., "is_founder": True})`. But **no code path in the entire backend ever sets `is_founder=True` on a `User` document** — grepped exhaustively, zero writes found. The real founder flag lives exclusively on the **`Tenant`** document (`tenants.is_founder`, set by `routes/auth.py`'s `setup-admin` bootstrap and by `routes/billing.py`'s Stripe checkout success handlers). This means every Platform Admin tenant list/detail view has been showing `is_founder: false` for founder tenants since this helper was written — a confirmed, silent, cosmetic-but-important data bug.
- **Three different, inconsistent "how many founder slots are left" counters exist simultaneously:** (1) `services/founders_config.py`'s `FOUNDERS_EDITION_MAX_CUSTOMERS`, checked against `db.tenants.count_documents({"plan": "founders_edition"})` — used only inside `register()` to stamp a `founders_spots_remaining` snapshot onto a brand-new trial tenant at signup time (a number that is never refreshed again after that one write); (2) `routes/billing.py`'s `MAX_FOUNDER_ACCOUNTS`, checked against `db.tenants.count_documents({"is_founder": True})` — used for real Stripe-checkout founder-pricing availability; (3) a separate atomically-incrementing `db.founder_counter` collection used only to assign the human-readable sequential `founder_number` (e.g., "Founder #47"). These three systems count different fields, may use different max-value constants, and there is no guarantee they ever agree with each other. A tenant's `plan` field can say `"free_trial"` while its `is_founder` field is `true` (these are independent booleans set by independent code paths at independent times), so counter (1) and counter (2) are not counting the same population.
- **`tenant.slug` is generated at creation (`generate_tenant_slug`) but is never read by any other code path in the entire backend.** Grepped every route file: zero lookups by `tenants.slug`. It is pure dead weight on every tenant document today (not a bug, just wasted/misleading data — looks like it should power a public URL like `signguy.ai/shop/{slug}` but nothing does).
- **"Settings merge" is not actually a merge — it is a full-field overwrite that only *looks* like a merge because the frontend always sends a complete object.** `PUT /api/tenant` iterates the incoming `TenantUpdate` body and, for any nested Pydantic-typed field (`branding_settings`, `time_tracking_settings`, `payroll_settings`), calls `.model_dump()` on it and `$set`s the **entire nested object** at once (see §6 for the mechanism and §12 for the concrete failure scenario). There is no MongoDB dot-notation partial-field update anywhere in this endpoint.
- **`tenant.owner_email` and `User.role == owner` are two completely independent, unsynchronized pieces of data.** `owner_email` is written once at tenant creation and is only ever changed again via a manual `PUT /api/tenant` call (Owner-editable, plain text field, no validation that it matches a real user in the tenant) or via the disabled `/auth/setup-admin` bootstrap tool. Meanwhile, `admin_update_user_role` lets an Owner promote *any number* of other users to `role=owner` with zero effect on `tenants.owner_email`. Consequences: (a) a tenant can have 2+ users with `role=owner` simultaneously (only the *last remaining* owner is protected from deletion — there is no cap preventing many owners); (b) every system communication that reads `tenant.owner_email` (suspension/reactivation notices, broadcast email, Stripe billing emails) can silently keep going to a person who is no longer actually using the account, while a different person now holds the "owner" role day-to-day.
- **`company_name` is duplicated across two different collections with two different lifecycles.** `Tenant.name` is the canonical company name shown everywhere (billing emails, Platform Admin lists, suspension notices). But `User.company_name` is a *separate*, independently-editable field (set at registration, editable via `PUT /users/me`) that is not the same value and is not kept in sync with `Tenant.name`. Nothing currently reconciles these two — if a user changes their own `company_name` via profile settings, `Tenant.name` is untouched, and vice versa.
- **No standalone "create a brand-new tenant with no pre-existing user" tool exists for Platform Admin / Sales.** The only tenant-creation mechanism reachable by staff is `promote_user_to_tenant`, which requires an existing `User` document to already exist and move — it cannot spin up a tenant + owner from scratch the way self-registration can. Any sales-assisted onboarding today must ask the customer to self-register first.
- **No tenant-name uniqueness check.** `Tenant.name` has zero uniqueness constraint at the model or database level — two shops can register with the identical company name, and nothing in the platform disambiguates them beyond the internal UUID `id`.

### Placeholder / Demo / Fake Data
- No mocked/fake tenant data was found in the live code paths themselves. Test/demo tenants exist only as ordinary rows created the ordinary way (self-registration) using `*@example.com` addresses documented in `test_credentials.md`.
- The `promoted_from_tenant_id`/`promoted_at`/`promoted_by_platform_admin` fields written by `promote_user_to_tenant` are real audit fields, not placeholders — but since the feature is disabled by default, no tenant in a typical environment will ever have them populated.

### Features That Exist in Code but Are Not Visible
- `PUT /platform-admin/tenants/{tenant_id}/dunning-threshold` — fully implemented backend endpoint (per-tenant override of the auto-suspend-after-N-failed-payments threshold) — **Needs Verification**: no confirmed UI call-site found for this specific endpoint in the files reviewed this session; it may only be reachable via direct API/curl today.
- `founders_spots_remaining` snapshot written onto every new trial tenant at registration time — computed once, stored, and (per grep) never read back by any other route. Effectively dead data from the moment it's written.

### Features Visible in the UI but Not Actually Functional
- **"Promote to New Tenant" button, `PlatformAdminTenantDetail.js`.** The button, confirmation dialog, and API wiring are all fully built and correctly call `POST /platform-admin/users/{user_id}/promote-to-tenant`. But the backend endpoint is gated behind `ENABLE_PROMOTE_TO_TENANT=1`, which is **not set** in this (or, per the code comment, any default) environment. A Platform Admin who clicks this button today will receive a clear 403 ("Promote-to-tenant is disabled...") rather than a silent failure — better than most dead-endpoint patterns in this app, but still a UI action that cannot succeed out of the box.

---

## 3. User Experience and Navigation

### Where the Module Lives in the App
**Top-Level Area:** Split across two very different audiences — (1) a single settings page for the tenant's own Owner (`/settings` → Company/Business tab), and (2) a dedicated Platform Admin area (`/platform-admin/*`), not part of the normal tenant-facing ribbon nav at all.
**Subsection:** Tenant self-service lives inside `CompanySettings.js` (business info, branding, payroll, time-tracking, employee-portal, signature sections all update the same `Tenant` document via repeated `PUT /api/tenant` calls, one per section). Platform governance lives entirely under `/platform-admin`.

**Routes / URLs:**
| Route | Screen | Auth required |
|---|---|---|
| `/register` | Login.js (register mode) | No — this is the *only* tenant-creation entry point in the app |
| `/settings` (Company/Business tab) | CompanySettings.js | Yes, Owner (edit) / any authenticated tenant user (view) |
| `/platform-admin` | PlatformAdmin.js (tenant list) | Yes, `platform_admin`/`platform_creator` |
| `/platform-admin/tenants/:tenantId` | PlatformAdminTenantDetail.js | Yes, `platform_admin`/`platform_creator` |

### Current Navigation Structure
No tabs or sub-navigation exist specifically for "Tenant" as a concept on the tenant-facing side — it's folded into `CompanySettings.js`'s general settings tabs (Business Info, Branding, Payroll, Time Tracking, Employee Portal, Signatures), each with its own "Save" button that independently `PUT`s one settings key. On the Platform Admin side, `PlatformAdmin.js` is a flat searchable list (by name or owner email) linking into `PlatformAdminTenantDetail.js`, which itself has section blocks (tenant info, users, suspend/reactivate controls, dunning, checklist, promote-to-tenant) rather than tabs.

### Recommended Rebuild Navigation Structure
**Recommended main pages:**
1. `/settings/company` — tenant identity + branding (split out of the current all-in-one `CompanySettings.js`, per the earlier Architecture Map's Settings-consolidation recommendation)
2. `/platform-admin/tenants` — keep as the canonical tenant list (already well-structured)

**Recommended detail pages:**
1. `/platform-admin/tenants/:tenantId` — keep the current section-block layout; consider splitting "Governance" (suspend/reactivate/delete/dunning) from "Onboarding" (checklist) into two tabs, since the page has grown to 1127 lines covering distinct concerns.

**Recommended tabs or sections:** On the tenant self-service side, keep the existing per-concern sections (Business Info / Branding / Payroll / Time Tracking / Employee Portal / Signatures) — they map cleanly onto the `Tenant` model's own nested settings objects, which is a genuinely sensible 1:1 structure worth preserving.

### Screens in This Module

**Screen Name: Register (Tenant Creation)**
- Route: `/register` (renders inside `Login.js`)
- Who Can Access It: Anyone (public)
- Purpose: The only way a new Tenant document is ever created by a real customer
- Main Information Shown: Full Name, Company Name (optional — defaults to `"{full_name}'s Sign Shop"` if left blank), Email, Password
- Primary Actions: Create Account
- Data Source: `POST /api/auth/register` (documented in depth in `AUTH_MODULE_REBUILD_DOC.md` §4 Workflow 1; this doc covers only the `Tenant`-document side-effects)
- Related Screens: Dashboard (redirect target), CompanySettings (where the tenant can later be renamed/configured)
- Current Problems: No duplicate-name check; `founders_spots_remaining` is written once and never refreshed; company name entered here can immediately drift from `User.company_name` if either is edited later
- Rebuild Recommendation: Keep the "always creates exactly one tenant, registrant is always owner" model — it's simple and correct — but add a duplicate-name warning (not a hard block, since two real shops can share a name) and stop persisting the one-time-stale `founders_spots_remaining` snapshot

**Screen Name: Company Settings (tenant self-service)**
- Route: `/settings` (Business/Company tab)
- Who Can Access It: Any authenticated tenant user can view; only `role=owner` can save (enforced server-side on every section's `PUT /api/tenant` call)
- Purpose: Edit the tenant's identity, branding, and operational settings
- Main Information Shown: Name/address/phone/website, logo, branding colors, payroll cycle defaults, time-tracking toggles, employee-portal permission toggles, e-signature settings
- Primary Actions: Save (per section — six independent save actions, not one global save)
- Data Source: `GET /api/tenant`, `PUT /api/tenant` (×6, one per section), `POST/DELETE /api/tenant/logo`
- Related Screens: UserManagement (role management, which silently does *not* update `owner_email` here — see §12)
- Current Problems: Each section save is a full-object overwrite of that one nested field (not a true per-key merge); no confirmation/diff shown before saving; no audit log entry is created for any of these saves (contrast with Platform Admin's fully-audited tenant actions)
- Rebuild Recommendation: Either move to true partial/dot-notation updates, or explicitly document (and keep) the "frontend always sends the full object" contract as an intentional design decision — but not both half-implemented as today; add at minimum a lightweight audit trail for tenant-settings changes (who changed what, when), matching the rigor already present on the Platform Admin side

**Screen Name: Platform Admin — Tenant List**
- Route: `/platform-admin`
- Who Can Access It: `platform_admin`/`platform_creator` only
- Purpose: Browse/search all tenants in the system; quick view of plan, user count, active/suspended status; delete access
- Main Information Shown: Name, owner email, plan, created date, user count, suspended badge
- Primary Actions: Search, click-through to detail, Delete (with confirm)
- Data Source: `GET /platform-admin/tenants?search=`
- Related Screens: PlatformAdminTenantDetail
- Current Problems: `is_founder` field returned by this list's underlying detail call is always `false` (see §2); no "Create Tenant" action exists here at all
- Rebuild Recommendation: Fix the founder-flag bug; consider whether a genuine "create tenant for a customer" tool belongs here (currently the only related tool, promote-to-tenant, lives one level deeper on the detail page and requires an existing user)

**Screen Name: Platform Admin — Tenant Detail**
- Route: `/platform-admin/tenants/:tenantId`
- Who Can Access It: `platform_admin`/`platform_creator` only
- Purpose: Full tenant governance — view users, suspend/reactivate, mark paid, set dunning threshold, manage onboarding checklist, promote a user to a new tenant
- Main Information Shown: Tenant profile fields, dunning/payment-failure state, user list, onboarding checklist progress
- Primary Actions: Suspend, Reactivate, Mark Paid, Set Dunning Threshold, Impersonate (a user), Promote to New Tenant, update checklist items
- Data Source: `GET /platform-admin/tenants/{id}`, plus one endpoint per action listed above
- Related Screens: PlatformAdmin (list), impersonation banner (after Impersonate)
- Current Problems: "Promote to New Tenant" button is wired to a disabled-by-default endpoint (403 on click, see §2); `is_founder` shown here is always false (same root cause as the list screen)
- Rebuild Recommendation: Either enable promote-to-tenant with proper safeguards or remove the button until it's a supported workflow; fix the founder-flag computation to read `tenants.is_founder` directly instead of a `users.is_founder` field that nothing ever sets

---

## 4. Main User Workflows

### Workflow 1: New Tenant Is Born (Self-Registration Side Effect)
**User Goal:** Start using SignGuy AI for my sign shop.
**Starting Point:** `/register`.

**Step-by-Step User Flow:**
1. Fill in Full Name, optional Company Name, Email, Password.
2. Submit.
3. Land directly on `/dashboard` — the new tenant already exists, fully configured with defaults, with sample data pre-populated.

**System Actions Behind the Scenes:**
1. Compute `founders_spots_remaining` = `FOUNDERS_EDITION_MAX_CUSTOMERS` − `count(tenants where plan == "founders_edition")` (a one-time snapshot, see §2 for why this is misleading long-term).
2. Build `Tenant(name=company_name, slug=generate_tenant_slug(company_name), owner_email=email)` — every other `Tenant` field takes its Pydantic default (e.g., `plan=TenantPlan.STARTER` from the model default, immediately overwritten to the raw string `"free_trial"` in the next step — see §5 for why this bypasses the `TenantPlan` enum entirely).
3. Overwrite `plan`, `plan_name`, `trial_started_at`, `trial_ends_at`, `is_trial`, `founders_spots_remaining` directly onto the dict before insert (these fields are **not** part of the `TenantBase`/`Tenant` Pydantic model at all — they are bolted on ad hoc via raw dict mutation, so they exist in the database but are invisible to the `Tenant` model's own schema/validation).
4. Insert into `db.tenants`.
5. Insert `user_credits` + `credit_transactions` (50 trial AI credits).
6. Insert the `User` document with `role=owner`, `tenant_id` pointing at the new tenant.
7. Attempt `create_sample_data_for_tenant()` — failure here is swallowed and logged only.

**Data Created or Changed:** 1 `tenants` doc, 1 `users` doc, 1 `user_credits` doc, 1 `credit_transactions` doc, N sample-data docs.
**Notifications / Emails / SMS Sent:** None (no welcome email — already flagged in the Auth doc).
**Required Approvals or Signatures:** None.
**Workflow Completion Condition:** Tenant + owner both exist and are queryable; access token issued.
**Failure or Error Conditions:** Duplicate `User.email` (400) — note there is **no** duplicate check on `Tenant.name` or `Tenant.owner_email`, only on `User.email`.
**Current Problems:** `plan`/`plan_name`/`trial_*`/`founders_spots_remaining` fields exist only as raw dict keys bolted onto the Pydantic model's `model_dump()` output — reading this tenant back through the `Tenant` Pydantic model (as `platform_admin.py`'s `TenantDetail(**tenant)` does) works today only because `TenantDetail` separately re-declares `plan: str` as a loose string field and `model_config = ConfigDict(extra="ignore")` on `Tenant` silently drops anything it doesn't recognize when re-validated elsewhere — a fragile pattern that will break the moment someone tries to re-parse a raw tenant dict through the *base* `Tenant` model with stricter config.
**Rebuild Requirement:** Formalize `plan`, `plan_name`, `trial_started_at`, `trial_ends_at`, `is_trial` as real typed fields on the `Tenant` model (not ad hoc dict keys) so every consumer of a tenant document gets a consistent, validated shape; use the real `TenantPlan` enum value (add a `FREE_TRIAL` member) instead of the untyped string `"free_trial"`.

---

### Workflow 2: Owner Suspends... Wait — Platform Admin Suspends a Tenant
**User Goal:** (Platform Admin) Stop a delinquent or abusive tenant from using the app.
**Starting Point:** `/platform-admin/tenants/:tenantId` → Suspend action.

**Step-by-Step User Flow:**
1. Platform Admin enters a required suspension reason.
2. Confirms.
3. Tenant detail view immediately reflects `is_active=false` + reason + timestamp.

**System Actions Behind the Scenes:**
1. Reject if reason is blank/whitespace-only.
2. Reject if the tenant contains any `platform_admin`-role user (self-lockout guard).
3. No-op with a friendly message if already suspended (idempotent).
4. `$set` `is_active=false`, `suspension_reason`, `suspended_at`, `suspended_by`/`_email`, and **clear** `reactivated_at`/`_by`/`_email` back to `None` (so a tenant suspended a second time doesn't show a stale prior reactivation).
5. Write a full `log_admin_action` entry.
6. Return the fully updated `TenantDetail`.

**Data Created or Changed:** `tenants.is_active` + suspension metadata; 1 `admin_audit_log` entry.
**Notifications / Emails / SMS Sent:** **None** — confirmed no email is sent to the tenant owner on suspension (asymmetric with reactivation, which does send an email; see Current Problems).
**Required Approvals or Signatures:** None — a single Platform Admin click is sufficient.
**Workflow Completion Condition:** `tenants.is_active == false`; next login or authenticated request for anyone in that tenant is blocked (enforcement lives in the Auth module, already documented there).
**Failure or Error Conditions:** Empty reason (400), tenant not found (404), tenant contains a platform_admin (400).
**Current Problems:** No notification email to the tenant on suspension, while reactivation *does* email — an inconsistent transparency experience; a suspended tenant's owner only discovers the suspension the next time they try to log in and get bounced to `/account-suspended` (Auth module's screen).
**Rebuild Requirement:** Decide, as a product decision, whether suspension should proactively notify the owner (parity with reactivation) or intentionally remain silent (e.g., for fraud/abuse cases where advance notice is undesirable) — currently this asymmetry looks accidental rather than intentional.

---

### Workflow 3: Platform Admin Reactivates a Tenant
**User Goal:** Restore access after resolving a payment issue or dispute.
**Starting Point:** `/platform-admin/tenants/:tenantId` → Reactivate action.

**Step-by-Step User Flow:**
1. Platform Admin optionally adds a note and chooses whether to notify the owner (defaults to yes).
2. Confirms.
3. Tenant immediately shows `is_active=true`.

**System Actions Behind the Scenes:**
1. No-op with friendly message if already active (idempotent).
2. `$set` `is_active=true`, clear all suspension fields, set `reactivated_at`/`_by`/`_email`.
3. Write a full `log_admin_action` entry (captures the *previous* suspension reason in metadata for history).
4. If `notify_owner` (default true), send the real "You're back" SendGrid email; log (but do not fail the request on) email-send errors.

**Data Created or Changed:** `tenants.is_active` + reactivation metadata; 1 `admin_audit_log` entry; 1 outbound email (optional).
**Notifications / Emails / SMS Sent:** "You're back" email to `tenant.owner_email` (real, confirmed implemented).
**Required Approvals or Signatures:** None.
**Workflow Completion Condition:** `tenants.is_active == true`; owner can log in again immediately.
**Failure or Error Conditions:** Tenant not found (404); already-active is a soft no-op, not an error.
**Current Problems:** The reactivation email always goes to `tenant.owner_email`, which — per §2's ownership-desync finding — may not be the email of whoever is actually running the shop day-to-day if ownership has informally changed hands without updating that field.
**Rebuild Requirement:** Keep this workflow's structure (idempotent, audited, optional real email) as the template for the rebuild's suspend workflow too, once the notify-on-suspend decision above is made.

---

### Workflow 4: Owner Edits Tenant Settings (the "Merge" in Question)
**User Goal:** Change my shop's branding colors (or payroll cycle, or time-tracking toggles, etc.) without affecting anything else.
**Starting Point:** `/settings` → any settings section → Save.

**Step-by-Step User Flow:**
1. Owner opens, e.g., the Branding section — the form is pre-populated by merging the tenant's saved `branding_settings` (if any) over a hardcoded frontend `DEFAULT_BRANDING` object (client-side merge, done in `CompanySettings.js`).
2. Owner changes one field (e.g., `primary_color`).
3. Clicks Save for that section only.
4. Frontend sends `PUT /api/tenant` with a body containing **only** the key for that one section (e.g., `{ "branding_settings": { ...the entire local component state object... } }`) — note this already includes every field of that section's local state, not just the one the user touched, because the frontend keeps the whole section as one JS object in memory.

**System Actions Behind the Scenes:**
1. Backend receives the request body and parses it into a `TenantUpdate` Pydantic model. Any field the frontend didn't include in the top-level JSON (e.g., `payroll_settings` wasn't sent because this was the Branding form) stays `None` on `TenantUpdate` and is correctly skipped (`if v is not None`) — **top-level field isolation works correctly**.
2. For the field that *was* sent (`branding_settings`), FastAPI/Pydantic constructs a full `BrandingSettings` instance from whatever keys were present in the JSON, and **fills in the model's own class-level defaults for every key that was missing** from the JSON.
3. The code then calls `.model_dump()` on that instance and `$set`s the **entire resulting dict** onto `tenants.branding_settings`, replacing the whole nested object in one shot.
4. `updated_at` is bumped; the merged tenant doc is returned.

**Data Created or Changed:** One nested field (`branding_settings`, `payroll_settings`, etc.) on the `Tenant` document, replaced wholesale.
**Notifications / Emails / SMS Sent:** None.
**Required Approvals or Signatures:** None.
**Workflow Completion Condition:** `GET /api/tenant` on next load reflects the new values.
**Failure or Error Conditions:** None specific — a malformed nested payload would fail Pydantic validation (422) before reaching the database, which is at least a safe failure mode.
**Current Problems (this is the "merge behavior" the user asked about, stated precisely):** *As long as the frontend always sends every field of a settings section every time* (which it does today, because each section keeps a complete local-state object), this full-replace pattern is functionally harmless — no data is silently lost in the app's current, single-frontend, single-form-per-section reality. **The risk is latent, not active:** (a) if a new field is ever added to `BrandingSettings`/`PayrollSettings` on the backend but the corresponding frontend local-state object isn't updated to include it, saving from that form will silently reset the new field to its Pydantic default on every save from that screen, permanently discarding whatever value a *different* code path (e.g., a future admin tool, or a second settings screen) had set for it; (b) two people saving two different settings sections concurrently is safe today (different top-level keys), but two browser tabs saving the *same* section concurrently is a last-write-wins full overwrite with no conflict detection — the second save silently discards the first tab's change, even for fields the first tab explicitly set and the second tab never touched.
**Rebuild Requirement:** Pick one deliberate strategy and apply it everywhere: either (a) keep full-object-per-section saves but add an explicit code comment/contract that "frontend MUST always send the complete section object" plus a backend test asserting that omitted fields fall back to the *previous stored value*, not the Pydantic default, or (b) switch to true partial updates using MongoDB dot-notation (`{"$set": {"branding_settings.primary_color": "#123456"}}`) so a partial payload only ever touches the keys it explicitly names. Option (b) is safer and is the recommended default unless there's a strong reason to keep (a).

---

### Workflow 5: Platform Admin Moves a User Into a Brand-New Tenant ("Promote to Tenant")
**User Goal:** Correct a mistake where someone signed up under a team-invite link but should have their own company/tenant.
**Starting Point:** `/platform-admin/tenants/:tenantId` → click a user → "Promote to New Tenant."

**Step-by-Step User Flow:**
1. Platform Admin clicks the action next to a specific user inside a tenant's user list.
2. Enters a name for the brand-new tenant.
3. Confirms an explicit warning dialog (which correctly explains: only the user record moves; no orders/customers/invoices follow; the old tenant keeps everything else).
4. **Today: receives a 403** — "Promote-to-tenant is disabled. Set ENABLE_PROMOTE_TO_TENANT=1 to enable." (feature flag is off; see §2).

**System Actions Behind the Scenes (when enabled):**
1. Feature-flag check (`ENABLE_PROMOTE_TO_TENANT`).
2. Validate `new_tenant_name` (required, ≤120 chars).
3. Look up the target user; refuse if they're a `platform_admin`; refuse (409) if they're already the owner of their current tenant (nothing to do).
4. Insert a brand-new `Tenant` document (raw dict, **not** built through the `Tenant`/`TenantBase` Pydantic model — a second, independent tenant-creation code path with its own field set, distinct from `register()`'s) with `promoted_from_tenant_id`/`promoted_from_user_id`/`promoted_at`/`promoted_by_platform_admin` breadcrumbs.
5. Flip the user's `tenant_id` to the new tenant and `role` to `"owner"`.
6. Write a full `log_admin_action` entry.

**Data Created or Changed:** 1 new `tenants` doc; `users.tenant_id`/`role` updated on the moved user. **No other collection is touched** — the user's old orders/customers/invoices/etc. (if they created any while acting inside the old tenant) stay behind in the old tenant, orphaned from the user's new perspective.
**Notifications / Emails / SMS Sent:** None.
**Required Approvals or Signatures:** None beyond the single Platform Admin confirmation dialog.
**Workflow Completion Condition:** New tenant exists; user's `tenant_id` points at it.
**Failure or Error Conditions:** Feature disabled (403), missing/oversized name (400/400), user not found (404), user is a platform_admin (400), user already owns their current tenant (409).
**Current Problems:** Feature-flagged off by default with a fully-built, fully-wired UI in front of it (see §2's "visible but not functional" finding); the new-tenant insert bypasses the `Tenant` Pydantic model entirely (a third code path, alongside `register()`'s and any future one, that can drift from the model's actual schema/defaults over time).
**Rebuild Requirement:** Route this (and `register()`) through one single, shared `create_tenant()` helper function so there is exactly one place that knows how to correctly construct a valid `Tenant` document — eliminating the current situation where two independent insert call-sites can silently diverge in which fields they set.

---

## 5. Data Structure and Records

### Primary Records Owned by This Module
| Record Type | Purpose | Created By | Edited By | Deleted By | Related Modules |
|---|---|---|---|---|---|
| `Tenant` | The company/organization boundary for all tenant-scoped data | Self-registration (`register()`); Platform-Admin promote-to-tenant (disabled by default) | Owner (`PUT /api/tenant`, logo endpoints); Platform Admin (suspend/reactivate/mark-paid/dunning); Billing module (plan/founder fields via Stripe webhooks) | Platform Admin/Creator only (`DELETE /platform-admin/tenants/{id}`) | Every tenant-scoped module in the app |
| `OnboardingChecklistItem` | Platform-Admin/Sales-facing onboarding progress tracker per tenant | Auto-created (19 defaults) on first checklist view | Platform Admin (`PATCH .../checklist/{item_id}`) | Not deletable via this module | Platform Admin |
| `founder_counter` (singleton doc) | Atomic sequential founder-number assignment | Auto-upserted on first founder purchase | `increment_founder_count` (atomic `$inc`) | Never | Billing |

### Database Collections / Tables

**Collection: `tenants`**
- Purpose: One document per company/shop.
- File or Schema Location: `models/auth.py` (`TenantBase`, `TenantCreate`, `TenantUpdate`, `Tenant`) — **Needs Verification/Known Gap**: several fields written in practice (`plan_name`, `trial_started_at`, `trial_ends_at`, `is_trial`, `founders_spots_remaining`, `suspension_reason`, `suspended_at`/`_by`/`_email`, `reactivated_at`/`_by`/`_email`, `payment_failed_count` and other dunning fields, `promoted_from_tenant_id`, `is_platform_owner`, `dunning_failure_threshold`) are **not declared anywhere** on the `TenantBase`/`Tenant` Pydantic model — they exist only as ad hoc dict keys written directly by `routes/auth.py`, `routes/platform_admin.py`, and `routes/billing.py`. The model's `extra="ignore"` config means re-parsing a tenant document through the base `Tenant` model silently drops all of these; only `platform_admin.py`'s separate, hand-maintained `TenantDetail` response model happens to redeclare most (not all) of them.
- Primary ID Field: `id` (UUID string)
- Tenant / Shop ID Field: N/A — this collection *is* the tenant
- Important Fields (declared): `name`, `slug`, `owner_email`, `phone`, `address`, `city`, `state`, `zip_code`, `country`, `website`, `logo_url`, `plan`, `product_line`, `is_active`, `is_founder`, `founder_number`, `founder_locked_at`, `time_tracking_settings`, `payroll_settings`, `employee_portal_settings`, `signature_settings`, `branding_settings`, `default_tax_rate`
- Important Fields (undeclared but written in practice — see gap above): `plan_name`, `trial_started_at`, `trial_ends_at`, `is_trial`, `founders_spots_remaining`, `suspension_reason`, `suspended_at`, `suspended_by`, `suspended_by_email`, `reactivated_at`, `reactivated_by`, `reactivated_by_email`, `payment_failed_count`, `first_payment_failure_at`, `last_payment_failure_at`, `last_payment_succeeded_at`, `auto_suspended_for_payment`, `grace_period_until`, `dunning_failure_threshold`, `is_platform_owner`, `promoted_from_tenant_id`, `promoted_from_user_id`, `promoted_at`, `promoted_by_platform_admin`, `subscription_status`
- Required Fields (per model): `name`, `slug`, `owner_email`
- Optional Fields: everything else
- Status Fields: `is_active` (bool)
- Date Fields: `created_at`, `updated_at` (plus the many undeclared date fields above)
- Relationships: Every other tenant-scoped collection's `tenant_id` → `tenants.id`
- Indexes: **Needs Verification** — no explicit index-creation code found in the files reviewed for `tenants.id`, `tenants.owner_email`, or `tenants.slug`. A missing unique index on `id`/`owner_email` is lower-risk than on `users.email` (already flagged in the Auth doc) since `id` is a UUID and collisions are astronomically unlikely, but still worth confirming directly against the DB.
- Known Data Problems: See §2 in full (undeclared-field schema drift, `owner_email`/role desync, duplicate `company_name` between `Tenant.name` and `User.company_name`, dead `slug` field, three inconsistent founder counters, `plan` stored as an untyped raw string that bypasses `TenantPlan`).
- Rebuild Recommendation: Formalize **every** field the application actually writes onto the real `Tenant` Pydantic model (no more silent extras); pick one single `create_tenant()` factory function used by both registration and promote-to-tenant; decide and enforce a single source of truth for "who owns this tenant" (either sync `owner_email` automatically on every role change, or deprecate `owner_email` in favor of always resolving "the current owner(s)" live from `users.role == owner`).

**Collection: `onboarding_checklist`**
- Purpose: Per-tenant Platform-Admin/Sales onboarding tracking.
- File or Schema Location: `routes/platform_admin.py` (`OnboardingChecklistItem` model; raw dict inserts)
- Primary ID Field: `id`
- Tenant / Shop ID Field: `tenant_id`
- Important Fields: `item_key`, `label`, `completed`, `note`, `updated_by`/`_email`, `order`
- Known Data Problems: The dedupe-by-`item_key`-keep-latest logic in `get_tenant_checklist` implies duplicate items *can* be created (otherwise there would be nothing to dedupe) — **Needs Verification** of the exact race condition that produces duplicates (likely two concurrent `ensure_checklist_exists` calls both seeing `count == 0` before either insert completes), but the defensive dedupe-on-read masks it rather than preventing it at the write layer.
- Rebuild Recommendation: Add a unique compound index on `(tenant_id, item_key)` to prevent the duplicate-creation race at the database level instead of filtering it out on every read.

### Data Relationships
```
Tenant (1) ←──── tenant_id ──── User (N)   [role: owner (N possible), admin, staff]
Tenant (1) ←──── tenant_id ──── Customer (N), Employee (N), Order (N), Invoice (N), ... [every other tenant-scoped module]
Tenant (1) ──── owner_email (plain string, NOT a foreign key) ──── (intended to be) the User with role=owner, but never validated/synced
Tenant (1) ──── company_name-equivalent data duplicated on ──── User.company_name (independent field, independently editable)
PlatformAdmin User ──── suspend/reactivate/delete/mark-paid/dunning-threshold/promote ──── Tenant (any tenant)
```

### Source of Truth
| Data Item | Current Source of Truth | Problems | Recommended Rebuild Source |
|---|---|---|---|
| The company's display name | `tenants.name` (mostly) but also `users.company_name` (independently) | Two fields, two lifecycles, never reconciled | `tenants.name` only; remove or make `users.company_name` a read-only computed mirror |
| Who "the owner" is | `tenants.owner_email` (string) vs. `users.role == "owner"` (can be N users) | Completely decoupled; no sync on role change | Resolve "owner(s)" live from `users` where `role == owner`; if a single "primary contact" concept is still needed, make it an explicit `primary_owner_user_id` FK that's automatically updated on ownership-transfer, not a hand-typed email string |
| Is this tenant a "founder" | `tenants.is_founder` (real) — **not** `users.is_founder` (never set, but read by `_enrich_with_founder_flag`) | Platform Admin views read the wrong field | Read `tenants.is_founder` directly; delete the dead `users.is_founder` check |
| How many founder slots remain | Three different counters (see §2) | Can disagree with each other | One single counter, one single source field (`tenants.is_founder == true`, counted live, not snapshotted) |
| Tenant's current plan | `tenants.plan` (raw string, bypasses `TenantPlan` enum for `"free_trial"`) | Not enum-validated on every write path | Extend `TenantPlan` enum to include every real value in use (`FREE_TRIAL`, `FOUNDERS_EDITION`, etc.) and validate on write |

### Duplicate or Conflicting Data
- `Tenant.name` vs. `User.company_name` — see above, the single highest-priority duplicate-data finding in this module.
- `tenants.is_founder` vs. the (nonexistent-in-practice) `users.is_founder` check inside Platform Admin's founder-flag enrichment.
- Three independent "founders remaining" counters (`founders_config.py`'s plan-based count, `billing.py`'s `is_founder`-based count, and the `founder_counter` sequential-number singleton) that are never reconciled against each other.
- `tenants.slug`, generated at creation, entirely unused — not a conflict exactly, but dead/misleading data that looks load-bearing and isn't.

---

## 6. Business Rules and Logic

### Core Business Rules
| Rule | Current Behavior | Correct Rebuild Behavior | Priority |
|---|---|---|---|
| Exactly one new tenant is created per self-registration | Confirmed — always | Keep | Working |
| A tenant can only edit its own settings, never another tenant's | Enforced correctly (`PUT /api/tenant` always uses `current_user.tenant_id`, no tenant_id parameter exists) | Keep | Working |
| Only `role=owner` can edit tenant settings / logo | Enforced (`if current_user.role != "owner": 403`) on every tenant-write endpoint in `server.py` | Keep | Working |
| A tenant containing a `platform_admin` user cannot be suspended | Enforced | Keep | Working |
| A Platform Admin cannot delete their own tenant | Enforced | Keep | Working |
| Platform Admin actions changing a tenant's plan/usage require a real permission check scoped to platform staff | **Not enforced correctly today** — the check references a nonexistent permission and crashes (500); even if fixed naively, nothing stops a regular tenant Owner from targeting a different tenant's ID | Require `require_platform_admin` (the same dependency used by every other tenant-governance endpoint in this module) **and** keep the crash fixed with a real, existing `Permission` value | P0 |
| "Settings merge" per section | Full nested-object replace per top-level key, relies on frontend always sending the complete object | Explicit dot-notation partial update, or a documented/tested full-replace contract | P1 |
| `owner_email` reflects the tenant's actual current owner | **Not enforced** — never auto-updated on role change | Auto-sync on ownership transfer, or replace with a live-resolved value | P1 |

### Statuses and State Changes
| Status | Meaning | Who Can Set It | What Triggers It | What Happens Next |
|---|---|---|---|---|
| `tenants.is_active = false` | Tenant suspended | Platform Admin (manual) or the Dunning service (auto-suspend after N failed payments, per `dunning_failure_threshold`) | Manual action or automated billing failure | Blocks login + every subsequent request for all tenant users except `platform_admin` (enforcement detailed in Auth doc) |
| `tenants.is_active = true` | Tenant active | Platform Admin (manual reactivate or mark-paid override) or successful Stripe payment (Billing module) | Manual action or payment success | Full access restored immediately |
| `tenants.is_founder = true` | Tenant locked into Founders Edition pricing/benefits forever | Set once by `setup-admin` bootstrap or by Billing's Stripe-checkout-success handler | Manual bootstrap or a real founder purchase | `founder_locked_at` stamped; benefits unlocked; **not** reflected correctly in Platform Admin's own UI (see §2 bug) |
| `onboarding_checklist.completed` | One onboarding step done | Platform Admin | Manual checkbox toggle | Progress percentage recalculated on next fetch |

### Automatic Actions
- `founder_number` is assigned atomically via `db.founder_counter.find_one_and_update($inc)` — genuinely race-safe, a good pattern to keep.
- Suspending a tenant automatically clears any prior `reactivated_*` fields (and vice versa) so the two states never show stale cross-contaminated metadata.
- Reactivating with `notify_owner=true` (the default) automatically fires a real email — no manual "remember to email them" step for the Platform Admin.

### Calculations and Formulas
**Onboarding Checklist Progress**
- Purpose: Show Platform Admin/Sales how far along a tenant's onboarding is.
- Formula: `percentage = round(completed_count / total_count * 100)`, `0` if `total == 0`.
- Inputs: `onboarding_checklist` items for the tenant.
- Where It Is Used: `GET /platform-admin/tenants/{id}/checklist/progress`.
- Current Problems: None found; straightforward and correct.

**Founders Slots Remaining (at registration time)**
- Purpose: Snapshot shown to a brand-new trial user about founder-pricing scarcity.
- Formula: `FOUNDERS_EDITION_MAX_CUSTOMERS - count(tenants where plan == "founders_edition")`, computed once and stored on the new tenant.
- Current Problems: Never refreshed after the one write; also structurally different from the *actual* founder-availability check used at real checkout time (`MAX_FOUNDER_ACCOUNTS` vs. `is_founder == true`) — see §2.
- Rebuild Requirement: Compute this live wherever it's displayed (never snapshot it), and use the *same* counting field everywhere it's calculated.

### Validation Rules
- `Tenant.name`: required, no length cap found, no uniqueness check.
- `Tenant.slug`: always machine-generated (never user-supplied), guaranteed-unique by construction (`name + random 8-char uuid suffix`) — but see §2, unused by anything downstream.
- `Tenant.owner_email`: `EmailStr` format-validated by Pydantic, but **not** checked against any real `User` document — a tenant can have an `owner_email` that doesn't correspond to any actual user in the system at all (e.g., after the real owner's account is deleted, or if it's manually edited to a typo).
- Broadcast-email subject/body: capped at 200 chars / 50 KB respectively (Platform Admin module, not strictly this module's concern but touches `tenants.owner_email` directly).

---

## 7. Permissions and Roles

### Roles That Interact With This Module
| Role | View | Create | Edit | Delete | Approve | Export |
|---|---|---|---|---|---|---|
| Owner | Own tenant only | N/A (tenant creation happens only via self-registration, before any role exists) | Own tenant's settings/logo | — | N/A | N/A |
| Admin | Own tenant (implicitly, via tenant-scoped queries) | — | — | — | N/A | N/A |
| Staff | Own tenant (implicitly) | — | — | — | N/A | N/A |
| Platform Admin | All tenants | Only via disabled promote-to-tenant | Suspend/reactivate/mark-paid/dunning-threshold on any tenant | Any tenant (Creator-gated for delete specifically, see below) | N/A | N/A |
| Platform Creator | Same as Platform Admin + exclusive delete rights | Same as Platform Admin | Same as Platform Admin | **Only role that can permanently delete a tenant** (`if current_user.role not in ("platform_creator", "platform_admin")` — **Needs Verification**: the code comment says "Platform Creator only" but the actual `if` check also allows `platform_admin`, a real mismatch between the docstring and the enforced logic worth a decision: is delete meant to be Creator-exclusive or shared with Admin?) | N/A | N/A |

### Customer / Portal Permissions
Not applicable — customers, employees, and webstore owners never interact with the `Tenant` document directly; they only ever see data already scoped to a `tenant_id` they're implicitly bound to.

### Sensitive Information
- `tenant.logo_url` can contain a full base64-encoded image (up to 3MB, enforced) stored **inline inside the MongoDB document** rather than in object storage. The code is aware this is heavy — every tenant list/detail read explicitly excludes it (`{"_id": 0, "logo_url": 0}`) and uses a separate lightweight `has_logo` boolean flag plus a dedicated `GET /tenant/logo` endpoint to fetch it only when actually needed. This is a workable mitigation, but the root pattern (large binary blobs inline in a frequently-`$set`-updated document) is a known anti-pattern versus using real object storage.
- `tenant.owner_email` is treated as sensitive-adjacent (used for support/billing correspondence) but has no access restriction beyond normal tenant-scoping — any Platform Admin can see any tenant's `owner_email` in the plain list view.
- No PII beyond standard business-contact fields (address, phone, website) lives on the `Tenant` document itself.

### Permission Problems in Current App
- The plan/tier-admin endpoints' broken permission check (`Permission.SETTINGS_EDIT`) is the single most severe permission problem in this module — see §2 and §12 for full detail.
- The delete-tenant docstring/logic mismatch above (Creator-only in comment, Creator-**or**-Admin in enforced code) — a small but real "which is actually intended" gap, same category as the Auth doc's Admin/`USERS_MANAGE` gap.

---

## 8. Integrations and External Services

### External Services Used
| Service | Purpose | Where Used | Credentials / Env Vars | Current Status |
|---|---|---|---|---|
| SendGrid | Reactivation "you're back" email; broadcast email to tenant owners | `services/email_service.py`, called from `platform_admin.py` | `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`/`_NAME` | Active — reactivation confirmed real; broadcast has a pre-flight `is_configured()` guard that fails fast (503) rather than silently reporting fake success |
| Stripe | Founder pricing / plan assignment writes onto `Tenant` (`is_founder`, `founder_number`, `subscription_status`, dunning fields) | `routes/billing.py` (owned by the Billing module, only the *write target* is this module's data) | Stripe keys (outside this doc's scope) | Active (owned elsewhere) |

### API Endpoints

**Endpoint: `GET /api/tenant`**
- Purpose: Fetch the caller's own tenant (logo excluded for payload size)
- Frontend File Calling It: `CompanySettings.js`
- Backend File Handling It: `server.py`
- Required Authentication: Any authenticated tenant user
- Response: Tenant fields + `has_logo` boolean
- Known Problems: None
- Rebuild Recommendation: Keep

**Endpoint: `PUT /api/tenant`**
- Purpose: Update the caller's own tenant settings
- Frontend File Calling It: `CompanySettings.js` (×6 call sites, one per settings section)
- Backend File Handling It: `server.py`
- Required Authentication: `role == owner`
- Database Changes: Per-top-level-key `$set`, full nested-object replace per §6
- Known Problems: See Workflow 4 in full
- Rebuild Recommendation: Dot-notation partial updates; add audit logging

**Endpoint: `POST /api/tenant/upload-logo` / `DELETE /api/tenant/logo`**
- Purpose: Manage the tenant's logo image
- Backend File Handling It: `server.py`
- Required Authentication: `role == owner`
- Known Problems: Base64-inline storage (see §7)
- Rebuild Recommendation: Move to object storage; keep the `has_logo` flag + separate fetch-endpoint pattern, it's a good mitigation to preserve even after migrating storage

**Endpoint: `GET /platform-admin/tenants`**
- Purpose: List/search all tenants
- Frontend File Calling It: `PlatformAdmin.js`
- Backend File Handling It: `platform_admin.py`
- Required Authentication: `require_platform_admin`
- Known Problems: None beyond the shared `is_founder` bug (that bug is actually in `get_tenant_detail`/`_enrich_with_founder_flag`, not the list query itself, but `TenantListItem` doesn't even surface `is_founder` — **Needs Verification** whether the list screen shows founder status at all today, likely not, since `TenantListItem` has no `is_founder` field)
- Rebuild Recommendation: Keep structure; if founder status is wanted in the list, add it correctly this time (read `tenants.is_founder` directly)

**Endpoint: `GET /platform-admin/tenants/{tenant_id}`**
- Purpose: Full tenant detail + user list
- Backend File Handling It: `platform_admin.py`
- Required Authentication: `require_platform_admin`
- Known Problems: `is_founder` bug (§2); silently drops/logs any malformed `User` documents rather than failing the whole request (a reasonable defensive choice, worth keeping)
- Rebuild Recommendation: Fix founder flag; keep the invalid-user tolerance

**Endpoint: `POST /platform-admin/tenants/{tenant_id}/suspend` / `/reactivate`**
- Purpose: Governance state changes
- Required Authentication: `require_platform_admin`
- Known Problems: Suspend sends no email (asymmetric with reactivate)
- Rebuild Recommendation: Decide notify-on-suspend policy explicitly (§4 Workflow 2)

**Endpoint: `DELETE /platform-admin/tenants/{tenant_id}`**
- Purpose: Permanent, irreversible tenant + all-data wipe across ~24 collections
- Required Authentication: `require_platform_admin`, but see the Creator-only docstring/code mismatch in §7
- Database Changes: `delete_many({"tenant_id": ...})` across a hardcoded list of ~24 collection names, then deletes the tenant itself
- Known Problems: The hardcoded collection list is a maintenance risk — any new tenant-scoped collection added in the future (e.g., `inventory_items`, `purchase_orders`, added per the CHANGELOG's June 2026 inventory feature) must be manually added to this list or its data becomes permanently orphaned garbage after a tenant delete. **Needs Verification**: confirmed `inventory_items`/`purchase_orders`/`vendors` are **not** in the current hardcoded list — grepped the list in §-relevant code and they're absent, meaning today's tenant-delete already leaves orphaned inventory data behind for any tenant that used the Inventory feature.
- Rebuild Recommendation: Replace the hardcoded collection list with either (a) a single registry constant imported by every module that creates a new tenant-scoped collection (so adding a collection forces a one-line registration), or (b) a generic sweep that deletes from *every* collection with a `tenant_id` field, discovered dynamically.

**Endpoint: `POST /platform-admin/tenants/{tenant_id}/mark-paid`**
- Purpose: Manual payment-success override (NET-60, wire transfer, etc.)
- Required Authentication: `require_platform_admin`
- Known Problems: None found
- Rebuild Recommendation: Keep

**Endpoint: `PUT /platform-admin/tenants/{tenant_id}/dunning-threshold`**
- Purpose: Per-tenant override of auto-suspend failure count
- Required Authentication: `require_platform_admin`
- Known Problems: **Needs Verification** — no confirmed frontend call-site found
- Rebuild Recommendation: Confirm whether a UI exists; if not, build one or note it as an API-only tool intentionally

**Endpoint: `POST /platform-admin/users/{user_id}/promote-to-tenant`**
- Purpose: Move an existing user into a brand-new tenant
- Frontend File Calling It: `PlatformAdminTenantDetail.js`
- Required Authentication: `require_platform_admin` **plus** `ENABLE_PROMOTE_TO_TENANT=1` env flag (disabled by default)
- Known Problems: See Workflow 5 in full
- Rebuild Recommendation: Decide whether to graduate this out of feature-flag status; route its tenant-insert through the same shared factory as `register()`

**Endpoint: `PUT /api/tiers/admin/tenant/{tenant_id}/plan` (and legacy `/tier` alias) / `POST /api/tiers/admin/tenant/{tenant_id}/reset-usage`**
- Purpose: Change a tenant's plan / reset its monthly feature-usage counters
- Required Authentication: **Broken** — references nonexistent `Permission.SETTINGS_EDIT`, crashes with 500 for every caller regardless of role. Uses a locally-defined, fifth independent JWT-decode dependency (`get_current_user_dep` in `tiers.py`), not `require_platform_admin`.
- Database Changes: Would call `FeatureGate.set_tenant_plan()`/`reset_monthly_usage()` if it ever ran successfully
- Known Problems: **Confirmed live 500 crash** (§2, §12); latent cross-tenant IDOR if naively "fixed"
- Rebuild Recommendation: **P0.** Fix the permission reference; add a `require_platform_admin`-equivalent guard (this must not be callable by an ordinary tenant Owner against another tenant's ID); consolidate onto the same JWT-decode dependency used everywhere else instead of a sixth bespoke one.

### Webhooks
None owned directly by this module (Stripe webhooks that *write into* `Tenant` fields are owned by the Billing module).

### Email / SMS / Notification Templates
| Template Name | Trigger | Recipient | Purpose | Current Location | Rebuild Notes |
|---|---|---|---|---|---|
| Tenant Reactivated ("You're back") | `POST .../reactivate` with `notify_owner=true` | `tenant.owner_email` | Inform the owner access is restored | `services/email_service.py` `send_tenant_reactivated_email()` | Confirmed real, keep |
| Broadcast Email | Platform Admin manual send | One or many `tenant.owner_email` values | Ad hoc platform-wide announcements | `platform_admin.py` `broadcast_email()` | Well-built (rate-limited, personalized, XSS-safe, dedupe'd); keep as-is |
| (Missing) Tenant Suspended notice | N/A — does not exist | Would be `tenant.owner_email` | Inform the owner *why* they were locked out, proactively | N/A | See Workflow 2's rebuild requirement |

---

## 9. Documents, Files, Images, and Attachments
- **Tenant logo**: the only file-like asset owned by this module. Stored as a base64 data-URL string directly on the `Tenant` document's `logo_url` field (not in object storage). 3MB size cap enforced server-side; allowed types PNG/JPEG/WebP/GIF/SVG. The app already mitigates the "large field on a frequently-read document" problem by excluding `logo_url` from every list/detail read and serving it only via a dedicated `GET /tenant/logo` call — a sensible pattern, but the underlying storage choice (inline Mongo field vs. real object storage) is worth revisiting in the rebuild given the platform's general file-upload guidance elsewhere favors object storage for exactly this reason.
- No other documents/files/generated PDFs are produced by this module directly (invoices, quotes, etc. are owned by other modules and merely *reference* `tenant.branding_settings` for cosmetic theming).

---

## 10. AI Features
None directly. However, `tenant.assistant_personality` and `tenant.assistant_skip_confirm` (AI Assistant behavior configuration) are stored **on the Tenant document** even though the AI Assistant feature itself is owned by a different module — this module is simply the storage location. **Needs Verification** whether this coupling (AI Assistant config living inside the generic tenant-settings blob rather than its own dedicated collection/model) causes any of the same full-replace "merge" risk described in §6, since `assistant_skip_confirm` is a bare `List[str]` field on `TenantUpdate` with the same "$set the whole thing" mechanics as everything else on this endpoint.

---

## 11. Activity Logs, Audit Trail, and Reporting

### Activity Events Created by This Module
| Event | Trigger | Logged Data | Visible To | Related Record |
|---|---|---|---|---|
| `tenant.suspend` | Platform Admin suspends | Actor, tenant, reason | Platform Admin (audit log page) | `admin_audit_log` |
| `tenant.reactivate` | Platform Admin reactivates | Actor, tenant, prior reason, note, notify flag | Platform Admin | `admin_audit_log` |
| `tenant.delete` | Platform Admin/Creator permanently deletes | Actor, tenant name, owner email | Platform Admin | `admin_audit_log` |
| `payment.manual_mark_paid` | Manual paid-override | Actor, tenant, note, auto-reactivated flag | Platform Admin | `admin_audit_log` |
| `dunning.threshold_set` | Per-tenant dunning override | Actor, tenant, previous/new threshold | Platform Admin | `admin_audit_log` |
| `user.promote_to_tenant` | User moved to new tenant | Actor, old/new tenant, user email | Platform Admin | `admin_audit_log` |
| `broadcast_email.send` | Broadcast sent | Subject, target, sent/failed counts | Platform Admin | `admin_audit_log` |
| `checklist.update` | Onboarding item toggled | Actor, item, before/after | Platform Admin | `admin_audit_log` |

**Not currently logged (gap):** Every self-service tenant settings change made through `PUT /api/tenant` (business info, branding, payroll, time-tracking, employee-portal, signature settings) produces **zero** audit trail entry — a real gap, especially notable given how thoroughly the Platform-Admin-side actions on this exact same document *are* audited. If a shop's branding or payroll defaults change unexpectedly, there is currently no queryable record of who changed it or when, beyond `tenants.updated_at` (a single timestamp with no diff/history).

### Audit Trail Requirements
For a production rebuild: every `PUT /api/tenant` call should produce a lightweight audit entry (actor, which section changed, before/after values for at minimum the top-level keys touched) — reusing the exact `log_admin_action` pattern already proven out on the Platform-Admin side of this same module.

### Reports and Dashboard Metrics
None produced directly by this module (tenant counts/plan breakdowns are consumed by Billing/Analytics modules, not generated here).

---

## 12. Errors, Edge Cases, and Failure Handling

### Known Bugs
| Bug | Where It Happens | Severity | Temporary Workaround | Rebuild Fix |
|---|---|---|---|---|
| `PUT /api/tiers/admin/tenant/{id}/plan`, legacy `/tier` alias, and `POST .../reset-usage` all crash with `500` (`AttributeError: SETTINGS_EDIT`) — **reproduced live** against the running preview backend | `routes/tiers.py` lines 316 and 362 | **Critical** — feature completely non-functional for everyone | None — cannot be worked around from the UI; would require a direct database edit to `tenants.plan` to change a plan manually today | Reference an existing `Permission` value (e.g., `SETTINGS_MANAGE`); additionally require `require_platform_admin` and/or a same-tenant check before this can safely go back into use (see IDOR note below) |
| Latent cross-tenant IDOR on the same three endpoints once the crash above is naively patched | Same file | High (security, not yet exploitable only because the endpoint currently 500s before reaching any authorization logic) | None needed while the crash persists (it's an accidental mitigation) | Must be fixed *together with* the crash fix, not after |
| `is_founder` always reads as `false` in every Platform Admin tenant list/detail view | `platform_admin.py` `_enrich_with_founder_flag` | Medium (cosmetic/data-visibility, not data-loss) | Query `db.tenants.find({"is_founder": true})` directly via script/DB tool to get the real answer | Read `tenants.is_founder` directly instead of a `users.is_founder` field nothing ever sets |
| Three inconsistent "founders remaining" counters | `founders_config.py`, `billing.py`, `founder_counter` collection | Medium (business-reporting confusion, not user-facing breakage) | Manually reconcile via direct DB queries when precise numbers matter | Consolidate into one counting method, one source field |
| `owner_email` never auto-syncs with `role=owner` changes; multiple simultaneous owners possible with no cap | `routes/auth.py` `admin_update_user_role` (no `owner_email` write); `Tenant` model (no owner-count constraint) | Medium (correspondence/notification can reach the wrong/former person) | Manually update `owner_email` via `PUT /api/tenant` after any real-world ownership handoff | Auto-sync on transfer, or resolve owner(s) live instead of trusting a stale string field |
| Hardcoded tenant-delete collection list omits at least the Inventory module's collections (`inventory_items`, `purchase_orders`, `vendors` — added per `CHANGELOG.md`'s June 2026 entry, after this delete-tenant list was presumably last updated). **Update (found while researching the Settings module doc):** the drift is worse than initially scoped — the list also references a stale collection name, `"webstores"`, which no longer exists in the live codebase (the real, actively-used collection is `webstores_v2`, confirmed via 50 grep hits in `webstores.py` vs. zero for the bare name). This means tenant-delete today also fails to remove webstore/product data, not just inventory data. Full detail in `SETTINGS_CONFIGURATION_FRAMEWORK_REBUILD_DOC.md` §2/§12, which also found a second, independently-maintained "list of every tenant collection" (`backup.py`'s `BACKUP_COLLECTIONS`) that is more current and correctly includes the Inventory collections. | `platform_admin.py` `delete_tenant` | Medium (orphaned data accumulates silently after any tenant delete, not user-visible but a real storage/compliance leak over time) | Manually run a follow-up cleanup query against those collections after any tenant delete | Replace the hardcoded list with a dynamically-discovered or centrally-registered one, ideally shared with `backup.py`'s `BACKUP_COLLECTIONS` so the two can never drift apart again (see §8) |
| Delete-tenant docstring says "Platform Creator only" but the enforced `if` check also permits `platform_admin` | `platform_admin.py` `delete_tenant` | Low (comment/code mismatch, not a crash) — but a real "which is intended" gap | N/A | Decide the intended access level and make the comment match the code (or vice versa) |

### Edge Cases
- **A tenant with zero users** cannot happen through any normal code path (registration always creates exactly one owner alongside the tenant; `admin_delete_user`'s last-owner guard prevents the tenant's *last* owner from being removed, though it does not prevent all *non-owner* users from being removed, which is fine since the owner always remains) — confirmed no orphaned zero-user tenant is reachable through the UI.
- **A tenant whose `owner_email` points at an email with no matching `User` document at all** (e.g., after manual edits, or after the user's account is deleted through some path that doesn't also clear `owner_email`) is fully possible and not guarded against anywhere — broadcast email and reactivation notices would simply send to a real inbox that may no longer belong to anyone who can act on it, or bounce entirely if the address was mistyped.
- **Suspending, then reactivating, then suspending again** correctly clears the opposite state's fields each time (verified in code) — no stale cross-contamination between suspension cycles.
- **Deleting a tenant that has data in a collection not on the hardcoded delete-list** (e.g., inventory data) leaves that data behind permanently, orphaned by `tenant_id` with no tenant to belong to — confirmed via the collection-list gap above.

### Error Messages
Tenant-module error messages are generally clear and specific ("A reason is required," "Cannot suspend a tenant that contains a platform_admin user," "Cannot delete your own tenant," "User is already the owner of their current tenant — nothing to promote"). The one glaring exception is the broken plan/tier endpoints, which return a raw, unhandled `Internal Server Error` with no useful detail to the caller at all — the worst possible error UX, and a strong signal this code path has not been exercised/tested since `Permission.SETTINGS_EDIT` was introduced (or since `Permission.SETTINGS_EDIT` was renamed away from, if it once existed under that name).

### Recovery Rules
- Suspended tenant: no self-service recovery; must be manually reactivated by a Platform Admin (or auto-recovers via a successful Stripe payment, if the suspension was payment-triggered — owned by Billing/Dunning).
- Accidentally-deleted tenant: **no recovery possible** — `delete_tenant` is a genuine hard delete across every listed collection plus the tenant document itself, with no soft-delete/trash/undo window. This is a significant risk for a destructive Platform-Admin action with no confirmation step beyond whatever the frontend dialog does client-side (**Needs Verification** of exactly how strong that frontend confirmation is, e.g., type-to-confirm the tenant name vs. a simple OK/Cancel).

---

## 13. Important Files and Code Map

### Frontend Files
| File Path | Purpose | Important Components / Functions | Keep / Replace / Remove |
|---|---|---|---|
| `frontend/src/pages/CompanySettings.js` | Tenant self-service settings (all sections) | Six independent save handlers, each calling `updateTenant()` with one settings key | Keep overall structure; fix each section's local-state object to always include every backend-known field so the full-replace pattern stays safe as the model grows |
| `frontend/src/pages/PlatformAdmin.js` | Tenant list/search/delete | `tenants`/`filteredTenants` state, delete-confirm flow | Keep; add founder-status display once the backend bug is fixed |
| `frontend/src/pages/PlatformAdminTenantDetail.js` | Full tenant governance UI | Suspend/reactivate/mark-paid/dunning/checklist/promote-to-tenant sections | Keep; consider splitting into tabs (file is 1127 lines covering many distinct concerns) |
| `frontend/src/context/PlanContext.js` | Plan/feature-gating client state (reads `tenant.plan`-derived data, not `Tenant` itself) | `PlanProvider`, `hasFeature`, `isFounder` | Keep (owned jointly with Tiers/Billing modules) |
| `frontend/src/context/AuthContext.js` | Does **not** cache a `Tenant` object at all — only `user` (with `tenant_id`) | — | Consider whether a lightweight cached tenant object (name, logo flag, plan) belongs in a shared context to avoid every settings-adjacent page independently calling `GET /api/tenant` |

### Backend Files
| File Path | Purpose | Important Functions / Endpoints | Keep / Replace / Remove |
|---|---|---|---|
| `backend/models/auth.py` | `Tenant`/`TenantBase`/`TenantCreate`/`TenantUpdate` models + nested settings models | — | Extend to declare every field actually written in practice (see §5's schema-drift gap) |
| `backend/models/enums.py` | `TenantPlan`, `UserRole` enums | — | Extend `TenantPlan` to include `FREE_TRIAL` and any other raw-string plan values in active use |
| `backend/routes/auth.py` | Tenant creation as a registration side-effect; `setup-admin` bootstrap that edits tenant founder/platform-owner flags | `register()`, `setup_admin_account()` | Extract tenant-creation into a shared factory function (see Workflow 5's rebuild requirement) |
| `backend/routes/platform_admin.py` | All Platform-Admin tenant governance | `list_tenants`, `get_tenant_detail`, `suspend_tenant`, `reactivate_tenant`, `delete_tenant`, `mark_tenant_paid`, `set_dunning_threshold`, `promote_user_to_tenant`, `broadcast_email`, onboarding-checklist routes, `_enrich_with_founder_flag` | Keep the audit-logging discipline as the template module-wide; fix `_enrich_with_founder_flag`; fix or intentionally enable `promote_user_to_tenant`; fix the hardcoded delete-collection list |
| `backend/server.py` | Self-service tenant identity read/write, logo | `get_tenant_info`, `update_tenant_info`, `upload_tenant_logo`, `delete_tenant_logo` | Keep the has_logo/separate-fetch pattern; fix the settings-replace mechanism per §6 |
| `backend/routes/tiers.py` | Plan/tier admin overrides | `set_tenant_plan`, `set_tenant_tier` (legacy alias), `reset_tenant_usage`, `get_current_user_dep` | **P0 fix required** — broken permission reference, missing platform-admin/same-tenant guard, redundant JWT-decode dependency |
| `backend/routes/billing.py` | Writes `is_founder`/`founder_number`/dunning fields onto `Tenant` from Stripe events | `increment_founder_count`, checkout-success handlers | Owned by Billing; this module only consumes the fields it writes |
| `backend/core_runtime.py` | `generate_tenant_slug` | — | Either wire `slug` into an actual use case (public shop URLs) or stop generating it |

### Shared Files / Utilities
| File Path | Purpose | Used By | Rebuild Notes |
|---|---|---|---|
| `backend/services/admin_audit.py` (`log_admin_action`) | Central audit-log writer | Every Platform-Admin tenant action in this module | Extend usage to the self-service `PUT /api/tenant` path too (currently unused there) |
| `backend/services/founders_config.py` | Founders-Edition plan constants | `register()` only | Reconcile with `billing.py`'s separate founder constants (§2) |

### Styles / Design Files
No dedicated style files; `CompanySettings.js` and the Platform Admin pages use the same inline CSS-variable theming convention as the rest of the app. No module-specific visual problems found beyond the already-noted structural (not visual) issue of `CompanySettings.js`/`PlatformAdminTenantDetail.js` being very large single files covering many distinct concerns.

### Tests
**Needs Verification** — no tenant-module-specific test file (e.g., `test_tenant_*.py`) was found by name in this session's review; the broader `backend/tests/` directory exists (confirmed present from prior session context) but this session did not enumerate or run it against this specific module's endpoints. Recommend the next builder add explicit tests for: tenant self-edit scoping (cannot touch another tenant), the plan/tier endpoint's permission fix, and the founder-flag fix, since all three are concrete, reproducible bugs documented above with an exact expected-vs-actual outcome.

---

## 14. Design and Layout Requirements

### Current Visual Problems
- `CompanySettings.js` and `PlatformAdminTenantDetail.js` are both very large single-file components (1294 and 1127 lines respectively) covering many distinct concerns crammed into one page — not a visual bug per se, but it makes each section harder to reason about, test, or restyle independently.
- No visible "last saved" or "unsaved changes" indicator on `CompanySettings.js`'s per-section save buttons — a user has no way to tell, at a glance, whether a section currently reflects saved server state or unsaved local edits (**Needs Verification** — not deeply inspected for this specific UX detail this session, flagging as worth checking).

### Must-Keep Visual Elements
- The per-section save pattern on `CompanySettings.js` (Business Info / Branding / Payroll / Time Tracking / Employee Portal / Signatures as independent cards, each with its own save action) is a sensible, low-risk-of-accidental-cross-section-changes layout — worth preserving even if the underlying save mechanism is rebuilt.
- Platform Admin's suspended-tenant badge and confirm-before-destructive-action dialogs (delete, suspend) are appropriately cautious UX for high-stakes actions.

### Rebuild Design Requirements
- Desktop/Tablet/Mobile: **Needs Verification** — not specifically inspected this session for the Tenant-module screens; the general app-wide responsive patterns documented in the Auth doc (`max-w-md`, centered cards) apply to auth screens, not necessarily to the wider settings/admin tables reviewed here.
- List/Detail view: `PlatformAdmin.js`'s list → `PlatformAdminTenantDetail.js`'s detail is a clean, conventional pattern — keep.
- Create/edit form: N/A (no dedicated "create tenant" form exists anywhere in the UI today — see §2).
- Empty/Loading/Error states: `PlatformAdmin.js` has loading state (`loading` flag) — **Needs Verification** of its exact empty-state messaging when a search returns zero tenants.
- Accessibility: **Needs Verification** — not specifically inspected this session.

---

## 15. Module Dependencies

### Modules This Module Depends On
| Dependency Module | Why It Is Needed | Required Data / Actions | Rebuild Risk |
|---|---|---|---|
| Auth | `Tenant` creation is a side-effect of `User` registration; tenant-suspension enforcement happens inside Auth's `get_current_active_user` | Read/write `users.tenant_id`/`role` | High — the two modules are tightly coupled at the registration and suspension-enforcement seams; any rebuild must keep both in lockstep (already flagged from the Auth doc's side too) |
| Billing/Stripe | Writes `plan`, `is_founder`, `founder_number`, dunning fields onto `Tenant` | Write access to those specific `Tenant` fields | Medium — clean field-level boundary already exists, just needs the field *set* to be formalized on the model (§5) |
| Communications/SendGrid | Reactivation + broadcast emails | `email_service.send_*` | Low — already working |

### Modules That Depend on This Module
| Dependent Module | What It Needs From This Module | Rebuild Risk |
|---|---|---|
| Literally every tenant-scoped module (Orders, Customers, Invoices, Webstores, Inventory, Payroll, etc.) | A valid, active `tenant_id` to scope every query | **Highest risk in the app alongside Auth** — any regression in tenant identity/active-state resolution breaks data isolation for everyone simultaneously |
| Tiers/Plans/Feature-Gate | `tenant.plan` to determine feature access | High risk specifically because the one endpoint meant to *change* this value is currently broken (§12) |
| Platform Admin's other sub-features (Analytics, Audit Log, Broadcast Email) | The tenant list/detail data this module exposes | Medium |

### Events This Module Sends
None formally (no event bus) — same architectural note as the Auth module: all governance actions are direct DB writes + audit-log rows, not published domain events.

### Events This Module Receives
None found — this module does not react to events from other modules (e.g., a Stripe payment-failure webhook directly calls into this module's dunning fields rather than this module subscribing to a "payment.failed" event).

---

## 16. Migration and Rebuild Strategy

### Existing Data That Must Be Preserved
- Every `tenants` document in full, including all the currently-undeclared "extra" fields (§5) — a rebuild's new formal schema must be a strict superset of every field currently in live use, or migration will silently drop real business data (suspension history, dunning counters, founder status, promotion breadcrumbs).
- `onboarding_checklist` history (useful sales/onboarding record even for already-onboarded tenants).
- `admin_audit_log` entries related to tenant actions (compliance/history value).

### Existing Data That Can Be Archived
- `founder_counter` singleton's raw counter value — the *assigned* `founder_number`s on each tenant must be preserved, but the counter mechanism itself can be rebuilt as long as the next-assigned number doesn't collide with an already-assigned one.

### Existing Data That Should Not Be Migrated
- The dead `tenants.slug` field's *generation logic* — the stored values can stay (harmless), but there's no need to keep generating new ones unless a real use case (public shop URLs) is built for it.
- The `founders_spots_remaining` one-time snapshot field — stale by definition, safe to drop and recompute live wherever needed going forward.

### Recommended Rebuild Order
**Phase 1: Foundation** — Formalize the complete `Tenant` model (every field currently written in practice, per §5); build one single `create_tenant()` factory used by both registration and any future admin-created-tenant path; fix the `TenantPlan` enum to cover every real value in use.

**Phase 2: Core Workflow** — Tenant self-edit with a deliberate (not accidental) settings-update strategy (dot-notation partial or documented full-replace, per §6); fix the plan/tier admin endpoints (§12, P0); fix the founder-flag bug (§12).

**Phase 3: Automation and Integrations** — Reconcile the three founder-slot counters into one; auto-sync (or replace) `owner_email` on ownership transfer; add audit logging to the self-service settings-save path.

**Phase 4: Advanced Features** — Decide the fate of promote-to-tenant (graduate it out of feature-flag status with proper safeguards, or remove the dead UI button); build a genuine "Platform Admin creates a brand-new tenant from scratch" tool if sales-assisted onboarding is a real product need; migrate tenant logo storage to object storage.

**Phase 5: Reports, AI, and Polish** — Dynamic/registry-based tenant-delete collection sweep (replacing the hardcoded, already-stale list); decide and enforce the delete-tenant Creator-vs-Admin access-level question; UI polish (last-saved indicators, tab-splitting the two oversized settings/detail pages).

### Rebuild Risks
- **This module, alongside Auth, gates every other module's data isolation** — any regression in `tenant_id`/`is_active` resolution has the widest possible blast radius.
- The plan/tier fix (§12) must be done carefully — fixing the crash without simultaneously adding a proper platform-admin/same-tenant guard actively *introduces* a new, exploitable cross-tenant vulnerability rather than just failing loudly as it does today.
- Changing the settings-update mechanism (full-replace → partial) is safe from a data-loss perspective (it only ever *reduces* the blast radius of a save) but requires re-testing every `CompanySettings.js` section end-to-end since the wire format assumptions would change.

### Required Decisions Before Building
1. Should Platform Admin have a genuine "create a brand-new tenant from scratch" tool (no pre-existing user required), for sales-assisted onboarding? Currently impossible without the customer self-registering first.
2. Should tenant suspension proactively notify the owner by email, matching reactivation's behavior, or is silence intentional (e.g., for abuse/fraud cases)?
3. Should `owner_email` be an actively-synced field (auto-updated whenever the `owner` role changes hands) or should it be deprecated in favor of always resolving "current owner(s)" live from `users.role`?
4. Is a tenant allowed to have multiple simultaneous `role=owner` users by design, or should the rebuild enforce exactly one "primary owner" at a time?
5. Should tenant-delete remain Platform-Creator-and-Admin (current enforced behavior) or Creator-only (current docstring's stated intent)?
6. Is `tenant.slug` meant to eventually power a public-facing shop URL? If not, should it be removed entirely to stop generating dead data?

---

## 17. Testing Requirements

### Critical Tests
| Test Scenario | Expected Result | Priority |
|---|---|---|
| Self-register a new account | Exactly one new `tenants` doc + one `users` doc (owner) created; no duplicate-name blocking (by design) | Critical |
| Owner edits `PUT /api/tenant` with only `branding_settings` in the body | Only `tenants.branding_settings` changes; every other top-level field (`payroll_settings`, `name`, etc.) is untouched | Critical |
| Owner attempts to edit tenant settings while `role != owner` | 403 | Critical |
| Non-owner-role user attempts `PUT /api/tenant` targeting a different `tenant_id` | Not currently possible (endpoint has no `tenant_id` parameter) — confirm this remains true after any rebuild refactor | Critical |
| Platform Admin calls `PUT /admin/tenant/{id}/plan` | **Today: 500.** Post-fix: plan changes successfully for an authorized platform-admin call, and is rejected (403/404, not 500) for an unauthorized tenant Owner targeting another tenant's ID | Critical (post-fix) |
| Platform Admin suspends, then reactivates, a tenant | State flags fully round-trip with no stale cross-fields; audit log has both entries | Critical |
| Platform Admin deletes a tenant that has Inventory data | **Today: Inventory data is orphaned, not deleted.** Post-fix: confirm zero orphaned rows remain in any tenant-scoped collection after delete | High (post-fix) |
| Platform Admin views tenant list/detail for a known founder tenant | **Today: `is_founder` shows false.** Post-fix: shows true | High (post-fix) |
| Two users are both promoted to `role=owner` in the same tenant, then one is deleted | The remaining owner-role user is not blocked from being deleted (only the *last* owner is protected) — confirm this matches the intended business rule from Required Decision #4 | High |

### Manual Test Checklist
- [x] Create a new record → Self-register a new tenant
- [x] Edit existing record → Change tenant business info / branding via CompanySettings
- [x] Search and filter records → Platform Admin tenant search by name/owner email
- [x] Confirm permissions work → Non-owner blocked from `PUT /api/tenant`; non-platform-admin blocked from `/platform-admin/*`
- [x] Confirm activity log is created → Verified for every Platform-Admin action; **currently fails** for self-service `PUT /api/tenant` (no audit entry)
- [ ] Confirm mobile layout works → **Needs Verification**, not inspected this session
- [x] Confirm error states are understandable → True for most endpoints; **fails** for the broken plan/tier endpoints (raw 500)
- [x] Confirm related module data updates correctly → New tenant gets sample data, credits, etc. (Auth doc's registration workflow)
- [x] Confirm email/SMS notifications work → Reactivation email confirmed real; suspension intentionally/accidentally sends none
- [ ] Confirm files upload and download correctly → Logo upload confirmed functional (base64, 3MB cap); **Needs Verification** of real-world performance impact at scale
- [ ] Confirm AI credits are handled correctly → N/A to this module directly (Credits module territory)
- [x] Confirm no duplicate records are created → No `Tenant.name` uniqueness check exists (by design, not a bug, but worth knowing going into testing)
- [x] Confirm deleted/archived records behave correctly → Tenant hard-delete confirmed to wipe all *listed* collections; confirmed to **miss** at least Inventory's collections

### Definition of Done
This module is complete only when: (1) every field the application actually writes onto a `Tenant` document is formally declared on the model (no more silent schema drift), (2) the plan/tier admin endpoints work and are properly scoped to platform staff only, (3) the founder-flag bug is fixed and the three founder-counting mechanisms are reconciled into one, (4) tenant-delete sweeps every tenant-scoped collection that currently exists (not a hardcoded, already-stale list), (5) a deliberate decision has been made and implemented for the settings-update mechanism (partial vs. documented full-replace) and for owner-email sync, and (6) self-service tenant-settings changes produce an audit trail matching the rigor already present on the Platform-Admin side.

---

## 18. Final Rebuild Recommendation

### Keep
- The self-registration → tenant-creation flow's overall shape (one atomic-enough sequence: tenant → credits → user → sample data).
- The tenant-self-edit endpoint's correct same-tenant scoping (no `tenant_id` parameter, always uses the caller's own).
- Platform Admin's audit-logging discipline on every governance action (suspend/reactivate/delete/mark-paid/dunning/promote/broadcast) — genuinely the best-built part of this module and a template for the rest of the app.
- The reactivation email + broadcast-email features, both of which are mature, safety-guarded, real implementations.
- The logo `has_logo`-flag-plus-separate-fetch pattern for keeping large binary data out of frequent reads.
- The atomic `founder_counter` increment mechanism for sequential founder numbering.

### Rebuild From Scratch
- The `Tenant` model's field completeness — declare every field actually in use (§5).
- The tenant-settings-update mechanism (§6) — pick partial or full-replace deliberately, don't leave it as an accidental hybrid.
- The plan/tier admin endpoints (§12/§8) — currently broken and, once fixed, must be built with proper platform-admin scoping from day one, not patched onto the existing insecure-by-omission shape.
- The tenant-delete collection sweep (§8/§12) — replace the hardcoded, already-stale list with something that can't silently rot as new tenant-scoped modules get added.

### Merge With Another Module
- Consider whether `owner_email`/ownership-transfer logic belongs partly in the Auth module (since it's fundamentally about `User.role` semantics) — the two docs already reference each other at this seam; the rebuild should pick one module as the actual owner of "who is the tenant's owner" logic rather than splitting it across both as today.

### Remove
- The dead `tenants.slug` field's generation, unless a real public-URL use case is built for it.
- The stale `founders_spots_remaining` one-time snapshot field.
- Either the "Promote to New Tenant" UI button (if the feature stays permanently disabled) or the feature flag itself (if it's meant to be a real, supported workflow) — the current half-state (fully-built UI in front of a permanently-off switch) serves no one.

### Postpone
- Object-storage migration for the tenant logo — real improvement, not launch-blocking given the existing 3MB cap and exclusion-from-list-reads mitigations already in place.
- Splitting `CompanySettings.js`/`PlatformAdminTenantDetail.js` into smaller files/tabs — a maintainability improvement, not a functional gap.
- A genuine "Platform Admin creates a tenant from scratch" tool — valuable for sales-assisted onboarding, but self-registration covers the primary acquisition path today.

### Recommended Priority
- [x] Critical

### One-Paragraph Builder Handoff
A "Tenant" in this app *is* the "Organization" — there is no separate Organization entity, and there is exactly one real way a tenant gets created today: self-registration (a Platform-Admin-initiated "promote existing user to a brand-new tenant" tool exists in code but is disabled by default and cannot create a tenant from nothing). The two things that must not be forgotten in the rebuild: (1) the tenant plan/tier admin endpoints (`PUT /admin/tenant/{id}/plan`, `/tier`, `/reset-usage`) are **completely broken today** — confirmed with a live 500 error against the running backend, caused by a reference to a `Permission` value that does not exist — and fixing the crash without *also* adding a real platform-admin-only, same-tenant-only guard would introduce a genuine cross-tenant security hole, since the endpoint currently has no ownership check on the `tenant_id` path parameter at all; and (2) the `Tenant` document has significant schema drift — more than a dozen fields (trial dates, suspension/dunning/reactivation metadata, promotion breadcrumbs, `plan_name`) are written in practice by `auth.py`/`platform_admin.py`/`billing.py` but were never declared on the actual `Tenant` Pydantic model, meaning the "schema" that exists in people's heads and the schema Pydantic actually enforces have quietly diverged over time — any rebuild must start by reconciling those two before building anything new on top. Everything Platform-Admin-side (suspend/reactivate/delete/mark-paid/dunning/broadcast/audit-logging) is genuinely well-built and consistent, and should be trusted as the architectural template for the rest of the rebuild — the weaker half of this module is entirely on the "how tenants get created and configured" side, not the "how they're governed" side.

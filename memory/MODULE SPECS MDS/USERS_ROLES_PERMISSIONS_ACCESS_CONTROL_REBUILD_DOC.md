# USERS, ROLES, PERMISSIONS & ACCESS CONTROL — Rebuild Documentation

## Module Status
- [x] Existing and working (backend role→permission model for Owner/Admin/Staff/Platform Admin; tenant-scoped data isolation; webstore-owner-portal scoping)
- [x] Existing but incomplete ("Webstore Manager" — no such role exists, see §1; Customer/Employee portal visibility toggles exist only for Employees, not Customers)
- [x] Existing but broken (`platform_creator` role has **zero** entry in the backend's `ROLE_PERMISSIONS` dict — confirmed live to break real endpoints and the entire frontend permission UI for that role; declarative route-guard dependencies exist in code but are never actually used anywhere; frontend nav/routes have no role-based gating at all)
- [ ] Partially built / prototype
- [ ] Planned only
- [x] Needs replacement (three parallel, inconsistent permission-checking mechanisms; frontend/backend Permission and Role enums have drifted apart)
- [x] Needs verification (items called out inline below)

**Documentation Date:** 2026-07-02
**Completed By:** E1 (AI Agent) — direct code inspection + live API/UI verification (two distinct bugs reproduced live against the running preview backend with a real token; one via a direct API call that returned a genuine 403, one via a direct API call that returned a confirmed-empty permissions array), no screenshots used.
**Repository / Branch Reviewed:** `/app/` (current preview checkout, main branch per `.emergent` metadata)
**Related App Version / Deployment:** Preview environment (current `REACT_APP_BACKEND_URL`); test account `thesigntistslab@gmail.com` (role `platform_creator`, tenant "The Signtists Lab") per `test_credentials.md`

> **Method note:** Every claim below was verified by reading the actual file or by a live `curl` call against the running backend. Files read in full or in relevant ranges: `backend/models/auth.py` (`Permission` enum — all 44 values, `ROLE_PERMISSIONS` dict, full), `backend/models/enums.py` (`UserRole`, full), `backend/core_runtime.py` (`has_permission()`, full), `backend/server.py` (`require_permission`/`require_any_permission` dependency factories + every call-site search across the repo), `backend/routes/auth.py` (all `admin_router`/`users_router` endpoints), `backend/routes/webstores.py` (`_require_permission` helper + all 15 call-sites), `backend/routes/tiers.py`, `backend/routes/ai.py` / `ai_assistant_prefs.py` (grep-level, `user_has_permission` call-sites), `backend/routes/employee_portal.py` (`DEFAULT_PORTAL_SETTINGS`, `require_portal_setting`), `backend/routes/portal.py` (grep-level, confirmed no equivalent customer-visibility settings exist), `backend/routes/webstore_owners.py` (`owner_user_id` scoping across every `portal_router` endpoint), `frontend/src/context/AuthContext.js` (full — `UserRole`, `Permission`, `PERMISSION_ALIASES`, `hasPermission()`, `isOwner()`, `isAdminOrOwner()`), `frontend/src/App.js` (`ProtectedRoutes`, full route list), `frontend/src/components/ribbon/PrimaryNav.js` (full — confirmed static, unfiltered nav array), `frontend/src/components/MainLayout.js` (every `user.`-related line), `frontend/src/pages/UserManagement.js` / `Financials.js` (grep-level, page-level gating pattern). **Live verification #1:** logged in as `platform_creator`, called `POST /api/webstores/v2` with a valid body → received `403 {"detail":"You don't have permission to perform this action (webstores:create)."}`. **Live verification #2:** same session, called `GET /api/users/me/permissions` → received `{"role":"platform_creator","permissions":[]}` (a genuinely empty array).

---

## 1. Module Identity

### Module Name
Users, Roles, Permissions, and Access Control.

### Alternate / Legacy Names
- Backend code calls this "Permissions" (`models/auth.py`'s `Permission` enum, `ROLE_PERMISSIONS` dict) and "RBAC" only in comments.
- No code or UI reference to "Webstore Manager" as a role was found anywhere — see the "Webstore Manager" entry under Main Users below for what this phrase actually refers to in the live app.

### Primary Purpose
Decide, for every request and every rendered UI element, *who is allowed to do what*. This spans three genuinely different axes that this doc treats as one module because they all answer the same underlying question ("can this identity perform this action"), even though they are implemented with almost no code-sharing between them:
1. **Role-based access control (RBAC)** for tenant staff (`owner`/`admin`/`staff`) and platform staff (`platform_admin`/`platform_creator`) — a `Permission` enum + `ROLE_PERMISSIONS` dict, checked per-request.
2. **Record-level scoping** for Customers, Employees, and Webstore Owners — these three populations have no `role`/`Permission` concept at all; their "access control" is simply "you may only ever see documents where `customer_id`/`employee_id`/`owner_user_id` equals your own token's identity."
3. **Tenant-configurable feature toggles** for the Employee Portal (`employee_portal_settings` on the `Tenant` document) — a *fourth* axis, orthogonal to role, that lets a shop owner turn specific portal sections on/off for all their employees regardless of any individual employee's own attributes.

### Main Users
Per the requested scope, here is exactly what each named identity is and how it's actually implemented today:
- **Shop Owner** (`UserRole.OWNER`) — a real backend role. Gets every `Permission` (`ROLE_PERMISSIONS[OWNER] = list(Permission)`) via the dict *and* an explicit hardcoded bypass in `has_permission()`. The only role that can create another Owner, delete users, or edit tenant settings.
- **Admin** (`UserRole.ADMIN`) — a real backend role with a curated subset of permissions (see §5 for the exact list) — notably missing `EMPLOYEES_DELETE`-equivalent-strength actions like `PURCHASING_APPROVE` and any `PLATFORM_ADMIN_*` permission, and (per the Auth doc's earlier finding, still true) missing `USERS_MANAGE`, which the endpoints themselves check for — meaning Admins cannot actually create/edit/delete/role-change users today despite the UI/API existing for them to try.
- **Staff** (`UserRole.STAFF`) — a real backend role with the narrowest curated permission set (view/create/edit on Customers/Quotes/Jobs, view-only on Invoices/Employees/Webstores/Products, own-timeclock only, inventory view+pull but not adjust).
- **Customer** — **not** a `UserRole` at all. A `Customer` document with `portal_enabled`/`portal_password_hash` fields, authenticated separately (`/api/portal/auth/*`, documented in the Auth doc), and authorized purely by record ownership (`get_current_portal_customer` scopes every query to the token's own `customer_id`). No `Permission` enum applies to Customers at all.
- **Employee** — **not** a `UserRole` at all. A separate `employees` collection, authenticated via `/api/employee-portal/auth/*` (Auth doc). Authorized by a combination of (a) record ownership (own `employee_id`) and (b) the tenant-configurable `employee_portal_settings` feature-toggle layer (§1's third axis above) — e.g., `can_see_pricing`, `can_see_customer_info`.
- **Webstore Owner** (`UserRole.WEBSTORE_OWNER`) — a real backend role, but deliberately given **zero** tenant-side permissions (`ROLE_PERMISSIONS[WEBSTORE_OWNER] = []`, with an explicit code comment confirming this is intentional: "Webstore owners have NO tenant-side permissions — their access is gated at the dedicated /api/owner-portal routes via a role check"). Authorized by record ownership (`owner_user_id == current_user.id`) on every `/owner-portal/*` route, confirmed correctly scoped on every endpoint reviewed.
- **Webstore Manager** — **does not exist as a role, permission, or any access-control concept anywhere in the codebase.** "Webstore Manager" is exclusively the **page title** shown at the top of `Webstores.js` (`<h1>Webstore Manager</h1>`) — the tenant-admin-facing dashboard for managing webstores. Whoever has `Permission.WEBSTORES_MANAGE` (Owner and Admin, per §5) can use that page; there is no intermediate "can manage webstores but nothing else" role, and no way for a Webstore Owner (the actual external-facing role) to be promoted to a lesser "manager" tier of their own store — they either have the full, separate Owner Portal experience or nothing.
- **Platform Admin** (`UserRole.PLATFORM_ADMIN`) — a real backend role, correctly given every `Permission` via both the dict (`list(Permission)`) and the `has_permission()` hardcoded bypass. Additionally gated by a separate, stricter dependency (`require_platform_admin`) on all `/platform-admin/*` routes.
- **Platform Creator** (`UserRole.PLATFORM_CREATOR`) — the single app-developer account, self-healing via `PLATFORM_CREATOR_EMAIL` env var (Auth doc). **Confirmed broken for access control purposes** — see §2 for the full, live-verified finding: this role has no entry at all in `ROLE_PERMISSIONS`, which silently denies it real functionality through one entire family of permission checks while a second, separate family of checks correctly grants it everything via a hardcoded role-string bypass. The inconsistency between these two families is the headline finding of this document.

### Why This Module Matters
Every write action in the app — and a large fraction of read actions — is gated by *some* form of the checks documented here. When the gating is missing, wrong, or inconsistent (as documented extensively below), the failure mode is either (a) a legitimate user is blocked from something they should be able to do (confirmed for `platform_creator` today), or (b) a user who should be blocked is not (the frontend/backend split documented in §2 and §12 means a hidden UI button is not the same thing as a blocked API call — several endpoints have no permission check at all beyond "are you logged in").

### Module Boundary
**This module owns:**
- The `Permission` enum and `ROLE_PERMISSIONS` mapping (`models/auth.py`).
- The two backend permission-checking functions (`has_permission()` in `core_runtime.py`, `user_has_permission()` in `models/auth.py`) and every route that calls either of them, directly or via a wrapper (`_require_permission()` in `webstores.py`, `require_permission()`/`require_any_permission()` in `server.py`).
- The Platform-Admin-specific gate (`require_platform_admin()` in `platform_admin.py`).
- Frontend permission/role mirrors (`AuthContext.js`'s `Permission`, `UserRole`, `PERMISSION_ALIASES`, `hasPermission()`, `isOwner()`, `isAdminOrOwner()`) and every page-level gate built on them.
- Frontend route-level and nav-level access control (or, as documented below, the confirmed *absence* of it) — `App.js`'s `ProtectedRoutes`, `PrimaryNav.js`.
- Record-level scoping patterns for Customer/Employee/Webstore-Owner portals (the "authorization" half only — authentication/token-issuance for these is owned by the Auth module).
- The Employee Portal's tenant-configurable feature-toggle layer (`employee_portal_settings`/`DEFAULT_PORTAL_SETTINGS`/`require_portal_setting`).

**This module does not own:**
- Password hashing, JWT issuance, login/registration flows themselves — owned by the Auth module (`AUTH_MODULE_REBUILD_DOC.md`); this doc only covers *what a successfully-authenticated identity is then allowed to do*.
- Tenant suspension/active-state gating — owned jointly by Auth and Tenants modules; this doc references it only where it intersects with role checks (it doesn't, meaningfully — suspension is orthogonal to role).
- Tier/plan feature-gating (`services/feature_gate.py`, what a `plan` unlocks) — a *different* kind of "access control" (product-tier gating, not identity-role gating) owned by the Tiers/Plans module; this doc only flags where the two get confused with each other (the broken `SETTINGS_EDIT` permission check inside a tier-management endpoint, already documented in the Tenants module doc, is a role-permission bug living inside tier-gating code — cross-referenced here, not re-litigated).
- Impersonation mechanics — owned by Auth/Platform Admin (already documented); this doc only notes that an impersonated session carries the *target user's* real role/permissions, not the platform admin's own — confirmed correct behavior, not re-derived here.

---

## 2. Current State Summary

### What Exists Today
Access control in this app is not one system — it is **at least five independently-coded mechanisms** that happen to share a common vocabulary (`Permission`, `role`) without sharing a common enforcement path:

1. **`has_permission(user, permission)`** (`core_runtime.py`) — the "safe" one. Hardcodes `if user.role.value in ('owner', 'platform_admin', 'platform_creator'): return True` before ever consulting the `ROLE_PERMISSIONS` dict. Used directly in `routes/auth.py`'s admin user-management endpoints (6 sites), `routes/inventory.py`, and indirectly via `server.py`'s `require_permission()`/`require_any_permission()` dependency factories.
2. **`user_has_permission(role, permission)`** (`models/auth.py`) — the "unsafe" one. Pure dict lookup: `return permission in ROLE_PERMISSIONS.get(role, [])`. **No hardcoded bypass for any role.** Used directly or via the `webstores.py`-local `_require_permission()` wrapper in `routes/ai.py` (4 sites), `routes/ai_assistant_prefs.py` (2 sites), `routes/tiers.py` (3 sites), and `routes/webstores.py` (15 sites via `_require_permission` + 2 direct sites).
3. **`require_platform_admin()`** (`platform_admin.py`) — a third, independent role-string check (`{PLATFORM_ADMIN, "platform_admin", PLATFORM_CREATOR, "platform_creator"}`), used only for `/platform-admin/*` routes. This one is written correctly and does include `platform_creator`.
4. **Frontend `hasPermission()`** (`AuthContext.js`) — a fourth, client-side-only check, driven by (a) a hardcoded `role === 'owner'` bypass and (b) a `permissions` array fetched once at login from `GET /users/me/permissions`, which itself calls a **fifth**, completely bare mechanism: `ROLE_PERMISSIONS.get(current_user.role, [])` with **no bypass of any kind** — the same unsafe dict-only lookup as #2, but this time feeding the entire frontend's UI-gating logic.
5. **No mechanism at all** for the majority of the API surface — most of the 127 route handlers reviewed rely on nothing stronger than `Depends(get_current_active_user)` (i.e., "is this a valid, active, non-suspended session") plus manual `tenant_id` scoping in the query itself. There is no default-deny posture; permission checks are opt-in per endpoint, added by whichever engineer wrote that specific route.

Because mechanism #5 (`ROLE_PERMISSIONS.get(role, [])`, no bypass) is used for the single most consequential call in the entire access-control system — the one that tells the *frontend* what a logged-in user can do — and because `ROLE_PERMISSIONS` has **no key at all for `UserRole.PLATFORM_CREATOR`**, the practical result, confirmed live, is that the platform's own developer/creator account is simultaneously (a) granted everything by mechanism #1, (b) denied everything by mechanisms #2 and #5, and (c) shown a UI with almost every permission-gated element hidden, because the frontend's `permissions` array for that account is an empty list.

### What Works Well
- `has_permission()`'s hardcoded owner/platform_admin/platform_creator bypass is a clean, simple, correct pattern for "these three roles always win" — the *concept* is right, it's just not applied consistently everywhere it needs to be.
- `require_platform_admin()` is correctly written (includes `platform_creator`) and consistently applied across the entire `/platform-admin/*` surface — no gaps found there.
- Record-level scoping for Webstore Owners is airtight everywhere it was checked (`{"id": webstore_id, "owner_user_id": current_user.id}` on every single `/owner-portal/*` query) — one owner genuinely cannot see another owner's store data through this API.
- Record-level scoping for Customers (`get_current_portal_customer`, per the Auth doc) and Employees (own `employee_id`) is similarly solid.
- The Employee Portal's tenant-configurable feature-toggle layer does a **real, correct dict merge** (`{**DEFAULT_PORTAL_SETTINGS, **(tenant.get("employee_portal_settings") or {})}`) — a genuine partial-override pattern, notably *better-built* than the Tenant module's own settings-save endpoint (documented in the Tenants doc as a full-replace-disguised-as-merge). This is a good, small, self-contained pattern worth reusing as-is.
- Staff's permission list is sensibly narrow and matches what a shop-floor employee-with-system-access would plausibly need (own timeclock, customer/quote/job CRUD minus delete, everything else view-only or hidden).

### What Is Broken, Confusing, or Incomplete
- **CRITICAL, CONFIRMED LIVE — the `platform_creator` role has no entry in `ROLE_PERMISSIONS`, breaking real functionality.** Reproduced by logging in as the platform_creator test account and calling `POST /api/webstores/v2` (a legitimate, correctly-formed request to create a webstore) → received `403 {"detail":"You don't have permission to perform this action (webstores:create)."}`. Root cause: `routes/webstores.py`'s `_require_permission()` calls `user_has_permission(role, perm)`, which does `permission in ROLE_PERMISSIONS.get(role, [])`; since `ROLE_PERMISSIONS` has no `UserRole.PLATFORM_CREATOR` key, this evaluates to `permission in []`, always `False`, for every permission, for this role. The same root cause blocks this role from 15 additional webstore-management endpoints, all AI Assistant tool-calling actions gated by `user_has_permission` in `routes/ai.py` (4 sites), AI Assistant preference edits in `routes/ai_assistant_prefs.py` (2 sites), and the tier/settings endpoints in `routes/tiers.py` (which are separately broken for a different reason too, documented in the Tenants module doc).
- **CRITICAL, CONFIRMED LIVE — `GET /api/users/me/permissions` returns a genuinely empty array for `platform_creator`.** Reproduced: `curl .../api/users/me/permissions` with the platform_creator token → `{"role":"platform_creator","permissions":[]}`. Root cause: this endpoint (`routes/auth.py`) computes `permissions = ROLE_PERMISSIONS.get(current_user.role, [])` directly, with **no** hardcoded bypass — the exact same unsafe pattern, feeding the single API call the *entire frontend* uses to populate its permission-gating state. Since the frontend's own `hasPermission()` also has no bypass for `platform_admin`/`platform_creator` (only `'owner'` is special-cased — the frontend's `UserRole` object doesn't even *define* `PLATFORM_ADMIN`/`PLATFORM_CREATOR` as values, per the Auth doc's earlier, narrower finding), the practical effect is: **every single frontend UI element gated by `hasPermission(...)` is hidden when logged in as `platform_creator`**, across the entire tenant-facing application — User Management's edit/create/role buttons, Financials' create/edit actions, and every other `hasPermission()`-gated control found in this session's review. The backend would, in many cases, actually allow the underlying API call (via the safe `has_permission()` path) if the button existed — the UI is simply lying about what this account can do.
- **The declarative, dependency-based permission-guard pattern (`require_permission()`, `require_any_permission()` in `server.py`) is dead code.** Both functions are fully implemented, correctly built on the safe `has_permission()`, and designed exactly the way FastAPI dependency injection is meant to be used (`Depends(require_permission(Permission.X))`). **Grepped the entire backend: zero call-sites.** Every actual permission check in the live app is done imperatively, inline, inside each function body — a strictly worse pattern for consistency (easy to forget, easy to accidentally use the unsafe `user_has_permission` sibling instead) that the codebase itself already built, and abandoned, a better alternative to.
- **Frontend route-level access control does not exist.** `App.js`'s `ProtectedRoutes` checks exactly one thing: `isAuthenticated` (is there a valid session, of *any* role). Every route nested inside it — `/users`, `/financials`, `/settings`, `/webstores`, all ~40 routes — is reachable by typing the URL regardless of role or permission. There is no `<RoleRoute>`/`<PermissionRoute>` wrapper anywhere in the router configuration.
- **Frontend navigation is not role-filtered either.** `PrimaryNav.js`'s `primaryNavItems` array is static — the exact same 13 top-level nav tabs (Dashboard, Orders, Billing, Customers, Webstores, Documents, Team, AI Tools, Financials, Productivity, Reports, Community, Settings) render for every authenticated user regardless of role. The file does not import `useAuth` or `usePlan` at all. A `staff`-role user sees a "Settings" and "Financials" tab in their main navigation identically to an Owner.
- **Frontend and backend `Permission`/`UserRole` enums have meaningfully drifted** (already flagged at a high level in the Auth doc; this doc adds the precise mechanics): the frontend defines 9 permission values that don't exist on the backend at all (`FINANCIALS_CREATE/EDIT/DELETE`, `USERS_CREATE/EDIT/DELETE/MANAGE_ROLES`, `WEBSTORES_EDIT/DELETE`, `AI_TOOLS_USE`, `TIMECLOCK_*` naming instead of backend's `TIME_CLOCK_*`/`time:*`), patched via a 14-entry `PERMISSION_ALIASES` map that catches most — but not all — of these (`AI_TOOLS_USE`/`'ai_tools:use'` has no alias and no backend equivalent at all, meaning `hasPermission('ai_tools:use')` is `false` for literally every role except Owner, forever, regardless of actual entitlement). The frontend's `UserRole` object only defines 3 values (`OWNER`/`ADMIN`/`STAFF`) against the backend's 5 (`PLATFORM_ADMIN`, `PLATFORM_CREATOR`, `WEBSTORE_OWNER` are simply absent from the frontend enum) — which is the direct cause of `isOwner()`/`isAdminOrOwner()` and the `hasPermission()` owner-bypass all failing to recognize platform staff at all.
- **Admin cannot manage users despite the UI/API existing for it** (carried forward from the Auth doc, now scoped precisely to this module): `ROLE_PERMISSIONS[UserRole.ADMIN]` includes `USERS_VIEW` but **not** `USERS_MANAGE`, while `admin_create_user`/`admin_update_user_role`/`admin_delete_user`/`admin_reset_password`/`admin_toggle_user_status` all check for `USERS_MANAGE`. An Admin who opens `UserManagement.js` and clicks Create/Edit/Delete/Reset-Password will be blocked with a 403 from the backend even though — see the next finding — the frontend might have shown them the button in the first place, because the frontend's own permission model doesn't perfectly mirror this specific gap.
- **Admin is missing `PURCHASING_APPROVE`** while having `PURCHASING_MANAGE` and `VENDORS_MANAGE` — **Needs Verification** whether this is an intentional "Admin can create/manage purchase orders but only Owner can approve spend" business rule, or an oversight; no code comment or business-rule documentation clarifies intent either way.
- **No default-deny posture anywhere.** Because permission checks are opt-in, added per-endpoint, a newly-added route that forgets to add any check is fully reachable by any authenticated tenant user (any role) — bounded only by `tenant_id` scoping (which prevents cross-tenant leakage, but not cross-*role* misuse within the same tenant). This session did not exhaustively audit which of the ~127 route handlers have zero permission check (that would require enumerating all 127 individually), but confirmed by construction that at minimum a large fraction rely solely on `Depends(get_current_active_user)`.
- **Customer Portal has no tenant-configurable visibility settings at all**, unlike the Employee Portal's `can_see_job_details`/`can_see_customer_info`/`can_see_pricing`/etc. toggles. A customer with portal access sees everything about their own orders/invoices with no way for the shop to restrict any of it further (e.g., hiding internal pricing breakdowns from a customer-facing proof) — **Needs Verification** whether this asymmetry is an intentional product decision (customers only ever see customer-safe data by construction, so no toggle is needed) or a genuine gap.

### Placeholder / Demo / Fake Data
None found specific to this module — the permission/role definitions and checks are real, live logic (not stubs); the "fakeness" here is entirely in the *inconsistency between real, working pieces*, not in any mocked data.

### Features That Exist in Code but Are Not Visible
- `require_permission()` / `require_any_permission()` dependency factories in `server.py` — fully built, zero callers, effectively invisible dead code (see above).
- The Employee Portal's `require_portal_setting()` helper — a clean, reusable "raise 403 if this tenant-toggle is off" dependency — **Needs Verification** of exactly how many of the 8 `DEFAULT_PORTAL_SETTINGS` keys actually have a corresponding `require_portal_setting()` call gating a real route (not deeply audited endpoint-by-endpoint this session).

### Features Visible in the UI but Not Actually Functional
- **Any `hasPermission()`-gated button, for a user logged in as `platform_admin` or `platform_creator`, that has no corresponding entry in `PERMISSION_ALIASES` and isn't the literal string `'owner'`.** Confirmed concretely for `platform_creator` (empty permissions array, see above); for `platform_admin`, most cases are actually saved by the alias map (since `platform_admin`'s backend permission list is the *full* real list, and the alias map correctly redirects most frontend-only phantom permissions to their real backend equivalents) — except the one already-known `ai_tools:use` case, which has no alias and fails for `platform_admin` too.

---

## 3. User Experience and Navigation

### Where the Module Lives in the App
This module has no dedicated screen of its own — it is entirely cross-cutting, expressed as: (a) which nav tabs render (today: all of them, for everyone, per §2), (b) which buttons/actions render inside each page (via scattered `hasPermission()` calls), and (c) what the backend actually allows when a request lands regardless of what the UI showed.

**Routes / URLs relevant to this module:**
| Route | Screen | Access-control relevance |
|---|---|---|
| `/users` | UserManagement.js | The one screen whose entire purpose *is* managing role-based access; see §2 for its specific `USERS_MANAGE`/Admin gap |
| Every other route in `App.js` | — | Reachable by any authenticated user of any role, per §2's route-guard finding |
| `/platform-admin/*` | Platform Admin screens | The one area of the app with a correctly-implemented, consistent role gate (`require_platform_admin`) at every single endpoint |

### Current Navigation Structure
Flat, unfiltered. `PrimaryNav.js` renders the same 13 tabs for every role; there is no "you don't have access to this" nav state, no hidden/greyed-out tabs, no role-aware nav variant. The only nav-adjacent role signal in the entire layout is `MainLayout.js`'s single `user?.role !== 'owner'` check, which gates a specific onboarding-nudge side-effect, not any navigation item.

### Recommended Rebuild Navigation Structure
**Recommended approach:** Introduce one single source of "what can this role see," consumed identically by (a) the nav (`PrimaryNav.js` should filter `primaryNavItems` against the current user's real permissions before rendering), (b) the router (each `<Route>` should be wrappable in a `<RequirePermission perm={...}>` guard that redirects or shows a clear "you don't have access" state instead of silently rendering a page whose internals may or may not self-protect), and (c) individual page-level buttons (current pattern, kept, but now backed by a corrected permission source). This is a structural rebuild requirement, not a cosmetic nav tweak — see §16.

### Screens in This Module

**Screen Name: User Management**
- Route: `/users`
- Who Can Access It: Any authenticated tenant user can *open* the route (no route guard, per §2); the page itself gates individual actions via `hasPermission(Permission.USERS_VIEW/_EDIT/_CREATE/_MANAGE_ROLES)`
- Purpose: View the tenant's team, create/edit/delete users, change roles, reset passwords
- Main Information Shown: User list with role badges, action buttons scoped by the viewer's own permissions
- Primary Actions: Create User, Edit Role, Reset Password, Enable/Disable, Delete
- Data Source: `GET /admin/users`, `POST /admin/users/create`, `PUT /admin/users/{id}/role`, `PUT /admin/users/{id}/status`, `POST /admin/users/{id}/reset-password`, `DELETE /admin/users/{id}`
- Related Screens: N/A (self-contained)
- Current Problems: Frontend gates on `Permission.USERS_EDIT`/`USERS_CREATE`/`USERS_MANAGE_ROLES` — none of which exist on the backend by that name (caught by `PERMISSION_ALIASES` mapping all three to `users:manage`, which *does* exist) — meaning this specific screen is actually one of the *better-protected* ones today, precisely because its frontend author happened to only use permissions that the alias map covers; Admin sees these buttons rendered (frontend correctly grants `users:manage`... **wait, does it?** — Admin's real backend permission list does *not* include `USERS_MANAGE`, so `GET /users/me/permissions` correctly returns a list without `users:manage` for Admin, so the frontend correctly hides these buttons for Admin too — confirmed no frontend/backend mismatch on this specific screen for the Owner/Admin/Staff population; the mismatch is isolated to platform_admin/platform_creator, who don't normally use this screen day-to-day but would find it fully non-functional if they tried)
- Rebuild Recommendation: Keep the screen's structure; fix the underlying permission source (§2) so it also works correctly for platform staff

---

## 4. Main User Workflows

### Workflow 1: Owner Grants a Staff Member Elevated Access
**User Goal:** Promote a trusted staff member to Admin.
**Starting Point:** `/users` → select user → change role.

**Step-by-Step User Flow:**
1. Owner opens User Management (no route guard stops any role from opening this page, but only an Owner sees/can-use the role-change control per `isOwner()`/backend check).
2. Selects a target user, changes role dropdown to "Admin."
3. Confirms.

**System Actions Behind the Scenes:**
1. `PUT /admin/users/{user_id}/role` checks `has_permission(current_user, Permission.USERS_MANAGE)` (the **safe** function, via `routes/auth.py`'s direct import) — note this endpoint specifically uses the safe path, unlike the webstore/AI/tier endpoints.
2. Blocks self-role-change.
3. `$set`s `users.role` to the new value.

**Data Created or Changed:** `users.role`.
**Notifications / Emails / SMS Sent:** None.
**Required Approvals or Signatures:** None.
**Workflow Completion Condition:** Target user's next `GET /users/me/permissions` call reflects the new role's real permission list.
**Failure or Error Conditions:** Self-role-change (400), caller lacks `USERS_MANAGE` (403 — this is the exact gap that blocks Admin from doing this despite the UI allowing them to try).
**Current Problems:** No audit-log entry is created for a role change (contrast with the Tenants module's Platform-Admin actions, which are all audited) — a security-relevant event (who can now do what) leaves no trace beyond `updated_at`.
**Rebuild Requirement:** Add an audit-log entry for every role change, matching the pattern already proven out on the Platform Admin side of the Tenants module.

---

### Workflow 2: Platform Creator Tries to Use a Normal Tenant Feature
**User Goal:** (Platform Creator, using their own account inside their own "The Signtists Lab" tenant) Create a webstore, or use an AI Assistant tool action.
**Starting Point:** Any page gated by `user_has_permission`.

**Step-by-Step User Flow (as actually observed today):**
1. Log in as the platform_creator test account.
2. Attempt to create a webstore (or use an AI tool action, or edit AI assistant preferences, or view/change tier settings).
3. **The corresponding button is likely not even visible**, because the frontend's `permissions` array for this account is empty (confirmed live).
4. If reached anyway (e.g., via direct API call), the backend returns a genuine `403`.

**System Actions Behind the Scenes:**
1. Frontend: `GET /users/me/permissions` → `{"role":"platform_creator","permissions":[]}`.
2. Frontend `hasPermission(anything)` → `false` for every permission (no owner-string match, empty array, alias lookups also fail since the base array is empty).
3. If a raw API call is made anyway: backend's `_require_permission`/`user_has_permission` → `permission in ROLE_PERMISSIONS.get(PLATFORM_CREATOR, [])` → `permission in []` → `False` → `403`.

**Data Created or Changed:** None — the action fails.
**Notifications / Emails / SMS Sent:** None.
**Required Approvals or Signatures:** None (this isn't a permissions-*policy* gap, it's a bug — platform_creator is supposed to have every permission, per every piece of documentation and every *other* enforcement mechanism in the app).
**Workflow Completion Condition:** N/A — this workflow cannot complete today.
**Failure or Error Conditions:** 403 on direct API call; silent (hidden button) on normal UI use.
**Current Problems:** This is the headline bug of this entire document — see §2, §12.
**Rebuild Requirement:** Add `UserRole.PLATFORM_CREATOR: list(Permission)` to `ROLE_PERMISSIONS` (a one-line fix that resolves both the backend 403s and the frontend empty-permissions-array problem simultaneously, since both ultimately read from this same dict).

---

### Workflow 3: An Employee's View Is Restricted by Their Shop's Portal Settings
**User Goal:** (Shop Owner) Prevent employees from seeing customer contact info or internal pricing in the Employee Portal.
**Starting Point:** `/settings` → Employee Portal section (per the Tenants module doc's Workflow 4).

**Step-by-Step User Flow:**
1. Owner toggles off "Can see customer info" and "Can see pricing" in the Employee Portal settings section.
2. Saves.
3. Every employee's portal session immediately reflects the new restriction (no per-employee override exists — it's tenant-wide).

**System Actions Behind the Scenes:**
1. `PUT /api/tenant` with `{"employee_portal_settings": {...}}` (Tenants module's mechanism).
2. Any employee-portal route that calls `require_portal_setting(tenant_id, "can_see_customer_info")` (or the equivalent inline check) reads the **live-merged** `{**DEFAULT_PORTAL_SETTINGS, **tenant_override}` dict on every request — no caching, no staleness.

**Data Created or Changed:** `tenants.employee_portal_settings`.
**Notifications / Emails / SMS Sent:** None.
**Required Approvals or Signatures:** None.
**Workflow Completion Condition:** Next employee-portal request for a gated section returns 403 "This section is disabled by your admin" if the toggle is off.
**Failure or Error Conditions:** None specific — clean, correct behavior.
**Current Problems:** None found — this is a genuinely well-built corner of the whole access-control system.
**Rebuild Requirement:** Keep exactly as-is; consider extending the same "tenant-wide feature toggle, correctly merged" pattern to the Customer Portal if per-shop customer-visibility control is ever wanted (currently absent, per §2).

---

## 5. Data Structure and Records

### Primary Records Owned by This Module
| Record Type | Purpose | Created By | Edited By | Deleted By | Related Modules |
|---|---|---|---|---|---|
| `Permission` (enum, not a DB record) | The full catalog of grantable actions | Hardcoded in `models/auth.py` | Code changes only | Code changes only | Every module with a permission-gated route |
| `ROLE_PERMISSIONS` (dict, not a DB record) | Which roles get which permissions | Hardcoded in `models/auth.py` | Code changes only | Code changes only | Same as above |
| `User.role` field | Which role a given tenant staff member holds | Registration (`owner`) or `admin_create_user` (any role an Owner grants) | `admin_update_user_role` | N/A | Auth, this module |
| `Tenant.employee_portal_settings` | Per-tenant Employee Portal feature toggles | Defaults to none (falls back to `DEFAULT_PORTAL_SETTINGS`) until an Owner saves an override | `PUT /api/tenant` (Owner only) | N/A | Employee Portal, Team modules |

### Database Collections / Tables
No collection is uniquely owned by this module — `Permission`/`ROLE_PERMISSIONS`/`DEFAULT_PORTAL_SETTINGS` are all in-code constants, not database documents. The only persisted field genuinely "owned" by this module is `User.role` (declared on `models/auth.py`'s `UserBase`, already documented in the Auth doc's data section) and `Tenant.employee_portal_settings` (declared on `models/auth.py`'s `TenantBase`, already documented in the Tenants module doc's data section).

### Data Relationships
```
UserRole (enum, 5 values: owner, admin, staff, platform_admin, platform_creator, webstore_owner — actually 6, see note)
   │
   ├──> ROLE_PERMISSIONS[role] ──> list[Permission]   (MISSING for platform_creator — the core bug)
   │
User.role ──> looked up against ROLE_PERMISSIONS on every permission check

Customer / Employee / WebstoreOwner-as-User ──> no Permission concept; scoped by record ownership only

Tenant.employee_portal_settings ──> merged over DEFAULT_PORTAL_SETTINGS ──> gates Employee Portal sections only
```
*(Note: `UserRole` has 6 values — `owner`, `admin`, `staff`, `platform_admin`, `platform_creator`, `webstore_owner` — the frontend's mirror has only 3.)*

### Source of Truth
| Data Item | Current Source of Truth | Problems | Recommended Rebuild Source |
|---|---|---|---|
| What permissions a role has (backend enforcement) | `ROLE_PERMISSIONS` dict, `models/auth.py` | Missing `platform_creator` entry entirely; two different consumer functions (`has_permission` safe, `user_has_permission` unsafe) treat the same dict differently | One dict, one consumer function, with the "always-true for platform staff" bypass built *into* the dict construction (e.g., `ROLE_PERMISSIONS[PLATFORM_CREATOR] = list(Permission)`, matching Owner/Platform Admin's own entries) so there is no second bypass mechanism to keep in sync |
| What permissions a role has (frontend UI gating) | `GET /users/me/permissions` response, itself sourced from the same dict with no bypass | Same missing-entry bug propagates directly into the UI | Fix the dict; the frontend endpoint then needs no separate fix, since it would start returning the correct full list |
| Which specific `Permission` *names* exist | Two independent enums (`models/auth.py` backend, `AuthContext.js` frontend) | Genuinely different sets of names/values, patched by a partial alias map | One canonical enum; frontend should either import a generated mirror or fetch permission *names* dynamically rather than hand-maintaining a second enum |
| Which nav items / routes a role should see | Nowhere — not modeled at all today | Total absence, not a drift/conflict | A single `ROLE_NAV_MAP`/permission-to-route mapping consumed by both the router and the nav |

### Duplicate or Conflicting Data
- `Permission` enum (backend, 44 values) vs. `Permission` object (frontend, ~35 values with different names for several) — the single highest-priority duplicate-data finding in this module, and the direct cause of the `AI_TOOLS_USE`/`ai_tools:use` permanent-failure case.
- `UserRole` enum (backend, 6 values) vs. `UserRole` object (frontend, 3 values) — direct cause of `isOwner()`/`isAdminOrOwner()`/the frontend `hasPermission()` bypass all failing to recognize platform-staff and webstore-owner roles.
- Two backend functions (`has_permission`, `user_has_permission`) doing the same conceptual job with different, disagreeing implementations against the *same* `ROLE_PERMISSIONS` dict.

---

## 6. Business Rules and Logic

### Core Business Rules
| Rule | Current Behavior | Correct Rebuild Behavior | Priority |
|---|---|---|---|
| Platform staff (Owner, Platform Admin, Platform Creator) always have every permission | **True for Owner and Platform Admin. False for Platform Creator** via the unsafe check path — confirmed live | Fix `ROLE_PERMISSIONS` so this is true unconditionally, via the dict itself, for all three | **P0** |
| Admin has a curated, real-but-incomplete permission set | Confirmed (`USERS_MANAGE` and `PURCHASING_APPROVE` both absent) | Decide intentionally whether Admin should have these (Required Decision, §16) | P1 |
| Staff has the narrowest permission set, no delete rights anywhere, own-timeclock only | Confirmed correct | Keep | Working |
| Webstore Owner has zero tenant-side permissions by design | Confirmed correct, explicitly commented in code | Keep | Working |
| Customers/Employees are scoped by record ownership, not role/permission | Confirmed correct for both | Keep | Working |
| Employee Portal sections can be tenant-wide disabled via a feature toggle | Confirmed correct, real partial-merge | Keep as the template for any future toggle-style gating | Working |
| Every write action should be gated by *some* explicit check, not just "are you logged in" | **Not true today** — many endpoints rely solely on authentication + tenant scoping | Adopt a default-deny-by-permission posture for new endpoints going forward | P1 |

### Statuses and State Changes
Not applicable in the traditional sense — this module has no status-bearing record of its own. The closest analog is `User.role`, whose transitions are covered in Workflow 1.

### Automatic Actions
- None specific to this module beyond what's already documented in the Auth module (e.g., `platform_creator` role self-healing on startup via env var — that *assigns* the role; this module is what determines what having that role actually grants, or fails to grant).

### Calculations and Formulas
Not applicable — this module is pure boolean logic (does role X have permission Y), not numeric.

### Validation Rules
- `Permission` and `UserRole` values are Python/JS enums — any value outside the defined set fails validation at the Pydantic layer on the backend; the frontend has no equivalent runtime validation (a typo'd permission string silently evaluates to "not included," i.e., fails closed — a safe failure mode, at least).

---

## 7. Permissions and Roles

*(This section restates the actual, current, code-verified `ROLE_PERMISSIONS` mapping in full — the ground truth every other section of this document analyzes.)*

### The Complete Permission Catalog (44 values, `models/auth.py`)
`customers:{view,create,edit,delete}` · `quotes:{view,create,edit,delete,convert}` · `jobs:{view,create,edit,delete}` · `invoices:{view,create,edit,delete}` · `time:{own,view_all,manage}` · `payroll:{view,manage}` · `employees:{view,manage}` · `financials:{view,manage}` · `users:{view,manage}` · `settings:{view,manage}` · `webstores:{view,create,manage}` · `products:{view,create,manage}` · `inventory:{view,pull,adjust}` · `purchasing:{manage,approve}` · `vendors:manage` · `platform_admin:{access,impersonate}`

### Role → Permission Matrix (exact, as coded)
| Permission | Owner | Admin | Staff | Platform Admin | Platform Creator (as coded) | Platform Creator (actual, via safe path) | Webstore Owner |
|---|---|---|---|---|---|---|---|
| customers:view/create/edit | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| customers:delete | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| quotes:view/create/edit | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| quotes:delete/convert | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| jobs:view/create/edit | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| jobs:delete | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| invoices:view | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| invoices:create/edit/delete | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| time:own | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| time:view_all/manage | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| payroll:view/manage | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| employees:view | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| employees:manage | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| financials:view | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| financials:manage | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |
| users:view | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| **users:manage** | ✅ | **❌** | ❌ | ✅ | ❌ | ✅ | ❌ |
| settings:view | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| settings:manage | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |
| webstores:view/create/manage | ✅ | ✅ | view only | ✅ | ❌ | ✅ | ❌ |
| products:view/create/manage | ✅ | ✅ | view only | ✅ | ❌ | ✅ | ❌ |
| inventory:view/pull | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| inventory:adjust | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| purchasing:manage | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| **purchasing:approve** | ✅ | **❌** | ❌ | ✅ | ❌ | ✅ | ❌ |
| vendors:manage | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| platform_admin:access/impersonate | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |

*(Bold rows = the two specific "Admin is missing a permission the UI/endpoints assume they'd have" gaps already flagged in §2/§6. The "Platform Creator (as coded)" column is the literal dict-lookup truth used by `user_has_permission`, the frontend's `/users/me/permissions`, and 15+ backend endpoints. The "Platform Creator (actual, via safe path)" column is what `has_permission()`'s hardcoded bypass grants wherever *that* function is used instead — the two columns disagreeing with each other, row for row, is the core finding of this document.)*

### Customer / Portal Permissions
- Customers: no `Permission` concept; scoped entirely by `customer_id` ownership (Auth doc, already documented).
- Employees: no `Permission` concept; scoped by `employee_id` ownership **plus** the tenant-wide `employee_portal_settings` toggle layer (this doc, §1/§4).
- Webstore Owners: `UserRole.WEBSTORE_OWNER` exists as a real role but is deliberately given zero permissions; scoped by `owner_user_id` ownership on every route.

### Sensitive Information
- The `Permission`/`ROLE_PERMISSIONS` mapping itself is not sensitive data, but a bug in it (as documented) has real security/functionality consequences — this is a case where a *code defect* in an access-control module is itself the sensitive risk, not any particular data field.

### Permission Problems in Current App
All fully detailed in §2 and §6. Summarized by severity:
- **P0:** `platform_creator` missing from `ROLE_PERMISSIONS` (live-confirmed, breaks real functionality + entire frontend UI for that role).
- **P0:** Two backend functions (`has_permission` safe, `user_has_permission` unsafe) doing the same job inconsistently, with 26+ confirmed call-sites on the unsafe path.
- **P1:** Dead declarative route-guard code (`require_permission`/`require_any_permission`) never adopted.
- **P1:** No frontend route or nav gating at all.
- **P1:** Frontend/backend `Permission`/`UserRole` enum drift (already flagged in the Auth doc; mechanics detailed here).
- **P2:** Admin missing `USERS_MANAGE` and `PURCHASING_APPROVE` (business-rule decisions needed, not necessarily bugs).

---

## 8. Integrations and External Services
None. This module is pure in-app logic with no third-party service dependency.

### API Endpoints
Rather than re-list all 26+ permission-gated endpoints individually (many already itemized in §2's bug findings), this section characterizes the three access-control *patterns* found across the API surface:

**Pattern A — Safe, dependency-free, imperative check:**
```python
if not has_permission(current_user, Permission.USERS_MANAGE):
    raise HTTPException(status_code=403, ...)
```
Used in: `routes/auth.py` (6 sites), `routes/inventory.py`. Correctly includes platform staff via the hardcoded bypass.

**Pattern B — Unsafe, dependency-free, imperative check:**
```python
if not user_has_permission(current_user.role, Permission.X):
    raise HTTPException(status_code=403, ...)
```
Used in: `routes/ai.py` (4 sites), `routes/ai_assistant_prefs.py` (2 sites), `routes/tiers.py` (3 sites — 2 of which are *also* separately broken by referencing a nonexistent `Permission.SETTINGS_EDIT`, per the Tenants module doc), `routes/webstores.py` (15 sites via `_require_permission` + 2 direct). **Excludes `platform_creator` from every one of these 26 endpoints.**

**Pattern C — Role-string dependency (Platform Admin only):**
```python
def require_platform_admin(current_user: UserInDB = Depends(get_current_user)) -> UserInDB:
    allowed_roles = {UserRole.PLATFORM_ADMIN, "platform_admin", UserRole.PLATFORM_CREATOR, "platform_creator"}
    ...
```
Used in: every `/platform-admin/*` route. Correctly includes both platform roles.

**Pattern D — No permission check at all (authentication only):**
```python
current_user: UserInDB = Depends(get_current_active_user)
```
The majority pattern across the ~127 routes reviewed at a high level; relies purely on `tenant_id` query-scoping for isolation, with zero role/permission differentiation within a tenant.

**Endpoint: `GET /api/users/me/permissions`**
- Purpose: Tell the frontend what the current user can do
- Frontend File Calling It: `AuthContext.js`
- Backend File Handling It: `routes/auth.py`
- Required Authentication: Any authenticated user
- Known Problems: **Confirmed live** to return an empty array for `platform_creator` (§2)
- Rebuild Recommendation: Fix the underlying `ROLE_PERMISSIONS` dict; this endpoint needs no code change of its own once that's fixed

### Webhooks
None.

### Email / SMS / Notification Templates
None owned by this module.

---

## 9. Documents, Files, Images, and Attachments
Not applicable.

---

## 10. AI Features
None directly, but the AI Assistant's tool-calling permission gate (`routes/ai.py`, 4 sites using the unsafe `user_has_permission` pattern) is one of the concrete places this module's core bug causes real, live functional loss for the platform_creator account — flagged here for cross-reference, owned in depth by the AI Assistant module.

---

## 11. Activity Logs, Audit Trail, and Reporting

### Activity Events Created by This Module
**None.** Role changes (`admin_update_user_role`), permission-denied events (every 403 thrown by any of the patterns above), and user status toggles (`admin_toggle_user_status`) create **zero** queryable audit-log records today — confirmed by contrast with the Tenants module, where every Platform-Admin action *is* audited via `log_admin_action`, but no equivalent call exists anywhere in `routes/auth.py`'s user-management endpoints.

### Audit Trail Requirements
For a production rebuild: every role change, every permission-denial on a sensitive action (e.g., repeated attempts to access `/platform-admin/*` by a non-platform-staff account), and every user enable/disable/delete should produce a queryable record — reusing the exact `log_admin_action` pattern already proven correct elsewhere in this codebase.

### Reports and Dashboard Metrics
None.

---

## 12. Errors, Edge Cases, and Failure Handling

### Known Bugs
| Bug | Where It Happens | Severity | Temporary Workaround | Rebuild Fix |
|---|---|---|---|---|
| `ROLE_PERMISSIONS` has no entry for `UserRole.PLATFORM_CREATOR` — **confirmed live**: `POST /api/webstores/v2` returns 403 for this role; `GET /users/me/permissions` returns an empty array | `models/auth.py` | **Critical** — breaks real backend functionality (26+ endpoints) and the entire frontend permission-gated UI for this role | Use a different account (`platform_admin`, if one exists, or `owner`) for any action that touches a `user_has_permission`-gated endpoint or relies on frontend permission-gated buttons | Add `UserRole.PLATFORM_CREATOR: list(Permission)` to the dict — a one-line fix resolving both the backend and frontend symptoms simultaneously |
| Two backend functions (`has_permission` safe, `user_has_permission` unsafe) enforce the *same* conceptual rule differently against the *same* dict | `core_runtime.py` vs. `models/auth.py` | High (root cause of the bug above, and a standing risk that future endpoints will pick the wrong one) | None — pick correctly per new endpoint, manually, forever | Delete one of the two functions; make every consumer use a single, correct implementation |
| Declarative `require_permission()`/`require_any_permission()` dependencies are unused dead code | `server.py` | Medium (missed-opportunity, not an active failure) | None needed | Either adopt them everywhere (replacing every inline imperative check) or delete them to stop misleading future readers into thinking they're the live pattern |
| No frontend route or nav gating | `App.js`, `PrimaryNav.js` | Medium (defense-in-depth gap; backend is the real enforcement layer, but a confused/frustrated low-permission user can navigate to pages that don't gracefully handle their lack of access) | None | Add route-level and nav-level filtering per §16 |
| Frontend/backend `Permission`/`UserRole` enum drift | `AuthContext.js` vs. `models/auth.py`/`enums.py` | Medium (already flagged in Auth doc; `ai_tools:use` is a permanent, un-aliased dead end) | Manual developer awareness | Single source of truth; frontend fetches or generates from backend, never hand-maintains a parallel enum |
| Admin missing `USERS_MANAGE`/`PURCHASING_APPROVE` while UI/endpoints assume they'd have related capability | `models/auth.py` `ROLE_PERMISSIONS[ADMIN]` | Medium (business-rule ambiguity, not necessarily a bug) | Owner performs the action instead | Explicit product decision, then fix the list accordingly |

### Edge Cases
- **A user with an unrecognized/malformed `role` string** (e.g., manually edited in the database to a typo) → both `has_permission()` and `user_has_permission()` fail safely (`ROLE_PERMISSIONS.get(role, [])` defaults to `[]`, and the hardcoded bypass string-compares against a specific literal, so a typo'd role gets zero permissions rather than a crash) — confirmed safe-by-default for this specific edge case, which is the *inverse* of the platform_creator bug (a role that IS recognized still gets nothing, because the dict entry itself is missing, not because the lookup mechanism failed).
- **Impersonation + permission checks**: an impersonated session carries the *target* user's real `role`, so all the same permission logic (and the same platform_creator bug, if the target happens to be a platform_creator account, which would be unusual but not impossible) applies identically — no special-case interaction found.
- **A Staff user directly calling a permission-gated API the UI never exposed to them** (e.g., `curl`-ing `DELETE /admin/users/{id}`) → correctly blocked server-side (`USERS_MANAGE` check) regardless of what the UI showed — confirmed the *backend* half of enforcement is sound wherever a check exists at all; the risk is entirely in endpoints with *no* check (Pattern D) or the *wrong* check function (Pattern B, for platform staff).

### Error Messages
Permission-denial messages are terse but adequate ("You don't have permission to perform this action" / "...(webstores:create)." with the specific permission name included in `webstores.py`'s variant, which is a nice touch not universally applied elsewhere). No leaked internals found in any 403 message reviewed.

### Recovery Rules
No self-service recovery concept applies to this module — a permission denial is either correct (the role genuinely shouldn't do that) or a bug (as extensively documented above); there's no user-facing "request access" or "appeal" flow, nor would one obviously be needed for an internal RBAC system.

---

## 13. Important Files and Code Map

### Frontend Files
| File Path | Purpose | Important Components / Functions | Keep / Replace / Remove |
|---|---|---|---|
| `frontend/src/context/AuthContext.js` | Frontend `Permission`/`UserRole` mirrors, `hasPermission()`, `isOwner()`, `isAdminOrOwner()` | `PERMISSION_ALIASES` | Replace the hand-maintained enums with a backend-sourced mirror; extend `hasPermission()`'s bypass to recognize `platform_admin`/`platform_creator` roles by string, matching the backend's own `has_permission()` pattern, as a defense-in-depth measure even after the root `ROLE_PERMISSIONS` fix |
| `frontend/src/App.js` | Route definitions, `ProtectedRoutes` (auth-only gate) | — | Add a permission/role-aware route wrapper |
| `frontend/src/components/ribbon/PrimaryNav.js` | Static nav item list | `primaryNavItems` | Filter against the current user's real permissions before rendering |
| `frontend/src/components/MainLayout.js` | Layout shell, minimal role-aware side-effects | `SupportModeBanner` | Keep; this file's own role-usage is narrow and correct for its specific purpose |
| `frontend/src/pages/UserManagement.js` | Role-management UI | `canViewUsers`/`canEditUsers`/etc. | Keep structure; benefits automatically once the root permission source is fixed |

### Backend Files
| File Path | Purpose | Important Functions / Endpoints | Keep / Replace / Remove |
|---|---|---|---|
| `backend/models/auth.py` | `Permission` enum, `ROLE_PERMISSIONS` dict, `user_has_permission()` | — | **P0 fix**: add the missing `PLATFORM_CREATOR` entry; consider deleting `user_has_permission()` entirely in favor of one canonical function |
| `backend/core_runtime.py` | `has_permission()` (the safe function) | — | Keep as the *one* canonical permission-check function once `user_has_permission()`'s callers are migrated over |
| `backend/server.py` | `require_permission()`/`require_any_permission()` dependency factories (unused) | — | Either adopt everywhere or delete |
| `backend/routes/webstores.py` | `_require_permission()` local wrapper (unsafe path), 15 call-sites | — | Repoint to the safe `has_permission()` (or delete the wrapper once the dict fix makes both functions agree) |
| `backend/routes/ai.py`, `ai_assistant_prefs.py`, `tiers.py` | Additional `user_has_permission()` call-sites | — | Same fix as above |
| `backend/routes/platform_admin.py` | `require_platform_admin()` (correctly written) | — | Keep as the template for how a role-gate dependency *should* be written |
| `backend/routes/employee_portal.py` | `DEFAULT_PORTAL_SETTINGS`, `require_portal_setting()` | — | Keep as the template for tenant-configurable feature toggles |

### Shared Files / Utilities
| File Path | Purpose | Used By | Rebuild Notes |
|---|---|---|---|
| `backend/models/auth.py`'s `ROLE_PERMISSIONS` | The single dict every permission check ultimately reads | Nearly every route file in the backend, plus (transitively) the entire frontend via `/users/me/permissions` | The one dict that, if fixed, resolves the majority of this document's findings in one change |

### Styles / Design Files
Not applicable — this module has no visual layer of its own.

### Tests
**Needs Verification** — no test file specifically named for permissions/RBAC (e.g., `test_permissions.py`, `test_rbac.py`) was found by name in this session's review. Given the concrete, reproducible nature of the platform_creator bug, this is a strong candidate for the very first regression test the next builder should write: log in as each of the 6 backend roles, call one endpoint from each of Pattern A/B/C/D above, and assert the expected 200/403 for each combination.

---

## 14. Design and Layout Requirements

### Current Visual Problems
- No visual indication anywhere that a rendered page/nav item might not actually be usable for the current role (since nothing is filtered at the nav/route level, a low-permission user can click into a page and only discover their limits when individual buttons happen to be hidden, or a save action fails with a toast).

### Must-Keep Visual Elements
- Where page-level gating *does* exist (e.g., `UserManagement.js`'s `canViewUsers`/`canEditUsers` conditional rendering), the pattern of simply not rendering an action the user can't perform (rather than rendering it disabled with no explanation) is a reasonable, unobtrusive UX choice worth keeping.

### Rebuild Design Requirements
- Introduce a consistent "you don't have access to this" empty-state/redirect pattern for any route a role genuinely shouldn't reach, rather than either (a) silently rendering a broken/empty page (today's risk) or (b) a jarring raw error.
- Nav items that a role cannot use at all should not render rather than rendering and then failing — consistent with the one good existing pattern noted above.

---

## 15. Module Dependencies

### Modules This Module Depends On
| Dependency Module | Why It Is Needed | Required Data / Actions | Rebuild Risk |
|---|---|---|---|
| Auth | Provides the authenticated `current_user`/`role` this entire module operates on | `get_current_user`/`get_current_active_user` | High — any change to how `role` is resolved/stored ripples through every permission check documented here |
| Tenants | Owns the `Tenant.employee_portal_settings` field this module's toggle layer reads/writes | Read/write that one field | Low — clean boundary already |

### Modules That Depend on This Module
| Dependent Module | What It Needs From This Module | Rebuild Risk |
|---|---|---|
| Literally every module with a write endpoint (Orders, Webstores, AI Assistant, Tiers, Inventory, etc.) | A correct `has_permission()`/`ROLE_PERMISSIONS` result to decide whether to allow the action | **Highest risk in the app** — the platform_creator bug alone currently affects 4 other modules' endpoints (AI, AI Assistant Prefs, Tiers, Webstores); any further inconsistency here has an equally wide blast radius |
| Frontend, entirely | The `/users/me/permissions` response, to decide what to render | High — a bug here doesn't just block an action, it can make an entire feature area *appear* to not exist for an affected role |

### Events This Module Sends
None (no event bus in this app, per the pattern already noted in the Auth and Tenants docs).

### Events This Module Receives
None.

---

## 16. Migration and Rebuild Strategy

### Existing Data That Must Be Preserved
- Every `User.role` value currently in the database — the rebuild must not change what role any existing user holds, only fix what that role is correctly entitled to do.
- `Tenant.employee_portal_settings` overrides — must carry forward unchanged (the mechanism is already correct).

### Existing Data That Can Be Archived
Not applicable — no historical/log data exists for this module today (a gap noted in §11, not something to archive).

### Existing Data That Should Not Be Migrated
- Neither `has_permission()` nor `user_has_permission()` as *two separate functions* should survive into the rebuild — one canonical function, built on the safe pattern, should replace both.
- The unused `require_permission()`/`require_any_permission()` dependency factories should not be silently carried forward without a decision on whether to actually adopt or delete them.

### Recommended Rebuild Order
**Phase 1: Foundation** — Fix `ROLE_PERMISSIONS` to include every real `UserRole` (the P0, one-line-plus-testing fix); consolidate `has_permission()`/`user_has_permission()` into one function; migrate all 26+ unsafe-path call-sites onto it.

**Phase 2: Core Workflow** — Adopt the declarative `require_permission()`/`require_any_permission()` pattern (or an equivalent) as the *only* way new routes declare their permission requirement, replacing ad hoc inline checks going forward; add frontend route-level and nav-level filtering.

**Phase 3: Automation and Integrations** — Reconcile frontend/backend `Permission`/`UserRole` enums into one source of truth; add audit logging for role changes and user status changes.

**Phase 4: Advanced Features** — Resolve the Admin `USERS_MANAGE`/`PURCHASING_APPROVE` business-rule questions; decide whether Customer Portal needs a tenant-configurable visibility-toggle layer analogous to the Employee Portal's.

**Phase 5: Reports, AI, and Polish** — Build the regression-test suite described in §13; add a "you don't have access" UX pattern for any route/nav item a role can't use.

### Rebuild Risks
- The `ROLE_PERMISSIONS` fix itself is low-risk (additive — it only *grants* permissions to a role that currently has none, it cannot newly deny anything that currently works), but **must be paired with re-testing every `user_has_permission`-gated endpoint** to confirm platform_creator now passes where it should.
- Consolidating `has_permission()`/`user_has_permission()` into one function is higher-risk — every one of the 26+ call-sites must be re-verified against its intended role matrix (Owner/Admin/Staff should see **no behavior change**; only platform_admin/platform_creator behavior should change, and only in the direction of *gaining* access they were incorrectly denied).
- Adding frontend route/nav gating changes real, visible UX for every role simultaneously — needs a broader regression pass across the whole app's navigation, not just this module's own screens.

### Required Decisions Before Building
1. Should Admin have `USERS_MANAGE` (manage the team) and/or `PURCHASING_APPROVE` (approve purchase-order spend)? Currently blocked despite UI/endpoints assuming they might.
2. Should the Customer Portal get a tenant-configurable visibility-toggle layer like the Employee Portal's, or is "customers only ever see customer-safe data by construction" sufficient by design?
3. Should the rebuild adopt the existing (currently unused) declarative dependency pattern for all new routes, or design a different enforcement mechanism from scratch?
4. Should frontend permission/role constants be fetched dynamically at runtime, or code-generated from the backend at build time? Either resolves the drift; the choice affects tooling, not behavior.

---

## 17. Testing Requirements

### Critical Tests
| Test Scenario | Expected Result | Priority |
|---|---|---|
| Log in as `platform_creator`, call `GET /users/me/permissions` | **Today: empty array.** Post-fix: full 44-permission list | Critical (post-fix) |
| Log in as `platform_creator`, call `POST /api/webstores/v2` with a valid body | **Today: 403.** Post-fix: 200/success | Critical (post-fix) |
| Log in as `staff`, attempt `DELETE /admin/users/{id}` | 403 (`USERS_MANAGE` required) | Critical |
| Log in as `admin`, attempt `PUT /admin/users/{id}/role` | **Today: 403** (Admin lacks `USERS_MANAGE`) — confirm this matches the Required Decision #1 outcome | High |
| Log in as `webstore_owner`, attempt any `/admin/*` or tenant-scoped endpoint | 403 or 404 (zero tenant-side permissions, `tenant_id=None`) | Critical |
| Log in as `staff`, navigate directly to `/users` or `/financials` by URL | **Today: page loads** (no route guard); individual buttons within may or may not be hidden depending on that page's own gating | High (documents current behavior; rebuild should change this) |
| Employee Portal with `can_see_pricing=false`, employee requests a pricing-gated section | 403 "This section is disabled by your admin" | Critical |

### Manual Test Checklist
- [x] Confirm permissions work → True for Owner/Admin/Staff on the endpoints they were specifically checked against; **false for platform_creator on 26+ endpoints** (documented, live-confirmed)
- [x] Confirm activity log is created → **Currently fails** for every role change / permission event in this module
- [ ] Confirm mobile layout works → N/A, no dedicated UI
- [x] Confirm error states are understandable → 403 messages are clear where they exist; the bigger problem is *silence* (hidden buttons) rather than unclear errors
- [x] Confirm no duplicate records are created → N/A, no records created by this module

### Definition of Done
This module is complete only when: (1) every real backend role has a correct, complete entry in one single permission-source dict, consumed by exactly one enforcement function everywhere in the backend, (2) the frontend's permission/role model is generated from or fetched from that same source rather than hand-maintained separately, (3) route-level and nav-level access control exists on the frontend (not just individual button-level gating), (4) role changes and permission-denial events on sensitive actions are audit-logged, and (5) the Admin permission gaps have been resolved per an explicit business decision rather than left as an accidental side-effect of an incomplete list.

---

## 18. Final Rebuild Recommendation

### Keep
- The *concept* of `has_permission()`'s hardcoded "these roles always win" bypass — correct pattern, just needs to be the *only* pattern.
- `require_platform_admin()` exactly as written — the one consistently-correct role-gate in the whole app.
- The Employee Portal's tenant-configurable feature-toggle mechanism (`DEFAULT_PORTAL_SETTINGS` + real dict merge) — genuinely well-built, reusable elsewhere.
- Record-level scoping for Customers, Employees, and Webstore Owners — all confirmed correctly isolated wherever checked.
- Staff's and Webstore Owner's specific permission grants (narrow-by-design, correctly implemented) — the *lists* are fine, only the *enforcement mechanism* around them is broken.

### Rebuild From Scratch
- The permission-enforcement layer itself: one dict, one function, used everywhere, with `platform_creator` correctly included from day one.
- Frontend Permission/Role constants — generated from or fetched from the backend, never hand-maintained twice.
- Frontend route-level and nav-level access control — currently doesn't exist at all.

### Merge With Another Module
- Audit logging for this module's events should reuse the exact `log_admin_action` infrastructure already built and proven in the Tenants/Platform-Admin module, rather than inventing a second logging mechanism.

### Remove
- Either `require_permission()`/`require_any_permission()` (if not adopted) or every remaining inline imperative permission check (if they are adopted) — not both patterns living side-by-side indefinitely.
- One of `has_permission()`/`user_has_permission()` — they should not both exist once the rebuild is done.

### Postpone
- Per-employee (rather than tenant-wide) Employee Portal visibility overrides — a plausible future enhancement, not required to fix today's actual bugs.
- A Customer Portal visibility-toggle layer — valuable if the business wants it, not blocking.

### Recommended Priority
- [x] Critical

### One-Paragraph Builder Handoff
This app's access control is built on a genuinely reasonable design (a `Permission` enum, a `ROLE_PERMISSIONS` dict, record-level scoping for populations that don't have roles) that has been undermined by **exactly one missing dictionary entry and one duplicated, inconsistent enforcement function**. `ROLE_PERMISSIONS` has no key for `UserRole.PLATFORM_CREATOR` — confirmed, live, to return a 403 on a legitimate webstore-creation request and an empty permissions array from the endpoint that drives the *entire frontend's* button-visibility logic, meaning the platform's own developer/creator account currently can't see or use large parts of the tenant-facing app through its own UI, even though a *second*, separate permission-check function (`has_permission()`, used by a minority of endpoints) correctly grants that same account everything via a hardcoded bypass. The fix for the core bug is one line; the real rebuild work is consolidating the two disagreeing enforcement functions into one, and then — separately, but just as importantly — building the frontend route-level and navigation-level access control that doesn't exist today at all (currently, every authenticated user of every role can navigate to every URL and see every nav tab; the only thing standing between a Staff user and the Financials or User Management screens is whatever that specific page's author remembered to gate with `hasPermission()`, and nothing stops them from reaching the URL in the first place). Everything about *what* each role and record-scoped population (Customer, Employee, Webstore Owner) is supposed to be able to do is well-thought-out and mostly correctly captured in the data — the failure is entirely in *how consistently that data is actually enforced*, both across backend call-sites and between backend and frontend.

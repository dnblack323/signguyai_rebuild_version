# AUTHENTICATION, LOGIN, REGISTRATION & ACCOUNT ACCESS — Rebuild Documentation

## Module Status
- [x] Existing and working (Main tenant auth, password reset, impersonation)
- [x] Existing but incomplete (Owner Portal signup, employee PIN "set-pin")
- [x] Existing but broken (Employee PIN placeholder endpoint — see §2)
- [ ] Partially built / prototype
- [ ] Planned only
- [x] Needs replacement (Employee PIN storage/verification — plaintext)
- [ ] Needs verification (specific items called out inline below)

**Documentation Date:** 2026-07-02
**Completed By:** E1 (AI Agent) — direct code inspection, no screenshots used
**Repository / Branch Reviewed:** `/app/` (current preview checkout, main branch per `.emergent` metadata)
**Related App Version / Deployment:** Preview environment `ai-cost-audit.preview.emergentagent.com`; production tenant referenced in `test_credentials.md` (`thesigntistslab@gmail.com`)

> **Method note:** Every claim below was verified by reading the actual file (not inferred from UI). Files read in full or in relevant ranges: `backend/routes/auth.py` (685 lines, full), `backend/models/auth.py` (286 lines, full), `backend/core_runtime.py` (164 lines, full), `backend/routes/portal.py` (auth section), `backend/routes/employee_portal.py` (full auth section + helpers), `backend/routes/webstore_owners.py` (auth/onboarding section), `backend/routes/platform_admin.py` (impersonation section), `backend/routes/customers.py` (portal-invite section), `backend/routes/employees.py` (PIN handling grep), `backend/server.py` (startup + CORS + password-audit sections), `frontend/src/context/AuthContext.js` (full), `frontend/src/pages/Login.js` (full), `frontend/src/pages/ResetPassword.js` (full), `frontend/src/pages/AccountSuspended.js` (full), `frontend/src/components/TrialLockout.js` (full), `frontend/src/lib/authStorage.js` (full), `frontend/src/lib/suspensionGuard.js` (full), `frontend/src/pages/OwnerPortal.js` (auth section), `frontend/src/pages/UserManagement.js` (header section), backend `.env` (secret/config values).

---

## 1. Module Identity

### Module Name
Authentication, Login, Registration & Account Access (spans 4 separate auth systems in the current code — see Module Boundary).

### Alternate / Legacy Names
- Code comments call it "Auth" (`routes/auth.py`), no other legacy name found for the main system.
- Customer-facing version is called "Customer Portal Auth" (`routes/portal.py` — `/api/portal/auth/*`).
- Employee-facing version is called "Employee Portal Auth" (`routes/employee_portal.py` — `/api/employee-portal/auth/*`).
- Webstore-owner-facing version has **two names in code**: "Webstore Owner Connect" (quick invite, no login) and "Webstore Owner Portal" (`portal_router`, has login) — both live in the same file `webstore_owners.py`.
- `platform_creator` role is referred to in comments as "the one app developer/creator" account.

### Primary Purpose
Verify who is making a request, issue a signed session token, and gate what that person can see/do — across five distinct populations: shop staff (owner/admin/staff), the shop's own customers, the shop's employees, non-tenant webstore owners (fundraiser/creator organizers), and Emergent/SignGuy platform staff.

### Main Users
- Shop Owner (`role=owner`) — full access, only role that can create another owner, delete users, or reassign roles.
- Admin (`role=admin`) — broad access, cannot manage owners.
- Staff (`role=staff`) — limited access (own timeclock, view-only on several modules).
- Platform Admin (`role=platform_admin`) — Emergent/SignGuy support staff, all permissions + impersonation.
- Platform Creator (`role=platform_creator`) — the single app developer account, auto-assigned via env var, all permissions.
- Customer (via Customer Portal, not a `User` document — a `Customer` document with `portal_enabled`/`portal_password_hash` fields).
- Employee (via Employee Portal, not a `User` document — a separate `employees` collection with email+PIN).
- Webstore Owner (`role=webstore_owner`, a `User` document with `tenant_id=None`) — fundraiser/creator organizer, not shop staff.

### Why This Module Matters
Every other module in the app is tenant-isolated (`tenant_id` scoping) and permission-gated. If this module breaks: (a) shop staff cannot get into their own business data, (b) a bug here can leak one tenant's data to another tenant (multi-tenant isolation depends on `get_current_active_user` correctly resolving `tenant_id`), (c) customers/employees/owners lose access to their respective portals, and (d) platform admins lose the ability to support customers via impersonation.

### Module Boundary
**This module owns:**
- User/Tenant registration, login, JWT issuance and verification (`routes/auth.py`, `core_runtime.py`)
- Password hashing, password reset (forgot/reset flow), password-hash format audit
- Role → Permission mapping (`models/auth.py` `ROLE_PERMISSIONS`) and the `has_permission()` check used by every other route
- Customer Portal auth (register/login/change-password) — `routes/portal.py` auth section only
- Employee Portal auth (PIN login) — `routes/employee_portal.py` auth section only
- Webstore Owner invite, onboarding (Stripe Connect via public token), and Owner Portal signup/login — `routes/webstore_owners.py`
- Platform Admin impersonation (start/exit/audit log) — `routes/platform_admin.py` impersonation endpoints only
- Account suspension gate (`tenant.is_active`) and trial-lockout gate (separate concept, see §2)
- Frontend: `AuthContext.js`, `Login.js`, `ResetPassword.js`, `AccountSuspended.js`, `TrialLockout.js`, `authStorage.js`, `suspensionGuard.js`

**This module does not own:**
- User Management UI beyond create/edit/delete/role-change actions (`UserManagement.js` screen itself is documented here only for its auth actions, not its general "team" framing)
- Employee HR data (hourly rate, schedule, tasks) — owned by Team/Payroll module
- Customer CRM data (name, notes, branding profile) — owned by Customers module
- Webstore business data (products, orders, payouts) — owned by Webstores module
- Tenant billing/subscription state itself — owned by Billing module (this module only *reads* `tenant.is_active` and trial-status to gate access)
- Platform Admin's non-impersonation features (tenant list, analytics, broadcast email, site settings) — owned by Platform Admin module

---

## 2. Current State Summary

### What Exists Today
Four **independently implemented** authentication systems share one JWT secret (`SECRET_KEY` from `JWT_SECRET_KEY` env var) and one `jwt.encode`/`decode` mechanism, but each has its own login endpoint, its own token shape, its own storage key, and — in one case — its own (weaker) credential-verification method:

1. **Main tenant auth** (`/api/auth/*`) — email+password, bcrypt, full RBAC, password reset via SendGrid, works end-to-end.
2. **Customer Portal auth** (`/api/portal/auth/*`) — email+password, bcrypt, but password is set either by the customer themself (self-service "register" using a pre-existing customer email) or by staff sending a temporary numeric PIN via email as the "password". No forgot-password self-service flow exists.
3. **Employee Portal auth** (`/api/employee-portal/auth/*`) — email + 4-6 digit PIN, **stored and compared in PLAINTEXT** (not bcrypt), with a hard-coded fallback PIN of `"1234"` when no PIN has been set.
4. **Webstore Owner Portal auth** (`/api/owner-portal/*` for login/signup, but actually reuses `/api/auth/login`) — email+password, bcrypt, account created from a one-time invite token, `tenant_id=None`.

Plus a fifth mechanism layered on top of #1: **Platform Admin impersonation**, which mints a normal user JWT with extra `impersonating` claims, letting a platform admin act as any tenant user without knowing their password.

### What Works Well
- Password reset flow (forgot/reset password) is well-built: single-use SHA-256-hashed tokens, 60-minute expiry, no email-enumeration leak, prior tokens invalidated on new request, confirmed working via SendGrid in a prior session (per handoff).
- Main login/register correctly hashes with bcrypt, self-heals legacy hash formats on successful login (`current_hash != fresh_hash` re-hash), and blocks disabled users / suspended tenants with clear error payloads.
- Tenant suspension gate (`tenant.is_active == False`) is enforced in **two** places independently (`/auth/login` and `get_current_active_user`), so a suspended tenant is blocked both at login time and on every subsequent request — good defense in depth.
- Impersonation is fully audit-logged (`impersonation_logs` collection + `admin_audit` service) with start/end timestamps and duration.
- `platform_creator` role self-heals on every backend restart via `PLATFORM_CREATOR_EMAIL` env var — cannot be granted any other way, reducing privilege-escalation risk.
- "Remember me" correctly extends token lifetime to 30 days; default session is 24 hours.
- `/auth/setup-admin` bootstrap endpoint is safely disabled by default (`ENABLE_SETUP_ADMIN` env var not set in current `.env` → returns 404) and additionally requires a secret-key match even when enabled.

### What Is Broken, Confusing, or Incomplete
- **`POST /api/employee-portal/auth/set-pin` is a non-functional placeholder.** It accepts a `new_pin` and returns `{"message": "PIN updated successfully"}` but the code literally says `# This would need proper auth in production. For now, simplified implementation` and **never writes to the database**. Any UI that calls this to let an employee change their own PIN silently does nothing.
- **Employee PINs are stored in plaintext** in `db.employees.pin` and compared with `==` (not bcrypt) in `employee_login()`. This is a real security weakness relative to the rest of the app (Users and Customers both use bcrypt).
- **Employee PIN falls back to a hardcoded default `"1234"`** for any employee whose `pin` field is empty, and separately falls back to "last 4 digits of phone" — meaning a shop that hasn't explicitly set PINs has an easily-guessable default login for every employee.
- **No brute-force / rate-limiting / account-lockout protection anywhere** — confirmed via full-repo grep (no `failed_attempts`, `lockout`, `slowapi`, or rate-limit logic on any of the 4 login endpoints). Unlimited password/PIN guesses are possible.
- **Frontend `Permission` enum (`AuthContext.js`) does not match the backend `Permission` enum (`models/auth.py`) 1:1.** The frontend defines several permissions that don't exist on the backend at all (`FINANCIALS_CREATE`, `FINANCIALS_EDIT`, `FINANCIALS_DELETE`, `USERS_CREATE`, `USERS_EDIT`, `USERS_DELETE`, `USERS_MANAGE_ROLES`, `WEBSTORES_EDIT`, `WEBSTORES_DELETE`, `AI_TOOLS_USE`), and uses different string values for others (`timeclock:view_own` vs backend's `time:own`). A `PERMISSION_ALIASES` map patches most of these, but `AI_TOOLS_USE` has **no alias and no backend equivalent** — any `hasPermission('ai_tools:use')` check always returns `false` for non-owners regardless of actual entitlement.
- **Frontend `UserRole` enum (`AuthContext.js`) only defines `OWNER`/`ADMIN`/`STAFF`** — missing `PLATFORM_ADMIN`, `PLATFORM_CREATOR`, `WEBSTORE_OWNER` (backend has 5 roles). `isOwner()` checks `user?.role === UserRole.OWNER` (string `'owner'`), so it correctly returns `false` for `platform_admin`/`platform_creator` even though the backend's `has_permission()` treats those three roles identically. This can cause the UI to hide owner-only buttons from a platform admin who is legitimately allowed to use them server-side.
- **Owner Portal (`OwnerPortal.js`) does not use the shared `authStorage.js` helper.** It reads/writes `localStorage.getItem('owner_portal_token')` directly. Every other portal (main app, Customer Portal, Employee Portal) goes through the centralized `authStorage.js` module. This is the 4th, inconsistent storage pattern.
- **No email verification step anywhere.** `POST /auth/register` creates the tenant, user, and 48-hour trial immediately from an unverified email address. Same for Customer Portal registration.
- **No self-service "forgot password" for the Customer Portal.** Only the main tenant login has `/auth/forgot-password`. A customer who forgets their portal password has no recovery path except asking shop staff to re-send an invite (which generates a brand-new random PIN, effectively resetting the account).
- **Webstore owner user creation uses `str(__import__("uuid").uuid4())`** instead of a normal top-level `import uuid` — a code smell suggesting this endpoint was patched in quickly; harmless functionally but a rebuild cleanliness flag.
- **JWT is fully stateless with no revocation list.** Disabling a user (`is_active=False`) blocks them on their *next* request (since `get_current_active_user` re-checks the DB every time), but an already-issued token cannot be proactively invalidated before its natural expiry — this is a reasonable stateless-JWT tradeoff, not a bug, but should be a **conscious decision** carried into the rebuild, not an accident.

### Placeholder / Demo / Fake Data
- Test credentials file (`/app/memory/test_credentials.md`) documents multiple non-production test accounts, including `preview-payroll@example.com` with PIN `1234` (i.e., relying on the hardcoded default-PIN fallback described above) and several `*@example.com` accounts used only for QA.
- `/auth/setup-admin`'s `promo_codes` seeding accepts arbitrary promo-code definitions in the request body — purely a bootstrap/demo tool, not real business data.
- No fake/mocked data was found inside the auth code paths themselves (login/register/reset are real DB reads/writes) — the "fakeness" here is limited to test accounts and the disabled bootstrap endpoint.

### Features That Exist in Code but Are Not Visible
- `POST /auth/setup-admin` — fully implemented (password reset + promo seeding + platform-owner flag setting) but gated off by default; no UI calls it. Emergency/manual-bootstrap tool only.
- `POST /employee-portal/auth/set-pin` — visible as an endpoint but non-functional (see above); unclear if any frontend screen currently calls it (needs verification — no direct call-site found in the files reviewed).
- Impersonation JWT claims (`impersonating`, `impersonation_log_id`, `platform_admin_id`, `platform_admin_email`) are decoded and attached to the user object server-side and surfaced via `GET /users/me`, consumed by `SupportModeBanner.js` — this works, just not obvious from the main login UI.
- `GET /admin/impersonation-logs` and its "end log" endpoint exist for audit purposes; not confirmed whether a UI table renders this list today (likely part of `PlatformAdminAuditLog.js` — **Needs Verification**).

### Features Visible in the UI but Not Actually Functional
- Any employee-portal "change my PIN" UI action, if one exists in `EmployeePortalProfile.js`, would call the dead `/auth/set-pin` endpoint and appear to succeed (toast: "PIN updated successfully") while doing nothing — **Needs Verification** of whether `EmployeePortalProfile.js` actually surfaces this action; the backend half is confirmed broken either way.

---

## 3. User Experience and Navigation

### Where the Module Lives in the App
**Top-Level Area:** Not part of the main ribbon nav at all — auth screens are pre-nav (rendered before `MainLayout`/`PrimaryNav` mount).
**Subsection:** N/A (public routes in `App.js`, outside `ProtectedRoutes`).

**Routes / URLs:**
| Route | Screen | Auth required |
|---|---|---|
| `/login` | Login.js (login + register combined) | No |
| `/reset-password?token=...` | ResetPassword.js | No (token-based) |
| `/account-suspended` | AccountSuspended.js | No (reads sessionStorage) |
| `/register` | redirects to `/login?register=true` | No |
| `/customer-portal/login` | PortalLogin.js | No |
| `/employee-portal/login` | EmployeePortalLogin.js | No |
| `/owner-portal-signup/:token` | OwnerPortalSignup.js | No (token-based) |
| `/webstore-owner/onboard/:token` | WebstoreOwnerOnboard.js | No (token-based, Stripe onboarding not login) |
| `/owner-portal` | OwnerPortal.js | Yes (its own JWT, has inline login form for returning users) |
| `/users` | UserManagement.js | Yes, `USERS_VIEW`/`USERS_MANAGE` permission |
| `/platform-admin/tenants/:tenantId` | PlatformAdminTenantDetail.js (impersonate button) | Yes, `platform_admin` role |

### Current Navigation Structure
No tabs, sidebar, or ribbon inside the auth screens themselves. `Login.js` toggles between Login/Register/Forgot-Password as three view-states of one component (no sub-routes). `TrialLockout` and `AccountSuspended` are full-screen takeovers rendered above the entire app when triggered, not navigable pages.

### Recommended Rebuild Navigation Structure
**Recommended main pages:**
1. `/login` — sign-in only (remove embedded register form)
2. `/register` — dedicated sign-up page (currently a toggle-state hack)
3. `/forgot-password` and `/reset-password` — dedicated routes (currently forgot-password is a toggle-state inside `/login`, not its own route — no deep-linkable "forgot password" URL exists today, worth fixing)

**Recommended detail pages:**
1. `/users` (Team & Access settings) — keep, but move under `/settings/users` per the earlier Architecture Map's Settings-consolidation recommendation
2. `/account-suspended` — keep as-is, it's a correct dead-end screen
3. Impersonation banner — keep as global overlay, not a page

**Recommended tabs or sections:** None needed — auth is inherently a linear flow, not a tabbed workspace.

### Screens in This Module

**Screen Name: Login / Register**
- Route: `/login`
- Who Can Access It: Anyone (public)
- Purpose: Sign in to an existing tenant account, or self-register a brand-new tenant + owner account with a 48-hour trial
- Main Information Shown: Email, password, (register-only) full name + company name, remember-me checkbox
- Primary Actions: Sign In, Create Account, Forgot Password
- Secondary Actions: Toggle between login/register, show/hide password
- Filters / Search / Sorting: None
- Data Source: `POST /api/auth/login`, `POST /api/auth/register`
- Related Screens: ResetPassword, AccountSuspended (redirect target on 403), Dashboard (redirect target on success)
- Current Problems: Combines login+register+forgot-password into one component with three internal states instead of three routes; no CAPTCHA/rate limiting
- Rebuild Recommendation: Split into 3 routes; add basic rate limiting (see §6 Rebuild Requirement)

**Screen Name: Reset Password**
- Route: `/reset-password?token=...`
- Who Can Access It: Anyone with a valid, unexpired, unused token from the reset email
- Purpose: Complete a password reset
- Main Information Shown: New password, confirm password
- Primary Actions: Reset Password
- Secondary Actions: Back to login
- Filters / Search / Sorting: None
- Data Source: `POST /api/auth/reset-password`
- Related Screens: Login
- Current Problems: None significant — this is the best-built screen in the module
- Rebuild Recommendation: Keep as-is

**Screen Name: Account Suspended**
- Route: `/account-suspended`
- Who Can Access It: Anyone (reads `sessionStorage`, not auth-gated)
- Purpose: Explain why a tenant was suspended and offer a support contact
- Main Information Shown: Suspension reason, suspended-at timestamp
- Primary Actions: Contact Support (mailto), Back to Login
- Secondary Actions: None
- Filters / Search / Sorting: None
- Data Source: `sessionStorage` key `tenant_suspension_info` (populated by `AuthContext`/`suspensionGuard.js` on a 403 `tenant_suspended` response)
- Related Screens: Login
- Current Problems: `mailto:support@signguy.ai` is hardcoded — **Needs Verification** whether this is the correct/current support address (differs from `thesigntistslab@gmail.com` used elsewhere in the app for support contact)
- Rebuild Recommendation: Pull support email from a tenant-config/env value instead of hardcoding

**Screen Name: Customer Portal Login**
- Route: `/customer-portal/login`
- Who Can Access It: Anyone with a customer email that has portal access enabled
- Purpose: Sign in to view/interact with orders, proofs, invoices, etc.
- Main Information Shown: Email, password
- Primary Actions: Sign In
- Secondary Actions: **Needs Verification** — no forgot-password link confirmed to exist on this screen (backend has no endpoint for it either)
- Data Source: `POST /api/portal/auth/login`
- Related Screens: PortalDashboard
- Current Problems: No self-service password recovery
- Rebuild Recommendation: Add a Customer Portal forgot-password flow mirroring the main one

**Screen Name: Employee Portal Login**
- Route: `/employee-portal/login`
- Who Can Access It: Anyone with a valid employee email + PIN
- Purpose: Quick shop-floor sign-in for timeclock/tasks
- Main Information Shown: Email, PIN
- Primary Actions: Sign In
- Data Source: `POST /api/employee-portal/auth/login`
- Related Screens: EmployeePortalDashboard
- Current Problems: Plaintext PIN storage/compare, default `"1234"` fallback, no rate limiting, 12-hour hard token expiry with no refresh (employee is logged out mid-shift on long days — **worth confirming with Donnell if 12h is intentional**)
- Rebuild Recommendation: Bcrypt-hash PINs, remove default-PIN fallback (force explicit PIN set at employee creation), consider extending or refreshing token during an active clocked-in shift

**Screen Name: Owner Portal (login + dashboard combined)**
- Route: `/owner-portal`
- Who Can Access It: Users with `role=webstore_owner` who completed signup via invite token
- Purpose: View connected stores, commissions, payouts; link to Stripe Express dashboard
- Main Information Shown: Store list, payout/commission data, Stripe status
- Primary Actions: Log in (inline form), Open Stripe Dashboard, Log out
- Data Source: `POST /api/auth/login` (shared with main tenant login!), `GET /api/owner-portal/me`
- Related Screens: OwnerPortalSignup, WebstoreOwnerOnboard
- Current Problems: Login form is embedded inline inside the dashboard component rather than a separate screen; uses a non-standard token storage key bypassing `authStorage.js`
- Rebuild Recommendation: Extract a dedicated `/owner-portal/login` screen; route its token through the shared storage helper

---

## 4. Main User Workflows

### Workflow 1: New Shop Owner Self-Registration
**User Goal:** Create a new SignGuy AI account for my sign shop and start a free trial.
**Starting Point:** `/login?register=true` (or clicking "Don't have an account? Create one").

**Step-by-Step User Flow:**
1. User fills Full Name, Company Name (optional), Email, Password, Confirm Password.
2. Clicks "Create Account".
3. Frontend validates password length (≥6) and match locally before calling the API.
4. On success, user is redirected straight to `/dashboard` — no email verification step, no welcome/onboarding gate.

**System Actions Behind the Scenes:**
1. Check `db.users` for existing email → 400 if found.
2. Compute Founders-Edition spot count (`db.tenants.count_documents({"plan": "founders_edition"})`).
3. Create a new `Tenant` document with `plan="free_trial"`, `trial_started_at`/`trial_ends_at` = now + 48 hours.
4. Insert a `user_credits` document granting 50 trial AI credits, tied to the same 48-hour expiry.
5. Insert a `CreditTransaction` record (`MONTHLY_GRANT`) for audit/history.
6. Create the `User` document with `role=OWNER`, bcrypt-hashed password, linked to the new `tenant_id`.
7. Call `create_sample_data_for_tenant()` (from `services/sample_data.py`) to seed demo customers/orders — **failure here is swallowed silently (logged only)**, so registration always "succeeds" from the user's perspective even if sample data creation fails.
8. Issue a JWT (`create_access_token`) with `sub=user.id`, default 24h expiry (register endpoint does not honor "remember me" — **Needs Verification** whether that's intentional; login supports it, register does not).

**Data Created or Changed:** 1 `tenants` doc, 1 `users` doc, 1 `user_credits` doc, 1 `credit_transactions` doc, N sample-data docs (customers/orders/etc.).
**Notifications / Emails / SMS Sent:** None confirmed in this flow (no welcome email found in `register()`).
**Required Approvals or Signatures:** None.
**Workflow Completion Condition:** `access_token` returned and frontend successfully calls `GET /users/me` to populate `AuthContext`.
**Failure or Error Conditions:** Duplicate email (400), sample-data seeding failure (silently ignored), network error (frontend shows generic error).
**Current Problems:** No email verification means unverifiable/typo'd emails can own a tenant forever; no welcome email; "remember me" not supported at registration time.
**Rebuild Requirement:** Add email verification (at minimum a "verify later, but flag unverified" banner) before this is production-grade multi-tenant SaaS; send a welcome email; decide whether trial credits/sample data failures should block registration or just log (current: log-only, likely fine to keep).

---

### Workflow 2: Existing User Login (with optional Remember Me)
**User Goal:** Get back into my shop's dashboard.
**Starting Point:** `/login`.

**Step-by-Step User Flow:**
1. Enter email + password, optionally check "Remember me for 30 days".
2. Click "Sign In".
3. On success → redirected to `/dashboard`.
4. On failure → inline error message (generic "Invalid email or password" — no email enumeration).

**System Actions Behind the Scenes:**
1. Look up user by lowercased email.
2. `bcrypt.checkpw` verify.
3. If hash format differs from a freshly-computed hash of the same password, **transparently re-hash and persist** — a self-healing migration mechanism for old hash formats.
4. Check `user.is_active` (400 if disabled).
5. Check tenant `is_active` (403 `tenant_suspended` with reason/timestamp if suspended) — skipped for `platform_admin` role.
6. Issue JWT: 24h default or 30 days if `remember_me=true`.

**Data Created or Changed:** Possibly `users.hashed_password` (self-heal only).
**Notifications / Emails / SMS Sent:** None.
**Required Approvals or Signatures:** None.
**Workflow Completion Condition:** Token stored (`sessionStorage` default, `localStorage` if remember-me) and `GET /users/me` + `GET /users/me/permissions` both succeed.
**Failure or Error Conditions:** Wrong credentials, disabled account, suspended tenant (routes to `/account-suspended`).
**Current Problems:** Unlimited login attempts (no lockout/rate limit); no "this device" session list for the user to review/revoke.
**Rebuild Requirement:** Add basic login attempt throttling (e.g., exponential backoff per email+IP) before rebuild ships to real customers at scale.

---

### Workflow 3: Forgot / Reset Password (Main App)
**User Goal:** Regain access after forgetting my password.
**Starting Point:** "Forgot password?" link on `/login`.

**Step-by-Step User Flow:**
1. Enter account email, submit.
2. Always see the same generic success message regardless of whether the email exists (anti-enumeration).
3. Receive email (if account exists) with a link to `/reset-password?token=...`.
4. Enter + confirm new password (≥6 chars), submit.
5. Redirected to `/login` after 2.5s with a success message.

**System Actions Behind the Scenes:**
1. `forgot-password`: generate `secrets.token_urlsafe(32)`, hash with SHA-256, store in `password_reset_tokens` with 60-min expiry; invalidate any prior unused tokens for that user; send email via `email_service.send_password_reset_email()` (SendGrid).
2. `reset-password`: re-hash submitted token, look up by hash, verify `not used` and `not expired`, update `users.hashed_password` (bcrypt), mark token `used=true`.

**Data Created or Changed:** `password_reset_tokens` doc (created, then marked used); `users.hashed_password`.
**Notifications / Emails / SMS Sent:** One password-reset email via SendGrid (confirmed working per prior session's handoff notes).
**Required Approvals or Signatures:** None.
**Workflow Completion Condition:** New password accepted and old token burned.
**Failure or Error Conditions:** Expired/used/invalid token → clear error message; email send failure is caught and logged but does **not** fail the API response (user still gets the generic "link sent" message even if SendGrid actually failed) — **Needs Verification** whether this silent-failure is acceptable or should surface to an admin/monitoring channel.
**Current Problems:** None major; this is the reference-quality flow in the module.
**Rebuild Requirement:** Keep this exact pattern (single-use hashed token, generic response, invalidate-prior-tokens) for the Customer Portal's forgot-password flow too, since none exists today.

---

### Workflow 4: Employee Clocks In via Employee Portal PIN Login
**User Goal:** Quickly log into a shared shop-floor device to clock in.
**Starting Point:** `/employee-portal/login`.

**Step-by-Step User Flow:**
1. Enter email + 4-6 digit PIN.
2. Submit.
3. On success → Employee Portal dashboard, ready to clock in.

**System Actions Behind the Scenes:**
1. Look up employee by email in `db.employees`.
2. Check `is_active`.
3. **Plaintext comparison**: `data.pin == employee["pin"]`, OR if no `pin` field is set, accept `"1234"` or the last 4 digits of the employee's phone number.
4. Issue a separate-shape JWT: `{"sub": employee_id, "tenant_id":..., "type": "employee", "exp": +12h}`.

**Data Created or Changed:** None (read-only login).
**Notifications / Emails / SMS Sent:** None.
**Required Approvals or Signatures:** None.
**Workflow Completion Condition:** Token returned, `employee_id`/`employee_name`/`tenant_id` stored client-side.
**Failure or Error Conditions:** Wrong email/PIN (generic 401), inactive employee (403).
**Current Problems:** Plaintext PIN, default-PIN fallback, no lockout, 12h fixed expiry (no refresh — a long shift could log the employee out mid-shift, forcing a re-login that does **not** lose clock-in state since that's stored server-side in `timeclock_service`, but is still a UX interruption — **Needs Verification** with Donnell on real-world shift lengths).
**Rebuild Requirement:** Bcrypt-hash all employee PINs at creation time; remove the `"1234"`/phone-suffix fallback entirely (force an explicit PIN before the employee record is usable); consider a rolling/refresh token tied to active clock-in state.

---

### Workflow 5: Webstore Owner Portal Signup (from Invite)
**User Goal:** A fundraiser/creator organizer wants to create a login so they can check their payout status without staff help.
**Starting Point:** Shop staff sends a "Create Owner Portal" invite (from `Webstores.js` setup flow) → owner receives an email with a signup link `/owner-portal-signup/:token`.

**Step-by-Step User Flow:**
1. Owner opens the link, sets a password (≥8 chars) and optionally their name.
2. Submits.
3. Redirected into `/owner-portal` dashboard, already logged in (token returned directly from signup).

**System Actions Behind the Scenes:**
1. Resolve invite token (`_resolve_invite`) — confirms it's a `portal_invite`, not a quick-connect invite.
2. If a `User` already exists with that email and a role other than `webstore_owner` → block ("account already exists with a different role").
3. Else create/update a `User` doc with `role=webstore_owner`, `tenant_id=None`.
4. Link `webstores_v2.owner_user_id` + `owner_portal_enabled=true`.
5. Issue a standard main-app JWT (`create_access_token`) with an extra `role` claim — **this is the exact same token shape as tenant login**, meaning this account can technically also be sent through `/api/auth/login` afterward (confirmed intentional per `test_credentials.md` notes from a prior session).

**Data Created or Changed:** `users` doc (webstore_owner role), `webstores_v2.owner_user_id`/`owner_portal_enabled`.
**Notifications / Emails / SMS Sent:** The initial invite email (sent from `_send_invite`, not part of this workflow's code path — **Needs Verification** of exact template/trigger, out of scope for signup itself).
**Required Approvals or Signatures:** None.
**Workflow Completion Condition:** Token returned; owner sees their dashboard.
**Failure or Error Conditions:** Invalid/expired token, password too short, email collision with a different role.
**Current Problems:** Minor code smell (`__import__("uuid")`); reuses generic `User` collection for a role that has zero tenant-side permissions — works but conceptually muddies "who is a tenant user" vs "who is a webstore owner."
**Rebuild Requirement:** Keep the token-invite pattern; consider a genuinely separate `webstore_owners` collection instead of overloading `users` with `tenant_id=None`, to make the boundary explicit in the data model (see §5).

---

### Workflow 6: Platform Admin Impersonates a Tenant User
**User Goal:** Support staff needs to see exactly what a customer sees to troubleshoot, without asking for their password.
**Starting Point:** `/platform-admin/tenants/:tenantId` → "Impersonate" button next to a user.

**Step-by-Step User Flow:**
1. Platform admin clicks Impersonate on a target user.
2. Confirms the action.
3. Redirected into the target user's dashboard, with a yellow "Support Mode" banner showing who they are impersonating and a one-click "Exit Support Mode."

**System Actions Behind the Scenes:**
1. Verify caller is `platform_admin` (`require_platform_admin` dependency).
2. Look up target user + their tenant.
3. Insert an `impersonation_logs` doc (`started_at`, `ended_at=None`).
4. Insert an admin-audit-log entry (`log_admin_action`) for compliance/traceability.
5. Mint a **new JWT for the target user's ID** with `impersonating=true` + platform-admin metadata embedded — the platform admin's original token is saved client-side (`platform_admin_token` in `localStorage`, per `PLATFORM_ADMIN_IMPLEMENTATION.md`) so "Exit" can restore it.

**Data Created or Changed:** `impersonation_logs` doc, admin audit-log doc.
**Notifications / Emails / SMS Sent:** None confirmed (no email to the impersonated user notifying them — **Needs Verification/decision**: should a tenant owner be notified when a platform admin impersonates one of their users? Not currently implemented).
**Required Approvals or Signatures:** None — a single platform_admin click is sufficient, no second-admin approval step.
**Workflow Completion Condition:** New token active, banner visible.
**Failure or Error Conditions:** Target user or tenant not found (404).
**Current Problems:** No notification to the tenant that they were impersonated (transparency/trust concern); no automatic session timeout specific to impersonation (uses the same 24h/30-day expiry as normal tokens — a stale impersonation session could theoretically live for a full day).
**Rebuild Requirement:** Keep the audit-log pattern (it's solid). Consider: (a) shorter, fixed expiry specifically for impersonation tokens regardless of remember-me, (b) optional tenant-visible "you were supported by staff on [date]" log entry for transparency.

---

## 5. Data Structure and Records

### Primary Records Owned by This Module
| Record Type | Purpose | Created By | Edited By | Deleted By | Related Modules |
|---|---|---|---|---|---|
| `User` (tenant staff + webstore_owner) | Identity + credentials + role for anyone who logs into the main app or owner portal | Self-register, admin-create, owner-portal-signup | Self (profile), Owner/Admin (role/status/password) | Owner (with last-owner guard) | All modules (every route depends on `current_user`) |
| `Tenant` | The "company" a User belongs to | Self-register (auto-created) | Owner/Admin (Settings) | Not exposed in this module (Platform Admin owns tenant deletion) | Billing, Settings, everything tenant-scoped |
| `password_reset_tokens` | Single-use reset tokens | `forgot-password` | `reset-password` (marks used) | Not deleted, just marked `used` | None |
| `impersonation_logs` | Audit trail of platform-admin impersonation sessions | `start_impersonation` | `exit_impersonation` (sets `ended_at`/`duration_seconds`) | Not deletable via this module | Platform Admin |
| Customer (`portal_password_hash`, `portal_enabled`, `portal_invited_at`) — fields *on* the Customer doc, not a separate collection | Customer Portal credentials | `invite_customer_to_portal` (staff) or `portal_register` (self) | `change_portal_password` | N/A (owned by Customers module otherwise) | Customers |
| Employee (`pin`) — field *on* the Employee doc | Employee Portal credential | `employees.py` create endpoint (auto-generates if missing) | `set-pin` endpoint (**currently non-functional**) | N/A | Team/Payroll |

### Database Collections / Tables

**Collection: `users`**
- Purpose: Tenant staff, platform admins/creators, and webstore owners
- File or Schema Location: `models/auth.py` (`User`, `UserInDB`, `UserCreate`)
- Primary ID Field: `id` (UUID string)
- Tenant / Shop ID Field: `tenant_id` (nullable — `None` for `webstore_owner`)
- Important Fields: `email`, `hashed_password`, `role`, `is_active`, `is_founder`, `full_name`, `company_name`
- Required Fields: `email`, `full_name`, `hashed_password`, `role`
- Optional Fields: `company_name`, `tenant_id`
- Status Fields: `is_active` (bool)
- Date Fields: `created_at`, `updated_at`
- Relationships: `tenant_id` → `tenants.id`
- Indexes: **Needs Verification** — no explicit index-creation code found in the files reviewed for `users.email` (should be unique-indexed; a missing unique index would allow a race-condition duplicate-email registration — **Needs Verification** by checking DB directly or `server.py` startup index creation, not found in sections reviewed)
- Known Data Problems: `role` stored as plain string, not always validated against the `UserRole` enum on write paths outside `auth.py` (e.g., `setup-admin` writes `"role": "platform_admin"` as a raw string) — functionally fine since Pydantic coerces on read, but a rebuild should enforce enum validation on every write path
- Rebuild Recommendation: Add a unique index on `email`; consider splitting `webstore_owner` into its own collection (see Workflow 5 note)

**Collection: `password_reset_tokens`**
- Purpose: Single-use password reset tokens
- File or Schema Location: Defined inline in `routes/auth.py` (no Pydantic model — raw dict)
- Primary ID Field: `id`
- Tenant / Shop ID Field: None (keyed by `user_id`/`email`)
- Important Fields: `token_hash` (SHA-256), `expires_at`, `used`
- Required Fields: `user_id`, `email`, `token_hash`, `expires_at`
- Optional Fields: none
- Status Fields: `used` (bool)
- Date Fields: `created_at`, `expires_at`, `used_at`/`invalidated_at`
- Relationships: `user_id` → `users.id`
- Indexes: **Needs Verification** (should be indexed on `token_hash` for lookup performance and on `expires_at` for TTL cleanup — no TTL index confirmed, meaning used/expired tokens accumulate forever unless manually purged)
- Known Data Problems: No automatic cleanup of expired/used tokens (table grows unbounded over time)
- Rebuild Recommendation: Add a MongoDB TTL index on `expires_at` so expired tokens self-delete

**Collection: `employees`**
- Purpose: Shop-floor staff who use the Employee Portal (distinct from `users`)
- File or Schema Location: No dedicated Pydantic model found for the full document (routes/employees.py builds dicts directly) — **Needs Verification**, could not confirm a formal schema class exists
- Primary ID Field: `id`
- Tenant / Shop ID Field: `tenant_id`
- Important Fields: `email`, `pin` (**plaintext**), `is_active`, `phone`, `hourly_rate`
- Known Data Problems: `pin` stored in plaintext (security), default-value fallback logic embedded in login code rather than enforced at creation time
- Rebuild Recommendation: Add explicit `EmployeeCreate`/`Employee` Pydantic models; bcrypt-hash `pin`; require PIN to be explicitly set (no silent default)

**Collection: `impersonation_logs`**
- Purpose: Audit trail for support impersonation
- File or Schema Location: `routes/platform_admin.py` (`ImpersonationLog` Pydantic model exists for response shape)
- Primary ID Field: `id`
- Important Fields: `platform_admin_user_id`, `target_user_id`, `tenant_id`, `started_at`, `ended_at`, `duration_seconds`
- Known Data Problems: None found
- Rebuild Recommendation: Keep as-is; consider adding IP address / user-agent of the platform admin for stronger audit trail (**Needs Verification** whether `log_admin_action` already captures this via the `Request` object passed in — plausible but not confirmed in the range reviewed)

### Data Relationships
```
Tenant → User (role: owner|admin|staff) → [all tenant-scoped modules]
Tenant → Customer → portal_password_hash (self-contained, not a separate auth record)
Tenant → Employee → pin (self-contained, not a separate auth record)
Webstore → owner_user_id → User (role: webstore_owner, tenant_id=None)
PlatformAdmin User → impersonation_logs → User (any tenant, any role)
```

### Source of Truth
| Data Item | Current Source of Truth | Problems | Recommended Rebuild Source |
|---|---|---|---|
| User's role | `users.role` field | Two different enum lists exist (backend `UserRole` 5 values vs frontend `UserRole` 3 values) | Backend `UserRole` enum only; frontend should import/mirror it exactly, no independent redefinition |
| Permission set for a role | `models/auth.py` `ROLE_PERMISSIONS` dict | Frontend has its own divergent copy + alias patch layer | Single source: backend serves `GET /users/me/permissions`, frontend uses returned values directly with zero local permission-string redefinition |
| "Is this tenant active" | `tenants.is_active` | Checked in 2 places (login + every request) — consistent today, but a rebuild should centralize into one dependency, not two independent checks that could drift | One shared `check_tenant_active()` helper called from both places |
| Employee PIN validity | `employees.pin` (plaintext) | Insecure, has hidden defaults | Bcrypt hash, no defaults, required at creation |

### Duplicate or Conflicting Data
- **Permission definitions exist in two places** (backend `models/auth.py`, frontend `AuthContext.js`) with different values for the same concept — the single highest-priority "duplicate/conflicting data" finding in this module.
- **Role definitions exist in two places** with different member counts (5 backend vs 3 frontend).
- **Token storage key patterns exist in two implementations**: the centralized `authStorage.js` (used by main app, Customer Portal, Employee Portal) vs. ad-hoc raw `localStorage` calls (Owner Portal) — same concept, two implementations.

---

## 6. Business Rules and Logic

### Core Business Rules
| Rule | Current Behavior | Correct Rebuild Behavior | Priority |
|---|---|---|---|
| A tenant is created automatically on self-registration | Confirmed — every `/auth/register` call creates exactly one new tenant, owner is always the registrant | Keep, but gate behind email verification | P1 |
| Only an Owner can create another Owner | Enforced (`admin_create_user`: `if input.role == OWNER and current_user.role != OWNER: 403`) | Keep | Working |
| The last Owner of a tenant cannot be deleted | Enforced (`owner_count <= 1` guard in `admin_delete_user`) | Keep | Working |
| A user cannot modify/delete their own account via admin endpoints | Enforced (`user_id == current_user.id` checks in status/role/delete endpoints) | Keep | Working |
| `platform_creator` role can only be granted via env var at startup | Enforced (`startup_migrations` sets role by email match, nothing else can set this role) | Keep exactly | Working |
| Suspended tenants cannot log in or use any authenticated endpoint | Enforced in 2 places | Keep, but consolidate into 1 shared check | P2 |
| Employee PIN "should" be secret and shop-specific | **Not actually enforced** — default `"1234"` fallback undermines this rule | Require explicit PIN set, no fallback, bcrypt-hashed | P0 |
| A password-reset token can only be used once | Enforced (`used` flag burned atomically after successful reset) | Keep | Working |

### Statuses and State Changes
| Status | Meaning | Who Can Set It | What Triggers It | What Happens Next |
|---|---|---|---|---|
| `users.is_active = false` | Account disabled, cannot log in | Owner/Admin with `USERS_MANAGE` | Manual toggle in UserManagement.js | Next login attempt returns 400; next authenticated request for an already-logged-in session returns via `get_current_active_user`... **Needs Verification**: `get_current_active_user` checks `current_user.is_active` which is read fresh from DB on every request (since `get_current_user` re-fetches the user doc each time) — so disabling takes effect immediately, not just at next login. Confirmed good behavior. |
| `tenants.is_active = false` | Tenant suspended | Platform Admin (outside this module's routes, in Platform Admin module) | Manual suspension action | Blocks login + blocks every subsequent request for all tenant users except platform_admin |
| `impersonation_logs.ended_at` | Impersonation session closed | `exit_impersonation` endpoint | Platform admin clicks "Exit Support Mode" | Duration calculated and stored |
| `password_reset_tokens.used` | Token consumed | `reset_password` endpoint | Successful password reset | Token can never be reused |

### Automatic Actions
- Password hash format audit runs as a background task on every backend startup (checks all users' hashes are bcrypt-compatible, logs a warning per incompatible user — does not fix them automatically, just flags for the user to use forgot-password).
- `platform_creator` role self-heals on every startup via env var match.
- Password re-hash-on-login: if a login succeeds but the stored hash isn't in the exact current bcrypt format, it's silently upgraded.
- Impersonation start/exit both write an audit-log entry automatically (not a manual step for the platform admin).

### Calculations and Formulas
**Token Expiry**
- Purpose: Determine how long a session lasts.
- Formula: `24 hours` default; `30 days` if `remember_me=true` (main app only); `12 hours` fixed for employees; **Needs Verification** for Customer Portal and Owner Portal exact expiry (Customer Portal confirmed `30 days` fixed, no remember-me option; Owner Portal uses the standard `create_access_token` default of 24h since no `expires_delta` was passed in `portal_signup`).
- Inputs: `remember_me` boolean (main app only).
- Default Values: 24h.
- Where Inputs Come From: Login form checkbox.
- Where It Is Used: `create_access_token()` calls throughout.
- Who Can Override It: No one (not configurable per-tenant).
- Current Problems: Inconsistent expiry philosophy across the 4 systems (24h/30d/12h/24h-fixed) with no documented rationale.
- Rebuild Requirement: Make session length an explicit, documented decision per user-type, and expose "remember me" consistently wherever it makes sense (e.g., Owner Portal has no remember-me option at all today).

### Validation Rules
- Password minimum length: 6 characters (main app, Customer Portal), **8 characters** for Owner Portal signup — inconsistent minimum across systems.
- Email format: relies on Pydantic `EmailStr` type — enforced automatically wherever that type is used (main `User`/`Tenant` models); Customer Portal login/register models — **Needs Verification** whether `CustomerPortalLogin`/`CustomerPortalRegister` use `EmailStr` or plain `str` (not opened in this session).
- Cannot register with a duplicate email (main app, checked; Customer Portal register requires the customer to already exist by email, so duplicate-prevention is implicit).
- Employee PIN: no length/format validation confirmed beyond the model's `pin: str` field — no explicit 4-6 digit regex enforcement found server-side (the docstring says "4-6 digit PIN" but nothing rejects a 20-character PIN).

---

## 7. Permissions and Roles

### Roles That Interact With This Module
| Role | View | Create | Edit | Delete | Approve | Export |
|---|---|---|---|---|---|---|
| Owner | Own + all tenant users | Users (any role) | Users (any role, incl. role changes) | Users (not self, not last owner) | N/A | N/A |
| Admin | Tenant users | Users (`USERS_MANAGE` permission — **Needs Verification**: Admin role list in `ROLE_PERMISSIONS` does NOT include `USERS_MANAGE`, only `USERS_VIEW` — meaning **Admins cannot actually create/edit/delete users today** despite the `admin_router` endpoints checking for `USERS_MANAGE`. This is a real, confirmed permission gap: only Owner (and platform_admin/creator, who bypass all checks) can manage users.) | — | — | N/A | N/A |
| Staff | None (no `USERS_VIEW`) | — | — | — | N/A | N/A |
| Platform Admin | All tenants' users | Via impersonation only | Via impersonation only | No direct delete confirmed | N/A | N/A |
| Platform Creator | Same as Owner + Platform Admin (all permissions) | — | — | — | N/A | N/A |
| Webstore Owner | Own profile only (`/owner-portal/me`) | — | — | — | N/A | N/A |

### Customer / Portal Permissions
- Customers can only ever see/edit their own record (`get_current_portal_customer` scopes every query to the token's `customer_id`).
- Customers cannot see other customers, staff, pricing internals, or any tenant-wide data.
- Employees can only see their own profile, pay, tasks, and timeclock — scoped by `employee_id` extracted from their own token; `can_see_job_details`/`can_see_customer_info`/`can_see_pricing` are tenant-configurable flags (`DEFAULT_PORTAL_SETTINGS`) that further restrict even what an employee can view.

### Sensitive Information
- Password hashes (`hashed_password`, `portal_password_hash`) — never returned in any API response reviewed (explicitly excluded via dict comprehension in every profile-fetch endpoint). Confirmed good practice.
- Employee PINs — **plaintext in DB**, which means anyone with direct database access (or a future admin-facing "view employee" endpoint that doesn't explicitly exclude it) could see raw PINs. This is the single most sensitive-data-handling issue in the module.
- JWT secret (`JWT_SECRET_KEY`) — stored in `.env`, current value is a static human-readable string (`signguy_ai_jwt_secret_key_2025_xK9pL2mN`) rather than a generated random value — **should be rotated to a properly random secret before any real production rebuild launch** (flagging for Donnell's awareness, not fixing here since rotating it would invalidate all current sessions).
- Impersonation metadata is embedded directly in the JWT payload (visible if the token is decoded, though not exposed without the secret) — acceptable, this is how the intended "who is really acting" traceability works.

### Permission Problems in Current App
- **Admin role cannot manage users despite the endpoint checking for a permission Admins don't have** (`USERS_MANAGE` missing from Admin's permission list) — confirmed via direct comparison of `ROLE_PERMISSIONS[UserRole.ADMIN]` (has `USERS_VIEW` only) against `admin_create_user`/`admin_update_user_role`/`admin_delete_user` (all require `USERS_MANAGE`). Functionally this means only Owner can manage the team today, which may or may not be the intended design — **Needs Verification/decision** from Donnell on whether Admins should be able to manage staff accounts.
- Frontend's extra, backend-nonexistent `AI_TOOLS_USE` permission check will always fail for non-owners (see §2) — could be hiding AI Tools UI from Admin/Staff even if the business intent was to allow them access.

---

## 8. Integrations and External Services

### External Services Used
| Service | Purpose | Where Used | Credentials / Env Vars | Current Status |
|---|---|---|---|---|
| SendGrid | Password-reset email delivery | `services/email_service.py` → called from `forgot_password()` | `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_FROM_NAME` (confirmed present in `.env`) | Active, confirmed working (per prior session testing) |
| Stripe | Owner login-link generation (Stripe Express dashboard access, not SignGuy login) | `webstore_owners.py` `owner_login_link` | Stripe keys (outside this module's `.env` grep scope — owned by Stripe/Webstores module) | Active (webstore module owns the key) |

No AI provider, Twilio, or object storage usage was found directly inside the authentication code paths reviewed.

### API Endpoints

**Endpoint: `POST /api/auth/register`**
- Purpose: Create a new tenant + owner user + 48h trial
- Frontend File Calling It: `AuthContext.js` (`register()`)
- Backend File Handling It: `routes/auth.py`
- Required Authentication: None
- Request Body: `{email, password, full_name, company_name?}`
- Response: `{access_token, token_type, expires_in}`
- Database Changes: Insert `tenants`, `users`, `user_credits`, `credit_transactions`; calls sample-data seeding
- Error Handling: 400 if email exists
- Known Problems: No email verification; swallows sample-data failures silently
- Rebuild Recommendation: Add email verification step; surface sample-data failures to a monitoring channel even if not user-facing

**Endpoint: `POST /api/auth/login`**
- Purpose: Authenticate and issue a session token
- Frontend File Calling It: `AuthContext.js` (`login()`); also reused directly by Owner Portal
- Backend File Handling It: `routes/auth.py`
- Required Authentication: None
- Request Body: `{email, password, remember_me}`
- Response: `{access_token, token_type, expires_in}`
- Database Changes: Possible self-heal of `hashed_password` format
- Error Handling: 401 invalid creds, 400 disabled, 403 tenant suspended (structured)
- Known Problems: No rate limiting
- Rebuild Recommendation: Add per-email + per-IP throttling

**Endpoint: `POST /api/auth/forgot-password`**
- Purpose: Request a password reset link
- Frontend File Calling It: `Login.js`
- Backend File Handling It: `routes/auth.py`
- Required Authentication: None
- Request Body: `{email, origin?}`
- Response: Generic `{message}` always
- Database Changes: Insert `password_reset_tokens`, invalidate priors
- Error Handling: Silent no-op for unknown/disabled accounts (anti-enumeration, by design)
- Known Problems: Email-send failure is swallowed (logged only)
- Rebuild Recommendation: Keep anti-enumeration behavior; add internal alerting on repeated SendGrid failures

**Endpoint: `POST /api/auth/reset-password`**
- Purpose: Complete a password reset
- Frontend File Calling It: `ResetPassword.js`
- Backend File Handling It: `routes/auth.py`
- Required Authentication: Token in body (not a bearer header — it's a single-use secret, not a session token)
- Request Body: `{token, new_password}`
- Response: `{message}`
- Database Changes: Update `users.hashed_password`; mark token used
- Error Handling: 400 invalid/expired/used token
- Known Problems: None significant
- Rebuild Recommendation: Keep as reference implementation

**Endpoint: `POST /api/auth/setup-admin`**
- Purpose: One-time production bootstrap (password reset + promo seeding + platform-owner flagging)
- Frontend File Calling It: None (manual/curl-only tool)
- Backend File Handling It: `routes/auth.py`
- Required Authentication: `ENABLE_SETUP_ADMIN=true` env flag + `setup_key == JWT_SECRET_KEY`
- Request Body: `{email?, new_password?, promote_to_platform_admin?, promo_codes?}`
- Response: `{results: [...]}`
- Database Changes: Varies (password, role, tenant flags, promo codes)
- Error Handling: 404 if disabled, 403 if key mismatch
- Known Problems: None (safely gated)
- Rebuild Recommendation: Keep disabled by default; consider removing entirely once a proper platform-admin-creation flow exists, since this is effectively a skeleton key

**Endpoint: `POST /api/portal/auth/login` / `/register`**
- Purpose: Customer Portal auth
- Frontend File Calling It: `PortalLogin.js`
- Backend File Handling It: `routes/portal.py`
- Required Authentication: None
- Database Changes: `customers.portal_password_hash`/`portal_enabled`
- Known Problems: No forgot-password flow
- Rebuild Recommendation: Add forgot-password mirroring the main app's pattern

**Endpoint: `POST /api/employee-portal/auth/login`**
- Purpose: Employee PIN login
- Frontend File Calling It: `EmployeePortalLogin.js`
- Backend File Handling It: `routes/employee_portal.py`
- Required Authentication: None
- Database Changes: None
- Known Problems: Plaintext PIN, default-PIN fallback, no rate limiting
- Rebuild Recommendation: P0 fix — bcrypt PINs, remove fallback

**Endpoint: `POST /api/employee-portal/auth/set-pin`**
- Purpose: Let an employee change their PIN
- Frontend File Calling It: **Needs Verification** (no confirmed call site found)
- Backend File Handling It: `routes/employee_portal.py`
- Required Authentication: None enforced (accepts a `new_pin` with no employee identity check at all)
- Database Changes: **None — confirmed dead code, does not write to DB**
- Known Problems: Completely non-functional
- Rebuild Recommendation: Implement properly with employee-token auth + bcrypt hashing, or remove the endpoint if not actually needed

**Endpoint: `POST /api/owner-portal/signup`**
- Purpose: Create a webstore_owner account from invite token
- Frontend File Calling It: `OwnerPortalSignup.js`
- Backend File Handling It: `routes/webstore_owners.py`
- Required Authentication: Invite token (public)
- Database Changes: `users` insert/update, `webstores_v2.owner_user_id`
- Known Problems: Minor code smell (`__import__`)
- Rebuild Recommendation: Clean up import; otherwise fine

**Endpoint: `POST /api/platform-admin/impersonate` / `/exit-impersonation`**
- Purpose: Support impersonation
- Frontend File Calling It: `PlatformAdminTenantDetail.js`
- Backend File Handling It: `routes/platform_admin.py`
- Required Authentication: `platform_admin` role
- Database Changes: `impersonation_logs` insert/update, admin audit log
- Known Problems: No tenant-visible notification of impersonation
- Rebuild Recommendation: Consider adding tenant-visible audit entry for transparency

### Webhooks
None found related to authentication itself (Stripe/SendGrid webhooks exist elsewhere in the app but are owned by other modules, not auth).

### Email / SMS / Notification Templates
| Template Name | Trigger | Recipient | Purpose | Current Location | Rebuild Notes |
|---|---|---|---|---|---|
| Password Reset Email | `POST /auth/forgot-password` | User email | Deliver reset link | `services/email_service.py` `send_password_reset_email()` | Confirmed working, keep |
| Customer Portal Invitation | `POST /customers/{id}/invite-portal` (staff action) | Customer email | Deliver temporary PIN + portal login link | Inline HTML string in `routes/customers.py` | Sends a numeric PIN in plaintext email as the actual login password — acceptable for a one-time "temporary password" pattern but should force a password change on first login (**Needs Verification** whether that's enforced — not found in the code reviewed; likely not enforced, meaning a customer could keep using the emailed PIN indefinitely) |

---

## 9. Documents, Files, Images, and Attachments
Not applicable to this module directly — no file uploads, generated PDFs, or attachments are created by the authentication flows themselves. (Password reset links and portal-invite emails are plain HTML emails, not file attachments.)

---

## 10. AI Features
None. No AI-powered functionality exists inside the authentication/login/registration module. (AI Tools/Assistant are separate modules that merely consume the identity this module establishes.)

---

## 11. Activity Logs, Audit Trail, and Reporting

### Activity Events Created by This Module
| Event | Trigger | Logged Data | Visible To | Related Record |
|---|---|---|---|---|
| Impersonation started | Platform admin clicks Impersonate | Admin id/email, target id/email, tenant, timestamp | Platform Admin (audit log page) | `impersonation_logs` |
| Impersonation ended | Exit Support Mode | `ended_at`, `duration_seconds` | Platform Admin | `impersonation_logs` |
| Admin action (generic) | Various platform-admin actions incl. impersonation | Actor, action type, target, summary, metadata | Platform Admin | `services/admin_audit.py` log |
| Password hash incompatibility | Startup background audit | Email (logged only, not persisted to DB) | Backend logs only (no UI) | N/A |

**Not currently logged (gap):** Regular login events, failed login attempts, password reset requests/completions, role changes, user creation/deletion — **none of these create a queryable activity-log record today** beyond raw application logs (`logger.info`). This is a real gap for any future "security events" or "who did what" reporting need.

### Audit Trail Requirements
For a production rebuild, the following should be traceable and currently are **not** persisted as queryable records: successful/failed login attempts (security), role changes (compliance), account disable/enable events (compliance), password reset completions (security). Impersonation is the only fully-audited flow today.

### Reports and Dashboard Metrics
None found — this module produces no dashboard metrics or reports of its own (e.g., no "active sessions" count, no "recent logins" widget).

---

## 12. Errors, Edge Cases, and Failure Handling

### Known Bugs
| Bug | Where It Happens | Severity | Temporary Workaround | Rebuild Fix |
|---|---|---|---|---|
| `set-pin` endpoint does nothing | `employee_portal.py` | Medium (silent no-op, misleading success message) | Admin manually edits employee record another way (**Needs Verification** whether any such admin path exists) | Implement properly or remove |
| Employee PIN plaintext + default fallback | `employees.py` / `employee_portal.py` | High (security) | None — must fix in rebuild | Bcrypt hash, no default |
| No rate limiting on any login endpoint | All 4 login endpoints | High (security) | None | Add throttling |
| Frontend/backend Permission enum mismatch | `AuthContext.js` vs `models/auth.py` | Medium (functional — some checks silently always fail) | Manual awareness by devs | Single source of truth, generate frontend constants from backend or fetch dynamically |
| Admin role missing `USERS_MANAGE` despite endpoints checking for it | `models/auth.py` `ROLE_PERMISSIONS` | Medium (Admins can't manage users, possibly unintended) | Owner performs the action instead | Decide intended behavior, fix permission list accordingly |

### Edge Cases
- **Multiple concurrent password reset requests**: handled correctly — each new request invalidates prior tokens, so only the newest link works.
- **User disabled while actively logged in**: their next API call will be rejected (`is_active` re-checked every request via fresh DB read in `get_current_user`) — confirmed correct, not an edge case gap.
- **Tenant suspended mid-session**: same as above — confirmed correct, immediate effect.
- **Employee record deleted while employee is logged in**: `get_current_employee` does a fresh DB lookup every request, so a deleted employee is immediately locked out (`employee not found` → 401) — confirmed correct.
- **Webstore owner invite token reused after account already created**: `portal_signup` checks for an existing account with a *different* role and blocks; if the existing account already has `webstore_owner` role (e.g., re-clicking an old email link), it silently **updates their password** — this means an old, possibly-forwarded invite email could be used to take over/reset a webstore owner's password at any time in the future unless tokens expire — **Needs Verification** of `_resolve_invite`'s expiry enforcement (not opened in this session; the function exists and is called, but its internal expiry logic wasn't reviewed).
- **Two admins editing the same user's role simultaneously**: no optimistic-locking/version field found — last write wins, no conflict detection.

### Error Messages
Current error messages are generally good (clear, no leaked internals): "Invalid email or password", "Account is disabled", "This reset link is invalid or has already been used." No changes recommended to the wording itself.

### Recovery Rules
- Password reset: fully self-service via email, works today.
- Disabled account: no self-service recovery — must contact an Owner/Admin.
- Suspended tenant: no self-service recovery — must contact support (mailto link).
- Locked-out employee (wrong PIN too many times): no lockout exists today, so there's nothing to "recover" from — but also nothing stopping a brute-force guesser.
- Forgotten Customer Portal password: no self-service recovery — must ask shop staff to re-invite (regenerates PIN).

---

## 13. Important Files and Code Map

### Frontend Files
| File Path | Purpose | Important Components / Functions | Keep / Replace / Remove |
|---|---|---|---|
| `frontend/src/context/AuthContext.js` | Central auth state, login/register/logout, permission checks | `AuthProvider`, `useAuth`, `hasPermission`, `PERMISSION_ALIASES` | Replace `Permission`/`UserRole` local enums with backend-sourced values; keep the rest |
| `frontend/src/pages/Login.js` | Login + Register + Forgot-password UI (combined) | Toggle-state form | Rebuild as 3 separate routed screens |
| `frontend/src/pages/ResetPassword.js` | Complete password reset | — | Keep as-is |
| `frontend/src/pages/AccountSuspended.js` | Suspension dead-end screen | — | Keep, fix hardcoded support email |
| `frontend/src/components/TrialLockout.js` | Trial/subscription gate wrapper around the whole app | `TrialLockout`, `LockoutScreen`, `GracePeriodBanner`, `TrialCountdown` | Keep — note this is a **billing** concept layered on top of auth, not auth itself; boundary worth keeping clean in rebuild |
| `frontend/src/lib/authStorage.js` | Centralized token storage helper for 3 of the 4 auth systems | `getAuthToken`/`setAuthToken`/etc., portal + employee variants | Keep, extend to cover Owner Portal too |
| `frontend/src/lib/suspensionGuard.js` | Detects/handles the `tenant_suspended` 403 shape | `isTenantSuspendedDetail`, `redirectToSuspendedScreen` | Keep |
| `frontend/src/pages/PortalLogin.js` | Customer Portal login screen | — | Needs Verification (not opened this session) — add forgot-password link when backend flow exists |
| `frontend/src/pages/EmployeePortalLogin.js` | Employee PIN login screen | — | Needs Verification (not opened this session) |
| `frontend/src/pages/OwnerPortal.js` | Owner dashboard + inline login | Inline login form + `authed` state using raw `localStorage` | Extract login into its own screen; use `authStorage.js` |
| `frontend/src/pages/OwnerPortalSignup.js` | Owner portal account creation from invite | — | Needs Verification (not opened this session) |
| `frontend/src/pages/WebstoreOwnerOnboard.js` | Stripe onboarding (not login) for quick-connect owners | — | Out of this module's true scope — belongs to Webstores/Stripe |
| `frontend/src/pages/UserManagement.js` | Team list, role/status/password admin actions | `RoleBadge`, reset-password dialog | Keep; move under `/settings/users` per Architecture Map recommendation |
| `frontend/src/components/SupportModeBanner.js` | Impersonation banner | — | Needs Verification (not opened this session, referenced by `MainLayout.js`) |

### Backend Files
| File Path | Purpose | Important Functions / Endpoints | Keep / Replace / Remove |
|---|---|---|---|
| `backend/routes/auth.py` | Main tenant auth + user admin | `register`, `login`, `forgot_password`, `reset_password`, `setup_admin_account`, `admin_*` | Keep structure; add rate limiting; add email verification |
| `backend/models/auth.py` | User/Tenant/Permission models + `ROLE_PERMISSIONS` | `Permission` enum, `ROLE_PERMISSIONS` | Keep as single source of truth; fix Admin's missing `USERS_MANAGE` (pending decision) |
| `backend/core_runtime.py` | Shared JWT/password helpers, `get_current_user`, `has_permission` | `verify_password`, `get_password_hash`, `create_access_token`, `get_current_user`, `get_current_active_user`, `has_permission` | Keep — this is the correct centralization pattern; extend to be the *only* place other portals derive their token logic from (today employee/customer/owner portals each re-implement their own JWT decode instead of reusing this) |
| `backend/routes/portal.py` (auth section only) | Customer Portal auth | `get_current_portal_customer`, `portal_register`, `portal_login`, `change_portal_password` | Keep; add forgot-password |
| `backend/routes/employee_portal.py` | Employee Portal auth + PIN handling | `employee_login`, `create_employee_token`, `get_current_employee`, `set_employee_pin` (dead) | Replace PIN storage/verification with bcrypt; implement or remove `set_employee_pin` |
| `backend/routes/webstore_owners.py` | Owner invite, Stripe onboarding, Owner Portal signup | `_resolve_invite`, `portal_signup`, `owner_login_link` | Keep; verify invite-token expiry enforcement; clean up `__import__` |
| `backend/routes/platform_admin.py` (impersonation section) | Impersonation start/exit/logs | `start_impersonation`, `exit_impersonation`, `require_platform_admin` | Keep; consider tenant-visible transparency log |
| `backend/routes/customers.py` (portal-invite section) | Staff-side portal invite for customers | `invite_customer_to_portal` | Keep; consider forcing password change on first login after a temp-PIN invite |
| `backend/services/email_service.py` | SendGrid email sending | `send_password_reset_email`, `send_email` | Keep (owned jointly with Communications module) |
| `backend/server.py` (startup + CORS sections) | JWT secret loading, platform_creator self-heal, password-hash audit, CORS config | `startup_migrations`, `_run_password_hash_audit` | Keep patterns; rotate `JWT_SECRET_KEY` to a real random secret before go-live |

### Shared Files / Utilities
| File Path | Purpose | Used By | Rebuild Notes |
|---|---|---|---|
| `backend/core_runtime.py` | JWT + bcrypt helpers | Main app auth, indirectly imported by `auth.py`/`portal.py` via `server` re-export | Should be the *only* JWT helper module; employee/customer/owner portals should import from here instead of duplicating `jwt.decode`/`jwt.encode` calls with their own token-shape logic |
| `frontend/src/lib/authStorage.js` | Token storage | Main app, Customer Portal, Employee Portal | Extend to Owner Portal |

### Styles / Design Files
No dedicated style files for auth — screens use inline `style={{ backgroundColor: 'var(--...)' }}` CSS-variable theming consistent with the rest of the app. No problems found specific to this module's visual layer beyond the general note that Login/Register/Forgot-password being one component makes styling/testing each state more brittle than three small dedicated screens would be.

### Tests
**Needs Verification** — a broad `backend/tests/` directory exists in the repo (confirmed present from earlier exploration in this session, e.g. `test_iteration86_auth_storage_hardening.py`), but this session did not open or run those specific test files to confirm current pass/fail status or coverage scope. Recommend the next builder run `pytest backend/tests/test_iteration86_auth_storage_hardening.py` and any other auth-named test files before relying on this document's "what works" claims as a full regression baseline.

---

## 14. Design and Layout Requirements

### Current Visual Problems
- Login/Register/Forgot-password crammed into one component with conditional rendering rather than routes — harder to deep-link, harder to test, harder to add a proper "back" browser-history behavior.
- Owner Portal's login form is visually embedded inside the dashboard component rather than being its own clean screen.
- No visible password-strength indicator anywhere (only a bare minimum-length check).

### Must-Keep Visual Elements
- The centered card layout on a dark themed background (`var(--bg)`) with the SignGuy AI logo — consistent and clean, matches brand.
- Inline show/hide password toggle (eye icon) — good UX, keep.
- Clear, non-alarming suspension/lockout screens (AccountSuspended, TrialLockout) that explain *why* and *what to do next* rather than just erroring out.

### Rebuild Design Requirements
- Desktop/Tablet/Mobile: current layout is already responsive (`max-w-md`, centered, `p-4`) — no confirmed mobile-specific problems in the auth screens themselves.
- List/Detail view: N/A for auth (no list views).
- Create/edit form: Register form should become its own route; keep the same field set.
- Empty/Loading/Error states: Login already has good inline error alerts (destructive variant) and a loading spinner + disabled button during submit — keep this pattern for every new screen split out.
- Search/filter/bulk actions: N/A.
- Accessibility: Labels are correctly associated via `htmlFor`/`id` pairs throughout (`Login.js`, `ResetPassword.js`) — good. **Needs Verification**: no explicit `aria-live` region confirmed for error announcements, which would help screen-reader users notice validation errors without additional testing.

---

## 15. Module Dependencies

### Modules This Module Depends On
| Dependency Module | Why It Is Needed | Required Data / Actions | Rebuild Risk |
|---|---|---|---|
| Communications/Email (SendGrid) | Deliver password reset + portal invite emails | `email_service.send_*` | Low — already working |
| Billing | Trial status gating (`TrialLockout` reads `/api/billing/trial-status`) | Read-only | Low, but boundary should stay clean — auth shouldn't own trial logic, just consume it |
| Customers | Customer Portal credentials live on the Customer document | Read/write `portal_*` fields | Medium — conceptually this couples two modules' data tightly; a cleaner boundary would be a separate `customer_credentials` collection |
| Employees/Team | Employee Portal credentials live on the Employee document | Read/write `pin` field | Same as above |
| Webstores | Owner invite tokens originate from the Webstores module | Read invite/token records | Low |

### Modules That Depend on This Module
| Dependent Module | What It Needs From This Module | Rebuild Risk |
|---|---|---|
| Literally every other module | `get_current_active_user` / `has_permission` for every protected route | **Highest risk in the entire app** — any regression here breaks everything simultaneously; must be the most heavily tested piece of the rebuild |
| Platform Admin | Impersonation mechanism | High — impersonation is a powerful capability, must be re-verified thoroughly if JWT structure changes |
| Customer/Employee/Owner Portals | Their respective independent auth mechanisms | Medium each, isolated from each other (a bug in one doesn't break the others, which is a *positive* of the current fragmented design) |

### Events This Module Sends
- None formally emitted as domain events (no event bus/pub-sub found) — impersonation and audit actions are direct DB writes, not published events. **Needs Verification** if a rebuild wants to introduce a proper event system (e.g., `user.login.succeeded`, `user.role.changed`) for other modules (like a future Notifications module) to react to.

### Events This Module Receives
- None found — this module does not listen for events from other modules (e.g., "customer deleted" does not automatically revoke that customer's portal access token — though since `get_current_portal_customer` re-fetches the customer doc on every request, a deleted customer is naturally locked out anyway, so this isn't a functional gap, just confirms there's no explicit event-driven design here).

---

## 16. Migration and Rebuild Strategy

### Existing Data That Must Be Preserved
- All `users` documents (email, hashed_password, role, tenant_id, is_active) — this is the entire identity graph of every real customer.
- All `tenants` documents and their settings.
- Active/valid `password_reset_tokens` should NOT be migrated (they're inherently short-lived and stale by migration time) — safe to leave behind (see next section).
- `impersonation_logs` — historical audit value, should be preserved for compliance/history even if the mechanism is rebuilt.
- Customer `portal_password_hash`/`portal_enabled` and Employee `pin` — must be preserved so existing customers/employees don't lose portal access on rebuild day, **but** the Employee PIN migration should include a forced-reset step given the plaintext-to-bcrypt change recommended above (plaintext PINs can be bcrypt-hashed in place during migration without user action needed, since bcrypt just needs the raw value once to hash it — no forced reset actually required, correcting my own initial assumption: migration can happen silently).

### Existing Data That Can Be Archived
- Used/expired `password_reset_tokens` — archive or delete, no ongoing value beyond audit curiosity.
- Test/demo accounts listed in `test_credentials.md` (`*@example.com`) — archive, not real customer data.

### Existing Data That Should Not Be Migrated
- The hardcoded default employee PIN behavior itself (`"1234"` fallback logic) — this is *logic*, not data, but should explicitly NOT be carried into the rebuild.
- The disabled `/auth/setup-admin` bootstrap tool, unless a real production bootstrap need is identified — otherwise it's a lingering skeleton key.

### Recommended Rebuild Order
**Phase 1: Foundation** — Core `User`/`Tenant` models, bcrypt password hashing, JWT issue/verify (`core_runtime.py`-equivalent), single canonical `Permission`/`UserRole` source consumed identically by frontend and backend (e.g., frontend fetches permissions dynamically rather than hardcoding a parallel enum).

**Phase 2: Core Workflow** — Register, Login, Forgot/Reset Password (as 3 separate routed screens), Account Suspension gate, basic rate limiting on login/reset endpoints.

**Phase 3: Automation and Integrations** — SendGrid password-reset + portal-invite emails, background password-hash audit, `platform_creator` self-heal.

**Phase 4: Advanced Features** — Customer Portal auth (add forgot-password), Employee Portal auth (bcrypt PINs, no default fallback, working `set-pin`), Owner Portal auth (extract dedicated login screen, use shared token storage).

**Phase 5: Reports, AI, and Polish** — Platform Admin impersonation with tenant-visible transparency log, proper login/security-event audit trail (currently missing), UI polish (aria-live error regions, password-strength meter).

### Rebuild Risks
- **This module gates every other module** — any regression here has the widest possible blast radius in the entire app. Requires the most thorough regression testing of any module in the rebuild.
- Changing JWT secret or token shape invalidates every active session across all 4 auth systems simultaneously — must be a coordinated, communicated cutover, not a silent deploy.
- Fixing the Admin `USERS_MANAGE` permission gap could either be a bug fix (Admins gain new capability) or a business-rule confirmation (intentional Owner-only) — **must get Donnell's decision before changing**, since it changes real behavior for real Admin users.

### Required Decisions Before Building
1. Should Admins be allowed to manage users (create/edit/delete/role-change), or is Owner-only intentional? (Currently the code checks a permission Admins don't have, functionally blocking them — decide if this is a bug or a feature.)
2. Should Employee PINs require a specific format (e.g., exactly 4 digits) enforced server-side?
3. Should impersonation notify the tenant (transparency) or remain silent (current behavior)?
4. Should Customer Portal registration require email verification, and should self-registration (main app) require it too?
5. What is the desired session length per user type — should it be configurable per tenant, or fixed as today (24h/30d/12h/24h)?

---

## 17. Testing Requirements

### Critical Tests
| Test Scenario | Expected Result | Priority |
|---|---|---|
| Register with duplicate email | 400, no duplicate tenant/user created | Critical |
| Login with correct credentials | Token issued, `/users/me` returns correct role/tenant | Critical |
| Login with wrong password 10x in a row | (Today: all attempts processed with no lockout — rebuild should show a lockout/backoff after N attempts) | Critical (post-fix) |
| Disabled user attempts login | 400 "Account is disabled" | Critical |
| Suspended tenant user attempts any authenticated request | 403 structured `tenant_suspended` response | Critical |
| Forgot-password for unknown email | Generic success message, no email sent, no enumeration | Critical |
| Reset-password with expired token | 400 "expired" message, password unchanged | Critical |
| Reset-password token reuse | 400 "invalid or already used" | Critical |
| Employee login with default `"1234"` PIN (pre-fix baseline) vs required explicit PIN (post-fix) | Pre-fix: succeeds (documenting current risk); Post-fix: should fail unless explicitly set | High |
| Owner deletes the last remaining Owner | 400 blocked | Critical |
| Admin attempts to create a new user | Currently 403 (missing `USERS_MANAGE`) — confirm this matches the decided business rule | High |
| Platform admin impersonates a user, then exits | Log created with `ended_at`/`duration_seconds` populated; original platform-admin session restorable | Critical |

### Manual Test Checklist
- [x] Create a new record → Register a new tenant/owner
- [x] Edit existing record → Change own profile name/company
- [ ] Search and filter records → N/A for this module
- [x] Confirm permissions work → Verify Staff cannot access `/users`, Owner can
- [ ] Confirm activity log is created → **Currently fails** for login/logout/password-change (no log record) — only impersonation is logged
- [x] Confirm mobile layout works → Login form is responsive (visual spot-check recommended, not deeply verified this session)
- [x] Confirm error states are understandable → Confirmed clear messages throughout
- [x] Confirm related module data updates correctly → New tenant creates sample data, credits, etc.
- [x] Confirm email/SMS notifications work → Password reset email confirmed working (prior session); portal-invite email logic confirmed present (not re-tested this session)
- [ ] Confirm files upload and download correctly → N/A
- [ ] Confirm AI credits are handled correctly → N/A to auth itself (credits *granted* on registration, but AI credit *usage* is a different module)
- [x] Confirm no duplicate records are created → Duplicate-email registration blocked
- [ ] Confirm deleted/archived records behave correctly → Deleted employee/customer immediately locks out portal access (confirmed by code inspection, not live-tested this session)

### Definition of Done
This module is complete only when: (1) all 4 auth systems use bcrypt/equivalent secure hashing with no plaintext credentials anywhere, (2) login attempts are rate-limited on every endpoint, (3) frontend and backend share one canonical Permission/Role source with zero silent-mismatch risk, (4) the Admin permission gap is resolved per an explicit business decision, (5) basic login/security events are queryable in an audit log, and (6) every screen has a real, deep-linkable route (no combined toggle-state auth screens).

---

## 18. Final Rebuild Recommendation

### Keep
- Password reset flow architecture (single-use hashed token, anti-enumeration, prior-token invalidation) — reuse this exact pattern everywhere else auth-adjacent (Customer Portal forgot-password should copy it verbatim).
- `has_permission()` centralization in `core_runtime.py` and the concept of Owner/Platform-Admin/Platform-Creator bypassing granular checks.
- `platform_creator` env-var-only self-heal mechanism — a genuinely good security pattern, don't touch it.
- Impersonation's audit-logging discipline (start/end/duration + admin-audit entry).
- Tenant-suspension double-check (login-time + every-request) as a concept, even if consolidated into one shared function.
- Visual design/theming of the login screens.

### Rebuild From Scratch
- Employee PIN storage and verification (bcrypt, no defaults, explicit setup required).
- Frontend Permission/Role constants — should be generated from or fetched dynamically from the backend, never hand-maintained twice.
- Login/Register/Forgot-password screen structure — split into 3 real routes.
- Rate limiting / brute-force protection across all 4 login endpoints (currently zero).

### Merge With Another Module
- Consider merging the *concept* of "trial lockout" gating more explicitly with Billing (it already lives partly there via `/api/billing/trial-status` — just tighten the ownership line so Auth module docs don't need to explain Billing's formulas).

### Remove
- `POST /auth/setup-admin` bootstrap endpoint, unless a genuine ongoing bootstrap need is confirmed (currently a disabled skeleton key with no active caller).
- The non-functional `POST /employee-portal/auth/set-pin` endpoint — either implement it for real or delete it so it stops looking like a working feature.
- The hardcoded `"1234"`/phone-suffix PIN fallback logic in `employee_login`.

### Postpone
- Tenant-visible "you were impersonated" transparency notifications — valuable but not launch-blocking.
- Session/device management UI ("log out of all other devices") — nice-to-have, not core.
- Configurable-per-tenant session length — nice-to-have, current fixed values are a reasonable default.

### Recommended Priority
- [x] Critical

### One-Paragraph Builder Handoff
This module is the identity and access layer for five different populations (tenant staff, customers, employees, webstore owners, and platform admins), implemented as four separately-coded login systems that happen to share one JWT secret. The main tenant login and its password-reset flow are genuinely well-built and should be used as the template for the other three. The two things that must not be forgotten in the rebuild: (1) Employee PINs are currently stored and checked in **plaintext**, with a hardcoded `"1234"` fallback for any employee without an explicit PIN — this is a real security hole that must be fixed with bcrypt hashing and no default value; and (2) the frontend's `Permission`/`UserRole` definitions are a hand-maintained, already-drifted copy of the backend's real definitions, patched together with an alias map that doesn't even cover every case (`ai_tools:use` silently always fails) — the rebuild must make the backend the single source of truth and have the frontend consume it directly rather than redefining it. Everything else — impersonation, tenant suspension, password reset — works correctly today and can be trusted as a foundation, but has zero rate-limiting anywhere, which should be added before this goes in front of more real customers.

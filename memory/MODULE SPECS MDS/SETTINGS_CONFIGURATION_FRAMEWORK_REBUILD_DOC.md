# SETTINGS AND CONFIGURATION FRAMEWORK — Rebuild Documentation

## Module Status
- [x] Existing and working (Tenant self-service settings via `PUT /api/tenant`; Backup export/restore; Platform-level SendGrid/Stripe/Twilio configuration via env vars)
- [x] Existing but incomplete (No unified "Integrations" hub — only two ad hoc, independently-built tenant-facing integration pages exist: Meta/Facebook and Stripe Connect; no tenant-facing SendGrid/Twilio configuration UI at all)
- [x] Existing but broken (**Confirmed live**: Daily Digest settings can be edited — including adding an arbitrary external email recipient — by a `staff`-role user with zero permission check; **confirmed by code review**: Email Templates, Meta Integration connect/disconnect, and AI Assistant Personality settings all share the identical zero-permission-check gap)
- [ ] Partially built / prototype
- [ ] Planned only
- [x] Needs replacement ("Shared settings architecture" does not exist — at least 7 independently-built settings subsystems, each with its own storage location, its own (or absent) permission gate, and its own page, with no common framework tying them together)
- [x] Needs verification (items called out inline below)

**Documentation Date:** 2026-07-02
**Completed By:** E1 (AI Agent) — direct code inspection + live API verification (one vulnerability reproduced live against the running preview backend using a real `staff`-role test account, then immediately reverted), no screenshots used.
**Repository / Branch Reviewed:** `/app/` (current preview checkout, main branch per `.emergent` metadata)
**Related App Version / Deployment:** Preview environment (current `REACT_APP_BACKEND_URL`); accounts per `test_credentials.md` — `thesigntistslab@gmail.com` (owner, tenant "The Signtists Lab") and `staff_payroll_test@test.com` (staff, same tenant)

> **Method note:** Every claim below was verified by reading the actual file or by a live `curl` call against the running backend. Files read in full or in relevant ranges: `backend/routes/backup.py` (full, 386 lines), `backend/routes/digest.py` (full save/get/history handlers), `backend/routes/email_templates.py` (update handler), `backend/routes/meta_integration.py` (grep-level, every route decorator + surrounding context), `backend/routes/ai.py` (`assistant/personality` GET/PUT, full), `backend/routes/ai_assistant_prefs.py` (grep-level), `backend/routes/stripe_connect.py` (`create-account` handler + grep-level route list), `backend/routes/platform_admin.py` (`delete_tenant`'s hardcoded collection list, re-examined against `backup.py`'s list for drift), `frontend/src/pages/CompanySettings.js` (top of file, full settings-section state), `frontend/src/components/ribbon/PrimaryNav.js` (`tabSubItems.settings`, full), `frontend/src/App.js` (all `/settings/*` route registrations), `frontend/src/pages/settings/AssistantSettings.js` (grep-level, API call sites), `frontend/src/pages/settings/AIAuditLog.js` (grep-level, API call site). **Live verification (reproduced then reverted):** logged in as the `staff_payroll_test@test.com` test account (role `staff`, no `SETTINGS_MANAGE`/`SETTINGS_VIEW` permission), called `PUT /api/digest/settings` with `{"enabled": true, "recipients": ["attacker_test_DELETE_ME@example.com"]}` → received `200 OK` with the change applied. Immediately reverted using the Owner account (`enabled: false, recipients: []`) to leave production data in its original state.

---

## 1. Module Identity

### Module Name
Settings and Configuration Framework.

### Alternate / Legacy Names
Not a single named module in code — this document groups together every screen/endpoint whose purpose is "let a tenant (or the platform) configure how the app behaves," which spans code across `server.py`, `routes/backup.py`, `routes/digest.py`, `routes/email_templates.py`, `routes/meta_integration.py`, `routes/ai.py` (assistant personality section), `routes/ai_assistant_prefs.py`, `routes/stripe_connect.py`, and `routes/platform_admin.py` (`/site-settings`, briefly referenced).

### Primary Purpose
Let a shop (or, separately, the platform operator) change *how the application behaves* without a code deployment: company identity/branding, which integrations are connected, what emails go out and to whom, how to back up/restore data, and how the AI Assistant behaves. Unlike the previous two module docs (Tenants, Access Control), which each centered on one coherent mechanism, **this module's defining characteristic — and the answer to the "shared settings architecture" question the user specifically asked about — is that no single mechanism exists.** Each "setting" area was built independently, at a different time, by whichever code touched it, resulting in (per the findings below) at least three different storage patterns and at least three different (or absent) permission-enforcement patterns coexisting under one "Settings" umbrella in the navigation.

### Main Users
- **Owner** — the only role the app *intends* to restrict tenant-wide configuration to (explicit in `CompanySettings.js`'s and `backup.py`'s own code) — but, per §2, this intent is only actually enforced for 2 of the 7+ settings subsystems reviewed.
- **Admin / Staff** — per the app's own design intent, should have limited-to-no ability to change tenant-wide settings; per the confirmed findings below, several settings subsystems grant them full write access anyway.
- **Platform Admin / Platform Creator** — owns a separate, smaller set of platform-wide configuration (`PlatformAdminSiteSettings.js`, referenced briefly; not deeply audited this session as it's platform-level, not tenant-level, configuration).

### Why This Module Matters
"Settings" pages are, by nature, high-trust surfaces — they change *how the whole tenant operates*, not just one record. When permission-gating is inconsistent across these surfaces (as confirmed below), the practical risk isn't abstract: a live test in this session showed a `staff`-role account — someone with explicitly narrower permissions than Admin, who cannot even view Financials — successfully redirecting the tenant's daily financial/operational digest email to an external address with a single unauthenticated-by-role API call.

### Module Boundary
**This document covers, as one grouped topic per the user's request:**
- Company/business identity settings (`Tenant.name`/`address`/`phone`/etc.) — storage and workflow already fully documented in the Tenants module doc; referenced here only for the *architecture pattern* it represents (settings embedded on the `Tenant` document, Owner-gated).
- Branding settings (`Tenant.branding_settings`) — same cross-reference; the "full-replace-disguised-as-merge" finding from the Tenants doc applies here unchanged and is not re-derived.
- **Integrations**: Meta/Facebook connection (`routes/meta_integration.py`), Stripe Connect (`routes/stripe_connect.py`) — the only two tenant-facing, self-service integration configuration surfaces that exist.
- **Email settings**: Email Templates (`routes/email_templates.py`), Daily Digest (`routes/digest.py`), and the branding-embedded `email_from_name`/`email_signature`/etc. fields (cross-referenced, not re-derived).
- **Backup**: `routes/backup.py`'s export/restore system.
- **Assistant settings**: AI Assistant personality/skip-confirm preferences (`routes/ai.py`), saved commands/routines/preferences (`routes/ai_assistant_prefs.py`), and the adjacent AI Assistant Action Audit Log screen.
- **Shared settings architecture**: the cross-cutting analysis of storage patterns, permission patterns, and navigation structure across all of the above — the primary original contribution of this document.

**This module does not own:**
- The `Tenant` model's field-level schema drift or the settings-save-as-full-replace mechanics — already fully documented in `TENANTS_ORGANIZATIONS_MODULE_REBUILD_DOC.md` §5/§6; referenced, not repeated.
- The `Permission`/`ROLE_PERMISSIONS` enforcement mechanics themselves (`has_permission()` vs. `user_has_permission()`) — already fully documented in `USERS_ROLES_PERMISSIONS_ACCESS_CONTROL_REBUILD_DOC.md`; this doc simply identifies *which specific settings endpoints use which pattern (or none at all)*, without re-deriving the underlying access-control bug catalog.
- Pricing configuration (`PricingSettings.js`, `/pricing-foundation`, `/settings/pricing-setup`) — owned by the Pricing module; noted only as one more entry in the flat "Settings" sub-nav, not deep-audited here.
- Production/workflow settings (`ProductionSettings.js`, `/settings/production`) — owned by the Orders/Production module; same treatment.
- Platform-level site settings (`PlatformAdminSiteSettings.js`) — owned by the Platform Admin module; not tenant-facing, briefly noted only.

---

## 2. Current State Summary

### What Exists Today
"Settings" in this app is not a page — it's a *tab* in the primary navigation (`PrimaryNav.js`'s `settings` group) containing **10 separate, independently-routed pages**: Company (`/settings`), Pricing Foundation, Import Invoices, Email Templates, Daily Digest, AI Assistant, Production, Backup, Users, and Meta/Facebook. An eleventh page (AI Assistant Action Audit Log, `/settings/ai-audit`) exists and is fully routed but is **not linked from any navigation menu at all** — reachable only by typing the URL directly. Stripe Connect configuration (`/admin/payments`) is reachable from the app but lives under a `billing`-tagged nav grouping, not `settings`, despite being conceptually a settings/integration screen.

Each of these pages talks to its own, independently-designed backend. Three genuinely different **storage patterns** are in active use: (1) fields embedded directly on the `Tenant` document (Company, Branding, Payroll, Time Tracking, Employee Portal, Signatures, and — less obviously — AI Assistant personality, which also writes to `Tenant` despite living on a completely separate page and using a completely separate API namespace, `/ai/assistant/personality`, from the Company Settings page's `/api/tenant`); (2) dedicated per-feature collections (`digest_settings`, `email_templates`) keyed by `tenant_id`; (3) real-time third-party state mirrored onto the `Tenant` document by webhook/OAuth callback (`stripe_connect_account_id`, Meta page-linking fields).

Three genuinely different **permission-enforcement patterns** are in active use across these subsystems, and they do not correlate with how sensitive the underlying action actually is: `PUT /api/tenant` (Company/Branding/Payroll/etc.) and `backup.py`'s export/restore correctly require `role == owner`; `PUT /api/digest/settings`, `PUT /{template_id}` (Email Templates), every Meta Integration write endpoint, `PUT /ai/assistant/personality`, and `POST /stripe-connect/create-account` require **no role or permission check at all** beyond being an authenticated tenant user of any role.

### What Works Well
- `backup.py`'s export/restore system is, on its own terms, an excellently-built feature: real snapshot-and-rollback atomicity for restores (verified in code — every touched collection is snapshotted before any delete/insert, and a failure mid-restore triggers a full rollback rather than a partial, corrupted state), SHA-256 per-record integrity checksums, sensible exclusion of binary/sensitive fields (passwords, base64 logos/images) from the exported JSON, and legacy collection-name aliasing so old backup files taken before a collection rename (`jobs`→`orders`, etc.) still restore correctly. This is easily one of the best-engineered features found across all three module docs produced this session.
- `backup.py` correctly gates both export and restore to `role == owner` only, via a defensive, enum-safe helper (`_is_owner`) explicitly written to avoid the exact "role representation drift" bug class documented elsewhere in this app.
- The Company Settings page's per-section save pattern (independent cards for Business Info/Branding/Payroll/Time Tracking/Employee Portal/Signatures, each with its own save button) — already praised in the Tenants doc — remains a sensible UX choice.
- The `PrimaryNav.js` "Settings" sub-nav grouping at least gives every one of these scattered pages *a* consistent place to be discovered (with the one AI Audit Log exception below) — better than nothing, even though it's a flat list rather than a true shared architecture.

### What Is Broken, Confusing, or Incomplete
- **CRITICAL, CONFIRMED LIVE — `PUT /api/digest/settings` has zero permission check and was successfully used, live, by a `staff`-role test account to add an arbitrary external email address as a recipient of the tenant's Daily Digest.** The Daily Digest email (per `digest.py`'s `compile_digest_data`) contains real operational and financial data: overdue invoices with customer names and dollar amounts, today's scheduled employees and their shift times, and jobs due today. Reproduced live: `curl` as `staff_payroll_test@test.com` → `PUT /api/digest/settings {"enabled": true, "recipients": ["attacker_test_DELETE_ME@example.com"]}` → `200 OK`, change applied. **No audit-log entry is created for this change** — a shop owner would have no way to discover this had happened short of manually re-checking the Daily Digest settings screen. Reverted immediately after confirmation.
- **The same zero-permission-check gap exists on at least four other confirmed settings-mutation endpoints**, all reviewed directly in code: `PUT /email-templates/{template_id}` (any tenant user can rewrite the wording of customer-facing transactional emails — a phishing/social-engineering vector if a compromised or disgruntled low-privilege account inserts a malicious link or altered payment instruction into an invoice-notification template); every write endpoint in `meta_integration.py` (any tenant user can connect, reconfigure, or disconnect the tenant's linked Facebook Page); `PUT /ai/assistant/personality` (any tenant user can change the AI Assistant's behavior mode and which action types it's allowed to skip confirmation for, tenant-wide); `POST /stripe-connect/create-account` (any tenant user can initiate a Stripe Connect account link for the tenant — a financial-integration action that plausibly should be Owner-restricted like every other money-touching action in this app already is).
- **No unified "Integrations" concept exists.** There is no page listing "here are the third-party services you can connect." Meta/Facebook and Stripe Connect are each their own bespoke page, built independently, discovered only by already knowing they exist (Meta is under the Settings sub-nav; Stripe Connect is filed under Billing, not Settings, despite being just as much a "configure a third-party connection" screen). SendGrid (outbound email) and Twilio (SMS, currently paused per product decision) have **no tenant-facing configuration UI at all** — they are pure platform-level environment variables (`SENDGRID_API_KEY`, etc.), meaning a tenant cannot, for example, use their own SendGrid account or verify their own sending domain; every tenant's outbound email comes from one shared platform sender identity.
- **The AI Assistant Action Audit Log page (`/settings/ai-audit`) is fully built and routed but completely unlinked from any navigation** — not in `PrimaryNav.js`'s settings sub-nav, not in `MobileNav.js`, not linked from the AI Assistant Settings page itself. A user would have to already know the exact URL to ever find it.
- **Two independent, hand-maintained "list of every tenant-scoped collection" constants exist in the codebase, and they have drifted apart in a way with real data-integrity consequences.** `backup.py`'s `BACKUP_COLLECTIONS` (39 entries, actively maintained — it correctly includes every Inventory/Purchasing collection) and `platform_admin.py`'s `delete_tenant` collection list (24 entries, documented as stale in the Tenants module doc) do not match. Investigating this drift for this document surfaced a **more severe instance of the already-flagged bug**: `delete_tenant`'s list includes the literal string `"webstores"` — but the live, actually-used collection (confirmed via grep: `db.webstores_v2` appears 50 times in `webstores.py`; bare `db.webstores` appears zero times anywhere) is named `webstores_v2`. **This means deleting a tenant today does not delete that tenant's actual webstore records at all** (nor its `webstore_products`, also absent from the delete list) — it only clears `webstore_orders_v2`, which *is* correctly named in the list. This is a refinement of the Tenants doc's existing "stale hardcoded delete list" finding, now with a concrete, named example of data that survives a "permanent" tenant deletion today.
- **AI Assistant personality/skip-confirm settings live on the `Tenant` document (same collection, same document as Company/Branding settings) but are edited through a completely separate API namespace (`/ai/assistant/personality`) and a completely separate frontend page (`AssistantSettings.js`), never through `CompanySettings.js`'s `PUT /api/tenant`.** This is not inherently wrong, but it means the `Tenant` document can be mutated from at least two unrelated code paths with two different (and, per the finding above, differently-enforced) permission postures — a concrete illustration of "no shared settings architecture" beyond the abstract description.
- **Daily Digest and Email Templates use dedicated per-feature collections (`digest_settings`, `email_templates`) instead of the `Tenant` document**, while conceptually similar settings (Branding's own `email_from_name`/`email_signature`/`email_show_logo` fields) live embedded on `Tenant` — meaning "email settings" specifically is split across three different homes (`Tenant.branding_settings`, `digest_settings` collection, `email_templates` collection) with no cross-referencing or single "Email Settings" page tying them together for the user (a user configuring their email sender name in Branding has no indication that Daily Digest recipients or Email Template wording live on entirely separate screens).

### Placeholder / Demo / Fake Data
None found — every settings subsystem reviewed writes and reads real, live data; the "fakeness" here is architectural inconsistency, not mocked functionality.

### Features That Exist in Code but Are Not Visible
- The AI Assistant Action Audit Log screen (`/settings/ai-audit`) — fully functional, zero navigation entry points (see above).
- `backup.py`'s integrity manifest/checksum data (`integrity_manifest`, `integrity_row_index`, `integrity_checksums`) is computed and included in every export, but **Needs Verification** whether `BackupRestore.js`'s frontend UI surfaces any of this to the user (e.g., a "verify backup integrity" button) or whether it's purely a backend-only safety net today with no user-visible use.

### Features Visible in the UI but Not Actually Functional
None found specific to this module — every settings screen reviewed does successfully persist its changes when saved (the problem is *who* is able to trigger that save, not whether the save itself works).

---

## 3. User Experience and Navigation

### Where the Module Lives in the App
**Top-Level Area:** The "Settings" tab in the primary ribbon navigation, plus one page (Stripe Connect) filed under "Billing" instead.
**Subsection:** A flat list of 10 independently-routed pages (11 if counting the unlinked AI Audit Log), with no grouping, tabs, or hierarchy beyond the single-level sub-nav list.

**Routes / URLs:**
| Route | Screen | Storage Pattern | Permission Gate |
|---|---|---|---|
| `/settings` | CompanySettings.js (Company/Branding/Payroll/etc.) | Embedded on `Tenant` | Owner only (correct) |
| `/settings/email-templates` | EmailTemplates.js | Dedicated `email_templates` collection | **None** |
| `/settings/digest` | DigestSettings.js | Dedicated `digest_settings` collection | **None** |
| `/settings/assistant` | AssistantSettings.js | Embedded on `Tenant` (separate API from `/settings`) | **None** |
| `/settings/ai-audit` | AIAuditLog.js | Reads `ai_audit_log`-adjacent data | **Needs Verification**; unlinked from nav regardless |
| `/settings/backup` | BackupRestore.js | N/A (exports/imports across ~39 collections) | Owner only (correct) |
| `/settings/meta-integration` | MetaIntegration.js | Fields on `Tenant` + a dedicated Meta-pages collection | **None** |
| `/admin/payments` | Admin/PaymentSettings.js | Fields on `Tenant`/webstores (`stripe_connect_account_id`, etc.) | **None** (on the connect-initiation endpoint reviewed) |
| `/settings/production` | ProductionSettings.js | Out of this doc's scope (Orders module) | Not audited here |
| `/settings/pricing-setup`, `/pricing-foundation` | Pricing settings | Out of this doc's scope (Pricing module) | Not audited here |
| `/users` | UserManagement.js | Out of this doc's scope (Access Control doc) | Documented separately |

### Current Navigation Structure
A single flat sub-nav array (`tabSubItems.settings` in `PrimaryNav.js`) with 10 entries, rendered identically for every role (per the Access Control doc's already-documented finding that navigation has no role-based filtering at all — restated here only because it directly explains why a `staff` user sees, and can click into, every one of these pages exactly as an Owner would).

### Recommended Rebuild Navigation Structure
**Recommended main pages:**
1. A genuine `/settings` hub with tabbed or grouped sections (Company & Branding / Integrations / Email / Backup / AI Assistant / Team & Access), rather than 10 flat, disconnected routes.
2. An "Integrations" tab that actually lists every connectable third-party service (Meta, Stripe Connect, and — even if platform-managed today — a read-only status display for SendGrid) in one place, rather than scattering Meta under Settings and Stripe Connect under Billing.

**Recommended tabs or sections:** Group Email Templates + Daily Digest + Branding's email fields under one "Email" section, since they are conceptually one topic today split across three unrelated screens.

### Screens in This Module

**Screen Name: Daily Digest Settings**
- Route: `/settings/digest`
- Who Can Access It: Any authenticated tenant user can open the page; **any authenticated tenant user can also save changes** (confirmed live — no restriction to Owner/Admin)
- Purpose: Configure whether a daily summary email is sent, at what time, and to which recipients
- Main Information Shown: Enable toggle, schedule time, recipient email list, send history
- Primary Actions: Enable/disable, add/remove recipients, send a test digest now, view history
- Data Source: `GET/PUT /api/digest/settings`, `GET /api/digest/history`, `POST /api/digest/send`
- Related Screens: N/A
- Current Problems: **Live-confirmed** unrestricted write access by any role (see §2's headline finding)
- Rebuild Recommendation: Add an Owner-or-Admin-with-`SETTINGS_MANAGE` gate to `PUT /api/digest/settings`, matching `PUT /api/tenant`'s own posture; add an audit-log entry for recipient-list changes specifically, since that field controls where real business data flows

**Screen Name: Email Templates**
- Route: `/settings/email-templates`
- Who Can Access It: Any authenticated tenant user can open and **edit** (no restriction)
- Purpose: Customize the wording of transactional emails sent to customers (invoice notices, quote-ready notices, etc.)
- Primary Actions: Edit template body/subject, reset to default, preview
- Data Source: `GET/PUT /api/email-templates/{template_id}`, `POST /{template_id}/reset`, `/preview`
- Current Problems: No permission gate on edits
- Rebuild Recommendation: Same gate as above; consider whether "preview" (read-only) should remain open to all roles while "edit"/"reset" become Owner/Admin-only

**Screen Name: Meta / Facebook Integration**
- Route: `/settings/meta-integration`
- Who Can Access It: Any authenticated tenant user can connect/reconfigure/disconnect (no restriction)
- Purpose: Link the tenant's Facebook Page to auto-capture leads (`FacebookLeads.js`)
- Primary Actions: Connect (OAuth), select page, configure lead-capture settings, disconnect
- Data Source: `routes/meta_integration.py` (connect/callback/pages/settings/disconnect)
- Current Problems: No permission gate on any write action, including disconnect (a Staff user could sever the shop's lead-capture integration entirely with no Owner oversight)
- Rebuild Recommendation: Gate connect/disconnect/settings-change to Owner/Admin

**Screen Name: AI Assistant Settings**
- Route: `/settings/assistant`
- Who Can Access It: Any authenticated tenant user can view and **change** the tenant-wide personality and skip-confirm behavior (no restriction)
- Purpose: Choose the AI Assistant's tone/behavior mode and which low-risk action types it may perform without an explicit confirmation step
- Primary Actions: Select personality, toggle skip-confirm for whitelisted action types (currently only `draft_email`)
- Data Source: `GET/PUT /ai/assistant/personality`
- Current Problems: No permission gate; writes to the same `Tenant` document as Company Settings but through an entirely separate, unguarded API
- Rebuild Recommendation: Gate to Owner/Admin, matching the sensitivity of "changing what the AI is allowed to do without asking" — arguably this should be *more* restricted than average settings, not less

**Screen Name: Backup & Restore**
- Route: `/settings/backup`
- Who Can Access It: Owner only (correctly enforced both for export and restore)
- Purpose: Export all tenant data as a downloadable JSON file; restore/import from a previously exported file
- Primary Actions: Export, Preview Restore, Restore
- Data Source: `routes/backup.py` (see §2 for the feature's real engineering quality)
- Current Problems: None in the endpoint's own logic; the only issue is the *separate* `BACKUP_COLLECTIONS` list drifting from `platform_admin.py`'s unrelated delete-tenant list (§2)
- Rebuild Recommendation: Keep as the architectural template for how every other settings-mutation endpoint in this module should be gated; consider deriving both `BACKUP_COLLECTIONS` and the tenant-delete list from one single shared registry so they can never drift apart again

---

## 4. Main User Workflows

### Workflow 1: A Staff Member Redirects the Daily Digest (Confirmed Live)
**User Goal (as actually demonstrated, not a hypothetical):** A `staff`-role account changes where the tenant's daily operational/financial summary email is sent.
**Starting Point:** Any authenticated session with a valid JWT for a `staff`-role user in the tenant.

**Step-by-Step Flow (as reproduced):**
1. Authenticate as a `staff`-role user (no special access needed — this is the account's normal, day-to-day login).
2. Call `PUT /api/digest/settings` with `{"enabled": true, "recipients": ["<any email address>"]}`.
3. Receive `200 OK` with the new settings reflected back.

**System Actions Behind the Scenes:**
1. `update_digest_settings()` (`routes/digest.py`) checks nothing beyond `Depends(get_current_active_user)` (i.e., "is this any valid, active session").
2. Upserts `db.digest_settings` for the tenant with the new `enabled`/`recipients` values.
3. Returns the saved state.

**Data Created or Changed:** `digest_settings.enabled`, `digest_settings.recipients` for the entire tenant (not scoped to the acting user in any way — this is a tenant-wide setting).
**Notifications / Emails / SMS Sent:** None at save time; every subsequent scheduled/manual digest send (`compile_digest_data` → real overdue-invoice amounts, customer names, employee shift schedules) would go to the new recipient list, including the newly-added external address, until someone notices and reverts it.
**Required Approvals or Signatures:** None — this is precisely the gap.
**Workflow Completion Condition:** `digest_settings` reflects the attacker/unauthorized-added recipient.
**Failure or Error Conditions:** None — the request succeeds cleanly, which is the problem.
**Current Problems:** Full write access by any role, zero audit trail, real financial/operational data exposure risk.
**Rebuild Requirement:** **P0.** Add a permission check (`role in (owner, admin)` or `has_permission(current_user, Permission.SETTINGS_MANAGE)`, following the pattern already correctly used by `PUT /api/tenant`) before allowing any change to `enabled` or `recipients`; add an audit-log entry specifically for recipient-list changes.

---

### Workflow 2: Owner Exports and Later Restores a Full Backup
**User Goal:** Take a full data backup before a risky change, or recover after data loss.
**Starting Point:** `/settings/backup`.

**Step-by-Step User Flow:**
1. Owner clicks Export → downloads a JSON file covering ~39 tenant-scoped collections (customers, jobs, invoices, quotes, products, webstores, documents, employees, inventory, purchasing, etc.), with binary/sensitive fields stripped.
2. (Later) Owner clicks Restore, selects the file → sees a Preview (record counts, existing-vs-incoming) before committing.
3. Confirms Restore.

**System Actions Behind the Scenes:**
1. Export: iterate `BACKUP_COLLECTIONS`, query each by `tenant_id`, strip `_id`/passwords/large base64 fields, compute a SHA-256 checksum per record, bundle everything (plus the tenant's own settings, logo excluded) into one JSON payload, and stamp `tenants.last_backup_at`.
2. Restore Preview: validate the file's shape (`backup_version`/`collections` keys present), count records per collection without touching the database.
3. Restore (committed): validate shape again, snapshot every currently-touched collection's tenant data, then `delete_many` + `insert_many` per collection; if *any* step throws, roll every snapshotted collection back to its pre-restore state and return a clear 500 explaining nothing was changed.

**Data Created or Changed:** Every collection named in the uploaded backup file, fully replaced with the file's contents for that tenant.
**Notifications / Emails / SMS Sent:** None.
**Required Approvals or Signatures:** Owner-only access is the approval gate; no secondary confirmation step beyond the Preview screen and whatever client-side confirmation dialog exists.
**Workflow Completion Condition:** `restored_counts` returned, matching the preview's expectations.
**Failure or Error Conditions:** Invalid file format (400), any mid-restore exception (500, with automatic rollback — confirmed by reading the exception-handling code, not just assumed).
**Current Problems:** None in the mechanism itself; the only real problem is the separate concern documented in §2 (this list vs. the tenant-delete list drifting apart) — not a defect in Backup's own logic.
**Rebuild Requirement:** None for this workflow specifically — keep as-is, and use it as the reference implementation when fixing every other settings-mutation endpoint's permission posture.

---

### Workflow 3: Owner Changes the AI Assistant's Personality
**User Goal:** Make the AI Assistant more or less proactive/formal.
**Starting Point:** `/settings/assistant`.

**Step-by-Step User Flow:**
1. Open the AI Assistant Settings page.
2. Select a different personality option (e.g., "Ops Partner" vs. an alternative preset).
3. Optionally toggle "skip confirmation for drafting emails."
4. Save.

**System Actions Behind the Scenes:**
1. `PUT /ai/assistant/personality` validates the chosen `personality` against a whitelist (`PERSONALITY_OPTIONS`) and the `skip_confirm` list against a second, narrower whitelist (only `draft_email` is currently allowed to be skip-confirmed — a sensible, defensively-coded safety limit).
2. `$set`s `tenants.assistant_personality`/`assistant_skip_confirm` directly.

**Data Created or Changed:** `tenants.assistant_personality`, `tenants.assistant_skip_confirm`.
**Notifications / Emails / SMS Sent:** None.
**Required Approvals or Signatures:** None today (this is the gap).
**Workflow Completion Condition:** Next AI Assistant interaction reflects the new personality/skip-confirm behavior.
**Failure or Error Conditions:** Invalid personality key (400); invalid skip-confirm entries are silently filtered out rather than rejected (a minor inconsistency in error-handling style versus the personality field, but not a security issue since the filtering is a whitelist, not a blacklist).
**Current Problems:** No role gate (§2).
**Rebuild Requirement:** Gate to Owner/Admin; consider whether this — controlling what the AI is allowed to do autonomously — deserves its own dedicated, more cautious permission (e.g., a new `AI_ASSISTANT_CONFIGURE` permission) rather than reusing generic settings permissions.

---

## 5. Data Structure and Records

### Primary Records Owned by This Module
| Record Type | Purpose | Storage Location | Permission Gate |
|---|---|---|---|
| Company/Branding/Payroll/Time-Tracking/Employee-Portal/Signature settings | Tenant identity & operational defaults | Embedded on `Tenant` (fully documented in Tenants module doc) | Owner only ✅ |
| AI Assistant personality/skip-confirm | AI behavior configuration | Embedded on `Tenant`, via a **separate API** from the above | **None** ❌ |
| Daily Digest settings | Scheduled summary email config | Dedicated `digest_settings` collection | **None** ❌ |
| Digest send history | Audit trail of past digest sends | Dedicated `digest_logs` collection | Read-only, any authenticated user |
| Email Templates | Customer-facing transactional email wording | Dedicated `email_templates` collection | **None** ❌ |
| Meta/Facebook integration state | Linked Page ID, lead-capture config | Fields on `Tenant` + a Meta-pages collection | **None** ❌ |
| Stripe Connect account state | `stripe_connect_account_id`, charge-enabled flags | Fields on `Tenant`/`webstores_v2` | **None** on initiation ❌ |
| Backup metadata | `last_backup_at` timestamp | Field on `Tenant` | N/A (side-effect of Owner-only export) |

### Database Collections / Tables

**Collection: `digest_settings`**
- Purpose: Per-tenant Daily Digest configuration.
- File or Schema Location: `routes/digest.py` (Pydantic `DigestSettings`/`DigestSettingsUpdate`, raw dict upsert — no `BaseDocument`/`PyObjectId` pattern used).
- Primary ID Field: None declared explicitly — the collection is queried purely by `tenant_id` (implicitly one document per tenant; **Needs Verification** whether a unique index on `tenant_id` exists to prevent duplicate documents from a race condition on first-save, similar to the already-documented `onboarding_checklist` duplicate-race risk in the Tenants doc).
- Tenant / Shop ID Field: `tenant_id`
- Important Fields: `enabled`, `schedule_time`, `recipients` (list of raw email strings, no validation that entries are actually valid/deliverable addresses beyond Pydantic's implicit string typing — **Needs Verification** whether `EmailStr` validation is applied; the model shown uses plain `List[str]`, not `List[EmailStr]`, meaning literally any string can be added as a "recipient").
- Known Data Problems: No permission gate on write (§2); no audit trail; recipients not format-validated.
- Rebuild Recommendation: Add the permission gate; switch `recipients` to `List[EmailStr]`; add a unique index on `tenant_id`.

**Collection: `email_templates`**
- Purpose: Per-tenant, per-template-type overrides of default transactional email wording.
- File or Schema Location: `routes/email_templates.py`.
- Primary ID Field: Composite, effectively `(tenant_id, template_id)`.
- Known Data Problems: No permission gate on write (§2).
- Rebuild Recommendation: Add the permission gate.

### Data Relationships
```
Tenant (1) ──── embeds ──── Company/Branding/Payroll/TimeTracking/EmployeePortal/Signature settings   [Owner-gated write]
Tenant (1) ──── embeds ──── assistant_personality / assistant_skip_confirm                            [UNGATED write, separate API]
Tenant (1) ──── embeds ──── stripe_connect_account_id, meta page-link fields                          [UNGATED write on initiation]
Tenant (1) ──1:1──  digest_settings (dedicated collection, tenant_id key)                              [UNGATED write]
Tenant (1) ──1:N──  email_templates (dedicated collection, tenant_id + template_id key)                [UNGATED write]
Tenant (1) ──1:N──  digest_logs (dedicated collection, read-only history)
```

### Source of Truth
| Data Item | Current Source of Truth | Problems | Recommended Rebuild Source |
|---|---|---|---|
| "Who is allowed to change tenant-wide settings" | **Answered differently by every single endpoint** — sometimes `role == owner` (correct, per the app's own stated intent), sometimes nothing at all | The single biggest finding of this document | One shared dependency (e.g., `Depends(require_settings_write_access)`) imported and used identically by every settings-mutation endpoint in the app, with no exceptions unless explicitly and deliberately decided otherwise |
| "What email settings does this tenant have" | Split three ways (`Tenant.branding_settings`, `digest_settings`, `email_templates`) with no cross-linking | Confusing for both developers extending the feature and, implicitly, for users who might expect one "Email" settings page | Either keep three separate concerns but group them under one navigable "Email" section, or consolidate storage — a product/architecture decision, not just a bug fix |
| "Which tenant-scoped collections exist, for backup/export/delete purposes" | Two independent hand-maintained lists (`backup.py`'s `BACKUP_COLLECTIONS`, `platform_admin.py`'s delete-tenant list), confirmed to have drifted, including at least one stale/wrong collection name (`"webstores"` vs. the real `webstores_v2`) | Real data-integrity risk (tenant delete doesn't fully delete) | One single shared registry constant, imported by both backup and delete-tenant logic, so they can never diverge again |

### Duplicate or Conflicting Data
- `BACKUP_COLLECTIONS` (39 entries, `backup.py`) vs. the tenant-delete collection list (24 entries, `platform_admin.py`) — confirmed drifted, with at least one confirmed-stale collection name (`webstores` vs. `webstores_v2`) meaning tenant-delete silently fails to remove real webstore data today.
- `Tenant.assistant_personality`/`assistant_skip_confirm` vs. every other `Tenant`-embedded setting — same document, different API namespace, different (absent) permission gate.

---

## 6. Business Rules and Logic

### Core Business Rules
| Rule | Current Behavior | Correct Rebuild Behavior | Priority |
|---|---|---|---|
| Only the Owner (or equivalent elevated role) may change tenant-wide settings | **True for Company/Branding/Payroll/etc. and for Backup. Confirmed false, live, for Daily Digest, Email Templates, Meta Integration, AI Assistant Personality, and Stripe Connect initiation.** | Enforce identically everywhere | **P0** |
| Recipients of automated business-data emails (Daily Digest) should be validated and restricted | Not enforced — any string, any role | Validate as real email addresses; restrict who can add them | P0 |
| Every tenant-scoped collection should be included in both backup and permanent-delete flows | **False today** — the two lists have drifted; at least one real collection (`webstores_v2`) is in backup but not in delete | Single shared source of truth for "what collections exist for this tenant" | P1 |
| Settings changes with security/financial implications should be audited | **Not enforced anywhere in this module** — zero audit-log entries found for any settings change reviewed (Company, Branding, Digest, Email Templates, Meta, Assistant, Stripe Connect initiation) | Add audit logging, at minimum for Digest recipients, Email Template content, Meta connect/disconnect, and Stripe Connect account changes | P1 |

### Statuses and State Changes
Not applicable in a formal sense — no status field is central to this module; the closest analogs are `digest_settings.enabled` (on/off) and the Meta/Stripe Connect "connected" vs. "not connected" states (owned conceptually by the Integrations sub-area but the actual connection *lifecycle* state machine is owned by the respective third-party integration's own module, not re-derived here).

### Automatic Actions
- `backup.py` automatically stamps `tenants.last_backup_at` on every export (used by `GET /backup/status`'s "needs reminder" logic — a nice, simple 7-day nudge mechanism, confirmed correctly implemented).
- None of the other settings subsystems have any automatic/background behavior of their own (Digest's actual *sending* schedule is owned by whatever scheduler triggers `POST /digest/send` — **Needs Verification**, no cron/scheduler definition was found in the files reviewed this session, meaning the "schedule_time" field's actual enforcement mechanism is unconfirmed).

### Calculations and Formulas
None specific to this module (Backup's checksum computation is integrity-verification, not a business calculation).

### Validation Rules
- `digest_settings.recipients`: **Needs Verification/Known Gap** — typed as `List[str]`, not `List[EmailStr]`; no server-side check that entries are well-formed email addresses.
- `ai/assistant/personality`'s `personality` field: validated against a real whitelist (good); `skip_confirm` entries: filtered against a whitelist rather than rejected on invalid input (a softer, but still safe, validation style).
- Email Templates: **Needs Verification** whether template body content is sanitized/validated in any way before being used to render real outbound emails (e.g., protection against accidentally-broken template syntax) — not deeply audited this session.

---

## 7. Permissions and Roles

### Roles That Interact With This Module
| Role | Company/Branding/etc. | Backup | Digest | Email Templates | Meta Integration | AI Assistant Settings | Stripe Connect Initiation |
|---|---|---|---|---|---|---|---|
| Owner | ✅ (only role) | ✅ (only role) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin | ❌ (correctly blocked server-side) | ❌ (correctly blocked) | **✅ (confirmed unintended)** | **✅ (unintended)** | **✅ (unintended)** | **✅ (unintended)** | **✅ (unintended)** |
| Staff | ❌ (correctly blocked) | ❌ (correctly blocked) | **✅ (confirmed live, unintended)** | **✅ (unintended)** | **✅ (unintended)** | **✅ (unintended)** | **✅ (unintended)** |
| Platform Admin/Creator | ✅ (via safe bypass, per Access Control doc) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

*(The "unintended" marks reflect that every other comparable tenant-wide-configuration action in this app is Owner-restricted, and nothing in the product's own documented intent suggests Digest/Email-Templates/Meta/Assistant/Stripe-Connect-initiation were deliberately designed to be open to Staff — this is characterized as a gap, not a confirmed deliberate decision, and is flagged as a Required Decision in §16 for completeness even though the evidence strongly points to "bug.")*

### Customer / Portal Permissions
Not applicable — Customers, Employees, and Webstore Owners have no access to any settings screen in this module.

### Sensitive Information
- Daily Digest content (overdue invoice amounts + customer names, employee shift schedules) is genuinely sensitive business data, and the recipient list controlling where it goes is — per this session's live test — writable by the least-privileged staff role in the system.
- Stripe Connect account IDs and Meta Page tokens are stored on `Tenant`/`webstores_v2` — **Needs Verification** whether Meta's page access token is stored in plaintext or encrypted at rest (not inspected this session); flagged for the next builder to confirm given the broader pattern of loose settings-endpoint permissioning found here.

### Permission Problems in Current App
Fully detailed in §2, §4, §6. In one sentence: **this module has the exact same class of problem as the Access Control module doc's headline finding (inconsistent enforcement across near-identical endpoints), but manifesting as a live-exploitable, zero-effort, no-audit-trail path to redirecting real business-sensitive email — the most concrete, reproducible security finding across all three module docs produced this session.**

---

## 8. Integrations and External Services

### External Services Used
| Service | Purpose | Tenant-Facing Configuration UI | Where Used | Current Status |
|---|---|---|---|---|
| Meta/Facebook (OAuth + Graph API) | Lead capture from a connected Facebook Page | `MetaIntegration.js` (`/settings/meta-integration`) | `routes/meta_integration.py` | Active, but write endpoints ungated (§2) |
| Stripe Connect | Payment processing for invoices/webstores, per-tenant connected accounts | `Admin/PaymentSettings.js` (`/admin/payments`) | `routes/stripe_connect.py` | Active for the flows reviewed; account-creation endpoint ungated (§2) |
| SendGrid | Outbound platform email (reactivation notices, broadcast, digest, templates) | **None** — platform-level env var only | `services/email_service.py` | Active, but tenant has zero self-service control (can't use their own sending domain/account) |
| Twilio | SMS | **None** — explicitly paused per product decision, out of scope | N/A | Paused |

### API Endpoints
Already itemized with their exact permission posture in §3's screen table and §4's workflows; not repeated verbatim here to avoid duplication. Summary: **2 of 7 reviewed settings-mutation endpoint families are correctly Owner-gated (Company Settings, Backup); 5 of 7 have no gate at all (Digest, Email Templates, Meta Integration, AI Assistant Personality, Stripe Connect initiation).**

### Webhooks
- Meta/Facebook webhook receiver (`GET/POST /meta-integration/webhook`) and Stripe webhook receiver (`POST /stripe-connect/webhook`) both exist — **Needs Verification** of their signature-verification robustness; not deeply audited this session as webhook security is more naturally scoped to each respective Integration's own future module doc (Meta/Facebook, Payments) rather than this cross-cutting Settings doc.

### Email / SMS / Notification Templates
| Template Name | Trigger | Recipient | Purpose | Editable By (today) |
|---|---|---|---|---|
| Daily Digest | Scheduled (mechanism unconfirmed) or manual send | `digest_settings.recipients` | Operational/financial summary | **Any authenticated tenant user** |
| Transactional templates (invoice-ready, quote-ready, etc.) | Various order/invoice lifecycle events | Customers | Customer-facing notifications | **Any authenticated tenant user** |

---

## 9. Documents, Files, Images, and Attachments
- Backup export files are downloadable JSON (not stored server-side beyond the request/response cycle — confirmed the endpoint returns the JSON directly rather than writing a file to disk, meaning there's no server-side backup-file retention/history beyond the `last_backup_at` timestamp and whatever the user's own browser/computer does with the downloaded file).
- No other file/document handling is owned by this module (Tenant logo is Tenants-module territory, already documented there).

---

## 10. AI Features
The AI Assistant's tenant-wide behavior configuration (personality, skip-confirm whitelist) is owned by this module's "Assistant settings" area. The adjacent AI Assistant Action Audit Log (`/settings/ai-audit`, unlinked from navigation per §2) shows a history of actions the AI Assistant has taken on the tenant's behalf — this is an **action-transparency log, not a token-usage/cost-tracking feature**; the previously-identified backlog item ("Build AI token usage and cost logging layer") remains unimplemented and is a distinct, still-open gap, not something this Audit Log screen already covers.

---

## 11. Activity Logs, Audit Trail, and Reporting

### Activity Events Created by This Module
**None**, for any settings change reviewed — not for Company/Branding saves (already flagged as a gap in the Tenants doc), not for Digest, Email Templates, Meta Integration, AI Assistant Settings, or Stripe Connect initiation. Backup's own actions (export/restore) similarly create no dedicated audit-log entry beyond the `last_backup_at` timestamp (export) and the returned `restored_counts` (restore, visible only in that one API response, not persisted anywhere for later review).

### Audit Trail Requirements
For a production rebuild: every settings-mutation endpoint in this module should log at minimum {actor, tenant, what changed, before/after for sensitive fields like Digest recipients} — reusing the `log_admin_action` pattern already proven correct in the Tenants module's Platform-Admin actions, extended to tenant-level (not just platform-level) actors.

### Reports and Dashboard Metrics
None produced by this module.

---

## 12. Errors, Edge Cases, and Failure Handling

### Known Bugs
| Bug | Where It Happens | Severity | Temporary Workaround | Rebuild Fix |
|---|---|---|---|---|
| **Confirmed live**: any authenticated tenant user can change Daily Digest settings, including adding an arbitrary external recipient of real business/financial data | `routes/digest.py` `update_digest_settings` | **Critical** | Owner should periodically manually check `/settings/digest` for unrecognized recipients until fixed; no way to detect unauthorized changes proactively today (no audit log) | Add a permission gate matching `PUT /api/tenant`'s |
| Same zero-gate pattern confirmed by code review on Email Templates, Meta Integration, AI Assistant Personality, and Stripe Connect account-creation | `routes/email_templates.py`, `routes/meta_integration.py`, `routes/ai.py`, `routes/stripe_connect.py` | High (varying real-world impact per endpoint, all sharing the same root cause) | Same as above — manual vigilance only | Same fix pattern, applied consistently |
| `platform_admin.py`'s tenant-delete collection list references a stale collection name (`"webstores"`) that no longer matches the real, actively-used collection (`webstores_v2`), meaning tenant deletion silently fails to remove webstore/product data | `routes/platform_admin.py` `delete_tenant`, discovered via cross-reference with `backup.py`'s more current `BACKUP_COLLECTIONS` list | High (data-integrity/compliance risk on an already-irreversible action) | None — a "deleted" tenant's webstore data persists in the database indefinitely | Replace both hardcoded lists with one shared, actively-maintained registry |
| AI Assistant Action Audit Log page is fully built but unreachable from any navigation menu | `PrimaryNav.js`/`MobileNav.js` (absence, not a code defect) | Low (discoverability, not a functional bug) | Navigate directly to `/settings/ai-audit` | Add a nav entry, likely nested under or next to AI Assistant Settings |

### Edge Cases
- **Two browsers/tabs saving Digest settings simultaneously**: last-write-wins, full-document upsert — same class of risk as the Tenants doc's "settings merge" finding, but here the underlying document isn't even the `Tenant` document, it's a dedicated single-purpose collection, so the blast radius is narrower (only Digest settings, not the whole Tenant) but the mechanism (no partial/dot-notation update, no optimistic-locking/versioning) is identical.
- **A restore file containing a collection name not in `BACKUP_COLLECTIONS`** (e.g., a very old backup taken before a schema change, or a maliciously crafted file): the restore endpoint's `if resolved_collection not in BACKUP_COLLECTIONS: continue` correctly and safely skips it rather than writing to an arbitrary/unexpected collection — confirmed a well-guarded edge case, not a vulnerability.

### Error Messages
Backup's error messages are specific and reassuring where it matters most ("Restore failed and was rolled back. Your existing data was not changed.") — genuinely good UX for a high-anxiety action. The other settings subsystems' error messages (invalid personality key, template not found) are adequate and unremarkable. The core problem in this module is not unclear errors — it's the *absence* of an error (a 200 OK) where a 403 should exist.

### Recovery Rules
- Backup/Restore is itself the recovery mechanism for the rest of the app's data — but note the settings subsystems documented as ungated in this doc are **not included** in any backup/restore collection list at all (`digest_settings`, `email_templates` are absent from `BACKUP_COLLECTIONS`) — meaning even a full tenant backup/restore cycle would **not** preserve or roll back an unauthorized Digest-recipient or Email-Template change; restoring a backup taken before the incident would not undo it, since these two collections aren't part of the backup in the first place.

---

## 13. Important Files and Code Map

### Frontend Files
| File Path | Purpose | Keep / Replace / Remove |
|---|---|---|
| `frontend/src/pages/CompanySettings.js` | Company/Branding/Payroll/etc. (documented in depth in Tenants doc) | Keep |
| `frontend/src/pages/settings/DigestSettings.js` | Daily Digest UI | Keep UI; the fix is entirely backend-side |
| `frontend/src/pages/EmailTemplates.js` | Email Templates UI | Same |
| `frontend/src/pages/settings/AssistantSettings.js` | AI Assistant personality/skip-confirm UI | Same |
| `frontend/src/pages/settings/AIAuditLog.js` | AI action transparency log | Add a nav link; otherwise keep |
| `frontend/src/pages/settings/BackupRestore.js` | Backup/Restore UI | Keep as the reference-quality example |
| `frontend/src/pages/MetaIntegration.js` | Meta/Facebook connection UI | Keep UI; backend needs the permission fix |
| `frontend/src/pages/Admin/PaymentSettings.js` | Stripe Connect UI | Keep UI; backend's initiation endpoint needs the permission fix |
| `frontend/src/components/ribbon/PrimaryNav.js` | `tabSubItems.settings` — the flat 10-item sub-nav | Restructure into grouped sections per §16; add the missing AI Audit Log entry |

### Backend Files
| File Path | Purpose | Keep / Replace / Remove |
|---|---|---|
| `backend/routes/backup.py` | Export/Restore (reference-quality implementation) | Keep entirely as-is; use as the template for fixing everything else |
| `backend/routes/digest.py` | Daily Digest settings + send + history | **P0 fix**: add permission gate to `update_digest_settings` |
| `backend/routes/email_templates.py` | Email template CRUD | **P0 fix**: add permission gate to `update_email_template` (and `/reset`) |
| `backend/routes/meta_integration.py` | Meta OAuth/page management | **P0 fix**: add permission gate to every write endpoint |
| `backend/routes/ai.py` (assistant personality section) | AI Assistant tenant-wide behavior config | **P0 fix**: add permission gate to `update_assistant_personality` |
| `backend/routes/stripe_connect.py` | Stripe Connect account lifecycle | **P0 fix**: add permission gate to `create_connect_account` (and re-verify `disconnect`/`refresh-link` while auditing this fix) |
| `backend/routes/platform_admin.py` | (`delete_tenant`'s stale collection list) | Fix per the Tenants doc's existing recommendation, now with concrete evidence (`webstores` vs. `webstores_v2`) |

### Shared Files / Utilities
None currently shared across these settings subsystems — this absence is itself the §16 rebuild requirement (a single shared "settings write permission" dependency does not exist and should).

### Tests
**Needs Verification** — no settings-specific permission test file was found by name. Given this session's live-reproduced vulnerability, this is the single highest-priority regression test for the next builder to write: for each of Digest/Email-Templates/Meta/Assistant-Personality/Stripe-Connect-initiation, assert a `staff`-role token receives `403`, not `200`.

---

## 14. Design and Layout Requirements

### Current Visual Problems
- No visual grouping of the 10 flat Settings sub-nav items into any logical category — a new user has no way to guess, from the nav alone, which of these 10 items are "identity," which are "integrations," which are "email," etc.

### Must-Keep Visual Elements
- Backup & Restore's Preview-before-committing pattern (showing record counts before an irreversible action) is a strong UX pattern worth extending to any other high-stakes settings action introduced in the rebuild.

### Rebuild Design Requirements
- Group the flat Settings sub-nav into labeled sections (Identity & Branding / Integrations / Email / Backup / AI Assistant), addressing both the discoverability problem and giving "Integrations" the unified home it currently lacks.
- Surface a visible "last changed by / last changed at" indicator on at least the highest-risk settings (Digest recipients, Email Template content) once audit logging is added, so an Owner can spot an unauthorized change without needing to dig through a separate audit-log page.

---

## 15. Module Dependencies

### Modules This Module Depends On
| Dependency Module | Why It Is Needed | Rebuild Risk |
|---|---|---|
| Tenants | Most settings live on the `Tenant` document | High — this doc's fixes must not conflict with the Tenants doc's separate recommendation to formalize the `Tenant` schema and fix its own settings-save mechanics |
| Access Control | The permission gates this doc recommends adding depend on the Access Control module's `Permission`/`ROLE_PERMISSIONS` system being correct first (per that doc's own P0 fix) | High — fixing this module's gates using the currently-broken `user_has_permission()` path would just reproduce the Access Control doc's `platform_creator` bug in five more places; use the safe `has_permission()` path, or wait for that consolidation |
| Communications (SendGrid) | Digest and Email Templates ultimately send real email | Low |
| Meta/Facebook, Stripe | Integrations-area functionality | Owned by those respective external systems |

### Modules That Depend on This Module
| Dependent Module | What It Needs | Rebuild Risk |
|---|---|---|
| AI Assistant | Reads `tenant.assistant_personality`/`assistant_skip_confirm` to decide its own behavior | Medium — if this module's permission fix changes who can set these, the AI Assistant module itself is unaffected (it just reads the resulting value) |
| Everything that sends a templated email | Reads `email_templates` overrides | Medium |
| Lead capture (Facebook Leads page) | Reads the Meta integration's connected-page state | Medium |

### Events This Module Sends / Receives
None (no event bus, consistent with every other module documented this session).

---

## 16. Migration and Rebuild Strategy

### Existing Data That Must Be Preserved
- Every existing `digest_settings`, `email_templates`, `Tenant.assistant_personality`/`assistant_skip_confirm`, Meta-integration, and Stripe Connect field value currently in the database — the rebuild fixes *who can write*, not what's already been legitimately written.

### Existing Data That Can Be Archived
Not applicable.

### Existing Data That Should Not Be Migrated
Not applicable — no dead/placeholder data specific to this module was found (contrast with the Tenants doc's `founders_spots_remaining`/dead `slug`).

### Recommended Rebuild Order
**Phase 1: Foundation (Security-critical, do first, independent of everything else):** Add the missing permission gate to `PUT /api/digest/settings`, `PUT /email-templates/{id}` (+`/reset`), every Meta Integration write endpoint, `PUT /ai/assistant/personality`, and `POST /stripe-connect/create-account`. This is a small, isolated, low-risk, high-value fix that does not require waiting for any other module's rebuild.

**Phase 2: Foundation (Data integrity):** Reconcile `BACKUP_COLLECTIONS` and the tenant-delete collection list into one shared registry; fix the confirmed `webstores`/`webstores_v2` stale-name bug as part of this.

**Phase 3: Core Workflow:** Introduce one shared settings-write-permission dependency, used identically everywhere in this module (and ideally exported for reuse by any future settings surface).

**Phase 4: Advanced Features:** Restructure the Settings navigation into grouped sections; add the missing AI Audit Log nav link; consider a genuine "Integrations" hub page.

**Phase 5: Reports, AI, and Polish:** Add audit logging for settings changes across this whole module; add `EmailStr` validation to Digest recipients; decide whether tenant-facing SendGrid/domain configuration is worth building.

### Rebuild Risks
- The Phase 1 fix is additive-restrictive (it can only *reduce* who can do something that currently works for everyone) — the only real risk is if some *legitimate, currently-relied-upon* workflow has a non-Owner role saving Digest/Email-Template/Meta/Assistant settings as part of normal operations today; **Required Decision #1 below** exists specifically to confirm this isn't the case before shipping the fix.
- The `BACKUP_COLLECTIONS`/delete-list reconciliation (Phase 2) should be tested against an actual tenant with real webstore data to confirm the fix genuinely removes `webstores_v2`/`webstore_products` records on delete, not just reviewed in code.

### Required Decisions Before Building
1. **Confirm with the product owner**: was it ever intentional that non-Owner roles could change Daily Digest recipients, Email Template wording, Meta Integration connection, AI Assistant personality, or initiate Stripe Connect? (Every signal in the codebase — the app's own comments, the analogous `PUT /api/tenant`'s Owner-only gate, `backup.py`'s explicit Owner-only design — strongly suggests no, but this should be confirmed rather than assumed before shipping a change that removes existing (if accidental) capability from Admin/Staff accounts.)
2. Should "Integrations" become a real, unified hub page, or remain two independently-discovered screens (Meta under Settings, Stripe Connect under Billing)?
3. Should tenants eventually get their own SendGrid sub-account/verified domain, or remain permanently on the shared platform sender identity?
4. Should Digest/Email-Templates storage move onto the `Tenant` document (consistency with most other settings) or should Company/Branding/etc. move *off* the `Tenant` document into dedicated collections (consistency the other direction)? Either resolves the "email settings split three ways" finding; the choice is architectural preference, not correctness.

## 17. Testing Requirements

### Critical Tests
| Test Scenario | Expected Result | Priority |
|---|---|---|
| `staff`-role user calls `PUT /api/digest/settings` | **Today: 200 (confirmed live).** Post-fix: 403 | Critical (post-fix) |
| `staff`-role user calls `PUT /email-templates/{id}` | **Today: 200 (confirmed by code).** Post-fix: 403 | Critical (post-fix) |
| `staff`-role user calls any Meta Integration write endpoint | **Today: no gate found (confirmed by code).** Post-fix: 403 | Critical (post-fix) |
| `staff`-role user calls `PUT /ai/assistant/personality` | **Today: no gate found (confirmed by code).** Post-fix: 403 | Critical (post-fix) |
| `staff`-role user calls `POST /stripe-connect/create-account` | **Today: no gate found (confirmed by code).** Post-fix: 403 | Critical (post-fix) |
| Owner exports a backup, then restores it into the same tenant | Record counts match; no data loss; `last_backup_at` updates | Critical |
| A mid-restore failure (e.g., a malformed record injected mid-file) | Full rollback; original data intact; clear error message | Critical |
| Platform Admin deletes a tenant with real webstore data | **Today: `webstores_v2`/`webstore_products` survive (confirmed by code).** Post-fix: fully removed | High (post-fix) |
| Navigate to `/settings/ai-audit` directly by URL | Page loads and shows real AI action history | Medium (documents current unlinked-but-functional state) |

### Manual Test Checklist
- [x] Confirm permissions work → **Fails today** for 5 of 7 settings-mutation surfaces reviewed; passes for Company Settings and Backup
- [x] Confirm activity log is created → **Fails for every surface in this module**, no exceptions found
- [ ] Confirm mobile layout works → **Needs Verification**, not inspected this session
- [x] Confirm error states are understandable → True where errors occur; the core issue is a missing error (200 instead of 403), not an unclear one
- [x] Confirm related module data updates correctly → Backup/Restore's cross-collection consistency confirmed correct in code
- [x] Confirm no duplicate records are created → **Needs Verification** for `digest_settings` (no confirmed unique index on `tenant_id`)
- [x] Confirm deleted/archived records behave correctly → **Fails**: confirmed stale collection name means tenant-delete leaves webstore data behind

### Definition of Done
This module is complete only when: (1) every settings-mutation endpoint uses one single, shared, correctly-implemented permission check (not the currently-broken `user_has_permission` pattern, per the Access Control doc), (2) `BACKUP_COLLECTIONS` and the tenant-delete list are unified into one source of truth with no stale collection names, (3) every settings change with real business/financial/security implications is audit-logged, and (4) the Settings navigation groups its 10+ pages into a comprehensible structure with no orphaned/unlinked screens.

---

## 18. Final Rebuild Recommendation

### Keep
- `backup.py`'s export/restore mechanism in its entirety — snapshot-rollback atomicity, checksums, sensible field exclusions, Owner-only gating — the single best-engineered piece of code reviewed across this and the prior two module docs.
- The per-section independent-save UX pattern on Company Settings.
- The whitelist-based validation style on AI Assistant personality/skip-confirm (good defensive coding, just missing the permission layer around it).

### Rebuild From Scratch
- The permission-enforcement layer across Digest, Email Templates, Meta Integration, AI Assistant Settings, and Stripe Connect initiation — currently absent, not just buggy.
- The `BACKUP_COLLECTIONS`/tenant-delete collection-list duality — replace both with one shared registry.
- The Settings navigation structure — flatten-to-grouped, add the missing AI Audit Log link.

### Merge With Another Module
- Consider whether "Integrations" (Meta + Stripe Connect + any future third-party connection) deserves to be pulled out as its own first-class module/nav-area rather than being split across Settings and Billing as it is today.

### Remove
- Nothing wholesale — every screen in this module serves a real, used purpose; the fixes needed are additive (permission gates, audit logs, navigation links) rather than subtractive.

### Postpone
- Tenant-facing SendGrid/custom-domain configuration — a real potential feature, not blocking.
- Full consolidation of "email settings" storage into one home — an architectural nicety once the security gaps are closed, not urgent on its own.

### Recommended Priority
- [x] Critical

### One-Paragraph Builder Handoff
This app has no "Settings and Configuration Framework" in the sense of a shared, designed system — it has ten-plus independently-built settings screens that happen to be grouped under one nav tab, each with its own storage location and, critically, its own (frequently absent) decision about who is allowed to change it. The single most important finding, reproduced live in this session using the least-privileged `staff` test account, is that `PUT /api/digest/settings` — and, confirmed by direct code reading using the identical pattern, four sibling endpoints (Email Templates, Meta Integration, AI Assistant Personality, Stripe Connect account creation) — have **no permission check whatsoever**, in an app where the conceptually-identical action (editing the Tenant's own Company/Branding settings, or exporting/restoring a full data backup) is correctly, deliberately restricted to the Owner role only. A `staff` account with zero financial or settings permissions successfully redirected the tenant's daily operational/financial summary email to an arbitrary external address with a single unauthenticated-by-role API call, and there is currently no audit trail that would ever surface this to the shop owner. The fix for the headline bug is small and mechanical (add the same permission check five more times, using the *correct* `has_permission()` function per the Access Control module doc, not the broken `user_has_permission()` sibling) — the more valuable, structural rebuild work is deciding on and building one actual shared settings-permission framework so that the next new settings screen doesn't have a one-in-three chance of being built wide open by accident, the way this session's investigation found five of them already are.

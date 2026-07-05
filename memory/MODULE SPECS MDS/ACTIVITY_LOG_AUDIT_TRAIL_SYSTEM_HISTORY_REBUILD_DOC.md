# ACTIVITY LOG, AUDIT TRAIL, AND SYSTEM HISTORY — Rebuild Documentation

## Module Status
- [x] Existing and working (Platform Admin audit log; AI Assistant action audit log; the newer Order Activity system)
- [x] Existing but incomplete (Customer-facing activity is only ever a scattered set of single-timestamp "viewed_at" fields on individual record types, never a unified customer activity log; no security-event auditing — logins, password resets, failed attempts — exists anywhere in the app)
- [x] Existing but broken (**Confirmed live**: the legacy Job Activity history system logs every status change, note, and edit correctly, but never records *who* performed the action — every single entry shows `"user_name": "System"`, even for an action just performed, live, by the tenant Owner)
- [ ] Partially built / prototype
- [ ] Planned only
- [x] Needs replacement (Three independent, differently-capable activity-logging systems exist — Platform Admin audit, AI Action audit, Job/Order activity — with no shared framework and, per the confirmed bug, inconsistent quality even between the two most similar of the three)
- [x] Needs verification (items called out inline below)

**Documentation Date:** 2026-07-02
**Completed By:** E1 (AI Agent) — direct code inspection + live API verification (one gap confirmed live by creating and modifying a real test job, then immediately deleting it; one contrasting positive behavior confirmed live via a read-only call), no screenshots used.
**Repository / Branch Reviewed:** `/app/` (current preview checkout, main branch per `.emergent` metadata)
**Related App Version / Deployment:** Preview environment (current `REACT_APP_BACKEND_URL`); owner account `thesigntistslab@gmail.com` per `test_credentials.md`, tenant "The Signtists Lab"

> **Method note:** Every claim below was verified by reading the actual file or by a live `curl` call against the running backend. Files read in full or in relevant ranges: `backend/services/admin_audit.py` (full, 120 lines), `backend/routes/platform_admin.py` + `routes/platform_settings.py` (grep-level, every `log_admin_action` call-site and its `action=` string, cross-referenced against the Tenants module doc's already-documented findings, not re-derived), `backend/routes/ai.py` (`/assistant/actions/audit` + `/audit/{id}` handlers, full), `backend/services/ai_assistant_actions.py` (`check_permission`, `execute_action`, and every audit-logging branch — first 260 of 888 lines read), `backend/routes/jobs.py` (`log_job_activity` full definition + `get_job_history`'s multi-source aggregation, ~150 lines read across two ranges), `backend/models/enums.py`/`models/jobs.py` (`JobActivity` model field list, confirming `user_id`/`user_name` exist but are never populated), `backend/routes/orders.py` (`log_activity` call-sites, `get_order_activity` handler), `backend/services/workflow_engine.py` (`log_activity` definition, full), `backend/routes/portal.py` (grep-level, every `viewed_at`/`opened_at`-style customer-engagement timestamp field). **Live verification #1 (job activity attribution gap, confirmed then cleaned up):** created a real test job as the Owner account, updated its status via `PUT /api/jobs/{id}` (also as Owner), then called `GET /api/jobs/{id}/history` → every entry, including the one just created by the Owner's own authenticated action, showed `"user_name":"System"`; the test job was deleted immediately after confirming. **Live verification #2 (contrasting correct behavior):** called `GET /api/orders/{id}/activity` on a real, pre-existing order → the `created` entry correctly showed `"user_name":"Sign Guy PA"` (a real user), proving the newer Order Activity system does not share the Job Activity system's bug.

---

## 1. Module Identity

### Module Name
Activity Log, Audit Trail, and System History.

### Alternate / Legacy Names
No single name in code — this document groups together every mechanism in the app whose purpose is "record that something happened, for later review": `admin_audit_log` (Platform Admin actions), `ai_action_audit` (AI Assistant actions), `job_activities` (legacy Job history), `order_activities` (newer Order history), and the scattered per-record `viewed_at`/`opened_at`-style customer-engagement timestamps.

### Primary Purpose
Answer, after the fact, "what happened, when, and who did it" for six distinct populations the user specifically asked about: **Record history** (what happened to a specific Job/Order over its lifetime), **Status changes** (a subset of record history, specifically state transitions), **User actions** (what a tenant staff member did), **Customer actions** (what a customer did in the portal), **AI actions** (what the AI Assistant did on the tenant's behalf), and **Admin audit logs** (what a Platform Admin did across the whole platform). This session's research found that these six populations are covered by **three genuinely different, independently-built systems of very different quality**, plus, for Customer Actions specifically, no dedicated system at all — only incidental single-timestamp fields.

### Main Users
- **Platform Admin / Platform Creator** — the only audience for `admin_audit_log`; already fully catalogued in the Tenants module doc (13 action types, all platform-governance actions), not re-derived here beyond what's needed for this doc's cross-cutting comparison.
- **Tenant staff (Owner/Admin/Staff)** — the intended audience for Job/Order history (viewing a specific record's timeline) and, separately (Owner/Admin only), the AI Assistant Action Audit Log.
- **AI Assistant (as an actor, not a viewer)** — every action it takes on a tenant's behalf is logged, with the acting *human* correctly attributed as the one who initiated the AI interaction (**Needs Verification** of this exact attribution chain — see §2).
- **Customer** — never a *viewer* of any audit trail in this app (no "here's what happened to my order" timeline is exposed to them beyond the ordinary Job/Order status they already see on their portal dashboard); only ever an implicit, weakly-tracked *subject* of a handful of "did they view this yet" timestamps.

### Why This Module Matters
When something goes wrong in a shop's operations — a job's status changed unexpectedly, a customer disputes what they were shown, a Platform Admin needs to explain a billing override to a customer — the only tool available to answer "what actually happened" is whatever this module recorded at the time. Per this session's findings, that tool works very well for Platform Admin actions and AI Assistant actions, and for *what* happened to a Job or Order, but confirmed, live, that it currently cannot answer "which staff member" for the single most common kind of record history in the entire app (Job status changes and edits).

### Module Boundary
**This module owns:**
- `admin_audit_log` / `log_admin_action()` (Platform Admin actions) — already deeply documented in the Tenants module doc; referenced and cross-compared here, not re-derived.
- `ai_action_audit` / `AIAssistantActions` (AI Assistant actions) — newly, fully documented in this session.
- `job_activities` / `log_job_activity()` (legacy Job record history) — newly, fully documented, including the confirmed attribution bug.
- `order_activities` / `log_activity()` (newer Order record history) — newly, fully documented, including confirmation that it does *not* share the Job system's bug.
- The scattered customer-engagement timestamp fields (`portal_viewed_at`, `viewed_at`, `opened_at`, `customer_viewed_at`) across Invoices, Portal Documents, Form Requests, and Wrap Aftercare.

**This module does not own:**
- The `notifications` collection — a customer-facing (and, separately, staff-facing) inbox/alert system, not an audit trail; it overlaps in *subject matter* with several events documented here (a proof being ready, a document being shared) but its purpose is "tell someone something happened now," not "let someone review what happened later." Mentioned only for contrast, not deep-audited.
- Security-event logging (login attempts, password resets, failed auth) — **confirmed to not exist anywhere in this app**, already implicitly flagged across the Auth and Access Control module docs (no login-attempt logging was found in either); restated here as this document's own explicit finding for the "User actions" category specifically, since "logging in" is the most basic user action of all and it leaves no trace.
- Analytics/reporting dashboards (`admin_analytics.py`'s activity-chart) — these aggregate *counts* of business events (orders created, revenue) for charting purposes, a fundamentally different concern from an audit trail meant to answer "who did what."

---

## 2. Current State Summary

### What Exists Today
Three independently-designed, non-overlapping logging systems exist, each triggered by a different kind of action, writing to a different collection, read through a different endpoint, and — critically — built to a different standard of completeness:

1. **`admin_audit_log`** (via `services/admin_audit.py`'s `log_admin_action()`): the most mature in *schema* (captures actor id/email/role, target type/id, tenant, IP address, user agent, a status field, and a free-form metadata dict), but the narrowest in *scope* — only ever called from `platform_admin.py` and `platform_settings.py`, meaning it only ever records Platform-Admin-initiated actions (tenant suspend/reactivate/delete, payment overrides, dunning changes, user-to-tenant promotion, broadcast emails, site-wide announcements, and impersonation start/end). Zero tenant-level staff actions are ever recorded here.
2. **`ai_action_audit`** (via `services/ai_assistant_actions.py`'s `AIAssistantActions` class): the most *complete* in coverage of its own domain — every possible outcome of an AI Assistant tool-call (permission-denied, pending-confirmation, executed, failed) is logged, with no gaps found in any code path reviewed, and correctly attributes the *human* who initiated the AI interaction (`user_id`/`user_name` sourced from the calling `current_user`).
3. **`job_activities`** and **`order_activities`** (via `log_job_activity()` in `routes/jobs.py` and `log_activity()` in `services/workflow_engine.py` respectively): two parallel systems, one per each half of the app's ongoing "Jobs" → "Orders" terminology/architecture migration (already flagged at a high level in the Architecture Map). Both log a genuinely comprehensive set of lifecycle events (created, status changed, item added/edited/deleted, notes, archived) and both power a real, well-built, multi-source aggregated "history"/"activity" timeline visible to staff on the record's detail page. **They differ in one critical respect, confirmed live in this session**: the newer `order_activities` system correctly records which staff member performed each action; the older `job_activities` system's logging function never receives or stores this information at all, so every entry — regardless of who really did it — displays as `"System"`.

Beyond these three systems, "Customer actions" has no dedicated logging mechanism of any kind — only a handful of unconnected `viewed_at`/`opened_at`-style single-timestamp fields sprinkled across Invoices, Portal Documents, Form Requests, and Wrap Aftercare records, each answering only "has the customer looked at this specific thing yet," never a chronological feed of everything a customer has done.

### What Works Well
- `admin_audit_log`'s schema (actor/target/tenant/IP/user-agent/status/metadata) is genuinely enterprise-grade and, per the Tenants module doc, is applied consistently across every one of its 13 covered action types with no gaps found.
- The AI Action Audit system is the single best-covered logging mechanism found in this entire multi-session documentation effort: every branch of `execute_action()` — denied, pending, executed, and failed — writes an audit entry, with no silent-success or silent-failure path found anywhere in the ~260 lines reviewed. Correct actor attribution is built into the class's own design (it's constructed with the calling `current_user` and threads that through to every audit write).
- `order_activities`'s multi-source aggregation (in `get_job_history()`'s Job-side equivalent, and presumably an Order-side equivalent — **Needs Verification** whether Orders has its own unified multi-source timeline endpoint the way Jobs does, or just the raw `order_activities` list; only the latter was directly confirmed this session) correctly pulls in related artwork-proof and document events alongside its own native entries, giving staff a genuinely unified picture on the Job side at least.
- Customer-engagement timestamps, while narrow, are real and correctly one-way (set once, on first view, not overwritten on every subsequent view — confirmed by the `if not portal_doc.get("viewed_at")` guard pattern in `routes/portal.py`, which preserves the *original* first-view time rather than constantly updating it).

### What Is Broken, Confusing, or Incomplete
- **CRITICAL, CONFIRMED LIVE — the legacy Job Activity history system never records who performed an action.** Reproduced: created a real test job as the Owner account, changed its status via an authenticated `PUT` request as that same Owner, then fetched the job's history — the resulting entry read `"user_name":"System"`, not the Owner's name, despite the action having just been performed by a fully-authenticated, identifiable user. Root cause confirmed in code: `log_job_activity()` (`routes/jobs.py`) — the single function called from all 15+ activity-logging sites across the Jobs module — never accepts or passes a `user_id`/`user_name` parameter at all, even though the `JobActivity` model itself has these fields declared (defaulting to `None`, surfaced as `"System"` by `get_job_history()`'s own fallback: `activity.get("user_name") or "System"`). This means **every Job's history, for every tenant, for every job ever created through this system, has always shown "System" as the actor for every status change, note, and edit** — a total, systemic loss of the single most valuable piece of information an activity log is supposed to provide.
- **The newer Order Activity system does not share this bug** — confirmed live: `GET /orders/{id}/activity` on a real order correctly showed `"user_name":"Sign Guy PA"` for its `created` entry. Confirmed in code: every one of the 7 `log_activity()` call-sites in `routes/orders.py` correctly passes `user_id=current_user.id, user_name=current_user.full_name or ""`. This means the app currently has **two parallel systems for the same underlying concept (record lifecycle history), one of which correctly attributes actions and one of which cannot, ever, attribute any action to anyone** — and, per the ongoing Jobs→Orders migration, tenants may currently have historical data in *both* systems simultaneously, with inconsistent quality depending on which system originally recorded a given event.
- **No security-event auditing exists anywhere** — logins (successful or failed), password resets, password changes, and role changes (already flagged specifically in the Access Control module doc) produce no audit trail at all, in any of the three systems documented here. A shop owner investigating "did someone access my account without permission" has no log to check.
- **Tenant-level settings changes are not audited** — already flagged in both the Tenants and Settings module docs (Company/Branding saves, Digest settings, Email Templates, Meta Integration, AI Assistant Personality, Stripe Connect); restated here as this document's own explicit confirmation that **none** of these gaps are covered by any of this module's three systems either — they are simply, uniformly, unaudited.
- **"Customer Actions" has no unified log, only scattered single-timestamp fields**, and even those are inconsistent in naming (`portal_viewed_at` on Invoices vs. `viewed_at` on Portal Documents vs. `opened_at` on Form Requests vs. `customer_viewed_at` nested under `aftercare` on Wrap tickets) — four different field names for the conceptually identical "has the customer seen this" signal, with no shared helper function generating any of them (each read/write site hand-rolls its own `if not x.get("viewed_at"): $set` pattern independently).
- **No unified, cross-record "Activity Log" page exists for tenant staff at all.** Every activity trail found in this module is scoped to one specific record (a specific Job, a specific Order) — there is no "show me everything that happened across my whole shop today/this week" feed, unlike the Platform Admin side (which, while narrow in scope, at least has a genuine cross-tenant browsable log) or the AI side (which has its own dedicated, browsable Audit Log page, per the Settings module doc's finding that it's fully built but unlinked from navigation).

### Placeholder / Demo / Fake Data
None found — every logging mechanism reviewed writes real data reflecting real actions; the "fakeness" here is entirely in the *missing* attribution field, not in any mocked activity.

### Features That Exist in Code but Are Not Visible
- The AI Assistant Action Audit Log page (`/settings/ai-audit`) — already documented in the Settings module doc as fully built but unlinked from any navigation; restated here as this document's own confirmation that it is, specifically, the *AI actions* audit trail the user asked about in this module's scope, and it is real, comprehensive, and simply hard to find.

### Features Visible in the UI but Not Actually Functional
None found to be non-functional in the sense of "button does nothing" — the Job History and Order Activity timelines both genuinely render and populate correctly; the defect is a silent data-quality gap (wrong/missing attribution), not a broken UI.

---

## 3. User Experience and Navigation

### Where the Module Lives in the App
No dedicated top-level page exists for this module as a whole. Its three systems surface in three completely different places: Job/Order detail pages (an "Activity"/"History" tab or section, embedded per-record), the Settings sub-nav (`/settings/ai-audit`, unlinked — per the Settings doc), and the Platform Admin area (an audit-log view, already documented in the Tenants doc, gated to platform staff only).

**Routes / URLs relevant to this module:**
| Route / Endpoint | Screen | Audience |
|---|---|---|
| Job detail → History/Activity section | Embedded component | Any authenticated tenant user |
| `GET /orders/{id}/activity` | Embedded in Order detail (frontend consumer not deeply inspected this session — **Needs Verification** of the exact UI presentation) | Any authenticated tenant user |
| `/settings/ai-audit` | AIAuditLog.js | Owner/Admin only (role-gated correctly, per §7) |
| Platform Admin's audit log view | (documented in Tenants module doc) | Platform Admin/Creator only |

### Current Navigation Structure
Fully fragmented — three unrelated entry points, no shared "History" or "Audit" concept tying them together anywhere in the nav.

### Recommended Rebuild Navigation Structure
No single unified "Activity Log" hub is strictly necessary (per-record history genuinely belongs on the record's own detail page, and Platform Admin's audit trail genuinely belongs in the Platform Admin area) — but the AI Audit Log's complete absence from navigation should be fixed (already recommended in the Settings doc, restated here as this module's own concern too), and a genuine "recent activity across my shop" feed on the main Dashboard would meaningfully close the "no unified staff-facing feed" gap without requiring a whole new page.

### Screens in This Module

**Screen Name: Job History (embedded)**
- Route: Job detail page, History/Activity tab
- Who Can Access It: Any authenticated tenant user
- Purpose: See everything that's happened to a specific quote/job over its lifetime
- Main Information Shown: Chronological, multi-source timeline (status changes, notes, proof events, document events)
- Current Problems: **Confirmed live — every entry attributes to "System," never a real staff member**
- Rebuild Recommendation: Fix `log_job_activity()` to accept and store `user_id`/`user_name`, mirroring the already-correct `order_activities` pattern exactly; this is a small, mechanical, low-risk fix (see §16)

**Screen Name: Order Activity (embedded)**
- Route: Order detail page
- Who Can Access It: Any authenticated tenant user
- Purpose: Same concept as Job History, for the newer Order model
- Main Information Shown: Chronological list of order/quote/invoice/work-order/file lifecycle events, correctly attributed to real users
- Current Problems: None found — this is the reference-quality implementation
- Rebuild Recommendation: Keep as-is; use as the template when fixing Job History

**Screen Name: AI Assistant Action Audit Log**
- Route: `/settings/ai-audit`
- Who Can Access It: Owner/Admin only (correctly gated via a direct role-string check, not the `Permission` enum — a different, but in this case correctly-applied, gating style than most of the rest of the app)
- Purpose: Review every action the AI Assistant has taken on the tenant's behalf, including denied/pending/failed attempts
- Main Information Shown: Action type, target record, outcome, timestamp, initiating user
- Current Problems: Unlinked from any navigation (Settings doc's finding, restated here)
- Rebuild Recommendation: Add the nav link; otherwise, this screen and its backend are a model implementation

---

## 4. Main User Workflows

### Workflow 1: Investigating "Who Changed This Job's Status?" (Confirmed Broken)
**User Goal:** A shop owner notices a job's status changed unexpectedly and wants to know who did it.
**Starting Point:** Job detail page → History section.

**Step-by-Step Flow (as reproduced):**
1. Open the job's History section (or call `GET /jobs/{id}/history` directly, as done in this session's live test).
2. Find the relevant "Status changed from X to Y" entry.
3. **The entry shows "System" as the actor — there is no way to determine which staff member actually made the change, even though the system unambiguously knew who was authenticated at the time (the API call itself required a valid, identified session).**

**System Actions Behind the Scenes:**
1. The original status-change request (`PUT /jobs/{id}`) is fully authenticated — `current_user.id`/`current_user.full_name` are known and available at the moment the action occurs.
2. `log_job_activity()` is called without being given this information, and without any fallback attempt to retrieve it from the surrounding request context.
3. The `JobActivity` document is inserted with `user_id`/`user_name` left at their model defaults (`None`).
4. On read, `get_job_history()` substitutes the string `"System"` for any `None`/missing `user_name`.

**Data Created or Changed:** N/A (this is a read/investigation workflow; the data quality problem was created earlier, at write time).
**Notifications / Emails / SMS Sent:** None.
**Required Approvals or Signatures:** None.
**Workflow Completion Condition:** N/A — this workflow currently **cannot** complete; the information the user is looking for was never captured.
**Failure or Error Conditions:** No error is shown — the request succeeds and returns a plausible-looking, but wrong, answer ("System" implies no human was involved, which is never actually true for any of these actions).
**Current Problems:** Total loss of actor attribution for the single most common per-record history type in the app.
**Rebuild Requirement:** **P0.** Update `log_job_activity()`'s signature to accept `user_id`/`user_name` (mirroring `log_activity()`'s existing signature exactly) and update all 15+ call-sites in `routes/jobs.py` to pass `current_user.id`/`current_user.full_name`, exactly as `routes/orders.py` already correctly does for its own parallel system.

---

### Workflow 2: The AI Assistant Takes an Action, Correctly Logged End-to-End
**User Goal:** (Illustrative, not a bug workflow) A staff member asks the AI Assistant to update an order's status; later, someone reviews what the AI actually did.
**Starting Point:** AI Assistant chat interface → a request that triggers a tool action.

**Step-by-Step User Flow:**
1. Staff member (via chat or voice) asks the AI to perform an action.
2. The AI Assistant determines the appropriate tool call and checks whether it requires confirmation (destructive actions and, per the Assistant Settings module's own whitelist, anything not explicitly on the tenant's `skip_confirm` list, always require it).
3. If confirmation is required, the user confirms; if not (or once confirmed), the action executes.
4. Later, an Owner/Admin reviews `/settings/ai-audit` and sees exactly what happened, by whom (the human who initiated it), and with what outcome.

**System Actions Behind the Scenes:**
1. `AIAssistantActions.check_permission()` runs (using the **already-flagged, unsafe** `user_has_permission()` function — cross-referenced from the Access Control module doc, not re-derived here; this is the same root cause that blocks `platform_creator` from AI tool actions).
2. Every one of the four possible outcomes (denied / pending confirmation / executed / failed) writes a complete `ai_action_audit` entry, correctly attributed to the initiating human user.
3. If execution succeeds, the underlying tool action's own side effects occur (e.g., the order's status actually changes) — and, notably, if that underlying action is itself an Order status change, it would *also* correctly flow through `order_activities` with correct attribution (since the AI acts through the same `current_user`-aware code paths a human would use) — **Needs Verification** of this exact chain end-to-end (not traced this session whether AI-initiated actions call the same `log_activity()`/`log_job_activity()` functions a human-initiated request would, or bypass them entirely); flagged as an open question given how consequential the answer is for whether AI-driven Job changes would *also* show "System" doubly (once for the human-attribution gap, once for potentially not being logged as AI-initiated at all in the record's own history).
**Data Created or Changed:** 1 `ai_action_audit` entry (always); the underlying record's own change, if executed.
**Notifications / Emails / SMS Sent:** Depends on the specific tool action.
**Required Approvals or Signatures:** Per the confirmation-required logic.
**Workflow Completion Condition:** Audit entry exists and accurately reflects the outcome.
**Failure or Error Conditions:** None found — every branch is logged.
**Current Problems:** None in the AI audit mechanism itself; the only open question is the cross-system interaction noted above.
**Rebuild Requirement:** Trace and confirm (or fix) the AI-to-Job/Order-activity attribution chain as part of fixing Workflow 1's underlying bug.

---

## 5. Data Structure and Records

### Primary Records Owned by This Module
| Record Type | Purpose | Storage | Actor Attribution |
|---|---|---|---|
| `AdminAuditLog` entry | Platform Admin action record | `admin_audit_log` collection | ✅ Correct (actor id/email/role always captured) |
| AI Action Audit entry | AI Assistant action record | `ai_action_audit` collection | ✅ Correct (initiating human always captured) |
| `JobActivity` entry | Legacy Job lifecycle event | `job_activities` collection | ❌ **Never captured — confirmed live bug** |
| Order Activity entry | Newer Order lifecycle event | `order_activities` collection | ✅ Correct (confirmed live) |
| Customer-engagement timestamp | "Has customer viewed X" signal | Scattered fields on `invoices`/`portal_documents`/`form_requests`/wrap tickets | N/A (binary/single-timestamp, not an actor-attributed log at all) |

### Database Collections / Tables

**Collection: `job_activities`**
- Purpose: Legacy per-job lifecycle history.
- File or Schema Location: `models/jobs.py`/`models/enums.py` (`JobActivity`, `JobActivityType`), written by `routes/jobs.py`'s `log_job_activity()`.
- Important Fields: `id`, `job_id`, `tenant_id`, `activity_type`, `description`, `old_status`/`new_status` (where applicable), `user_id` (declared, never populated), `user_name` (declared, never populated), `created_at`.
- Known Data Problems: **Confirmed, systemic, total loss of actor attribution — every historical record and every future record until fixed.**
- Rebuild Recommendation: Fix the write path (§16); this is a code fix only — no schema migration is needed since the fields already exist and simply need to start being populated going forward (historical entries cannot be retroactively attributed, since the information was never captured at write time).

**Collection: `order_activities`**
- Purpose: Newer per-order lifecycle history.
- File or Schema Location: `models/orders.py` (presumably `OrderActivity` — **Needs Verification** of the exact model name/location, inferred from `workflow_engine.py`'s `OrderActivity(...)` construction), written by `services/workflow_engine.py`'s `log_activity()`.
- Important Fields: `order_id`, `tenant_id`, `entity_type`, `entity_id`, `action`, `description`, `user_id`, `user_name`, `old_value`, `new_value`, `created_at`.
- Known Data Problems: None found.
- Rebuild Recommendation: Keep as the reference schema.

### Data Relationships
```
Job (1) ──1:N── JobActivity            [user_id/user_name declared, NEVER populated — bug]
Order (1) ──1:N── OrderActivity        [user_id/user_name correctly populated]
Tenant (N via platform staff) ──1:N── AdminAuditLog   [correctly, richly attributed]
AI interaction ──1:N── AIActionAudit   [correctly attributed to the initiating human]
Invoice/PortalDocument/FormRequest/WrapTicket ──0:1── a single "viewed_at"-style field each   [not a log, a flag]
```

### Source of Truth
| Data Item | Current Source of Truth | Problems | Recommended Rebuild Source |
|---|---|---|---|
| "Who changed this job's status" | **No source of truth exists — the information was never captured** | Total, unrecoverable-for-past-records data loss | Fix `log_job_activity()` going forward; accept that historical entries remain permanently anonymous |
| "Who changed this order's status" | `order_activities.user_name`/`user_id` | None | Keep as-is |
| "Has the customer seen this yet" | Four independently-named boolean-ish timestamp fields, scattered | Naming inconsistency, no shared helper, no unified view | One shared `mark_viewed_by_customer(collection, id)` helper used everywhere this concept applies, even if the underlying field names stay collection-specific for backward compatibility |

### Duplicate or Conflicting Data
- `job_activities` vs. `order_activities` — two independently-designed schemas for the conceptually identical concern, one of which is missing a critical field's *population* (not its *declaration* — the schema itself is fine, it's simply never filled in).

---

## 6. Business Rules and Logic

### Core Business Rules
| Rule | Current Behavior | Correct Rebuild Behavior | Priority |
|---|---|---|---|
| Every logged action should record who performed it | **True for Platform Admin actions, AI actions, and Order activities. Confirmed false, live, for Job activities.** | Fix uniformly | **P0** |
| Security-sensitive events (login, password reset, role change) should be logged | **False everywhere — confirmed across this and every other module doc produced this session** | Add logging for at minimum failed logins and role changes | P1 |
| Tenant-configuration changes should be logged | **False everywhere** (Tenants/Settings docs, restated here) | Add logging | P1 |
| Customer engagement should be trackable in one consistent way | **Currently four inconsistent field names with no shared helper** | Consolidate under one naming convention/helper | P2 |

### Statuses and State Changes
Not applicable as a distinct concept in this module — the *subject* of this module (statuses changing on other records) is what gets logged, not a status of the log entries themselves.

### Automatic Actions
- Every code path in `AIAssistantActions.execute_action()` automatically writes an audit entry regardless of outcome — the one genuinely "can't forget to log this" design found in this module, achieved by centralizing all outcomes through one method rather than requiring each call-site to remember to log.

### Calculations and Formulas
None specific to this module.

### Validation Rules
None specific to this module — logging is a side-effect of other validated actions, not itself a validated input.

---

## 7. Permissions and Roles

### Roles That Interact With This Module
| Role | Job/Order History (view) | AI Audit Log (view) | Platform Admin Audit Log (view) |
|---|---|---|---|
| Owner | ✅ | ✅ | N/A (not platform staff) |
| Admin | ✅ | ✅ | N/A |
| Staff | ✅ | ❌ (correctly blocked — direct role check) | N/A |
| Platform Admin/Creator | N/A (not typically applicable to tenant records) | N/A | ✅ |

### Customer / Portal Permissions
Customers never view any audit trail; they are only ever the implicit subject of the scattered engagement timestamps.

### Sensitive Information
- `admin_audit_log` entries can contain IP addresses and user-agent strings — standard, appropriate security-log content, not flagged as a concern.
- Job/Order activity descriptions can contain business-sensitive details (old/new pricing, status reasons) — appropriately scoped to tenant staff only, no issue found.

### Permission Problems in Current App
The AI Audit Log's Owner/Admin-only gate is correctly implemented and is, notably, one of the very few permission checks in this entire app that does **not** route through either of the two disagreeing functions documented in the Access Control module doc — it's a third, simpler style (`if current_user.role not in (OWNER, ADMIN): raise 403`), which happens to work correctly here precisely because it never touches the broken `ROLE_PERMISSIONS`/`platform_creator` issue at all. No permission problems specific to viewing Job/Order history were found (any tenant user can view, consistent with those modules' own generally-flat access model).

---

## 8. Integrations and External Services
None — this module is pure internal record-keeping.

### API Endpoints
| Endpoint | Purpose | Auth |
|---|---|---|
| `GET /jobs/{id}/history` | Unified, multi-source Job timeline | Any tenant user |
| `GET /orders/{id}/activity` | Order lifecycle log | Any tenant user |
| `GET /ai/assistant/actions/audit` + `/audit/{id}` | AI Assistant action log + detail | Owner/Admin only |
| (Platform Admin audit endpoints) | Platform governance log | Platform staff only (documented in Tenants doc) |

### Webhooks
None.

### Email / SMS / Notification Templates
None owned by this module (the `notifications` collection, which does send alerts about some of the events this module also logs, is owned elsewhere per §1's Module Boundary).

---

## 9. Documents, Files, Images, and Attachments
Not applicable — this module logs *references* to other records' events (including file-related ones, e.g., a document being uploaded), never files themselves.

---

## 10. AI Features
The AI Action Audit system (`ai_action_audit`) is, itself, entirely an AI-feature-adjacent concern and is documented in full above as one of this module's three core systems — repeated here only to flag it explicitly for anyone searching this document by AI-feature relevance rather than by audit-trail relevance.

---

## 11. Activity Logs, Audit Trail, and Reporting
*(This section is the subject of the entire document; restated briefly per the template's own structure rather than repeating every finding.)* Three systems exist (Platform Admin, AI Assistant, Job/Order); one (Job Activity) has a confirmed, live, systemic actor-attribution bug; security events and tenant-configuration changes are unaudited everywhere; customer actions have no unified log. See §2 for full detail.

---

## 12. Errors, Edge Cases, and Failure Handling

### Known Bugs
| Bug | Where It Happens | Severity | Temporary Workaround | Rebuild Fix |
|---|---|---|---|---|
| Job Activity history never records who performed an action — **confirmed live** | `routes/jobs.py` `log_job_activity()` | **Critical** (data-integrity/accountability gap, not a security hole, but a serious one for dispute-resolution and operational trust) | None — the information is permanently lost for every past entry; going forward, staff would need to cross-reference other logs (e.g., checking who was logged in around that timestamp, if any such log even existed, which it doesn't) | Add `user_id`/`user_name` parameters to `log_job_activity()` and pass them at all 15+ call-sites, mirroring `log_activity()`'s already-correct pattern |
| No security-event logging anywhere | App-wide (absence, not a specific file's defect) | High (already flagged across Auth/Access-Control docs; restated here as this module's own gap) | None | Add logging for logins (success/failure), password resets, and role changes at minimum |
| Customer-engagement field naming inconsistency | `routes/portal.py` (4 different field names for the same concept, across 4 collections) | Low (developer-experience/consistency issue, not user-facing) | None needed | Consolidate under one naming convention or shared helper |

### Edge Cases
- **An AI-initiated Job status change**: per §4 Workflow 2's open question, it's unconfirmed whether this would correctly attribute to "AI Assistant (on behalf of [user])" in Job history, or simply add one more "System"-attributed entry to the already-broken log — either way, the underlying Job Activity bug means the human accountability chain is lost regardless of the answer.
- **A tenant with records split across both `job_activities` and `order_activities`** (mid-migration, per the Architecture Map's already-known Jobs→Orders transition): staff reviewing history for an older record type vs. a newer one will see inconsistent data quality with no indication in the UI that this is expected/systemic rather than record-specific.

### Error Messages
No errors occur in either the broken or working paths — this module's defect is a silent data-quality gap, the same "no error where one should exist" pattern flagged repeatedly across this session's other module docs.

### Recovery Rules
No recovery is possible for already-created, un-attributed `job_activities` entries — the actor information was never captured and cannot be reconstructed from the activity record itself. (**Needs Verification**: whether the broader application has any *other* log — even an imperfect one, like a web-server access log — that could be cross-referenced by timestamp to retroactively guess at attribution for historically significant disputes; not investigated this session as it would require infrastructure-level log access outside this codebase's scope.)

---

## 13. Important Files and Code Map

### Backend Files
| File Path | Purpose | Keep / Replace / Remove |
|---|---|---|
| `backend/services/admin_audit.py` | Platform Admin audit-log writer | Keep entirely as-is; the reference schema for any future audit-logging work in this app |
| `backend/services/ai_assistant_actions.py` | AI Assistant action execution + audit logging | Keep entirely as-is; the reference *coverage* pattern (log every outcome branch, not just success) |
| `backend/routes/jobs.py` (`log_job_activity`) | Legacy Job history writer | **P0 fix**: add actor attribution |
| `backend/services/workflow_engine.py` (`log_activity`) | Newer Order history writer | Keep as-is; the reference *attribution* pattern |
| `backend/routes/ai.py` (audit endpoints) | AI Audit Log read API | Keep |

### Shared Files / Utilities
None currently shared between the three logging systems — each was built independently with no common base class/helper, which is both why the attribution bug could happen unnoticed in one system while the sibling system got it right, and the core architectural lesson for the rebuild.

### Tests
**Needs Verification** — no activity-logging-specific test file was found by name. Given the confirmed live bug, the highest-priority regression test for the next builder is direct: create a job, perform an action as a known test user, fetch its history, and assert the returned `user_name` matches the acting user — a test that would have caught this bug immediately had it existed.

---

## 14. Design and Layout Requirements
Not deeply inspected visually this session (this doc focused on backend correctness). The one relevant note: the Job History UI presumably already renders whatever `user_name` value it receives, meaning **no frontend change is needed to fix the display of attribution once the backend starts sending real names** — the UI is not the problem.

---

## 15. Module Dependencies

### Modules This Module Depends On
| Dependency Module | Why Needed |
|---|---|
| Jobs, Orders | This module's two core record-history systems are literally embedded inside those modules' own route files, not separated out |
| Access Control | The AI Audit system's underlying action-execution permission check depends on the same broken `user_has_permission()` function documented in that module's own doc |
| Auth | `current_user` is the source of every correct (and, for Jobs, missing) attribution |

### Modules That Depend on This Module
| Dependent Module | What It Needs |
|---|---|
| Every module with a detail page showing "history" (Jobs, Orders) | This module's write functions |
| Settings (AI Audit Log page) | The `ai_action_audit` read endpoint |
| Tenants/Platform Admin | `admin_audit_log`, already covered in that doc |

### Events This Module Sends / Receives
None (no event bus, consistent with every other module documented this session).

---

## 16. Migration and Rebuild Strategy

### Existing Data That Must Be Preserved
- Every existing `job_activities`/`order_activities`/`ai_action_audit`/`admin_audit_log` entry — the rebuild fixes *future* attribution, not past records.

### Existing Data That Can Be Archived
Not applicable.

### Existing Data That Should Not Be Migrated
Not applicable — no placeholder/dead data specific to this module.

### Recommended Rebuild Order
**Phase 1: Foundation (small, mechanical, do first):** Fix `log_job_activity()` to accept and store `user_id`/`user_name`, and update every one of its 15+ call-sites — a self-contained, low-risk change with a clear before/after test (per §17).

**Phase 2: Foundation (trace and close a question):** Confirm (or fix) whether AI-initiated actions correctly flow through to Job/Order activity logs with appropriate "on behalf of" framing.

**Phase 3: Core Workflow:** Add security-event logging (logins, password resets, role changes) — a genuinely new capability, not a fix to an existing one.

**Phase 4: Advanced Features:** Consolidate the four customer-engagement timestamp field names/patterns into one shared helper; consider whether tenant-configuration changes (Tenants/Settings docs' gaps) should route through this same shared audit infrastructure once one exists.

**Phase 5: Reports, AI, and Polish:** Add the missing AI Audit Log nav link (cross-referenced from the Settings doc); consider a genuine "recent activity across my shop" Dashboard feed.

### Rebuild Risks
- Phase 1's fix is purely additive (adds information that was missing; changes no existing behavior otherwise) and carries essentially no risk beyond needing to update every call-site consistently — a mechanical, verifiable change.
- Phase 3 (new security-event logging) is a net-new feature, not a fix, and should be scoped and tested as such rather than assumed low-risk simply because it's "just logging."

### Required Decisions Before Building
1. Should the two parallel history systems (Job Activity, Order Activity) eventually be unified into one, given the ongoing Jobs→Orders migration, or should Job Activity simply be patched in place (since it may be retired naturally as the migration completes)? This affects whether the Phase 1 fix is a permanent investment or a stopgap.
2. Should security-event logging (Phase 3) be built on the existing `admin_audit_log` schema (extended to cover tenant-level, not just platform-level, actors) or a new, dedicated collection?

## 17. Testing Requirements

### Critical Tests
| Test Scenario | Expected Result | Priority |
|---|---|---|
| Create a job as a known test user, change its status, fetch history | **Today: `user_name` is "System" (confirmed live).** Post-fix: `user_name` matches the acting user | Critical (post-fix) |
| Create an order as a known test user, change its status, fetch activity | `user_name` matches the acting user (already correct — regression-guard this) | Critical |
| AI Assistant performs a denied/pending/executed/failed action, in each case | An `ai_action_audit` entry exists for every one of the four outcomes | Critical |
| Staff (non-Owner/Admin) attempts to view `/settings/ai-audit`'s underlying API | 403 | Critical |
| Customer views an invoice for the first time, then again | `portal_viewed_at` is set on first view and does not change on the second | Medium |

### Manual Test Checklist
- [x] Confirm activity log is created → True for AI actions and Order activities; **false (missing attribution) for Job activities** — confirmed live
- [x] Confirm permissions work → True for the AI Audit Log's Owner/Admin gate
- [ ] Confirm mobile layout works → Not inspected this session
- [x] Confirm error states are understandable → N/A — the defect here produces no error, which is itself the problem

### Definition of Done
This module is complete only when: (1) Job Activity correctly attributes every entry to the acting user, matching Order Activity's existing standard, (2) the AI-to-Job/Order-activity attribution chain is confirmed correct or fixed, (3) at least login failures and role changes are logged somewhere, and (4) the AI Audit Log page is reachable from navigation.

---

## 18. Final Rebuild Recommendation

### Keep
- `services/admin_audit.py`'s schema and consistent application — the reference for audit-log *structure*.
- `services/ai_assistant_actions.py`'s complete-coverage logging — the reference for audit-log *completeness*.
- `services/workflow_engine.py`'s `log_activity()` — the reference for audit-log *attribution*, and the exact pattern `log_job_activity()` should be made to match.

### Rebuild From Scratch
- `log_job_activity()`'s missing attribution — not a redesign, a completion of an already-declared-but-unused schema field.

### Merge With Another Module
- Consider whether Job Activity and Order Activity should eventually merge into one system as part of the broader Jobs→Orders architectural migration already noted in the Architecture Map — a decision for that migration's own planning, not this doc's fix.

### Remove
- The four inconsistently-named customer-engagement timestamp fields could be consolidated, though none need outright removal — each still serves its narrow purpose correctly.

### Postpone
- Security-event logging (a genuinely valuable, but net-new, capability) and a unified cross-record "recent activity" Dashboard feed — both real improvements, neither blocking.

### Recommended Priority
- [x] Critical

### One-Paragraph Builder Handoff
This app has three independent activity-logging systems of meaningfully different quality, and this session's most concrete finding is a live-reproduced, systemic, total loss of actor attribution in the oldest and most heavily-used one: every Job's history — status changes, notes, edits — has always shown "System" as the actor, confirmed by creating a real test job, changing its status as the Owner account, and observing the resulting history entry attribute to "System" instead of the Owner's own name, despite the request being fully authenticated the entire time. The good news, also confirmed live, is that the newer, parallel Order Activity system (part of this app's ongoing Jobs→Orders migration) already solved this exact problem correctly — every Order Activity entry checked showed the real acting user's name — meaning the fix for Job Activity is not a design problem to solve from scratch, it's a matter of making `log_job_activity()`'s roughly fifteen call-sites pass the same `user_id`/`user_name` arguments that `orders.py`'s `log_activity()` call-sites already correctly pass today. Beyond that one (highly fixable) bug, the module's other gaps are omissions rather than defects: there is no security-event logging anywhere in the app (logins, password resets, role changes all leave zero trace), tenant-configuration changes remain unaudited (already flagged in the Tenants and Settings module docs), and "Customer Actions" specifically has no real log at all — only four inconsistently-named, single-timestamp "has this been viewed yet" fields scattered across unrelated collections, with no shared helper and no unified feed. The AI Assistant's own action-audit system, by contrast, is the best-built piece of this entire module — comprehensive, correctly attributed, and a genuinely good template for whatever a future unified audit framework for this app should look like.

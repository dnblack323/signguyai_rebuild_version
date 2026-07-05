# PRODUCTIVITY & INTERNAL COLLABORATION — Rebuild Documentation

**Documentation Date:** 2026-02-15
**Completed By:** E1 (AI Agent) — direct code inspection of backend routes/services/models and frontend pages/components. No live data was created or modified (read-only investigation).
**Repository / Branch Reviewed:** `/app/` (current preview checkout)
**Files Read:** `backend/services/productivity_query.py` (full, 528 lines), `backend/routes/productivity.py` (full), `backend/routes/tasks.py` (full), `backend/routes/production_tasks.py` (full), `backend/routes/appointments.py` (full, incl. token-based confirm/reject flow), `backend/routes/employees.py` (schedule endpoints, lines 1783-1849), `backend/routes/employee_portal.py` (tasks section + `DEFAULT_PORTAL_SETTINGS`), `backend/models/productivity.py` (full), `backend/models/orders.py` (Order/ProductionTask enums), `backend/models/auth.py` (full `Permission` enum + `ROLE_PERMISSIONS` mapping — grep for Task/Productivity/Schedule/Appointment permissions confirmed none exist), `backend/services/digest_scheduler.py` + `backend/routes/digest.py` (grep for task/overdue coverage), `frontend/src/pages/Productivity.js` (full), `frontend/src/pages/EmployeePortalTasks.js` (full), `frontend/src/lib/productivity.js` (full), `frontend/src/components/productivity/ProductivityKanbanView.js` + `ProductivityItemDialog.js` (full).

---

## 1. Purpose and Scope

This module is the app's internal work-coordination layer — everything a shop's staff use to answer "what do I need to do, and when." It covers four areas the user specifically named: **Tasks** (freeform to-dos), **Kanban** (drag-and-drop board), **Schedules** (weekly employee shift calendar), and **Messages** (internal team communication/notes).

**Confirmed scope finding:** there is **no internal messaging or team-chat feature anywhere in the codebase.** The word "Messages" in the domain brief does not map to any built feature — the closest things that exist are free-text `notes` fields on individual work items (task notes, production-task notes, order `internal_notes`) which are single-value fields overwritten on edit, not a conversation/thread. This is documented as a gap in §8.

What this module **does** own today:
- **Unified Productivity Layer** (`/api/productivity/*`) — a read/aggregation layer that merges 5 different underlying record types (Tasks, Orders, legacy Jobs, Production Tasks, Employee Schedule shifts, Appointments) into one normalized `ProductivityItem` shape, and powers 4 views: Dashboard, Calendar, Kanban, Task List.
- **Tasks** (`/api/tasks`) — a standalone freeform to-do CRUD, independent of the Order/Job Ticket system, optionally linked to a `job_id` and an assigned employee.
- **Production Tasks / Production Board** (`/api/production-tasks`) — department/stage-level execution tracking tied to a specific Job Ticket + Order (the 4th layer of the current Order architecture: Order → Job Tickets → Quotes/Invoices → Production Tasks).
- **Employee Schedule** (`/api/payroll/schedule`) — a weekly per-employee shift grid (start/end/notes per day), technically owned by the Payroll module's route file but surfaced inside Productivity as read-only calendar/kanban entries.
- **Appointments** (`/api/appointments`) — scheduled site surveys, installs, consultations, pickups, dropoffs, with customer-facing email confirm/reject actions.
- **Employee Portal Tasks** (`/api/employee-portal/tasks`) — a cut-down, employee-facing view of the same `tasks` collection, gated by a tenant-level toggle.

**Out of scope / owned elsewhere:** Payroll/time-clock hours tracking (Payroll module), Job Ticket creation and Order status workflow (Orders module — Production Tasks only consume it), Customer-facing portal (no task/productivity surface exists there at all).

---

## 2. Existing Feature Inventory

| Feature | Status | Notes |
|---|---|---|
| Unified Productivity Dashboard view | ✅ Working | Aggregates counts: due today, overdue, waiting on approval, scheduled this week, my assigned, by-type/by-column breakdowns (`build_productivity_summary`) |
| Unified Calendar view (month/week/day) | ✅ Working | `/api/productivity/calendar-range`; grid-aware range expansion (month view pads to full weeks) |
| Unified Kanban board | ✅ Working, partial drag-drop | Columns are dynamic from data + a fixed default set; only `task`, `job` (order), `production_task` types are draggable (`WRITABLE_TYPES`) — schedule shifts and appointments render read-only in Kanban context (excluded from the filtered list passed to the Kanban view in `Productivity.js` line 167) |
| Unified Task List view | ✅ Working | Quick inline status/priority/assignee edits via `onQuickUpdate` |
| Day-detail dialog with inline "Add Task for this day" | ✅ Working | Calendar day click opens a dialog listing all items that day + a mini task-creation form |
| Task CRUD (`/api/tasks`) | ✅ Working | Simple collection, no ties to Order/Job Ticket lifecycle beyond an optional `job_id` FK (points at legacy `jobs`, not current Order/Job Ticket system) |
| Production Task board (stage/department/status groupings) | ✅ Working | 3 alternate groupings computed server-side from the same `production_tasks` collection |
| Production stage configuration | ✅ Working | Tenant-level customizable pipeline (`production_stages` on tenant doc), defaults to 5 stages (Intake→Design→Production→Finishing/QC→Ready) |
| Production task status-change audit trail | ✅ Working | `timestamp_history` array appended per status change + calls `log_activity` (Order Activity system) — this is the one part of the module with correct user attribution |
| Proof-approval dependency gate | ⚠️ Existing but no-op | `existing.get("depends_on_proof")` is checked, but the code explicitly does nothing (`pass  # Could add stricter check here`) — a task can move to `in_progress`/`complete` even if the linked proof was never approved |
| Employee weekly schedule (view + save) | ✅ Working | Gated by Payroll's own `_require_payroll_view_access` / `_require_payroll_edit_access`, not a Productivity-specific permission |
| Schedule shifts surfaced in Productivity calendar/kanban | ✅ Working | Expanded per-day from the weekly doc into individual `schedule_shift` items; editable via the same generic `PATCH /productivity/items/{uid}` endpoint |
| Appointments CRUD | ✅ Working | Site survey / install / consultation / pickup / dropoff / other types |
| Appointment customer email w/ Confirm & Reject buttons | ✅ Working | HMAC-signed, stateless tokens (no DB token storage); public, unauthenticated endpoints at `/api/public-appointments/{token}/confirm` and `/reject`; silently no-ops if `email_service` isn't configured or the customer has no email/order isn't linked |
| Appointment "send_reminder" flag | ⚠️ Misleading name | Despite the name, this flag only gates the **initial** notification email sent at creation time — there is no actual reminder (day-before / hour-before) email or job anywhere in the codebase |
| Generic cross-type update endpoint (`PATCH /productivity/items/{uid}`) | ✅ Working | Single endpoint routes updates back to whichever of the 6 underlying collections the `uid` prefix indicates (`update_productivity_source`) |
| Employee Portal "My Tasks" (view + complete) | ✅ Working | Employee can only mark tasks complete, cannot edit title/due date/priority; gated by tenant toggle `can_view_tasks` |
| Task due-date reminder digest / notification | ❌ Does not exist | The only automated daily digest (`digest.py`) covers overdue **Invoices** and legacy **Jobs** — Tasks, Production Tasks, and Appointments are entirely absent from it |
| Internal messaging / team chat / threaded notes | ❌ Does not exist | No `messages`/`comments`/`chat` collection or endpoint found anywhere in `routes/`; only single-value `notes` text fields per record |
| Recurring tasks | ❌ Does not exist | `TaskCreate` model has no recurrence fields |
| Task priority-based sorting/escalation | ❌ Does not exist | `priority` is stored and displayed but never drives sort order, notification urgency, or SLA logic |

---

## 3. Data and Rules

### Collections involved (no shared schema — each is independently shaped)
- **`tasks`** — `id, tenant_id, title, description, job_id, assigned_to (employee_id), status, priority, start_datetime, due_date, is_complete, created_at, updated_at`. `status` and `is_complete` are two independent fields kept in sync by application code on every write path (`tasks.py` PUT handler, `productivity_query.py`'s `update_productivity_source`) — **not** enforced by a single source of truth, so any future direct DB write or forgotten sync branch can desync them.
- **`production_tasks`** — tied to `job_ticket_id` + `order_id`, has `department`, `production_stage`, `status` (`TaskStatus` enum: not_started/in_progress/complete, etc. — see `models/orders.py`), `timestamp_history` (list of `{status, timestamp, user_id}`), `depends_on_proof` (bool), `completion_percent`.
- **`employee_schedules`** — one document per `(employee_id, week_start)`, with a `shifts` dict keyed `mon..sun` → `{start, end, notes}`. Editing a single day rewrites the whole `shifts` map.
- **`appointments`** — has both a "current" schema (`scheduled_start`/`scheduled_end`) and legacy aliases (`scheduled_at`/`scheduled_date`) kept in the response model side-by-side for backward compatibility — **two names for the same concept coexist in the API response today.**
- **`jobs`** (legacy) — read by the productivity layer as `_map_legacy_job`; still a live, writable collection (status changes route back through `update_productivity_source`'s `legacy_job` branch), meaning the deprecated Job system is not actually frozen — it can still be edited via the unified Productivity UI.
- **`orders`** — read as `_map_order`, representing the current Order pipeline; only `status` and `requested_due_date` are writable through the unified layer.

### Normalization layer (`ProductivityItem`)
A single Pydantic model (`models/productivity.py`) is the contract every view/consumer depends on: `uid` (composite `source_type:source_id` key used for round-tripping updates), `type`, `source_type`, `status`, `board_column`, `priority`, `is_completed`, plus denormalized display fields (`customer_name`, `assigned_user_name`) resolved once per request via `_load_maps` (bulk-fetches all customers/employees/orders/jobs/tickets for the tenant, unbounded — capped at 5000/2000/1000 documents per collection, no pagination).

### Business rules found
- A `board_column` defaults to the record's own `status` string for most types — meaning **Kanban columns are literally whatever raw status strings exist across 3 different collections**, not a designed, curated pipeline. This is why `ProductivityKanbanView.js` has to union a hardcoded `DEFAULT_COLUMNS` list with whatever shows up in the data.
- Completion semantics differ per type: Tasks use `is_complete: bool` synced from `status`, Orders/legacy Jobs infer completion from a hardcoded status-string set (`{"completed","ready_for_pickup"}` / `{"completed","archived"}`), Production Tasks use `status == "complete"` (singular, no trailing "d") — **three different spellings/conventions for "done" across the same unified list.**
- Appointment `duration_minutes` defaults to 60 if unset when computing an end time for calendar display, but this is a display-only computation — it does not write back to the stored record.
- Schedule shifts are **only** created/edited via the Payroll UI's own form or the generic Productivity PATCH; there's no drag-to-create-shift interaction in the Productivity calendar itself.

---

## 4. Main Workflows

**A — Staff member views their day (Calendar):**
Frontend loads `/api/productivity/calendar-range` with `view=month|week|day` → backend computes a grid-aligned date range → `get_unified_productivity_items` pulls from all 6 sources filtered to that window → items rendered on the calendar; clicking a day opens a dialog listing that day's items with an inline "add task" mini-form that posts directly to `/api/tasks` (bypassing the unified layer for creation — creation is type-specific, only updates are unified).

**B — Staff member manages work via Kanban:**
Items of type `task`/`job`/`production_task` only are shown; dragging a card to a new column calls `handleKanbanMove` → derives a type-appropriate status string (there's special-casing in the frontend itself for `production_task`'s `complete` vs other types' `completed`) → `PATCH /productivity/items/{uid}` → `update_productivity_source` writes back to the correct source collection.

**C — Production task lifecycle (the one workflow with real audit trail):**
Staff updates a Production Task's status via `PUT /api/production-tasks/{id}` (not the unified PATCH — this dedicated endpoint is used by the Production Board UI, separate from the Productivity page's Kanban) → status-change branch appends to `timestamp_history`, sets `start_datetime`/`end_datetime`/`completion_percent` automatically on IN_PROGRESS/COMPLETE, calls `log_activity` (writes to Order Activity, correctly attributing `user_id`/`user_name`) → then rolls up progress to the parent Job Ticket and Order (`update_ticket_progress`, `update_order_progress`).

**D — Weekly schedule editing:**
Owner/Admin (payroll-permitted) opens Payroll → Schedule tab → `GET /api/payroll/schedule?week_start=...` → per-day grid → saving one cell calls `POST /api/payroll/schedule` with `{employee_id, week_start, day, start_time, end_time, notes}` → upserts into `employee_schedules`. These same shifts appear read-through in the unified Productivity calendar as `schedule_shift` items, editable there too via the generic PATCH (which reverse-engineers which day/week to touch from the `uid`).

**E — Appointment scheduling + customer confirmation:**
Staff creates an appointment (optionally linked to a customer + order) → if `send_reminder=true` and the customer has an email and `email_service.is_configured()`, an email fires immediately with two large "Confirm" / "Request Change" buttons → clicking either hits an unauthenticated `GET /api/public-appointments/{token}/confirm|reject` (HMAC-verified, no login) → returns a static HTML success page, updates appointment `status`. No follow-up reminder is ever sent regardless of how far out the appointment is.

**F — Employee Portal "My Tasks":**
Employee logs into the portal → if tenant's `can_view_tasks` setting is true, `GET /api/employee-portal/tasks?include_completed=` returns tasks where `assigned_to == employee.id`, enriched with the linked legacy job's name → employee can only tap a checkbox to call `PUT /api/employee-portal/tasks/{id}/complete`, which is restricted server-side to `{"id": task_id, "assigned_to": employee["id"]}` (an employee cannot complete another employee's task, confirmed by the query filter). No editing of title, due date, or priority is exposed to employees.

---

## 5. Permissions

**Main tenant app side — no dedicated RBAC exists for this entire module.** Confirmed by reading `models/auth.py`'s `Permission` enum (the real, in-use enum — 34 values covering Customers/Quotes/Jobs/Invoices/Inventory/Purchasing/etc.) and grepping it for `TASK`, `PRODUCTIVITY`, `SCHEDULE`, `APPOINTMENT` — zero matches. Every endpoint in `tasks.py`, `productivity.py`, `production_tasks.py`, and `appointments.py` uses only `Depends(get_current_active_user)` with no `_require(user, Permission.X)`/`has_permission()` call anywhere — a sharp contrast to sibling modules like Inventory (`routes/inventory.py`), which gates nearly every endpoint with `Permission.INVENTORY_VIEW`/`INVENTORY_ADJUST`/etc. **Practical effect:** any authenticated tenant user — Owner, Admin, or lowest-tier Staff — can create, edit, delete, or reassign any Task, Production Task, or Appointment belonging to the tenant, and can move anything on the Kanban board, regardless of the granular per-action permission scheme that already exists and is actively used elsewhere in the app — this module was simply never wired into it.

**Exception:** the Employee Schedule endpoints (`/api/payroll/schedule` GET/POST) do call `_require_payroll_view_access` / `_require_payroll_edit_access` — but this is Payroll's own permission, borrowed by association, not a Productivity-specific check. Schedule shifts edited *through* the unified Productivity PATCH endpoint do **not** go through this payroll check at all (`update_productivity_source`'s `schedule_shift` branch has no permission gate of its own) — meaning the payroll-gated schedule endpoint and the ungated Productivity-layer edit path can produce different access outcomes for the same underlying data depending which UI surface is used.

**Employee Portal side — feature-visibility toggles only, not role-based:** `can_view_tasks` and `can_view_schedule` are tenant-wide booleans (`DEFAULT_PORTAL_SETTINGS`), not per-employee or per-role. Task completion is scoped to `assigned_to == self` at the query level (a real, enforced boundary), but there is no employee-side permission to create, reassign, or edit a task at all — the portal is view+complete only, by design of the endpoints available (no `POST`/`PUT /tasks` route exists under `employee_portal.py`).

**Customer portal — not applicable.** No task/productivity surface is exposed to customers anywhere.

---

## 6. Integrations/Automation

- **Email (appointments only):** `services/email_service.py` is used for the one-time appointment confirmation email with tokenized Confirm/Reject action links (HMAC over `SECRET_KEY`, no DB-stored token, no expiry logic). Silent no-op if the service isn't configured for the tenant or the customer/order has no email — no error surfaced to staff when a notification silently fails to send.
- **No automation exists for:** task due-date reminders, production-task SLA/overdue alerts, appointment day-before reminders (despite the `send_reminder` field name implying it), or any scheduled/cron job tied to this module. The only tenant-wide scheduled job in the app (`digest_scheduler.py`, checked every minute via APScheduler) exclusively covers overdue Invoices and legacy Jobs — Tasks, Production Tasks, and Appointments are not included in its `compile_digest_data`.
- **AI Assistant:** no dedicated AI tool/action was found scoped to Tasks, Production Tasks, or Appointments in this pass (not deep-audited here — flagged for the AI Assistant module's own doc, not re-derived).
- **No SMS/Twilio wiring** exists for this module (consistent with the platform-wide note that Twilio is intentionally paused).

---

## 7. Recommended Rebuild Scope

1. **Collapse the "4 parallel work-item systems" problem.** Tasks, legacy Jobs, Orders, and Production Tasks are read into one unified list today only at the *query/display* layer — the underlying write models remain four separate, differently-shaped collections with duplicated concepts (status, due date, assignee, priority) reconciled by ad-hoc per-type branches in `_map_task`/`_map_order`/`_map_legacy_job`/`_map_production_task` and `update_productivity_source`. A rebuild should decide whether "Task" becomes the single generic work-item primitive (with Production Tasks and legacy Jobs migrated into it or explicitly retired) rather than perpetually normalizing 4 shapes into 1 read-only view model.
2. **Design real, permission-scoped RBAC for this module**, reusing whatever `Permission` enum framework the Users/Roles module already defines elsewhere in the app (e.g., `TASKS_VIEW`, `TASKS_EDIT`, `TASKS_ASSIGN`, `SCHEDULE_EDIT`) instead of the current all-authenticated-users-can-do-anything default. This should also close the specific gap where the Productivity-layer schedule-edit path bypasses Payroll's own permission check.
3. **Replace string-literal status/board-column matching with a real, tenant-configurable status taxonomy** per work-item type (the same way Production Stages already has a configurable model) instead of relying on whatever raw status strings happen to exist across collections, and standardize the "done" spelling (`complete` vs `completed`) across all types.
4. **Build a genuine due-date/overdue notification layer** covering Tasks, Production Tasks, and Appointments (today only Invoices/Jobs get this), and either build real reminder scheduling for appointments or rename/remove the currently-misleading `send_reminder` flag.
5. **Decide on Internal Messaging / Notes** — the domain brief names "Messages" as core scope, but nothing exists. Rebuild should explicitly scope whether this becomes a real threaded-comment system on work items (most natural fit, reusing the audit-trail infrastructure being redesigned in the Activity Log module) or is dropped from this domain's promised scope.
6. **Enforce the proof-approval gate** on Production Tasks that currently has a documented no-op (`pass  # Could add stricter check here`) — either implement the block or remove the dead `depends_on_proof` field/check to avoid implying a safeguard that doesn't function.
7. **Resolve the `jobs` legacy collection's live-write status.** It is simultaneously called "legacy" (per the Tenants/Users docs' terminology-consistency task) and remains fully writable through the current Productivity Kanban/Calendar — the rebuild needs an explicit decision on whether legacy Jobs are migrated to Orders and made read-only, or retired outright.

---

## 8. Open Decisions

- **Is "Messages" actually in scope for this domain**, or was it aspirational language in the original brief describing a feature that should be net-new? No existing code maps to it at all.
- **Should Production Tasks and the legacy Jobs collection be merged into the same `tasks` (or renamed) primitive**, or remain permanently separate specialized systems with the Productivity layer staying a read-time aggregator only?
- **What RBAC granularity is desired for this module** — per-action (view/edit/assign/delete) like Orders/Settings already have, or a simpler single "Productivity access" toggle?
- **Should the Employee Schedule move fully under this module's own permission set**, or remain permanently Payroll-owned with Productivity only as a read-through surface (current state is an inconsistent hybrid of both)?
- **Priority order for building due-date reminder automation** relative to the other P1 items already queued (AI token-cost logging, terminology pass) — this doc surfaces it as a gap but does not assume it should jump the existing queue.

---

## Related Running Issue List (see `/app/memory/RUNNING_ISSUE_TRACKER.md`)
New issues found in this domain have been appended to the running tracker file, not fixed. No code was changed during this investigation.

# Email / Notifications / SendGrid — Rebuild Investigation Document

**Investigation date:** 2026-02-15 (session continuation)
**Mode:** Documentation only. No code was written or modified.

---

## 1. Purpose and Scope

**What this domain does:** Every outbound communication the platform sends — transactional emails (password reset, appointment confirmations, document delivery, portal notifications, billing/dunning emails, daily digest), the SendGrid delivery/bounce/complaint tracking pipeline, customizable email templates, Platform-Admin broadcast email, and the (paused) SMS/Twilio layer. It also covers the in-app "notification" concept as it exists today.

**Main users:**
- Every domain in the app is a *caller* of this service (Auth, Appointments, Customers, Documents, Employees, Questionnaires, Signatures, Webstores, Webstore Owners, Stripe/Billing, AI Assistant, Digest).
- Customers (portal notifications, document delivery, invoice/quote emails, digest recipients if configured).
- Platform Admin (broadcast email to all tenant owners, deliverability dashboard, email log inspection).

**What belongs here:**
- The shared `EmailService` (SendGrid wrapper), its branding/wrapping logic, and its delivery logging.
- The SendGrid Event Webhook + deliverability tracking pipeline.
- Email Templates (the customizable subset).
- The Digest scheduler.
- SMS/Twilio service (even though paused per your prior instruction to "hold off on texts" — documented for completeness, not for active work).
- Platform Admin Broadcast Email.

**What belongs elsewhere:**
- The *business logic* that decides *when* to trigger an email (e.g., "should an invoice-sent event fire a notification?") belongs to each owning domain (Orders/Invoices, Appointments, etc.) — this domain only owns the *sending mechanism* and should be called by those domains, not duplicate their triggers.
- Customer-portal notification *records* (`CustomerNotification`) are currently modeled inside the Customers domain (`models/customer.py`) — flagged below as a location question, not necessarily wrong, but worth an explicit decision since "notifications" is named as a shared platform rule ("Reuse shared ... notifications ... Do not create duplicate systems") and there is currently no single shared notification system to point to.

---

## 2. Existing Feature Inventory

| Feature | Purpose | Keep / Merge / Simplify / Postpone / Remove | Related records/modules |
|---|---|---|---|
| **`EmailService` / SendGrid wrapper** (`services/email_service.py`) | Single shared class used by every domain to send email — good adherence to the "don't duplicate" platform rule; confirmed via full-repo grep that 18 different route files correctly import and reuse this one service rather than each rolling their own SendGrid client. | **Keep — this is the strongest-engineered piece of this domain.** | `email_logs` |
| **Per-tenant email branding wrapper** (`_apply_email_branding`) | Wraps every outgoing email in the tenant's logo/colors/signature if `branding_settings` configured; falls back to unbranded default otherwise. Applied inside `send_email()` itself, so it's universal — **every** email type gets this, not just the customizable-template ones. | **Keep** — good design, correctly zero-regression for tenants without branding configured. | `tenants.branding_settings` |
| **Customizable Email Templates** (`routes/email_templates.py`, 3 templates: `portal_notification`, `portal_welcome`, `document_delivery`) | Lets an Owner edit the wording/subject of 3 specific email types via Settings | **Fix scope gap** — only 3 of the ~15+ actual transactional email types the app sends are editable this way. Password reset, appointment confirmation, dunning/payment-failed, tenant-reactivated, digest, questionnaire-send, signature-request, webstore emails, and broadcast email are all **hardcoded inline HTML per call site** in `email_service.py` or the calling route — a tenant cannot customize any of their wording today. | `email_templates` (custom overrides) |
| **SendGrid Event Webhook + Deliverability Tracking** (`routes/email_deliverability.py`) | Public webhook ingesting SendGrid's delivered/bounce/spam/open/click events, correlating them back to the originating `email_logs` row via `sg_message_id`, and rolling up bounce/spam counters onto the tenant record | **Keep — genuinely production-grade, one of the best-engineered pieces found across this whole investigation series.** | `email_logs`, `email_events`, `tenants.email_bounce_count`/`email_spam_count` |
| **Platform Admin Email Logs / Deliverability Dashboard** (`PlatformAdminEmailLogs.js`, `/platform-admin/email-logs*`) | Lets the Platform Admin inspect every email sent across every tenant, filter by status, see aggregate deliverability | **Keep, but note the scope gap below** — this is Platform-Admin-only. **No tenant-facing equivalent exists** — a shop Owner cannot see whether their own invoice/quote email to a customer bounced or landed in spam. | `email_logs` |
| **Daily Digest** (`services/digest_scheduler.py`, `routes/digest.py`, `DigestSettings.js`) | Scheduled (every-minute-polling APScheduler) daily summary email per tenant, with idempotency (`digest_logs` dedupe) and a manual "Send Now" preview action | **Fix a real timezone bug (see §3), otherwise keep** — solid idempotency and scheduling engineering. | `digest_settings`, `digest_logs` |
| **Platform Admin Broadcast Email** (`platform_admin.py`, `BroadcastEmailRequest`, rate-limited: hourly caps for tests vs. real sends) | Lets the Platform Admin mass-email all (or a filtered subset of) tenant owners — e.g., product announcements | **Keep** — well-engineered (rate limiting, test-send distinction, audit-logged). Also the natural candidate mechanism for a future "Release Notes" feature, which the Adoption/Help investigation found doesn't exist yet — worth cross-referencing there. | `admin_audit_log` |
| **SMS/Twilio Service** (`services/sms_service.py`, `routes/sms.py`: `/status`, `/test`, `/send`) | Basic Twilio wrapper with configuration check, phone normalization | **Postpone** — per your explicit prior instruction to "hold off on texts." Confirmed minimal (3 routes only, not wired into any core workflow trigger the way email is). No action needed until you say otherwise. | n/a |
| **Customer-facing in-portal notifications** (`CustomerNotification` model, `models/customer.py`) | A simple unread/read notification list shown somewhere in the Customer Portal, populated by e.g. invoice-sent-to-portal | **Keep the concept, relocate/rename per platform rules** — currently modeled inside the Customers domain rather than as a genuinely shared, reusable "notification" system any domain can write to. Given the platform rule explicitly calls out reusing a shared notifications system, this should become that shared system (see §7). | `customer_notifications` |
| **Staff-facing in-app notifications** | Named as a shared system to reuse per the platform rules | **Does not exist at all today.** Confirmed via repo-wide search — there is no notification bell, inbox, or any staff-facing in-app notification mechanism anywhere in the frontend. Internal staff "notification" needs today are covered only by ad-hoc dashboard widgets (Financial Attention, AI Assistant Nudges) or by email — there is no lightweight "you were assigned a task" or "this order's status changed" in-app alert. | n/a — net-new |
| **Wrap Command Center notifications** (`services/wrap_notifications.py`) | Vehicle-Wrap-specific portal-action emails (proof/quote approved, etc.) | **Keep — correctly reuses the shared `email_service`**, good reference example of a domain-specific trigger calling into the shared sender rather than reinventing it. | `job_tickets` (wrap category) |
| **Dunning / Billing emails** (`services/dunning.py`: payment-failed, suspended, reactivated) | Billing-lifecycle emails to the tenant Owner | **Keep — correctly reuses the shared `email_service`.** | `tenants`, `subscription`/billing records |
| **Password Reset Email** (`send_password_reset_email`, called from `routes/auth.py`) | Auth flow email | **Keep** — clean, single-use, expiry-stated correctly. | `password_reset_tokens` (per the Auth domain) |
| **AI Assistant email tools** (`assistant_send_email`, `commit_bulk_quote_followups`) | AI-drafted/sent customer emails | **Cross-reference, not duplicated here** — already documented in the AI Workspace investigation, including the confirmed uncredited-LLM-cost-leak finding for the bulk version. Both correctly funnel through the shared `email_service.send_email()`, so they DO get logged/tracked by this domain's deliverability pipeline correctly — the AI Workspace finding was about credit-charging, not about bypassing this domain's infrastructure. | `email_logs` |
| **Public Contact/Support form emails** | Named requirement: notify the shop owner (or platform) when a prospect submits `/contact`/`/support` | **Fix — cross-referenced, already tracked.** Confirmed (again, from this domain's side) that `routes/public_website.py` never calls `email_service` at all. | `public_website_inquiries` |
| **Order/Quote/Invoice lifecycle emails** | Named-by-implication requirement: "your quote is ready," "invoice sent," "payment received" | **Does not exist — new finding from this domain's side.** Confirmed via grep: `routes/orders.py`, `routes/quotes.py`, `routes/invoices.py`, and `routes/job_tickets.py` never call `email_service` at all. The one adjacent action that superficially looks like a notification (`send_invoice_to_portal`) only inserts a `CustomerNotification` DB row — it does **not** also send an email, so a customer who isn't actively checking their portal has no way to know an invoice/quote exists. | `orders`, `quotes`, `invoices` |

---

## 3. Data and Rules

**Main records:**
- `email_logs` — one row per `send_email()` call: `to_email`, `subject`, `status` (`sent`/`failed`), `delivery_status` (refined by webhook events: `delivered`/`bounce`/`dropped`/`spamreport`/`blocked`/`deferred`), `sg_message_id`, `events[]`, `sent_at`, `tenant_id`.
- `email_events` — raw SendGrid webhook payloads, append-only, one per event received (a single email can have many: processed → delivered → open → click).
- `email_templates` — tenant-specific overrides for the 3 customizable template IDs; falls back to `DEFAULT_TEMPLATES` (hardcoded dict in `email_templates.py`) when no override exists.
- `digest_settings` — `{tenant_id, enabled, schedule_time (HH:MM string, no timezone), recipients[]}`.
- `digest_logs` — one row per send (scheduled or manual), used for same-day dedupe.
- `customer_notifications` (`CustomerNotification`) — `{tenant_id, customer_id, notification_type, title, message, link, related_id, is_read}`.

**Required fields / statuses:**
- `email_logs.delivery_status` values: `sent` (initial), `delivered`, `bounce`, `dropped`, `spamreport`, `blocked`, `deferred`, `failed`. State machine correctly implemented in `_normalize_status()` (terminal-bad states never get overwritten by a later soft-fail like `deferred`).
- `digest_settings.schedule_time` is a bare `"HH:MM"` 24-hour string with **no timezone field anywhere in the model** — see the important validation/business-rule gap below.

**Relationships:**
- `email_logs` ↔ `email_events` linked by `sg_message_id` prefix match (SendGrid sometimes appends a suffix to the ID across events — the `$regex: "^..."` prefix-match handles this correctly).
- `email_logs.tenant_id` correctly scopes every log for tenant isolation — confirmed present on every `_log_email()` call site.
- No relationship exists from `email_logs` back to the *business record* that triggered the email (no `order_id`/`invoice_id`/`appointment_id` stored on the log) — meaning "show me every email related to this specific invoice" is not directly queryable today, only "every email sent to this customer's address."

**Important validation/business rules:**
- **Confirmed timezone bug:** the digest scheduler (`check_and_send_digests`) compares `schedule_time` against `datetime.now(timezone.utc).strftime("%H:%M")` — i.e., always UTC. Since `DigestSettings`/`DigestSettingsUpdate` have no timezone field, a tenant who sets "7:00 AM" expecting their own local morning digest will actually receive it at 7:00 AM UTC, which is the middle of the night for most US-based sign shops. This is a real, confirmed functional bug, not a hypothetical.
- SendGrid webhook correctly increments `tenants.email_bounce_count`/`email_spam_count` and stamps `email_last_bounce_at`/`email_last_delivered_at` — good foundation for a future "sender reputation" warning, though nothing currently *reads* those counters to warn anyone (confirmed no alert/dashboard-card consumes them outside the Platform Admin's own dashboard).

**Shared systems required:**
- **Settings** — branding (`tenants.branding_settings`) correctly consumed.
- **Customers** — every customer-directed email needs `customer.email`; `send_invoice_to_portal` correctly checks `customer.portal_enabled` first.
- **Documents** — `send_document_via_email` correctly reuses the shared File Storage system for attachments (not duplicated).
- **AI Credits** — the AI email tools correctly sit on top of this domain rather than re-implementing sending; the credit-charging gap found there is an AI Workspace issue, not an Email domain issue.
- **Activity Log** — **not consumed here at all.** No email send/failure is written to any activity/audit trail (only to `email_logs`, which is a domain-specific log, not the shared Activity Log system documented in the Activity Log & Audit Trail investigation). Worth a rebuild decision: should "invoice email sent" also produce an Order/Invoice activity-log entry the way `log_activity()` already does for other Order events? Today it does not.

---

## 4. Main Workflows

### Workflow A — Any domain sends a transactional email (the common path)
1. **Starting point:** Some other domain's route handler decides an email is needed (e.g., appointment created, password reset requested, document ready).
2. **Main steps:** Call the relevant `email_service.send_*` method (or the generic `send_email`) → branding wrapper applied → SendGrid API call → response captured.
3. **Automatic actions:** `_log_email()` always fires (success or failure) — this is a reliable, universal side effect.
4. **Notifications/tasks/documents created:** None beyond the email itself and its log row (except the specific cases where the caller *also* writes a `CustomerNotification`, e.g., invoice-to-portal).
5. **Edge cases:** SendGrid not configured → `is_configured()` returns false → warning logged, `{"success": False}` returned, **no exception raised** — callers that don't check the return value will silently "succeed" from the user's perspective while no email actually sent (not verified this session whether every caller checks the response; flagged as a dependency to audit before rebuild).
6. **Completion rule:** `email_logs` row exists with a terminal or pending `delivery_status`.

### Workflow B — SendGrid Event Webhook (deliverability feedback loop)
1. **Trigger:** SendGrid POSTs a batch of events to `/webhook/sendgrid` (public, unauthenticated by design — this is how SendGrid itself calls in).
2. **Main steps:** For each event, insert into `email_events`, look up the matching `email_logs` row by `sg_message_id` prefix, update `delivery_status` via the terminal/soft-fail state machine, push the raw event onto `events[]`.
3. **Automatic actions:** Bounce/spam counters incremented on the tenant record.
4. **Edge cases handled:** Malformed JSON → 400; unmatched `sg_message_id` → event still recorded in `email_events`, just not correlated to a log row (no data loss, just no correlation) — good defensive design.
5. **Completion rule:** `{"status": "ok", "processed": N, "matched": M}` response.

### Workflow C — Daily Digest
1. **Trigger:** APScheduler job runs every 60 seconds, compares current UTC `HH:MM` against every enabled tenant's `schedule_time`.
2. **Main steps:** Dedupe-check `digest_logs` for today → compile digest data (`compile_digest_data`) → render HTML → send to each configured recipient → log the batch result.
3. **Automatic actions:** None beyond the send itself.
4. **Edge cases:** Timezone mismatch (§3) is the main confirmed issue. No retry logic if a recipient's send fails (result just recorded as `success: False` in the log, no re-attempt).
5. **Completion rule:** `digest_logs` row with per-recipient results written.

### Workflow D — Platform Admin Broadcast Email
1. **Trigger:** Platform Admin composes a broadcast (optionally a test-send first) targeting some/all tenant owners.
2. **Main steps:** Rate-limit check (`_enforce_broadcast_rate_limit`, separate hourly caps for test vs. real sends) → send loop → audit log entry per send.
3. **Edge cases:** 429 raised if the hourly cap is exceeded — good abuse protection.
4. **Completion rule:** Audit log rows (`broadcast_email.send` action) exist for rate-limit counting on future calls.

---

## 5. Permissions

**Internal access rules:**
- Sending transactional emails is implicit in whatever permission the *calling* action already requires (e.g., creating an appointment triggers its email as a side effect of the Appointments permission, not a separate Email permission) — reasonable, no dedicated `EMAIL_SEND` permission needed for that.
- Email Templates editing: gated behind whatever Settings-edit permission the Settings domain uses (not re-verified line-by-line this session, cross-reference the Settings & Configuration investigation).
- Digest settings: gated behind `get_current_active_user` only in `routes/digest.py` (not verified whether a specific permission check exists beyond authentication) — flagged as a dependency to confirm.

**External/portal access rules:**
- The SendGrid webhook (`/webhook/sendgrid`) is intentionally public/unauthenticated (SendGrid itself calls it) — this is correct by design, not a bug, but worth flagging that it has **no shared-secret/signature verification** confirmed in this session (SendGrid supports a signed webhook verification key) — if not implemented, anyone who discovers the URL could POST fake delivery events and pollute `email_logs`/tenant bounce counters. Flagged as an open decision/security item to verify before rebuild.

**Sensitive data restrictions:**
- **Platform-Admin-only visibility into all tenant email logs is correct** (cross-tenant data, rightly restricted to the platform operator).
- **But there is no tenant-level equivalent at all** — an Owner cannot see their own shop's email deliverability, meaning they'd have no way to discover, e.g., that all their invoice emails have been bouncing for a week. This is a real customer-facing gap, not just a nice-to-have.

---

## 6. Integrations, Automation, and Reporting

**Notifications:** Covered exhaustively in §2/§4 — this domain largely *is* the notification-sending mechanism for the rest of the app, but the in-app (non-email) notification concept is thin (customer-only) and has no staff equivalent.

**External services:** SendGrid (email, both send API and event webhook), Twilio (SMS, paused/minimal).

**AI features:** None native to this domain; it is *consumed by* the AI Workspace domain's email tools (cross-referenced, not duplicated).

**Reports, metrics, exports:** `email-logs/summary` (Platform-Admin-only aggregate counts: total/delivered/pending/bounced/complaints/failed) and `email-logs` (paginated, filterable raw list) — both solid, both Platform-Admin-scoped only (see §5 gap).

---

## 7. Recommended Rebuild Scope

**Recommended screens:**
1. Keep the Platform Admin Email Logs/Deliverability dashboard as-is.
2. Add a **tenant-scoped "Email Activity" view** (Settings area) surfacing that tenant's own `email_logs`/deliverability — closes the biggest gap in this domain.
3. Expand Email Templates to cover every actual transactional email type sent (or explicitly decide which ones are intentionally non-customizable system emails, e.g., password reset probably shouldn't be tenant-editable for security-copy consistency, but appointment/dunning/digest reasonably could be).
4. Add a lightweight staff-facing in-app notification inbox/bell if the rebuild decides internal notifications are a real requirement (Open Decision below) — this would also be the natural place to surface "your invoice email to Customer X bounced."

**Recommended shared components:**
- Promote `CustomerNotification` into a genuinely shared, generic `Notification` record any domain (staff or customer) can write to, with a `recipient_type` (`customer`/`staff`) discriminator — satisfies the platform rule to reuse one notification system rather than each domain inventing its own.
- One shared "email trigger registry" mapping business events (quote generated, invoice sent, order status changed, appointment confirmed) to a template + recipient — would make it trivial to see, in one place, which business events currently do/don't have an associated email (today this mapping only exists implicitly, scattered across many files).

**Features to combine:**
- Merge the "Contact/Support form → notify someone" fix (already tracked in the Adoption/Help investigation) into this same email-trigger-registry work, since it's the same underlying gap (a business event with no associated notification).
- Merge the "Order/Quote/Invoice lifecycle has no emails" fix into the New Order Workflow domain's rebuild, using this domain's shared `send_email`/templates rather than inventing new inline HTML.

**Features to delay:**
- SMS/Twilio — explicitly paused per your instruction, no rebuild work needed yet.
- Full email-trigger-registry abstraction — the *concept* is worth designing now, but implementing every missing trigger (§2's list) can be sequenced incrementally per-domain as those domains are rebuilt.

**Dependencies:**
- The New Order Workflow rebuild (documented separately) is the biggest consumer of "missing email triggers" — sequencing this domain's registry design just ahead of that rebuild would let Quote/Invoice emails be built correctly the first time rather than retrofitted.
- SendGrid webhook signature verification (§5) should be confirmed/added before treating `email_logs`/bounce-counters as fully trustworthy data.

**Suggested internal build order:**
1. Fix the digest timezone bug (small, isolated, immediately valuable).
2. Verify/add SendGrid webhook signature verification (security hardening, isolated).
3. Build the tenant-scoped Email Activity view (reuses 100% existing backend data, just needs a new permission-gated read endpoint + page).
4. Design the shared `Notification` model (staff + customer) and migrate `CustomerNotification` onto it.
5. Expand Email Templates coverage to the remaining transactional types.
6. Build the missing Order/Quote/Invoice/Contact-form email triggers, coordinated with those domains' own rebuilds.

---

## 8. Open Decisions

1. **Should the digest scheduler support per-tenant timezone, and what should the default be?**
   *Recommended answer:* Add a `timezone` field to `digest_settings` (IANA name, e.g., `America/New_York`), defaulting to the tenant's existing address-derived timezone if available, else UTC with a clear "times shown in UTC" label until set.
   *Can proceed without it?* No — this is a live, confirmed bug affecting anyone using the digest feature today.

2. **Should every transactional email type become tenant-customizable via Email Templates, or are some (e.g., password reset, dunning/suspension) intentionally locked to protect security/billing-compliance wording?**
   *Recommended answer:* Lock security-critical emails (password reset) and billing-compliance emails (dunning/suspension) to prevent a tenant accidentally removing required disclosure language; open up the rest (appointment, digest, questionnaire, signature-request, webstore) to customization.
   *Can proceed without it?* Yes, can implement incrementally per-type.

3. **Should the in-app notification system be unified (one `Notification` model for staff + customers), and is a staff-facing notification bell a real near-term requirement or genuinely out of scope for now?**
   *Recommended answer:* Unify the data model now (cheap, avoids future duplication), but the staff-facing *UI* (bell/inbox) can be deferred until a concrete driving use case is prioritized (e.g., once Productivity's RBAC work — tracked separately — lands, "you were assigned a task" becomes a natural first staff notification).
   *Can proceed without it?* Yes for the UI; recommend deciding the data-model question before any other domain builds its own bespoke notification list (avoid repeating the `CustomerNotification`-is-domain-specific mistake).

4. **Is the SendGrid webhook currently protected by signature verification, and if not, should it be added before relying on bounce/complaint counters for any automated decision (e.g., pausing sends to a chronically-bouncing address)?**
   *Recommended answer:* Add signature verification (SendGrid supports this natively) before this domain's deliverability data is used for anything beyond passive dashboard display.
   *Can proceed without it?* Yes for current passive-dashboard usage; must resolve before any automated action is driven by this data.

### Build-readiness status
**Mostly build-ready — this is one of the stronger-engineered domains in the investigation series.** The shared `EmailService`, deliverability webhook, and digest scheduler are all genuinely solid and should carry forward with light fixes (timezone bug, webhook signature verification) rather than a rebuild. The real gaps are about *coverage* (which business events actually trigger an email, and who can see the results) rather than *architecture* — the underlying sending mechanism is trustworthy and correctly reused everywhere it's called, it's just not called from several places it should be (Contact/Support forms, Order/Quote/Invoice lifecycle) and has no tenant-facing visibility layer yet.

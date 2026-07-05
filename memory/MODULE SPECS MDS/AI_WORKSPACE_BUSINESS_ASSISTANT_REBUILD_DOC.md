# AI Workspace & Business Assistant — Rebuild Investigation Document

**Investigation date:** 2026-02-15 (session continuation)
**Mode:** Documentation only. No code was written or modified. Investigated as a separate domain per explicit user instruction — not combined with the Business Finance/Reporting/Analytics investigation. All findings below are confirmed by direct code reading (not guessed).

---

## 1. Purpose and Scope

**What this domain does:** Every AI-powered surface in the app — the conversational Business Assistant (full-page + floating widget), the 30-tool AI Tools generation library (text + image), saved AI history, the shared AI credit/billing system, voice input/output, and the growing set of AI-initiated database actions (create task, create order, send email, etc.) with their audit trail.

**Main users:**
- Owner/Admin/Staff (any authenticated tenant user) — AI Tools and the Business Assistant are gated by *tier/credits*, not by *role*, so all internal roles get equal access today (see §5).
- Owner/Admin only — the one exception is the AI Action Audit Log view, correctly restricted to Owner/Admin.

**What belongs here:**
- Business Assistant chat (both surfaces: full-page `/ai-assistant` and the floating widget mounted app-wide)
- Tool-calling / structured action execution (both the older `ActionType` system and the newer lightweight tool-commit system — see the critical §2 finding on these being two divergent systems)
- AI Tools library (Design/Marketing/Business/Branding/Racing categories, 30 visible tools)
- Voice input (Whisper transcription) / voice output (OpenAI TTS)
- Saved AI history (`ai_history`), AI conversation memory, saved commands & routines (Phase 5), next-step suggestions, smart defaults
- The shared AI credit system (`user_credits`, `credit_transactions`, credit packs, Stripe purchase flow)
- AI action/usage audit trails

**What belongs elsewhere:**
- The actual business records an AI action creates/modifies (Tasks, Appointments, Orders, Invoices, Customers) belong to their respective domains — this domain only owns the *AI-initiated pathway* into them.
- Customer Branding Profile data itself (`customers.branding_profile`) belongs to the Customers domain; this domain only owns the AI generation tools that read/write it.
- Document Library storage/categorization belongs to the Documents domain; this domain only owns the "Save AI output to library" auto-tagging trigger.
- Financial metrics themselves (revenue, invoices, AR) belong to the Business Finance domain (documented separately) — this domain's `query_shop_metric` tool is a *consumer* of that data, and (per §2/§5 below) currently re-implements its own copy of that math rather than calling into a shared metrics service.

---

## 2. Existing Feature Inventory

| Feature | Purpose | Keep / Merge / Simplify / Postpone / Remove | Related records/modules |
|---|---|---|---|
| **AI Tools library** (`AITools.js`, `POST /api/ai/generate` + `/generate-images`) | 30 visible generation tools (Design 8, Marketing, Business, Branding, Racing 3) producing text and/or images | **Keep** — feature-gated via `multi_product_gate` (tier) + AI-credit check, both correctly enforced. 3 tools intentionally hidden (`Logo Refresher`, `Generative Fill`, `Vehicle Wrap Cost Calculator`) after prior audits found them non-functional or mis-scoped — good precedent for the rebuild to keep auditing tool-by-tool honesty of claims (raster vs. production-ready, etc., already partly done per `*_TOOLS_AUDIT.md` files). | `ai_history` |
| **Business Assistant — full page** (`AIAssistant.js`, `POST /api/ai/assistant`) | Conversational assistant with persisted history, personality presets, tool-calling (navigate/metric/create_task/create_appointment/set_reminder/send_quote_followup_bulk/attach_note_to_customer/find_customer) | **Keep, but reconcile with the floating widget (critical finding below)** | `assistant_conversations`, `tasks`, `appointments`, `assistant_reminders` |
| **Business Assistant — floating widget** (`FloatingAssistant.js`, same `/api/ai/assistant` endpoint for chat, but a **different** action-execution path) | Same chat surface, mounted globally (available from any page) | **Critical finding — two non-overlapping capability sets:** the floating widget's "confirm" button calls `POST /assistant/action` (the older, formally-permissioned `ActionType` system: `create_order`, `create_job`, `update_job_status`, `create_calendar_event`, `add_material`, `update_material_cost`, `create_invoice`, `assign_employee`, `log_time_entry`, `categorize_expense`), while the full-page assistant's confirm buttons call the newer `commit-task`/`commit-appointment`/`commit-reminder`/`commit-note-to-customer`/`bulk-followup-quotes` endpoints. **Confirmed via full grep of both files: neither file calls the other's endpoints.** A user asking the floating widget "add a task to call the supplier" gets routed through a completely different code path (and different permission model) than asking the exact same question on the full `/ai-assistant` page. This is a genuine architectural fork, not a stylistic difference — the rebuild must pick ONE tool-execution system and retire the other. | `ai_action_audit` (older system) vs. `tasks`/`appointments`/`assistant_reminders` (newer system) |
| **Structured Action system** (`services/ai_assistant_actions.py`, `ActionType` enum, `POST /assistant/action`, `/assistant/action/confirm`) | Permission-checked (`ACTION_PERMISSIONS` map: e.g. `CREATE_ORDER`→`JOBS_EDIT`, `CREATE_INVOICE`→`INVOICES_EDIT`, `CATEGORIZE_EXPENSE`→`FINANCIALS_MANAGE`), confirmation-gated, fully audited business-mutation actions | **Keep as the reference pattern** — this is the more mature, correctly-permissioned of the two systems (contrast with the item below). | `ai_action_audit` |
| **Lightweight tool-commit system** (`routes/assistant_tools.py`, `commit-task`/`commit-appointment`/`commit-reminder`/`commit-note-to-customer`) | Fast deterministic-keyword + gpt-4o-mini-classifier tool routing for lighter productivity actions | **Fix permission gap** — confirmed via code read: **none of the four commit endpoints check any permission** beyond `get_current_active_user` (any authenticated Staff can have the AI create/commit a task or appointment on anyone's behalf). This is the exact same underlying gap already flagged in the Productivity module's RUNNING_ISSUE_TRACKER item ("no RBAC exists for the entire Productivity module") — surfacing again through the AI Assistant as an additional unguarded entry point into the same unprotected Tasks/Appointments collections. | `tasks`, `appointments`, `assistant_reminders` |
| **`query_shop_metric` tool** (`assistant_tools.py::execute_metric_query`) | Answers "how much did I make today" style questions inside chat, 10 metrics | **Fix permission gap + de-duplicate.** Two independent problems: (1) **zero permission check** — takes only `tenant_id`, no role/permission gate — meaning any Staff user can ask the assistant for real revenue/AR numbers, bypassing the `Permission.FINANCIALS_VIEW` gate that the separate, more careful `/assistant/query` endpoint (`services/assistant_queries.py`, which DOES map metrics like `revenue`→`FINANCIALS_VIEW`, `overdue_invoices`→`INVOICES_VIEW`) correctly enforces for materially the same questions. (2) **Duplicate metric logic** — two independent implementations of "what's today's revenue" exist in the codebase (`assistant_tools.py`'s 10-metric fast-path vs. `assistant_queries.py`'s broader permission-mapped set), which will silently drift out of sync if either is changed without the other. | `invoices`, `orders` |
| **Voice input** (`POST /voice/transcribe`, OpenAI Whisper via `emergentintegrations`) | Speech-to-text for chat input | **Keep** — correctly credit-gated (`voice_transcription`, 1 credit) both before (preflight) and after (deduct) the call, with `log_failed_ai_usage` on exception. Reference-quality error handling. | `ai_usage_logs` |
| **Voice output** (`POST /voice/speak`, OpenAI TTS `tts-1`) | Text-to-speech for assistant replies | **Keep** — same correct credit-gating pattern as voice input. | `ai_usage_logs` |
| **Proactive Nudges** (`GET /assistant/nudges`, `AssistantNudgesWidget.js`) | Dashboard widget surfacing stale quotes / overdue invoices / upcoming appointments as one-click action pills | **Keep** — good pattern, but currently narrow (3 trigger conditions only). Does not yet cover Profit Analytics' "underpriced job" flag (documented separately in the Business Finance investigation) despite that being an equally strong candidate nudge. | `quotes`, `invoices`, `appointments` |
| **Draft Email / Send Email** (`/assistant/draft-email`, `/assistant/send-email`) | LLM drafts a follow-up/reminder email; user reviews and sends | **Fix credit gap** — confirmed via code read: `/assistant/draft-email` (a real GPT-4o-mini LLM call) has **zero credit deduction call anywhere in its handler** — it is a free, unlimited, uncharged LLM generation endpoint today, in contrast to nearly every other LLM-calling endpoint in this file which correctly gates on credits. `/assistant/send-email` correctly has no credit charge (it's just SendGrid, not an LLM call — that part is fine). | `ai_assistant_logs` |
| **Bulk Quote Follow-up** (`POST /assistant/bulk-followup-quotes`, `commit-bulk_followup` in `assistant_tools.py`) | Drafts + sends up to 25 personalized GPT-4o-mini follow-up emails in one action | **Fix credit gap (more severe than the single draft-email gap above)** — this endpoint can fire **up to 25 separate LLM calls in a single request** and has **zero credit check or deduction** anywhere in the handler. This is the most significant AI-credit-system leak found in this investigation: a single "follow up on all my stale quotes" chat message can generate real, uncharged LLM API cost 25x over. | none — should log to `ai_usage_logs` |
| **Saved Commands & Routines** (`ai_assistant_prefs.py`) | User-savable shortcut phrases + multi-step routines, with run-count tracking | **Keep** — reasonably self-contained CRUD, no obvious bugs found in this pass (not exhaustively load-tested). | `assistant_saved_commands`, `assistant_routines` |
| **Next-Step Suggestions / Smart Defaults** (`/next-step-suggestions`, `/smart-defaults/last-order-customer`) | After an action executes, suggests a logical follow-up; pre-fills likely next customer | **Keep** — genuinely useful UX layer, low risk. | — |
| **Assistant Personality** (`/assistant/personality`) | 4 tone presets + skip-confirm whitelist | **Keep** — already correctly scoped per earlier changelog entry. | `tenants.assistant_personality` |
| **AI Assistant Long-Term Memory** (rolling summary compressed every ~12 messages into `tenant.assistant_long_term_memory`) | Cross-session recall ("my favorite color is blue") | **Keep** — verified working end-to-end per prior changelog entry. | `tenants` |
| **AI Credit System** (`models/credits.py`, `services/credit_service.py`, `routes/credits.py`) | Monthly + purchased credit balances, Stripe-purchased packs, per-action cost table, low-balance warning | **Keep — this is the strongest-engineered piece of this entire domain.** Correct priority order (monthly credits spent before purchased), correct transaction ledger, correct preflight-then-deduct pattern used by ~12 of the ~14 credit-relevant endpoints in `ai.py`. The two gaps found (draft-email, bulk-followup) are the exceptions, not evidence the system itself is weak. | `user_credits`, `credit_transactions`, `ai_usage_logs` |
| **AI Action Audit Log (page)** (`AIAuditLog.js`, `GET /assistant/actions/audit`) | Owner/Admin-only filterable audit table of every structured `ActionType` execution | **Keep, but note it only covers HALF the picture** — this page only shows `ai_action_audit` entries (the older ActionType system). It does **not** show any activity from the newer tool-commit system (task/appointment/reminder/note/bulk-followup), nor from AI Tools generations (`ai_history`), nor raw credit usage (`ai_usage_logs`). An Owner reviewing "everything the AI did" today gets an incomplete picture across (at least) 4 separate, non-unified collections (`ai_action_audit`, `ai_assistant_logs`, `ai_history`, `ai_usage_logs`) plus a 5th (`assistant_conversations`) for raw chat transcripts. Confirmed also referenced in the earlier Settings & Configuration rebuild doc as "fully built but unlinked from nav" — still true this session (not yet fixed, per the "wait for start rebuild" instruction). | 5 separate collections, no unifying view |
| **Customer Branding Profile → AI Tools deep-link** (`CustomerBrandingTab`, `AITools.js` `?customer=` param) | Pre-fills brand voice/colors/logo into relevant AI tools from a saved customer profile | **Keep** — already shipped and verified per changelog (April 30 pass). Good reference pattern for "AI outputs tied to customers" requirement. | `customers.branding_profile` |
| **Document Library auto-tagging** (`handleSaveToLibrary` mapper, 8 new `DocumentCategory` values) | Routes AI Tool output (marketing content, logo concepts, brand kits, etc.) into the right Document Library bucket on save | **Keep** — already shipped, verified in a prior pass. | `documents` |
| **AI Prompt Library (as a discrete, user-facing feature)** | Domain scope names "AI prompt library" explicitly | **Does not exist as a distinct feature today** — the closest analogs are (a) the fixed `TOOL_PROMPTS`/`EMAIL_TYPE_PROMPTS` dictionaries hardcoded server-side (not user-editable, not really a "library"), and (b) Saved Commands (§ above), which are shortcut *phrases*, not reusable prompt templates with variables. If a true prompt-library (user-authored, reusable, shareable templates) is a real requirement, it needs to be built from scratch. | N/A |

---

## 3. Data and Rules

### Main records
| Collection | Key fields | Notes |
|---|---|---|
| `user_credits` | `tenant_id, monthly_credits, purchased_credits, low_credits_threshold, monthly_credits_period_end` | One doc per tenant. Monthly credits refill automatically via `check_and_refill_monthly_credits` (lazy, on-read refill — not a cron job). |
| `credit_transactions` | `tenant_id, transaction_type (enum), amount, balance_after, monthly_balance_after, purchased_balance_after, metadata` | Full ledger, append-only. Correctly records `monthly_grant`, `monthly_expire`, `pack_purchase`, `ai_usage`, `admin_adjustment`, `refund`. |
| `ai_usage_logs` | `tenant_id, user_id, action_type, module, feature_name, credits_charged, monthly_credits_used, purchased_credits_used, credit_source, status` | Per-call usage log, separate from the transaction ledger above. |
| `ai_history` | `tool, input_data, output, images, tenant_id, user_id, credits_used, created_at` | AI Tools generation history only (not chat, not structured actions). |
| `ai_assistant_logs` | `tenant_id, user_id, tool, ...` | Loosely-typed chat/email-send event log (different shape per call site — `business_assistant`, `assistant_send_email`, etc.) |
| `ai_action_audit` | `action_id, tenant_id, user_id, action_type, status (enum), parameters, confirmed_at, cancelled_at` | Structured ActionType system only. Owner/Admin-visible page reads exclusively from here. |
| `assistant_conversations` | `tenant_id, user_id, messages[] (role/content, capped ~60)` | Raw chat transcript, separate from all the above. |
| `assistant_reminders` | reminder text, `remind_at`, tenant/user scope | Deliberately separate from `tasks` so reminders don't pollute the task list (per earlier changelog note) — a deliberate design choice, not a bug. |
| `assistant_saved_commands` / `assistant_routines` | phrase/steps, `run_count`, `last_run_at` | Phase 5 personalization. |

### Required fields / statuses
- `ActionStatus` enum (structured system): `pending_confirmation`, `executed`, `failed`, `cancelled`.
- `CreditTransactionType` enum: `monthly_grant`, `monthly_expire`, `pack_purchase`, `ai_usage`, `admin_adjustment`, `refund`.
- Credit cost table (`AI_CREDIT_COSTS` in `services/founders_config.py`) — not reviewed line-by-line this session; flagged as a dependency to confirm every AI Tool + assistant action type has an explicit cost entry (a tool without one silently falls back to a default rather than failing loudly — worth a rebuild-time audit).

### Relationships
- No relationship exists between `ai_action_audit` (structured actions) and `ai_history`/`ai_assistant_logs`/`assistant_conversations` (chat + tool actions) — five parallel collections, zero foreign keys tying "one user conversation" to "the actions it triggered" to "the credits it spent," beyond loosely-matching timestamps.
- `credit_transactions.metadata.ai_action_id` field exists in the model comment but is not consistently populated by every call site that deducts credits (some pass a `session_id`, some pass a `tool` name, some pass nothing structured) — makes precise cross-referencing between a specific chat turn and its exact credit transaction unreliable today.

### Important validation/business rules
- Monthly credits are always consumed before purchased credits (`build_credit_preview`'s `monthly_used = min(monthly, credits_needed)`), correctly implemented.
- Monthly refill is lazy (computed on next read after `period_end` passes), not a scheduled job — acceptable for correctness but means a tenant who doesn't touch any AI feature for 2+ months will "catch up" to only the most recent period, never accumulating unused monthly credit carry-over (intentional per the "expire at month end" design).
- Structured `ActionType` actions are confirmation-gated by default (`requires_confirmation: bool = True`); the lightweight tool-commit system has no equivalent explicit confirmation flag in its data model — confirmation is purely a frontend UX convention (show a pill, wait for click) with no server-side "was this actually reviewed" guarantee.

### Shared systems required
- **Customers** — reused correctly (branding profile, `find_customer` tool, quote follow-up).
- **Users/Permissions** — inconsistently reused (see §5).
- **Documents** — reused correctly for AI-output-to-library saves.
- **Notifications** — nudges are the closest analog; no formal Notification-collection integration confirmed this session.
- **Activity Logs** — NOT reused; this domain has built 5 of its own separate logging collections rather than writing into whatever central Activity Log pattern the rebuild adopts for other domains (cross-reference: the Activity Log & Audit Trail rebuild doc from an earlier session already flagged "no unified cross-record activity feed exists for tenant staff" — this domain is a major contributor to that same fragmentation problem).
- **AI Credits** — this domain *is* the AI credit system; other domains (e.g., Business Finance's `query_shop_metric` overlap) must call into it, not reimplement it.

---

## 4. Main Workflows

### Workflow A — AI Tool Generation (text or image)
- **Starting point:** User opens `/ai-tools`, selects a tool, fills form.
- **Main steps:** `gate.require_feature(tenant, "ai_tools", "text_generation"/"image_generation")` → `preview_credit_usage` (402 if insufficient) → generate → `deduct_credits_after_success` → save to `ai_history`.
- **Automatic actions:** Some tools also generate a paired "design brief" text alongside images (no extra credit charge, per earlier changelog).
- **Notifications/tasks/documents created:** Optional manual "Save to Library" → routes into the right `DocumentCategory`.
- **Edge cases:** Failure path correctly calls `log_failed_ai_usage` (0 credits charged) before re-raising — confirmed no credit is ever charged for a failed generation.
- **Completion rule:** `ai_history` row inserted; response returned with `credits_used`.

### Workflow B — Assistant Chat (either surface)
- **Starting point:** User types/speaks into either the full-page or floating assistant.
- **Main steps:** `POST /assistant` → tool router: Layer 1 deterministic keywords → Layer 2 gpt-4o-mini classifier → if a tool fires, short-circuit with a `proposed_action` pill (credits charged either way, flat per-turn cost regardless of which layer matched or whether a tool fired at all) → else full gpt-5.2 chat reply.
- **Automatic actions:** `_detect_quick_action` heuristic also runs on every normal (non-tool) reply to surface an "email/send invoice to X" pill.
- **Notifications/tasks/documents created:** Depends entirely on which surface (§2 critical finding) — floating widget can create Orders/Jobs/Invoices/Calendar-events/Time-entries/Expense-categorizations; full page can create Tasks/Appointments/Reminders/Notes/Bulk-followups. **Neither surface can do what the other can.**
- **Edge cases:** `query_shop_metric` fast-path has no permission gate (§2/§5). `draft-email` and `bulk-followup-quotes` have no credit gate (§2).
- **Completion rule:** Reply persisted to `assistant_conversations`; separately logged to `ai_assistant_logs`.

### Workflow C — Structured Action Confirmation (floating widget only)
- **Starting point:** Assistant proposes e.g. "create an order for Customer X."
- **Main steps:** `POST /assistant/parse-action` (LLM extracts structured params) → user reviews → `POST /assistant/action` (confirmed=false → `pending_confirmation` written to `ai_action_audit`) → user clicks Confirm → `POST /assistant/action/confirm` → permission check (`ACTION_PERMISSIONS` map) → real mutation executes → audit row updated to `executed`/`failed`.
- **Edge cases:** Permission check happens inside `execute_action`, correctly returning a structured denial rather than a raw 403 (needs confirming this doesn't also hit the earlier-documented "422 before 403" cross-cutting issue — not verified this session).
- **Completion rule:** `ai_action_audit` row status flips to `executed`/`cancelled`/`failed`.

### Workflow D — Credit Purchase
- **Starting point:** User hits a low-credit warning or opens Credits settings.
- **Main steps:** `GET /credits/packs` → `POST /credits/purchase` (Stripe Checkout session) → Stripe webhook (`POST /credits/webhook/stripe`) → credits added + `pack_purchase` transaction logged.
- **Completion rule:** `user_credits.purchased_credits` incremented; webhook is the source of truth (not the client-side redirect), correct pattern.

---

## 5. Permissions

### Internal access rules (as they exist today — inconsistent, mirroring the pattern already found in the Business Finance investigation)
| Endpoint / Feature | Actual gate today |
|---|---|
| AI Tools generation (`/generate`, `/generate-images`) | Tier feature-gate + credit check. **No role/permission check** — any authenticated Staff can run any of the 30 tools. (Likely intentional — tier-gated, not role-gated — but worth an explicit rebuild decision, see §8.) |
| Structured `ActionType` actions (`/assistant/action`) | **Correctly role/permission-gated** per `ACTION_PERMISSIONS` map (e.g. `CREATE_INVOICE`→`INVOICES_EDIT`). Reference pattern. |
| Lightweight tool commits (`commit-task/appointment/reminder/note`) | **No permission check at all** — gap, compounding the already-documented Productivity module RBAC gap. |
| `query_shop_metric` (chat fast-path) | **No permission check** — gap, inconsistent with the properly-gated `/assistant/query` endpoint answering the same questions. |
| `/assistant/draft-email`, `/assistant/send-email` | Authenticated-user only — acceptable for now since it operates on a specific existing customer record the user must already have visibility into, but no explicit `CUSTOMERS_VIEW`/`CUSTOMERS_EDIT` check is present. |
| AI Action Audit Log page/endpoints | **Correctly Owner/Admin-only** (`current_user.role not in (OWNER, ADMIN)` → 403). Reference pattern. |
| Credits admin-summary (`GET /credits/admin-summary`) | Not verified in this session — flagged for rebuild to confirm it's platform-admin or owner-scoped, not open to all Staff. |

### External/portal access rules
- None of this domain (AI Tools, Assistant, Credits) is exposed to Customer Portal, Employee Portal, or Webstore Owner Portal — correctly tenant-staff-only today.

### Sensitive data restrictions
- The same systemic pattern already found in the Business Finance investigation repeats here: "convenience" AI entry points (chat tool fast-paths, floating widget) skip the permission checks that the "proper" dedicated endpoint for the same data correctly enforces. This is now confirmed across at least 3 separate domains (Dashboard widgets, Webstore Analytics, and now the AI Assistant's metric tool) — strongly suggesting the rebuild needs ONE shared, mandatory permission-dependency pattern applied uniformly, not per-endpoint judgment calls.

---

## 6. Integrations, Automation, and Reporting

- **Notifications:** Proactive Nudges widget (dashboard-only, 3 trigger conditions). No push/email notification exists for "your AI credits are running low" despite `is_low_credits`/`low_credits_threshold` being modeled — it's a UI-only concept today (not verified whether the frontend even surfaces it prominently outside the Credits settings page).
- **External services:** OpenAI (GPT-5.2 chat, GPT-4o-mini classifier/drafting, Whisper STT, TTS-1, image generation) and Anthropic/Gemini indirectly via the shared Emergent LLM key infrastructure; Stripe for credit-pack purchases.
- **AI features:** This entire domain IS the AI feature layer for the app; see §2 for the full inventory.
- **Reports, metrics, exports:** `GET /credits/history` (transaction ledger), `GET /credits/cost/{action_type}` + `/credits/costs` (pricing lookup), `GET /credits/admin-summary` (aggregate, scope unverified). No AI-usage *trend* reporting (e.g., "credits spent by tool, by week") exists — the only view is the raw Owner/Admin Audit Log table (structured actions only) or the raw transaction ledger (not tool/feature-broken-down in the UI, though the underlying `ai_usage_logs.module`/`feature_name` fields would support it).
- **Cross-domain duplicate-logic risk (already flagged in the Business Finance doc):** `query_shop_metric`'s revenue/invoice math is a second, independent implementation of numbers that domain's dashboards also compute — a shared metrics service is recommended to serve both.

---

## 7. Recommended Rebuild Scope

**Recommended screens:**
1. **Unified AI Activity view** — one screen (Owner/Admin) combining `ai_action_audit` + `ai_assistant_logs` (chat) + `ai_history` (tool generations) + `ai_usage_logs` (credits) into one chronological, filterable timeline per user/tenant. Replaces the current Audit Log page that only shows half the picture.
2. **Single Assistant surface with one capability set** — collapse the floating widget and full-page assistant onto ONE tool-execution backend (recommend promoting the newer, lighter tool-commit pattern to also cover the heavier ActionType use cases like create_order/create_invoice, since it's the more actively-developed of the two — but this is a real product decision, see §8).
3. **AI Tools library** — keep current page structure, but audit remaining tools against the same "is this claim honest" bar already applied to Design/Marketing/Business/Branding/Racing.
4. **Credits & Usage** — keep, add a tool/feature usage breakdown chart sourced from the already-existing `ai_usage_logs.module`/`feature_name` fields.

**Recommended shared components:**
- One shared `require_permission()` dependency applied to every AI action-commit endpoint (structured AND lightweight), closing the RBAC gap for good instead of per-endpoint.
- One shared metrics-calculation service consumed by both `query_shop_metric` and the Business Finance dashboards (see cross-reference in that domain's doc).
- One shared "AI activity logger" helper called by every AI-touching code path (tool call, chat turn, structured action, credit deduction) writing into a single `ai_activity_log` collection with a consistent shape, replacing the current 5-collection fragmentation.

**Features to combine:**
- Merge `ai_action_audit` + `ai_assistant_logs` + `ai_history` write paths into the single logger above.
- Merge the two tool-execution systems (structured ActionType vs. lightweight commits) into one.

**Features to delay:**
- A true, user-authored AI Prompt Library (doesn't exist today — confirmed net-new).
- AI-usage trend/cost dashboards beyond the raw ledger.
- Scheduled low-credit-balance email/SMS alerts (data model supports it; no scheduler wired yet).

**Dependencies:**
- Fixing the two chat-surface fork (§2) is a prerequisite before any new assistant capability is added — otherwise every new tool has to be built twice.
- The shared metrics service depends on Business Finance domain's own data-source fix (Profit Analytics reading from legacy `jobs`, per that investigation) being resolved first, or the shared service will just inherit the same legacy-data gap.

**Suggested internal build order:**
1. Fix the two uncredited LLM endpoints (`draft-email`, `bulk-followup-quotes`) — smallest, highest-value fix, directly protects margin.
2. Add the missing permission checks (`commit-task`/`commit-appointment`/`commit-reminder`/`commit-note-to-customer`, `query_shop_metric` fast-path).
3. Decide and execute the single-assistant-surface consolidation (§8 Open Decision #1).
4. Build the unified AI Activity log.
5. Build the shared metrics service (coordinate with Business Finance domain rebuild timing).

---

## 8. Open Decisions

1. **Which of the two tool-execution systems (structured `ActionType` vs. lightweight tool-commits) should become the single system going forward?**
   *Recommended answer:* Extend the lightweight tool-commit pattern (simpler, actively being developed, better UX with instant pills) to also cover the heavier mutations (create_order, create_invoice, etc.) currently only in the structured system — but retain that system's permission-mapping discipline (`ACTION_PERMISSIONS`) as a mandatory pattern, not an optional one.

2. **Should AI Tools/Assistant usage be gated by role permission in addition to tier/credits?**
   *Recommended answer:* Keep it tier-gated (current model), but any AI tool/action that *reads or reveals* sensitive data (financial metrics, cost/margin numbers, customer PII) should additionally require the same permission a human-driven page would need for that same data — closing the `query_shop_metric` gap specifically, without over-restricting purely-generative tools (image/text creation) that don't touch sensitive records.

3. **Is "AI prompt library" meant to be a literal, user-facing reusable-template feature, or was the domain description referring to the existing Saved Commands/Routines?**
   *Recommended answer:* Flag to product — if a real template library (with variables, sharing, categories) is wanted, it's 0% built today and should be scoped as new work, not assumed to already exist.

4. **Should the 5 fragmented AI logging collections be merged into one, and if so, is a data migration needed for historical rows, or can the rebuild start the unified log fresh?**
   *Recommended answer:* Start fresh post-rebuild; historical `ai_history`/`ai_action_audit` rows can remain queryable read-only for legacy lookups rather than migrating shapes.

### Build-readiness status
**Partially build-ready.** The credit system itself (the financial backbone of this whole domain) is genuinely well-built and can be trusted as a foundation. However, the domain has a real architectural fork (two assistants with different powers), two confirmed real-money credit leaks (uncharged LLM calls), and a permission-enforcement pattern that is inconsistent in exactly the same way multiple other domains in this investigation series have already shown. Recommend resolving Open Decision #1 (which assistant surface survives) before investing further feature work into either.

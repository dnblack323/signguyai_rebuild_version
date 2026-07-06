# SignGuyAI Rebuild — PRD / Memory

> **PROCESS RULE**: Before porting/rebuilding ANY feature from the legacy repo
> (`github.com/dnblack323/signguyai`), run the full audit in
> `/app/memory/FEATURE_MIGRATION_PREFLIGHT_PROTOCOL.md` first (Sections 1-4: rules → investigation →
> preflight audit → implementation plan) before writing any code. This applies to every future
> feature migration session, not just this one.

## Original Problem Statement
Repo `signguyai_rebuild_version` pulled into Emergent. User requested a VERIFICATION-ONLY pass:
1. Read `REBUILD_RECOVERY_PLAN.md`, `PHASE_0_DECISIONS.md`, `DOCS_INDEX.md` at repo root (source of truth for scope/resume point).
2. Verify app boots cleanly under Emergent's setup (backend `.env` has `MONGO_URL`/`DB_NAME`, frontend `.env` has `REACT_APP_BACKEND_URL`, supervisor status for both services).
3. Hit `/api/health`, screenshot frontend to confirm no blank page.
4. Report blockers. Do NOT build new features.

## Product Context (from PHASE_0_DECISIONS.md / REBUILD_RECOVERY_PLAN.md)
- SignGuyAI OS: full SaaS for sign/print/wrap shops. Modules: CRM, Quotes→Orders→Invoices, Order Items with `production_required` flag, Production Board, Document Library (DocuLink), Pricing engine, Customer Portal Lite, Webstores/Order Portal add-on, Wrap Lab add-on, Platform Admin.
- Canonical flow: `Quote -> Order -> Invoice`. Terminology: use `Orders`/`Order Items`, never `Jobs`/`Job Tickets`.
- Current recovery phase: **Release 0 foundation closure** — Auth, real tenant membership, billing, entitlements, launch gates, observability, platform admin are the biggest missing pieces. Preview tenant header (`preview-shop`) still stands in for real auth (explicitly deferred — user told Codex "hold off on logins, Emergent will handle that part").
- Do NOT build: payroll, QuickBooks, Twilio, full AI, multi-location, deeper Webstores checkout, production-board depth — until Release 0 auth/tenant/permission foundation lands.

## Architecture (as found)
- Backend: FastAPI (`backend/server.py` mounts routers under `/api`: health, auth, users, activity, billing, communications, doculink, customers, orders/items, platform_admin, pricing_foundation, settings, shared_systems, tenants, webstores, wrap_lab). Mongo via motor, tenant-scoped repositories, UUIDv7 ids, integer-cents money.
- Frontend: CRA + Craco, React 19, Tailwind, Radix UI, `frontend/src/App.js` app shell with workspace rail/ribbon, `frontend/src/data.js` static nav/mock data, `frontend/src/lib/api.js` axios wrapper using `REACT_APP_BACKEND_URL`.
- Backend test suite: 84 unittest/pytest tests across activity, auth, billing, communications, customers, doculink, orders, platform_admin, settings, shared_systems, tenants, wrap_lab.

## Verification Pass — What Was Done (2026-02, this session)
- Read all 3 control docs (recovery plan, phase-0 decisions, docs index).
- **Found blockers (root cause of app not booting), fixed as part of the boot-verification ask (not new features):**
  1. `backend/.env` and `frontend/.env` did not exist at all → created with `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS` (backend) and `REACT_APP_BACKEND_URL`, `WDS_SOCKET_PORT` (frontend).
  2. `backend/core_runtime.py` never called `load_dotenv()` anywhere in the codebase (dotenv was in requirements.txt but unused) → added `load_dotenv()` load of `backend/.env` at module import time. This was the actual root cause of the `RuntimeError: Missing required environment variables` crash loop.
  3. Frontend dev server rejected the Emergent preview proxy host ("Invalid Host header") → added `devServer: { allowedHosts: "all" }` to `frontend/craco.config.js`.
- Restarted backend/frontend via supervisor after each `.env`/config change.
- Confirmed `/api/health` returns `200 {"status":"healthy",...}` both internally (`localhost:8001`) and via the external preview URL.
- Screenshot confirms frontend renders the full Command Center dashboard (not blank) — billing snapshot, orders, production snapshot, onboarding checklist all visible.
- Ran backend verification commands from the recovery plan itself: `python -m compileall backend` (pass), `pytest backend/tests` (84/84 passed).
- `git log` shows repo history intact (latest commit `f5fc753 YARN`), `git status` shows only the 3 files touched this session plus an untracked `frontend/yarn.lock`.

## Remaining Known Blocker (reported, NOT fixed — out of verification scope)
- **Wrap Lab CSS font 404 in dev overlay**: `src/components/wrap-lab/wrap-lab.css` references `/wrap-lab-assets/fonts/GlacialIndifference-{Regular,Bold}.otf` as a root-absolute `url()`. The font files DO exist at `frontend/public/wrap-lab-assets/fonts/`, but CRA's css-loader tries to resolve the absolute path as a webpack module relative to the CSS file's folder rather than as a public-root static URL, producing a "Module not found" compile-overlay error in dev mode. It does not crash the app (dashboard renders fully underneath the overlay) but it is an intrusive dev-only error banner and would need a webpack/css-loader config change (e.g. `css-loader` `url: { filter }` override) or moving fonts to be imported from `src/` — deferred since Wrap Lab is explicitly a lower-priority module per the recovery plan ("keep Wrap Lab but do not let it drive the core rebuild").

## Next Action Items (per REBUILD_RECOVERY_PLAN.md "Resume From Here")
- P0: Real Auth + Tenants/Users/Roles/Permissions module (replace `preview-shop` header dependency) — currently deferred per user's Codex-thread instruction to let Emergent own auth. Confirm with user before starting.
- P0: Fix Wrap Lab font-loading webpack/css-loader issue (cosmetic dev-overlay, not launch blocking, but should be cleaned up).
- P1: Finish Release 0 foundation (billing, entitlements, launch gates, audit log, object storage, email provider).
- P1: Release 1 core shop workflow completion (Quotes, Quote→Order conversion, Invoices, Production Board, Customer Portal Lite, Proof approval).
- P2: Webstores/Order Portal real backend (currently preview/spec only).
- P2: Wrap Lab kept as add-on track, revisit after Release 1.

## Session 2 (2026-02) — Dual-Repo Investigation + Auth/Tenants/Users Module Build

### Documents reviewed (uploaded by user)
- `emergent masterplan.pdf` — governance rules: integer-cents money, thin-routes/thick-services, canonical status enums, tenant isolation at query level, JWT HS256, two Stripe contexts (direct invoices vs. Stripe Connect for Webstores).
- `SignGuyAI_Rebuild_Master.docx` (v2, supersedes v1) — confirmed current rebuild's dashboard IS the accepted "Codex dashboard" baseline; static audit of legacy repo flags anti-patterns (monolithic server.py, DB logic in routes, broad CORS) that must NOT be copied when porting legacy business logic; **3 canonical migration conflicts flagged**: (1) Orders/Order Items vs. legacy Jobs/Job Tickets naming — RESOLVED, rebuild uses Orders/Order Items; (2) Plans/product-lines vs. tiers/founders billing — see fee structure doc below; (3) canonical vs. legacy pricing engine — still open, needs legacy `pricing.py` (112KB) review when Pricing Calculator is built.
- `CHAT'S FEE STRUCTURE.pdf` — SignGuyAI's own SaaS subscription/billing pricing (Founder Edition $119→$189/mo, GA tiers, Stripe platform fees, AI credit packs). This is the **Billing/Founders-Plan module spec**, NOT the customer-facing job/quote pricing calculator. Filed for later Billing module work.

### Legacy repo investigation (github.com/dnblack323/signguyai)
- 2,375-commit, production-tested monolith with full Auth, Billing+Stripe, Employees/Payroll, AI tools (185KB `ai.py`), Pricing engine (112KB `pricing.py`), Webstores, Documents, Order Drawings/Signatures, Platform Admin, Questionnaires, Inventory, Email deliverability.
- **Key discovery**: `memory/` folder contains pre-written `*_REBUILD_DOC.md` blueprint specs for every module (Auth 87KB, Tenants 102KB, Users/Roles 72KB, Settings 69KB, Orders 40KB, Webstores 57KB, Files 62KB, Email 26KB, Inventory 24KB, Finance 28KB) plus `EXTERNAL_REBUILD_IMPORT_PREP_INSTRUCTIONS.md` confirming this rebuild repo was deliberately stripped down (Vite→CRA, TS→JS) with Auth/Tenant/Billing left as placeholders on purpose, for Emergent to build for real using the legacy app as source of truth.
- Extraction strategy: rewrite legacy business logic into rebuild's thin-routes/services/repository pattern — never copy legacy monolith files directly.

### Confirmed scope ("core features first")
Auth + Tenants/Users/Roles + Customers + Quotes + Orders/Order Items + Invoices + Pricing Calculator. Webstores deferred (Release 2), AI/Payroll/Wrap-Lab-depth deferred.

### Built this session: Auth + Tenants + Users/Roles/Permissions (real, replacing preview-header fake auth)
- Backend: `repositories/users.py`, `services/auth_service.py` (bcrypt, brute-force lockout 5 attempts/15min, forgot/reset password via console-logged link), extended `routes/auth.py` (register/login/logout/forgot-password/reset-password), reused existing `core_runtime.py` HS256 bearer-token infra and `models/access.py` canonical Role/Permission enums (already correctly scaffolded pre-session).
- `SIGNGUYAI_AUTH_MODE` flipped from `preview` to `enforced` — all API routes except `/api/health`, `/api/release`, `/api/digest`, `/api/auth/*` now require a real Bearer token.
- Startup seed: `owner@signguyai.test` demo account (see test_credentials.md).
- Frontend: real `AuthContext.js`, `pages/auth/{Login,Register,ForgotPassword,ResetPassword,AuthShell}.js`, React Router added (`/login`, `/register`, `/forgot-password`, `/reset-password`, protected `/*`), `lib/api.js` auto-attaches Bearer token, TopBar shows real user + logout.
- Fixed 2 pre-existing bugs surfaced during smoke-testing: MongoDB partial-index `$ne` operator unsupported (customers.py index), missing `ASCENDING` import in `repositories/customers.py` (both were blocking `GET /api/customers` entirely, unrelated to auth).
- **Testing agent pass 1**: 16/16 backend pytest passing, frontend auth flows (register/login/logout/error-states/lockout/forgot/reset) all verified via Playwright. Found & fixed: (1) CRITICAL tenant-slug `DuplicateKeyError` 500 on company-name collision → fixed via tenant_id-suffixed slugs; (2) stale `FRONTEND_URL` in `.env` → corrected; (3) Wrap Lab regression — `wrap-lab.css?inline` (Vite-style import, incompatible with CRA's css-loader) threw `.replaceAll is not a function` → fixed via craco webpack rule using `asset/source` for `?inline` CSS imports. All 3 verified fixed post-fix (curl + screenshot).

## Credentials
See `/app/memory/test_credentials.md` — real auth is now live (`SIGNGUYAI_AUTH_MODE=enforced`), seeded demo account `owner@signguyai.test`, plus freshly-registered test accounts created during testing.

## Next Action Items
- P0: Deepen Quotes → Orders → Invoices workflow (Quote-to-Order conversion, line items, production_required flag) using legacy `NEW_ORDER_WORKFLOW_REBUILD_DOC.md` as blueprint.
- P0: Pricing Calculator — needs legacy `pricing.py` (112KB) + `PRICING_FOUNDATION_*.md` docs reviewed to resolve migration conflict #3 (canonical vs. legacy pricing engine).
- P1: Add data-testid coverage across the main App shell nav rail/workspace-switch buttons (currently only `topbar-logout-button` has one) — flagged by testing agent as limiting further automated UI regression testing; defer full sweep until actively touching that navigation code for Customers/Orders/Quotes work.
- P1: Billing/Founders-Plan module using `CHAT'S FEE STRUCTURE.pdf` as spec, once core workflow is solid.
- P2: Webstores (Release 2), Wrap Lab depth, AI Hub, Employees/Payroll — all deferred per confirmed scope.

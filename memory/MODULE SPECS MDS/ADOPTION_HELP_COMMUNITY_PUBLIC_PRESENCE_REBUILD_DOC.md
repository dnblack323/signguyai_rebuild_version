# Adoption, Help, Community & Public Presence — Rebuild Scope Document

**Investigation date:** 2026-02-15 (session continuation)
**Mode:** Documentation only. No code was written or modified. Investigated as a separate bundle per user instruction, using the "Feature Bundle" template (Purpose / Feature List / Shared Dependencies / Core Workflow / Required Data & Rules / Recommended Rebuild Plan).

**Context note from user:** No real production customers exist yet (family/test accounts only), and no customer data needs to be preserved through the rebuild. This removes any data-migration constraint from this bundle's Open Decisions — findings below are scoped purely to functional/architectural gaps, not data-preservation risk.

---

## 1. Purpose

**What this bundle does:** Everything that helps a new or existing tenant get set up, get unstuck, and everything the public sees before signing up — onboarding/setup progress tracking, the documentation/help center, the cross-tenant community board (bugs/features/questions), the public contact/support intake forms, and the public marketing/pricing site.

**Who uses it:**
- New tenant Owners (onboarding checklists, Getting Started docs, setup flow)
- All tenant staff (Docs, Community Board, in-app Help/Contact links)
- Platform Admin (a separate, manual per-tenant onboarding-assistance checklist — distinct from the tenant-facing one, see §2)
- Anonymous website visitors / prospects (marketing pages, pricing, public contact/support forms)

**Why it belongs together:** All of these are "how does a user learn about, get help with, or engage with the product outside of doing their core job" — they are adoption/support/marketing surfaces, not core sign-shop business workflows. Grouping them lets the rebuild apply one consistent "help & growth" design language and, more importantly, resolve the fragmentation found below (3 separate onboarding systems, a write-only contact form) in one pass.

---

## 2. Feature List

| Feature | Purpose | Keep / Merge / Simplify / Postpone / Remove |
|---|---|---|
| **Tenant Onboarding Program** (`routes/onboarding.py`, `OnboardingHub.js`, `OnboardingChecklist.js` dashboard widget) | 3-tier (Quick Start / Standard Setup / Full Optimization), ~29-step checklist with auto-detected completion (derived from real data: has an employee, has a job, has pricing configured, etc.) plus manually-markable steps | **Keep — this is the best-built piece of this bundle.** Real, well-designed derived-completion logic. |
| **Dashboard "Onboarding Status" endpoint** (`GET /dashboard/onboarding-status`, `OnboardingStatus` model in `routes/dashboard.py`) | A second, independent 10-boolean-flag onboarding-progress calculation (has_customers, has_pricing_config, has_webstores, etc.) | **Remove (confirmed dead code)** — full-repo grep confirms zero frontend call sites use this endpoint. It duplicates ~half of what `/onboarding/status` already computes, with different logic and no shared code between them. |
| **Platform-Admin Tenant Onboarding Checklist** (`OnboardingChecklistTab.js`, `/platform-admin/tenants/{id}/checklist*`) | A THIRD, separate manual checklist — lets a Platform Admin track/note "did I personally help this specific tenant with X, Y, Z" from the Platform Admin side | **Keep, but rename/clarify.** This is legitimately a different audience (Platform Admin support-ops tracking, not tenant self-service) — not a duplicate bug, but its near-identical name to the tenant-facing system (both called "onboarding checklist") is confusing and should be renamed in the rebuild (e.g., "Tenant Support Checklist") to avoid the appearance of triplication. |
| **Documentation / Help Center** (`/docs/*`, `DocsLayout.js` + 15 topic pages + FAQ) | Static, publicly-accessible (no login required) written documentation per major feature area | **Keep, consolidate authorship.** Good coverage breadth (15 topics). No interactive tutorials exist (see below) — purely static text/screenshots. |
| **"Getting Started" guide** (`docs/GettingStarted.js`) | First-run walkthrough content | **Keep** — but note it's just another static Docs page, not a guided in-product flow. |
| **Interactive product tours/tutorials** | Named explicitly in the domain scope ("tutorials") | **Does not exist.** Confirmed via dependency check — no product-tour library (react-joyride, driver.js, Shepherd, etc.) is installed or used anywhere. If step-by-step interactive walkthroughs (not just static doc pages) are a real requirement, this is 0% built and needs to be scoped as new work. |
| **Hover help / contextual field-level help** | Named explicitly in the domain scope | **Barely exists.** Only generic navigation-label tooltips (shadcn `Tooltip` primitive used ad-hoc in `TopAppBar.js`/`PrimaryNav.js`/`DocsLayout.js`) — no systematic "hover the (?) icon next to this field to see what it does" pattern anywhere in forms/settings. |
| **Community Board** (`routes/community.py`, `CommunityHub.js`, `/community`) | Bug reports / feature requests / questions / feedback with upvotes, replies, "official" badge for the real platform owner's replies | **Keep the concept, but confirm/fix scope (critical finding).** `list_posts`/`get_post` have **zero tenant-scoping** (`query = {}`), meaning every tenant on the platform sees every other tenant's posts today. This may well be *intentional* (a shared cross-tenant "customer community," which is a reasonable SaaS pattern — the `is_official` reply check for the literal platform-owner email supports this reading), but it is **not documented anywhere as an intentional design choice**, and it has a real side-effect: any user with role `"owner"` in **any** tenant can pin or delete posts belonging to **any other tenant** (`update_post`/`delete_post` check `current_user.role != "owner"` with no ownership/tenant check at all) — i.e., cross-tenant moderator privilege by accident. Needs an explicit rebuild decision (see §6). |
| **Public Contact form** (`/contact`, `POST /api/public/contact`) | Prospect/visitor contact intake | **Fix — currently a write-only black hole.** Confirmed via full-repo grep: submissions are saved to `public_website_inquiries` and **nothing anywhere ever reads that collection back** — no email notification (already tracked in `RUNNING_ISSUE_TRACKER.md` item 4), no admin UI, no export. A prospect's message today has no way to ever reach a human. |
| **Public Support form** (`/support`, `POST /api/public/support`) | Same intake pipe as Contact, different `form_type` tag | **Same fix needed** — shares the exact same black-hole gap as Contact above (confirmed same underlying `_save_inquiry()` helper, same missing read-side). |
| **In-app "Contact Support"** (`PrimaryNav.js`, `mailto:donnell@signguy-ai.com`) | Logged-in users' support contact path | **Keep, but reconcile with the public form.** This bypasses the broken public-form pipeline entirely via a raw `mailto:` link — meaning it actually works today (opens the user's email client), but it means the app has 2 different "contact support" mechanisms for 2 different audiences (logged-in vs. anonymous) with no shared implementation, and the anonymous one is broken while the logged-in one is not. |
| **Release Notes / "What's New"** | Named explicitly in the domain scope | **Does not exist as a user-facing feature.** The closest analog is the Platform Admin's system-wide Announcement Banner (operational notices like maintenance windows), which is a different purpose (urgent ops communication, not feature-release history). No versioned changelog is shown to end users anywhere. |
| **Public Marketing Site** (`LandingPage.js`, `FeaturesPage.js`, `AboutPage.js`, `/`, `/home`, `/features`, `/about`) | Core public-facing marketing pages | **Keep** — actively used, routed as the root `/` experience. |
| **Public Pricing Pages** (`FoundersEditionPricing.js` at `/pricing` + `/founders`, `WhyFounderPage.js` at `/why-founder`, `PricingPlansV2.js` at `/pricing-plans`) | Current, live pricing/positioning pages under the "Founders Edition" go-to-market model | **Keep** — this is the currently-live pricing story. |
| **Archived multi-tier marketing pages** (`pages/marketing/PlatformPage.js`, `AIStudioPage.js`, `WebstoresPage.js`, `plans/{Starter,Pro,Business,WebstoreLaunch,WebstoreGrowth,WebstoreScale,AIBasic,AIPro,AIMax}Page.js` — 12 files) | Pre-Founders-Edition tiered marketing pages (Starter/Pro/Business tiers, à la carte AI/Webstore add-ons) | **Remove (already functionally dead).** Confirmed via `App.js`: all 12 of their routes now `<Navigate to="/pricing-plans" replace />` with an explicit code comment "Marketing - Archived Tier Pages." The files still exist and are still bundled into the frontend build, but are unreachable by any route. Good candidate for actual deletion in the rebuild (not just route-redirect) rather than dead weight in the bundle. |
| **Legal/compliance pages** (`TermsOfService.js`, `PrivacyPolicy.js`, `DataDeletion.js`) | Standard legal pages | **Keep** — out of scope for functional rebuild work, just carry forward as-is. |

---

## 3. Shared Dependencies

- **Users/roles:** Community Board's moderator actions key off the generic `role == "owner"` string with no tenant check (see §2) — needs to reuse whatever unified permission pattern the rebuild adopts, not a bespoke string comparison.
- **Notifications:** None of this bundle currently triggers any in-app or email notification — not the Contact/Support forms (confirmed broken), not new Community replies (no notification to the post's original author when someone replies), not onboarding-step completions.
- **Documents:** Not used by this bundle today.
- **Search:** Community Board has its own bespoke regex `$or` search across title/body/replies — a candidate to reuse a shared platform search utility if the rebuild builds one, rather than reimplementing per-module (already flagged as a pattern to watch in adjacent domains' docs).
- **Settings:** Onboarding derived-completion reads directly from `pricing_configuration`, `production_workflow_settings`, `tenants` — tightly coupled to those domains' schemas; any rebuild of those domains must keep onboarding's derived-checks in sync or they'll silently show false-incomplete/false-complete.
- **Billing/entitlements:** None directly — the public Pricing pages describe entitlements/tiers but don't enforce them (enforcement lives in the Tenants/Billing domain, documented separately).
- **AI credits:** Not used by this bundle.
- **Reports:** Community Board has a `/community/stats` endpoint (total/answered/open/bug/feature counts) — the only "reporting" in this bundle, and it too is unscoped by tenant (global platform-wide counts), consistent with the cross-tenant design question in §2.
- **Other:** SendGrid email service is the obvious missing dependency for both the Contact/Support forms and Community reply notifications — currently wired into zero of these flows.

---

## 4. Core Workflow

**A — New Tenant Onboarding (primary flow):**
1. Owner signs up → lands on Dashboard, sees the `OnboardingChecklist` widget (auto-loads `/onboarding/status`).
2. Clicking "Open Onboarding Hub" routes to `/onboarding` (`OnboardingHub.js`), showing all 3 tiers with derived + manual step statuses.
3. As the Owner does real work elsewhere in the app (adds an employee, configures pricing, creates a job), `compute_step_statuses()` automatically flips the relevant steps to "completed" on next load — no manual action required for most steps.
4. A handful of steps are manual-only (e.g., `standard_notifications`, `full_health_check`) and must be explicitly marked via `PUT /onboarding/steps/{id}`.
5. Session position (`current_tier`/`current_step_id`) persists via `PUT /onboarding/session` so returning to the Hub resumes where the user left off.

**B — Getting Help:**
1. From anywhere in the app, the user clicks the Help icon (`TopAppBar.js`) → opens `/docs` in a new tab (public, no auth needed) → browses 15 static topic pages + FAQ.
2. If docs don't answer the question, the user can go to `/community` (in-app) to search/post a question, or click "Contact Support" (mailto) to email the platform owner directly.
3. A logged-out prospect instead has `/contact` or `/support` public forms — which, per §2, currently disappear into an unread collection with no follow-up.

**C — Community Engagement:**
1. Any authenticated user (any tenant) opens `/community`, browses/searches posts across the whole platform (cross-tenant today).
2. Creates a post tagged `bug_report`/`feature_request`/`question`/`feedback`.
3. Anyone can reply; upvote toggles per-user; only the literal platform-owner account's replies get the "official" badge (and auto-mark the post answered).
4. Only an `owner`-role user (from *any* tenant, today) can pin/unpin a post; the post's author or an `owner`-role user can delete it.

---

## 5. Required Data and Rules

**Main records/fields:**
- `onboarding_progress` — `{tenant_id, step_statuses{}, current_tier, current_step_id, last_opened_at}`.
- `community_posts` — `{id, title, body, category (bug_report|feature_request|question|feedback), status (open|in_progress|resolved|closed), is_pinned, is_answered, author_name/email/tenant_id/role, replies[], upvotes, upvoted_by[]}`.
- `public_website_inquiries` — `{id, form_type (contact|support), name, email, company, subject, message, phone, sms_opt_in, sms_consent{}, ip_address, user_agent, created_at}` — write-only today.

**Permissions:**
- Onboarding: any authenticated tenant user can read/update their own tenant's progress (no distinct role restriction confirmed — likely fine since it's self-service setup guidance, not sensitive data).
- Community: **needs an explicit rebuild decision** on whether "owner" moderator powers should be scoped to the post's own tenant or remain platform-wide (see §6).
- Public Contact/Support: unauthenticated by design (correct — they're pre-signup forms).

**Important validation rules:**
- `PublicInquiryInput` correctly validates `sms_opt_in` requires a `phone`, enforces field length limits, and stores a proper SMS consent disclosure snapshot (version + text) at submission time — this part is well-built from a compliance standpoint, it's purely the "then what happens to it" side that's broken.
- Community post `category` is validated against a fixed 4-value allow-list server-side — good.

**Notifications or automation:**
- None exist in this bundle today (see §3) — this is the single biggest functional gap across the whole bundle.

**External integrations:**
- SendGrid (email) — available platform-wide, simply not wired into this bundle's forms yet.

---

## 6. Recommended Rebuild Plan

**Recommended screens:**
1. Tenant Onboarding Hub — keep current design, it's the strongest piece.
2. Unified Help Center — Docs (as-is) + a real FAQ + (new) a lightweight in-product tour system if tutorials are a real requirement (see Open Decisions).
3. Community Board — keep, but resolve the tenant-scoping question first.
4. A genuinely working Contact/Support intake — must include either an email notification, an admin inbox view, or both.
5. Marketing/Pricing pages — keep only the live Founders-Edition set; delete the 12 archived-tier files outright rather than leaving them as unreachable dead code.

**What should be one combined feature instead of separate modules:**
- Merge the "Dashboard onboarding-status" dead endpoint entirely into the one real Onboarding Program (`/onboarding/status`) — delete it, don't keep two.
- Merge the public Contact form and public Support form into one intake pipeline with a `topic`/`form_type` tag (they already share 100% of their backend code — `_save_inquiry()` — this is really one feature presented as two pages, which is fine to keep as two pages but should share one fixed backend + one shared inbox view).
- Consider merging "Contact Support" (mailto, logged-in) into the same inbox-backed system as the public forms, so support requests from paying tenants aren't a completely separate, ad-hoc channel from prospect inquiries.

**What can wait until later:**
- Interactive product tours/tutorials (0% built, real net-new scope — reasonable to postpone past initial rebuild).
- Release notes / "What's New" feed (0% built).
- Field-level hover-help content (low risk, high effort to author for every field — good candidate for incremental post-launch rollout rather than blocking rebuild).

**Open decisions:**
1. **Is the Community Board intentionally a single shared, cross-tenant space, or should it be tenant-private?**
   *Recommended answer:* Given the "official reply from the real platform owner" pattern already built, this reads as an intentional shared customer-community forum — keep it cross-tenant-readable, but fix the moderator-scope bug so an `owner` role from Tenant A cannot pin/delete Tenant B's posts (should require a genuine Platform Admin role for moderation, not any shop owner).
2. **Should Contact/Support submissions require an email notification, an admin inbox page, or both?**
   *Recommended answer:* Both — email is instant/simple to add (SendGrid already integrated elsewhere), an inbox page gives a durable, searchable record; email alone risks getting buried/missed.
3. **Is "tutorials" meant to be interactive product tours, or is the existing static Docs library sufcient to satisfy that requirement?**
   *Recommended answer:* Flag to product — if genuinely interactive, this is new scope requiring a tour library dependency (e.g., react-joyride) not currently installed.
4. **Should the 12 archived marketing-tier pages be deleted or kept dormant in case multi-tier pricing returns?**
   *Recommended answer:* Since the user has confirmed no real customer data needs preserving through the rebuild, there's no migration risk either way — recommend deleting them now to reduce bundle size and rebuild confusion, and re-author fresh tier pages later if/when a multi-tier model actually relaunches, since pricing/positioning will likely have changed by then anyway.

**Build readiness status:**
**Mostly build-ready, with 2 must-fix gaps before launch-quality.** The Onboarding Hub and Docs/Community foundation are solid and can largely carry forward as-is or with light cleanup. However, the Contact/Support intake pipeline is currently non-functional in practice (messages vanish) and must be fixed before relying on it for real prospect/customer inquiries, and the Community Board's cross-tenant moderator-privilege gap should be resolved before onboarding any real (non-family) multi-tenant customers — which aligns naturally with the user's stated timeline of not having real customers yet.

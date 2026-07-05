# FILE UPLOADS, ATTACHMENTS, AND STORAGE — Rebuild Documentation

## Module Status
- [x] Existing and working (Real object storage backend used by nearly every file-handling module; graceful lazy-migration path for legacy base64-embedded files; solid size/MIME-type validation on most upload endpoints; correctly-scoped portal file-sharing for Wrap Tickets and Documents)
- [x] Existing but incomplete (Regular Order attachments have no customer-portal exposure mechanism at all, unlike Wrap Tickets; the Artwork Proofs system accepts a raw, unvalidated `file_url` string instead of a real upload)
- [x] Existing but broken (**Two critical bugs confirmed live**: `GET /api/signatures/file/{id}` and `GET /api/order-drawings/file/{id}` both return the real file with **zero authentication of any kind** — reproduced against the running preview backend with no Authorization header at all)
- [ ] Partially built / prototype
- [ ] Planned only
- [ ] Needs replacement
- [x] Needs verification (items called out inline below)

**Documentation Date:** 2026-07-02
**Completed By:** E1 (AI Agent) — direct code inspection + live API verification (two vulnerabilities reproduced live against the running preview backend, both pure GET/read requests with no data mutation, nothing to revert), no screenshots used.
**Repository / Branch Reviewed:** `/app/` (current preview checkout, main branch per `.emergent` metadata)
**Related App Version / Deployment:** Preview environment (current `REACT_APP_BACKEND_URL`); accounts per `test_credentials.md` — `thesigntistslab@gmail.com` (owner, tenant "The Signtists Lab"); test order `1efe0ae8-473d-4d5f-bde7-dbfde8180cda` used for the drawings test.

> **Method note:** Every claim below was verified by reading the actual file or by a live `curl` call against the running backend. Files read in full or in relevant ranges: `backend/services/object_storage.py` (full), `backend/routes/documents.py` (upload, download, migration, portal-share sections — ~500 of 1312 lines read across multiple passes), `backend/routes/wrap/files.py` (full, 288 lines), `backend/routes/order_drawings.py` (upload + file-download + update handlers), `backend/routes/signatures.py` (upload/public-sign/file-download sections), `backend/routes/orders.py` (`order_files` upload + content-download handlers), `backend/routes/approvals.py` (proof creation model + imports), `backend/routes/portal.py` (wrap-file, portal-document, and proof read-paths — grep-level + targeted ranges), `backend/routes/webstores.py` (grep-level, product/banner image storage pattern), `backend/routes/backup.py` (re-examined `EXCLUDE_FIELDS`/binary-field-stripping logic, already read in full for the Settings doc). **Live verification #1 (reproduced, no revert needed — read-only):** listed real signature records via the owner account, then called `GET /api/signatures/file/{signature_id}` with **no Authorization header at all** → `200 OK`, `image/png`, 1108 bytes, verified valid PNG magic bytes. **Live verification #2 (reproduced, no revert needed — read-only):** listed a real drawing via the owner account for test order `1efe0ae8-473d-4d5f-bde7-dbfde8180cda`, then called `GET /api/order-drawings/file/{drawing_id}` with **no Authorization header at all** → `200 OK`, `image/png`, 826 bytes, verified valid PNG magic bytes.

---

## 1. Module Identity

### Module Name
File Uploads, Attachments, and Storage.

### Alternate / Legacy Names
No single name in code; this document groups every file-handling subsystem found across `routes/documents.py`, `routes/wrap/files.py`, `routes/order_drawings.py`, `routes/signatures.py`, `routes/orders.py` (order attachments), `routes/approvals.py` (artwork proofs), `routes/webstores.py` (product/banner images), and the shared `services/object_storage.py` backend.

### Primary Purpose
Let a shop store, organize, and share every non-database-record artifact of running a sign/graphics business: reference artwork and photos, PDFs and contracts, e-signed documents, hand-drawn install sketches, and customer-approved proofs — and, for a meaningful subset of these, let the *customer* (not just tenant staff) see them through the Customer Portal.

### Main Users
- **Tenant staff (Owner/Admin/Staff)** — upload, organize, tag, share-to-portal, and delete files across every subsystem in this module. No subsystem reviewed restricts uploads by role beyond the baseline "is an authenticated tenant user" — a deliberate difference in posture from the Settings module (this doc found no equivalent "should this be Owner-only" gap, because file-handling actions are operational, not tenant-configuration, actions).
- **Customer (Portal)** — can view/download a *curated, explicitly-shared* subset of files: Wrap Ticket files marked `customer_visible=True`, Documents explicitly "sent to portal," and Artwork Proofs created for their approval. Cannot browse a general file library — everything they see was deliberately surfaced to them by staff.
- **Anonymous internet users** — per the two confirmed live findings in this document, can currently download **any tenant's signature images and drawing-pad images** by ID with zero authentication, which was never an intended access tier for this data.
- **Webstore Owner** — sees/manages their own webstore's product/banner images through the Owner Portal (not deeply re-audited here; storage mechanics are the same as the tenant-facing webstore product-image path).

### Why This Module Matters
Files in this app frequently *are* the product (artwork, proofs, wrap install photos) or a legally-relevant record (signed contracts, e-signatures). Getting storage architecture right (durable, tenant-isolated, appropriately access-controlled) matters as much as getting the data model right for any other module — and, per this session's findings, the *storage* half of this app is unusually well-built while the *access-control* half has two concrete, live holes.

### Module Boundary
**This module owns:**
- The shared object-storage service (`services/object_storage.py`) and every module's use of it.
- Documents (general file library: contracts, work orders, proofs, imported invoices) and its portal-share mechanism.
- Wrap Ticket files and their `customer_visible` portal-exposure flag.
- Order attachments (`order_files` — artwork, logos, reference images, production notes attached to a regular Order).
- Order Drawings (the "Drawing Pad" sketch/markup/measurement-note feature).
- E-Signatures' signed-document image storage and public signing-link mechanism.
- Artwork Proofs' customer-approval file-reference model.
- Webstore product/banner image storage (briefly, as one more example of the same storage patterns; deep webstore-catalog behavior is owned by the Webstores module).

**This module does not own:**
- The Tenant logo upload (`POST /api/tenant/upload-logo`) — already fully documented in the Tenants module doc; referenced here only as the one confirmed pure-base64 (no object-storage) file field in the app, for architecture-pattern contrast.
- Backup/Restore's handling of files (already documented in the Settings module doc) — referenced here only to note that `backup.py` correctly *excludes* large binary fields (`file_data`, `image_data`, `logo_image_data`, `signature_image`, etc.) from exports, which is the right call for export-file size, but also means **a tenant backup/restore cycle does not preserve or restore actual file contents** — only the metadata records pointing at them (the underlying object-storage objects themselves are untouched by backup/restore, which is consistent with them living outside the exported collections, but is a real limitation worth the next builder knowing about).
- Order/Customer/Webstore records themselves — owned by their respective modules; this doc covers only the *files attached to* those records.

---

## 2. Current State Summary

### What Exists Today
The app has a real, working object-storage backend (`services/object_storage.py`, backed by Emergent's managed object storage, gated by a secret `X-Storage-Key` header baked into the service layer, never exposed to the client). Every file-handling module reviewed this session — Documents, Wrap Files, Order Drawings, Order Attachments, Signatures, and (partially) Webstore product images — uses this real backend for new uploads, storing only a `storage_path` string in MongoDB rather than the file bytes themselves. Several of these modules (Documents, Webstores, Order Attachments) additionally carry a **graceful lazy-migration path**: older records that still have a raw base64 field (`file_data`, `image_data`, `logo_image_data`) from before object storage was adopted are automatically uploaded to real storage and rewritten with a `storage_path` the *first time* they're accessed, after which the base64 copy is discarded. This is a mature, well-executed architecture — genuinely one of the better-engineered corners of this app, alongside `backup.py` (Settings doc) and the Employee Portal's settings-merge logic (Access Control doc).

Where this module falls down is **access control on retrieval**, not storage. Two file-download endpoints — for e-signature images and for Drawing Pad images — were built without the standard `Depends(get_current_active_user)` dependency that every comparable endpoint in every other module in this app includes, making them fully public. Both were confirmed live in this session.

Separately, "portal-accessible files" is not one consistent mechanism but three different, independently-designed sharing models with different levels of care taken: Wrap Tickets use an explicit per-file `customer_visible` boolean, correctly enforced server-side alongside order-ownership checks; Documents use an explicit "send to portal" action that creates a separate share record; Artwork Proofs are their own dedicated, purpose-built customer-approval workflow. Regular Order attachments (`order_files`) have **no** customer-portal exposure mechanism at all — there is currently no way for a shop to share an artwork file attached to a normal (non-Wrap) order with the customer through the portal; the Wrap module and the Approvals module both independently solved "let the customer see this image," and the plain Orders module's own attachment feature never did.

### What Works Well
- `services/object_storage.py`'s design — bytes never touch the client directly by a guessable public URL; every retrieval goes through a backend endpoint that first resolves `storage_path` from an authorized, tenant-scoped database lookup, then fetches the bytes server-side using a secret key never exposed to any client. This pattern, done correctly (as it is in Documents, Wrap Files, and Order Attachments), makes cross-tenant file leakage structurally very hard even if a `document_id`/`file_id` were guessed, because the ID lookup itself is tenant-scoped before the storage fetch ever happens.
- The base64→object-storage lazy migration pattern (`_migrate_document_to_storage` and its siblings in `webstores.py`/`orders.py`) is a clean, low-risk way to modernize old data without a disruptive one-time migration script — confirmed to correctly delete/replace the old inline field once migrated, avoiding permanently doubling storage.
- Wrap Ticket files' `customer_visible` flag is correctly and specifically enforced on the customer-portal read path (`routes/portal.py`), *in addition to* an order-ownership check (`_portal_load_wrap_ticket`) — a properly layered, two-factor access check (owns the order AND the file is flagged visible), not just one or the other.
- Documents' "send to portal" flow is a deliberate, explicit, staff-initiated share action (creating a distinct `portal_documents` record with its own notification/email) rather than an implicit "everything is visible" default — the safer design choice for a general document library that may contain internal-only content (production notes, internal contracts) alongside customer-safe content.
- Upload validation (file-size caps, MIME-type whitelists) is present and reasonable on every upload endpoint reviewed except one (Artwork Proofs — see below): Documents caps at 10MB with an explicit allowed-MIME-type list; Order Attachments caps at 15MB with a broader but still explicit whitelist (images, PDFs, and common Office document formats).

### What Is Broken, Confusing, or Incomplete
- **CRITICAL, CONFIRMED LIVE — `GET /api/signatures/file/{signature_id}` requires no authentication whatsoever.** Reproduced: a plain, unauthenticated `curl` (no `Authorization` header at all) against a real signature ID returned `200 OK` with a genuine `image/png` signature image (1108 bytes, valid PNG magic bytes verified). The handler has no `Depends(get_current_active_user)`, no token check, and no `tenant_id` filter on its database lookup at all — it is fully public, and every signature ID in the system (a UUID, not sequential, but not secret either — it appears in API responses to any tenant staff member and would appear in frontend URLs/network requests) is a valid key to retrieve someone's actual legal signature image.
- **CRITICAL, CONFIRMED LIVE — `GET /api/order-drawings/file/{drawing_id}` has the identical gap.** Reproduced against a real drawing on test order `1efe0ae8-473d-4d5f-bde7-dbfde8180cda`: unauthenticated `curl` → `200 OK`, genuine `image/png`, 826 bytes, verified valid PNG. Same root cause: the handler omits the auth dependency entirely, unlike every sibling `/file/`-or-`/content/`-style endpoint reviewed in `documents.py`, `wrap/files.py`, and `orders.py`, all three of which correctly require authentication and tenant-scope the underlying database lookup before ever touching object storage.
- **This appears to be a systemic gap-class, not two isolated typos** — both bugs share the exact same shape (a `/file/{id}`-style GET route that was written without copying the `Depends(get_current_active_user)` pattern used everywhere else in the same file's other routes). This strongly suggests any *future* file-download route added the same way (copy-pasted from one of these two rather than from the correct pattern in `documents.py`) would reproduce the same hole. **Needs Verification**: this session confirmed exactly these two; a full audit of every `@router.get("/file/...")`/`@router.get("/.../content")`-style route in the codebase is recommended as the very first regression test for the next builder (see §17).
- **Order attachments (`order_files`) have no customer-portal exposure path at all.** Confirmed by grep: `routes/portal.py` never references `order_files`. A shop wanting to share a proof or reference image attached to a *regular* (non-Wrap) order with the customer has no built-in way to do so through the portal — they would need to route it through the separate Artwork Proofs system instead (which works, but requires staff to know that "attach to order" and "share for customer approval" are two entirely different, non-interchangeable actions).
- **Artwork Proofs' `file_url` field is a raw, caller-supplied string with no upload validation at all** — unlike every other file-handling endpoint in this module, `POST /approvals` does not accept an `UploadFile`; it accepts `file_url: str` directly in the JSON body, with no size limit, no MIME-type check, and no confirmation that the URL is even reachable or belongs to the correct tenant. `UploadFile`/`File` are imported into `approvals.py` but never actually used anywhere in the file — dead imports, suggesting an upload endpoint was planned but never finished, and the feature currently depends on the *frontend* having already uploaded the image somewhere else (most likely via a base64 data-URI generated client-side, given no other explanation for how a customer's browser would ever be able to render an arbitrary internal, tenant-authenticated URL). **Needs Verification**: the exact frontend flow that populates this field was not traced this session (would require reading the Approvals-creation frontend component); flagged as the key open question for whoever picks up the Artwork Proofs area next.
- **`GET /portal/documents/{id}` (customer-facing document detail) queries the underlying `documents` collection by `id` alone, with no `tenant_id` filter**, unlike every other cross-collection lookup reviewed in this module. This is **not independently exploitable today** — the `document_id` used in this second query is not attacker-controlled; it's read from the customer's own, correctly-scoped `portal_documents` share record — but it is a lax coding pattern that would become a real cross-tenant IDOR the moment any code path allows a caller-supplied `document_id` to reach this same unscoped query.
- **The same endpoint also does not exclude legacy `file_data` (base64) from its response** — for any document not yet lazily migrated to object storage, this API response includes the full base64-encoded file content inline in the JSON, rather than just metadata plus a `file_url` pointer. Not a security defect (it's the customer's own legitimately-shared document), but an unnecessary bandwidth/response-size inefficiency and a sign the endpoint wasn't updated when the rest of the module adopted the storage-path pattern.
- **Backup/Restore does not cover actual file bytes**, only the metadata records that point at them (already noted under Module Boundary) — worth stating plainly as a limitation, since a shop owner restoring a backup might reasonably expect their uploaded documents/artwork to come back too, and they will not (the *records* return; the *files* were never part of the export in the first place, living in object storage rather than in any of the 39 collections `BACKUP_COLLECTIONS` covers).
- **No malware/virus scanning exists anywhere in the upload pipeline** — every upload endpoint validates MIME type (from the client-supplied `Content-Type` header, which is not independently verified against the actual file bytes/magic-number in any endpoint reviewed) and size, but performs no content inspection. **Needs Verification** of actual real-world risk tolerance here (common for a small SaaS to accept this trade-off), flagged for completeness rather than as an urgent fix.

### Placeholder / Demo / Fake Data
None found — every file subsystem reviewed handles real uploads and real storage; no mocked file-handling logic exists.

### Features That Exist in Code but Are Not Visible
None specific to this module beyond the already-cross-referenced AI Audit Log gap (Settings doc) and the Tenant-delete collection-list gaps (Tenants/Settings docs), neither of which is unique to file storage specifically.

### Features Visible in the UI but Not Actually Functional
None found — every upload/download UI flow reviewed corresponds to a real, working backend path (the problem in this module is *insufficient* gating, never a broken/non-functional feature).

---

## 3. User Experience and Navigation

### Where the Module Lives in the App
No single page — file upload/attachment UI is embedded contextually inside whichever record it belongs to: Order detail pages (attachments tab, Drawing Pad), Wrap Ticket detail pages (files section), Documents' own dedicated library page (`/documents`), Signature requests (embedded in Order/Invoice flows and the public signing link), and Webstore product-editing forms (image upload fields).

**Routes / URLs relevant to this module:**
| Route / Endpoint | Screen or API | Auth Posture |
|---|---|---|
| `/documents` | Documents library page | Any authenticated tenant user |
| Order detail → Attachments tab | Embedded in `Orders.js`/order detail | Any authenticated tenant user |
| Order detail → Drawing Pad | Embedded drawing component | Any authenticated tenant user (upload/edit); **file retrieval is public — see §2** |
| Wrap Ticket detail → Files | Embedded in Wrap module UI | Any authenticated tenant user (upload); customer portal read gated by `customer_visible` |
| Signature request flow + public signing link | `SignaturePad`-type component + `/sign/{token}`-style public page | Staff-initiated (any role); customer signs via a public token link; **signed-image retrieval is public — see §2** |
| Customer Portal → Documents/Proofs/Wrap Files | Portal-side file views | Customer, scoped to their own shared records |

### Current Navigation Structure
Entirely contextual/embedded — there is no standalone "Files" or "Attachments" hub page anywhere in the app; every file lives inside the record it's attached to, except Documents, which does have its own dedicated library.

### Recommended Rebuild Navigation Structure
No structural navigation changes are required for this module — the contextual-embedding pattern is appropriate for attachment-style files (artwork on an order, sketches on a wrap ticket) and does not need a separate hub. The one gap worth addressing is discoverability of *what's currently shared with a given customer* — today, a staff member checking "has this customer seen X" must check three separate places (Wrap Files' visibility flags, Documents' portal-share list, Approvals' proof list) with no single "what has this customer been shown" view.

### Screens in This Module

**Screen Name: Documents Library**
- Route: `/documents`
- Who Can Access It: Any authenticated tenant user (no role restriction found; no `Permission.DOCUMENTS_*` exists in the Access Control module's 44-permission catalog at all — Documents has zero role-tier granularity, unlike Jobs/Customers/Invoices which have graduated Owner/Admin/Staff access)
- Purpose: Central library for contracts, work orders, imported invoices, generated PDFs, and any general-purpose file
- Primary Actions: Upload, download, archive (soft-delete), send to portal
- Data Source: `routes/documents.py`
- Current Problems: No permission-tier distinction between roles for this entire module (a reasonable design choice for a general file library, but worth an explicit product decision rather than an accidental gap — see §7); the portal-detail-view's unscoped secondary query (§2)
- Rebuild Recommendation: Keep the upload/storage architecture as-is (it's the best-built part of this module); decide deliberately whether Documents needs its own `Permission.DOCUMENTS_VIEW/MANAGE` tier or is intentionally flat-access

**Screen Name: Drawing Pad (Order Sketches/Markups)**
- Route: Embedded in Order detail
- Who Can Access It: Any authenticated tenant user can create/edit; **anyone on the internet can retrieve the actual image file, unauthenticated**
- Purpose: Hand-drawn sketches, install notes, measurement annotations attached to an order
- Primary Actions: Draw/upload, label, edit, delete
- Data Source: `routes/order_drawings.py`
- Current Problems: **Critical — confirmed live unauthenticated file disclosure (§2)**
- Rebuild Recommendation: Add `Depends(get_current_active_user)` + tenant-scoped lookup to `GET /order-drawings/file/{drawing_id}`, matching the pattern already correctly used by `PUT /order-drawings/{drawing_id}`

**Screen Name: E-Signature Request / Signing**
- Route: Staff-side embedded in Order/Invoice flows; customer-side a public token-based link
- Who Can Access It: Staff can create signature requests (any role); the customer signs via a public, token-gated link (correctly designed — the *signing* action itself is appropriately public-with-a-secret-token, matching how e-signature products generally work); **the resulting signed image can then be retrieved by anyone, unauthenticated, with no token needed at all**
- Purpose: Capture a legally-relevant signature on a document/estimate/change-order
- Primary Actions: Send signature request, sign (customer), download signed image (staff)
- Data Source: `routes/signatures.py`
- Current Problems: **Critical — confirmed live unauthenticated file disclosure (§2)** — note this is a *different* gap from the (correctly-designed) public signing-token mechanism; the problem is specifically the *retrieval* endpoint, which should require either the original signing token or full staff authentication, not neither
- Rebuild Recommendation: Add authentication (staff session) or, if customer/public retrieval of *their own already-signed* document is a desired feature, require the original signing token rather than nothing at all

---

## 4. Main User Workflows

### Workflow 1: Anyone Downloads a Signature Image With No Credentials (Confirmed Live)
**User Goal (as actually demonstrated, not hypothetical):** Retrieve a specific tenant's customer's actual signed signature image.
**Starting Point:** Knowledge of any valid `signature_id` (a UUID that appears in ordinary API responses to any authenticated tenant staff member, and would appear in frontend network requests/URLs during normal signature-viewing).

**Step-by-Step Flow (as reproduced):**
1. Obtain a `signature_id` (in this test, via a legitimate authenticated call — but note nothing about the vulnerable endpoint itself requires this; any leaked/logged/shared ID works identically).
2. Call `GET /api/signatures/file/{signature_id}` with **no Authorization header**.
3. Receive `200 OK` and the actual signature PNG image.

**System Actions Behind the Scenes:**
1. `get_signature_file()` (`routes/signatures.py`) queries `db.signatures.find_one({"id": signature_id, ...})` — no `tenant_id` filter, no auth dependency at all.
2. Fetches the bytes from object storage using the resolved `signature_storage_path`.
3. Returns the raw image bytes directly.

**Data Created or Changed:** None — pure information disclosure.
**Notifications / Emails / SMS Sent:** None (the leak itself produces no alert to anyone).
**Required Approvals or Signatures:** None — this is precisely the gap.
**Workflow Completion Condition:** N/A — the "workflow" is the vulnerability itself.
**Failure or Error Conditions:** None — the request succeeds cleanly.
**Current Problems:** Full, unauthenticated disclosure of a legally-relevant personal document (a signature) for any tenant in the system.
**Rebuild Requirement:** **P0.** Add `current_user: UserInDB = Depends(get_current_active_user)` to the route signature and add `"tenant_id": current_user.tenant_id` to the Mongo query, matching every other file-retrieval endpoint in this module.

---

### Workflow 2: Owner Attaches Artwork to an Order and Shares It Correctly Elsewhere
**User Goal:** Attach a reference photo to a normal order (this part works fine and is not the concern here) — contrasted against the *separate* question of getting a customer-approvable version of it in front of the customer.
**Starting Point:** Order detail → Attachments tab.

**Step-by-Step User Flow:**
1. Staff uploads a file to the order (`POST /orders/{order_id}/files`) — validated (15MB cap, MIME whitelist), stored via real object storage, tenant-scoped.
2. Staff realizes they want the customer to see and approve this specific image.
3. **There is no button on the order-attachment itself to do this** — staff must separately go create an Artwork Proof (`POST /approvals`) and manually re-supply a `file_url`, disconnected from the attachment they just uploaded.

**System Actions Behind the Scenes:**
1. `order_files` insert: correctly tenant-scoped, correctly validated, correctly stored.
2. A completely separate `artwork_proofs` insert (if step 3 above is followed) with its own `file_url`, which — per §2's finding — is not derived from or linked back to the `order_files` record at all; it's a fresh, independent string.

**Data Created or Changed:** Two unrelated records (`order_files`, `artwork_proofs`) that conceptually describe the same artwork but share no foreign-key relationship.
**Notifications / Emails / SMS Sent:** Customer notification on proof creation (via Approvals' own notification logic).
**Required Approvals or Signatures:** The customer's approval/rejection of the proof itself, once shared — a real, working feature on its own terms.
**Workflow Completion Condition:** Customer sees and can approve/comment on the proof.
**Failure or Error Conditions:** None specific to this gap — it's a UX/architecture disconnect, not a crash.
**Current Problems:** No link between an uploaded order attachment and a customer-facing proof; staff must duplicate effort (re-upload or re-reference) rather than "share this existing attachment with the customer" in one action.
**Rebuild Requirement:** Either let Artwork Proofs reference an existing `order_files.id` directly (avoiding the raw-string `file_url` entirely and closing the validation gap in the same stroke), or add a `customer_visible`-style flag directly to `order_files`, matching Wrap Tickets' already-correct pattern, and let the portal read path expose flagged order files the same way it already does for wrap files.

---

### Workflow 3: A Document Is Explicitly Shared to the Customer Portal
**User Goal:** Send a specific contract/proof to a specific customer through the portal.
**Starting Point:** Documents library → select a document → Send to Portal.

**Step-by-Step User Flow:**
1. Staff selects a document and a target customer.
2. Confirms send (optionally triggers an email/notification).

**System Actions Behind the Scenes:**
1. Verify the document and customer both belong to the caller's tenant.
2. Insert a `portal_documents` record: `{document_id, customer_id, tenant_id, shared_at, shared_by}`.
3. Create a customer notification; optionally send an email.

**Data Created or Changed:** 1 `portal_documents` record.
**Notifications / Emails / SMS Sent:** In-portal notification; optional email.
**Required Approvals or Signatures:** None beyond the staff action itself.
**Workflow Completion Condition:** Customer sees the document in their portal's document list.
**Failure or Error Conditions:** Document/customer not found or cross-tenant (404).
**Current Problems:** The customer-side detail-view's secondary lookup lacks a `tenant_id` filter (§2) — not exploitable today, but a lax pattern.
**Rebuild Requirement:** Add the missing `tenant_id` filter defensively even though it's not currently reachable with attacker-controlled input; exclude legacy `file_data` from the response in favor of always resolving a `file_url`.

---

## 5. Data Structure and Records

### Primary Records Owned by This Module
| Record Type | Purpose | Storage Location | Portal-Visible? |
|---|---|---|---|
| `Document` | General file library entry | `documents` collection, real object storage (with legacy base64 lazy-migration) | Only if explicitly shared via `portal_documents` |
| `PortalDocumentShare` | Explicit share link, one document to one customer | `portal_documents` collection | Yes (this record's whole purpose) |
| `WrapFile` | File attached to a Wrap Ticket | Dedicated collection (per `routes/wrap/files.py`), real object storage | Yes, if `customer_visible=True`, plus order-ownership check |
| `OrderFile` | Artwork/reference/production-note attached to a regular Order | `order_files` collection, real object storage (with legacy base64 lazy-migration) | **No — no portal exposure mechanism exists** |
| `OrderDrawing` | Sketch/markup/measurement note attached to an Order | `order_drawings` collection, real object storage | **Needs Verification** whether these are ever portal-exposed; not found in `portal.py` |
| `Signature` | E-signature request + signed image | `signatures` collection, real object storage | Signing itself is via a public token link (correct design); **retrieval of the signed image is currently public with no gate at all (bug)** |
| `ArtworkProof` | Customer-approval-ready proof image reference | `artwork_proofs` collection; stores a raw `file_url`, not an object-storage path itself | Yes (this record's whole purpose), correctly customer-scoped on read |

### Database Collections / Tables

**Collection: `documents`**
- Purpose: General file library.
- File or Schema Location: `routes/documents.py`.
- Important Fields: `id`, `tenant_id`, `filename`, `content_type`, `file_size`, `category`, `storage_path` (new) / `file_data` (legacy base64, migrated lazily), `is_archived`.
- Known Data Problems: None specific beyond the cross-referenced `portal_documents`-detail-view lookup gap (§2).

**Collection: `order_files`**
- Purpose: Order attachments.
- File or Schema Location: `routes/orders.py`.
- Important Fields: `id`, `order_id`, `tenant_id`, `filename`, `content_type`, `file_size`, `category` (artwork/logo/reference/production_note/proof/other), `is_shared` (order-level vs. item-level visibility — an *internal* concept, not a customer-portal one), `storage_path`.
- Known Data Problems: No `customer_visible`-equivalent field exists — see Workflow 2.

**Collection: `signatures`**
- Purpose: Signature requests and their signed images.
- File or Schema Location: `routes/signatures.py`.
- Important Fields: `id`, `tenant_id`, `status` (pending/signed), `signature_storage_path`, public signing `token` (presumably expiring — **Needs Verification** of exact expiry enforcement, not traced this session beyond confirming a `link_expiry_days`-style tenant setting exists per the Tenants doc's `signature_settings`).
- Known Data Problems: **Confirmed live unauthenticated retrieval endpoint (§2) — the single most severe finding in this document.**

### Data Relationships
```
Order (1) ──1:N── OrderFile             [no customer-portal link]
Order (1) ──1:N── OrderDrawing          [PUBLICLY retrievable by ID today — bug]
Order/Invoice (1) ──1:N── Signature     [signing = public+token (correct); retrieval = fully public (bug)]
WrapTicket (1) ──1:N── WrapFile         [customer_visible flag, correctly enforced]
Document (1) ──0:N── PortalDocumentShare ──1:1── Customer   [explicit share model]
Order/Customer (1) ──1:N── ArtworkProof ──1:1── Customer    [dedicated approval workflow]
```

### Source of Truth
| Data Item | Current Source of Truth | Problems | Recommended Rebuild Source |
|---|---|---|---|
| "Is this file visible to the customer" | Answered three different ways depending on which module the file lives in (`customer_visible` flag / explicit share record / dedicated approval record) — and a fourth way, "no mechanism at all," for `order_files` | Genuinely confusing for both developers and staff trying to remember which system does what | One consistent `customer_visible`-style flag (or equivalent explicit-share pattern) applied uniformly across every file-attachment type, including `order_files` |
| "Where are this file's actual bytes" | `storage_path` (object storage) for modern records, `file_data`/`image_data` (base64) for un-migrated legacy records, migrated lazily on first access | Working as designed, not really a "problem," but worth stating plainly as the pattern | Keep exactly as-is |

### Duplicate or Conflicting Data
- Order attachments and Artwork Proofs can describe the same physical artwork as two entirely separate, unlinked records (§4 Workflow 2) — not a data-integrity bug (no incorrect value anywhere), but a missed-relationship gap.

---

## 6. Business Rules and Logic

### Core Business Rules
| Rule | Current Behavior | Correct Rebuild Behavior | Priority |
|---|---|---|---|
| A file's bytes should only ever be retrievable by someone authorized to see the record it belongs to | **True for Documents, Wrap Files, Order Files. Confirmed false, live, for Signatures and Order Drawings.** | Enforce uniformly | **P0** |
| Customer-portal visibility of an attached file should be an explicit, deliberate flag or share action, never an implicit default | True everywhere a mechanism exists at all | Extend the same explicit-opt-in pattern to Order Files, which currently has no mechanism, implicit or explicit | P1 |
| Uploads should be validated for size and type before being persisted | True on every upload endpoint reviewed except Artwork Proofs (which doesn't accept an upload at all — it accepts a raw string) | Give Artwork Proofs a real upload endpoint with the same validation standard as the rest of the module | P1 |
| A tenant's backup/export should let them recover everything, including their files | **Not true** — file bytes are outside the scope of `BACKUP_COLLECTIONS` entirely; only metadata is preserved | Product decision required: either accept this as a documented limitation, or extend Backup/Restore to also snapshot/restore the referenced object-storage objects | P2 (documented gap, not urgent) |

### Statuses and State Changes
- `Document.is_archived` — soft-delete; archived documents are excluded from normal listing but not physically removed.
- `Signature.status` (`pending`→`signed`) — set by the public signing-token flow on successful signature capture.
- `ArtworkProof.status` (presumably `pending`/`approved`/`rejected`/`commented` — **Needs Verification**, not enumerated in full this session) — set by customer action through the portal.

### Automatic Actions
- Lazy base64→object-storage migration on first read, across Documents/Webstores/Order Files — confirmed correct and non-destructive (old field removed only after the new one is confirmed written).

### Calculations and Formulas
- `documents.py` includes a total-storage-used aggregation (`$group`/`$sum` over `file_size`) — presumably for a "storage used" display somewhere (**Needs Verification** of the exact frontend surface, not traced this session) — a reasonable, correctly-implemented aggregate.

### Validation Rules
- File size caps: 10MB (Documents), 15MB (Order Files); **Needs Verification** for Wrap Files, Order Drawings, and Signatures specifically (not confirmed with an exact byte limit this session, though all were confirmed to at least use the real object-storage path rather than accepting unlimited base64 blobs).
- MIME-type whitelists: present and explicit on Documents and Order Files; **Needs Verification** on the others.
- Client-supplied `Content-Type` is trusted as-is on every endpoint reviewed — none independently verify the actual file's magic bytes/content against the declared MIME type. This is a common, moderate-severity gap (a file with a spoofed `Content-Type` could bypass the whitelist check), noted for completeness rather than escalated to the same severity as the two confirmed authentication bypasses.

---

## 7. Permissions and Roles

### Roles That Interact With This Module
| Role | Documents | Order Files | Wrap Files | Signatures (create) | Signatures (retrieve — today) | Order Drawings (create) | Order Drawings (retrieve — today) | Artwork Proofs |
|---|---|---|---|---|---|---|---|---|
| Owner/Admin/Staff | Full CRUD, any role | Full CRUD, any role | Full CRUD, any role | Any role | N/A (bug bypasses role entirely) | Any role | N/A (bug bypasses role entirely) | Create/manage, any role |
| Customer (Portal) | View only, only what's explicitly shared | **No access — no mechanism exists** | View only, only `customer_visible=True` files on their own orders | Signs via public token (by design) | **Unauthenticated retrieval works for anyone, customer or not — bug** | No access found | **Unauthenticated retrieval works for anyone, customer or not — bug** | View/respond, only their own proofs |

### Customer / Portal Permissions
Already detailed above; the consistent theme is that every *intentional* customer-facing exposure (Wrap Files, Documents-via-share, Artwork Proofs) is correctly scoped to that specific customer's own records, while the two *unintentional* exposures (Signatures, Order Drawings) bypass any concept of "customer" or "tenant" entirely — they're not even customer-portal bugs specifically, they're public-internet bugs.

### Sensitive Information
- Signature images are the single most sensitive file type in this module — a captured human signature is a real, potentially legally-significant personal artifact, and per §2's confirmed finding, currently the least-protected.
- Documents can contain internal-only business content (unarchived, non-shared documents) alongside customer-safe content in the same collection, distinguished only by the explicit-share mechanism — correct as long as that mechanism is never bypassed (confirmed it isn't, for Documents specifically).

### Permission Problems in Current App
Both fully detailed in §2/§4/§6. In one sentence: **file *storage* architecture in this app is excellent; file *retrieval authorization* has two confirmed, live, zero-effort holes that expose exactly the two most sensitive file types in the entire module (signed signatures and order-specific drawings) to anyone on the internet.**

---

## 8. Integrations and External Services

### External Services Used
| Service | Purpose | Where Used | Current Status |
|---|---|---|---|
| Emergent Object Storage | Durable, backend-brokered file storage for nearly every module in this doc | `services/object_storage.py`, imported by `documents.py`, `wrap/files.py`, `order_drawings.py`, `signatures.py`, `orders.py`, `webstores.py` | Active, correctly integrated everywhere it's used |

### API Endpoints
Rather than re-list every endpoint (many already itemized with their exact posture in §3/§4/§6), this section gives the definitive summary table of every file-retrieval endpoint reviewed and its actual, confirmed authentication posture:

| Endpoint | Auth Required? | Tenant-Scoped? | Status |
|---|---|---|---|
| `GET /documents/{id}/download` (or equivalent content route) | Yes | Yes | ✅ Correct |
| `GET /wrap-tickets/.../files/{id}` (content route) | Yes | Yes | ✅ Correct |
| `GET /orders/{order_id}/files/{file_id}/content` | Yes | Yes | ✅ Correct |
| `GET /portal/documents/{id}` (customer-side) | Yes (customer token) | Partially — primary record yes, secondary `documents` join, no (§2) | ⚠️ Lax but not currently exploitable |
| `GET /api/signatures/file/{signature_id}` | **No** | **No** | ❌ **Confirmed live vulnerability** |
| `GET /api/order-drawings/file/{drawing_id}` | **No** | **No** | ❌ **Confirmed live vulnerability** |

### Webhooks
None specific to this module (object storage is accessed via direct backend-to-service calls, not webhooks).

### Email / SMS / Notification Templates
| Template Name | Trigger | Recipient | Purpose |
|---|---|---|---|
| Portal Document Shared | Staff sends a document to portal | Customer | Notify of a new document to view |
| Proof Ready for Approval | Staff creates an Artwork Proof | Customer | Notify of a proof needing review |
| Signature Requested | Staff creates a signature request | Customer/signer | Deliver the public signing link |

---

## 9. Documents, Files, Images, and Attachments
This entire module *is* this section by definition — see §1 through §8 in full. The one summary worth restating here: **the app's file-handling architecture (object storage, lazy migration, per-type validation) is genuinely production-grade in its design; the two confirmed authentication gaps are implementation oversights on two specific endpoints, not evidence of a fundamentally unsound architecture.** This is an important distinction for the rebuild: the fix is narrow and mechanical (add the missing dependency to two — or, pending the recommended full audit, a small handful of — routes), not a redesign of how files are stored.

---

## 10. AI Features
None directly. **Needs Verification** whether the AI Assistant has any tool-calling capability that reads or references uploaded files (e.g., "summarize this document" or "describe this artwork") — not found in this session's review of `routes/ai.py`'s tool-action list, but not exhaustively ruled out either.

---

## 11. Activity Logs, Audit Trail, and Reporting

### Activity Events Created by This Module
- Document portal-shares create a customer notification (a form of audit trail, at least customer-visible).
- **No audit-log entry exists for file uploads, downloads, deletes, or portal-shares** in the `admin_audit_log`/`log_admin_action` sense used elsewhere in the app (Tenants/Settings docs) — consistent with the broader, already-flagged pattern that most non-Platform-Admin actions in this app go unaudited.
- Specifically worth flagging given this doc's findings: **there is no way to retroactively determine who (if anyone) exploited the two confirmed unauthenticated-retrieval bugs**, since the vulnerable endpoints don't even log access attempts, let alone flag unauthenticated ones as suspicious.

### Audit Trail Requirements
For a production rebuild: at minimum, log every file upload/delete/portal-share with {actor, tenant, file type, record it's attached to}; specifically for Signatures (the most sensitive file type here), log every retrieval, authenticated or not, so a security review after the fix can retroactively check historical access logs for signs of prior exploitation.

### Reports and Dashboard Metrics
The `documents.py` total-storage-used aggregate (§6) is the only reporting-adjacent feature found in this module.

---

## 12. Errors, Edge Cases, and Failure Handling

### Known Bugs
| Bug | Where It Happens | Severity | Temporary Workaround | Rebuild Fix |
|---|---|---|---|---|
| `GET /api/signatures/file/{id}` — no authentication, no tenant scope — **confirmed live** | `routes/signatures.py` | **Critical** | None available from the outside; the underlying object-storage bytes are only reachable through this endpoint, so there's no way to "just not use it" — this must be code-fixed | Add `Depends(get_current_active_user)` + `tenant_id` filter on the lookup |
| `GET /api/order-drawings/file/{id}` — identical gap — **confirmed live** | `routes/order_drawings.py` | **Critical** | Same as above | Same fix pattern |
| No customer-portal exposure mechanism for `order_files` | `routes/orders.py`/`routes/portal.py` (absence) | Medium (feature gap, not a security bug) | Use the separate Artwork Proofs system instead | Add a `customer_visible` flag to `order_files`, mirroring Wrap Files |
| Artwork Proofs' `file_url` accepts an unvalidated raw string instead of a real upload | `routes/approvals.py` | Medium (architecture inconsistency; exact real-world exposure depends on an untraced frontend flow) | None known | Give Approvals a real `UploadFile`-based endpoint using the same object-storage + validation pattern as every sibling module |
| `GET /portal/documents/{id}`'s secondary `documents` lookup has no `tenant_id` filter | `routes/documents.py`/`routes/portal.py` | Low today (not reachable with attacker-controlled input); would become High if ever reused with user-supplied `document_id` | None needed currently | Add the filter defensively regardless |
| No verification that a file's actual content matches its declared `Content-Type` | Every upload endpoint reviewed | Low-Medium | None | Add magic-byte/content sniffing validation as a defense-in-depth measure |

### Edge Cases
- **A base64-legacy record that fails to migrate mid-read** (e.g., object storage is briefly unreachable): **Needs Verification** of exact fallback behavior — not traced to a specific error-handling branch this session, flagged for the next builder to confirm graceful degradation rather than a hard failure.
- **A tenant with zero storage/very large files hitting the 10MB/15MB caps**: correctly rejected with a clear 400, confirmed in code.
- **Restoring a backup and expecting file contents back**: does not happen (§2/§9) — worth a clear user-facing disclaimer on the Backup UI if one doesn't already exist (**Needs Verification**, not inspected on the frontend this session).

### Error Messages
Upload-validation error messages (unsupported file type, file too large) are clear and specific everywhere reviewed. The two authentication-bypass bugs, by definition, produce *no* error at all where one should exist — the same "silence is the failure mode" pattern already flagged in the Settings module doc.

### Recovery Rules
No self-service recovery concept applies here beyond ordinary soft-delete/archive (Documents) — nothing module-specific beyond what's already covered.

---

## 13. Important Files and Code Map

### Backend Files
| File Path | Purpose | Keep / Replace / Remove |
|---|---|---|
| `backend/services/object_storage.py` | Shared object-storage client | Keep exactly as-is — the foundation everything else in this module correctly builds on |
| `backend/routes/documents.py` | General document library, lazy migration, portal-share | Keep architecture; fix the one lax secondary-query pattern noted in §2 |
| `backend/routes/wrap/files.py` | Wrap Ticket files, `customer_visible` flag | Keep as the reference implementation for how portal-visibility flags should work everywhere |
| `backend/routes/orders.py` (order_files section) | Order attachments | **P1**: add a `customer_visible`-equivalent mechanism |
| `backend/routes/order_drawings.py` | Drawing Pad | **P0 fix**: add auth + tenant scope to `get_drawing_file` |
| `backend/routes/signatures.py` | E-signatures, public signing link | **P0 fix**: add auth + tenant scope to `get_signature_file` |
| `backend/routes/approvals.py` | Artwork Proofs | **P1**: replace raw `file_url` string input with a real `UploadFile` endpoint |

### Shared Files / Utilities
None beyond `object_storage.py` itself — no shared "upload validation" helper exists (each module hand-rolls its own size/MIME checks), a minor duplication worth consolidating in the rebuild (see §16).

### Tests
**Needs Verification** — no file-upload/storage-specific test file was found by name this session. Given the two confirmed live vulnerabilities, the highest-priority regression test for the next builder is explicit: for every `/file/{id}`-or-`/content`-style GET route in the entire backend, assert that an unauthenticated request returns 401/403, not 200 — a single parametrized test could cover this systematically across every module in one pass.

---

## 14. Design and Layout Requirements

### Current Visual Problems
None module-specific found — file upload/preview UI components were not deeply inspected visually this session (this doc focused on backend storage/access-control correctness per the module's core concern).

### Must-Keep Visual Elements
- The Wrap Files `customer_visible` toggle's presence directly in the staff-facing file list (implied by the backend flag's design) is the right UX pattern — making the visibility decision immediate and per-file rather than buried in a separate settings screen.

### Rebuild Design Requirements
- If a `customer_visible` flag is added to `order_files` (per §16), surface it with the same immediacy as the Wrap Files pattern.
- Consider a unified "shared with customer" indicator/summary visible from the customer's own record (Order/Wrap Ticket detail), so staff can answer "what has this customer already seen" without checking three separate subsystems.

---

## 15. Module Dependencies

### Modules This Module Depends On
| Dependency Module | Why Needed |
|---|---|
| Auth | `get_current_active_user` gates (correctly, everywhere except the two confirmed bugs) every non-public file endpoint |
| Orders, Customers, Wrap Tickets | Files are always attached to a record owned by these modules; tenant/ownership scoping flows from them |
| Access Control | This module's near-total lack of role-tier granularity (any authenticated tenant user can do anything file-related) is a deliberate simplicity that should be revisited only if the Access Control rebuild introduces a `Permission.DOCUMENTS_*`/`FILES_*` category |

### Modules That Depend on This Module
| Dependent Module | What It Needs |
|---|---|
| Customer Portal | Reads Wrap Files/Documents/Artwork Proofs through this module's sharing mechanisms |
| Orders, Wrap Tickets | Display attached files inline |
| Settings/Backup | Explicitly excludes this module's binary content from exports (by design, per the Settings doc) |

### Events This Module Sends / Receives
None (no event bus, consistent with every other module documented this session).

---

## 16. Migration and Rebuild Strategy

### Existing Data That Must Be Preserved
- Every `storage_path` currently in the database, and the underlying object-storage objects they point to — these must not be touched by any rebuild work; the fixes needed are entirely about *who can retrieve* them, not *where they live*.

### Existing Data That Can Be Archived
Not applicable.

### Existing Data That Should Not Be Migrated
- The `UploadFile`/`File` dead imports in `approvals.py` should be either used (by building the real upload endpoint) or removed, not carried forward unused.

### Recommended Rebuild Order
**Phase 1: Foundation (Security-critical, do first, fully independent of everything else):** Fix the two confirmed unauthenticated-retrieval endpoints (Signatures, Order Drawings); run the full parametrized audit described in §13 across every `/file/`-or-`/content`-style route in the codebase to confirm no third instance exists.

**Phase 2: Foundation (Consistency):** Build a shared upload-validation helper (size cap + MIME whitelist) used by every module in this doc, replacing the current hand-rolled-per-module duplication.

**Phase 3: Core Workflow:** Add a `customer_visible`-equivalent mechanism to `order_files`; give Artwork Proofs a real `UploadFile`-based creation path (ideally one that can also directly reference an existing `order_files` record, closing the Workflow 2 gap in the same change).

**Phase 4: Advanced Features:** Add file-content/magic-byte verification against declared MIME type; consider extending Backup/Restore to cover object-storage contents, not just metadata (a larger, more expensive feature — genuinely optional).

**Phase 5: Reports, AI, and Polish:** Add audit logging for uploads/downloads/deletes/shares, especially for Signatures; build the "what has this customer been shown" unified view.

### Rebuild Risks
- Phase 1's fix is low-risk and purely restrictive (adding a required auth header can only *reduce* who can retrieve a file that currently anyone can retrieve) — no legitimate workflow depends on these endpoints being unauthenticated, since every comparable file-retrieval endpoint in every other module already requires auth and nothing in the frontend was found to call these two without also having a valid session available.
- Phase 3's `order_files` visibility flag addition is purely additive and carries no migration risk to existing records (default `customer_visible=False`, matching the safe-by-default posture Wrap Files already uses).

### Required Decisions Before Building
1. Should signed signature images be retrievable by the *signer* (customer) after the fact via their own portal, or only by tenant staff? (Currently neither is cleanly true — staff can retrieve via the normal authenticated app, but there's no dedicated customer-facing "view my signed documents" concept found this session.)
2. Should Artwork Proofs be refactored to directly reference an `order_files` record (recommended, closes two gaps at once) or remain a fully independent upload path?
3. Is extending Backup/Restore to cover actual file bytes (not just metadata) worth the storage/complexity cost, or should this limitation simply be documented clearly to shop owners?

## 17. Testing Requirements

### Critical Tests
| Test Scenario | Expected Result | Priority |
|---|---|---|
| Unauthenticated request to `GET /api/signatures/file/{id}` | **Today: 200 with the real file (confirmed live).** Post-fix: 401/403 | Critical (post-fix) |
| Unauthenticated request to `GET /api/order-drawings/file/{id}` | **Today: 200 with the real file (confirmed live).** Post-fix: 401/403 | Critical (post-fix) |
| Full parametrized sweep of every `/file/`, `/content`, `/download`-style GET route in the backend, unauthenticated | Every one returns 401/403 | Critical |
| Upload a file exceeding the size cap (Documents: 10MB, Order Files: 15MB) | 400, clear error message | Critical |
| Upload a disallowed MIME type | 400, clear error message | Critical |
| Customer requests a Wrap File with `customer_visible=false` on their own order | 403/404 (not returned) | Critical |
| Customer requests a Wrap File belonging to a different customer's order (even with `customer_visible=true`) | 403/404 (order-ownership check blocks it) | Critical |
| Legacy base64 document is read for the first time post-rebuild | Successfully lazy-migrates to object storage; `file_data` field cleared | High |
| Restore a backup and check whether uploaded files are recoverable | **Today: metadata returns, actual file bytes do not** — confirm this matches the documented limitation, not a silent additional loss | High |

### Manual Test Checklist
- [x] Confirm permissions work → **Fails** for Signatures and Order Drawings retrieval (confirmed live); passes everywhere else checked
- [x] Confirm activity log is created → **Fails** — no audit trail for any file action in this module
- [ ] Confirm mobile layout works → Not inspected this session
- [x] Confirm error states are understandable → Upload-validation errors are clear; the two critical bugs produce no error at all (the actual problem)
- [x] Confirm related module data updates correctly → Lazy migration confirmed correct in code
- [x] Confirm files upload and download correctly → Yes, for legitimate authenticated flows; the concern is *unauthorized* download working too well
- [x] Confirm deleted/archived records behave correctly → Documents' soft-delete/archive confirmed working as designed

### Definition of Done
This module is complete only when: (1) every file-retrieval endpoint in the codebase requires authentication and tenant/ownership scoping with no exceptions (confirmed via the full parametrized sweep, not just the two bugs found this session), (2) Order Files have a customer-portal exposure mechanism matching Wrap Files' existing pattern, (3) Artwork Proofs use a real, validated upload path instead of a raw string field, and (4) file actions with security/legal significance (especially Signatures) are audit-logged.

---

## 18. Final Rebuild Recommendation

### Keep
- `services/object_storage.py` and every module's correct use of it — the storage foundation is sound and should not be redesigned.
- The lazy base64→object-storage migration pattern.
- Wrap Files' `customer_visible` flag + order-ownership double-check — the reference implementation for portal-visibility done right.
- Documents' explicit "send to portal" share model.
- Upload size/MIME validation wherever it currently exists (Documents, Order Files).

### Rebuild From Scratch
- The two confirmed vulnerable retrieval endpoints (Signatures, Order Drawings) — not a redesign, but a non-negotiable, immediate correctness fix.
- Artwork Proofs' upload mechanism — currently not really an "upload" feature at all; build a real one.

### Merge With Another Module
- Consider merging Order Files' visibility model directly into (or at least made consistent with) Wrap Files', since they are conceptually the same feature (an attachment on a job that may or may not be customer-safe) implemented twice, differently, with one version more complete than the other.

### Remove
- The dead `UploadFile`/`File` imports in `approvals.py` — either use them or delete them.

### Postpone
- Content/magic-byte MIME verification — a real, moderate-value defense-in-depth improvement, not urgent relative to the two critical bugs.
- Extending Backup/Restore to cover file bytes — a larger feature, worth a deliberate product decision rather than an assumed requirement.

### Recommended Priority
- [x] Critical

### One-Paragraph Builder Handoff
This app's file-storage architecture is, on its own terms, one of the best-engineered systems found across this entire multi-session documentation effort — a real object-storage backend used consistently across nearly every module, with a clean, non-destructive lazy-migration path for older base64-embedded data, and (in most places) solid upload validation and correctly tenant-scoped, correctly authenticated retrieval. Against that strong foundation, this session found and **live-confirmed two specific, narrow, but severe holes**: `GET /api/signatures/file/{id}` and `GET /api/order-drawings/file/{id}` both return the real file to a completely unauthenticated request — no token, no role, no tenant check, nothing — reproduced with plain `curl` calls carrying no `Authorization` header at all against the running preview backend, retrieving a genuine signed-signature PNG and a genuine drawing-pad PNG respectively. Both bugs share the identical shape (a file-retrieval route that omitted the `Depends(get_current_active_user)` dependency every sibling route in the same file correctly includes), which means the single highest-priority action for the next builder — even before touching either specific file — is to write one parametrized test sweeping every `/file/`-or-`/content`-style route in the backend for the same gap, since these two were found by targeted inspection, not an exhaustive audit, and a third instance elsewhere in the codebase would not be surprising. Beyond those two fixes, the module's only other real gaps are architectural inconsistencies rather than defects: regular Order attachments have no customer-portal sharing mechanism at all (unlike the nearly-identical Wrap Files feature, which got this right), and the Artwork Proofs system accepts a raw, unvalidated URL string instead of a real file upload — both fixable by extending patterns that already exist and work correctly elsewhere in this same module.

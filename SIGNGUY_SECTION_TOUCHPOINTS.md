# SignGuy AI — File & Touch-Point Inventory

Every file below was authored/maintained by the Emergent AI agent
(`emergent-agent-e1` — the repo's only code author besides you).

- **OWNED** = files that *are* the section (confirmed by directory listing).
- **TOUCHES (shared)** = existing modules the section reads/writes; shared with
  the rest of the app — do NOT duplicate these when extending.

> Confidence: OWNED lists are confirmed from the repo tree. TOUCHES lists are
> derived from the dependency map, naming, and the fact that both sections sit on
> top of the Orders/Customers core. A 100%-exact import-level list requires reading
> the section's source files (cheap next step, noted at the bottom).

================================================================================
## 1) WRAP COMMAND CENTER
================================================================================

### OWNED — Backend (`backend/routes/wrap/`)
- `backend/routes/wrap/__init__.py`   ← exposes `router` (mounted in server.py)
- `backend/routes/wrap/core.py`       ← vehicle info + wrap areas ("Phase 2A")
- `backend/routes/wrap/files.py`      ← wrap file uploads
- `backend/routes/wrap/pdfs.py`       ← wrap PDF generation (reportlab)
- `backend/routes/wrap/portal.py`     ← customer-portal wrap views
- Registration line in `backend/server.py`:
  `from routes.wrap import router as wrap_router` + `api_router.include_router(wrap_router)`

### OWNED — Frontend
- `frontend/src/pages/WrapCommandCenterPage.js`     ← the page
- `frontend/src/components/wrap/`                   ← wrap UI components (folder)
- `frontend/src/pages/docs/DocsWrapCommandCenter.js`← help/docs page
- Wiring: `frontend/src/App.js` (import + `<Route>` in ProtectedRoutes),
  `frontend/src/components/ribbon/` (nav entry)

### TOUCHES (shared) — Backend
- `backend/routes/orders.py` + `backend/models/orders.py`   ← a wrap is an Order
- `backend/routes/job_tickets.py` + `backend/models/jobs.py`← order items / tickets
- `backend/routes/customers.py` + `backend/models/customer.py`
- `backend/routes/order_drawings.py`                        ← inspection / markup imagery
- `backend/routes/signatures.py`                            ← contract / approval signing
- `backend/routes/documents.py`                             ← wrap docs land in Document Library
- `backend/routes/pricing.py` + pricing calculators in `server.py`
  (`calculate_vehicle_graphics`, `VehicleType`, `CoverageType` enums)  ← wrap pricing
- `backend/routes/production_timeline.py`, `backend/routes/production_tasks.py` ← install/production
- `backend/routes/portal.py`                                ← customer portal core
- `backend/routes/ai.py`                                    ← Vehicle Wrap Mockup Generator (GPT Image 1)
- `backend/services/storage_config.py` (Object Storage)     ← drawings/files/pdfs
- `backend/models/enums.py`                                 ← VehicleType, CoverageType, JobItemType (Wrap, Vehicle Graphics)

### TOUCHES (shared) — Frontend
- `frontend/src/components/MainLayout.js`                   ← shell/chrome
- `frontend/src/components/DrawingCanvasPad.js`, `DrawingModal`, `DrawingPreviewModal` ← markup
- `frontend/src/components/SignatureCaptureModal.js`, `SignatureSection.js`, `SignatureActivityList.js`
- `frontend/src/components/ProductionTimeline.js`
- `frontend/src/pages/OrderDetail.js`, `JobTicketDetail.js`, `PortalOrders.js`
- `frontend/src/components/LivePricingPanel.js` / `PricingCalculator.js`

### Data (MongoDB)
- Primarily rides on `orders` / `job_items` / `order_drawings` / `signatures` /
  `documents` (no separate "wrap" collection is enumerated in the schema docs —
  wrap stores vehicle info + areas on the order/ticket records). Confirm in `wrap/core.py`.

================================================================================
## 2) WEB STORES
================================================================================

### OWNED — Backend
- `backend/routes/webstores.py`        ← `webstores_router`, `products_router`, `storefront_router`
- `backend/routes/webstore_owners.py`  ← `router`, `public_router`, `portal_router` (Owner Connect)
- `backend/models/product_tiers.py`    ← product/variant tier models
- Webstore enums in `backend/models/enums.py` (`WebstoreType`, `WebstoreStatus`, `OrderStatus`)
- Registration lines in `backend/server.py` (webstores/products/storefront/webstore_owners routers)

### OWNED — Frontend
- `frontend/src/pages/Webstores.js`           ← store management
- `frontend/src/pages/Products.js`            ← product catalog
- `frontend/src/pages/Storefront.js`          ← PUBLIC storefront (no auth)
- `frontend/src/pages/PortalWebstores.js`     ← customer-portal store view
- `frontend/src/pages/WebstoreOwnerOnboard.js`
- `frontend/src/pages/OwnerPortalSignup.js`
- `frontend/src/pages/OwnerPortal.js`
- `frontend/src/components/webstores/`         ← webstore UI components (folder)
- `frontend/src/components/owner-portal/`      ← owner portal components (folder)
- `frontend/src/components/WebstoreDetailDashboard.js`
- `frontend/src/components/WebstoreOwnerConnectCard.js`
- `frontend/src/components/WebstoreSetupFlow.js`
- `frontend/src/components/AdminStoreProgressCard.js`
- `frontend/src/components/StoreSnapshotModal.js`
- `frontend/src/components/BrandingPreview.js` (store branding; partly shared)
- `frontend/src/pages/docs/DocsWebstores.js`
- `frontend/src/pages/marketing/` → WebstoresPage + WebstoreLaunch/Growth/Scale plan pages
- Wiring: `frontend/src/App.js` (storefront public route + protected store routes),
  `frontend/src/components/ribbon/` (Webstores tab: Stores, Products, Promo Codes)

### OWNED — Root docs / tests
- `EVENT_WEBSTORE_QUESTIONNAIRE_README.md`
- `test_event_webstore_questionnaire.py`

### TOUCHES (shared) — Backend
- `backend/routes/orders.py` + `models/orders.py`   ← webstore order AUTO-CREATES an Order
- `backend/routes/customers.py` + `models/customer.py` ← auto-creates customer
- `backend/routes/inventory.py` + `models/inventory.py` ← product/stock
- `backend/routes/stripe_connect.py`                ← Connect payments / payouts
- `backend/routes/billing.py`                        ← platform fees by tier
- `backend/routes/promo_codes.py`                    ← store discount codes
- `backend/routes/tiers.py`, `backend/routes/plans.py` + `models/tiers.py` ← webstore plan gating
- `backend/routes/portal.py`                         ← customer portal
- `backend/services/storage_config.py`               ← store/product images
- `backend/models/enums.py`                          ← OrderStatus (webstore order pipeline)

### TOUCHES (shared) — Frontend
- `frontend/src/components/MainLayout.js`            ← shell/chrome
- `frontend/src/contexts/PlanContext.js`             ← product-line / plan context
- `frontend/src/components/UpgradeModal.js`, `UpgradePrompt.js`, `TrialLockout.js` ← tier gating
- `frontend/src/pages/PromoCodes.js`                 ← linked under Webstores tab
- QR generation (`qrcode.react`) for store URLs

### Data (MongoDB) — from feature/schema docs
- `webstores_v2`, `products`, `webstore_products`, `webstore_orders_v2`, `webstore_payouts`
- plus shared: `orders`, `customers`, `promo_codes`, `promo_code_usage`, `subscriptions`

================================================================================
## Cheapest next step to make these lists import-exact
================================================================================
Read just these and grep their imports/`API` calls (one pass, low cost):
- Wrap:   `routes/wrap/core.py`, `routes/wrap/portal.py`, `pages/WrapCommandCenterPage.js`,
          `components/wrap/*`
- Stores: `routes/webstores.py`, `routes/webstore_owners.py`, `pages/Webstores.js`,
          `components/webstores/*`
That converts every "TOUCHES (inferred)" line into a confirmed import edge.

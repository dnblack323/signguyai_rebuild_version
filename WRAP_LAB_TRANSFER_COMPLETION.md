# Wrap Lab Transfer Completion

Date: 2026-06-25  
Target repo: `signguyai_rebuild_version`  
Reference repo: `wraplab-ai`

## Status

Wrap Lab has been transferred into the rebuild repo as a rebuild-native module. The active implementation now lives in `signguyai_rebuild_version`; the old `wraplab-ai` repo should be treated as reference/archive unless a future audit intentionally compares against it again.

This is not a static-file copy. The standalone `wraplab-ai` app behavior was converted into the rebuild architecture:

- React module inside the existing rebuild shell.
- FastAPI routes/actions for Wrap Lab workflow persistence.
- Mongo-backed repository pattern through the rebuild backend.
- Shared customer foundation reused by Wrap Lab.
- Runtime assets copied into the rebuild frontend public asset folder.

## Source of truth

Current implementation source of truth:

- Frontend module: `frontend/src/components/wrap-lab/`
- Copied runtime assets: `frontend/public/wrap-lab-assets/`
- Backend routes: `backend/routes/wrap_lab.py`
- Backend models: `backend/models/wrap_lab.py`
- Backend services: `backend/services/wrap_lab_service.py`
- Backend repository: `backend/repositories/wrap_projects.py`
- Shared customers:
  - `backend/routes/customers.py`
  - `backend/models/customers.py`
  - `backend/repositories/customers.py`
  - `frontend/src/components/customers/`

The old standalone files `wraplab-ai/index.html`, `wraplab-ai/app.js`, `wraplab-ai/mockup-studio.js`, and `wraplab-ai/styles.css` are no longer active app files. Their behavior has been ported into the React/API structure above.

## Integrated features

The rebuild Wrap Lab module now includes:

- Wrap project dashboard and command center.
- Intake/customer linking using shared Customers.
- Vehicle details, measurements, specs, coverage, pricing, and quote controls.
- Design/proof workflow.
- Mockup Studio:
  - asset upload
  - asset replacement
  - asset delete/download
  - protected asset rules
  - concept generation
  - surprise generation
  - refine/favorite/compare/archive
  - send-to-portal
- Customer portal preview:
  - quote approval/revision
  - deposit payment state
  - contract signing
  - proof approval/revision
  - concept feedback, tags, questions, and annotations
  - inspection acknowledgement
  - pre-install packet signing
  - final packet signing
- Damage inspection with vehicle-view templates.
- Production checklist and production task summary.
- Install schedule, installer checklist, and issue logging.
- File manager with portal visibility and marketing-permission flags.
- Customer communication history/templates.

## Backend workflow actions

Wrap Lab workflow actions are handled through:

`POST /api/wrap-lab/projects/{project_id}/actions`

Current action names:

- `approve_quote`
- `request_quote_revision`
- `pay_deposit`
- `sign_contract`
- `approve_proof`
- `request_proof_revision`
- `acknowledge_inspection`
- `sign_pre_install_packet`
- `sign_final_packet`
- `customer_concept_feedback`
- `advance_stage`
- `complete_stage`
- `send_message`
- `resolve_issue`

Public portal payloads are intentionally allowlisted in `backend/services/wrap_lab_service.py` so internal cost/pricing data does not leak to customer-facing views.

## Active repo workflow

Use this repo for Wrap Lab work:

```text
C:\Users\thesi\Documents\GitHub\signguyai_rebuild_version
```

Use this URL to view the module in the rebuild shell:

```text
http://127.0.0.1:5173/?mode=wrap-lab
```

Do not continue building new Wrap Lab behavior in `wraplab-ai` unless explicitly doing reference comparison. That keeps the active work down to the rebuild repo plus the main/reference repo.

## Verification commands

Frontend build:

```powershell
cd C:\Users\thesi\Documents\GitHub\signguyai_rebuild_version\frontend
npm.cmd run build
```

Backend tests:

```powershell
cd C:\Users\thesi\Documents\GitHub\signguyai_rebuild_version\backend
python -m unittest discover -s tests -v
```

Last verified:

- Frontend production build passed.
- Backend unittest suite passed with 7 tests.

## Notes for future agents

- Keep `signguyai` read-only unless the user explicitly says otherwise.
- Treat `wraplab-ai` as the visual/behavior reference only, not the active implementation target.
- Preserve shared Customers integration; do not create a separate Wrap-only customer silo.
- Prefer backend workflow actions for customer-facing portal state changes.
- Keep Wrap Lab inside the rebuild shell/ribbon/nav structure while preserving Wrap Lab’s own screens and working flow.

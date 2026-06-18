# SignGuyAI Rebuild

First preview version of the clean SignGuyAI rebuild.

This release establishes the controlling application shell and first structural preview:

- Icon-only Home / Global Command Center
- Global Search
- Global Create
- Notifications
- Reusable office-style action ribbon with grouped page actions
- Day 1 specified dashboard KPI and snapshot layout
- Operations workspace
- Business workspace
- Productivity workspace
- AI Hub
- Settings workspace
- Full Help menu accessed through the `?` icon
- Final Order Item and Work Order Summary terminology
- Order Portal Manager standalone-first expansion track
- Always-available portal management with separately gated publishing and shopping cart/checkout
- Focused Order Portal Manager standalone preview at `/?mode=webstores`
- Controlling standalone-first product spec in `ORDER_PORTAL_MANAGER_MASTER_SPEC.md`
- Working sample interactions
- Honest module status pages for future releases

## Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

For normal local review, double-click `Start Review.cmd`. See `LOCAL_REVIEW_GUIDE.md`.

## Backend

```bash
cd backend
python -m pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The backend health endpoint is `http://localhost:8000/api/health` for direct backend development. The bundled local review launcher uses port `8001`.
The dashboard digest contract is `/api/digest`.
The temporary compatibility capability contract is `/api/webstores/capabilities`.

See `ORDER_PORTAL_MANAGER_MASTER_SPEC.md` for the controlling product spec, `ORDER_PORTAL_MAIN_APP_INTEGRATION_SPEC.md` for future SignGuyAI OS integration rules, `ORDER_PORTAL_RELEASE_PLAN.md` for build sequencing, and `ORDER_PORTAL_AGENT_BUILD_RULES.md` before modifying this area.

## Emergent

Import this repository into Emergent. The previewable application is in `frontend/`, and the backend scaffold is in `backend/`.

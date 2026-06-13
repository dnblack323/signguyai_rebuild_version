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
- Early Webstores expansion track
- Always-available Webstores management with separately gated publishing and shopping cart/checkout
- Focused Webstores standalone preview at `/?mode=webstores`
- Working sample interactions
- Honest module status pages for future releases

## Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

## Backend

```bash
cd backend
python -m pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The backend health endpoint is `http://localhost:8000/api/health`.
The dashboard digest contract is `http://localhost:8000/api/digest`.
The Webstores capability contract is `http://localhost:8000/api/webstores/capabilities`.

See `MASTER_AGENT_REBUILD_PLAN.md` for the sole controlling rebuild plan, `WEBSTORES_PRODUCT_SPEC.md` for the Webstores entitlement model, and `FINAL_SPEC_COMPLIANCE.md` for current preview coverage.

## Emergent

Import this repository into Emergent. The previewable application is in `frontend/`, and the backend scaffold is in `backend/`.

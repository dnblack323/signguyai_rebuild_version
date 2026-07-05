# SignGuyAI Rebuild

First preview version of the clean SignGuyAI rebuild.

Current Phase 0 rebuild decisions are captured in `PHASE_0_DECISIONS.md`. The Phase 0 AI-agent manual outline is captured in `PHASE_0_AGENT_MANUAL_OUTLINE.md`. The current-state recovery plan is captured in `REBUILD_RECOVERY_PLAN.md`. Use these files as the latest source of truth for V1 scope, release order, terminology, mandatory integrations, commercial launch gates, and where the rebuild should resume.

This release establishes the controlling application shell and first structural preview:

- Icon-only Home / Global Command Center
- Global Search
- Global Create
- Notifications
- Reusable office-style action ribbon with grouped page actions
- Day 1 specified dashboard KPI and snapshot layout
- Home workspace
- Operations workspace
- Business Management workspace
- Team workspace
- Tools workspace
- Add-ons section with Sell It! and Wrap It!
- Settings workspace
- Help workspace
- Community Hub, shared notes, and AI Suite transfer previews
- Final Order Item and Work Order Summary terminology
- Order Portal Manager standalone-first expansion track
- Always-available portal management with separately gated publishing and shopping cart/checkout
- Focused Order Portal Manager standalone preview at `/?mode=webstores`
- Full-stack Wrap Lab workspace at `/?mode=wrap-lab`
- Controlling standalone-first product spec in `ORDER_PORTAL_MANAGER_MASTER_SPEC.md`
- Working sample interactions
- Honest module status pages for future releases

## Frontend

To run the frontend:
```bash
cd frontend
yarn install
yarn start
```

The frontend runs at `http://localhost:3000`.

## Backend

To run the backend:
```bash
cd backend
# Create virtual environment if needed
python -m venv .venv
# Activate virtual environment
# Windows: .venv\Scripts\Activate.ps1
# Mac/Linux: source .venv/bin/activate
python -m pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

The backend health endpoint is `http://localhost:8001/api/health` for direct backend development. The bundled local review launcher uses port `8001`.

Wrap It! opens the React Wrap Lab workspace. Its dashboard, project command center, pricing, design/proofing, damage inspection, production, installation, files, communication, customer portal, and AI mockup studio are backed by `/api/wrap-lab`.

Wrap Lab project records are tenant scoped and stored in MongoDB. Copy `.env.example` to `.env` or provide `MONGO_URL` and `DB_NAME` through the runtime environment. When MongoDB is not available, the frontend clearly enters local preview mode so visual review remains possible; production persistence requires MongoDB.

## Emergent

Import this repository into Emergent. The previewable application is in `frontend/`, and the backend scaffold is in `backend/`.

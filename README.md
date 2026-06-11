# SignGuyAI Rebuild

First preview version of the clean SignGuyAI rebuild.

This release establishes the final application surface:

- Global Command Center
- Global Search
- Global Create
- Notifications
- Reusable office-style action ribbon with grouped page actions
- Day 1 specified dashboard KPI and snapshot layout
- Operations workspace
- Business workspace
- Productivity workspace
- AI Hub
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

See `DAY1_SPEC_COVERAGE.md` for the requirements currently represented by the preview.

## Emergent

Import this repository into Emergent. The previewable application is in `frontend/`, and the backend scaffold is in `backend/`.

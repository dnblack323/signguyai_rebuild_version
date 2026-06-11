# SignGuyAI Rebuild

First preview version of the clean SignGuyAI rebuild.

This release establishes the final application surface:

- Global Command Center
- Global Search
- Global Create
- Notifications
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

## Emergent

Import this repository into Emergent. The previewable application is in `frontend/`, and the backend scaffold is in `backend/`.


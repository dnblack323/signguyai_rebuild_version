# SignGuy AI — "New Section" Drop-In Scaffold

A copy-paste template for adding a **new self-contained section** (e.g. a future
"Command Center", a reports module, etc.) to SignGuy AI **without** the Emergent
agent having to design or rewrite anything. Build your real code on top of these
stubs *outside* Emergent, push to a branch, pull in, then ask the agent to do the
~5 one-line wiring edits in `INTEGRATION_CHECKLIST.md`.

> These match the **actual** conventions observed in `dnblack323/signguyai`:
> modular `backend/routes/*.py` + `backend/models/*.py` (+ `models/__init__.py`
> re-export) + FastAPI `api_router` (prefix `/api`) + React pages in
> `frontend/src/pages` wired through `App.js` `ProtectedRoutes` + `MainLayout`,
> JWT auth from `core_runtime`, and **string `id` (uuid4)** documents that are
> always `tenant_id`-scoped.
>
> NOTE: "Wrap Command Center" and "Web Store" already exist in the repo — so this
> template is intentionally **generic**. Rename `example_section` / `ExampleSection`
> everywhere to your new section's name.

## What's in here
```
signguy-section-scaffold/
├── README.md                         ← this file
├── INTEGRATION_CHECKLIST.md          ← the exact wiring edits + the agent prompt
├── backend/
│   ├── models/example_section.py     ← Pydantic models (tenant-scoped, uuid id)
│   └── routes/example_section.py     ← APIRouter, JWT auth, tenant isolation, CRUD
└── frontend/
    └── pages/ExampleSection.jsx      ← React page (Shadcn, axios+auth, data-testid)
```

## The golden rule (why this saves credits)
The expensive agent mode is *"design and build a feature"*. The cheap mode is
*"wire in code that already matches the repo"*. Everything here exists so you stay
in the cheap mode: the files already obey SignGuy's auth, tenant, model, routing,
and UI conventions, so integration is **mechanical**, not creative.

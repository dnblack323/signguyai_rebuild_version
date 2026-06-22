# Integration Checklist — wiring the new section into SignGuy AI

After you (a) build your real logic on top of the scaffold stubs externally,
(b) push to a branch, and (c) pull it into the Emergent workspace, only these
**small, mechanical edits** remain. Each one says *why* so you (and the agent)
understand it.

> Replace `example_section` / `ExampleSection` / `example-section` with your real
> section name first.

---

## Backend (4 tiny edits)

### 1. Drop the files in place
- `backend/models/example_section.py`
- `backend/routes/example_section.py`

*Why:* SignGuy keeps one file per domain in `models/` and `routes/`. Matching that
layout means zero structural change — the agent just adds, never refactors.

### 2. Re-export the models in `backend/models/__init__.py`
Add:
```python
from .example_section import ExampleItem, ExampleItemCreate, ExampleItemUpdate
```
*Why:* `server.py` and routes import models from the `models` package
(`from models import ...`), not from individual files. `__init__.py` is the single
public surface; if you skip this, the `from models import ExampleItem` line in the
route fails.

### 3. Register the router in `backend/server.py`
In the "IMPORT AND INCLUDE ROUTERS" block, add an import next to the others:
```python
from routes.example_section import router as example_section_router
```
…and in the include block:
```python
api_router.include_router(example_section_router)  # Example Section
```
*Why:* This is exactly how every existing section is mounted (see `wrap_router`,
`customers_router`, etc.). `api_router` already carries `prefix="/api"`, so your
endpoints resolve at `/api/example-section/...`. Two lines, no logic touched.

### 4. Dependencies (only if you added any)
If your real code needs a new Python package:
```bash
pip install <pkg> && pip freeze > backend/requirements.txt
```
*Why:* `requirements.txt` must be regenerated via `pip freeze` (never hand-edited),
or the container env drifts and the backend can fail to start.

---

## Frontend (3 tiny edits)

### 5. Drop the page in place
- `frontend/src/pages/ExampleSection.jsx`

### 6. Add the route in `frontend/src/App.js`
Add the import with the other page imports:
```js
import ExampleSection from "./pages/ExampleSection";
```
…and a `<Route>` INSIDE `ProtectedRoutes` (so it inherits auth + `MainLayout` chrome):
```jsx
<Route path="/example-section" element={<ExampleSection />} />
```
*Why:* `ProtectedRoutes` already guards auth and wraps children in `MainLayout`
(the ribbon nav + top bar). Putting the route there means you get the shell and the
auth gate for free — no new layout/auth code.

### 7. Add a nav entry in the ribbon
In `frontend/src/components/ribbon/` (e.g. `PrimaryNav.js` for a top tab, or a tab's
sub-items in `ActionToolbar.js`), add a link to `/example-section`.
*Why:* This is what makes "the user clicks it in the nav." The ribbon is the single
source of navigation; adding the link here (vs. anywhere else) keeps tab-highlighting
and mobile menu behavior working automatically.

### 8. Align the auth client (one line)
In `ExampleSection.jsx`, swap the local axios fallback for SignGuy's shared API
client / token key if one exists (check `frontend/src/lib` and `frontend/src/utils`,
and how `AuthContext` stores the token).
*Why:* Reusing the existing client means 401-handling, base URL, and the auth header
all behave identically to the rest of the app — no divergent auth logic to debug later.

---

## The one prompt to give the Emergent agent (spend credits once)

> "I pulled a new section on branch `feature/example-section`:
> `backend/models/example_section.py`, `backend/routes/example_section.py`, and
> `frontend/src/pages/ExampleSection.jsx`. **Integrate, do not rewrite.** Do exactly
> these wiring steps: (2) re-export the models in `models/__init__.py`; (3) import +
> `api_router.include_router` the router in `server.py`; (6) import + add a
> `<Route path='/example-section'>` inside `ProtectedRoutes` in `App.js`; (7) add a
> nav link to `/example-section` in the ribbon; (8) switch the page to our shared
> axios/auth client. Reuse existing `orders`/`customers` collections — do NOT create
> duplicate customer/order data. Then test only the Example Section CRUD end-to-end."

*Why this prompt is credit-efficient:* it (a) names every file and edit so there's no
exploration, (b) says "integrate not rewrite" so the agent doesn't redesign, (c)
names collections to reuse so it can't create parallel/duplicate data, and (d) scopes
testing to just the new flow so it doesn't re-verify the whole app.

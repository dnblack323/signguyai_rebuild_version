# Local Review Guide

## Recommended Setup

Use the local full-stack review environment while working with Codex. It provides immediate visual updates through Vite hot reload and a real local FastAPI backend for functional checks.

Frontend edits hot-reload automatically. Restart `Start Review.cmd` after backend Python changes so the functional review uses the newest backend contracts.

## Start And Stop

Double-click `Start Review.cmd` in the repository root.

- Full SignGuyAI app: `http://127.0.0.1:5173/`
- Order Portal Manager standalone preview: `http://127.0.0.1:5173/?mode=webstores`
- Backend API documentation: `http://127.0.0.1:8001/docs`

Double-click `Stop Review.cmd` when finished. Logs are stored in `.review/`.

## Review With Codex

1. Keep the app open in the in-app browser.
2. Tell Codex what you want changed while looking at the page.
3. Codex edits the app and Vite refreshes it automatically.
4. Confirm the top-bar badge says `Functional` when reviewing backend-connected behavior.
5. Ask Codex to test a workflow when behavior matters, not only appearance.

## Review Levels

### Visual Review

Use for layout, labels, navigation, spacing, colors, cards, and responsive behavior. If the backend is unavailable, the badge says `Visual only`.

### Functional Review

Use for API behavior, entitlements, workflows, permissions, calculations, persistence, and error handling. The badge must say `Functional`, and the relevant workflow should have backend/API tests.

The current rebuild still uses preview data for many screens. A `Functional` badge confirms backend connectivity; it does not mean every displayed module has production persistence.

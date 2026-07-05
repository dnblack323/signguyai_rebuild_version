# SignGuyAI Rebuild — Test Credentials

## Auth mode
`SIGNGUYAI_AUTH_MODE=enforced` in `backend/.env` — all API routes except `/api/health`, `/api/release`, `/api/digest`, and `/api/auth/*` require a valid Bearer token.

## Seeded demo account (auto-created on backend startup)
- Email: `owner@signguyai.test`
- Password: `SignGuy2026!` (Note: this was changed to `NewPass456!` during this session's manual reset-password testing — if login fails with the original password, try `NewPass456!`, or just re-register a fresh account via `/api/auth/register` / the `/register` page.)
- Role: `owner`
- Tenant: `signguyai-demo-shop`

## Auth endpoints
- `POST /api/auth/register` — {email, password (>=8 chars), full_name, company_name?} → creates a new tenant + owner user
- `POST /api/auth/login` — {email, password, remember_me?} → returns {access_token, identity}
- `GET /api/auth/me` — Bearer token required, returns identity
- `POST /api/auth/forgot-password` — {email} → logs reset link to backend stdout (no email provider wired yet)
- `POST /api/auth/reset-password` — {token, new_password}
- Login lockout: 5 failed attempts locks the email for 15 minutes (429 response)

## Frontend routes
- `/login`, `/register`, `/forgot-password`, `/reset-password?token=...` — public
- `/*` — protected, redirects to `/login` if not authenticated

# Day 1 Structure Coverage

This file records which `emergentday1needs.pdf` requirements are represented in the preview.

## Corrected In Preview 2

- Backend is split into `models/`, `routes/`, `services/`, `core_runtime.py`, and registration-only `server.py`.
- Frontend has reusable `components/ribbon/`, `components/dashboard/`, `context/`, and `lib/` ownership folders.
- Dashboard uses the required reusable ribbon pattern.
- Dashboard ribbon contains exactly 12 actions grouped into Create, Customer, and Workflow.
- Ribbon groups have labels, dividers, fixed-height icon buttons, and horizontal mobile access.
- Dashboard uses the specified Revenue, Orders, Quotes, AR, and Unread KPI strip.
- KPI cards use top-border accent colors rather than colored backgrounds.
- Dashboard uses a three-column layout with Action Required spanning two columns.
- Production Snapshot, Billing Snapshot, Shop Health, and Onboarding are present.
- `GET /api/digest` provides the single-call dashboard response contract.
- Pricing Foundation remains represented as settings behavior; Pricing Calculator is a separate Business tool.
- Global Search, Global Create, Notifications, four workspaces, and future module shells remain present.

## Architectural Contracts Established

- `BaseDocument` supplies UUID `id`, `tenant_id`, and timezone-aware ISO timestamps.
- Route logic delegates health/release behavior to a service.
- Runtime permission helper is centralized.
- Frontend API helper supports configured backend URLs and `/api` prefixing.
- Auth and page contexts have dedicated ownership.

## Deliberately Not Implemented Yet

The preview establishes structure and contracts. It does not yet implement MongoDB persistence, JWT authentication, full domain models, Stripe, SendGrid, object storage, or production business workflows.


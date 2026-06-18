# Order Portal Agent Build Rules

Use these rules before making any Order Portal Manager change.

## Controlling Docs

1. `ORDER_PORTAL_MANAGER_MASTER_SPEC.md`
2. `ORDER_PORTAL_MAIN_APP_INTEGRATION_SPEC.md`
3. `ORDER_PORTAL_RELEASE_PLAN.md`
4. Topic-specific `ORDER_PORTAL_*_SPEC.md` files

Older Webstores docs have been removed from this repo. Treat the Order Portal documents above as the active spec set.

## Non-Negotiable Rules

- Do not build standalone and main-app as separate products.
- Do not create a duplicate product catalog.
- Do not create shared global products across customer portals.
- Product templates are reusable; portal products are copied and portal-specific.
- Do not expose internal costs, margins, internal notes, supplier data, or platform admin data to portal owners or buyers.
- Do not allow checkout without backend validation.
- Do not allow launch without launch readiness checks.
- Do not trust frontend gating as enforcement.
- Store all money as integer cents.
- Use explicit fee snapshots.
- Preserve original artwork.
- Save cleaned artwork as a separate version.
- AI output must be editable and human-reviewed before publishing.
- All major status changes must create activity/audit events.
- Do not perform broad route/file renames from `webstores` to `order_portals` without a compatibility plan and tests.

## Required Question Before Coding

Every change must be classified as one of:

- shared Order Portal core
- standalone shell
- main-app adapter
- compatibility layer

If the change cannot be classified, stop and clarify the design before coding.

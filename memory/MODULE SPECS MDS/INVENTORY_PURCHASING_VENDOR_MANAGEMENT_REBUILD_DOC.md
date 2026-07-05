# INVENTORY, PURCHASING & VENDOR MANAGEMENT — Rebuild Documentation

**Documentation Date:** 2026-02-15
**Completed By:** E1 (AI Agent) — direct code inspection, read-only. No live data created or modified.
**Repository / Branch Reviewed:** `/app/` (current preview checkout)
**Files Read:** `backend/models/inventory.py` (full, 229 lines), `backend/services/inventory_service.py` (full, 289 lines), `backend/routes/inventory.py` (full, 991 lines), `backend/models/auth.py` (`Permission` enum + `ROLE_PERMISSIONS` mapping, full), `frontend/src/pages/Inventory.js` (full), `frontend/src/pages/Purchasing.js` (full), `frontend/src/components/inventory/JobMaterialsPanel.js` (full), plus targeted greps across `routes/orders.py` and `routes/digest.py` to confirm cross-module wiring (or its absence).

---

## 1. Purpose and Scope

This module tracks physical material stock (rolls, sheets, packs, and simple quantity items), reserves and consumes that stock against specific Job Ticket production needs, and manages the vendor/purchasing loop when stock runs short — from open shortage → draft Purchase Order → approval → sending → receiving → closing. It is, by a wide margin, **the most rigorously engineered module reviewed across this entire Rebuild Documentation series** — it is the only one found so far with real granular role-based permissions consistently applied, and the only one using atomic optimistic-concurrency database writes (`$expr` guards) to prevent race-condition overselling of stock.

**Named scope items and their coverage:**
- Material stock levels ✅ (`inventory_items` + `inventory_lots`)
- Inventory adjustments ✅ (`inventory_adjustments` endpoint + full transaction ledger)
- Suppliers/Vendors ✅ (`inventory_vendors`)
- Purchasing / Purchase Orders ✅ (`purchase_orders`, full lifecycle)
- Receiving ✅ (`purchase-orders/{id}/receive`, with damaged/missing/backordered/substituted exception tracking)
- Reorder points / reorder alerts ✅ (stored per-item; surfaced in-app and in the daily digest — no real-time push alert, see §6)
- Material usage from orders ✅ (`material_requirements` + `pull-materials`, tied to Job Tickets/Orders)
- Inventory cost tracking ✅ (`unit_cost` per lot, rolled into `inventory_value`; also feeds a cost-suggestion loop back into Pricing Foundation)
- Supplier pricing ✅ (per-vendor `InventoryAlias` records: supplier SKU, pack quantity, last known cost)
- Vendor-related reporting ⚠️ Partial — a vendor list/table exists in `Purchasing.js`, but there is no vendor-level spend/performance/lead-time report; reporting is limited to the transaction ledger and PO list filtered manually.

**Module boundary:** This module owns everything from `inventory_items` through `purchase_orders`. It reads from, but does not own, Job Tickets/Orders (`routes/orders.py`, documented elsewhere) and Pricing Foundation's material catalog (referenced via `pricing_material_key`, one-way suggestion feedback only, not a two-way sync).

---

## 2. Existing Feature Inventory

| Feature | Status | Notes |
|---|---|---|
| Inventory Item catalog (SKU, category, tracking method, base unit, reorder point) | ✅ Working | 5 tracking methods: quantity/roll/sheet/remnant/pack |
| Supplier Aliases per item (multi-vendor SKU mapping, pack size, last known cost) | ✅ Working | Lets one internal item map to different vendor SKUs/costs per supplier |
| Import from Pricing Foundation materials | ✅ Working | One-time, idempotent bulk-create (skips if already linked by `pricing_material_key` or `sku`) |
| Locations / bins (hierarchical, with parent-child) | ✅ Working | 6 location types: receiving/warehouse/rack/shelf/bin/production |
| Inventory Lots (physical stock units, roll/sheet-dimension aware) | ✅ Working | Tracks `width_inches`/`remaining_length_inches` for rolls, `sheet_width/height_inches` for sheets |
| Manual stock receipt (create lot directly) | ✅ Working | Writes an initial `receipt` ledger entry |
| Manual adjustments (with mandatory reason) | ✅ Working | Guards against dropping quantity below reserved or below zero |
| Stock transfer between locations | ✅ Working | Mandatory reason; guards against transferring to the same location |
| Cycle counts | ✅ Working | Per-lot expected vs. actual; mandatory reason on any discrepancy; blocks counting below reserved quantity |
| Full transaction ledger (`inventory_transactions`) | ✅ Working | Every stock-affecting action (receipt/reservation/pull/consumption/waste/return/transfer/adjustment/cycle-count) is logged with actor, reason, quantity, unit cost |
| Material Requirements per Job Ticket | ✅ Working | Manual add, or auto-`generate` from ticket specs (material/substrate/vinyl type + width/height → computed sqft or each quantity) |
| Reservation engine (`reserve_requirement`) | ✅ Working, atomic | FIFO-by-lot-creation-date allocation, dimension-fit aware (`piece_fits`, allows 90° rotation), uses `$expr`-guarded conditional updates to avoid two simultaneous reservations overselling the same lot |
| Auto-shortage creation/resolution | ✅ Working | When a requirement can't be fully reserved, an `inventory_shortages` record is upserted; auto-resolves/cancels when reservation later succeeds or the requirement is released |
| Material Pull workflow (consumed / waste / returned / remnant creation) | ✅ Working | Enforces `pulled = consumed + waste + returned`, requires a waste reason if waste > 0, supports splitting a roll into a reusable "remnant" lot with parent-lot lineage |
| Roll length tracking through pulls | ✅ Working | Computes and decrements `remaining_length_inches` based on the item's base unit (sqft/linear-ft/linear-in) |
| Actual production cost rollup | ✅ Working | Each material pull increments the Job Ticket's `actual_cost` by `used_quantity × lot.unit_cost` |
| Cost-suggestion feedback to Pricing Foundation | ✅ Working | When a receiving unit cost differs from the currently configured Pricing Foundation cost by >$0.01, a `pricing_cost_suggestions` record is upserted for manual review (surfaced in Inventory's Overview tab with a "Review Pricing" link) |
| Vendors CRUD | ✅ Working | Name, website, account #, contact, default shipping notes |
| Purchase Orders — full lifecycle | ✅ Working | draft → approved → sent → (partially_received ⇄ received) → closed, or cancelled from draft/approved/sent |
| PO auto-generation from selected shortages | ✅ Working | Pulls last-known vendor cost/SKU from the item's alias record automatically |
| PO line editing while in draft | ✅ Working | Recomputes base-unit quantities/pack size on every edit |
| PO approval as a separate step from creation/editing | ✅ Working, and permission-segregated | See §5 — a genuine segregation-of-duties control |
| Receiving with exception quantities | ✅ Working | Received / Damaged / Missing / Backordered / Substituted tracked as independent numbers per line, validated to not exceed the ordered quantity in aggregate |
| Auto-close of linked shortages on PO approval/receiving | ✅ Working | Shortage status flows open → ordered (on approval) → resolved (on requirement reservation after receiving) |
| Reorder point / low-stock flagging | ✅ Working | Computed as `available <= reorder_point` in both the summary endpoint and the daily digest (`routes/digest.py`) |
| **Reserve-on-order-approval automation** | ⚠️ **Orphaned, not wired in** | `services/inventory_service.py` defines `reserve_order()`/`release_order()` explicitly for this purpose, but neither function is called from anywhere in `routes/orders.py` or any other route — confirmed by full-codebase grep. Reservation only happens (a) inline at requirement create/update time if the order *already* is approved at that moment, or (b) via the manual "Reserve Available" button in `JobMaterialsPanel.js`. An order approved *after* its requirements were created will not auto-reserve. |
| Real-time low-stock push alert (beyond digest + in-app badge) | ❌ Does not exist | No email/SMS fires the moment an item crosses its reorder point; only the once-daily digest and the in-app Overview tab surface it |
| Vendor lead-time / on-time-delivery / spend reporting | ❌ Does not exist | No aggregation beyond the raw PO list and transaction ledger |
| Emailing/PDF-generating a Purchase Order to the vendor | ❌ Does not exist | "Mark Sent" (`/purchase-orders/{id}/mark-sent`) only flips a status field — no email, attachment, or vendor-facing document is ever produced or sent |
| Barcode/QR scanning for receiving or counts | ❌ Does not exist | All quantity entry is manual numeric input |

---

## 3. Data and Rules

### Collections
- **`inventory_items`** — catalog record (SKU, name, category, `tracking_method`, `base_unit`, `reorder_point`, `preferred_stock_level`, `pricing_material_key`, `aliases[]` embedded array).
- **`inventory_locations`** — hierarchical bins (`parent_id` self-reference, no cycle-detection beyond the direct "cannot be its own parent" check — a location could still be set up in a longer indirect cycle, e.g., A→B→A, without being caught server-side).
- **`inventory_lots`** — the actual countable stock: `quantity_on_hand`, `reserved_quantity`, `unit_cost`, plus optional roll (`width_inches`/`remaining_length_inches`), sheet (`sheet_width_inches`/`sheet_height_inches`), and remnant lineage (`parent_lot_id`) fields. Model-level validator (`InventoryLotInput.validate_quantities`) rejects negative quantities or `reserved > on_hand` at the Pydantic layer, in addition to the route-level `$expr` DB guards — a genuine belt-and-suspenders design.
- **`inventory_transactions`** — append-only ledger; every mutating action writes at least one entry (some actions, like a material pull with waste and a remnant, write four or five entries in sequence).
- **`material_requirements`** — one per (job ticket, inventory item), with `required_quantity`, `reserved_quantity`, `consumed_quantity`, `short_quantity`, `status` (pending/reserved/short/consumed), and an `allocations[]` array recording which specific lot(s) back the reservation.
- **`inventory_shortages`** — derived/denormalized from requirements that can't be fully reserved; status flows open → ordered → resolved/cancelled.
- **`inventory_vendors`**, **`purchase_orders`** (with embedded `lines[]`), **`inventory_cycle_counts`**, **`pricing_cost_suggestions`** — as named.

### Business rules found
- **Unit conversion is split across two separate mechanisms, not one unified system.** `convert_quantity()` only handles linear ft↔in and pack/case↔each; anything involving area (sqft) is computed ad hoc via `roll_area_sqft()` (width × length / 144) at the specific call sites that need it (requirement generation, remnant creation, roll-length decrementing on pull). There is no single function that can convert *any* stored unit to any other — a rebuild should decide if this is worth unifying or is an acceptable practical split (linear/pack conversions vs. area math are genuinely different kinds of math).
- **Every stock-decrementing write is guarded by a MongoDB `$expr` condition** checking that the pre-write state still supports the operation (e.g., `reserve_requirement`, `pull_material`, `adjust_inventory`'s negative-stock guard) — if a concurrent request already changed the document, `modified_count` comes back 0 and the code either retries against a different lot or raises a 409. This is the only inventory-adjacent module found in this documentation series with real concurrency safety.
- **Reservation is FIFO by lot creation date** (`sort("created_at", 1)`), not by expiry, cost, or any configurable strategy — the oldest lot is always drawn from first.
- **A material pull's math must reconcile exactly**: `pulled_quantity == consumed_quantity + waste_quantity + returned_quantity` (within a 0.0001 float tolerance) is enforced server-side, as is "consumed cannot push total consumed above the requirement's required_quantity."
- **PO quantities are tracked in two parallel unit systems per line** — the vendor-facing ordering unit/quantity (`ordered_quantity`, `unit`) and the internal base-unit equivalent (`base_ordered_quantity`, `base_unit`) computed via the item's pack size — necessary because a vendor may sell "by the case" while the shop tracks "each."
- **The one real inconsistency found:** `GET /vendors` requires `Permission.PURCHASING_MANAGE`, while `POST`/`PUT /vendors` require `Permission.VENDORS_MANAGE` — two different permissions gate read vs. write of the same resource. In practice this doesn't cause a visible bug today because every role that has `VENDORS_MANAGE` (Owner, Admin) also has `PURCHASING_MANAGE`, but it's a latent inconsistency a rebuild's permission model should resolve (see §8).

---

## 4. Main Workflows

**A — Catalog setup:** Owner/Admin creates Inventory Items manually, or bulk-imports from Pricing Foundation's already-configured material list (`import-pricing-materials`) as a starting catalog seed (created "inactive-stock" — i.e., zero quantity — records that need a subsequent receipt or adjustment to actually track stock).

**B — Initial/ad hoc stock receipt:** Owner/Admin adds a Location, then either receives stock directly via "Receive Stock" (creates a lot + `receipt` ledger entry) or through the Purchase Order receiving flow (workflow E below).

**C — Job Ticket material requirement lifecycle:**
1. A requirement is added manually or auto-`generate`d from the ticket's stored specs (material/substrate/vinyl type key matched against `pricing_material_key`/`sku`, width×height converted to sqft if the item's base unit is sqft).
2. If the parent Order is already `approved` at creation/edit time, `reserve_requirement` runs inline; otherwise the requirement sits `pending` until a staff member clicks "Reserve Available" in `JobMaterialsPanel.js` (**no automatic trigger fires when the order later transitions to approved** — see §2's flagged gap).
3. Reservation walks matching lots oldest-first, dimension-checks each (`piece_fits`, allowing 90° rotation), reserves what it can, and creates/updates an `inventory_shortages` record for whatever remains unreserved.
4. On the production floor, staff performs a "Pull Materials" action against a specific lot: enters pulled/consumed/waste/returned quantities (+ a mandatory waste reason if any waste), optionally splitting unused length into a new reusable remnant lot. This writes the full ledger trail, decrements the source lot, rolls the actual cost into the Job Ticket, and re-evaluates the requirement's status (`consumed` once fully used, otherwise re-runs `reserve_requirement` for what's still outstanding).

**D — Shortage → Purchase Order → Receiving:**
1. Any requirement that can't be fully reserved surfaces in Purchasing's "Shortages" tab.
2. Staff selects one or more shortages + a vendor and clicks "Create Draft PO" — line items are auto-populated from each shortage's linked item, using that vendor's known alias (SKU/cost) if one exists.
3. Draft PO can be edited (quantities/costs/SKU) while in `draft`.
4. **Approval requires a separate, higher permission** (`PURCHASING_APPROVE`, effectively Owner-only per the current role mapping) from creation/editing (`PURCHASING_MANAGE`, available to Admin too) — approving flips linked shortages to `ordered`.
5. "Mark Sent" is a manual status flip only (no vendor-facing email/document is actually generated or sent).
6. Receiving records per-line received/damaged/missing/backordered/substituted quantities; any `received_quantity > 0` creates a new lot sourced from that PO, writes a `receipt` ledger entry, re-reserves any linked shortage's requirement, and — if the item is linked to a Pricing Foundation material and the actual received cost differs meaningfully from the currently configured cost — creates a pending cost-suggestion for manual review in Pricing Foundation.
7. PO auto-transitions to `received` (all lines fully received) or `partially_received`; can be manually `closed` once received, or `cancelled` from draft/approved/sent (which reopens any linked shortages).

**E — Cycle count:** Staff enters actual on-hand quantities against existing lots; any difference from the currently stored quantity requires a reason, is rejected if it would drop below the lot's reserved quantity, and both updates the lot and writes a `cycle_count_adjustment` ledger entry.

---

## 5. Permissions

This is the **only module found so far in this documentation series with real, consistently-enforced, granular RBAC.** Six distinct permissions gate this domain (defined in `models/auth.py`'s `Permission` enum, the app's actual in-use permission system):

| Permission | Owner | Admin | Staff |
|---|---|---|---|
| `INVENTORY_VIEW` (read items/lots/locations/transactions/counts) | ✅ | ✅ | ✅ |
| `INVENTORY_PULL` (pull materials for production) | ✅ | ✅ | ✅ |
| `INVENTORY_ADJUST` (create/edit items, receive stock, adjust, transfer, cycle count, manage material requirements) | ✅ | ✅ | ❌ |
| `PURCHASING_MANAGE` (create/edit draft POs, mark sent, close, cancel, list vendors) | ✅ | ✅ | ❌ |
| `PURCHASING_APPROVE` (approve a draft PO) | ✅ | **❌** | ❌ |
| `VENDORS_MANAGE` (create/edit vendors) | ✅ | ✅ | ❌ |

**Notable, deliberate-looking design:** `PURCHASING_APPROVE` is withheld from `Admin` in the current `ROLE_PERMISSIONS` mapping — meaning Admin can build and edit a draft Purchase Order but cannot approve it; only Owner (or Platform Admin) can. This is a genuine segregation-of-duties control (someone other than the PO's creator must approve real spend), the only example of this pattern found across all modules documented so far. Staff-role users get view + pull only (matches a shop-floor employee who consumes material during production but shouldn't be able to adjust stock counts or spend money) — also a sensible, deliberate default.

Every backend endpoint enforces its permission via `_require(current_user, Permission.X)`, and the frontend mirrors this with `hasPermission()` checks that hide (not just disable) the relevant buttons (`Inventory.js`'s `canAdjust`, `Purchasing.js`'s `canApprove`). This is the template the other under-permissioned modules (Productivity, and per earlier docs, several others) should be rebuilt to match.

**One inconsistency to resolve:** `GET /vendors` requires `PURCHASING_MANAGE` rather than `VENDORS_MANAGE` (see §3) — a rebuild should either merge these two permissions or make the read endpoint check `VENDORS_MANAGE` (or a new `VENDORS_VIEW`) for consistency.

---

## 6. Integrations/Automation

- **Pricing Foundation feedback loop:** the only real cross-module automation in this domain — a receiving event that reveals a materially different actual cost creates a `pricing_cost_suggestions` record, surfaced back in Inventory's own Overview tab with a link to review it in Pricing Foundation. This is one-directional (Inventory → Pricing Foundation suggestion inbox); Pricing Foundation does not push cost changes back into Inventory automatically either.
- **Daily digest inclusion:** `routes/digest.py`'s `compile_digest_data` does include `low_stock_count` and `inventory_shortages` counts (confirmed by direct code read) — unlike the Productivity module's tasks/appointments, this domain's key alerts (low stock, open shortages) **are** part of the one existing scheduled notification. No dollar amounts or item-level detail are included in the digest, only counts.
- **No vendor-facing automation exists** — POs are never emailed, faxed, or exported as a PDF to the vendor; "sending" a PO is purely an internal status change with no external effect.
- **No real-time/instant reorder-point alert** — the only two surfaces are the once-daily digest and the always-available in-app Overview tab; there is no webhook, push notification, or immediate email the moment stock crosses the reorder point.
- **`reserve_order`/`release_order` are dead code** from an integration-automation standpoint — they exist specifically to be called when an Order's approval status changes, but nothing in `routes/orders.py` calls them; the intended "approve an order → automatically reserve its materials" automation does not fire today.

---

## 7. Recommended Rebuild Scope

1. **Wire `reserve_order()`/`release_order()` into the actual Order approval/cancellation lifecycle** in `routes/orders.py` so material reservation truly is automatic on approval (today it's automatic only if the requirement happens to be created/edited *after* approval, or via a manual per-requirement button) — this is the single clearest functional gap in an otherwise very solid module.
2. **Resolve the vendor-permission split** (`GET /vendors` on `PURCHASING_MANAGE` vs. write on `VENDORS_MANAGE`) into one consistent permission pair (`VENDORS_VIEW`/`VENDORS_MANAGE`).
3. **Decide on vendor-facing PO delivery** — if "Mark Sent" is meant to represent an actual outbound communication, build real email/PDF generation; if it's intentionally just an internal tracking step (shop still emails/calls vendors manually outside the app), rename the button/status to avoid implying automation that doesn't exist.
4. **Consider real-time low-stock alerting** as a natural extension of the existing digest infrastructure, if the business wants faster-than-daily visibility into reorder points — not urgent given the daily digest already covers it, but worth an explicit decision for the rebuild's scope.
5. **Add vendor reporting** (spend by vendor, on-time delivery rate, lead time) if purchasing decision-making is meant to be data-driven — currently the only "reporting" is manually reading the raw PO list and transaction ledger.
6. **Unify or explicitly document the two parallel unit-conversion mechanisms** (`convert_quantity()` for linear/pack, `roll_area_sqft()` for area) so a rebuild doesn't accidentally assume one function handles all cases.
7. **Use this module as the reference implementation** when rebuilding permission enforcement in the other, currently ungated modules (Productivity, and others already documented) — it is the strongest existing example of the permission pattern the app should standardize on everywhere.

---

## 8. Open Decisions

- **Should the reservation trigger point be event-driven off Order status change** (rebuild the intended `reserve_order`/`release_order` wiring) **or should manual "Reserve Available" remain the primary mechanism**, with automatic reservation only as a convenience at requirement-creation time (today's actual, if accidental, behavior)?
- **Is vendor-facing PO delivery (email/PDF) in scope for this rebuild**, or does the shop intend to keep manually communicating with vendors outside the app indefinitely?
- **Should reorder-point alerting move to real-time** (webhook/instant email) or is the existing once-daily digest sufficient for the business's operating rhythm?
- **How much vendor-performance reporting is actually wanted** — is this domain expected to help choose between vendors (lead time, price history, reliability), or is the vendor list purely a lookup/contact directory today and meant to stay that way?
- **Should the two unit-conversion code paths (linear/pack vs. area) be merged into one generalized dimensional-unit system**, given rolls/sheets already carry width/length separately from the tracked `base_unit`?

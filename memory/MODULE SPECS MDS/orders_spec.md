# Orders System — Full Specification
**SignGuy AI | SignTists Lab**
*Generated: June 2026*

---

## Architecture Overview

The orders system is a **4-layer hierarchy**:

```
Order  →  Order Items (Job Tickets)  →  Quotes / Invoices / Work Orders  →  Production Tasks
```

---

## Layer 1 — Order

### Order Fields

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Auto-generated |
| `order_number` | String | Auto-incremented (ORD-0001, etc.) |
| `name` | String | Auto-generated as CUSTOMERNAME-MMDDYY |
| `tenant_id` | String | Multi-tenant isolation |
| `customer_id` | UUID | Linked customer record |
| `customer_name` | String | Denormalized for display |
| `contact_name` | String | On-order contact person |
| `phone` | String | |
| `email` | String | |
| `company_name` | String | |
| `order_source` | Enum | phone, walk_in, email, website, repeat_order, sales_rep |
| `date_created` | ISO datetime | |
| `created_by` | String | User ID |
| `requested_due_date` | ISO date | Customer-requested date |
| `event_date` | ISO date | For event/install jobs |
| `status` | Enum | See Order Status pipeline below |
| `payment_status` | Enum | unpaid, deposit_paid, partially_paid, paid, refunded |
| `approval_status` | Enum | pending, approved, rejected |
| `pickup_delivery_method` | Enum | pickup, delivery, install, ship, undecided |
| `pickup_delivery_notes` | String | |
| `internal_notes` | String | Staff-only |
| `customer_notes` | String | Visible to customer |
| `linked_quote_ids` | Array[UUID] | Linked quotes |
| `linked_invoice_ids` | Array[UUID] | Linked invoices |
| `job_ticket_count` | Integer | Count of order items |
| `overall_progress` | Float 0–100 | Aggregated from production tasks |
| `final_completion_date` | ISO date | When all items completed |
| `is_archived` | Boolean | Soft archive |
| `order_title` | String | Optional display title |
| `shared_production_notes` | String | Inherited by all items |
| `shared_design_notes` | String | Inherited by all items |
| `shared_install_notes` | String | Inherited by all items |
| `shared_color_brand_notes` | String | Inherited by all items |
| `shared_reference_links` | Array[String] | Shared reference URLs |
| `default_item_category` | String | Default category for new items |
| `shared_artwork_default_mode` | Enum | ask / inherit / none |

### Order Status Pipeline

```
draft
  └─► new_intake
        └─► awaiting_review
              └─► awaiting_quote
                    └─► quote_sent
                          └─► awaiting_approval
                                └─► approved
                                      └─► in_production
                                            └─► partially_complete
                                                  └─► ready_for_pickup
                                                  └─► out_for_delivery
                                                        └─► completed

  ↕ on_hold  (can be set from any active stage)
  ↕ cancelled (can be set from any active stage)
```

### Order Sources

| Value | Label |
|---|---|
| `phone` | Phone |
| `walk_in` | Walk-In |
| `email` | Email |
| `website` | Website / Webstore |
| `repeat_order` | Repeat Order |
| `sales_rep` | Sales Rep |

---

## Layer 2 — Order Items (Job Tickets)

### Core Fields

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `ticket_number` | String | e.g., ORD-0001-01 |
| `order_id` | UUID | Parent order |
| `item_name` | String | Description of this item |
| `item_category` | Enum | See categories below |
| `item_subcategory` | String | Free-form sub-classification |
| `quantity` | Integer | |
| `unit_type` | String | each, sqft, linear_ft, etc. |
| `due_date` | ISO date | Item-level deadline |
| `priority` | Enum | normal, high, urgent, rush |
| `department_route` | String | Primary department |
| `assigned_team` | String | |
| `assigned_user_id` | UUID | |
| `status` | Enum | See Item Status pipeline below |
| `production_flow_enabled` | Boolean | Enables task-based production tracking |
| `entry_mode` | Enum | quick / detailed |

### Pricing Fields

| Field | Type | Notes |
|---|---|---|
| `estimated_price` | Float | Calculated or manual |
| `actual_cost` | Float | Post-production cost |
| `labor_estimate` | Float | |
| `material_estimate` | Float | |
| `manual_quote_override` | Float | Overrides calculator output |
| `pricing_snapshot` | JSON | Latest calculator output stored |

### Artwork & Proof Fields

| Field | Type | Notes |
|---|---|---|
| `design_needed` | Boolean | |
| `customer_artwork` | Boolean | Customer-supplied art flag |
| `artwork_status` | Enum | none, received, in_progress, complete |
| `proof_required` | Boolean | |
| `proof_approval_status` | Enum | none, sent, approved, revision_requested, rejected |
| `revision_count` | Integer | |
| `artwork_files` | Array[String] | File references |
| `proof_files` | Array[String] | |
| `mockups` | Array[String] | |
| `linked_order_file_ids` | Array[UUID] | Files inherited from order level |
| `item_artwork_file_ids` | Array[UUID] | Item-specific files |
| `artwork_use_mode` | Enum | shared_only / item_only / both / none |

### Production & QC Fields

| Field | Type | Notes |
|---|---|---|
| `started_date` | ISO date | When production began |
| `finished_date` | ISO date | |
| `progress` | Float 0–100 | Task completion percentage |
| `ready_for_qc` | Boolean | |
| `qc_status` | Enum | none, pending, passed, failed |
| `ready_for_pickup` | Boolean | |
| `rework_needed` | Boolean | |
| `rework_notes` | String | |

### Notes Fields

| Field | Description |
|---|---|
| `special_instructions` | Customer-facing special requests |
| `production_notes` | Internal shop notes |
| `install_notes` | Install crew notes |
| `packaging_notes` | Packing / shipping notes |
| `description` | General item description |

### Item Status Pipeline

```
new
  └─► awaiting_info
        └─► awaiting_proof
              └─► awaiting_approval
                    └─► approved
                          └─► queued
                                └─► in_production
                                      └─► in_qc
                                            └─► ready
                                                  └─► completed

  ↕ on_hold   (any stage)
  ↕ rework    (any stage)
  ↕ cancelled (any stage)
```

### Item Categories (9)

| Value | Display Label | Notes |
|---|---|---|
| `rigid_signs` | Rigid Signs | Coroplast, aluminum, foam board, etc. |
| `banners` | Banners | Vinyl banners, fabric banners |
| `cut_vinyl` | Cut Vinyl | Lettering, decals, stickers |
| `digital_print` | Digital Print | Wide format prints |
| `vehicle_wrap` | Vehicle Wrap | Opens Wrap Command Center |
| `apparel` | Apparel | T-shirts, hats, embroidery |
| `services` | Services | Design, installation, consulting |
| `promo_misc` | Promo / Misc | Branded merchandise, misc |
| `custom` | Custom | Anything that doesn't fit above |

### Dynamic Specs — Key Fields Per Category

**Rigid Signs**
- substrate (coroplast, aluminum, foam board, PVC, acrylic, etc.)
- finish (matte, gloss, reflective)
- thickness
- width, height
- mounting_type (ground stake, wall mount, frame, A-frame, etc.)
- hardware_included (boolean)
- double_sided (single / double)
- indoor_outdoor

**Banners**
- width, height
- material (13oz vinyl, 18oz vinyl, standard mesh, standard fabric)
- hems (top/bottom/all/none)
- grommets (corners, every 2ft, etc.)
- pole_pockets (top, bottom, both, none)
- wind_slits (boolean)
- reinforced_corners (boolean)
- sewn_edges (boolean)
- webbing (boolean)

**Cut Vinyl**
- vinyl_type (calendared, cast, reflective, etc.)
- width, height
- color_specs
- lamination
- indoor_outdoor
- num_colors

**Digital Print**
- media type
- laminate
- substrate
- size_description
- double_sided
- print_method

**Vehicle Wrap**
- vehicle_type (car, truck, van, SUV, box truck, trailer, etc.)
- coverage_type (full wrap, partial wrap, lettering/graphics)
- wrap_material_key (vinyl brand/series)
- artwork_ready (boolean)
- artwork_needed (boolean)
- laminate
- *Note: Full vehicle details (year/make/model/VIN/etc.) stored in Wrap Command Center*

**Apparel**
- garment_type (t-shirt, hoodie, hat, polo, etc.)
- decoration_type (screen print, embroidery, DTG, heat transfer, etc.)
- sizes (S, M, L, XL, 2XL, 3XL with quantities per size)
- print_method
- num_colors

**Services**
- service_type
- estimated_hours
- hourly_rate
- labor_notes

---

## Layer 3 — Documents Generated from Orders

### Quote
- **Trigger:** `POST /api/orders/{id}/generate-quote`
- Pulls item names, quantities, and estimated prices from all order items
- Order status moves to `awaiting_quote` → `quote_sent`
- Linked by `order.linked_quote_ids`
- Sendable to customer for review/approval

### Invoice
- **Trigger:** `POST /api/orders/{id}/generate-invoice`
- Built from order items with line-item pricing
- Supports Stripe payment via Connect (tenant receives payout)
- Payment status tracked: unpaid → deposit_paid → partially_paid → paid
- Linked by `order.linked_invoice_ids`

### Work Order Summary (Shop Floor PDF)
- **Trigger:** `POST /api/orders/{id}/generate-work_order`
- PDF formatted for shop floor / production crew
- Includes item specs, quantities, production notes, install notes
- Download: `GET /api/orders/{id}/work-ticket/pdf`

---

## Layer 4 — Production Tasks

### Task Fields

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `order_id` | UUID | |
| `job_ticket_id` | UUID | Parent item |
| `task_name` | String | e.g., Design, Print, Lamination, Install |
| `department` | Enum | See departments below |
| `stage_sequence` | Integer | Execution order |
| `status` | Enum | See task statuses below |
| `assigned_to` | String | Employee name or ID |
| `start_datetime` | ISO datetime | |
| `end_datetime` | ISO datetime | |
| `time_tracked_minutes` | Integer | |
| `dependency_task_id` | UUID | Blocks until dependent task complete |
| `depends_on_proof` | Boolean | Will not start until proof approved |
| `qc_required` | Boolean | |
| `completion_percent` | Float 0–100 | |
| `notes` | String | |
| `hold_reason` | String | |
| `rework_flag` | Boolean | |
| `timestamp_history` | Array | Full status change audit log |

### Departments

| Value | Label |
|---|---|
| `design` | Design |
| `print` | Print |
| `cut_trim` | Cut / Trim |
| `lamination` | Lamination |
| `weed_mask` | Weed / Mask |
| `sewing_finishing` | Sewing & Finishing |
| `assembly` | Assembly |
| `apparel` | Apparel |
| `wrap_prep` | Wrap Prep |
| `install` | Install |
| `qc_review` | QC Review |
| `packaging` | Packaging |
| `delivery` | Delivery |

### Task Statuses

| Value | Meaning |
|---|---|
| `not_started` | Task created, not yet begun |
| `waiting` | Waiting on upstream dependency |
| `ready` | Dependency met, ready to start |
| `in_progress` | Actively being worked |
| `paused` | Temporarily stopped |
| `on_hold` | Blocked (hold_reason recorded) |
| `needs_review` | Needs supervisor/QC check |
| `complete` | Done |
| `rework` | Failed QC, needs redo |

### Workflow Templates
Pre-built task sequences per item category. Applied to an item to auto-generate all production tasks in the correct department order. Fully customizable per tenant.

---

## Order Detail View — 7 Tabs

| Tab | Contents |
|---|---|
| **Order Items** | All job tickets; add / edit / duplicate / clone items; Wrap Command Center button on wrap items |
| **Production** | All production tasks per item; start / update / complete individual tasks; progress bars |
| **Financial** | Linked quotes, invoices, and work orders with status badges and amounts |
| **Drawings** | Order-level and item-level drawings, markup images, and uploaded reference images |
| **Files** | Order-level shared files (artwork, references); 15MB max; all file types accepted |
| **Notes** | Internal notes, customer notes, shared color/design/install/production context |
| **Activity** | Full chronological audit log of every status change and action taken on the order |

---

## API Endpoints — Orders

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/orders` | List all orders (filters: status, source, webstore_id) |
| POST | `/api/orders` | Create a new order |
| GET | `/api/orders/{id}` | Get single order with all items |
| PUT | `/api/orders/{id}` | Update order fields or status |
| DELETE | `/api/orders/{id}` | Delete order |
| POST | `/api/orders/{id}/generate-quote` | Build quote from items |
| POST | `/api/orders/{id}/start-production` | Move to in_production |
| POST | `/api/orders/{id}/generate-invoice` | Build invoice from items |
| POST | `/api/orders/{id}/generate-work_order` | Generate shop floor work order PDF |
| GET | `/api/orders/{id}/financials` | Totals, balances, payment history |
| GET | `/api/orders/{id}/production-summary` | Stage counts, percent complete |
| GET | `/api/orders/{id}/activity` | Full audit trail |
| POST | `/api/orders/{id}/upload` | Upload file to order (max 15MB) |
| GET | `/api/orders/{id}/files` | List all files on order |
| GET | `/api/orders/{id}/work-ticket/pdf` | Download work order PDF |

## API Endpoints — Order Items (Job Tickets)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/job-tickets` | List tickets (filter: order_id, category) |
| POST | `/api/job-tickets` | Add item to order |
| GET | `/api/job-tickets/{id}` | Get single item |
| PUT | `/api/job-tickets/{id}` | Update item fields |
| DELETE | `/api/job-tickets/{id}` | Delete item |
| POST | `/api/job-tickets/{id}/clone` | Clone / duplicate item |
| POST | `/api/job-tickets/{id}/calculate-pricing` | Run pricing calculator |
| POST | `/api/job-tickets/{id}/save-pricing` | Save pricing snapshot to item |
| GET | `/api/job-tickets/schema/{category}` | Get dynamic field schema for a category |
| POST | `/api/orders/{id}/items/{item_id}/link-artwork` | Link order-level file to item |

---

## Related Systems Connected to Orders

| System | How It Connects |
|---|---|
| **Approvals / Proofs** | Items trigger the proof approval workflow; customers approve via portal |
| **Customer Portal** | Customers view order status, approve proofs, sign contracts, acknowledge aftercare |
| **Wrap Command Center** | Full wrap workflow for vehicle_wrap items (vehicle, design, contract, production, install, inspection, aftercare) |
| **Production Board** | Kanban view across all orders grouped by production stage |
| **Invoices** | Generated from orders; Stripe Connect for payment processing |
| **Customers** | Orders linked to customer record; full order history on customer profile |
| **Webstores** | Online orders arrive with source=webstore; auto-creates order + items |
| **Drawings** | Drawing pad and markup tool attached to orders and individual items |
| **AI Assistant** | Can summarize orders, draft notes, suggest next steps, generate content |
| **Dashboard** | Order metrics shown on main dashboard (due today, overdue, in production, at risk) |

---

## Wrap Command Center (Vehicle Wrap Workflow)

For items with category `vehicle_wrap` (or any wrap category), a dedicated sub-workflow is available:

### Wrap Pipeline Stages
Lead → Estimate → Measurements → Quote Sent → Contract Sent → Contract Signed → Deposit Paid → Design → Proof Sent → Approved → Production → Inspection → Install → Aftercare → Complete

### Wrap-Specific Data (stored in `wrap_data` collection)

| Section | Key Fields |
|---|---|
| **Vehicle Info** | year, make, model, trim, body_type, roof_height, wheelbase, vehicle_color, license_plate, VIN, existing_graphics |
| **Wrapped Areas** | area name, coverage_percent, material, sqft, notes |
| **Design** | questionnaire_status, mockup_status, proof_status, proof files |
| **Contract** | contract_status (not_created → draft → sent → viewed → signed → stored), contract PDF |
| **Pricing** | quoted_price, deposit_required, final_price, materials breakdown |
| **Production** | production_status, tasks, production notes |
| **Install** | install_status, scheduled_date, install issues log, vehicle_received, installer assigned |
| **Inspection** | inspection_status, damage markers (visual diagram), customer_visible flag |
| **Aftercare** | aftercare_status, aftercare_sent, customer_acknowledged, care instructions |

### Wrap Access
Navigation: **Orders → open any order → find item with Vehicle Wrap category → "Open Wrap Command Center" button**
Or: **Orders → Wrap Jobs** (new shortcut in the sub-nav, coming soon)

---

*End of Specification*
*Document path: /app/memory/orders_spec.md*

# Order Portal Data Model Specification

## Rules

- Every shop-owned record includes `sign_shop_id` or tenant/shop scope.
- Every public identifier is app-generated; do not expose database `_id`.
- Money is integer cents.
- Rates are basis points or explicit decimals.
- Dates are timezone-aware UTC internally and ISO strings at API boundaries.
- Mutable records include `created_at`, `updated_at`, and `version`.
- Use separate records for activity, files, ledger entries, orders, products, and submissions. Do not store unbounded arrays on portal records.

## Core Records

### Portal

Fields:

- `portal_id`
- `sign_shop_id`
- `store_owner_id`
- `store_name`
- `store_type`
- `status`
- `store_slug`
- `public_url`
- `qr_code_url`
- `launch_date`
- `deadline_date`
- `auto_close_date`
- `pickup_date`
- `production_start_date`
- `branding_settings`
- `fundraiser_enabled`
- `donation_enabled`
- `progress_meter_enabled`
- `stripe_onboarding_required`
- `store_launch_packet_status`
- `approval_status`
- `created_at`
- `updated_at`

### Store Owner

Fields:

- `store_owner_id`
- `sign_shop_id`
- optional `customer_id`
- optional `contact_id`
- organization/name/contact fields
- email/phone
- portal access status
- Stripe onboarding status
- created/updated timestamps

### Product Template

Fields:

- `template_id`
- `template_name`
- `product_category`
- `product_type`
- default sizes/colors/variants
- personalization support
- mockup support
- default description prompt
- best store types
- internal notes
- editable by shop flag

### Product Template Pricing

Fields:

- `suggested_production_cost_min`
- `suggested_production_cost_max`
- `default_production_cost`
- `suggested_selling_price`
- `suggested_store_owner_share_min`
- `suggested_store_owner_share_max`
- `default_store_owner_share`
- `suggested_donation_buttons`
- `platform_fee_percent_default`
- `platform_fee_estimate_per_item`
- `estimated_shop_gross_before_processing`
- `processing_fee_note`
- `suggested_price_note`

### Portal Product

Fields:

- `product_id`
- `portal_id`
- `source_template_id`
- `product_name`
- `product_description`
- `product_category`
- `production_cost`
- `selling_price`
- `store_owner_share`
- `platform_fee_estimate`
- `shop_gross_before_processing`
- sizes/colors/variants
- personalization enabled
- images
- mockups
- production notes
- active status
- featured status

Portal products are copied from templates and become portal-specific. There is no shared global customer-store product catalog.

### Artwork File

Fields:

- `artwork_id`
- `portal_id`
- `uploaded_by_user_id`
- `uploaded_by_role`
- `original_file_url`
- `cleaned_file_url`
- `file_type`
- `file_name`
- `upload_date`
- `artwork_status`
- `background_removed`
- `transparent_png_created`
- `quality_score`
- `quality_warnings`
- `shop_approved_for_mockups`
- `shop_approved_for_production`
- notes

Original artwork is always preserved. Cleaned artwork is a separate version.

### Mockup

Fields:

- `mockup_id`
- `portal_id`
- `product_id`
- `artwork_id`
- `template_id`
- `mockup_image_url`
- `product_type`
- `product_color`
- `placement`
- `generation_source`
- `created_by`
- `created_at`
- `status`
- `shop_approved`
- `store_owner_visible`
- `store_owner_approved`
- notes

### Buyer Order

Fields:

- order number
- portal/store reference
- buyer name/email/phone
- products ordered
- sizes/colors/variants/personalization
- quantity
- product subtotal
- donation amount
- shipping
- tax
- total paid
- payment status
- fulfillment status
- pickup/shipping method
- notes
- optional main SignGuyAI order bridge fields

### Revenue Ledger Entry

Fields:

- `ledger_id`
- `order_id`
- `portal_id`
- `sign_shop_id`
- `store_owner_id`
- `line_type`
- `amount`
- `from_party`
- `to_party`
- `description`
- `created_at`
- `payment_status`
- `payout_status`

Ledger entries separate buyer payment, product subtotal, owner share, platform fee, production cost estimate, shop gross estimate, processor fee, donations, tax, and shipping.

### Activity Log

Fields:

- activity id
- sign shop id
- portal id
- actor id/role
- event type
- previous state
- new state
- reason/metadata
- created timestamp

Major status and workflow changes always create activity entries.

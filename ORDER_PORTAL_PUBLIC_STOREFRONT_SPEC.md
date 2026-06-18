# Order Portal Public Storefront Specification

## Purpose

The public storefront is the buyer-facing portal. It must be clean, branded, fast, and limited to public data.

## Screens

- Store Home
- Product List
- Product Detail
- Cart
- Checkout
- Confirmation
- FAQ
- Pickup/Shipping Info

## Public Data Rules

Buyers can see:

- portal name/branding
- public description
- products
- public prices
- sizes/colors/variants
- personalization fields where enabled
- donation options where enabled
- fundraiser progress where enabled
- pickup/shipping info
- FAQ
- checkout totals

Buyers must not see:

- production cost
- shop margin
- owner payout
- platform fee internals
- internal notes
- supplier data
- owner portal-only reports

## Checkout Rules

- Cart and checkout require live portal status.
- Checkout requires backend capability checks.
- Server calculates totals.
- Stripe Checkout is used in the initial commerce release.
- Confirmation page displays order summary and next steps.

## Fundraiser And Donation Behavior

- Fundraiser progress meter appears only when enabled.
- Donation tools appear only when donation mode is enabled.
- Donation-only amounts are not platform-fee eligible unless terms later change.

## Portal Availability

Public storefront must handle:

- coming soon
- live
- paused/unavailable
- closing soon
- closed
- archived/unavailable

Non-live states must not allow checkout.

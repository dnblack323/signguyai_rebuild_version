# Order Portal Checkout And Ledger Specification

## Checkout Rules

- Checkout is backend-controlled.
- Frontend totals are display-only.
- Server calculates all money in integer cents.
- Stripe Checkout is used for buyer payment in the initial commerce release.
- Checkout requires portal Live status, checkout entitlement, payment readiness, active products, and valid prices.
- Paused, closed, archived, unavailable, or non-live portals cannot accept checkout.

## Buyer Order Data

Buyer order captures:

- portal/store
- buyer identity/contact
- products ordered
- sizes/colors/variants
- personalization
- quantity
- product subtotal
- donation
- shipping
- tax
- total paid
- payment status
- fulfillment status
- pickup/shipping method
- notes

## Order Statuses

- New
- Paid
- In Review
- Ready for Production
- In Production
- Ready for Pickup
- Shipped / Delivered
- Completed
- Refunded
- Canceled

## Ledger Buckets

Each payment/order must separate:

- buyer payment
- product subtotal
- donation amount
- shipping
- sales tax
- payment processing fee
- platform usage fee
- store owner share
- fundraiser share
- production cost estimate
- shop gross estimate
- setup/monthly/relaunch fees when applicable

Do not store only one total field.

## Platform Fee Rules

- Platform usage fee applies only to eligible product order subtotal unless terms change.
- It does not apply to setup fees, monthly fees, relaunch fees, taxes, shipping, or donation-only amounts.
- Fee snapshots are immutable per order.
- Fee terms shown to owner are captured in the owner approval/launch packet snapshot.

## Stripe And Payouts

Support:

- sign shop Stripe setup
- owner payout onboarding where direct owner payout is required
- payment status refresh
- webhook idempotency
- refund records
- failed payment visibility
- failed transfer visibility
- payout status reporting

## Main App Bridge

Buyer order can later bridge into main SignGuyAI Orders. Bridge must be idempotent, visible when failed, and retryable.

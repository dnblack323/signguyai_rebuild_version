# Order Portal Workflow And Status Specification

## Portal Statuses

Supported statuses:

- Draft
- Questionnaire Sent
- Waiting on Store Owner
- Questionnaire Submitted
- AI Setup Ready
- AI Product Suggestions Ready
- Artwork Needs Review
- Mockups Generated
- Mockups Approved
- Products Selected
- Store Packet Generated
- Sent for Approval
- Changes Requested
- Approved
- Live
- Closing Soon
- Closed
- In Production
- Completed
- Relaunch Ready
- Archived

## Status Rules

- Status changes are service-controlled.
- Every major status change creates an activity log entry.
- Launch requires launch readiness checks.
- Closed portals can be relaunched or duplicated.
- Archived portals preserve history.
- Owner approval must be recorded before launch.
- Buyer checkout is unavailable unless portal is Live and checkout capability is enabled.

## Launch Readiness Gates

Portal cannot launch until:

- sign shop entitlement allows launch
- portal has owner
- questionnaire/setup is complete or intentionally skipped with reason
- portal has active products
- active products have public prices
- public branding/basic content is ready
- Store Launch Packet exists
- owner approval is complete
- terms/fee acknowledgement is complete
- Stripe/card payment readiness passes
- owner payout onboarding is complete when direct owner payout is required
- public data allowlist passes

## Activity Events

Track at minimum:

- portal created
- questionnaire sent
- questionnaire opened
- questionnaire submitted
- artwork uploaded
- background removal completed
- AI summary generated
- missing info detected
- AI product suggestions generated
- products added
- pricing edited
- mockups generated
- mockups approved
- launch packet generated
- packet sent
- changes requested
- owner approved
- Stripe onboarding started
- Stripe onboarding completed
- portal launched
- order received
- portal closing soon
- portal closed
- payout completed
- payment failed
- refund issued
- portal relaunched

## Roles

- Platform Admin can manage platform-level settings and support.
- Sign Shop Admin can manage all portals for their shop.
- Staff can act according to assigned permissions.
- Portal Owner can act only in their own owner portal.
- Buyer can act only through public storefront/checkout.

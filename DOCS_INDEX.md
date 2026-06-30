---
source_pdf: Order_Portal_Manager_Master_Build_Spec-1.pdf
source_pdf_sha256: 1220c11cd909eade18dcf6f96be6d8b73a58cb3c461e20a14ef15b2027edb277
generated_on: 2026-06-18
status: repo-ready draft
---

# Order Portal Manager Documentation Set

Generated on: 2026-06-18

Source PDF: `Order_Portal_Manager_Master_Build_Spec-1.pdf`  
Source SHA-256: `1220c11cd909eade18dcf6f96be6d8b73a58cb3c461e20a14ef15b2027edb277`

## Files

0. `PHASE_0_DECISIONS.md`  
   Current rebuild decisions from the user's Phase 0 answers. Treat this as the latest control document for V1 scope, release order, terminology, launch integrations, and launch gates.

1. `ORDER_PORTAL_MANAGER_MASTER_SPEC.md`  
   Controlling standalone-first product spec.

2. `ORDER_PORTAL_MAIN_APP_INTEGRATION_SPEC.md`  
   Shared core, standalone shell, and main-app adapter rules.

3. `ORDER_PORTAL_RELEASE_PLAN.md`  
   Supersedes old standalone Webstores release plan.

4. `WEBSTORES_PRODUCT_SPEC.md`  
   Compatibility/entitlement capability spec.

5. `FINAL_SPEC_COMPLIANCE.md`  
   Current repo reality and compliance rules.

6. `ORDER_PORTAL_DATA_MODEL_SPEC.md`  
   Required entities and fields.

7. `ORDER_PORTAL_WORKFLOW_STATUS_SPEC.md`  
   Statuses, transitions, gates, and activity events.

8. `ORDER_PORTAL_CHECKOUT_AND_LEDGER_SPEC.md`  
   Checkout, Stripe, ledger, payout, and refund rules.

9. `ORDER_PORTAL_OWNER_PORTAL_SPEC.md`  
   Store owner dashboard, approvals, uploads, reports, privacy.

10. `ORDER_PORTAL_AI_SPEC.md`  
    AI summary, suggestions, mockups, artwork cleanup, credit tracking.

11. `ORDER_PORTAL_PUBLIC_STOREFRONT_SPEC.md`  
    Public buyer portal, product detail, cart, checkout, fundraiser behavior.

12. `ORDER_PORTAL_AGENT_BUILD_RULES.md`  
    Short rules for future agents.

## Recommended Repo Placement

```text
/docs/order-portal/
  DOCS_INDEX.md
  ORDER_PORTAL_MANAGER_MASTER_SPEC.md
  ORDER_PORTAL_MAIN_APP_INTEGRATION_SPEC.md
  ORDER_PORTAL_RELEASE_PLAN.md
  WEBSTORES_PRODUCT_SPEC.md
  FINAL_SPEC_COMPLIANCE.md
  ORDER_PORTAL_DATA_MODEL_SPEC.md
  ORDER_PORTAL_WORKFLOW_STATUS_SPEC.md
  ORDER_PORTAL_CHECKOUT_AND_LEDGER_SPEC.md
  ORDER_PORTAL_OWNER_PORTAL_SPEC.md
  ORDER_PORTAL_AI_SPEC.md
  ORDER_PORTAL_PUBLIC_STOREFRONT_SPEC.md
  ORDER_PORTAL_AGENT_BUILD_RULES.md
```

## Implementation Note

Old Webstores docs should either be replaced with these files, redirected to these files, or marked compatibility/historical.

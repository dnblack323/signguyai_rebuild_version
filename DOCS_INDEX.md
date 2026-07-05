# SignGuyAI Rebuild Documentation Index

This is the top-level documentation index for the full SignGuyAI rebuild. The rebuild is not starting with only Order Portals. Order Portal/Webstores docs are one module track inside the larger platform plan.

## Current Control Documents

0. `PHASE_0_DECISIONS.md`  
   Current rebuild decisions from the user's Phase 0 answers. Treat this as the latest control document for V1 scope, release order, terminology, launch integrations, and launch gates.

0a. `PHASE_0_AGENT_MANUAL_OUTLINE.md`  
   Outline for the Phase 0 section of the step-by-step AI-agent rebuild instruction manual.

0b. `REBUILD_RECOVERY_PLAN.md`  
   Current repo-state recovery plan. Use this to pick up from the rebuild as it exists now instead of restarting from the generic phase plan.

## Source Precedence For Agents

Use the newest, most specific source that applies to the task:

1. Current user instruction in the active thread.
2. Module-specific rebuild docs for implementation details inside one module.
3. `PHASE_0_DECISIONS.md` for cross-app product, terminology, release-order, and launch-gate decisions.
4. `REBUILD_RECOVERY_PLAN.md` for current repo-state resume instructions.
5. Architecture/navigation maps for structure recommendations, after checking whether the current rebuild already applied them.

Do not use a broad Phase 0 or architecture note to overwrite a newer module rebuild sheet. Do not duplicate module-specific requirements in Phase 0 docs unless the rule affects multiple modules.

## Platform Architecture And Module Source Docs

These source documents live outside this repo and should be treated as source inputs, not copied wholesale into the repo:

- `[OneDrive]/0REBUILD/all EMERGENT MD FILES/SIGNGUY_AI_ARCHITECTURE_MAP.md`: Complete app architecture, navigation, page map, and folder-structure recommendation. Compare this against the current rebuild before applying because some recommendations are already implemented here.
- `[OneDrive]/0REBUILD/all EMERGENT MD FILES/MODULE SPECS MDS/`: Module rebuild sheets. These own module-specific rebuild rules such as Auth, Tenants/Organizations, Users/Roles/Permissions, Settings, Orders, Webstores, Pricing, AI, Platform Admin, and related module behavior.

## Order Portal / Webstores Module Docs

These files came from the June 18 Order Portal Manager documentation conversion. They are useful for the Webstores / Order Portal expansion module, but they do not define the whole rebuild by themselves.

Source PDF: `Order_Portal_Manager_Master_Build_Spec-1.pdf`  
Source SHA-256: `1220c11cd909eade18dcf6f96be6d8b73a58cb3c461e20a14ef15b2027edb277`

1. `ORDER_PORTAL_MANAGER_MASTER_SPEC.md`  
   Controlling standalone-first product spec for the Order Portal / Webstores module.

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

## Current Repo / Preview Docs

13. `README.md`  
    Current local preview and repo orientation.

14. `CURRENT_APP_AREAS_AND_TABS.md`  
    Current app areas and navigation tabs.

15. `WRAP_LAB_TRANSFER_COMPLETION.md`  
    Wrap Lab transfer completion notes.

16. `COMMUNITY_AI_SHARED_SYSTEMS_TRANSFER_NOTES.md`  
    Community, notes, and AI shared-system transfer notes.

## Implementation Note

For full-platform planning, read `PHASE_0_DECISIONS.md`, `PHASE_0_AGENT_MANUAL_OUTLINE.md`, `REBUILD_RECOVERY_PLAN.md`, and the source-precedence section above first. Use module rebuild sheets for module implementation details. Use the Order Portal docs only when working on the Webstores / Order Portal module or its shared-system integration points.

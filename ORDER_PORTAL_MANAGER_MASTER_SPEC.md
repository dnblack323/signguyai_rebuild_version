# Order Portal Manager Master Specification

## Authority

This is the controlling repo-native product specification for **Order Portal Manager by Sign Guy AI**.

Source PDF: `C:\Users\thesi\Downloads\Order_Portal_Manager_Master_Build_Spec-1.pdf`

Source PDF SHA256:

`1220C11CD909EADE18DCF6F96BE6D8B73A58CB3C461E20A14EF15B2027EDB277`

This document supersedes earlier standalone Webstores plans where they conflict. Existing `webstores` code, routes, and filenames may remain temporarily for compatibility, but new user-facing product language is **Order Portal Manager**, **Order Portals**, **Portal Owners**, **Buyer Orders**, and **Store Launch Packet**.

## Product Positioning

Order Portal Manager is AI-assisted online order portal software for sign shops, print shops, apparel decorators, wrap shops, and custom product businesses.

It lets a sign shop sell managed online order portals to its own customers. The sign shop is the software user. The sign shop's customer is the portal owner. Buyers are the people ordering from the public portal.

This is not just a webstore builder. It combines questionnaires, AI-assisted setup, reusable templates, portal-specific products, artwork cleanup, mockups, launch packets, owner approval, Stripe onboarding, buyer checkout, payouts, fee tracking, reports, QR codes, and promotional copy.

Core pitch:

- Create the portal.
- Send the owner questionnaire.
- Use AI and templates to speed setup.
- Build a professional Store Launch Packet.
- Let the owner approve before launch.
- Share the link and QR code.
- Let buyers order online.
- Track orders, fees, payouts, reports, and relaunches.

## Users And Roles

### Platform Admin

Sign Guy AI / software owner. Manages sign shop accounts, subscriptions, platform fees, plans, global templates, AI settings, billing settings, Stripe settings, support, analytics, platform revenue, usage, and platform-wide defaults.

### Sign Shop Admin

The paying customer. Creates portals, manages portal owners, sends questionnaires, reviews AI summaries, selects templates, manages products/pricing/artwork/mockups, creates launch packets, sends owner approvals, launches portals, manages orders, billing, payouts, reports, Stripe, and staff permissions.

### Sign Shop Staff

Lower-permission shop users. Can help with portal setup, questionnaire review, artwork, mockups, product setup, launch packets, orders, reports, and owner communication according to permissions.

### Portal Owner

The sign shop's customer. Can log into their owner portal, complete questionnaires, upload artwork, select known products or choose "open to suggestions," review launch packets/mockups, request changes, approve launch, complete Stripe onboarding if needed, view progress, sales, QR/share links, promotional copy, payouts, reports, and deadlines.

Portal owners must never see shop production cost, shop margin, internal notes, internal template cost assumptions, unrelated tenant data, or platform admin data.

### Buyer

The public customer ordering from a launched portal. Can browse products, add to cart, checkout, receive confirmation, and see public pickup/shipping/FAQ information.

## Required Workflow

1. Sign shop creates a new Order Portal.
2. Sign shop selects store type.
3. Sign shop adds or selects portal owner.
4. System sends questionnaire.
5. Portal owner logs into Store Owner Portal.
6. Portal owner answers basic questions.
7. Portal owner uploads logo/artwork.
8. Portal owner selects known products or checks "open to suggestions."
9. Portal owner submits questionnaire.
10. AI summarizes answers.
11. AI detects missing information.
12. AI suggests product templates.
13. AI creates draft product names, descriptions, and mockup previews.
14. AI shows estimated production cost, selling price, owner share, platform fee, and estimated shop gross.
15. Sign shop reviews AI Product Suggestions.
16. Sign shop chooses which products to include.
17. Sign shop edits pricing, variants, images, personalization, and production details.
18. Sign shop approves mockups.
19. Sign shop configures billing, payouts, deadlines, fundraiser goals, and donation settings.
20. Sign shop generates Store Launch Packet.
21. Portal owner reviews packet.
22. Portal owner approves or requests changes.
23. Portal owner completes Stripe payout onboarding if needed.
24. Sign shop launches portal.
25. Portal owner shares link, QR code, and promotional copy.
26. Buyers order online.
27. Portal owner tracks progress.
28. Sign shop manages orders and production.
29. System tracks fees, payouts, reports, platform revenue, and relaunch options.

## Portal Types

Supported portal/store types:

- B2B
- Fundraiser
- Event
- Promotional
- Employee
- General

Store type affects questionnaire sections, suggested fields, setup checklist, suggested email templates, pickup/shipping rules, dashboard labels, reports, fundraiser/progress features, and owner portal behavior.

## Required MVP Features

The first customer-sellable launch must include checkout. Early MVPs are internal engineering milestones only.

Required for launch:

- Sign shop account/login
- Platform admin
- Order portal creation wizard
- Store type selection
- Portal owner records
- Store Owner Portal login
- Questionnaire sending and submission
- Artwork upload
- AI artwork cleanup/background removal
- AI questionnaire summary
- AI missing-info detection
- Product template library
- Product selection from templates
- AI product suggestions
- AI product descriptions
- AI mockup builder
- Mockup approval workflow
- Store branding
- Product images and variants
- Store Launch Packet
- Owner approval flow
- Public store page
- Buyer checkout
- Fundraiser progress meter
- Donation tools for fundraiser portals
- Stripe onboarding support
- Store owner billing settings
- Platform usage fee tracking
- Buyer orders
- Reports
- QR code
- Promotional copy generation
- Activity log
- Portal statuses
- Basic dashboard
- Product pricing defaults with production cost
- Store Launch Packet pricing summary

## Features To Avoid Or Delay

Do not overbuild these before the core launch workflow is stable:

- Full inventory
- Full CRM
- Full production management
- Payroll
- Full accounting replacement
- Complex multi-location permissions
- Unlimited SMS/MMS
- Advanced tax automation beyond Stripe/basic checkout needs
- Complex custom website builder
- Too many pricing plans
- Overcomplicated theme builder
- Public marketplace
- Global product catalog across customer stores
- Fully automated production-file approval
- Customer-facing advanced product builder

## Business Rules

- Each portal belongs to one sign shop.
- Each portal has one portal owner.
- Each portal owns its own products.
- Product templates are reusable; copied products become portal-specific and editable.
- There is no shared global product catalog across customer portals.
- Portal owner can upload artwork and choose known products or "open to suggestions."
- AI suggestions and AI output must be reviewed and editable before publishing.
- Sign shop must approve suggested products and mockups before they become final.
- Store Launch Packet must be reviewed and approved by portal owner before launch.
- Fundraiser donation tools appear only when fundraiser/donation mode is enabled.
- Progress meter appears only when fundraiser/progress mode is enabled.
- Store owner payout onboarding is required if the owner receives direct payouts.
- Platform usage fee applies only to eligible product order subtotal.
- Platform usage fee does not apply to setup fees, monthly fees, relaunch fees, taxes, shipping, or donation-only amounts unless terms later change.
- Store owner must not see shop product costs, shop margin, internal notes, or platform admin data.
- Original artwork must always be saved.
- Cleaned artwork is saved as a separate version.
- Cleaned artwork is not automatically production-ready.
- Production-ready artwork approval is controlled by the sign shop.
- Product pricing defaults are suggestions, not final pricing.
- Production cost must be editable by authorized shop users.
- Store Launch Packet must show customer-facing pricing and fee details clearly.
- Buyers only see public product prices, shipping/tax when applicable, and donation options when enabled.
- All money is stored as integer cents.
- All major status changes create immutable activity/audit events.

## Suggested Screens

### Platform Admin

- Platform Dashboard
- Sign Shops
- Plans & Billing
- Product Template Library
- AI Settings
- Platform Reports
- Support / Issues
- Platform Fee Reports

### Sign Shop

- Dashboard
- Order Portals List
- New Portal Wizard
- Portal Detail
- Portal Owners
- Product Templates
- Orders
- Billing & Payouts
- Reports
- AI Tools
- Settings

### Portal Detail

- Overview
- Questionnaire
- AI Setup Review
- AI Product Suggestions
- Artwork Upload
- Artwork Cleanup
- Mockup Generator
- Products
- Branding
- Store Launch Packet
- Billing & Payouts
- Promotions
- Orders
- Reports
- Settings
- Activity Log

### Store Owner Portal

- Dashboard
- Questionnaire
- Upload Artwork
- Store Launch Packet
- Store Preview
- Products
- QR Code / Share Link
- Promotional Copy
- Sales Progress
- Fundraiser Progress
- Donations
- Payouts
- Messages
- Reports

### Buyer Store

- Store Home
- Product List
- Product Detail
- Cart
- Checkout
- Confirmation
- FAQ
- Pickup/Shipping Info

## Data Model Requirements

Minimum domain records:

- Product Template
- Product Template Pricing
- Product Template Mockup Rules
- Portal
- Portal Owner
- Questionnaire Template
- Questionnaire Submission
- Portal Product
- Artwork File
- Mockup
- Store Launch Packet
- Buyer Order
- Revenue Ledger Entry
- Activity Log
- AI Usage Event

Detailed model contracts live in `ORDER_PORTAL_DATA_MODEL_SPEC.md`.

## Build Phases

### Phase 1: App Shell And Core Data

Authentication, shop accounts, platform admin, portal owner records, portal records, product template records, product records, artwork records, mockup records, order records, fee records, and activity logs.

### Phase 2: Portal Wizard

Store type selection, portal owner creation, questionnaire sending, setup fields, product template selection, and branding setup.

### Phase 3: Store Owner Portal And Questionnaire

Owner login, questionnaire completion, artwork upload, product preference selection, and "open to suggestions" checkbox.

### Phase 4: AI Setup

AI questionnaire summary, field mapping, missing-info checker, product suggestions, product descriptions, and store descriptions.

### Phase 5: AI Mockup Builder

Artwork cleanup, background removal, transparent PNG creation, product mockup generation, product suggestion cards, and mockup review/approval.

### Phase 6: Store Launch Packet

Packet generation, packet preview, pricing/fees summary, mockup section, promotion materials, send for approval, owner approval/change request.

### Phase 7: Public Storefront

Product listing, product detail, cart, checkout, and confirmation.

### Phase 8: Stripe And Billing

Sign shop Stripe setup, store owner billing, owner payout onboarding, platform fee tracking, and payment reporting.

### Phase 9: Reports And Launch Tools

Sales reports, product reports, fundraiser reports, QR code, promotional copy, and relaunch tools.

## Marketing Language

Use this language in marketing and inside the app:

Order Portal Manager by Sign Guy AI helps sign shops create AI-assisted online order portals for fundraisers, teams, businesses, employee stores, events, promotional campaigns, and custom product programs.

- From customer answers to a professional order portal in minutes.
- Create the portal. Sell the service. Let the orders come in.
- One customer portal setup can cover your monthly software cost.
- Give every store owner a complete Store Launch Packet before the portal goes live.
- Build customer stores faster with AI, templates, and organized online ordering.
- Stop chasing group orders through texts, spreadsheets, and paper forms.
- Sell managed online order portals without building custom websites from scratch.

The most important positioning: this is not just a webstore builder. It is an AI-assisted Order Portal Manager for sign shops.

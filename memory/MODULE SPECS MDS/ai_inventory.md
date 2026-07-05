# AI Token Inventory & Cost Analysis
**SignGuy AI | SignTists Lab**
*Generated: June 2026*

---

## Summary

The platform has **28 distinct AI features** across 4 cost tiers, using 3 models (GPT-5.2, GPT-4o-mini, Claude Sonnet 4) plus image generation, Whisper STT, and TTS. The credit system already exists in the codebase (1, 2, or 3 credits per action) but **does not currently track real dollar cost per call or per tenant per month.** A token monitoring layer needs to be added.

**At moderate usage (1 active tenant), estimated AI cost: $45–$110/month**
**At high usage (1 active tenant), estimated AI cost: $180–$450/month**
**Suggested minimum AI add-on charge to tenant: $29–$79/month (depending on tier)**

---

## Models in Use and Their Costs

| Model | Used For | Input Cost | Output Cost | Notes |
|---|---|---|---|---|
| **GPT-5.2** | Primary text AI for most heavy features | ~$15/M tokens | ~$60/M tokens | Most expensive per call |
| **GPT-4o-mini** | Classification, routing, memory, drafts | ~$0.15/M tokens | ~$0.60/M tokens | Very cheap — 100× cheaper than GPT-5.2 |
| **Claude Sonnet 4** | Facebook/Meta message handling | ~$3/M tokens | ~$15/M tokens | Only fires when FB integration is active |
| **OpenAI Image Gen** (DALL-E / GPT Image 1) | All image generation features | ~$0.04/image (std) | ~$0.08/image (hq) | Fixed cost per image, no tokens |
| **Whisper STT** | Voice-to-text transcription | ~$0.006/min | — | Per audio minute |
| **OpenAI TTS-1** | Text-to-speech (assistant speaks back) | ~$0.015/1,000 chars | — | Per character |

*Costs are estimates based on published OpenAI/Anthropic pricing as of mid-2026. Actual billed rates depend on Emergent LLM Key routing.*

---

## TIER 3 — Highest Token Cost
### Image Generation + Heavy Processing
**Typical cost per call: $0.05–$0.15 per image or $0.08–$0.25 per text call**

These consume the most money because they either generate images (fixed cost per image) or run very long GPT-5.2 prompts with large structured outputs.

---

### 1. AI Sign Designer
- **What it does:** Generates a photorealistic mockup photo of a sign for a business with the specified type, style, colors, and business name.
- **Model:** OpenAI Image Gen (DALL-E / GPT Image 1)
- **Cost per use:** ~$0.04–$0.08/image (generates 1 image per call)
- **Triggered by:** AI Tools → Sign Designer
- **Token load:** Fixed image cost. No text tokens.
- **Credit charge:** 3 credits
- **Frequency (moderate/high):** 10–40 uses/month

---

### 2. AI Banner Designer
- **What it does:** Generates a printable-style promotional banner image from headline, subtext, style, and brand colors.
- **Model:** OpenAI Image Gen
- **Cost per use:** ~$0.04–$0.08/image
- **Triggered by:** AI Tools → Banner Designer
- **Credit charge:** 3 credits
- **Frequency (moderate/high):** 5–20 uses/month

---

### 3. Logo Creator
- **What it does:** Generates a raster logo concept image for a new brand from industry, style preferences, colors, and tagline.
- **Model:** OpenAI Image Gen
- **Cost per use:** ~$0.04–$0.08/image
- **Triggered by:** AI Tools → Logo Creator
- **Credit charge:** 3 credits
- **Frequency (moderate/high):** 5–15 uses/month

---

### 4. Logo Refresher
- **What it does:** Takes an uploaded existing logo image and regenerates a modernized version using image editing mode.
- **Model:** OpenAI Image Gen (edit/inpainting mode)
- **Cost per use:** ~$0.08/image (edit mode is higher cost)
- **Triggered by:** AI Tools → Logo Refresher
- **Credit charge:** 3 credits
- **Frequency (moderate/high):** 3–10 uses/month

---

### 5. Mockup Creator
- **What it does:** Generates a photorealistic environment mockup (product shown in a real-world setting).
- **Model:** OpenAI Image Gen
- **Cost per use:** ~$0.04–$0.08/image
- **Triggered by:** AI Tools → Mockup Creator
- **Credit charge:** 3 credits
- **Frequency (moderate/high):** 10–30 uses/month

---

### 6. Vehicle Wrap Mockup
- **What it does:** Generates a photorealistic vehicle wrap mockup with business name, colors, and design description on a selected vehicle type.
- **Model:** OpenAI Image Gen
- **Cost per use:** ~$0.04–$0.08/image
- **Triggered by:** AI Tools → Vehicle Wrap Mockup, OR from within Wrap Command Center
- **Credit charge:** 3 credits
- **Frequency (moderate/high):** 10–40 uses/month *(highest usage feature for a wrap shop)*

---

### 7. Text to Image (General)
- **What it does:** Open-ended image generation from a custom text prompt with style, aspect ratio, and color mood controls.
- **Model:** OpenAI Image Gen
- **Cost per use:** ~$0.04–$0.08/image
- **Triggered by:** AI Tools → Text to Image
- **Credit charge:** 3 credits
- **Frequency (moderate/high):** 5–20 uses/month

---

### 8. Generative Fill / Image Expand
- **What it does:** Takes an uploaded image and expands or fills a region with AI-generated content that seamlessly matches the original.
- **Model:** OpenAI Image Gen (edit mode)
- **Cost per use:** ~$0.08/image
- **Triggered by:** AI Tools → Generative Fill
- **Credit charge:** 3 credits
- **Frequency (moderate/high):** 3–10 uses/month

---

### 9. Race Number Designer
- **What it does:** Generates a racing number graphic with specified number, style, colors, and motorsports series aesthetic.
- **Model:** OpenAI Image Gen
- **Cost per use:** ~$0.04–$0.08/image
- **Triggered by:** AI Tools → Motorsports → Race Number Designer
- **Credit charge:** 3 credits
- **Frequency (moderate/high):** 0–10 uses/month *(motorsports shops only)*

---

### 10. Driver Name Plate
- **What it does:** Generates a professional motorsports driver name plate graphic.
- **Model:** OpenAI Image Gen
- **Cost per use:** ~$0.04–$0.08/image
- **Triggered by:** AI Tools → Motorsports → Driver Name Plate
- **Credit charge:** 3 credits
- **Frequency (moderate/high):** 0–5 uses/month

---

### 11. Race Team Branding
- **What it does:** Generates a race team branding design with team name, number, and colors.
- **Model:** OpenAI Image Gen
- **Cost per use:** ~$0.04–$0.08/image
- **Triggered by:** AI Tools → Motorsports → Race Team Branding
- **Credit charge:** 3 credits
- **Frequency (moderate/high):** 0–5 uses/month

---

### 12. Historical Invoice Analysis (PDF Extract)
- **What it does:** Reads uploaded historical invoice files (PDF, CSV, Excel) using OCR and AI to extract job types, prices, sizes, and quantities. Used in Pricing Foundation → Historical Import to auto-detect your pricing.
- **Model:** GPT-5.2 (with file content, very long prompts)
- **Tokens per call:** ~3,000–8,000 input, ~1,500–3,000 output
- **Cost per call:** ~$0.22–$0.66 (the most expensive single text call in the system)
- **Triggered by:** Settings → Pricing Foundation → Historical Invoice Import → Analyze
- **Credit charge:** 3 credits (extract) + 2 credits (synthesis)
- **Frequency (moderate/high):** 1–5 uses ever *(one-time setup, not recurring)*

---

**Tier 3 Monthly Cost Estimate:**

| Usage Level | Estimated Calls/Month | Estimated Cost/Month |
|---|---|---|
| Moderate | 50–100 image calls | $2.00–$8.00 |
| High | 200–500 image calls | $8.00–$40.00 |

---

## TIER 2 — Medium Token Cost
### Long Text Generation, Complex Analysis, Full Context Calls
**Typical cost per call: $0.03–$0.12 for GPT-5.2 text**

These use GPT-5.2 with moderately long system prompts (300–800 tokens) and expect medium-length structured outputs (500–1,500 tokens).

---

### 13. AI Business Assistant Chat
- **What it does:** The main conversational AI assistant. Loads full shop context (recent orders, customers, revenue, appointments, overdue jobs, team, outstanding invoices) into every message. Answers business questions, drafts content, summarizes data, and executes confirmed actions.
- **Model:** GPT-5.2
- **Tokens per call:** ~2,000–4,500 input (context-heavy), ~300–800 output
- **Cost per call:** ~$0.05–$0.12
- **Triggered by:** Pressing the assistant icon anywhere in the app, or the floating assistant bar
- **Credit charge:** 2 credits per message
- **Hidden extra calls per session:**
  - **Query Classifier** (gpt-4o-mini): ~100 tokens, fires on every message, $0.000015/call
  - **Nav Classifier** (gpt-4o-mini): ~150 tokens, fires on every message, $0.000020/call
  - **Long-term Memory Update** (gpt-4o-mini): ~400 tokens, fires every ~5 messages, $0.000075/call
- **Frequency (moderate/high):** 50–200 messages/month *(highest usage AI feature)*

---

### 14. AI Email Generator
- **What it does:** Generates 7 types of transactional and marketing emails: Quote Follow-up, Payment Reminder, Thank You, Overdue Invoice, Job Update, Job Complete, and Custom. Fills in customer name, order details, and shop branding automatically.
- **Model:** GPT-5.2
- **Tokens per call:** ~800–1,500 input, ~400–600 output
- **Cost per call:** ~$0.04–$0.09
- **Triggered by:** AI Tools → Generate Email, OR from within an Order/Quote/Invoice
- **Credit charge:** 2 credits
- **Frequency (moderate/high):** 30–100 uses/month

---

### 15. Blog Creator
- **What it does:** Writes a full SEO-optimized blog article (title, meta description, intro, body with H2s, conclusion, CTA, image suggestions) for the sign industry. Configurable length, tone, audience, and keywords.
- **Model:** GPT-5.2
- **Tokens per call:** ~500–800 input, ~1,200–2,500 output
- **Cost per call:** ~$0.10–$0.22
- **Triggered by:** AI Tools → Blog Creator
- **Credit charge:** 2 credits
- **Frequency (moderate/high):** 5–20 uses/month

---

### 16. Completed Job Post (Social Media)
- **What it does:** Creates a social media caption + alt caption + hashtag set + posting tips for a completed order. Supports image attachment mode (analyzes a photo of the finished work) and text-only mode.
- **Model:** GPT-5.2 (text-only), GPT-5.2 + vision (with image)
- **Tokens per call:** ~600–1,200 input, ~400–800 output
- **Cost per call:** ~$0.06–$0.12
- **Triggered by:** AI Tools → Completed Job Post
- **Credit charge:** 2 credits
- **Frequency (moderate/high):** 15–50 uses/month

---

### 17. Social Pack Generator
- **What it does:** Generates a set of social media posts optimized for multiple platforms (Instagram, Facebook, LinkedIn, etc.) from a single brief.
- **Model:** GPT-5.2
- **Tokens per call:** ~500–800 input, ~800–1,500 output
- **Cost per call:** ~$0.06–$0.12
- **Triggered by:** AI Tools → Social Pack Generator
- **Credit charge:** 2 credits
- **Frequency (moderate/high):** 5–20 uses/month

---

### 18. Content Calendar
- **What it does:** Generates a month or quarter of planned social media + marketing content ideas, with themes, platform, and post type.
- **Model:** GPT-5.2
- **Tokens per call:** ~500–800 input, ~1,000–2,000 output
- **Cost per call:** ~$0.08–$0.18
- **Triggered by:** AI Tools → Content Calendar
- **Credit charge:** 2 credits
- **Frequency (moderate/high):** 2–8 uses/month

---

### 19. Permit Research
- **What it does:** Provides AI-generated guidance on sign permit requirements, size limits, setbacks, fees, and variance processes for a given city/state and sign type.
- **Model:** GPT-5.2
- **Tokens per call:** ~700–1,200 input, ~800–1,600 output
- **Cost per call:** ~$0.07–$0.14
- **Triggered by:** AI Tools → Permit Research
- **Credit charge:** 2 credits
- **Frequency (moderate/high):** 5–20 uses/month

---

### 20. Business Copywriter
- **What it does:** Generates business-specific copy: taglines, ad copy, website copy, proposal content.
- **Model:** GPT-5.2
- **Tokens per call:** ~500–900 input, ~600–1,200 output
- **Cost per call:** ~$0.06–$0.11
- **Triggered by:** AI Tools → Business Copywriter
- **Credit charge:** 2 credits
- **Frequency (moderate/high):** 5–20 uses/month

---

### 21. Document Composer
- **What it does:** Generates formatted business documents — proposals, contracts, SOPs, job descriptions, etc.
- **Model:** GPT-5.2
- **Tokens per call:** ~600–1,000 input, ~800–2,000 output
- **Cost per call:** ~$0.08–$0.18
- **Triggered by:** AI Tools → Document Composer
- **Credit charge:** 2 credits
- **Frequency (moderate/high):** 3–10 uses/month

---

### 22. Branding Kit Generator
- **What it does:** Produces a text-based branding strategy document: brand story, mission, tone of voice, color palette rationale, font recommendations, taglines, and elevator pitch.
- **Model:** GPT-5.2
- **Tokens per call:** ~600–900 input, ~1,000–2,000 output
- **Cost per call:** ~$0.08–$0.18
- **Triggered by:** AI Tools → Branding Kit Generator
- **Credit charge:** 2 credits
- **Frequency (moderate/high):** 2–8 uses/month

---

### 23. Campaign Builder
- **What it does:** Generates a full multi-channel marketing campaign plan: theme, messaging, channels, schedule, ad copy variants.
- **Model:** GPT-5.2
- **Tokens per call:** ~600–1,000 input, ~1,000–2,000 output
- **Cost per call:** ~$0.08–$0.18
- **Triggered by:** AI Tools → Campaign Builder
- **Credit charge:** 2 credits
- **Frequency (moderate/high):** 2–8 uses/month

---

### 24. Webstore Product Description Generator
- **What it does:** Generates marketing-ready product descriptions for webstore items. Takes product name, category, materials, and features as input.
- **Model:** GPT-5.2
- **Tokens per call:** ~400–700 input, ~300–600 output
- **Cost per call:** ~$0.03–$0.07
- **Triggered by:** Webstores → Edit Product → Generate Description
- **Credit charge:** 2 credits
- **Frequency (moderate/high):** 10–40 uses/month *(fires for each product)*

---

### 25. Parse Action Intent (Assistant Actions)
- **What it does:** When the assistant detects a multi-step action (create order, schedule appointment, log time), it fires a structured parse call to extract order/appointment/time details from the user's natural language message.
- **Model:** GPT-5.2
- **Tokens per call:** ~600–1,200 input, ~200–400 output
- **Cost per call:** ~$0.03–$0.07
- **Triggered by:** Automatically when assistant detects action intent
- **Credit charge:** 1 credit
- **Frequency (moderate/high):** Fires ~20–30% of all assistant messages
- **Note:** This call fires IN ADDITION TO the main assistant call — it's a second GPT-5.2 call on the same user turn.

---

**Tier 2 Monthly Cost Estimate:**

| Usage Level | Estimated Calls/Month | Estimated Cost/Month |
|---|---|---|
| Moderate | 120–250 text calls | $6.00–$20.00 |
| High | 500–1,500 text calls | $25.00–$100.00 |

---

## TIER 1 — Lowest Token Cost
### Short Text, Classification, Routing, Voice
**Typical cost per call: $0.0001–$0.01**

---

### 26. Idea Brainstormer
- **What it does:** Generates tagline ideas, logo concept descriptions, business name ideas, campaign themes, or product names (text only).
- **Model:** GPT-5.2
- **Tokens per call:** ~700–1,000 input, ~600–1,200 output
- **Cost per call:** ~$0.05–$0.09
- **Triggered by:** AI Tools → Idea Brainstormer
- **Credit charge:** 1 credit
- **Frequency (moderate/high):** 10–30 uses/month

---

### 27. Social Job Post (Quick Version)
- **What it does:** Single platform social media caption for a completed job. Simpler/shorter than the full Social Pack.
- **Model:** GPT-5.2
- **Tokens per call:** ~400–700 input, ~200–400 output
- **Cost per call:** ~$0.02–$0.05
- **Triggered by:** AI Tools → Social Job Post
- **Credit charge:** 1 credit
- **Frequency (moderate/high):** 10–40 uses/month

---

### 28. Review Responder
- **What it does:** Generates a professional, personalized response to a customer review (positive or negative).
- **Model:** GPT-5.2
- **Tokens per call:** ~300–600 input, ~200–400 output
- **Cost per call:** ~$0.02–$0.05
- **Triggered by:** AI Tools → Review Responder
- **Credit charge:** 1 credit
- **Frequency (moderate/high):** 5–20 uses/month

---

### 29. Services AI Prefill
- **What it does:** When adding a Services order item, AI reads the service description and auto-populates fields like service type, estimated hours, billing unit, and rate.
- **Model:** GPT-5.2
- **Tokens per call:** ~400–700 input, ~150–300 output
- **Cost per call:** ~$0.02–$0.05
- **Triggered by:** Order Items → Add Item → Services category → "AI Prefill" button
- **Credit charge:** 1 credit
- **Frequency (moderate/high):** 5–20 uses/month

---

### 30. Voice Transcription (Whisper STT)
- **What it does:** Converts a voice recording into text for use in the AI assistant (speak to the assistant instead of typing).
- **Model:** OpenAI Whisper-1
- **Cost per use:** ~$0.006/minute of audio
- **Triggered by:** Assistant → Microphone button → speak → transcribes
- **Credit charge:** 1 credit
- **Frequency (moderate/high):** 10–50 uses/month (~1–3 min avg)

---

### 31. Voice TTS (Text to Speech)
- **What it does:** Converts the AI assistant's text response to spoken audio, played back through the user's browser.
- **Model:** OpenAI TTS-1
- **Cost per use:** ~$0.015/1,000 characters (~$0.002–$0.01 per assistant reply)
- **Triggered by:** Assistant → Enable speaker mode → each assistant response is spoken
- **Credit charge:** 1 credit
- **Frequency (moderate/high):** 5–30 uses/month

---

### 32. Assistant Email Draft
- **What it does:** Drafts a customer-facing email (follow-up, quote note, appointment reminder) directly from the assistant panel without opening the full email generator.
- **Model:** GPT-4o-mini
- **Tokens per call:** ~300–600 input, ~200–400 output
- **Cost per call:** ~$0.0001–$0.0003 (extremely cheap)
- **Triggered by:** Assistant → "Draft an email for [customer]" command
- **Credit charge:** 1 credit
- **Frequency (moderate/high):** 10–30 uses/month

---

## BACKGROUND AI — No Direct Credit Charge

These fire automatically, hidden from the user. They are cheap but fire on every AI interaction.

| Feature | What It Does | Model | Cost/Call | Fires |
|---|---|---|---|---|
| **Query Intent Classifier** | Classifies every assistant message into intent buckets (data query / action / content / nav) | GPT-4o-mini | ~$0.000015 | Every assistant message |
| **Navigation Classifier** | Classifies whether the assistant should navigate to a page | GPT-4o-mini | ~$0.000020 | Every assistant message |
| **Long-term Memory Compressor** | Compresses recent conversation into rolling memory notes to keep context small | GPT-4o-mini | ~$0.000075 | Every ~5 assistant messages |
| **Bulk Quote Follow-up Drafts** | When sending bulk follow-up emails via assistant, generates each email | GPT-4o-mini | ~$0.0001/email | On bulk action |
| **Facebook Message Classifier** | Classifies incoming Facebook messages into intent (order inquiry, status check, etc.) | Claude Sonnet 4 | ~$0.003/call | Every FB inbox message (if FB active) |
| **Facebook Order Extractor** | Extracts order details from a Facebook message thread | Claude Sonnet 4 | ~$0.005/call | When FB order intent detected |
| **Pricing Quiz AI Conversion** | After quiz submission, converts all answers into suggested foundation settings | GPT-5.2 | ~$0.03/quiz | Once per quiz run |

---

## Full Monthly Cost Summary

### At Moderate Usage (1 Tenant, ~1–3 active staff)

| Tier | Feature Group | Est. Calls/Month | Est. Cost/Month |
|---|---|---|---|
| Tier 3 | Image generation | 40–80 images | $1.60–$6.40 |
| Tier 2 | Assistant chat | 60–120 messages | $3.00–$14.40 |
| Tier 2 | Email generator | 30–60 emails | $1.20–$5.40 |
| Tier 2 | Blog + social content | 10–20 content pieces | $0.80–$2.20 |
| Tier 2 | Other text tools | 20–40 uses | $1.00–$4.00 |
| Tier 1 | Short text + voice | 30–60 uses | $0.60–$3.00 |
| Background | Classifiers + memory | 100–200 calls | $0.05–$0.15 |
| **TOTAL** | | | **~$8–$35/month** |

### At High Usage (1 Tenant, heavy daily use)

| Tier | Feature Group | Est. Calls/Month | Est. Cost/Month |
|---|---|---|---|
| Tier 3 | Image generation | 200–500 images | $8.00–$40.00 |
| Tier 2 | Assistant chat | 300–600 messages | $15.00–$72.00 |
| Tier 2 | Email generator | 100–200 emails | $4.00–$18.00 |
| Tier 2 | Blog + social content | 30–80 content pieces | $2.40–$9.60 |
| Tier 2 | Other text tools | 80–150 uses | $4.00–$15.00 |
| Tier 1 | Short text + voice | 100–200 uses | $2.00–$8.00 |
| Background | Classifiers + memory | 500–1000 calls | $0.30–$0.75 |
| **TOTAL** | | | **~$35–$163/month** |

---

## Recommended AI Pricing Tiers to Charge Tenants

Based on the cost analysis, here is a suggested AI add-on pricing model:

| Tier | Name | Credit Budget | Suggested Price | Target Customer |
|---|---|---|---|---|
| Starter | AI Essentials | 100 credits/mo | **$19/mo** | Shops that use assistant chat + emails only |
| Growth | AI Pro | 300 credits/mo | **$49/mo** | Shops actively using content, mockups, and the assistant |
| Power | AI Unlimited | 800 credits/mo | **$99/mo** | High-volume wraps shops, heavy social content, full suite |
| Agency | AI Agency | 2,000 credits/mo | **$199/mo** | Multi-location, fleet wraps, heavy content creation |

**Credit-to-cost ratio (recommended):**
- 1 credit = ~$0.05 of AI cost (with 40–60% margin built in)
- 100 credits = ~$5.00 AI cost → sell for $19 (3.8× margin)
- 300 credits = ~$15.00 AI cost → sell for $49 (3.3× margin)
- 800 credits = ~$40.00 AI cost → sell for $99 (2.5× margin)

---

## Recommended Monitoring System to Build

The current credit system tracks usage counts but NOT actual dollar cost. Here is what needs to be built:

### What to Log Per AI Call

```
{
  tenant_id:     string,
  user_id:       string,
  feature:       string,          // "assistant_chat", "image_generation", etc.
  action_type:   string,          // maps to credit cost table
  model:         string,          // "gpt-5.2", "gpt-4o-mini", etc.
  tokens_input:  integer,
  tokens_output: integer,
  cost_usd:      float,           // calculated at call time from token counts
  credits_used:  integer,         // 1, 2, or 3
  duration_ms:   integer,
  timestamp:     ISO datetime,
  session_id:    string,
  is_background: boolean          // true for classifiers/memory
}
```

### Dashboard Metrics Needed

| Metric | Why It Matters |
|---|---|
| Cost per tenant per month | Know if a tenant is profitable or costing you money |
| Cost per feature per month | Know which features are eating the most budget |
| Average cost per credit used | Track if your credit pricing is still covering real costs |
| Top spenders by feature | Identify high-image-gen users or heavy assistant users |
| Daily/weekly cost burn rate | Catch unexpected spikes early |
| Credits remaining vs. cost remaining | Real-time buffer visibility |

### Rate Limits to Add Per Feature

| Feature | Recommended Daily Limit | Reason |
|---|---|---|
| Image generation (any) | 20 images/day per tenant | Each image costs real money even at scale |
| Blog Creator | 5/day per tenant | Long outputs, high GPT-5.2 cost |
| AI Business Assistant | 50 messages/day per tenant | High context = high per-call cost |
| Historical Invoice Analysis | 3/day per tenant | $0.22–$0.66 per call — must gate tightly |
| Voice TTS | 30/day per tenant | Can add up if left on in a loop |

### Budget Alert Thresholds

| Alert | Trigger | Action |
|---|---|---|
| Low credits warning | Credits < 20% of monthly allotment | Show in-app banner: "Low AI credits" |
| Credits exhausted | Credits = 0 | Disable AI features; show upgrade modal |
| Cost spike alert | Daily cost > 3× 7-day average | Send admin email notification |
| Tenant over budget | Tenant monthly cost > plan ceiling | Flag for platform admin review |

---

## Quick Reference — All 32 AI Features by Credit Tier

### 3 Credits (Highest Cost)
| # | Feature | Model | Typical Cost/Call |
|---|---|---|---|
| 1 | AI Sign Designer | Image Gen | $0.04–$0.08 |
| 2 | AI Banner Designer | Image Gen | $0.04–$0.08 |
| 3 | Logo Creator | Image Gen | $0.04–$0.08 |
| 4 | Logo Refresher | Image Gen (edit) | ~$0.08 |
| 5 | Mockup Creator | Image Gen | $0.04–$0.08 |
| 6 | Vehicle Wrap Mockup | Image Gen | $0.04–$0.08 |
| 7 | Text to Image | Image Gen | $0.04–$0.08 |
| 8 | Generative Fill | Image Gen (edit) | ~$0.08 |
| 9 | Race Number Designer | Image Gen | $0.04–$0.08 |
| 10 | Driver Name Plate | Image Gen | $0.04–$0.08 |
| 11 | Race Team Branding | Image Gen | $0.04–$0.08 |
| 12 | Historical Invoice Analysis | GPT-5.2 (long) | $0.22–$0.66 |

### 2 Credits (Medium Cost)
| # | Feature | Model | Typical Cost/Call |
|---|---|---|---|
| 13 | AI Business Assistant | GPT-5.2 | $0.05–$0.12 |
| 14 | AI Email Generator | GPT-5.2 | $0.04–$0.09 |
| 15 | Blog Creator | GPT-5.2 | $0.10–$0.22 |
| 16 | Completed Job Post | GPT-5.2 | $0.06–$0.12 |
| 17 | Social Pack Generator | GPT-5.2 | $0.06–$0.12 |
| 18 | Content Calendar | GPT-5.2 | $0.08–$0.18 |
| 19 | Permit Research | GPT-5.2 | $0.07–$0.14 |
| 20 | Business Copywriter | GPT-5.2 | $0.06–$0.11 |
| 21 | Document Composer | GPT-5.2 | $0.08–$0.18 |
| 22 | Branding Kit Generator | GPT-5.2 | $0.08–$0.18 |
| 23 | Campaign Builder | GPT-5.2 | $0.08–$0.18 |
| 24 | Product Description Generator | GPT-5.2 | $0.03–$0.07 |
| 25 | Parse Action Intent | GPT-5.2 | $0.03–$0.07 |

### 1 Credit (Lowest Cost)
| # | Feature | Model | Typical Cost/Call |
|---|---|---|---|
| 26 | Idea Brainstormer | GPT-5.2 | $0.05–$0.09 |
| 27 | Social Job Post | GPT-5.2 | $0.02–$0.05 |
| 28 | Review Responder | GPT-5.2 | $0.02–$0.05 |
| 29 | Services AI Prefill | GPT-5.2 | $0.02–$0.05 |
| 30 | Voice Transcription | Whisper | $0.006/min |
| 31 | Voice TTS | TTS-1 | $0.002–$0.01 |
| 32 | Assistant Email Draft | GPT-4o-mini | $0.0001–$0.0003 |

### Background (No Direct Credit Charge)
| Feature | Model | Cost/Call |
|---|---|---|
| Query Intent Classifier | GPT-4o-mini | $0.000015 |
| Navigation Classifier | GPT-4o-mini | $0.000020 |
| Long-term Memory Compressor | GPT-4o-mini | $0.000075 |
| Bulk Quote Follow-up Draft | GPT-4o-mini | $0.0001/email |
| Facebook Message Classifier | Claude Sonnet 4 | $0.003 |
| Facebook Order Extractor | Claude Sonnet 4 | $0.005 |
| Pricing Quiz AI Conversion | GPT-5.2 | $0.03/quiz |

---

*End of AI Token Inventory*
*Document path: /app/memory/ai_inventory.md*

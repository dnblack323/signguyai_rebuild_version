# Wrap Lab AI — Visual / Design System Reference

> Captured for later use: making SignGuy AI adopt a similar look & feel.
> Source files: `styles.css` (2,965 lines), `index.html`, `assets/fonts/`.
> **Nothing here changes code** — it's a faithful documentation of the existing appearance.

---

## 0. IMPORTANT: two visual layers exist in the CSS

The stylesheet contains **two overlapping aesthetics**. Understanding this is critical before copying anything:

| Layer | Where | Look | Status |
|-------|-------|------|--------|
| **Legacy "neon cyber"** | top of file (~lines 1–600) | dark sidebar + **cyan glow** (`rgba(0,229,255,…)`), gradient buttons, glowing shadows | *leftover / partially overridden* |
| **Current "professional flat"** | override block (~lines 2419–2965) | flat **charcoal** buttons, soft pastel badges, navy/purple accents, no glow | **this is the intended, dominant look** |

When replicating, **use the flat/professional layer**. The cyan glow (e.g. the logo box-shadow, `nav-item.active` cyan tint) is residue from an earlier design and is mostly painted over. The CSS *variables* already reflect the professional palette (navy `--primary`, not cyan).

---

## 1. Typography

### Primary typeface
- **Glacial Indifference** — a clean, geometric, slightly condensed humanist sans (think a softer Montserrat/Futura). Self-hosted.
  - `assets/fonts/GlacialIndifference-Regular.otf` (400)
  - `assets/fonts/GlacialIndifference-Bold.otf` (700–900)
- **Stack:** `"Glacial Indifference", Inter, Arial, sans-serif`
- Applied globally to `body` **and** all form controls (`button, input, select, textarea`).

### Type scale & weights (observed)
| Use | Size | Weight |
|-----|------|--------|
| Stat / card value | `2.2rem` | 800 |
| Page header (`h2`) | `1.4rem` | 700 |
| Logo title (`h1`) | `1.1rem` | 700, letter-spacing 0.5px |
| Body / nav item | `0.95rem` | 500 |
| Card label / meta | `0.85rem` | 500 |
| Eyebrow / logo subtitle | `0.7rem` | 600, **uppercase**, letter-spacing 1px |
| Step label | `0.64rem` | — |

Characteristics: **heavy weights for numbers/headers** (700–800), medium body, uppercase letter-spaced eyebrows for labels.

---

## 2. Color tokens (exact)

Defined in `:root`. These are the canonical values — reuse these.

### Surfaces / neutrals
| Token | Hex | Role |
|-------|-----|------|
| `--bg-app` | `#f4f5f6` | app background (light warm gray) |
| `--bg-sidebar` | `#181b20` | sidebar **and** top header (near-black charcoal) |
| `--bg-card` | `#ffffff` | cards / panels |
| `--bg-card-hover` | `#f8f9fa` | card hover |
| `--bg-input` | `#fafbfc` | input fields |
| `--border` | `#d9dde3` | default borders |
| `--border-focus` | `#8a95a3` | focused/hover borders |
| `--charcoal` | `#20242a` | primary button bg (flat layer) |

### Text
| Token | Hex |
|-------|-----|
| `--text-main` | `#171a1f` (near-black) |
| `--text-muted` | `#4b5563` (slate gray) |
| `--text-inverse` | `#ffffff` |

### Brand / semantic
| Token | Hex | Meaning |
|-------|-----|---------|
| `--primary` | `#1d4f91` | **navy blue** — primary brand / links / active |
| `--accent` | `#6536a3` | **purple** — AI features, secondary accent |
| `--success` | `#176b3a` | green |
| `--warning` | `#9a6507` | amber/brown |
| `--danger` | `#b42318` | red |
| `--orange` | `#c2410c` | |
| `--minor` | `#d99a00` | |
| `--note` | `#1d66b1` | informational blue |

**Palette identity:** a restrained, **professional navy-blue + purple** scheme on a light neutral canvas, with a **dark charcoal chrome** (sidebar + header). NOT a neon/cyan theme despite the leftover glows. Purple (`--accent`) is reserved specifically for **AI / mockup** features (`.ai-btn`).

---

## 3. Layout structure

Full-height, **fixed app shell** (`body { overflow:hidden; height:100vh }`) — desktop-app feel, not a scrolling webpage.

```
#app-container (flex, 100vw × 100vh)
├── aside  (sidebar, 260px, fixed, dark #181b20)
│     ├── .sidebar-header  (logo icon + title + uppercase subtitle)
│     ├── nav              (vertical .nav-item list, icon + label)
│     └── .sidebar-footer  (diagnostics button + status)
└── main   (flex column, light)
      ├── header.main-header  (70px tall, dark #181b20)
      │     ├── .header-title h2
      │     └── .header-meta (status dot, shop-info, avatar)
      └── .view-panel(.active)  (scrollable, padding 32px)
```

Key dimensions:
- **Sidebar:** `260px` fixed width, dark, full height.
- **Header:** `70px` tall, dark (matches sidebar), space-between, `0 32px` padding.
- **Content padding:** `32px`.
- Only the active `.view-panel` is shown (`display:block`); others `display:none` — a **tabbed single-page** model.

### Sidebar nav items
- `padding: 12px 16px`, `border-radius: 6px`, icon (`20px`, centered) + label (`0.95rem`/500).
- Hover: faint white overlay, text → main.
- **Active:** navy text (`--primary`) + subtle tinted background + 1px tinted border + weight 600. (Tint is the cyan leftover — replace with a navy tint `rgba(29,79,145,0.08)` for consistency.)

### Header
- Dark bar with white title.
- Right side: pulsing **status dot** (green, glow), shop info (muted, right-bordered divider), and a circular **avatar** (purple `--accent` bg, initials).

---

## 4. Core components

### Cards (`.summary-card`, panels)
- White bg, `1px solid --border`, `border-radius: 9px` (`--radius`), `padding: 20px`, soft shadow `0 1px 2px rgba(23,26,31,.06)`.
- Hover: `translateY(-2px)` + border → `--border-focus`.
- **Accent stripe variants:** `border-left: 4px solid …` — `.accent-cyan`(navy), `.accent-amber`, `.accent-indigo`(purple), `.accent-emerald`, `.accent-rose`. Color-codes each stat card.
- Big value `2.2rem`/800; muted label `0.85rem`; faint oversized icon top-right (`opacity:.15`).

### Buttons (`.btn` + variants) — **use the flat layer**
Base: `padding: 8px 16px`, `border-radius: 6px`, `0.85rem`/600, icon+gap 8px, white bg, charcoal text, `#c9d0d8` border.
| Variant | Fill | Text |
|---------|------|------|
| `.btn` (default) | white | charcoal, gray border; hover `#f4f5f6` |
| `.btn-primary` | **`--charcoal` (#20242a)** flat | white; hover `#0f1114` |
| `.btn-success` | `--success` green | white |
| `.btn-danger` | white, red border `#d98d86` | `--danger` red; hover `#fff5f4` (subtle/outline danger) |
| `.ai-btn` | pale purple `#f5f1fa`, border `#cbb9df` | `--accent` purple |
| `.ai-btn-primary` | solid `--accent` purple | white |
| `.btn-small` | `padding 5px 9px`, `0.74rem` | — |

> Note: the legacy layer (line 456) defines `.btn-primary` as a navy→purple **gradient with cyan shadow**. The flat charcoal version overrides it and is the real look. Pick one — the flat charcoal is current.

### Badges (`.badge`, status pills) — flat layer
- `border-radius: 4px`, small inline-flex, icon+gap, `4px 8px`.
- Soft **pastel tint + matching border + saturated text** per status:
  | Badge | bg | text | border |
  |-------|----|------|--------|
  | quote | `#eef4fb` | `#174f8a` | `#b9cde4` |
  | design | `#f2edf8` | `#603293` | `#cdbbdf` |
  | production | `#fff7e8` | `#8a5906` | `#e8cf99` |
  | install | `#eef4fb` | `#174f8a` | `#b9cde4` |
  | complete | `#edf7f0` | `#155f34` | `#b9d7c3` |
  | warning | `#fff7e8` | `#8a5906` | `#e8cf99` |
  | gray | `#f2f4f6` | `#3f4853` | `#d4d9df` |

### Workflow stepper (`.stepper`)
- Horizontal node row with a connecting line (`::before`, gray `#d9dde3`, `top:12px`) and a green **progress bar** overlay (`--success`).
- `.step-node`: `28px` circle, white bg, gray border, gray number.
- **Active:** navy border + navy number + `0 0 0 3px rgba(29,79,145,.1)` focus ring.
- **Completed:** solid green fill, white check.
- Labels tiny (`0.64rem`), color follows state (navy active / green complete).

### Inputs / filters
- `--bg-input` bg, `--border` border, `radius 6px`, `0.85rem`; focus border → `--primary` (navy). Search inputs have an absolutely-positioned leading icon (muted).

### Forms / structure
- Generous radii (`9px` cards, `6px` controls, `4px` badges), thin 1px borders, very soft shadows. **Flat, low-contrast, document-like** — minimal drop shadows, no glassmorphism in the current layer.

### Customer portal
- Has its own lighter, white-document styling block (the flat layer largely originates here) — signature pad canvas, payment boxes, proof image frames. Same tokens, even flatter presentation.

---

## 5. Spacing / shape / motion tokens

| Token | Value |
|-------|-------|
| `--radius` | `9px` (cards/panels) |
| `--radius-sm` | `6px` (buttons/inputs) |
| badge radius | `4px` |
| `--shadow` | `0 1px 2px rgba(23,26,31,.06)` (very subtle) |
| `--transition` | `all 0.18s ease` |
| Content padding | `32px` |
| Card padding | `20px` |
| Grid gaps | `16px` (cards), `12px` (filters) |
| Scrollbar | thin `6px`, gray thumb `--border` |

Motion is minimal & functional: `0.18s ease`, card hover lift `translateY(-2px)`, button hover color shifts. No elaborate entrance animation.

---

## 6. Overall character (one-paragraph summary)

Wrap Lab reads as a **dense, professional desktop operations console**: a **dark charcoal sidebar + header** framing a **light gray work area** filled with **white, lightly-bordered, softly-shadowed cards**. The accent system is **navy blue for primary/structure and purple specifically for AI**, with **soft pastel status pills** carrying the color-coding. Typography is the geometric **Glacial Indifference** with **heavy weights on numbers and headers** and **uppercase letter-spaced micro-labels**. It is flat, restrained, and utilitarian — closer to a SaaS shop-management dashboard than a marketing site. (Ignore the residual cyan-glow neon styling near the top of the CSS; it's been superseded.)

---

## 7. Later: mapping to SignGuy (Tailwind + Shadcn) — notes for the future task

When you're ready to make SignGuy look similar, the cleanest path:

1. **Drop these tokens into Tailwind theme / CSS variables** — `--primary #1d4f91`, `--accent #6536a3`, charcoal chrome `#181b20`, app bg `#f4f5f6`, the 7 status-badge color triples, radii `9/6/4`, shadow `0 1px 2px rgba(23,26,31,.06)`.
2. **Add Glacial Indifference** as a self-hosted font (the two `.otf` files are in `assets/fonts/`); set as the Shadcn/Tailwind `font-sans`, with Inter fallback.
3. **Chrome:** make the shell a dark `#181b20` sidebar + dark top bar over a light content area (SignGuy currently uses a light ribbon — this is the biggest visual shift).
4. **Shadcn component theming:** Button `default` = flat charcoal; add an `ai` variant = purple; Badge variants mapped to the 7 status palettes above; Card = white/`9px`/subtle shadow.
5. **Keep it flat** — no neon glows; the professional layer is the target.

*(This section is guidance only; no SignGuy changes are made now.)*

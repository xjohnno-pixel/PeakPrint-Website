# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
- **Brand:** Peak Framed (formerly PeakPrint)
- **Slogan:** "Your Adventure. Framed."
- **Product:** 3D-printed framed adventure maps from GPS data (Strava, AllTrails, Garmin, etc.)
- **Domain:** peakframed.com.au
- **Email:** hello@peakframed.com.au
- **ABN:** 23 937 267 604
- **Social:** Instagram only — https://www.instagram.com/peakframed
- **Price:** $169 AUD inclusive of delivery. Optional add-ons: wall mount system +$15, desktop stand +$10, both +$20.

## Deployment Stack
- **Development:** Single `index.html` with inline styles, served locally for preview
- **Staging:** GitHub (github.com/xjohnno-pixel/PeakPrint-Website) → auto-deploys to Vercel (peakprint-website.vercel.app)
- **Production:** Shopify — `peakframed.myshopify.com` (Basic plan), custom domain `peakframed.com.au`
- **Live theme** on Shopify: **Horizon** (Shopify default — placeholder until our theme is ready)
- **Custom theme**: `peakframed-dev` (theme ID `130267775040`), currently **unpublished/Draft**. Edits are pushed via `shopify theme push --theme 130267775040 --store peakframed.myshopify.com --nodelete` from the `shopify/` directory.
- **Storefront state**: **password-protected** while the product page is being built. Public domain shows splash, not the store.
- **Product**: "Adventure Map" with 4 variants (frame×tile combinations) — currently in **DRAFT** status; inventory tracking is **off** (always in stock).
- **Shopify stack:** Liquid templating language (`.liquid` files), Shopify's theme architecture (sections, snippets, templates, assets)
- When preparing for Shopify migration: keep HTML semantic and modular, use CSS custom properties for theming, avoid JS frameworks — vanilla JS only. This makes the Liquid conversion straightforward.
- Shopify-specific notes: forms will be replaced by Shopify's cart/checkout system, product data will come from Shopify's product objects (`{{ product.title }}`, `{{ product.price | money }}`), images will use Shopify's CDN (`{{ image | img_url: 'master' }}`)

### File uploads in Shopify (decided & configured)
Do **not** use a Shopify file-upload app (Uploadery, Easy File Upload, etc.) — they replace the existing drag-and-drop UI with a plainer widget and add a monthly fee. Instead, **port the existing custom drag-and-drop UI into the Liquid product template and upload files directly from the browser to Cloudinary** using an unsigned upload preset.

**Configured values** (pre-populated in `shopify/config/settings_data.json`):
- Cloudinary cloud name: `dhz0lhqcf`
- Unsigned upload preset: `peakframed_orders_unsigned`
- Target folder: `peakframed/orders/`
- Allowed formats (enforced client-side in JS, not in the preset): `gpx, kml, fit, tcx, jpg, jpeg, png, heic`
- Max file size (enforced client-side): 25 MB

**Why client-side validation instead of preset-level:** Cloudinary's redesigned UI no longer exposes `allowed_formats` or `max_file_size` for unsigned presets. We enforce both in the upload widget JS — same protection, plus better UX (instant error feedback before bandwidth is wasted on an over-sized upload).

Flow:
1. Customer drops a `.gpx` / `.kml` / `.fit` / `.tcx` / image into the existing UI
2. JS posts the file to `https://api.cloudinary.com/v1_1/{cloud_name}/raw/upload` with the preset
3. Cloudinary returns a permanent URL
4. JS writes the URL into a hidden `<input name="properties[GPS File]">` inside Shopify's `{% form 'product' %}`
5. Customer adds to cart → URL appears in the order's line item properties (admin + email)

Why: keeps the full UX we already built, $0 at our scale (free tier is 25 GB / 25 GB bandwidth), no vendor lock to a Shopify app, and Cloudinary webhooks can later auto-pipe files into Drive/CRM without Zapier.

Lockdown notes for the Cloudinary preset: restrict allowed formats, set a max file size (e.g. 25 MB), pin to a single folder, and rotate the preset name if it ever leaks.

### Optional Add-Ons product (configured 2026-05-20)
The product-order section adds the customer's add-on choice to the cart as a second line item, billed at the right price. **Product details — do not edit casually:**

- **Product GID:** `gid://shopify/Product/7242176036928`
- **Handle:** `optional-add-ons`
- **Status:** ACTIVE, published to Online Store (cart access requires this; not added to any collection so it stays out of nav/search)
- **Single option:** "Add-on" — 3 values:

| Value | Price | SKU | Variant ID |
|---|---|---|---|
| Wall mount system | $15 AUD | PF-ADDON-WALL  | `41120384778304` |
| Desktop stand     | $10 AUD | PF-ADDON-STAND | `41120384811072` |
| Wall mount + Desktop stand | $20 AUD | PF-ADDON-BOTH | `41120384843840` |

Variant IDs are baked into `shopify/templates/index.json` under the `product-order` section settings. If you change/replace this product in Shopify admin, **update those three IDs** or the cart will silently drop the add-on line item. Inventory tracking is off (always available, like the Adventure Map).

If a customer later visits `/products/optional-add-ons` directly (e.g. someone shares the URL), they'll see a bare product page with no add-to-cart wiring back to the framed map. Acceptable for launch; revisit if it becomes a support issue.

### Transactional emails (Shopify Notifications)
Custom-branded Liquid templates live in **Shopify admin → Settings → Notifications**. Templates we've replaced so far:

- **Order confirmation** — Peak Framed dark header + light body, surfaces all line item properties (Title of Adventure, Distance, etc.), Cloudinary GPS file link, production timeline copy, branches on pickup vs delivery.

**Logo convention — hardcode the CDN URL, do not use `{{ email_logo_url }}`.** Shopify's `email_logo_url` variable does not reliably populate on this store (tried 2026-05-20, never resolved even after Save). For every notification template that needs the logo, paste this `<img>` directly:

```liquid
<img src="https://cdn.shopify.com/s/files/1/0606/6221/8816/files/PeakFramedLandscapeWhite.png" alt="{{ shop.name }}" width="160" style="display:inline-block; max-width:160px; height:auto;">
```

The URL is a permanent Shopify CDN link to `PeakFramedLandscapeWhite.png` in the store's Files. If we ever swap that file we'd need to update every notification template — small cost vs. the variable's unreliability.

**Email branding settings** (Settings → Notifications → Customize email templates) can still be set for the accent colour (`#c4956a`) so any system-default Shopify templates we haven't replaced yet pick up brand colour at least. But the logo upload there does not need to be set since we're hardcoding the URL.

### Local pickup — Melbourne only (Shopify migration to-do)
Collection in person is restricted to the **Melbourne metropolitan area**, served by two pickup points:
- **Port Melbourne** (inner-west)
- **Knoxfield** (outer-east)

The current static site enforces this only with a helper line under the Delivery Method dropdown — a customer in any other city can still tick "Collect in person" and submit the order. At Shopify migration time:

1. **Configure Shopify Local pickup** with two separate pickup locations (Port Melbourne and Knoxfield) under Settings → Shipping and delivery → Local pickup. Each location has its own pickup instructions and address. Shopify lets the customer choose between them at checkout if both are eligible based on their postcode.
2. **Postcode-gate the "Local pickup" option** so it's only offered when the customer's shipping postcode falls within Greater Melbourne. This is a much stronger guard than the current free-text dropdown.
3. **Update the order-confirmation email template** so that when a customer selects local pickup, the Melbourne-only note is repeated and they are told the exact pickup address / time will follow in a separate email. This catches anyone who slips through the postcode gate.
4. If pickup later expands (e.g. a third location, or a partner store interstate), update the Shopify Local pickup list **and** both legal docs (`legal/shipping-and-returns.md` § Collect in person, `legal/terms-of-service.md` § 7).

## Always Do First
- **Invoke the `frontend-design` skill** before writing any frontend code, every session, no exceptions.

## Reference Images
- If a reference image is provided: match layout, spacing, typography, and color exactly. Swap in placeholder content (images via `https://placehold.co/`, generic copy). Do not improve or add to the design.
- If no reference image: design from scratch with high craft (see guardrails below).
- Screenshot your output, compare against reference, fix mismatches, re-screenshot. Do at least 2 comparison rounds. Stop only when no visible differences remain or user says so.

## Local Server
- **Always serve on localhost** — never screenshot a `file:///` URL.
- Python fallback: `python3 -m http.server 3000` (Node.js not natively installed on this machine)
- Use `.claude/launch.json` with the Preview tool for local dev server
- If the server is already running, do not start a second instance.

## Publishing Workflow
- Preview locally first, get user approval before publishing
- `git add` specific files → `git commit` → `git push` to auto-deploy on Vercel
- Never push without user confirmation
- Vercel auto-deploys from the `main` branch on GitHub

## Code Architecture

### Single-file structure (`index.html`, ~1,940 lines)
Everything lives in one file — no build step, no external CSS/JS files.
- **Lines 1–1,180:** `<style>` block — all CSS in source order matching the DOM
- **Lines 1,180–1,720:** HTML body — header, sections, footer
- **Lines 1,720–1,940:** `<script>` block — all vanilla JS

### Page sections (in DOM order)
| ID | Purpose |
|---|---|
| *(fixed header)* | Logo + nav + mobile menu |
| `#hero` | Full-viewport hero with animated headline |
| `#how-it-works` | Section 01 — Connect Your App |
| `#about` | Section 02 — content/feature section |
| `#gallery` | Section 03 — gallery teaser |
| `#our-work` | Full gallery grid + lightbox |
| `#get-started` | Order / product section (gradient background) |
| `#about-us` | Brand story |
| `*(footer)*` | Links, logo, tagline |

### Product selector state machine (`#get-started`)
Two independent selectors — Frame Colour (black/white) and Tile Colour (black/white) — combine to show one of four product images. State is held in `currentFrame` and `currentTile` variables; `updateProductImage()` matches the active combo against `data-combo` attributes on the four `<img>` tags.

**Image naming convention:** `product/frame-{frame}-tile-{tile}.jpg`
- `frame-black-tile-black.jpg`, `frame-black-tile-white.jpg`
- `frame-white-tile-black.jpg`, `frame-white-tile-white.jpg`

### Collapsible order form
The full order form sits inside `#orderCollapse` (`.order-collapse` div). `toggleOrderForm()` toggles the `.open` class to animate it open/closed via `max-height` + `opacity` transition. The toggle button label and `aria-expanded` update accordingly.

### Add-on selector
Four buttons in a 2-column grid (`.addon-grid`). `selectAddon(key)` looks up `ADDON_LABELS` object to get price delta, updates `#addonInput`, `#totalPriceInput`, and the order button text live.

Add-on keys: `none` (+$0), `wall` (+$10), `stand` (+$10), `both` (+$16).

### Lightbox (dual-mode)
The single `#galleryLightbox` element serves two purposes:
1. **Gallery mode** — `openLightbox(index)` cycles through `gallerySrcs[]` array with prev/next arrows
2. **Single-image mode** — `openAddonImage(src, alt)` adds `.single` class which hides prev/next arrows; used by the ⓘ info icons on add-on buttons

### Form submission
`#orderForm` posts to `https://formsubmit.co/hello@peakframed.com.au` via standard HTML form (no JS fetch). Hidden fields carry: Frame Colour, Tile Colour, Add-On, Total Price. Route data is submitted as one of: a URL (`name="Route Link"`), a GPX/KML/FIT file upload (`name="attachment"`), or a screenshot image (`name="attachment"`).

### Key JS functions
| Function | What it does |
|---|---|
| `selectFrame(color)` | Updates frame button state, hidden input, calls `updateProductImage()` |
| `selectTile(color)` | Updates tile button state, hidden input, calls `updateProductImage()` |
| `updateProductImage()` | Finds the `<img>` whose `data-combo` matches `currentFrame-currentTile` and sets `.active` |
| `selectAddon(key)` | Updates add-on button state, price hidden inputs, and order button text |
| `toggleOrderForm()` | Toggles `.open` on `#orderCollapse` to expand/collapse the form |
| `openLightbox(index)` | Opens gallery lightbox at given index |
| `openAddonImage(src, alt)` | Opens lightbox in single-image mode (no nav arrows) |
| `switchRouteTab(tab)` | Switches between link / file / screenshot route input methods |
| `setupFileUpload(zoneId, inputId, displayId)` | Wires drag-and-drop + click-to-browse for file upload zones |

## Brand Assets
- **Logos:** `PeakFramedLandscapeWhite.png` (nav + footer, dark backgrounds), `PeakFramedBlack.png` (light backgrounds) — transparent PNGs
- **Hero images:** `HikeMountain 1.jpg` through `HikeMountain 4.jpg`
- **Gallery images:** `gallery/gallery-1.jpg` through `gallery/gallery-11.jpg`
- **Product combo images:** `product/frame-{frame}-tile-{tile}.jpg` (4 files)
- **Add-on images:** `product/wall-mount.jpg`, `product/desktop-stand.jpg`, `product/wall-mount-and-stand.jpg`
- Always use real assets — do not use placeholders where brand assets exist

## Theme & Design System

### Single source of truth: `:root` design tokens (top of `<style>` block)
All brand values live in CSS custom properties. **Never hardcode hex/font values in CSS rules — always reference the token.** When the site is ported to Shopify, these tokens map 1:1 to theme settings the merchant edits in the admin.

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#0a1118` | base dark background |
| `--color-surface-1/2/3` | `#0f1a24` / `#162533` / `#1e3044` | elevated surfaces |
| `--color-accent` | `#c4956a` | warm gold (CTA, links, focus rings) |
| `--color-accent-light` | `#e8d5c0` | hover/highlight |
| `--color-text` | `#e2e8f0` | primary text |
| `--color-text-secondary` / `-muted` | rgba alphas of `#e2e8f0` | secondary copy |
| `--color-white` | `#ffffff` | white text on accent fills |
| `--font-display` | Playfair Display, Georgia, serif | all headings |
| `--font-body` | SF Pro / system sans stack | body copy |
| `--ease-spring` | `cubic-bezier(0.22, 1, 0.36, 1)` | all transitions |
| `--container-max` / `--container-pad` / `--radius-*` | 1200px / 2.5rem / 4-6-12px | defined but only partially wired |

### Tailwind config mirrors the same tokens
The `tailwind.config = {...}` block at the top of `index.html` references the CSS vars (e.g. `accent: 'var(--color-accent)'`). The `peak-*` palette isn't currently used in HTML classes but is kept as documentation.

### Other design notes
- **Order section** uses a distinct gradient background to visually separate it from content sections
- Refactor risk: when doing `replace_all` on a hex value, the token definition itself in `:root` will also be matched. Always exclude or restore `:root` after bulk replacements.

## Anti-Generic Guardrails
- **Colors:** Never use default Tailwind palette (indigo-500, blue-600, etc.). Use the brand palette above.
- **Shadows:** Never use flat `shadow-md`. Use layered, color-tinted shadows with low opacity.
- **Typography:** Never use the same font for headings and body. Playfair Display for headings, system sans for body. Apply tight tracking (`-0.03em`) on large headings, generous line-height (`1.7`) on body.
- **Gradients:** Layer multiple radial gradients. Add grain/texture via SVG noise filter for depth.
- **Animations:** Only animate `transform` and `opacity`. Never `transition-all`. Use spring-style easing.
- **Interactive states:** Every clickable element needs hover, focus-visible, and active states. No exceptions.
- **Images:** Add a gradient overlay (`bg-gradient-to-t from-black/60`) and a color treatment layer with `mix-blend-multiply`.
- **Spacing:** Use intentional, consistent spacing tokens — not random Tailwind steps.
- **Depth:** Surfaces should have a layering system (base → elevated → floating), not all sit at the same z-plane.

## Hard Rules
- Do not add sections, features, or content not requested by the user
- Do not "improve" a reference design — match it
- Do not stop after one screenshot pass
- Do not use `transition-all`
- Do not use default Tailwind blue/indigo as primary color
- Always get user approval before pushing to GitHub/Vercel

## Legal Documents (`legal/` folder)
Drafts of Privacy Policy, Terms of Service, and Shipping & Returns Policy live as markdown in `legal/`. **Not yet legally reviewed** — banner at the top of each says so. Not deployed as live pages; intended to be pasted into Shopify admin (Settings → Policies) at migration time, after a lawyer review.

### Confirmed business decisions baked into the policies (single source of truth)
- **Governing law:** Victoria, Australia
- **GST:** not currently registered (turnover under $75k threshold). Prices are GST-exclusive but priced as if inclusive ($169) so registering later doesn't require a customer-facing price bump.
- **Privacy Act (AU):** turnover under $3M/yr → exempt from most Australian Privacy Principles. Our Privacy Policy is **voluntary best practice**, not a legal requirement at this scale. Reasons we still publish a full one: (a) good practice / customer trust, (b) Shopify handles a lot of personal data on our behalf, (c) the $3M small-business exemption may be removed in upcoming Privacy Act reforms. **Australian Consumer Law** (covered in T&Cs / Shipping & Returns) is the real risk surface — that doc is the one to keep tight.
- **Payment processor:** Wise + Shopify Payments (+ wallet methods)
- **Shipping carrier:** Australia Post (3–7 business days after dispatch)
- **File hosting:** Cloudinary (when Shopify migration happens)
- **Email:** CheaperDomains hosts the `hello@` mailbox
- **Analytics:** Shopify Analytics
- **Data retention:** 7 years (ATO record-keeping)
- **Lost-parcel window:** 20 business days from dispatch
- **Damaged-in-transit window:** 5 business days from delivery — **photos only, no return required**
- **Bulk orders:** customers must contact for >10 maps in one transaction
- **Gift orders:** discouraged; recommend gift cards instead. Gift cards are sold at a **single fixed denomination of $169 AUD** — exactly one standard framed map. No partial-value or custom-amount gift cards. Add-ons (wall mount system, stand) are covered by the recipient at checkout if they want them, or by gifting a second card. Brand message: "give a frame, not a fraction."
  - **2026-05-20 audit note**: the store currently has **two** gift card products (`peakframed-gift-card-one-adventure-map` and `peakframed-gift-card-one-adventure-map-wall-mount-or-stand`), both priced $169. This diverges from the "one denomination" rule above. **Decide and consolidate**: either archive the second product (cleanest), or keep both at $169 and price the second one correctly at $179 if it's meant to bundle an add-on. Until then the customer experience is ambiguous.
- **Abandoned-cart emails:** opt-in only, via Shopify; covered in Privacy Policy § 4a

Update these decisions in the markdown files first, then regenerate PDFs (see below).

### PDF build pipeline
`legal/_build_pdfs.py` converts each `.md` → branded A4 PDF using the system Python `markdown` library and Chrome headless (no other dependencies). Outputs four files:
- One PDF per policy (for individual reference)
- `peakframed-legal-pack.pdf` — combined cover + TOC + all three docs (this is the one to email lawyers/Keegan)

Run from project root:
```
python3 legal/_build_pdfs.py
```
PDFs are gitignored-by-convention (kept local, not committed) since they regenerate from the markdown source.

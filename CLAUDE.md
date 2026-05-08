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
- **Price:** $169 AUD inclusive of delivery (add-ons +$10 each, or +$16 for both)

## Deployment Stack
- **Development:** Single `index.html` with inline styles, served locally for preview
- **Staging:** GitHub (github.com/xjohnno-pixel/PeakPrint-Website) → auto-deploys to Vercel (peakprint-website.vercel.app)
- **Production (final):** Shopify — the site will ultimately be ported to Shopify
- **Shopify stack:** Liquid templating language (`.liquid` files), Shopify's theme architecture (sections, snippets, templates, assets)
- When preparing for Shopify migration: keep HTML semantic and modular, use CSS custom properties for theming, avoid JS frameworks — vanilla JS only. This makes the Liquid conversion straightforward.
- Shopify-specific notes: forms will be replaced by Shopify's cart/checkout system, product data will come from Shopify's product objects (`{{ product.title }}`, `{{ product.price | money }}`), images will use Shopify's CDN (`{{ image | img_url: 'master' }}`)

### File uploads in Shopify (decided)
Do **not** use a Shopify file-upload app (Uploadery, Easy File Upload, etc.) — they replace the existing drag-and-drop UI with a plainer widget and add a monthly fee. Instead, **port the existing custom drag-and-drop UI into the Liquid product template and upload files directly from the browser to Cloudinary** (or Uploadcare) using an unsigned upload preset.

Flow:
1. Customer drops a `.gpx` / `.kml` / `.fit` / `.tcx` / image into the existing UI
2. JS posts the file to `https://api.cloudinary.com/v1_1/{cloud_name}/raw/upload` with the preset
3. Cloudinary returns a permanent URL
4. JS writes the URL into a hidden `<input name="properties[GPS File]">` inside Shopify's `{% form 'product' %}`
5. Customer adds to cart → URL appears in the order's line item properties (admin + email)

Why: keeps the full UX we already built, $0 at our scale (free tier is 25 GB / 25 GB bandwidth), no vendor lock to a Shopify app, and Cloudinary webhooks can later auto-pipe files into Drive/CRM without Zapier.

Lockdown notes for the Cloudinary preset: restrict allowed formats, set a max file size (e.g. 25 MB), pin to a single folder, and rotate the preset name if it ever leaks.

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

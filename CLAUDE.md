# CLAUDE.md — Peak Framed Website Rules

## Project Overview
- **Brand:** Peak Framed (formerly PeakPrint)
- **Slogan:** "Your Adventure. Printed."
- **Product:** 3D-printed framed adventure maps from GPS data (Strava, AllTrails, Garmin, etc.)
- **Domain:** peakframed.com.au
- **Email:** hello@peakframed.com.au
- **ABN:** 23 937 267 604
- **Social:** Instagram only — https://www.instagram.com/peakframed
- **Price:** $149 AUD inclusive of delivery

## Deployment Stack
- **Development:** Single `index.html` with inline styles, served locally for preview
- **Staging:** GitHub (github.com/xjohnno-pixel/PeakPrint-Website) → auto-deploys to Vercel (peakprint-website.vercel.app)
- **Production (final):** Shopify — the site will ultimately be ported to Shopify
- **Shopify stack:** Liquid templating language (`.liquid` files), Shopify's theme architecture (sections, snippets, templates, assets)
- When preparing for Shopify migration: keep HTML semantic and modular, use CSS custom properties for theming, avoid JS frameworks — vanilla JS only. This makes the Liquid conversion straightforward.
- Shopify-specific notes: forms will be replaced by Shopify's cart/checkout system, product data will come from Shopify's product objects (`{{ product.title }}`, `{{ product.price | money }}`), images will use Shopify's CDN (`{{ image | img_url: 'master' }}`)

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

## Brand Assets
- Logos: `PeakFramedWhite.png` (for dark backgrounds), `PeakFramedBlack.png` (for light backgrounds) — both transparent PNGs
- Hero images: `HikeMountain 1.jpg` through `HikeMountain 4.jpg`
- Gallery images: `gallery/gallery-1.jpg` through `gallery/gallery-11.jpg`
- Product images: `product/frame-black.jpg`, `product/frame-white.jpg`
- Always use real assets — do not use placeholders where brand assets exist

## Theme & Design System
- **Background:** `#0a1118` (base dark), `#0f1a24`, `#162533`, `#1e3044` (elevated surfaces)
- **Accent:** `#c4956a` (warm gold), `#e8d5c0` (light accent)
- **Text:** `#e2e8f0` (primary), `rgba(226,232,240,0.6)` (secondary), `rgba(226,232,240,0.4)` (muted)
- **Heading font:** Playfair Display (Google Fonts) — serif, display
- **Body font:** SF Pro / system sans-serif stack
- **Order section** uses a distinct gradient background to visually separate it from content sections

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

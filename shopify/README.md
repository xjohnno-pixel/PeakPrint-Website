# Peak Framed — Shopify Theme

Custom Shopify theme matching the Peak Framed brand site. Ported from the
single-file Vercel prototype in `../index.html`.

## Quickstart (local dev)

You need **Shopify CLI** (one-time install):

```bash
brew tap shopify/shopify
brew install shopify-cli
```

Once the Shopify store exists and you have access:

```bash
cd shopify
shopify theme dev --store peakframed.myshopify.com
```

This boots a local preview at `http://127.0.0.1:9292` that hot-reloads as you
edit Liquid/CSS/JS. Changes do **not** affect the live theme — Shopify CLI
serves them from a temporary development theme on the store.

To push to the dev store as a real theme:

```bash
shopify theme push --unpublished --theme-name "peakframed-dev"
```

To publish (live cutover):

```bash
shopify theme publish --theme <theme-id>
```

## Architecture

Standard Shopify Online Store 2.0 theme structure:

```
shopify/
├── config/
│   ├── settings_schema.json    # Theme settings exposed in Shopify admin
│   └── settings_data.json      # Default values for those settings
├── layout/
│   └── theme.liquid            # Page shell — wraps every page
├── templates/
│   ├── index.liquid            # Homepage
│   ├── product.liquid          # Product detail (the order page)
│   ├── page.liquid             # Generic page (Privacy, Terms, About, etc.)
│   └── cart.liquid             # Cart fallback
├── sections/                   # Re-orderable sections used in templates
│   ├── header.liquid
│   ├── footer.liquid
│   ├── hero.liquid
│   ├── ...
├── snippets/                   # Small reusable bits (icons, meta tags)
├── assets/
│   ├── theme.css               # All CSS (compiled from one source file)
│   └── theme.js                # All JS — vanilla, no frameworks
└── locales/
    └── en.default.json         # Translatable strings
```

## Design tokens → theme settings

The `:root` CSS custom properties from the Vercel site (`--color-bg`,
`--color-accent`, `--font-display`, etc.) are exposed as **theme settings** in
`config/settings_schema.json`. Merchant edits them in:

**Shopify admin → Online Store → Themes → Customize → Theme settings**

The settings are then injected at the top of `assets/theme.css` via Liquid
substitution. So the merchant can tweak the brand palette without touching
code, while the rest of the CSS uses `var(--color-accent)` as before.

## What's wired

| Feature | Status |
|---|---|
| Brand color/font tokens as theme settings | ☑ |
| Header + nav + mobile menu | ☑ |
| Hero section | ☑ |
| Sections 01 / 02 / 03 | ☑ |
| Gallery + lightbox | ☑ |
| Product page — frame×tile selector | ☐ |
| Product page — add-on selector | ☐ |
| Order form → Shopify cart (replaces FormSubmit) | ☐ |
| Cloudinary file upload widget | ☐ |
| Footer | ☑ |
| About Us section (homepage) | ☑ |
| Legal policy pages (Privacy / Terms / Shipping & Returns) | ☐ |

## Migration decisions baked in

See `../CLAUDE.md` for the full list. Key ones:

- **Product variants** = Frame Colour (Black / White) × Tile Colour (Black / White) = 4 variants
- **Add-ons** = line item properties (not variants) to keep SKU count manageable
- **File uploads** = direct browser → Cloudinary, URL written to hidden line item property field (no Shopify file-upload app)
- **Local pickup** = postcode-gated to Greater Melbourne (configure in Shopify shipping settings, not in code)
- **Gift cards** = Shopify native gift card product

## Things to know

- This theme has **no build step** — Liquid + vanilla CSS/JS. Shopify CLI handles upload/sync.
- Do not use jQuery, Tailwind CDN, or any other runtime framework. The Vercel
  site uses a Tailwind CDN script that we are intentionally dropping.
- All colors, fonts, and easing come from theme settings — **never hardcode**.

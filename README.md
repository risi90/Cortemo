# Cortemo Webshop

Production implementation of the `Webshop` design from the Cortemo Design System
handoff bundle (`../project/pages/Webshop.html`), built as a real app.

**Stack:** Vite · React 18 · TypeScript · Tailwind CSS v3 · lucide-react.

## Run

```bash
npm install
npm run dev        # dev server
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build
```

## What it is

A single state-based e-commerce flow with three views:

1. **Assortiment** — editorial bento grid of the four collections (`GroupGrid`).
2. **Productlijst** — masonry grid with pill filter tabs per collection (`ProductList`).
3. **Product Detail (PDP)** — photo + liquid-glass purchase sidebar with a size
   dropdown, option checkboxes, live total, add-to-cart toast + header badge, and
   a configurator upsell block (`ProductDetail`).

Shared across the site: the glass pill **navbar** with a dark/light **theme
toggle** (persisted in `localStorage`, dark is default), and the **footer**.

### Deep links

- `?cat=<planten|hoogte|vuurwater|deco>` opens a collection.
- `?product=<id>` opens a product's PDP (e.g. `?product=fuoco`).

## Structure

```
src/
  App.tsx                 # shell: page-shell, header, view routing, cart, toast
  components/
    CortemoNav.tsx        # shared navbar + theme toggle
    CortemoFooter.tsx     # shared footer
    CortemoLogo.tsx       # two-tone beeldmerk
    ProductImage.tsx      # static image (or warm placeholder when none)
  views/
    GroupGrid.tsx         # view 1
    ProductList.tsx       # view 2
    ProductDetail.tsx     # view 3
  data/catalog.ts         # GROUPS, SUBCATS, PRODUCTS, pricing, euro()
  lib/useTheme.ts         # theme state + localStorage
  index.css               # Tailwind + Cortemo theme (dark/light) tokens
public/img/               # bundled product renders
```

## Assets

The three product renders live in `public/img/` (webp). For builds from a source
tree without the binaries (e.g. a direct file upload deploy), `npm run build`
fetches them automatically via `scripts/fetch-assets.mjs` (also available as
`npm run fetch-assets`); it skips files that are already present.

## Notes on the port

- The design's drag-drop `<image-slot>` placeholders (a design-tool feature) are
  replaced by static `<img>` from the three bundled renders. Groups without a
  bundled render (Decoratie & Praktisch) fall back to a warm-grey placeholder tile,
  matching the design's empty-card treatment.
- Links to pages outside this Webshop scope (Configurator, Ons verhaal, B2B portal,
  service pages) are present but point to `#`, since only the Webshop was in scope.
  The in-app "Assortiment" nav link and "Terug naar collecties" return to the
  collection grid.

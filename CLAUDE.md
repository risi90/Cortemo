# Cortemo — instructies voor Claude

## Git-workflow

- **Push wijzigingen altijd direct naar `main`.** Geen aparte feature-branches
  of pull requests, tenzij de eigenaar er expliciet om vraagt.

## Project

React + Vite + Tailwind webshop voor maatwerk cortenstaal (Nederlandstalig).

- `npm run dev` — ontwikkelserver
- `npm run build` — typecheck + productiebuild (draait eerst `fetch-assets`)
- `npm run typecheck` — alleen typecheck

Structuur: views in `src/views/`, gedeelde componenten in `src/components/`,
productdata in `src/data/catalog.ts`, cart-helpers in `src/lib/cart.ts`.
Navigatie is state-based in `src/App.tsx` (met URL-params `cat`, `product`,
`page`). Thema (donker standaard, licht via toggle) wordt gescoped op
`.page-shell`/`.cortemo-footer` in `src/index.css`; nieuwe UI moet in beide
thema's werken.

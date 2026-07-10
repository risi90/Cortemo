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

3D-configurator (`?page=maatwerk`): schema-gedreven. Producttypes, maat-
grenzen, opties en tarieven staan in `src/data/configuratorSchema.ts` —
tarieven aanpassen of een producttype toevoegen gebeurt dáár, niet in de
3D-code. Prijsberekening in `src/lib/pricing.ts` (puur), state in
`src/store/configuratorStore.ts` (zustand), 3D in
`src/components/Configurator3D/` (react-three-fiber, lazy geladen zodat de
webshop-bundle klein blijft). Het cortenmateriaal combineert een
procedurele basis met gescande PBR-maps (`public/img/textures/`, CC0 van
ambientCG) voor kleur, normal en roughness. Configuraties worden
geserialiseerd in het `cfg` URL-param (deelbaar/hervatbaar).

Admin (`?page=admin`, ook via footerlink "Beheer"): `src/views/Admin.tsx`
met datalaag in `src/lib/adminStore.ts`. Alles draait nu op localStorage
(demo); elke functie is zo opgezet dat hij later door een API-call
vervangen wordt. Tarieven die de beheerder daar opslaat overschrijven de
schema-defaults live via `getPricing()`. Orders komen uit de checkout,
offertes uit het maatwerkformulier.
Navigatie is state-based in `src/App.tsx` (met URL-params `cat`, `product`,
`page`). Thema (donker standaard, licht via toggle) wordt gescoped op
`.page-shell`/`.cortemo-footer` in `src/index.css`; nieuwe UI moet in beide
thema's werken.

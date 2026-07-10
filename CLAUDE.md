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
met datalaag in `src/lib/adminStore.ts`.

Backend: Supabase-project "Cortemo" (gulepwtnlmjpjwkatfiv, eu-central-1).
`src/lib/supabase.ts` bevat de publieke URL + publishable key (veilig in
clientcode; RLS beschermt alles). De adminStore is dual-mode: Supabase-
first met localStorage-fallback. Schema/RLS/seed staat in
`supabase/migrations/0001_cortemo_init.sql`; de mailingfunctie (Resend) in
`supabase/functions/send-mailing/` — die vereist de secrets RESEND_API_KEY
en MAIL_FROM in het Supabase-dashboard. Beheerders zijn auth-users die in
`cortemo_admins` staan; B2B-partners zijn auth-users gekoppeld via
`cortemo_partners.user_id`. Thema: light is standaard, donker via de
switcher (desktop in de menubalk, mobiel in het uitklapmenu).
Navigatie is state-based in `src/App.tsx` (met URL-params `cat`, `product`,
`page`). Thema (donker standaard, licht via toggle) wordt gescoped op
`.page-shell`/`.cortemo-footer` in `src/index.css`; nieuwe UI moet in beide
thema's werken.

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
3D-code. Zeven types: plantenbak, keerwand, borderrand, schutting,
staptegel (rond/plat), naambord en figuur. De laatste drie hebben een
ontwerp-editor (`deco` in ConfigState): lasersnijbare figuren uit
`src/data/figures.ts` (wijzig je punten, herbereken dan per/area met
figureStats en werk óók FIG_STATS in de place-order functie bij), tekst en
huisnummer versleepbaar in het 3D-beeld, en een foto-naar-silhouet-editor
(`src/lib/trace.ts` + PhotoSilhouette). De mini-configurator op de
homepage moet in sync blijven met deze types: alles zonder `cfgType` in
MINI_CATALOG is bewust een offerte-route (ronde díepe vormen zoals
vuurschalen walsen we niet — plat rond mag wel). Prijsberekening in `src/lib/pricing.ts` (puur), state in
`src/store/configuratorStore.ts` (zustand), 3D in
`src/components/Configurator3D/` (react-three-fiber, lazy geladen zodat de
webshop-bundle klein blijft). Het cortenmateriaal combineert een
procedurele basis met gescande PBR-maps (`public/img/textures/`, CC0 van
ambientCG) voor kleur, normal en roughness. Configuraties worden
geserialiseerd in het `cfg` URL-param (deelbaar/hervatbaar).

Admin (`/beheer`, ook via footerlink "Beheer"): shell in `src/views/Admin.tsx`,
secties in `src/views/admin/` (producten-CRUD, CPQ-calculatie, offertes,
klanten), datalaag in `src/lib/adminStore.ts`. Let op: supabase-js-queries
zijn lazy — fire-and-forget schrijfacties gaan via de `fire()`-helper,
anders vuurt de query nooit.

Backend: Supabase-project "Cortemo" (gulepwtnlmjpjwkatfiv, eu-central-1).
`src/lib/supabase.ts` bevat de publieke URL + publishable key (veilig in
clientcode; RLS beschermt alles). De adminStore is dual-mode: Supabase-
first met localStorage-fallback. Schema/RLS/seed staat in
`supabase/migrations/0001_cortemo_init.sql`; de mailingfunctie (Resend) in
`supabase/functions/send-mailing/` — die vereist de secrets RESEND_API_KEY
en MAIL_FROM in het Supabase-dashboard. Klantorders lopen verplicht via de
edge function `place-order` (directe anonieme inserts op cortemo_orders
zijn dicht sinds migratie 0005): die herrekent alle prijzen server-side,
valideert de kortingscode en stuurt de orderbevestiging; de betaal-stub
(`createPayment` in `supabase/functions/place-order/index.ts`) is waar
Mollie/Stripe later inklikt. LET OP: `supabase/functions/place-order/
pricing.ts` is een Deno-kopie van de prijsengine — wijzig je formules of
maatgrenzen in `src/lib/pricing.ts`/`configuratorSchema.ts`, werk die kopie
dan ook bij en herdeploy (tarieven komen live uit cortemo_settings en
hoeven dat niet). Facturen zijn onveranderlijk en doorlopend genummerd
(2026-0001) via de SQL-functie `cortemo_create_invoice` (rpc, alleen
admins). B2B: place-order herkent de ingelogde partner via het JWT en past
diens korting en betaaltermijn (op rekening) server-side toe — de checkout
toont dezelfde hoogste-korting-wint-regel alleen ter informatie.
Fabrieksaanlevering: `src/lib/fabricage.ts` genereert per maatwerkregel
uitslagen met buigaftrek (K-factor/radius in prijsmodel blok H), DXF R12
per onderdeel (lagen SNIJDEN/GATEN/ZETLIJN_BOVEN/ZETLIJN_ONDER/INFO, voor
nesting in Profirst) en buigtabellen met aanslagmaten (CSV + printbare
werkbon, voor de Delem-kantbankbesturing); UI in
`src/components/WorkOrderView.tsx`, bereikbaar via admin → Orders en
admin → Calculatie. Beheerders zijn auth-users die in
`cortemo_admins` staan; B2B-partners zijn auth-users gekoppeld via
`cortemo_partners.user_id`. Thema: light is standaard, donker via de
switcher (desktop in de menubalk, mobiel in het uitklapmenu).
Navigatie is state-based in `src/App.tsx` (met URL-params `cat`, `product`,
`page`). Thema (donker standaard, licht via toggle) wordt gescoped op
`.page-shell`/`.cortemo-footer` in `src/index.css`; nieuwe UI moet in beide
thema's werken.

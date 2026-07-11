-- 0009: klantreviews + checkout-uitbreiding (telefoon, opmerking, plaatsingsservice)

alter table cortemo_orders add column if not exists phone text not null default '';
alter table cortemo_orders add column if not exists note text not null default '';
alter table cortemo_orders add column if not exists montage boolean not null default false;

create table if not exists cortemo_reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- '' = algemene winkelreview, anders een product-id uit cortemo_products
  product_id text not null default '',
  name text not null,
  city text not null default '',
  rating int not null check (rating between 1 and 5),
  title text not null default '',
  body text not null,
  approved boolean not null default false
);

alter table cortemo_reviews enable row level security;

-- Iedereen leest alleen goedgekeurde reviews; inzenden kan anoniem maar
-- komt altijd ongepubliceerd binnen (moderatie in het beheer).
create policy "reviews public read" on cortemo_reviews
  for select using (approved);
create policy "reviews anon insert" on cortemo_reviews
  for insert with check (
    approved = false
    and char_length(body) between 10 and 1200
    and char_length(name) between 2 and 80
    and char_length(title) <= 120
    and char_length(city) <= 80
  );
create policy "reviews admin all" on cortemo_reviews
  for all using (is_cortemo_admin()) with check (is_cortemo_admin());

-- Startset gepubliceerde reviews (echte namen/plaatsen fictief).
insert into cortemo_reviews (product_id, name, city, rating, title, body, approved, created_at) values
  ('', 'Marieke v. D.', 'Utrecht', 5, 'Precies op maat, prachtig verroest', 'Configurator werkt verrassend fijn: maten tot op de millimeter en je ziet direct de prijs. De keerwand paste exact tussen de schutting en het terras.', true, now() - interval '12 days'),
  ('', 'R. Jansen', 'Eindhoven', 5, 'Van tekening tot tuin in twee weken', 'Strak laswerk, stevig staal en netjes op pallet geleverd. De chauffeur belde een uur van tevoren.', true, now() - interval '34 days'),
  ('', 'Hoveniersbedrijf Groenzicht', 'Zwolle', 5, 'Fijne partner voor projecten', 'Wij bestellen via het zakelijke portal. Herbestellen per project en facturen op rekening schelen ons echt administratie.', true, now() - interval '61 days'),
  ('cubo', 'S. de Boer', 'Haarlem', 5, 'Mooie strakke bak', 'Naadloos gelast, geen zichtbare schroeven. Na een zomer heeft hij een prachtige egale roestlaag.', true, now() - interval '20 days'),
  ('cubo', 'T. Willems', 'Breda', 4, 'Degelijk, let op de eerste weken', 'Topkwaliteit. In het begin geeft de roest wat af op de tegels — met het gratis proefstuk hadden we dat gelukkig al gezien, dus hij staat op grind.', true, now() - interval '48 days'),
  ('grande', 'Familie Peeters', 'Antwerpen', 5, 'Enorme bak, strak gebleven', 'Drie kuub grond erin en geen bolling te zien. Levering in België verliep vlot.', true, now() - interval '27 days'),
  ('lijn', 'K. Smit', 'Groningen', 5, 'Eindelijk strakke borders', 'Set van twee met koppelstrips, in een middag gelegd. De grondpennen houden alles muurvast.', true, now() - interval '15 days'),
  ('terra', 'J. Verhoeven', 'Nijmegen', 5, 'Hoogteverschil netjes opgelost', 'Keerwand van 80 cm hoog, staat als een huis zonder beton. Advies per mail was snel en eerlijk.', true, now() - interval '42 days'),
  ('verde', 'A. Kuipers', 'Amersfoort', 4, 'Kweekbak op werkhoogte', 'Heerlijk werken zonder bukken en de slakkenrand doet zijn werk. Puntje: lever de bodemdoek-tip uit de FAQ ook bij het product.', true, now() - interval '55 days'),
  ('numero', 'M. el Amrani', 'Rotterdam', 5, 'Naambord is echt af', 'Tekst zelf gesleept in de 3D-editor tot het klopte, en zo is hij ook exact geleverd. RVS afstandhouders geven mooi diepte-effect.', true, now() - interval '9 days'),
  ('vista', 'P. Bakker', 'Apeldoorn', 5, 'Privacy én licht', 'Laserpatroon geeft prachtige schaduwen in de avondzon. Verborgen staanders, dus geen palen in het zicht.', true, now() - interval '70 days'),
  ('den', 'L. Vermeer', 'Den Bosch', 5, 'Leuk cadeau', 'Figuur voor in de border van mijn moeder. Stond binnen tien dagen roestig en wel in de tuin.', true, now() - interval '31 days')
on conflict do nothing;

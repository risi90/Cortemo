-- Cortemo backend-schema. Tabellen zijn cortemo_-genamespaced zodat de
-- migratie ook veilig in een gedeeld Supabase-project kan draaien.

create table if not exists cortemo_collections (
  id text primary key,
  label text not null,
  sub text not null default ''
);

create table if not exists cortemo_products (
  id text primary key,
  group_id text not null references cortemo_collections(id),
  sub text not null default '',
  name text not null,
  dims text not null default '',
  img text not null default '',
  price numeric not null,
  descr text not null default '',
  variants jsonb not null default '[]'::jsonb,
  options jsonb not null default '[]'::jsonb,
  sort int not null default 0
);

create table if not exists cortemo_orders (
  id text primary key,
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  city text not null default '',
  items jsonb not null default '[]'::jsonb,
  total numeric not null,
  status text not null default 'nieuw'
);

create table if not exists cortemo_quotes (
  id text primary key,
  created_at timestamptz not null default now(),
  type text not null default '',
  dims text not null default '',
  name text not null,
  email text not null,
  note text not null default '',
  handled boolean not null default false
);

create table if not exists cortemo_partners (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  contact text not null default '',
  email text not null unique,
  discount numeric not null default 10,
  user_id uuid references auth.users(id)
);

create table if not exists cortemo_settings (
  key text primary key,
  value jsonb not null
);

create table if not exists cortemo_mailings (
  id text primary key,
  created_at timestamptz not null default now(),
  subject text not null,
  body text not null,
  audience text not null default 'Alle klanten',
  recipients int not null default 0,
  status text not null default 'verzonden'
);

-- Beheerders: alleen wie hier staat mag schrijven/beheren.
create table if not exists cortemo_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null
);

create or replace function is_cortemo_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from cortemo_admins where user_id = auth.uid());
$$;

alter table cortemo_collections enable row level security;
alter table cortemo_products enable row level security;
alter table cortemo_orders enable row level security;
alter table cortemo_quotes enable row level security;
alter table cortemo_partners enable row level security;
alter table cortemo_settings enable row level security;
alter table cortemo_mailings enable row level security;
alter table cortemo_admins enable row level security;

-- catalogus en tarieven: publiek leesbaar, alleen admins schrijven
create policy "collections public read" on cortemo_collections for select using (true);
create policy "collections admin write" on cortemo_collections for all
  using (is_cortemo_admin()) with check (is_cortemo_admin());
create policy "products public read" on cortemo_products for select using (true);
create policy "products admin write" on cortemo_products for all
  using (is_cortemo_admin()) with check (is_cortemo_admin());
create policy "settings public read" on cortemo_settings for select using (true);
create policy "settings admin write" on cortemo_settings for all
  using (is_cortemo_admin()) with check (is_cortemo_admin());

-- orders/offertes: iedereen mag plaatsen, alleen admins lezen en beheren
create policy "orders anon insert" on cortemo_orders for insert with check (true);
create policy "orders admin read" on cortemo_orders for select using (is_cortemo_admin());
create policy "orders admin update" on cortemo_orders for update
  using (is_cortemo_admin()) with check (is_cortemo_admin());
create policy "quotes anon insert" on cortemo_quotes for insert with check (true);
create policy "quotes admin read" on cortemo_quotes for select using (is_cortemo_admin());
create policy "quotes admin update" on cortemo_quotes for update
  using (is_cortemo_admin()) with check (is_cortemo_admin());

-- partners: eigen rij lezen, admins beheren alles
create policy "partners own read" on cortemo_partners for select
  using (user_id = auth.uid() or is_cortemo_admin());
create policy "partners admin write" on cortemo_partners for all
  using (is_cortemo_admin()) with check (is_cortemo_admin());

-- mailings en admins: alleen admins
create policy "mailings admin all" on cortemo_mailings for all
  using (is_cortemo_admin()) with check (is_cortemo_admin());
create policy "admins self read" on cortemo_admins for select using (user_id = auth.uid());

-- standaardtarieven voor de configurator
insert into cortemo_settings (key, value) values
  ('pricing', '{"steelPerKg": 4.1, "density": 7850, "weldPerM": 14, "base": 39, "b2bDiscount": 0.15}'::jsonb)
on conflict (key) do nothing;

-- B2B demo-partners (koppel user_id zodra de partner een account heeft)
insert into cortemo_partners (company, contact, email, discount) values
  ('Groenwerk Hoveniers B.V.', 'J. Timmer', 'jan@groenwerk.nl', 15),
  ('Buro Buiten Tuinarchitectuur', 'S. de Vries', 'sanne@burobuiten.nl', 12),
  ('Terra Nova Projectinrichting', 'M. Kamps', 'inkoop@terranova.nl', 18)
on conflict (email) do nothing;

insert into cortemo_collections (id, label, sub) values ('planten', 'Planten & Bomen', 'Bakken, ringen en sokkels');
insert into cortemo_collections (id, label, sub) values ('hoogte', 'Maatwerk Componenten', 'Keerwanden, randen en schuttingen');
insert into cortemo_collections (id, label, sub) values ('vuurwater', 'Vuur & Water', 'Vuurschalen, houtopslag en watertafels');
insert into cortemo_collections (id, label, sub) values ('deco', 'Decoratie & Praktisch', 'Naamborden, brievenbussen en wandkunst');
insert into cortemo_products (id, group_id, sub, name, dims, img, price, descr, variants, options, sort) values ('cubo', 'planten', 'Plantenbakken', 'Plantenbak Cubo', '60 × 60 × 60 cm', '/img/cubo.jpg', 189, 'Compacte kubusbak voor terras of entree. Naadloos gelast uit 3 mm cortenstaal, standaard bodemloos zodat beplanting in de volle grond kan wortelen.', '[["60 × 60 × 60 cm",0],["80 × 80 × 80 cm",90],["100 × 100 × 100 cm",190]]'::jsonb, '[["Bodemplaat",45],["Verrijdbaar (wieltjes)",30],["Versneld roestproces",45]]'::jsonb, 0);
insert into cortemo_products (id, group_id, sub, name, dims, img, price, descr, variants, options, sort) values ('linea', 'planten', 'Plantenbakken', 'Plantenbak Linea', '120 × 40 × 50 cm', '/img/linea.jpg', 249, 'Langwerpige bak als groene afscheiding op balkon of dakterras. Strakke, dunne rand en verdekte hoeknaden.', '[["120 × 40 × 50 cm",0],["160 × 40 × 50 cm",70],["200 × 40 × 60 cm",150]]'::jsonb, '[["Bodemplaat",45],["Versneld roestproces",45]]'::jsonb, 1);
insert into cortemo_products (id, group_id, sub, name, dims, img, price, descr, variants, options, sort) values ('grande', 'planten', 'Plantenbakken', 'Plantenbak Grande', '200 × 60 × 60 cm', '/img/grande.jpg', 389, 'Royale bak voor meerstammige heesters en kleine bomen. Inwendig verstevigd, blijft strak bij volle grondvulling.', '[["200 × 60 × 60 cm",0],["250 × 80 × 60 cm",140],["300 × 100 × 80 cm",320]]'::jsonb, '[["Bodemplaat",65],["Versneld roestproces",45]]'::jsonb, 2);
insert into cortemo_products (id, group_id, sub, name, dims, img, price, descr, variants, options, sort) values ('verde', 'planten', 'Moestuinbakken', 'Moestuinbak Verde', '150 × 80 × 50 cm', '/img/verde.jpg', 329, 'Verhoogde kweekbak op werkhoogte. Het staal houdt in het voorjaar warmte vast, wat de wortels ten goede komt.', '[["150 × 80 × 50 cm",0],["200 × 100 × 60 cm",120],["250 × 120 × 60 cm",240]]'::jsonb, '[["Slakkenrand",35],["Versneld roestproces",45]]'::jsonb, 3);
insert into cortemo_products (id, group_id, sub, name, dims, img, price, descr, variants, options, sort) values ('anello', 'planten', 'Boomringen', 'Boomring Anello', 'Ø 80 cm', '/img/anello.jpg', 95, 'Tweedelige ring die om een bestaande stam sluit. Beschermt de wortels en geeft het gazon een strakke beëindiging.', '[["Ø 80 cm",0],["Ø 100 cm",30],["Ø 120 cm",55]]'::jsonb, '[["Versneld roestproces",25]]'::jsonb, 4);
insert into cortemo_products (id, group_id, sub, name, dims, img, price, descr, variants, options, sort) values ('piede', 'planten', 'Sokkels', 'Sokkel Piede', '40 × 40 × 80 cm', '/img/piede.jpg', 159, 'Zet een waterschaal, plant of kunstwerk op een voetstuk. Verzwaarde voet, ook geschikt voor winderige plekken.', '[["40 × 40 × 80 cm",0],["40 × 40 × 100 cm",40]]'::jsonb, '[["Versneld roestproces",25]]'::jsonb, 5);
insert into cortemo_products (id, group_id, sub, name, dims, img, price, descr, variants, options, sort) values ('terra', 'hoogte', 'Keerwanden', 'Keerwand Terra', '200 × 60 cm', '/img/terra.jpg', 189, 'Zelfdragende keerwand met gevouwen grondkeringsvoet. Creëert veilige hoogteverschillen zonder metselwerk.', '[["200 × 60 cm",0],["200 × 80 cm",45],["200 × 100 cm",90]]'::jsonb, '[["Anti-uitspoeling coating",25],["Versneld roestproces",45]]'::jsonb, 6);
insert into cortemo_products (id, group_id, sub, name, dims, img, price, descr, variants, options, sort) values ('lijn', 'hoogte', 'Borderranden', 'Borderrand Lijn', '220 × 15 cm, set van 2', '/img/lijn.jpg', 79, 'Kantopsluiting die gazon, grind en borders strak scheidt. Koppelbaar met verdekte verbindingsstrip.', '[["220 × 15 cm, set van 2",0],["220 × 25 cm, set van 2",20]]'::jsonb, '[["Grondpennen (8 stuks)",15],["Versneld roestproces",25]]'::jsonb, 7);
insert into cortemo_products (id, group_id, sub, name, dims, img, price, descr, variants, options, sort) values ('aqua', 'hoogte', 'Vijverranden', 'Vijverrand Aqua', '200 × 30 cm', '/img/aqua.jpg', 119, 'Strakke, roestige omlijsting direct aan de waterkant. Gezette bovenrand, veilig voor vijverfolie.', '[["200 × 30 cm",0],["200 × 45 cm",30]]'::jsonb, '[["Anti-uitspoeling coating",25]]'::jsonb, 8);
insert into cortemo_products (id, group_id, sub, name, dims, img, price, descr, variants, options, sort) values ('vista', 'hoogte', 'Schuttingen', 'Schutting Vista', '180 × 180 cm', '/img/vista.jpg', 549, 'Privacypaneel met verborgen staanders. Optioneel met organisch laserpatroon voor een licht, ruimtelijk effect.', '[["180 × 180 cm, dicht",0],["180 × 180 cm, laserpatroon",140]]'::jsonb, '[["Betonpoeren (2 stuks)",49],["Versneld roestproces",45]]'::jsonb, 9);
insert into cortemo_products (id, group_id, sub, name, dims, img, price, descr, variants, options, sort) values ('fuoco', 'vuurwater', 'Vuurschalen', 'Vuurschaal Fuoco', 'Ø 80 cm', '/img/fuoco.jpg', 279, 'Hittebestendig 5 mm staal dat niet kromtrekt. Sokkel houdt de gloed op zithoogte, ook als kookplateau te gebruiken.', '[["Ø 80 cm",0],["Ø 100 cm",80],["Ø 120 cm",170]]'::jsonb, '[["Deksel",79],["Grillrooster",59]]'::jsonb, 10);
insert into cortemo_products (id, group_id, sub, name, dims, img, price, descr, variants, options, sort) values ('legna', 'vuurwater', 'Houtopslag', 'Houtopslag Legna', '180 × 40 × 160 cm', '/img/legna.jpg', 649, 'Geometrische vakkenkast voor haardhout die tegelijk dient als windscherm of afscheiding van de loungehoek.', '[["180 × 40 × 160 cm",0],["240 × 40 × 180 cm",180]]'::jsonb, '[["Versneld roestproces",45]]'::jsonb, 11);
insert into cortemo_products (id, group_id, sub, name, dims, img, price, descr, variants, options, sort) values ('fonte', 'vuurwater', 'Waterelementen', 'Watertafel Fonte', '100 × 100 × 40 cm', '/img/fonte.jpg', 899, 'Spiegelend wateroppervlak in een roestig kader. Inclusief circulatiepomp en verdekte overloop.', '[["100 × 100 × 40 cm",0],["150 × 100 × 40 cm",220]]'::jsonb, '[["LED-verlichting",129]]'::jsonb, 12);
insert into cortemo_products (id, group_id, sub, name, dims, img, price, descr, variants, options, sort) values ('numero', 'deco', 'Naamborden', 'Naambord Numero', '40 × 20 cm', '/img/numero.jpg', 69, 'Huisnummer of naam, lasergesneden uit één plaat. Zwevend gemonteerd met RVS afstandhouders.', '[["40 × 20 cm",0],["60 × 25 cm",25]]'::jsonb, '[["RVS afstandhouders",12],["Versneld roestproces",19]]'::jsonb, 13);
insert into cortemo_products (id, group_id, sub, name, dims, img, price, descr, variants, options, sort) values ('posta', 'deco', 'Brievenbussen', 'Brievenbus Posta', '38 × 30 × 120 cm', '/img/posta.jpg', 429, 'Vrijstaande zuil voor aan de straatkant. RVS binnenbak, slot met twee sleutels en pakketvriendelijke klep.', '[["38 × 30 × 120 cm",0],["38 × 30 × 120 cm, met krantenrol",45]]'::jsonb, '[["Huisnummer gegraveerd",29],["Versneld roestproces",45]]'::jsonb, 14);
insert into cortemo_products (id, group_id, sub, name, dims, img, price, descr, variants, options, sort) values ('silva', 'deco', 'Wandkunst', 'Wandpaneel Silva', '80 × 80 cm', '/img/silva.jpg', 189, 'Lasergesneden boomsilhouet voor tuinmuur of interieur. Werpt bij strijklicht een tekening op de wand.', '[["80 × 80 cm",0],["120 × 120 cm",110]]'::jsonb, '[["RVS afstandhouders",12]]'::jsonb, 15);
insert into cortemo_products (id, group_id, sub, name, dims, img, price, descr, variants, options, sort) values ('den', 'deco', 'Figuren', 'Figuur Den', '120 cm hoog', '/img/den.jpg', 89, 'Silhouet voor in de border. Met grondpennen stevig verankerd, wintervast en onderhoudsvrij.', '[["120 cm hoog",0],["160 cm hoog",35],["200 cm hoog",70]]'::jsonb, '[["Grondpennen",15],["Versneld roestproces",25]]'::jsonb, 16);

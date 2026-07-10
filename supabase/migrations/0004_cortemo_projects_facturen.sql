-- Projecten: bundelen orders en offertes per klus (B2B) of klant
create table if not exists cortemo_projects (
  id text primary key,
  created_at timestamptz not null default now(),
  partner_email text not null default '',
  name text not null,
  reference text not null default '',
  site_address text not null default '',
  status text not null default 'actief'
);
alter table cortemo_orders add column if not exists project_id text references cortemo_projects(id);
alter table cortemo_offers add column if not exists project_id text references cortemo_projects(id);

alter table cortemo_projects enable row level security;
create policy "projects admin all" on cortemo_projects for all
  using (is_cortemo_admin()) with check (is_cortemo_admin());
create policy "projects partner own" on cortemo_projects for select
  using (exists (select 1 from cortemo_partners p where p.user_id = auth.uid() and p.email = partner_email));
create policy "projects partner insert" on cortemo_projects for insert
  with check (exists (select 1 from cortemo_partners p where p.user_id = auth.uid() and p.email = partner_email));
create policy "projects partner update" on cortemo_projects for update
  using (exists (select 1 from cortemo_partners p where p.user_id = auth.uid() and p.email = partner_email));

-- partners zien hun eigen orders en offertes (op e-mail of projectkoppeling)
create policy "orders partner read" on cortemo_orders for select
  using (exists (
    select 1 from cortemo_partners p
    where p.user_id = auth.uid()
      and (p.email = cortemo_orders.email
        or exists (select 1 from cortemo_projects pr where pr.id = cortemo_orders.project_id and pr.partner_email = p.email))
  ));
create policy "offers partner read" on cortemo_offers for select
  using (exists (
    select 1 from cortemo_partners p
    where p.user_id = auth.uid()
      and (p.email = cortemo_offers.email
        or exists (select 1 from cortemo_projects pr where pr.id = cortemo_offers.project_id and pr.partner_email = p.email))
  ));
-- partner mag zijn eigen offerte accepteren/afwijzen
create policy "offers partner update" on cortemo_offers for update
  using (exists (select 1 from cortemo_partners p where p.user_id = auth.uid() and p.email = cortemo_offers.email));

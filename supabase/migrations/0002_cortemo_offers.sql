-- Uitgaande offertes (de bestaande cortemo_quotes zijn inkomende aanvragen)
create table if not exists cortemo_offers (
  id text primary key,
  created_at timestamptz not null default now(),
  customer text not null,
  email text not null,
  lines jsonb not null default '[]'::jsonb,
  discount numeric not null default 0,
  total numeric not null,
  note text not null default '',
  valid_until date,
  status text not null default 'concept'
);
alter table cortemo_offers enable row level security;
create policy "offers admin all" on cortemo_offers for all
  using (is_cortemo_admin()) with check (is_cortemo_admin());

create policy "quotes admin delete" on cortemo_quotes for delete using (is_cortemo_admin());
create policy "partners admin insert" on cortemo_partners for insert with check (is_cortemo_admin());

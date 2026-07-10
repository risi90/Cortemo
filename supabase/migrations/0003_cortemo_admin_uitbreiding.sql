-- adres op orders (voor orderdetail en verzending)
alter table cortemo_orders add column if not exists address text not null default '';
alter table cortemo_orders add column if not exists discount_code text not null default '';
alter table cortemo_orders add column if not exists discount_amount numeric not null default 0;

-- levertijd/voorraad per product
alter table cortemo_products add column if not exists leadtime text not null default '';
alter table cortemo_products add column if not exists stock int;

-- kortingscodes
create table if not exists cortemo_discounts (
  code text primary key,
  percent numeric not null,
  active boolean not null default true,
  expires date
);
alter table cortemo_discounts enable row level security;
create policy "discounts public read active" on cortemo_discounts for select
  using (active = true and (expires is null or expires >= current_date));
create policy "discounts admin all" on cortemo_discounts for all
  using (is_cortemo_admin()) with check (is_cortemo_admin());

-- mediabucket voor productfoto's
insert into storage.buckets (id, name, public) values ('cortemo-media', 'cortemo-media', true)
on conflict (id) do nothing;
create policy "cortemo media public read" on storage.objects for select
  using (bucket_id = 'cortemo-media');
create policy "cortemo media admin insert" on storage.objects for insert
  with check (bucket_id = 'cortemo-media' and is_cortemo_admin());
create policy "cortemo media admin update" on storage.objects for update
  using (bucket_id = 'cortemo-media' and is_cortemo_admin());
create policy "cortemo media admin delete" on storage.objects for delete
  using (bucket_id = 'cortemo-media' and is_cortemo_admin());

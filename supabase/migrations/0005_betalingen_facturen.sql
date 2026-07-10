-- Betaalvelden op orders (provider-agnostisch; Mollie/Stripe koppelt later
-- aan payment_id/payment_status via een webhook-functie)
alter table cortemo_orders add column if not exists payment_status text not null default 'open';
alter table cortemo_orders add column if not exists payment_id text;
alter table cortemo_orders add column if not exists paid_at timestamptz;
-- true = prijzen zijn server-side herrekend door de place-order functie
alter table cortemo_orders add column if not exists verified boolean not null default false;

-- Orders komen voortaan binnen via de place-order edge function (service
-- role). De directe anonieme insert gaat dicht: dat was het prijs-loophole.
drop policy if exists "orders anon insert" on cortemo_orders;
create policy "orders admin insert" on cortemo_orders for insert
  with check (is_cortemo_admin());

-- Facturen: onveranderlijk vastgelegde documenten met doorlopende
-- nummering per jaar (2026-0001, 2026-0002, ...)
create table if not exists cortemo_invoices (
  id text primary key,
  order_id text not null references cortemo_orders(id),
  created_at timestamptz not null default now(),
  customer_email text not null,
  snapshot jsonb not null,
  total numeric not null
);
create unique index if not exists cortemo_invoices_order on cortemo_invoices(order_id);

create table if not exists cortemo_invoice_counter (
  year int primary key,
  seq int not null default 0
);

alter table cortemo_invoices enable row level security;
alter table cortemo_invoice_counter enable row level security;
create policy "invoices admin read" on cortemo_invoices for select using (is_cortemo_admin());
create policy "invoices partner own" on cortemo_invoices for select
  using (exists (select 1 from cortemo_partners p where p.user_id = auth.uid() and p.email = customer_email));
-- geen insert/update/delete-policies: facturen ontstaan alleen via de
-- functie hieronder en zijn daarna onveranderlijk

create or replace function cortemo_create_invoice(p_order_id text)
returns cortemo_invoices
language plpgsql security definer set search_path = public
as $$
declare
  v_order cortemo_orders%rowtype;
  v_inv cortemo_invoices%rowtype;
  v_year int;
  v_seq int;
begin
  if not is_cortemo_admin() then
    raise exception 'Alleen Cortemo-beheerders mogen factureren.';
  end if;
  select * into v_order from cortemo_orders where id = p_order_id;
  if not found then
    raise exception 'Order % bestaat niet.', p_order_id;
  end if;
  -- idempotent: bestaat er al een factuur voor deze order, geef die terug
  select * into v_inv from cortemo_invoices where order_id = p_order_id;
  if found then
    return v_inv;
  end if;
  v_year := extract(year from now())::int;
  insert into cortemo_invoice_counter as c (year, seq) values (v_year, 1)
    on conflict (year) do update set seq = c.seq + 1
    returning seq into v_seq;
  insert into cortemo_invoices (id, order_id, customer_email, snapshot, total)
    values (v_year || '-' || lpad(v_seq::text, 4, '0'), p_order_id, v_order.email, to_jsonb(v_order), v_order.total)
    returning * into v_inv;
  return v_inv;
end;
$$;

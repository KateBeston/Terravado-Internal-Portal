-- 0009_lodgements.sql
-- Lodgements / deal tracking. A lodgement is a prepared deal handed toward the
-- lending channel, with a status pipeline the adviser/broker tracks. The payload
-- is the deal pack snapshot (grouped to LIXI CAL sections). Channel records how
-- it was/will be submitted (export handoff now; Simpology/NextGen later). This is
-- the system of record for deal flow; the real platform connection swaps in at
-- the provider seam without changing this table.
create table if not exists lodgements (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  client_id   uuid references clients(id) on delete set null,
  property_id uuid references properties(id) on delete set null,
  status      text not null default 'prepared'
                check (status in ('prepared','submitted','conditional','approved','settled','declined','withdrawn')),
  channel     text,
  reference   text,
  payload     jsonb not null default '{}'::jsonb,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table lodgements enable row level security;

create policy lodgements_rw on lodgements for all to authenticated
  using (tenant_id in (select current_user_tenants()))
  with check (tenant_id in (select current_user_tenants()));

create index if not exists idx_lodgements_tenant on lodgements(tenant_id);

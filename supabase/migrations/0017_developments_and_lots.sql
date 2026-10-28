-- 0017_developments_and_lots.sql
-- Advisor-side developer stock: a development/project and its lots (stock),
-- carrying stage, price, availability and the marketed figures (advertised rent,
-- yield, ROI). Commission arrangement lives on the development for the later
-- commission calculator.

create table if not exists developments (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  name            text not null,
  developer       text,
  suburb          text,
  state           text,
  region          text,
  description     text,
  commission_pct  numeric,
  commission_flat numeric,
  stock_list_url  text,
  status          text default 'active',
  notes           text,
  created_at      timestamptz not null default now()
);
alter table developments enable row level security;
create policy developments_rw on developments for all to authenticated
  using (tenant_id in (select current_user_tenants()))
  with check (tenant_id in (select current_user_tenants()));
create index if not exists idx_developments_tenant on developments(tenant_id);

create table if not exists lots (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references tenants(id) on delete cascade,
  development_id       uuid references developments(id) on delete cascade,
  lot_number           text,
  address              text,
  stage                text,
  price                numeric,
  status               text default 'available',
  beds                 numeric,
  baths                numeric,
  cars                 numeric,
  land_size            numeric,
  advertised_rent      numeric,   -- weekly
  advertised_yield_pct numeric,
  advertised_roi       text,
  notes                text,
  created_at           timestamptz not null default now()
);
alter table lots enable row level security;
create policy lots_rw on lots for all to authenticated
  using (tenant_id in (select current_user_tenants()))
  with check (tenant_id in (select current_user_tenants()));
create index if not exists idx_lots_tenant on lots(tenant_id);
create index if not exists idx_lots_development on lots(development_id);

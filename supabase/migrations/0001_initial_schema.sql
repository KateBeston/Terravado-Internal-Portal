-- ===========================================================================
-- Terravado internal portal — initial multi-tenant schema (increment one)
-- Each adviser/firm is a tenant; RLS isolates every tenant's records so a user
-- can only ever reach data for tenants they are a member of.
-- ===========================================================================
create extension if not exists "pgcrypto";

create table if not exists tenants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists memberships (
  tenant_id   uuid not null references tenants(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'adviser' check (role in ('owner','admin','adviser','viewer')),
  created_at  timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create table if not exists clients (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  name        text not null,
  email       text,
  phone       text,
  notes       text,
  created_at  timestamptz not null default now()
);

create table if not exists contacts (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  name        text not null,
  role        text,
  firm        text,
  email       text,
  phone       text,
  licence     text,
  created_at  timestamptz not null default now()
);

create table if not exists properties (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  client_id   uuid references clients(id) on delete set null,
  address     text not null,
  state       text,
  price       numeric,
  status      text default 'considering' check (status in ('considering','owned','sold')),
  created_at  timestamptz not null default now()
);

-- Tenants the current user belongs to.
create or replace function current_user_tenants()
  returns setof uuid language sql stable security definer set search_path = public as $$
  select tenant_id from memberships where user_id = auth.uid();
$$;

alter table tenants     enable row level security;
alter table memberships enable row level security;
alter table clients     enable row level security;
alter table contacts    enable row level security;
alter table properties  enable row level security;

create policy memberships_self on memberships for select using (user_id = auth.uid());
create policy tenants_member   on tenants     for select using (id in (select current_user_tenants()));

create policy clients_rw on clients for all
  using (tenant_id in (select current_user_tenants()))
  with check (tenant_id in (select current_user_tenants()));
create policy contacts_rw on contacts for all
  using (tenant_id in (select current_user_tenants()))
  with check (tenant_id in (select current_user_tenants()));
create policy properties_rw on properties for all
  using (tenant_id in (select current_user_tenants()))
  with check (tenant_id in (select current_user_tenants()));

create index if not exists idx_clients_tenant    on clients(tenant_id);
create index if not exists idx_contacts_tenant   on contacts(tenant_id);
create index if not exists idx_properties_tenant on properties(tenant_id);

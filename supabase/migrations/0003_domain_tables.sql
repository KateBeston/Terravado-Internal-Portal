-- ===========================================================================
-- Terravado — full domain schema. Supabase is the system of record: every
-- persistent concept has a table here; connected APIs (Quickli, property data)
-- are the live-compute layer, not storage.
-- ===========================================================================

-- Ownership entities (individual / joint / company / trust / SMSF)
create table if not exists entities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  name text not null,
  kind text not null default 'individual' check (kind in ('individual','joint','company','trust','smsf')),
  notes text,
  created_at timestamptz not null default now()
);

-- Portfolios (standard / smsf / merged) grouping a client's properties
create table if not exists portfolios (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  name text not null,
  kind text not null default 'standard' check (kind in ('standard','smsf','merged')),
  created_at timestamptz not null default now()
);

alter table properties add column if not exists portfolio_id uuid references portfolios(id) on delete set null;
alter table properties add column if not exists entity_id uuid references entities(id) on delete set null;

-- Saved serviceability assessments (reproducible finance runs — audit/BID evidence)
create table if not exists serviceability_assessments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  inputs jsonb not null,
  result jsonb not null,
  source text,
  provenance jsonb,
  created_at timestamptz not null default now()
);

-- Point-in-time market snapshots attached to a property (licence-permitted)
create table if not exists property_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  data jsonb not null,
  source text,
  retention text,
  as_at date,
  created_at timestamptz not null default now()
);

-- Documents (data & document recording) — files live in Supabase Storage
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  name text not null,
  kind text,
  storage_path text,
  created_at timestamptz not null default now()
);

-- Immutable report snapshots (generated client plans/reports)
create table if not exists report_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  title text,
  payload jsonb not null,
  provenance jsonb,
  created_at timestamptz not null default now()
);

-- Append-only audit log
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  detail jsonb,
  engine_version text,
  created_at timestamptz not null default now()
);

-- Shared market-data store (storable sources only: VG / ABS / Geoscape / HtAG)
create table if not exists suburb_data (
  id uuid primary key default gen_random_uuid(),
  locality text not null,
  state text not null,
  data jsonb not null,
  source text not null,
  as_at date,
  updated_at timestamptz not null default now(),
  unique (locality, state, source)
);

alter table entities                   enable row level security;
alter table portfolios                 enable row level security;
alter table serviceability_assessments enable row level security;
alter table property_snapshots         enable row level security;
alter table documents                  enable row level security;
alter table report_snapshots           enable row level security;
alter table audit_log                  enable row level security;
alter table suburb_data                enable row level security;

create policy entities_rw on entities for all to authenticated
  using (tenant_id in (select current_user_tenants())) with check (tenant_id in (select current_user_tenants()));
create policy portfolios_rw on portfolios for all to authenticated
  using (tenant_id in (select current_user_tenants())) with check (tenant_id in (select current_user_tenants()));
create policy documents_rw on documents for all to authenticated
  using (tenant_id in (select current_user_tenants())) with check (tenant_id in (select current_user_tenants()));

-- Append-only / immutable: select + insert only (no update/delete policy = denied)
create policy sa_select on serviceability_assessments for select to authenticated using (tenant_id in (select current_user_tenants()));
create policy sa_insert on serviceability_assessments for insert to authenticated with check (tenant_id in (select current_user_tenants()));
create policy ps_select on property_snapshots for select to authenticated using (tenant_id in (select current_user_tenants()));
create policy ps_insert on property_snapshots for insert to authenticated with check (tenant_id in (select current_user_tenants()));
create policy rs_select on report_snapshots for select to authenticated using (tenant_id in (select current_user_tenants()));
create policy rs_insert on report_snapshots for insert to authenticated with check (tenant_id in (select current_user_tenants()));
create policy al_select on audit_log for select to authenticated using (tenant_id in (select current_user_tenants()));
create policy al_insert on audit_log for insert to authenticated with check (tenant_id in (select current_user_tenants()));

-- Shared market data: any signed-in user may read; writes are service-role only
create policy suburb_read on suburb_data for select to authenticated using (true);

create index if not exists idx_entities_tenant   on entities(tenant_id);
create index if not exists idx_portfolios_tenant on portfolios(tenant_id);
create index if not exists idx_sa_tenant         on serviceability_assessments(tenant_id);
create index if not exists idx_ps_tenant         on property_snapshots(tenant_id);
create index if not exists idx_docs_tenant       on documents(tenant_id);
create index if not exists idx_rs_tenant         on report_snapshots(tenant_id);
create index if not exists idx_al_tenant         on audit_log(tenant_id);
create index if not exists idx_suburb_loc        on suburb_data(locality, state);

-- 0022_data_source_events.sql
-- Activity log for the Data Sources section: each check/refresh of an external
-- data source, with whether it ran live or fell back. Tenant-scoped.
create table if not exists data_source_events (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  source_key text,
  status     text,   -- live / fallback / error / disabled
  detail     text,
  created_at timestamptz not null default now()
);
alter table data_source_events enable row level security;
create policy data_source_events_rw on data_source_events for all to authenticated
  using (tenant_id in (select current_user_tenants()))
  with check (tenant_id in (select current_user_tenants()));
create index if not exists idx_dse_tenant_created on data_source_events(tenant_id, created_at desc);

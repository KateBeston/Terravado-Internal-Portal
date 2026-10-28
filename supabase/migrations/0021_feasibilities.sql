-- 0021_feasibilities.sql
-- Development feasibility studies (ported from the retired Workspace). The whole
-- feasibility model is held as jsonb; the engine's feasibility() computes from it.
create table if not exists feasibilities (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  name       text,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table feasibilities enable row level security;
create policy feasibilities_rw on feasibilities for all to authenticated
  using (tenant_id in (select current_user_tenants()))
  with check (tenant_id in (select current_user_tenants()));
create index if not exists idx_feasibilities_tenant on feasibilities(tenant_id);

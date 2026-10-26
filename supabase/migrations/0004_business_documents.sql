-- "The Business" — business-development document & decision log (tenant-scoped).
create table if not exists business_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  title text not null,
  category text,
  summary text,
  status text not null default 'active' check (status in ('active','draft','archived')),
  link text,
  created_at timestamptz not null default now()
);

alter table business_documents enable row level security;

create policy bd_rw on business_documents for all to authenticated
  using (tenant_id in (select current_user_tenants()))
  with check (tenant_id in (select current_user_tenants()));

create index if not exists idx_bd_tenant on business_documents(tenant_id);

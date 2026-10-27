-- 0010_companies_and_entities.sql
-- Companies: organisations in the adviser's network (agencies, lenders,
-- conveyancers, accountants, developers, referral partners). Contacts can belong
-- to a company. Also extends the ownership `entities` table (trusts/companies/
-- SMSFs that own property) with region and ABN for proper management.

create table if not exists companies (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  name        text not null,
  kind        text,
  abn         text,
  phone       text,
  email       text,
  website     text,
  notes       text,
  created_at  timestamptz not null default now()
);
alter table companies enable row level security;
create policy companies_rw on companies for all to authenticated
  using (tenant_id in (select current_user_tenants()))
  with check (tenant_id in (select current_user_tenants()));
create index if not exists idx_companies_tenant on companies(tenant_id);

-- Link a contact to the company they belong to.
alter table contacts add column if not exists company_id uuid references companies(id) on delete set null;

-- Ownership entities: fields for management.
alter table entities add column if not exists region text;
alter table entities add column if not exists abn text;

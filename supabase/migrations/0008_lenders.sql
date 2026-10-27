-- 0008_lenders.sql
-- Lender / bank products for serviceability. Each row is one lending product
-- with its assessment policy (buffer, floor, income shading, HEM, debt rules,
-- DTI/LVR caps, rates and fees) held in a jsonb policy block so a product's
-- parameters can evolve without a migration. These drive the Modeller's lender
-- comparison and the Finance page until the live Quickli integration is keyed in.
create table if not exists lenders (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  name        text not null,
  kind        text,
  active      boolean not null default true,
  policy      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

alter table lenders enable row level security;

create policy lenders_rw on lenders for all to authenticated
  using (tenant_id in (select current_user_tenants()))
  with check (tenant_id in (select current_user_tenants()));

create index if not exists idx_lenders_tenant on lenders(tenant_id);

-- 0018_advisor_deals.sql
-- Advisor sales pipeline: a deal is a sale-in-progress of a lot (or a labelled
-- property) to a client, tracked by stage, with its commission. Distinct from
-- the broker lodgement tracker (that follows a loan; this follows a sale).

create table if not exists advisor_deals (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id) on delete cascade,
  lot_id              uuid references lots(id) on delete set null,
  development_id      uuid references developments(id) on delete set null,
  client_id           uuid references contacts(id) on delete set null,
  property_label      text,
  sale_price          numeric,
  commission_pct      numeric,
  commission_flat     numeric,
  stage               text default 'lead',
  expected_settlement date,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz
);
alter table advisor_deals enable row level security;
create policy advisor_deals_rw on advisor_deals for all to authenticated
  using (tenant_id in (select current_user_tenants()))
  with check (tenant_id in (select current_user_tenants()));
create index if not exists idx_advisor_deals_tenant on advisor_deals(tenant_id);
create index if not exists idx_advisor_deals_stage on advisor_deals(stage);

-- 0023_regulatory_alerts.sql
-- Regulatory Watch: a shared feed of regulator updates (public data, no client
-- data). Populated by the fortnightly check / manual refresh; de-duplicated by url.
create table if not exists regulatory_alerts (
  id           uuid primary key default gen_random_uuid(),
  source_key   text,
  body         text,          -- regulator name
  category     text,          -- tax / lending / real-estate / aml / property-management / commercial / trusts / accounting
  title        text not null,
  url          text unique,
  summary      text,
  published_at timestamptz,
  acknowledged boolean not null default false,
  created_at   timestamptz not null default now()
);
alter table regulatory_alerts enable row level security;
create policy regulatory_alerts_read   on regulatory_alerts for select to authenticated using (true);
create policy regulatory_alerts_insert on regulatory_alerts for insert to authenticated with check (true);
create policy regulatory_alerts_update on regulatory_alerts for update to authenticated using (true) with check (true);
create index if not exists idx_reg_alerts_created on regulatory_alerts(created_at desc);

-- 0012_unify_entities_and_memberships.sql
-- One typed entity/company record, plus person<->entity role memberships.

-- Entities becomes the unified record: widen kind to free text, add org fields.
alter table entities drop constraint if exists entities_kind_check;
alter table entities alter column kind drop default;
alter table entities add column if not exists phone   text;
alter table entities add column if not exists email   text;
alter table entities add column if not exists website text;

-- Fold the separate companies into entities, preserving ids so contacts.company_id resolves.
insert into entities (id, tenant_id, name, kind, abn, phone, email, website, notes, created_at)
select id, tenant_id, name, coalesce(nullif(kind, ''), 'Company'), abn, phone, email, website, notes, created_at
from companies
on conflict (id) do nothing;

-- contacts.company_id now points at an entity.
alter table contacts drop constraint if exists contacts_company_id_fkey;

-- Person <-> entity memberships, each carrying a role (director/trustee/beneficiary/...).
create table if not exists entity_members (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  entity_id   uuid references entities(id) on delete cascade,
  contact_id  uuid references contacts(id) on delete cascade,
  role        text,
  is_primary  boolean default false,
  may_sign    boolean default false,
  started_at  date,
  ended_at    date,
  notes       text,
  created_at  timestamptz not null default now()
);
alter table entity_members enable row level security;
create policy entity_members_rw on entity_members for all to authenticated
  using (tenant_id in (select current_user_tenants()))
  with check (tenant_id in (select current_user_tenants()));
create index if not exists idx_entity_members_tenant  on entity_members(tenant_id);
create index if not exists idx_entity_members_entity  on entity_members(entity_id);
create index if not exists idx_entity_members_contact on entity_members(contact_id);

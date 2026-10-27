-- 0011_unify_person_record.sql
-- ===========================================================================
-- Unify the person record. Terravado had two person-type tables: `clients`
-- (people modelled/assessed — carried finances, owned properties, fed the
-- Modeller) and `contacts` (the professional directory). They are now ONE
-- record: `contacts` is the person, and a `roles[]` array says what each
-- person is (Borrower, Broker, Buyer's agent, Accountant, Solicitor...).
--
-- The Modeller, portfolio, deal pack and lodgements all key off `client_id`.
-- To avoid breaking any of them, clients are copied into `contacts` KEEPING
-- THEIR IDs, so every existing `client_id` already resolves to a contact row.
-- The FK constraints to clients(id) are dropped so a borrower that exists only
-- in `contacts` (new ones) does not violate a reference. `client_id` columns
-- stay — they now mean "person id" and resolve against `contacts`.
--
-- The `clients` table is left in place (dormant) and dropped in a later
-- migration once the unified record has been exercised in production.
-- ===========================================================================

-- 1. The person gains the fields a borrower/applicant needs.
alter table contacts add column if not exists notes     text;
alter table contacts add column if not exists finances  jsonb not null default '{}'::jsonb;
alter table contacts add column if not exists details   jsonb not null default '{}'::jsonb;
alter table contacts add column if not exists roles      text[] not null default '{}'::text[];

-- 2. Break the hard references to clients(id) so client_id can point at a
--    contact that has no clients row. (Names are Postgres defaults.)
alter table properties                 drop constraint if exists properties_client_id_fkey;
alter table portfolios                 drop constraint if exists portfolios_client_id_fkey;
alter table serviceability_assessments drop constraint if exists serviceability_assessments_client_id_fkey;
alter table documents                  drop constraint if exists documents_client_id_fkey;
alter table report_snapshots           drop constraint if exists report_snapshots_client_id_fkey;
alter table entities                   drop constraint if exists entities_client_id_fkey;
alter table lodgements                 drop constraint if exists lodgements_client_id_fkey;

-- 3. Copy every client into contacts, preserving the id so all existing
--    client_id references resolve. Mark them as Borrowers and carry finances.
insert into contacts (id, tenant_id, name, email, phone, notes, finances, roles, created_at)
select c.id, c.tenant_id, c.name, c.email, c.phone, c.notes,
       coalesce(c.finances, '{}'::jsonb), array['Borrower']::text[], c.created_at
from clients c
on conflict (id) do nothing;

-- 4. Index for role-filtered reads (the Clients view = contacts with Borrower).
create index if not exists idx_contacts_roles on contacts using gin (roles);

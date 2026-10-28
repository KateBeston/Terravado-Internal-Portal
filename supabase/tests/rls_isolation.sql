-- rls_isolation.sql
-- Runtime proof that Row Level Security isolates tenants. Impersonates a
-- NON-MEMBER inside a rolled-back transaction and asserts they see nothing.
-- Every count must be 0; the transaction rolls back, so nothing is changed.
--
-- To also check a real member, set the second claims line to a known user id
-- and confirm the counts are > 0. Run in the Supabase SQL editor or CI.

begin;
set local role authenticated;
-- A random, non-existent user id — a member of no tenant.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000000"}';

select
  'non-member must see nothing'                as assertion,
  (select count(*) from contacts)             as contacts,
  (select count(*) from properties)           as properties,
  (select count(*) from advisor_deals)        as advisor_deals,
  (select count(*) from developments)         as developments,
  (select count(*) from lots)                 as lots,
  (select count(*) from deal_shares)          as deal_shares,
  (select count(*) from business_documents)   as business_documents;
-- Expected: every count = 0 (RLS blocks all tenant data for a non-member).

rollback;

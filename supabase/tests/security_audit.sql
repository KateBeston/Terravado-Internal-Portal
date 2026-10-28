-- security_audit.sql
-- Static security audit of the Terravado database. Returns ONE ROW PER VIOLATION;
-- an empty result means the posture is sound. Run it after any migration (in the
-- Supabase SQL editor, or in CI against the database).
--
-- Checks:
--   1. Every table has Row Level Security enabled.
--   2. No table carries a permissive `using (true)` policy
--      (except suburb_data, which is deliberately shared read-only market data).
--   3. Every table with a tenant_id has at least one RLS policy.
--   4. Every SECURITY DEFINER function carries a guard
--      (auth.uid() / is_platform_admin() / current_user_tenants()).

with
no_rls as (
  select 'TABLE WITHOUT RLS'::text as issue, c.relname::text as object
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
),
permissive as (
  select 'PERMISSIVE POLICY (using true)'::text as issue, (tablename || '.' || policyname)::text as object
  from pg_policies
  where schemaname = 'public' and qual = 'true' and tablename <> 'suburb_data'
),
tenant_no_policy as (
  select 'TENANT TABLE WITHOUT POLICY'::text as issue, c.relname::text as object
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  join information_schema.columns col
    on col.table_name = c.relname and col.column_name = 'tenant_id' and col.table_schema = 'public'
  where n.nspname = 'public' and c.relkind = 'r'
    and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname)
),
definer_no_guard as (
  select 'DEFINER FUNCTION WITHOUT GUARD'::text as issue, p.proname::text as object
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef
    and p.prosrc not like '%auth.uid%'
    and p.prosrc not like '%is_platform_admin%'
    and p.prosrc not like '%current_user_tenants%'
)
select * from no_rls
union all select * from permissive
union all select * from tenant_no_policy
union all select * from definer_no_guard
order by issue, object;

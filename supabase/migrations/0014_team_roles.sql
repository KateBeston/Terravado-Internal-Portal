-- 0014_team_roles.sql
-- Team roles: add 'broker', let owners/admins manage member roles, and expose
-- the team + its roles via SECURITY DEFINER functions (avoids RLS recursion on
-- the memberships table and keeps auth.users access scoped to the caller's team).

alter table memberships drop constraint if exists memberships_role_check;
alter table memberships add constraint memberships_role_check
  check (role in ('owner','admin','adviser','viewer','broker'));

-- Tenants where the caller is owner/admin (used by RLS without recursion).
create or replace function current_user_admin_tenants()
  returns setof uuid language sql stable security definer set search_path = public as $$
  select tenant_id from memberships where user_id = auth.uid() and role in ('owner','admin');
$$;

-- Owners/admins may update member rows in their tenant (e.g. change a role).
drop policy if exists memberships_update on memberships;
create policy memberships_update on memberships for update to authenticated
  using (tenant_id in (select current_user_admin_tenants()))
  with check (tenant_id in (select current_user_admin_tenants()));

-- The caller's team, with emails, for the Account page (scoped to their tenant).
create or replace function tenant_members()
  returns table(user_id uuid, email text, role text)
  language plpgsql security definer set search_path = public as $$
declare t_id uuid;
begin
  select tenant_id into t_id from memberships where user_id = auth.uid() order by created_at asc limit 1;
  if t_id is null then return; end if;
  return query
    select m.user_id, u.email::text, m.role
    from memberships m join auth.users u on u.id = m.user_id
    where m.tenant_id = t_id
    order by m.created_at asc;
end;
$$;

-- Distinct roles present in the caller's tenant (drives team-aware capabilities).
create or replace function current_tenant_roles()
  returns setof text language sql stable security definer set search_path = public as $$
  select distinct role from memberships
  where tenant_id = (select tenant_id from memberships where user_id = auth.uid() order by created_at asc limit 1);
$$;

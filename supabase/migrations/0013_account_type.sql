-- 0013_account_type.sql
-- Account type (persona) on the tenant, driving capability gating. Core
-- functionality is shared; the type grants/removes modules (broker -> lodgement
-- + bank data; consultant -> advice/modelling; buyers agent -> sourcing; public
-- -> modelling/portfolio). Defaults to 'broker' so existing accounts keep full
-- capability.
alter table tenants add column if not exists account_type text not null default 'broker';

-- Owners/admins may update their own tenant (e.g. change account type).
drop policy if exists tenants_update on tenants;
create policy tenants_update on tenants for update to authenticated
  using (id in (select tenant_id from memberships where user_id = auth.uid() and role in ('owner','admin')))
  with check (id in (select tenant_id from memberships where user_id = auth.uid() and role in ('owner','admin')));

-- current_tenant() now also returns the account type. Return columns change, so
-- the function is dropped and recreated.
drop function if exists current_tenant();
create or replace function current_tenant()
  returns table(id uuid, name text, account_type text)
  language plpgsql security definer set search_path to 'public'
as $function$
declare t_id uuid; t_name text; t_type text;
begin
  if auth.uid() is null then
    return;
  end if;
  select m.tenant_id into t_id from memberships m where m.user_id = auth.uid() order by m.created_at asc limit 1;
  if t_id is null then
    insert into tenants (name) values ('My workspace') returning tenants.id into t_id;
    insert into memberships (tenant_id, user_id, role) values (t_id, auth.uid(), 'owner');
  end if;
  select t.name, t.account_type into t_name, t_type from tenants t where t.id = t_id;
  return query select t_id, t_name, t_type;
end;
$function$;

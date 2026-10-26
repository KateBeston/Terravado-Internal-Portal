-- Resolve the signed-in user's workspace, creating one on first sign-in.
create or replace function current_tenant()
returns table(id uuid, name text)
language plpgsql security definer set search_path = public as $$
declare t_id uuid; t_name text;
begin
  if auth.uid() is null then
    return;
  end if;
  select m.tenant_id into t_id from memberships m where m.user_id = auth.uid() order by m.created_at asc limit 1;
  if t_id is null then
    insert into tenants (name) values ('My workspace') returning tenants.id into t_id;
    insert into memberships (tenant_id, user_id, role) values (t_id, auth.uid(), 'owner');
  end if;
  select t.name into t_name from tenants t where t.id = t_id;
  return query select t_id, t_name;
end;
$$;

grant execute on function current_tenant() to authenticated;

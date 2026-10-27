-- 0015_platform_admin.sql
-- Platform admins (the internal Terravado team) can manage roles and auth across
-- ALL accounts. Gated by the platform_admins table and SECURITY DEFINER
-- functions that check it — no cross-tenant access leaks to normal users.

create table if not exists platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table platform_admins enable row level security;
-- No direct policy: reachable only through the admin functions below.

-- Seed the founder as the first platform admin.
insert into platform_admins (user_id) values ('3b591b51-087b-4fa8-99c8-b98a2db77a14')
on conflict do nothing;

create or replace function is_platform_admin()
  returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from platform_admins where user_id = auth.uid());
$$;

create or replace function admin_list_tenants()
  returns table(id uuid, name text, account_type text, members bigint)
  language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'not authorised'; end if;
  return query
    select t.id, t.name, t.account_type, count(m.user_id)
    from tenants t left join memberships m on m.tenant_id = t.id
    group by t.id, t.name, t.account_type order by t.name;
end;
$$;

create or replace function admin_set_account_type(p_tenant uuid, p_type text)
  returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'not authorised'; end if;
  update tenants set account_type = p_type where id = p_tenant;
end;
$$;

create or replace function admin_list_members(p_tenant uuid)
  returns table(user_id uuid, email text, role text)
  language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'not authorised'; end if;
  return query
    select m.user_id, u.email::text, m.role
    from memberships m join auth.users u on u.id = m.user_id
    where m.tenant_id = p_tenant order by m.created_at;
end;
$$;

create or replace function admin_set_member_role(p_tenant uuid, p_user uuid, p_role text)
  returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'not authorised'; end if;
  if p_role not in ('owner','admin','adviser','viewer','broker') then raise exception 'bad role'; end if;
  update memberships set role = p_role where tenant_id = p_tenant and user_id = p_user;
end;
$$;

create or replace function admin_list_users()
  returns table(user_id uuid, email text)
  language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'not authorised'; end if;
  return query select u.id, u.email::text from auth.users u order by u.email;
end;
$$;

create or replace function admin_add_member(p_tenant uuid, p_user uuid, p_role text)
  returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'not authorised'; end if;
  if p_role not in ('owner','admin','adviser','viewer','broker') then raise exception 'bad role'; end if;
  if exists(select 1 from memberships where tenant_id = p_tenant and user_id = p_user) then
    update memberships set role = p_role where tenant_id = p_tenant and user_id = p_user;
  else
    insert into memberships (tenant_id, user_id, role) values (p_tenant, p_user, p_role);
  end if;
end;
$$;

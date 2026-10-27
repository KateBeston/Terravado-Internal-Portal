-- 0016_deal_shares.sql
-- External guest deal-sharing: an account invites a party (by email) onto ONE
-- deal (a person/client record + everything hung off it). The guest sees ONLY
-- the shared deal, never the host's book. View-only in this version.

create table if not exists deal_shares (
  id              uuid primary key default gen_random_uuid(),
  host_tenant_id  uuid not null references tenants(id) on delete cascade,
  client_id       uuid not null references contacts(id) on delete cascade,  -- the shared person/deal
  invited_email   text not null,
  invited_user_id uuid references auth.users(id) on delete set null,
  permission      text not null default 'view' check (permission in ('view','collaborate')),
  status          text not null default 'invited' check (status in ('invited','accepted','revoked')),
  token           text not null unique,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  accepted_at     timestamptz
);
alter table deal_shares enable row level security;

-- The host account manages its own shares.
create policy deal_shares_host on deal_shares for all to authenticated
  using (host_tenant_id in (select current_user_tenants()))
  with check (host_tenant_id in (select current_user_tenants()));

-- The invited party can see shares addressed to them (to accept / view).
create policy deal_shares_invited_select on deal_shares for select to authenticated
  using (invited_user_id = auth.uid()
         or lower(invited_email) = lower((select email from auth.users where id = auth.uid())));

create index if not exists idx_deal_shares_host on deal_shares(host_tenant_id);
create index if not exists idx_deal_shares_client on deal_shares(client_id);

-- Client ids shared-and-accepted to the current user (drives the guest's read access).
create or replace function shared_client_ids()
  returns setof uuid language sql stable security definer set search_path = public as $$
  select client_id from deal_shares
  where status = 'accepted'
    and (invited_user_id = auth.uid()
         or lower(invited_email) = lower((select email from auth.users where id = auth.uid())));
$$;

-- Accept an invite by token — only the invited email may accept.
create or replace function accept_deal_share(p_token text)
  returns uuid language plpgsql security definer set search_path = public as $$
declare r deal_shares; caller_email text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select email into caller_email from auth.users where id = auth.uid();
  select * into r from deal_shares where token = p_token;
  if r.id is null then raise exception 'invalid invite'; end if;
  if r.status = 'revoked' then raise exception 'invite revoked'; end if;
  if lower(r.invited_email) <> lower(caller_email) then raise exception 'this invite is for a different email'; end if;
  update deal_shares set status = 'accepted', invited_user_id = auth.uid(), accepted_at = now() where id = r.id;
  return r.client_id;
end;
$$;

-- Guest read access, scoped to shared deals only (separate SELECT policies, so
-- host write access is unaffected — these grant read, not write).
create policy contacts_shared_select on contacts for select to authenticated
  using (id in (select shared_client_ids()));
create policy properties_shared_select on properties for select to authenticated
  using (client_id in (select shared_client_ids()));
create policy rs_shared_select on report_snapshots for select to authenticated
  using (client_id in (select shared_client_ids()));
create policy docs_shared_select on documents for select to authenticated
  using (client_id in (select shared_client_ids()));
create policy lodg_shared_select on lodgements for select to authenticated
  using (client_id in (select shared_client_ids()));

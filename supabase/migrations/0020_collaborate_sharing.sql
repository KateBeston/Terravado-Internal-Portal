-- 0020_collaborate_sharing.sql
-- Collaborate (write) access for invited guests. A guest whose share is
-- permission='collaborate' can contribute to the shared deal: add notes, add
-- documents, and update the financials. All writes go through guarded SECURITY
-- DEFINER functions (which check the caller IS a collaborator on that deal), not
-- broad cross-tenant write policies.

create or replace function collaborate_client_ids()
  returns setof uuid language sql stable security definer set search_path = public as $$
  select client_id from deal_shares
  where status = 'accepted' and permission = 'collaborate'
    and (invited_user_id = auth.uid()
         or lower(invited_email) = lower((select email from auth.users where id = auth.uid())));
$$;

create table if not exists deal_notes (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  client_id      uuid not null references contacts(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  author_label   text,
  body           text not null,
  created_at     timestamptz not null default now()
);
alter table deal_notes enable row level security;
create policy deal_notes_read on deal_notes for select to authenticated
  using (tenant_id in (select current_user_tenants()) or client_id in (select shared_client_ids()));
create index if not exists idx_deal_notes_client on deal_notes(client_id);

create or replace function add_deal_note(p_client uuid, p_body text)
  returns uuid language plpgsql security definer set search_path = public as $$
declare t uuid; nid uuid; lbl text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if coalesce(btrim(p_body), '') = '' then raise exception 'empty note'; end if;
  select tenant_id into t from contacts where id = p_client;
  if t is null then raise exception 'unknown deal'; end if;
  if not (t in (select current_user_tenants()) or p_client in (select collaborate_client_ids()))
    then raise exception 'not authorised'; end if;
  select email into lbl from auth.users where id = auth.uid();
  insert into deal_notes (tenant_id, client_id, author_user_id, author_label, body)
    values (t, p_client, auth.uid(), lbl, p_body) returning id into nid;
  return nid;
end;
$$;

create or replace function add_deal_document(p_client uuid, p_name text, p_kind text, p_link text)
  returns uuid language plpgsql security definer set search_path = public as $$
declare t uuid; did uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_client not in (select collaborate_client_ids()) then raise exception 'not authorised'; end if;
  select tenant_id into t from contacts where id = p_client;
  insert into documents (tenant_id, client_id, name, kind, storage_path)
    values (t, p_client, coalesce(nullif(btrim(p_name), ''), 'Document'), p_kind, p_link) returning id into did;
  return did;
end;
$$;

create or replace function collab_update_finances(p_client uuid, p_finances jsonb)
  returns void language plpgsql security definer set search_path = public as $$
declare cur jsonb;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_client not in (select collaborate_client_ids()) then raise exception 'not authorised'; end if;
  select coalesce(finances, '{}'::jsonb) into cur from contacts where id = p_client;
  update contacts set finances = cur || coalesce(p_finances, '{}'::jsonb) where id = p_client;
end;
$$;

revoke execute on function
  public.collaborate_client_ids(),
  public.add_deal_note(uuid, text),
  public.add_deal_document(uuid, text, text, text),
  public.collab_update_finances(uuid, jsonb)
from public, anon;
grant execute on function
  public.collaborate_client_ids(),
  public.add_deal_note(uuid, text),
  public.add_deal_document(uuid, text, text, text),
  public.collab_update_finances(uuid, jsonb)
to authenticated, service_role;

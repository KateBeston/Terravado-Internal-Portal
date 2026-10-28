-- 0019_security_hardening.sql
-- Defence in depth for the privileged SECURITY DEFINER functions. They already
-- guard themselves (is_platform_admin() / auth.uid() checks), but Supabase grants
-- EXECUTE to PUBLIC and anon by default, so an unauthenticated caller could
-- invoke them and rely on the guard alone. Remove that: only authenticated users
-- (and service_role) may call them at all.

revoke execute on function
  public.admin_add_member(uuid, uuid, text),
  public.admin_list_members(uuid),
  public.admin_list_tenants(),
  public.admin_list_users(),
  public.admin_set_account_type(uuid, text),
  public.admin_set_member_role(uuid, uuid, text),
  public.tenant_members(),
  public.accept_deal_share(text),
  public.is_platform_admin()
from public, anon;

grant execute on function
  public.admin_add_member(uuid, uuid, text),
  public.admin_list_members(uuid),
  public.admin_list_tenants(),
  public.admin_list_users(),
  public.admin_set_account_type(uuid, text),
  public.admin_set_member_role(uuid, uuid, text),
  public.tenant_members(),
  public.accept_deal_share(text),
  public.is_platform_admin()
to authenticated, service_role;

/* Platform-admin data access — the internal Terravado team managing roles and
   auth across all accounts. Every function is backed by a SECURITY DEFINER RPC
   that re-checks platform-admin status server-side, so these are safe to call
   from admin pages; a non-admin simply gets nothing / an error. */
import { createClient } from "@/lib/supabase/server";
import { IS_SUPABASE_CONFIGURED } from "@/lib/supabase/config";

export interface AdminTenant { id: string; name: string; accountType: string; members: number; }
export interface AdminMember { userId: string; email: string; role: string; }
export interface AdminUser { userId: string; email: string; }

/** Is the signed-in user a platform admin? In dev mode (no Supabase) true, so
    the console is explorable locally. */
export async function getIsPlatformAdmin(): Promise<boolean> {
  if (!IS_SUPABASE_CONFIGURED) return true;
  const sb = createClient();
  const { data, error } = await sb.rpc("is_platform_admin");
  if (error) return false;
  return data === true;
}

export async function adminListTenants(): Promise<AdminTenant[]> {
  if (!IS_SUPABASE_CONFIGURED) return [];
  const sb = createClient();
  const { data, error } = await sb.rpc("admin_list_tenants");
  if (error || !data) return [];
  return (data as any[]).map((r) => ({ id: r.id, name: r.name ?? "", accountType: r.account_type ?? "broker", members: Number(r.members ?? 0) }));
}

export async function adminListMembers(tenantId: string): Promise<AdminMember[]> {
  if (!IS_SUPABASE_CONFIGURED) return [];
  const sb = createClient();
  const { data, error } = await sb.rpc("admin_list_members", { p_tenant: tenantId });
  if (error || !data) return [];
  return (data as any[]).map((r) => ({ userId: r.user_id, email: r.email ?? "", role: r.role ?? "viewer" }));
}

export async function adminListUsers(): Promise<AdminUser[]> {
  if (!IS_SUPABASE_CONFIGURED) return [];
  const sb = createClient();
  const { data, error } = await sb.rpc("admin_list_users");
  if (error || !data) return [];
  return (data as any[]).map((r) => ({ userId: r.user_id, email: r.email ?? "" }));
}

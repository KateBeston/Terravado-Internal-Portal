import { getUser } from "./session";
import { createClient } from "@/lib/supabase/server";
import { IS_SUPABASE_CONFIGURED } from "@/lib/supabase/config";

export interface CurrentTenant {
  tenantId: string;
  name: string;
  accountType: string;
}

/** Resolve the current tenant for the signed-in user. In dev mode a per-user
    placeholder; in Supabase mode the `current_tenant()` RPC, which returns the
    user's workspace and auto-provisions one (tenant + owner membership) on first
    sign-in. */
export async function getCurrentTenant(): Promise<CurrentTenant> {
  if (!IS_SUPABASE_CONFIGURED) {
    const user = await getUser();
    return { tenantId: user ? `tenant-${user.id}` : "tenant-anon", name: "My workspace", accountType: "broker" };
  }
  const supabase = createClient();
  const { data, error } = await supabase.rpc("current_tenant");
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) {
    return { tenantId: "", name: "My workspace", accountType: "broker" };
  }
  return {
    tenantId: (row.id as string) ?? "",
    name: (row.name as string) ?? "My workspace",
    accountType: (row.account_type as string) ?? "broker",
  };
}

/** Distinct roles present on the current tenant — drives team-aware
    capabilities (e.g. a broker on the team unlocks the broker toolset). */
export async function getTenantRoles(): Promise<string[]> {
  if (!IS_SUPABASE_CONFIGURED) return ["owner"];
  const supabase = createClient();
  const { data, error } = await supabase.rpc("current_tenant_roles");
  if (error || !data) return [];
  return (data as unknown[]).map((r) => (typeof r === "string" ? r : (r as { role?: string }).role ?? "")).filter(Boolean);
}

export interface TenantMember { userId: string; email: string; role: string; }

/** The current tenant's members, with emails (scoped server-side to the team). */
export async function getTenantMembers(): Promise<TenantMember[]> {
  if (!IS_SUPABASE_CONFIGURED) return [];
  const supabase = createClient();
  const { data, error } = await supabase.rpc("tenant_members");
  if (error || !data) return [];
  return (data as any[]).map((r) => ({ userId: r.user_id, email: r.email ?? "", role: r.role ?? "viewer" }));
}

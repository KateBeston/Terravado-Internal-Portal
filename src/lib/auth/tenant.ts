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

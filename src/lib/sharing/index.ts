/* Deal sharing — reads over the deal_shares table. RLS does the scoping: the
   host policy limits a host to their own shares; the invited policy lets a guest
   see shares addressed to them. Writes go through server actions / the
   accept_deal_share RPC. */
import { createClient } from "@/lib/supabase/server";
import { IS_SUPABASE_CONFIGURED } from "@/lib/supabase/config";

export interface DealShare {
  id: string;
  hostTenantId: string;
  clientId: string;
  invitedEmail: string;
  invitedUserId: string | null;
  permission: string;
  status: string;
  token: string;
  createdAt: string;
}

export interface SharedWithMe {
  clientId: string;
  clientName: string;
  permission: string;
  hostTenantId: string;
}

function map(r: any): DealShare {
  return {
    id: r.id, hostTenantId: r.host_tenant_id, clientId: r.client_id, invitedEmail: r.invited_email,
    invitedUserId: r.invited_user_id, permission: r.permission, status: r.status, token: r.token, createdAt: r.created_at,
  };
}

/** Shares the host has created for one client (person) record. */
export async function listClientShares(clientId: string): Promise<DealShare[]> {
  if (!IS_SUPABASE_CONFIGURED) return [];
  const sb = createClient();
  const { data, error } = await sb.from("deal_shares").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as any[]).map(map);
}

/** Deals shared with the current user (accepted), with the person's name. */
export async function listSharedWithMe(): Promise<SharedWithMe[]> {
  if (!IS_SUPABASE_CONFIGURED) return [];
  const sb = createClient();
  // RLS (deal_shares_invited_select) scopes this to shares addressed to me.
  const { data, error } = await sb.from("deal_shares").select("client_id, permission, host_tenant_id, status").eq("status", "accepted");
  if (error || !data) return [];
  const rows = data as any[];
  const ids = Array.from(new Set(rows.map((r) => r.client_id)));
  const names = new Map<string, string>();
  if (ids.length) {
    // contacts_shared_select lets me read the shared person's row.
    const { data: people } = await sb.from("contacts").select("id, name").in("id", ids);
    (people as any[] | null)?.forEach((p) => names.set(p.id, p.name));
  }
  return rows.map((r) => ({ clientId: r.client_id, clientName: names.get(r.client_id) ?? "Shared deal", permission: r.permission, hostTenantId: r.host_tenant_id }));
}

/** Is a given client shared-and-accepted to the current user? (guest access check) */
export async function isSharedWithMe(clientId: string): Promise<boolean> {
  if (!IS_SUPABASE_CONFIGURED) return false;
  const sb = createClient();
  const { data } = await sb.from("deal_shares").select("id").eq("client_id", clientId).eq("status", "accepted").limit(1);
  return !!(data && data.length);
}

/* Data access for the Regulatory Watch alert feed (shared, public-data table).
   Not tenant-scoped — regulator updates are universal. All reads/writes wrapped
   so a misconfigured or local-dev environment degrades to empty rather than
   throwing. */
import { createClient } from "@/lib/supabase/server";
import type { RegItem } from "@/lib/integrations/regwatch";

export interface RegulatoryAlert {
  id: string;
  source_key?: string;
  body?: string;
  category?: string;
  title: string;
  url?: string;
  summary?: string;
  published_at?: string;
  acknowledged: boolean;
  created_at: string;
}

const safeDate = (s?: string): string | null => {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

export async function listRegulatoryAlerts(category?: string, limit = 120): Promise<RegulatoryAlert[]> {
  try {
    const sb = createClient();
    let q = sb.from("regulatory_alerts").select("*").order("created_at", { ascending: false }).limit(limit);
    if (category) q = q.eq("category", category);
    const { data } = await q;
    return (data as RegulatoryAlert[]) ?? [];
  } catch { return []; }
}

export async function unreadRegulatoryCount(): Promise<number> {
  try {
    const sb = createClient();
    const { count } = await sb.from("regulatory_alerts").select("*", { count: "exact", head: true }).eq("acknowledged", false);
    return count ?? 0;
  } catch { return 0; }
}

/* Insert new items, de-duplicated by url. Returns how many were newly inserted. */
export async function persistRegulatoryItems(items: RegItem[]): Promise<number> {
  if (!items.length) return 0;
  try {
    const sb = createClient();
    const rows = items.map((i) => ({
      source_key: i.sourceKey, body: i.body, category: i.category, title: i.title,
      url: i.url, summary: i.summary, published_at: safeDate(i.publishedAt),
    }));
    const { data } = await sb.from("regulatory_alerts").upsert(rows, { onConflict: "url", ignoreDuplicates: true }).select("id");
    return data ? data.length : 0;
  } catch { return 0; }
}

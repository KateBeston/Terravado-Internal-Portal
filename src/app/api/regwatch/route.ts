import { NextResponse } from "next/server";
import { collectRegulatoryItems } from "@/lib/integrations/regwatch";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const safe = (s?: string) => { if (!s) return null; const d = new Date(s); return isNaN(d.getTime()) ? null : d.toISOString(); };

/* Fortnightly cron entry (Vercel Cron — see vercel.json). Writes the public
   regulator feed with a service-role client: the ONE isolated, env-gated
   exception to the no-service-role rule, for PUBLIC data only (regulator
   headlines, never client data). Inert unless CRON_SECRET + the Supabase service
   key are set; the authenticated "Check now" button is the primary path. */
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || new URL(req.url).searchParams.get("key");
  if (!expected || provided !== expected) return NextResponse.json({ ok: false, error: "unauthorised" }, { status: 401 });

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!key || !supaUrl) return NextResponse.json({ ok: true, ran: false, note: "cron not configured (set SUPABASE_SERVICE_ROLE_KEY)" });

  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(supaUrl, key);
  const { items, sourcesTried, sourcesReturned } = await collectRegulatoryItems();
  let inserted = 0;
  if (items.length) {
    const rows = items.map((i) => ({ source_key: i.sourceKey, body: i.body, category: i.category, title: i.title, url: i.url, summary: i.summary, published_at: safe(i.publishedAt) }));
    const { data } = await sb.from("regulatory_alerts").upsert(rows, { onConflict: "url", ignoreDuplicates: true }).select("id");
    inserted = data ? data.length : 0;
  }
  return NextResponse.json({ ok: true, ran: true, sourcesTried, sourcesReturned, inserted });
}

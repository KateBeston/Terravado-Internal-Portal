/* ===========================================================================
   REGULATORY WATCH — monitor the regulators for updates.
   ---------------------------------------------------------------------------
   A seeded registry of the bodies that govern property, lending, financial
   services, real estate, AML, trusts and accounting, each with a monitorable
   feed (RSS/Atom preferred, newsroom page otherwise). A fortnightly check (or a
   manual refresh) fetches each feed, parses the items, and the caller persists
   the new ones as alerts. Fetched server-side at request time; a source that is
   unreachable or doesn't parse is skipped (never breaks the check). It surfaces
   THAT something changed and links to it — it does not interpret the law.
   Override the feed URLs with REGWATCH_SOURCES (JSON) if any need correcting.
   =========================================================================== */

export type RegCategory =
  | "tax" | "lending" | "financial-services" | "real-estate"
  | "aml" | "property-management" | "commercial" | "trusts" | "accounting";

export interface RegSource { key: string; body: string; category: RegCategory; url: string }
export interface RegItem { sourceKey: string; body: string; category: RegCategory; title: string; url: string; summary?: string; publishedAt?: string }

/* Best-effort feeds. RSS/Atom where the body publishes one; newsroom pages
   otherwise (those yield items only if they expose a parseable feed). All
   overridable via REGWATCH_SOURCES. */
const DEFAULT_SOURCES: RegSource[] = [
  { key: "asic", body: "ASIC", category: "financial-services", url: "https://asic.gov.au/about-asic/news-centre/rss-feeds/media-releases-rss/" },
  { key: "apra", body: "APRA", category: "lending", url: "https://www.apra.gov.au/news-and-publications/rss.xml" },
  { key: "accc", body: "ACCC", category: "financial-services", url: "https://www.accc.gov.au/rss/all.xml" },
  { key: "rba", body: "RBA", category: "lending", url: "https://www.rba.gov.au/rss/rss-cb-media-releases.xml" },
  { key: "austrac", body: "AUSTRAC", category: "aml", url: "https://www.austrac.gov.au/rss.xml" },
  { key: "ato", body: "ATO", category: "tax", url: "https://www.ato.gov.au/rss/whatsnew.xml" },
  { key: "tpb", body: "Tax Practitioners Board", category: "accounting", url: "https://www.tpb.gov.au/rss.xml" },
  { key: "revenue-nsw", body: "Revenue NSW", category: "tax", url: "https://www.revenue.nsw.gov.au/news-media-releases/rss" },
  { key: "sro-vic", body: "SRO Victoria", category: "tax", url: "https://www.sro.vic.gov.au/rss.xml" },
  { key: "fairtrading-nsw", body: "NSW Fair Trading", category: "real-estate", url: "https://www.nsw.gov.au/departments-and-agencies/fair-trading/rss.xml" },
];

export function regSources(): RegSource[] {
  const raw = process.env.REGWATCH_SOURCES;
  if (!raw) return DEFAULT_SOURCES;
  try { const j = JSON.parse(raw); return Array.isArray(j) && j.length ? j : DEFAULT_SOURCES; } catch { return DEFAULT_SOURCES; }
}

const decode = (s: string) => s
  .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
  .replace(/<[^>]+>/g, "")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
  .trim();
const tag = (block: string, name: string): string | undefined => {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : undefined;
};
const atomLink = (block: string): string | undefined => {
  const m = block.match(/<link[^>]*href="([^"]+)"[^>]*\/?\s*>/i);
  return m ? m[1] : undefined;
};

/* Parse an RSS or Atom feed into items (first `limit`). */
export function parseFeed(xml: string, src: RegSource, limit = 8): RegItem[] {
  const items: RegItem[] = [];
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/(item|entry)>/gi) ?? [];
  for (const block of blocks.slice(0, limit)) {
    const title = tag(block, "title");
    const url = tag(block, "link") || atomLink(block);
    if (!title || !url || !/^https?:\/\//.test(url)) continue;
    const publishedAt = tag(block, "pubDate") || tag(block, "published") || tag(block, "updated");
    const summary = (tag(block, "description") || tag(block, "summary") || "").slice(0, 400);
    items.push({ sourceKey: src.key, body: src.body, category: src.category, title, url, summary, publishedAt });
  }
  return items;
}

async function fetchOne(src: RegSource): Promise<RegItem[]> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(src.url, { headers: { accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" }, signal: ctrl.signal, next: { revalidate: 3600 } });
    clearTimeout(t);
    if (!r.ok) return [];
    return parseFeed(await r.text(), src);
  } catch { return []; }
}

/* Fetch every source and return all parsed items (newest-ish first per source). */
export async function collectRegulatoryItems(): Promise<{ items: RegItem[]; sourcesTried: number; sourcesReturned: number }> {
  const sources = regSources();
  const settled = await Promise.allSettled(sources.map(fetchOne));
  const items: RegItem[] = [];
  let sourcesReturned = 0;
  for (const s of settled) if (s.status === "fulfilled" && s.value.length) { sourcesReturned++; items.push(...s.value); }
  return { items, sourcesTried: sources.length, sourcesReturned };
}

export const REG_CATEGORIES: RegCategory[] = ["tax", "lending", "financial-services", "real-estate", "aml", "property-management", "commercial", "trusts", "accounting"];

/* ===========================================================================
   ABS seam — macro statistics by area for the map choropleth.
   ---------------------------------------------------------------------------
   The Australian Bureau of Statistics publishes this openly (Data API, no key).
   At request time the live adapter fetches Estimated Resident Population by state
   as CSV and derives population + annual growth; on any failure it falls back to
   a clearly-labelled snapshot, so the Map never breaks. The `live` flag and the
   disclaimer reflect which one is in play.

   Robustness: the exact ABS dataflow dimensions aren't assumed. We fetch the
   whole ERP flow as CSV and, per state per period, take the largest observation
   — which is the all-persons / all-ages total (sub-groups are always smaller).
   That sidesteps dimension-key guesswork and survives ABS schema tweaks. Point
   ABS_ERP_URL at a different query to override; ABS_LIVE=off forces the snapshot.
   =========================================================================== */
export const ABS_CONFIGURED = process.env.ABS_LIVE !== "off"; // live by default (no key needed)

const ERP_URL = process.env.ABS_ERP_URL
  || "https://api.data.abs.gov.au/data/ERP_Q/all?startPeriod=2022-Q1&format=csv";
const LIVE = process.env.ABS_LIVE !== "off";

export interface AbsStateIndicator {
  abbr: string;
  population?: number;    // Estimated Resident Population
  popGrowthPct?: number;  // annual % change
  jobGrowthPct?: number;  // annual employment growth %
}
export interface AbsIndicators {
  byState: Record<string, AbsStateIndicator>;
  source: string;
  asAt: string;
  live: boolean;
  disclaimer: string;
}

/* Indicative snapshot — the guaranteed fallback and the source of job-growth
   until a labour-force query is wired. NOT a live read. */
const SNAPSHOT: AbsStateIndicator[] = [
  { abbr: "NSW", population: 8470000, popGrowthPct: 2.0, jobGrowthPct: 2.2 },
  { abbr: "VIC", population: 6980000, popGrowthPct: 2.4, jobGrowthPct: 2.6 },
  { abbr: "QLD", population: 5560000, popGrowthPct: 2.3, jobGrowthPct: 2.9 },
  { abbr: "WA", population: 2960000, popGrowthPct: 2.8, jobGrowthPct: 3.1 },
  { abbr: "SA", population: 1870000, popGrowthPct: 1.5, jobGrowthPct: 1.8 },
  { abbr: "TAS", population: 575000, popGrowthPct: 0.6, jobGrowthPct: 0.9 },
  { abbr: "ACT", population: 475000, popGrowthPct: 1.7, jobGrowthPct: 2.0 },
  { abbr: "NT", population: 255000, popGrowthPct: 1.1, jobGrowthPct: 1.3 },
];
function snapshotMap(): Record<string, AbsStateIndicator> {
  const m: Record<string, AbsStateIndicator> = {};
  for (const s of SNAPSHOT) m[s.abbr] = { ...s };
  return m;
}

// ASGS state code / name → abbr, for matching whatever the region column holds.
const STATE_KEY: Record<string, string> = {
  "1": "NSW", "2": "VIC", "3": "QLD", "4": "SA", "5": "WA", "6": "TAS", "7": "NT", "8": "ACT",
  "new south wales": "NSW", "victoria": "VIC", "queensland": "QLD", "south australia": "SA",
  "western australia": "WA", "tasmania": "TAS", "northern territory": "NT", "australian capital territory": "ACT",
  nsw: "NSW", vic: "VIC", qld: "QLD", sa: "SA", wa: "WA", tas: "TAS", nt: "NT", act: "ACT",
};
const toAbbr = (cell: string): string | undefined => STATE_KEY[cell.trim().toLowerCase()];

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line) continue;
    const out: string[] = []; let cur = "", q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === ",") { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur); rows.push(out);
  }
  return rows;
}

/* Reduce the ERP CSV to per-state population (latest period) and annual growth
   (latest vs ~1 year earlier), taking the max observation per state+period as
   the all-persons/all-ages total. Returns null if it can't be made sense of. */
function reduceErp(csv: string): Record<string, { population: number; popGrowthPct?: number }> | null {
  const rows = parseCsv(csv);
  if (rows.length < 2) return null;
  const header = rows[0].map((h) => h.trim().toUpperCase());
  const timeIdx = header.findIndex((h) => h === "TIME_PERIOD" || h === "TIME");
  const valIdx = header.findIndex((h) => h === "OBS_VALUE" || h === "VALUE");
  if (timeIdx < 0 || valIdx < 0) return null;

  // per state → per period → max observation
  const byState: Record<string, Record<string, number>> = {};
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length <= Math.max(timeIdx, valIdx)) continue;
    let abbr: string | undefined;
    for (const cell of row) { const a = toAbbr(cell); if (a) { abbr = a; break; } }
    if (!abbr) continue;
    const period = row[timeIdx].trim();
    const val = Number(row[valIdx]);
    if (!period || !isFinite(val)) continue;
    (byState[abbr] ??= {});
    byState[abbr][period] = Math.max(byState[abbr][period] ?? 0, val);
  }
  if (!Object.keys(byState).length) return null;

  const out: Record<string, { population: number; popGrowthPct?: number }> = {};
  for (const [abbr, periods] of Object.entries(byState)) {
    const sorted = Object.keys(periods).sort(); // ISO-ish periods sort chronologically
    const latest = sorted[sorted.length - 1];
    const population = periods[latest];
    // a year earlier ≈ 4 quarters back; fall back to the earliest available
    const prior = sorted[Math.max(0, sorted.length - 5)];
    const base = periods[prior];
    const popGrowthPct = base && base > 0 && prior !== latest ? +(((population / base) - 1) * 100).toFixed(1) : undefined;
    out[abbr] = { population, popGrowthPct };
  }
  return out;
}

// Cache across requests on the same server instance (ABS updates quarterly).
let cache: { at: number; data: AbsIndicators } | null = null;
const TTL = 6 * 60 * 60 * 1000;

export async function getAbsIndicators(): Promise<AbsIndicators> {
  if (cache && Date.now() - cache.at < TTL) return cache.data;

  const byState = snapshotMap();
  let result: AbsIndicators = {
    byState,
    source: "ABS (indicative snapshot)",
    asAt: "2024",
    live: false,
    disclaimer: "Indicative last-known ABS figures, not a live read. Set ABS_ERP_URL / enable the live ABS Data API for current data.",
  };

  if (LIVE) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const r = await fetch(ERP_URL, { headers: { accept: "text/csv" }, signal: ctrl.signal, next: { revalidate: 21600 } });
      clearTimeout(t);
      if (r.ok) {
        const erp = reduceErp(await r.text());
        if (erp && Object.keys(erp).length >= 6) {
          let latestPeriod = "";
          for (const abbr of Object.keys(byState)) {
            const e = erp[abbr];
            if (e) { byState[abbr].population = e.population; if (e.popGrowthPct !== undefined) byState[abbr].popGrowthPct = e.popGrowthPct; }
          }
          // job growth stays from the snapshot until a labour-force query is wired
          result = {
            byState,
            source: "ABS Data API (ERP)",
            asAt: latestPeriod || new Date().toISOString().slice(0, 10),
            live: true,
            disclaimer: "Population from the live ABS Data API (Estimated Resident Population). Job growth is still the indicative snapshot until a labour-force query is wired.",
          };
        }
      }
    } catch { /* keep the snapshot result */ }
  }

  cache = { at: Date.now(), data: result };
  return result;
}

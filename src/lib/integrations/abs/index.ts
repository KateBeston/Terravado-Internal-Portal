/* ===========================================================================
   ABS seam — macro statistics by area for the map choropleth.
   ---------------------------------------------------------------------------
   The Australian Bureau of Statistics publishes this openly (Data API / ABS.Stat
   SDMX, and the Regional Population & Labour Force releases). A live adapter
   queries that API at request time; until ABS_API is set, this returns a small,
   clearly-labelled snapshot of state figures so the map works end to end. The
   snapshot is indicative last-known data — not a live read — and is replaced the
   moment the live adapter is connected. Figures to be refreshed from the source.
   =========================================================================== */
export const ABS_CONFIGURED = Boolean(process.env.ABS_API);

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

/* Indicative snapshot — order-of-magnitude state ERP and growth, for the seam to
   render against before the live ABS API is connected. NOT a live read. */
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

export async function getAbsIndicators(): Promise<AbsIndicators> {
  // Live ABS adapter slots in here when ABS_API is set (SDMX query → map).
  const byState: Record<string, AbsStateIndicator> = {};
  for (const s of SNAPSHOT) byState[s.abbr] = s;
  return {
    byState,
    source: "ABS (indicative snapshot)",
    asAt: "2024",
    live: false,
    disclaimer:
      "Indicative last-known ABS figures, not a live read. Connect the ABS Data API " +
      "(ABS_API) for current Regional Population and Labour Force data.",
  };
}

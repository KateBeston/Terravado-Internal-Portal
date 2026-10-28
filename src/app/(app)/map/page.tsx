import { requireUser } from "@/lib/auth/guard";
import { getPropertyDataProvider } from "@/lib/integrations/property-data";
import { getAbsIndicators } from "@/lib/integrations/abs";
import MapClient from "./MapClient";
import type { StateMetrics, OverlayDef } from "@/components/AustraliaMap";
import geojson from "./au-states.json";

export const dynamic = "force-dynamic";

const CAPITALS: Record<string, string> = {
  NSW: "Sydney", VIC: "Melbourne", QLD: "Brisbane", WA: "Perth",
  SA: "Adelaide", TAS: "Hobart", ACT: "Canberra", NT: "Darwin",
};

const OVERLAYS: OverlayDef[] = [
  { key: "infrastructure", label: "Government infrastructure", connected: false, note: "Connect data.gov.au / Infrastructure Australia and the state portals to show funded projects." },
  { key: "planning", label: "Town & community planning", connected: false, note: "Connect the state planning portals (NSW ePlanning, VicPlan, QLD DA mapping)." },
  { key: "transport", label: "Transport & rail", connected: false, note: "Connect state transport datasets / GTFS for network and future corridors." },
  { key: "private-dev", label: "Private development", connected: false, note: "Connect Cordell / BCI (licensed) for commercial & residential projects." },
  { key: "planned-dev", label: "Planned developments", connected: false, note: "Connect Cordell / BCI (licensed); filter by development type." },
];
const DEV_TYPES = ["All types", "Residential", "Commercial / retail", "Shopping centre", "Industrial", "Mixed use", "Infrastructure / civic", "Health", "Education"];

/* Map explorer — increment 1: interactive Australia map, growth choropleth on the
   property-data seam (stub now / CoreLogic later), ABS as the first live-ready
   layer, and the overlay + development-type framework for sources still to
   connect. State level now; SA-region and suburb drill-down arrive with the finer
   boundaries and the connected property-data feed. */
export default async function MapPage() {
  await requireUser();

  const pd = getPropertyDataProvider();
  const abs = await getAbsIndicators();

  const data: Record<string, StateMetrics> = {};
  for (const [abbr, capital] of Object.entries(CAPITALS)) {
    let growthPct: number | undefined;
    try { growthPct = (await pd.suburbSnapshot(capital, abbr)).annualGrowthPct; } catch { /* leave undefined */ }
    const a = abs.byState[abbr] ?? {};
    data[abbr] = { growthPct, population: a.population, popGrowthPct: a.popGrowthPct, jobGrowthPct: a.jobGrowthPct };
  }

  return (
    <section>
      <h1>Map</h1>
      <p className="sub">
        Growth and demand across Australia, coloured red (high) to blue (slow / stagnant). Choose the metric, toggle overlays,
        and filter planned development by type. State level for now — SA-region and suburb drill-down arrive as the finer
        boundaries and the live property-data feed connect.
      </p>
      <MapClient geojson={geojson} data={data} overlays={OVERLAYS} devTypes={DEV_TYPES} absNote={abs.disclaimer} />
    </section>
  );
}

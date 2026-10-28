import { requireUser } from "@/lib/auth/guard";
import { getPropertyDataProvider } from "@/lib/integrations/property-data";
import { getAbsIndicators } from "@/lib/integrations/abs";
import Chart from "@/components/Chart";
import Link from "next/link";

export const dynamic = "force-dynamic";

const CAPITALS: Record<string, string> = {
  NSW: "Sydney", VIC: "Melbourne", QLD: "Brisbane", WA: "Perth",
  SA: "Adelaide", TAS: "Hobart", ACT: "Canberra", NT: "Darwin",
};
const GOLD = "#B08D2E", GREEN = "#2D3A21";
const pct = (v?: number) => (v === undefined ? "—" : v.toFixed(1) + "%");
const bigN = (v?: number) => (v === undefined ? "—" : v.toLocaleString("en-AU"));

export default async function AtlasOverview() {
  await requireUser();
  const pd = getPropertyDataProvider();
  const abs = await getAbsIndicators();

  const rows = await Promise.all(Object.entries(CAPITALS).map(async ([state, capital]) => {
    let growth: number | undefined;
    try { growth = (await pd.suburbSnapshot(capital, state)).annualGrowthPct; } catch { /* undefined */ }
    const a = abs.byState[state] ?? {};
    return { state, growth, population: a.population, popGrowth: a.popGrowthPct, jobGrowth: a.jobGrowthPct };
  }));

  const totalPop = rows.reduce((t, r) => t + (r.population ?? 0), 0);
  const wGrowth = totalPop > 0 ? rows.reduce((t, r) => t + (r.growth ?? 0) * (r.population ?? 0), 0) / totalPop : 0;
  const avgPopGrowth = rows.reduce((t, r) => t + (r.popGrowth ?? 0), 0) / rows.length;
  const ranked = [...rows].sort((a, b) => (b.growth ?? -1) - (a.growth ?? -1));
  const leader = ranked[0];

  const growthData = ranked.map((r) => ({ state: r.state, growth: r.growth ?? 0 }));
  const popGrowthData = [...rows].sort((a, b) => (b.popGrowth ?? -1) - (a.popGrowth ?? -1)).map((r) => ({ state: r.state, popGrowth: r.popGrowth ?? 0 }));

  return (
    <>
      <p className="sub" style={{ marginTop: -6 }}>
        Monitor national property growth and demand — macro (national &amp; state) now, micro (region &amp; suburb) as the finer
        feeds connect. Stats, charts and the interactive <Link href="/atlas/map">Map</Link>, all off the one set of sources.
      </p>

      <div className="cards">
        <div className="card"><div className="k">National property growth</div><div className="v">{pct(wGrowth)}</div><div className="k">pop-weighted, p.a.</div></div>
        <div className="card"><div className="k">Top growth state</div><div className="v">{leader?.state ?? "—"}</div><div className="k">{pct(leader?.growth)} p.a.</div></div>
        <div className="card"><div className="k">Population tracked</div><div className="v">{bigN(totalPop)}</div><div className="k">{Object.keys(CAPITALS).length} states/territories</div></div>
        <div className="card"><div className="k">Avg population growth</div><div className="v">{pct(avgPopGrowth)}</div><div className="k">ABS, p.a.</div></div>
      </div>

      <div className="split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="panel">
          <h2>Property growth by state</h2>
          <Chart data={growthData} opts={{
            xKey: "state", height: 240, yFmt: (v) => v.toFixed(1) + "%",
            series: [{ key: "growth", type: "bar", color: GOLD, label: "Growth % p.a.", tip: (v) => v.toFixed(1) + "%" }],
          }} />
        </div>
        <div className="panel">
          <h2>Population growth by state (ABS)</h2>
          <Chart data={popGrowthData} opts={{
            xKey: "state", height: 240, yFmt: (v) => v.toFixed(1) + "%",
            series: [{ key: "popGrowth", type: "bar", color: GREEN, label: "Pop. growth % p.a.", tip: (v) => v.toFixed(1) + "%" }],
          }} />
        </div>
      </div>

      <div className="panel">
        <h2>Hotspots — states ranked by property growth</h2>
        <table>
          <thead><tr><th>#</th><th>State</th><th>Property growth</th><th>Population</th><th>Pop. growth</th><th>Job growth</th></tr></thead>
          <tbody>
            {ranked.map((r, i) => (
              <tr key={r.state}>
                <td>{i + 1}</td>
                <td><strong>{r.state}</strong></td>
                <td>{pct(r.growth)}</td>
                <td>{bigN(r.population)}</td>
                <td>{pct(r.popGrowth)}</td>
                <td>{pct(r.jobGrowth)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted" style={{ fontSize: 12 }}>
          Macro (state) ranking for now; region and suburb hotspots arrive with the finer boundaries and the connected
          property-data feed. Property growth is indicative (stub) until CoreLogic/VG is connected; {abs.disclaimer}
        </p>
      </div>
    </>
  );
}

"use client";
/* The two Atlas Overview charts. Kept in a client component because Chart takes
   formatter functions in its opts, and functions can't be passed across the
   server→client boundary — the server page passes only the plain data arrays. */
import Chart from "@/components/Chart";

const GOLD = "#B08D2E", GREEN = "#2D3A21";

export default function AtlasCharts({ growthData, popGrowthData }: {
  growthData: { state: string; growth: number }[];
  popGrowthData: { state: string; popGrowth: number }[];
}) {
  return (
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
  );
}

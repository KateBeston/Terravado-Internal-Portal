"use client";
/* Interactive Australia map — Leaflet choropleth over the state boundaries,
   coloured red (high growth / demand) → blue (slow / stagnation) by a selectable
   metric, with a layer framework (overlay toggles + a development-type filter)
   that lights up as each data source is connected. State level now; SA-region
   and suburb drill-down arrive with the finer boundary + property-data feeds. */
import { useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { Layer } from "leaflet";
import type { Feature } from "geojson";

export interface StateMetrics { growthPct?: number; population?: number; popGrowthPct?: number; jobGrowthPct?: number; }
export interface OverlayDef { key: string; label: string; connected: boolean; note: string; }
export interface MapProps {
  geojson: any;
  data: Record<string, StateMetrics>;
  overlays: OverlayDef[];
  devTypes: string[];
  absNote: string;
}

type MetricKey = "growthPct" | "popGrowthPct" | "jobGrowthPct" | "population";
const METRICS: { key: MetricKey; label: string; unit: string; dp: number }[] = [
  { key: "growthPct", label: "Property growth", unit: "% p.a.", dp: 1 },
  { key: "popGrowthPct", label: "Population growth (ABS)", unit: "% p.a.", dp: 1 },
  { key: "jobGrowthPct", label: "Job growth (ABS)", unit: "% p.a.", dp: 1 },
  { key: "population", label: "Population (ABS, ERP)", unit: "", dp: 0 },
];
// low → high : blue → white → red
const SCALE = ["#2c5f9e", "#7FA8D0", "#EADFCE", "#D98C5F", "#B23A2E"];
const NODATA = "#e6e2d8";

function fmt(v: number | undefined, dp: number) {
  if (v === undefined || v === null) return "—";
  return dp === 0 ? Math.round(v).toLocaleString("en-AU") : v.toFixed(dp);
}
export default function AustraliaMap({ geojson, data, overlays, devTypes, absNote }: MapProps) {
  const [metric, setMetric] = useState<MetricKey>("growthPct");
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [devType, setDevType] = useState("All types");

  const m = METRICS.find((x) => x.key === metric)!;
  const { min, max } = useMemo(() => {
    const vals = Object.values(data).map((d) => d[metric]).filter((x): x is number => typeof x === "number");
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [data, metric]);

  const colorFor = (v?: number) => {
    if (v === undefined || v === null || max <= min) return NODATA;
    const t = (v - min) / (max - min);
    return SCALE[Math.min(SCALE.length - 1, Math.max(0, Math.floor(t * SCALE.length)))];
  };

  const style = (f?: Feature) => {
    const abbr = (f?.properties as any)?.abbr as string;
    return { fillColor: colorFor(data[abbr]?.[metric]), weight: 1, color: "#fff", fillOpacity: 0.82 };
  };
  const onEach = (f: Feature, layer: Layer) => {
    const p = f.properties as any;
    const d = data[p.abbr] ?? {};
    layer.bindTooltip(
      `<strong>${p.name} (${p.abbr})</strong><br/>` +
      `Property growth: ${fmt(d.growthPct, 1)}% p.a.<br/>` +
      `Population: ${fmt(d.population, 0)}<br/>` +
      `Pop. growth: ${fmt(d.popGrowthPct, 1)}% p.a.<br/>` +
      `Job growth: ${fmt(d.jobGrowthPct, 1)}% p.a.`,
      { sticky: true },
    );
  };
  const toggle = (k: string) => setActive((a) => ({ ...a, [k]: !a[k] }));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16, alignItems: "start" }}>
      <div>
        <div className="panel" style={{ marginTop: 0 }}>
          <h3 style={{ marginTop: 0 }}>Colour by</h3>
          <select value={metric} onChange={(e) => setMetric(e.target.value as MetricKey)} style={{ width: "100%" }}>
            {METRICS.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
          </select>
          <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted)" }}>
            <div style={{ display: "flex", height: 12, borderRadius: 2, overflow: "hidden" }}>
              {SCALE.map((c) => <div key={c} style={{ background: c, flex: 1 }} />)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span>Slow / stagnant {fmt(min, m.dp)}{m.unit && " " + m.unit}</span>
              <span>High {fmt(max, m.dp)}</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Overlays</h3>
          {overlays.map((o) => (
            <label key={o.key} className="f" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <input type="checkbox" checked={!!active[o.key]} onChange={() => toggle(o.key)} style={{ width: "auto" }} />
              <span style={{ fontSize: 13 }}>{o.label}{!o.connected && <span className="muted" style={{ fontSize: 11 }}> · not connected</span>}</span>
            </label>
          ))}
          {active["planned-dev"] && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Planned development — type</div>
              <select value={devType} onChange={(e) => setDevType(e.target.value)} style={{ width: "100%" }}>
                {devTypes.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          )}
          {overlays.some((o) => active[o.key]) && (
            <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
              {overlays.filter((o) => active[o.key] && !o.connected).map((o) => o.note).join(" ") || "Layer active."}
            </p>
          )}
        </div>

        <p className="muted" style={{ fontSize: 11 }}>{absNote}</p>
      </div>

      <div className="panel" style={{ marginTop: 0, padding: 0, overflow: "hidden" }}>
        <MapContainer style={{ height: 620, width: "100%" }} center={[-25.6, 134.3]} zoom={4} scrollWheelZoom>
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <GeoJSON key={metric} data={geojson} style={style as any} onEachFeature={onEach} />
        </MapContainer>
      </div>
    </div>
  );
}
